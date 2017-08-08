from cgi import escape
from datetime import datetime
from logging import DEBUG, Formatter, getLogger, StreamHandler
from logging.handlers import RotatingFileHandler
from os import kill
from os.path import basename, getmtime
from pathlib import Path
from queue import Queue, Empty
from re import findall, match, sub
from sched import scheduler
from secrets import token_bytes
from signal import SIGINT
from subprocess import PIPE, Popen, run, STDOUT
from shutil import rmtree
from sqlite3 import connect
from sys import stdout, version
from threading import Lock, Thread, enumerate as thread_enum
from time import time
from uuid import uuid4

from flask import Flask, jsonify, g, render_template, request, session
from pexpect import EOF, spawn, TIMEOUT
from requests import get, post
from requests.auth import HTTPBasicAuth
from requests_ntlm import HttpNtlmAuth
from werkzeug.utils import secure_filename

app = Flask(__name__)

logger = app.logger
logger.setLevel(DEBUG)
ch = StreamHandler(stream=stdout)
fh = RotatingFileHandler(Path(app.root_path) / 'flasklogs' / 'flask.log', maxBytes=2000000, backupCount=20)
ch.setLevel(DEBUG)
fh.setLevel(DEBUG)
formatter = Formatter('[%(asctime)s] %(levelname)s [%(funcName)s:%(lineno)d] %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p')
ch.setFormatter(formatter)
fh.setFormatter(formatter)
logger.addHandler(ch)
logger.addHandler(fh)

UPLOAD_FOLDER = Path(app.root_path) / 'uploads'
DATABASE = Path(app.root_path) / 'database' / 'cores.db'
CLIENTLESS_GDB = Path(app.root_path).parent / 'clientlessGDB' / 'clientlessGdb.py'
GEN_CORE_REPORT = Path(app.root_path).parent / 'clientlessGDB' / 'gen_core_report.sh'
DELETE_MIN = 5760

coredump_queues = {}
command_queues = {}
abort_queues = {}
output_queues = {}
queues_lock = Lock()

running_counts = set()
count = 0
count_lock = Lock()

dump_counter = 0

def _write(*args, **kwargs):
    content = args[0]
    if content in [' ', '', '\n', '\r', '\r\n']:
        return
    for eol in ['\r\n', '\r', '\n']:
        content = sub('\%s$' % eol, '', content)
    return logger.info(content)

def _flush():
    pass

logger.write = _write
logger.flush = _flush

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect(str(DATABASE))
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        logger.info('closing database')
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
            f.seek(0)
            logger.info(f.read())
        db.commit()

@app.cli.command('initdb')
def initdb_command():
    init_db()
    logger.info('initialized database')

def set_queues(count):
    global coredump_queues, command_queues, abort_queues, output_queues
    coredump_queues[count] = Queue()
    command_queues[count] = Queue()
    abort_queues[count] = Queue()
    output_queues[count] = Queue()

def delete_queues(count):
    global coredump_queues, command_queues, abort_queues, output_queues
    del coredump_queues[count]
    del command_queues[count]
    del abort_queues[count]
    del output_queues[count]

def run_gdb(count, uuid, workspace, gdb_location):
    logger.info('count %d - start', count)
    global coredump_queues, command_queues, abort_queues, output_queues
    start_coredump = coredump_queues[count].get()
    coredump_path = UPLOAD_FOLDER / uuid / start_coredump / start_coredump
    img_path = coredump_path.parent / workspace / 'Xpix' / 'target' / 'smp'
    if not img_path.exists():
        img_path = coredump_path.parent / workspace / 'Xpix' / 'target' / 'ssp'
    if not img_path.exists():
        img_path = coredump_path.parent / workspace / 'Xpix' / 'target' / 'mips'
    if not img_path.exists():
        logger.info('img_path %s does not exist', str(img_path))
        running_counts.remove(count)
        output_queues[count].put('dne')
        return
    logger.info(gdb_location)
    logger.info(str(img_path))
    lina_path = img_path / 'asa' / 'bin' / 'lina'
    if not lina_path.exists():
        lina_path = img_path / 'smp'
    if not lina_path.exists():
        logger.info('lina_path %s does not exist', str(lina_path))
        running_counts.remove(count)
        output_queues[count].put('dne')
        return
    logger.info(str(lina_path))
    gdb = Popen([gdb_location, str(lina_path)], bufsize=1, stdin=PIPE, stdout=PIPE, stderr=STDOUT, cwd=str(img_path), universal_newlines=True)
    read_queue = Queue()
    def enqueue_output(out, queue):
        for line in iter(out.readline, ''):
            queue.put(line)
    t = Thread(target=enqueue_output, args=(gdb.stdout, read_queue))
    t.name = 'enqueue-thread-' + str(count)
    t.start()
    entered_commands = []
    def enter_command(command):
        nonlocal entered_commands
        gdb.stdin.write(command + '\n')
        entered_commands += [command]
    modified_file = UPLOAD_FOLDER / uuid / '.commands' / 'modified.py'
    if modified_file.exists():
        enter_command('source ' + str(modified_file))
    else:
        enter_command('source ' + str(CLIENTLESS_GDB))
    enter_command('core-file ' + str(coredump_path))
    enter_command('source ./.gdbinit')
    running = True
    restart = False
    logger_print = True
    timeout = False
    while running:
        try:
            if logger_print:
                logger.info('count %d - waiting', count)
            coredump = coredump_queues[count].get(timeout=600)
            if coredump == '':
                running = False
                logger.info('count %d - quit', count)
            elif start_coredump != coredump and coredump != '.modified':
                running = False
                restart = True
                logger.info('count %d - restart', count)
            else:
                command = command_queues[count].get()
                logger_print = not command.startswith('pi ')
                timeout = False
                enter_command(command)
                if command.startswith('0'):
                    gdb.stdin.write('1\n')
                else:
                    gdb.stdin.write('0\n')
                if logger_print:
                    logger.info('count %d - %s', count, command)
                output = ''
                end = False
                time_start = time()
                time_file = UPLOAD_FOLDER / uuid / '.commands' / 'timeout'
                if time_file.exists():
                    timeout_value = int(time_file.read_text())
                else:
                    timeout_value = 1
                timeout_value *= 3600
                while not end:
                    try:
                        line = read_queue.get_nowait()
                    except Empty:
                        try:
                            abort = abort_queues[count].get_nowait()
                            kill(gdb.pid, SIGINT)
                        except Empty:
                            pass
                        if gdb.poll() != None:
                            logger.info('count %d - gdb quit', count)
                            end = True
                            running = False
                            output_queues[count].put('gdb quit\n')
                        elif time() - time_start > timeout_value:
                            logger.info('count %d - gdb timeout', count)
                            time_start = time()
                            timeout = True
                            kill(gdb.pid, SIGINT)
                    else:
                        if command.startswith('0'):
                            undefined_index = line.find('(gdb) Undefined command: "1"')
                        else:
                            undefined_index = line.find('(gdb) Undefined command: "0"')
                        if undefined_index >= 0:
                            line = line[:undefined_index]
                            if logger_print:
                                logger.info('count %d - reached end', count)
                            end = True
                        command_index = line.find('(gdb) ')
                        while entered_commands and command_index >= 0:
                            line = line[:command_index + 6] + entered_commands.pop(0) + '\n' + line[command_index + 6:]
                            command_index = line.find('(gdb)', command_index + 6)
                        output += line
                if timeout:
                    output += 'gdb timeout after ' + str(timeout_value / 3600) + ' hours\n'
                output_queues[count].put(output)
                entered_commands = []
                abort_queues[count] = Queue()
        except Empty:
            logger.info('count %d - coredump timeout', count)
            running = False
    running_counts.remove(count)
    if restart:
        output_queues[count].put('restart')
        logger.info('count %d - inserted restart into output_queues', count)
    else:
        delete_queues(count)
        logger.info('count %d - no restart', count)
    logger.info('count %d - closing...', count)
    gdb.kill()
    gdb.wait()
    logger.info('count %d - closed', count)
    t.join()
    logger.info('count %d - exit', count)

def startup(count, uuid, coredump):
    global running_counts, coredump_queues
    logger.info('start')
    set_queues(count)
    running_counts.add(count)
    coredump_queues[count].put(coredump)
    cur = get_db().execute('SELECT workspace, gdb FROM cores WHERE uuid = ? AND coredump = ?', (uuid, coredump))
    workspace, gdb_location = cur.fetchall()[0]
    cur.close()
    worker = Thread(target=run_gdb, args=(count, uuid, workspace, gdb_location))
    worker.name = 'worker-thread-' + str(count)
    worker.start()
    logger.info('running_counts is %s', str(running_counts))

def queue_add(count, coredump, command):
    global coredump_queues, command_queues
    with queues_lock:
        coredump_queues[count].put(coredump)
        command_queues[count].put(command)

def remove_directory_and_parent(directory):
    if directory.exists():
        rmtree(str(directory))
        logger.info('directory %s deleted', str(directory))
    else:
        logger.info('directory %s does not exist', str(directory))
    try:
        directory.parent.rmdir()
        logger.info('removed empty folder %s', str(directory.parent))
    except:
        logger.info('folder %s not removed', str(directory.parent))

def delete_coredump(uuid, coredump):
    logger.info('deleting uuid %s and coredump %s', uuid, coredump)
    db = get_db()
    db.execute('DELETE FROM cores WHERE uuid = ? AND coredump = ?', (uuid, coredump))
    db.commit()
    logger.info('removed from database')
    directory = UPLOAD_FOLDER / uuid / coredump
    remove_directory_and_parent(directory)

def clean_uploads():
    with app.app_context():
        logger.info('start')
        cur = get_db().execute('SELECT uuid, coredump FROM cores WHERE timestamp < ?', (int(time() * 1000) - DELETE_MIN * 60 * 1000,))
        coredumps = cur.fetchall()
        cur.close()
        logger.info('coredumps has %d items', len(coredumps))
        for i in range(0, len(coredumps)):
            delete_coredump(coredumps[i][0], coredumps[i][1])
        for uuid in UPLOAD_FOLDER.iterdir():
            logger.info('testing uuid folder %s', uuid.name)
            for coredump in uuid.iterdir():
                if coredump.name != '.commands' and no_such_coredump(uuid.name, coredump.name) and getmtime(coredump) < time() - 24 * 60 * 60:
                    logger.info('removing directory %s', str(coredump))
                    remove_directory_and_parent(coredump)
            child_dirs = [d for d in uuid.iterdir()]
            if len(child_dirs) == 1 and child_dirs[0].name == '.commands':
                if getmtime(child_dirs[0]) > time() - 60 * 60:
                    logger.info('only .commands but too recent')
                else:
                    remove_directory_and_parent(child_dirs[0])
                    logger.info('removed .commands and parent')
        logger.info('clean finished')
        global dump_counter
        if dump_counter == 0:
            dump_database()
        dump_counter = (dump_counter + 1) % 24

def no_such_coredump(uuid, coredump):
    cur = get_db().execute('SELECT timestamp FROM cores WHERE uuid = ? AND coredump = ?', (uuid, coredump))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        logger.info('uuid %s and filename %s exist until %s', uuid, coredump, str(datetime.fromtimestamp(coredumps[0][0] / 1000 + DELETE_MIN * 60)))
        return False
    logger.info('uuid %s and filename %s do not exist', uuid, coredump)
    return True

def check_filename(uuid, filename):
    if filename.endswith('.gz'):
        secure = secure_filename(filename[:-3])
        logger.info('secure filename is %s', secure)
        if no_such_coredump(uuid, secure):
            if secure != '':
                logger.info('gz ok')
                return 'ok'
            logger.info('gz invalid')
            return 'invalid'
        logger.info('gz duplicate')
        return 'duplicate'
    secure = secure_filename(filename)
    logger.info('secure filename is %s', secure)
    if no_such_coredump(uuid, secure):
        if secure != '':
            logger.info('other ok')
            return 'ok'
        logger.info('other invalid')
        return 'invalid'
    logger.info('other duplicate')
    return 'duplicate'

def compile_decoder_text(directory, coredump, thread, registers, aslr_start, aslr_end):
    gen_core_report_file = directory / 'gen_core_report.txt'
    gen_core_report = gen_core_report_file.read_text()
    backtrace_file = directory / (coredump + '.backtrace.txt')
    backtraces = backtrace_file.read_text().split('\n\n')
    version = ([line.split()[-1] for line in gen_core_report.splitlines() if line.startswith('Version:')][0]).split('.')
    version_paren = version[0] + '.' + version[1] + '(' + version[2] + ')'
    if len(version) > 3:
        version_paren += version[3]
    hardware = [line.split()[-1] for line in gen_core_report.splitlines() if line.startswith('Platform:')][0]
    aslr = ((aslr_start.split()[-1][2:] + '-') if match('0x[0-9a-f]+', aslr_start.split()[-1]) else '') + (aslr_end.split()[-1][2:] if match('0x[0-9a-f]+', aslr_end.split()[-1]) else '')
    if aslr != '':
        aslr = 'ASLR enabled, text region ' + aslr + '\n'
    traceback = '\n'.join([str(i - 1) + ': ' + line.split()[1] for i, line in enumerate(backtraces[len(backtraces) - thread - 1].splitlines()) if match('0x[0-9a-f]+', line.split()[1])])
    return 'Thread Name:\n' + '\n'.join(registers.split('\n')[1:]) + 'Cisco Adaptive Security Appliance Software Version ' + version_paren + '\nCompiled on  by builders\nHardware: ' + hardware + '\n' + aslr + 'Traceback:\n' + traceback

def update_timestamp(uuid, coredump):
    timestamp = int(time() * 1000)
    db = get_db()
    db.execute('UPDATE cores SET timestamp = ? WHERE uuid = ? AND coredump = ?', (timestamp, uuid, coredump))
    db.commit()
    return timestamp

def get_timeout(uuid):
    commands_folder = UPLOAD_FOLDER / uuid / '.commands'
    timeout_file = commands_folder / 'timeout'
    if not commands_folder.exists() or not timeout_file.exists():
        return 1
    return int(timeout_file.read_text())

def enum_threads():
    enum_output = thread_enum()
    named_threads = [thread.name for thread in enum_output if not thread.name.startswith('<')]
    logger.info('%d named threads and %d gunicorn (%d total)', len(named_threads), len(enum_output) - len(named_threads), len(enum_output))
    logger.info(named_threads)

def dump_database():
    cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp, workspace, gdb FROM cores ORDER BY uuid')
    coredumps = cur.fetchall()
    cur.close()
    logger.info('DATABASE DUMP')
    logger.info('**********')
    prev_uuid = ''
    for i in range(0, len(coredumps)):
        row = coredumps[i]
        if prev_uuid != row[0]:
            prev_uuid = row[0]
            logger.info('UUID: %s', row[0])
        logger.info('    COREDUMP:  %s', row[1])
        logger.info('    FILESIZE:  %d', row[2])
        logger.info('    TIMESTAMP: %d (%s)', row[3], str(datetime.fromtimestamp(row[3] / 1000)))
        logger.info('    WORKSPACE: %s', row[4])
        logger.info('    GDB:       %s', row[5])
        logger.info('')
    logger.info('**********')

@app.route('/', methods=['GET'])
def index():
    if 'uuid' in session:
        uuid = session['uuid']
        logger.info('uuid in session, value is %s', uuid)
        cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp FROM cores WHERE uuid = ?', (uuid,))
        coredumps = cur.fetchall()
        cur.close()
        logger.info('contents of coredumps')
        logger.info('**********')
        for i in range(0, len(coredumps)):
            logger.info('Row %d', i)
            row = coredumps[i]
            for obj in row:
                logger.info('%s', str(obj))
        logger.info('**********')
    else:
        uuid = str(uuid4())
        session['uuid'] = uuid
        logger.info('uuid NOT in session, value is %s', uuid)
        coredumps = []
    global count
    with count_lock:
        session['count'] = count
        count += 1
    logger.info('count is %d', session['count'])
    logger.info('coredump_queues is %s', str(coredump_queues))
    logger.info('running_counts is %s', str(running_counts))
    enum_threads()
    return render_template('autopsy.html', uuid=uuid, coredumps=coredumps, timeout=get_timeout(uuid))

@app.route('/help', methods=['GET'])
def help():
    logger.info('opened help')
    return render_template('help.html')

@app.route('/dump', methods=['GET'])
def dump():
    dump_database()
    return 'ok'

@app.route('/delete', methods=['POST'])
def delete():
    logger.info('start')
    if not 'uuid' in session:
        return 'missing session'
    delete_coredump(session['uuid'], request.form['coredump'])
    return 'ok'

@app.route('/testkey', methods=['POST'])
def test_key():
    if not 'uuid' in session:
        return 'missing session'
    testkey = request.form['testkey']
    logger.info('%s', testkey)
    cur = get_db().execute('SELECT uuid FROM cores WHERE uuid = ?', (testkey,))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        logger.info('valid key')
        return 'yes'
    logger.info('invalid key')
    return 'no'

@app.route('/loadkey', methods=['POST'])
def load_key():
    if not 'uuid' in session:
        return jsonify(message='missing session')
    uuid = request.form['loadkey']
    logger.info('%s', uuid)
    cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp FROM cores WHERE uuid = ?', (uuid,))
    coredumps = cur.fetchall()
    cur.close()
    session['uuid'] = uuid
    session.pop('current', None)
    global count, running_counts, coredump_queues
    if session['count'] in running_counts:
        with queues_lock:
            logger.info('quitting count %d', session['count'])
            coredump_queues[session['count']].put('')
    with count_lock:
        session['count'] = count
        count += 1
    logger.info('count is %d', session['count'])
    return jsonify(uuid=uuid, coredumps=coredumps, timeout=get_timeout(uuid))

@app.route('/generatekey', methods=['POST'])
def generate_key():
    if not 'uuid' in session:
        return 'missing session'
    new_uuid = str(uuid4())
    session['uuid'] = new_uuid
    logger.info('%s', new_uuid)
    session.pop('current', None)
    global count, running_counts, coredump_queues
    if session['count'] in running_counts:
        with queues_lock:
            logger.info('quitting count %d', session['count'])
            coredump_queues[session['count']].put('')
    with count_lock:
        session['count'] = count
        count += 1
    logger.info('count is %d', session['count'])
    return new_uuid

@app.route('/linktest', methods=['POST'])
def link_test():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(message='missing session')
    logger.info('url is ' + request.form['url'])
    logger.info('username is ' + request.form['username'])
    try:
        logger.info('trying basic auth')
        r = get(request.form['url'], auth=HTTPBasicAuth(request.form['username'], request.form['password']), stream=True, timeout=30)
        if r.status_code == 401:
            logger.info('trying ntlm auth')
            r = get(request.form['url'], auth=HttpNtlmAuth('CISCO\\' + request.form['username'], request.form['password']), stream=True, timeout=30)
            if r.status_code == 401:
                logger.info('invalid credentials')
                return jsonify(message='credentials')
        logger.info('request get')
    except:
        logger.info('invalid url')
        return jsonify(message='url')
    logger.info('status code is %d', r.status_code)
    try:
        filename = secure_filename(findall('filename="(.+)"', r.headers['content-disposition'])[0])
        check_result = check_filename(session['uuid'], filename)
        if check_result != 'ok':
            return jsonify(message=check_result)
    except:
        logger.info('filename not found')
        filename = 'coredump-' + str(int(time() * 1000))
        while not no_such_coredump(session['uuid'], filename):
            filename = 'coredump-' + str(int(time() * 1000))
    session['current'] = filename
    logger.info('ok, filename is %s', filename)
    return jsonify(message='ok', filename=filename)

@app.route('/linkupload', methods=['POST'])
def link_upload():
    logger.info('start')
    if not 'current' in session:
        return 'missing session'
    try:
        r = get(request.form['url'], auth=HTTPBasicAuth(request.form['username'], request.form['password']), stream=True, timeout=30)
        if r.status_code == 401:
            r = get(request.form['url'], auth=HttpNtlmAuth('CISCO\\' + request.form['username'], request.form['password']), stream=True, timeout=30)
            if r.status_code == 401:
                return 'credentials'
    except:
        return 'url'
    filename = session['current']
    if filename.endswith('.gz'):
        directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
    else:
        directory = UPLOAD_FOLDER / session['uuid'] / filename
    logger.info('making directory %s', str(directory))
    directory.mkdir(parents=True, exist_ok=True)
    filepath = directory / filename
    with open(str(filepath), 'wb') as f:
        for chunk in r.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)
    logger.info('saved file')
    file_test = run(['file', '-b', str(filepath)], stdout=PIPE, universal_newlines=True).stdout
    logger.info('file type is %s', file_test.rstrip())
    if filename.endswith('.gz') and file_test.startswith('gzip compressed data'):
        logger.info('gz ok')
        return 'gz ok'
    if file_test.startswith('ELF 64-bit LSB core file'):
        logger.info('core ok')
        return 'core ok'
    logger.info('removing file')
    session.pop('current', None)
    remove_directory_and_parent(directory)
    logger.info('invalid')
    return 'invalid'

@app.route('/filetest', methods=['POST'])
def file_test():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(message='missing session')
    logger.info('server is ' + request.form['server'])
    logger.info('path is ' + request.form['path'])
    logger.info('username is ' + request.form['username'])
    basepath = basename(request.form['path'])
    filename = secure_filename(basepath)
    if basepath != filename or filename == '':
        logger.info('bad basepath')
        return jsonify(message='invalid')
    check_result = check_filename(session['uuid'], filename)
    if check_result != 'ok':
        return jsonify(message=check_result)
    if filename.endswith('.gz'):
        directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
    else:
        directory = UPLOAD_FOLDER / session['uuid'] / filename
    logger.info('making directory %s', str(directory))
    directory.mkdir(parents=True, exist_ok=True)
    try:
        scp = spawn('scp', [request.form['username'] + '@' + request.form['server'] + ':' + request.form['path'], str(directory)], encoding='utf-8')
        scp.logfile_read = logger
        i = scp.expect([EOF, '\(yes/no\)\?', 'assword:'], timeout=10)
        logger.info('expect i is %d', i)
        if i == 0:
            logger.info('bad server')
            remove_directory_and_parent(directory)
            return jsonify(message='server')
        else:
            if i == 1:
                logger.info('requires rsa')
                scp.sendline('yes')
                scp.expect('assword:', timeout=10)
            scp.sendline(request.form['password'])
            j = scp.expect(['assword:', 'syntax error', 'regular file', 'file or directory', 'ETA', EOF], timeout=30)
            logger.info('expect j is %d', j)
            if j == 0:
                logger.info('wrong credentials')
                remove_directory_and_parent(directory)
                return jsonify(message='credentials')
            elif j == 1:
                logger.info('syntax error')
                remove_directory_and_parent(directory)
                return jsonify(message='invalid')
            elif j == 2:
                logger.info('regular file')
                remove_directory_and_parent(directory)
                return jsonify(message='invalid')
            elif j == 3:
                logger.info('file or directory')
                remove_directory_and_parent(directory)
                return jsonify(message='invalid')
            else:
                scp.sendintr()
                logger.info('valid')
                session['current'] = filename
                logger.info('ok, filename is %s', filename)
                return jsonify(message='ok', filename=filename)
    except TIMEOUT:
        logger.info('timeout')
        remove_directory_and_parent(directory)
        return jsonify(message='timeout')

@app.route('/fileupload', methods=['POST'])
def file_upload():
    logger.info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current']
    if filename.endswith('.gz'):
        directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
    else:
        directory = UPLOAD_FOLDER / session['uuid'] / filename
    logger.info('making directory %s', str(directory))
    directory.mkdir(parents=True, exist_ok=True)
    try:
        scp = spawn('scp', [request.form['username'] + '@' + request.form['server'] + ':' + request.form['path'], str(directory)], encoding='utf-8')
        scp.logfile_read = logger
        i = scp.expect([EOF, '\(yes/no\)\?', 'assword:'], timeout=10)
        logger.info('expect i is %d', i)
        if i == 0:
            remove_directory_and_parent(directory)
            return 'server'
        else:
            if i == 1:
                logger.info('requires rsa')
                scp.sendline('yes')
                scp.expect('assword:', timeout=10)
            scp.sendline(request.form['password'])
            j = 4
            while j == 4:
                j = scp.expect(['assword:', 'syntax error', 'regular file', 'file or directory', 'ETA', EOF], timeout=30)
            logger.info('expect j is %d', j)
            if j == 0:
                remove_directory_and_parent(directory)
                return 'credentials'
            elif j == 1:
                remove_directory_and_parent(directory)
                return 'invalid'
            elif j == 2:
                remove_directory_and_parent(directory)
                return 'invalid'
            elif j == 3:
                remove_directory_and_parent(directory)
                return 'invalid'
            else:
                logger.info('copied file')
                filepath = directory / filename
                file_test = run(['file', '-b', str(filepath)], stdout=PIPE, universal_newlines=True).stdout
                logger.info('file type is %s', file_test.rstrip())
                if filename.endswith('.gz') and file_test.startswith('gzip compressed data'):
                    logger.info('gz ok')
                    return 'gz ok'
                if file_test.startswith('ELF 64-bit LSB core file'):
                    logger.info('core ok')
                    return 'core ok'
                logger.info('removing file')
                session.pop('current', None)
                remove_directory_and_parent(directory)
                logger.info('invalid')
                return 'invalid'
    except TIMEOUT:
        logger.info('timeout')
        remove_directory_and_parent(directory)
        return 'timeout'

@app.route('/testfilename', methods=['POST'])
def test_filename():
    if not 'uuid' in session:
        return 'missing session'
    filename = request.form['filename']
    logger.info('testing %s', filename)
    return check_filename(session['uuid'], filename)

@app.route('/upload', methods=['POST'])
def upload():
    logger.info('start')
    if not 'uuid' in session:
        return 'missing session'
    if 'file' not in request.files:
        logger.info('file not in request')
        return 'notrequested'
    file = request.files['file']
    if not file or file.filename == '':
        logger.info('empty')
        return 'empty'
    check_result = check_filename(session['uuid'], file.filename)
    if check_result != 'ok':
        return check_result
    logger.info('file name allowed and is %s', file.filename)
    filename = secure_filename(file.filename)
    logger.info('secure file name is %s', filename)
    if filename.endswith('.gz'):
        directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
    else:
        directory = UPLOAD_FOLDER / session['uuid'] / filename
    logger.info('making directory %s', str(directory))
    directory.mkdir(parents=True, exist_ok=True)
    filepath = directory / filename
    file.save(str(filepath))
    logger.info('saved file')
    file_test = run(['file', '-b', str(filepath)], stdout=PIPE, universal_newlines=True).stdout
    logger.info('file type is %s', file_test.rstrip())
    if filename.endswith('.gz') and file_test.startswith('gzip compressed data'):
        session['current'] = filename
        logger.info('gz ok')
        return 'gz ok'
    if file_test.startswith('ELF 64-bit LSB core file'):
        session['current'] = filename
        logger.info('core ok')
        return 'core ok'
    logger.info('removing file')
    remove_directory_and_parent(directory)
    logger.info('invalid')
    return 'invalid'

@app.route('/unzip', methods=['POST'])
def unzip():
    logger.info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current']
    filepath = UPLOAD_FOLDER / session['uuid'] / filename[:-3] / filename
    if not filepath.exists():
        logger.info('filepath %s does not exist', str(filepath))
        session.pop('current', None)
        return 'invalid filename'
    returncode = run(['gunzip', '-f', str(filepath)]).returncode
    if returncode != 0:
        logger.info('failed')
        session.pop('current', None)
        return 'unzip failed'
    session['current'] = filename[:-3]
    logger.info('ok')
    return 'ok'

@app.route('/build', methods=['POST'])
def build():
    logger.info('start')
    if not 'current' in session:
        return jsonify(output='missing session')
    filename = session['current']
    directory = UPLOAD_FOLDER / session['uuid'] / filename
    filepath = directory / filename
    if not filepath.exists():
        logger.info('filepath %s does not exist', str(filepath))
        session.pop('current', None)
        return jsonify(output='invalid filename')
    report = run([str(GEN_CORE_REPORT), '-g', '-k', '-c', str(filepath)], cwd=str(directory), stdout=PIPE, universal_newlines=True).stdout
    if not filepath.exists():
        logger.info('gen_core_report removed filepath %s', str(filepath))
        session.pop('current', None)
        return jsonify(report='build failed')
    logger.info(report.splitlines()[0])
    report_file = directory / 'gen_core_report.txt'
    report_file.write_text(report)
    filesize = filepath.stat().st_size
    timestamp = int(time() * 1000)
    session.pop('current', None)
    try:
        workspace = [line[line.rfind('/') + 1:] for line in report.splitlines() if line.startswith('A minimal')][0]
        gdb_location = [line.split()[-1] for line in report.splitlines() if line.startswith('GDB:')][0]
        db = get_db()
        db.execute('INSERT INTO cores VALUES (?, ?, ?, ?, ?, ?)', (session['uuid'], filename, filesize, timestamp, workspace, gdb_location))
        db.commit()
        logger.info('inserted %s, %s, %d, %d, %s, %s into cores', session['uuid'], filename, filesize, timestamp, workspace, gdb_location)
    except:
        logger.info('workspace failed')
        remove_directory_and_parent(directory)
        return jsonify(report=report)
    global running_counts, output_queues
    if not session['count'] in running_counts:
        logger.info('starting')
        startup(session['count'], session['uuid'], filename)
    queue_add(session['count'], filename, '1')
    startup_result = output_queues[session['count']].get()
    if startup_result == 'restart':
        logger.info('restart')
        delete_queues(session['count'])
        startup(session['count'], session['uuid'], filename)
        queue_add(session['count'], filename, '1')
        startup_result = output_queues[session['count']].get()
    decoder_file = directory / 'decoder.txt'
    if startup_result == 'dne':
        logger.info('dne')
        delete_queues(session['count'])
        decoder_file.write_text('decoder text failed')
        return jsonify(filename=filename, filesize=filesize, timestamp=timestamp)
    try:
        siginfo_file = directory / (filename + '.siginfo.txt')
        siginfo = siginfo_file.read_text()
        thread = int((siginfo.splitlines()[0]).split()[-1])
        queue_add(session['count'], filename, 'thread ' + str(thread))
        output_queues[session['count']].get()
        queue_add(session['count'], filename, 'info registers')
        registers = output_queues[session['count']].get()
        queue_add(session['count'], filename, 'p _lina_text_start')
        aslr_start = output_queues[session['count']].get()
        queue_add(session['count'], filename, 'p _lina_text_end')
        aslr_end = output_queues[session['count']].get()
        decoder_text = compile_decoder_text(directory, filename, thread, registers, aslr_start, aslr_end)
        logger.info(decoder_text.splitlines()[0])
        decoder_file.write_text(decoder_text)
        logger.info('decoder file write')
    except:
        logger.info('decoder text failed')
        decoder_file.write_text('decoder text failed')
    return jsonify(filename=filename, filesize=filesize, timestamp=timestamp)

@app.route('/getreport', methods=['POST'])
def get_report():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_coredump(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    gen_core_report_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / 'gen_core_report.txt'
    return jsonify(output=escape(gen_core_report_file.read_text()), timestamp=timestamp)

@app.route('/backtrace', methods=['POST'])
def backtrace():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_coredump(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    backtrace_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / (request.form['coredump'] + '.backtrace.txt')
    return jsonify(output=escape(backtrace_file.read_text()), timestamp=timestamp)

@app.route('/siginfo', methods=['POST'])
def siginfo():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_coredump(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    siginfo_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / (request.form['coredump'] + '.siginfo.txt')
    return jsonify(output=escape(siginfo_file.read_text()), timestamp=timestamp)

@app.route('/decode', methods=['POST'])
def decode():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_coredump(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    decoder_output = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / 'decoder_output.html'
    if decoder_output.exists():
        logger.info('already generated')
        return jsonify(output=decoder_output.read_text(), timestamp=timestamp)
    decoder_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / 'decoder.txt'
    try:
        decoder_text = decoder_file.read_text()
        if decoder_text == 'decoder text failed':
            return jsonify(output=decoder_text, timestamp=timestamp)
        payload = {'VERSION': 'AUTODETECT', 'IMAGE': 'AUTODETECT', 'SRNUMBER': '', 'ALGORITHM': 'L', 'TRACEBACK': decoder_text}
        r = post('http://asa-decoder/sch/asadecode-disp.php', auth=HTTPBasicAuth('AutopsyUser', 'Bz853F30_j'), data=payload, stream=True, timeout=30)
        base_text = r.text.splitlines()
        base_text = base_text[0] + '\n<base href="http://asa-decoder/" target="_blank">\n' + '\n'.join(base_text[1:])
        logger.info(base_text.splitlines()[0]);
    except:
        logger.info('base text failed')
        base_text = 'failed'
    decoder_output.write_text(base_text)
    logger.info('saved base text')
    return jsonify(output=base_text, timestamp=timestamp)

@app.route('/abort', methods=['POST'])
def abort():
    logger.info('start')
    if not 'uuid' in session:
        return 'missing session'
    global abort_queues
    if session['count'] in running_counts:
        with queues_lock:
            abort_queues[session['count']].put('abort')
    return 'ok'

@app.route('/commandinput', methods=['POST'])
def command_input():
    logger.info('start')
    if not 'count' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_coredump(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    global running_counts, output_queues
    logger.info('%s', request.form['command'])
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    logger.info('count is %d', session['count'])
    logger.info('running_counts is %s', str(running_counts))
    if not session['count'] in running_counts:
        logger.info('starting')
        startup(session['count'], session['uuid'], request.form['coredump'])
    queue_add(session['count'], request.form['coredump'], request.form['command'])
    result = output_queues[session['count']].get()
    if result == 'restart':
        logger.info('restart')
        delete_queues(session['count'])
        startup(session['count'], session['uuid'], request.form['coredump'])
        queue_add(session['count'], request.form['coredump'], request.form['command'])
        result = output_queues[session['count']].get()
    if result == 'dne':
        logger.info('dne')
        delete_queues(session['count'])
        result = 'gdb not supported'
    return jsonify(output=escape(result), timestamp=timestamp)

@app.route('/getsource', methods=['POST'])
def get_source():
    if not 'uuid' in session:
        return 'missing session'
    commands_folder = UPLOAD_FOLDER / session['uuid'] / '.commands'
    command_file = commands_folder / 'modified.py'
    if not commands_folder.exists() or not command_file.exists():
        command_file = CLIENTLESS_GDB
    return command_file.read_text()

@app.route('/updatesource', methods=['POST'])
def update_source():
    if not 'uuid' in session:
        return 'missing session'
    commands_folder = UPLOAD_FOLDER / session['uuid'] / '.commands'
    if not commands_folder.exists():
        commands_folder.mkdir(parents=True, exist_ok=True)
    modified_file = commands_folder / 'modified.py'
    updated_source = '\n'.join(request.form['source'].splitlines()) + '\n'
    output = ''
    if modified_file.exists() and modified_file.read_text() == updated_source:
        return output
    modified_file.write_text(updated_source)
    if 'count' in session and session['count'] in running_counts:
        queue_add(session['count'], '.modified', 'source ' + str(modified_file))
        output = output_queues[session['count']].get()
    return output

@app.route('/resetsource', methods=['POST'])
def reset_source():
    if not 'uuid' in session:
        return jsonify(display='missing session', output='')
    commands_folder = UPLOAD_FOLDER / session['uuid'] / '.commands'
    if not commands_folder.exists():
        commands_folder.mkdir(parents=True, exist_ok=True)
    modified_file = commands_folder / 'modified.py'
    output = ''
    original_source = CLIENTLESS_GDB.read_text()
    if modified_file.exists() and modified_file.read_text() == original_source:
        return jsonify(display=original_source, output=output)
    modified_file.write_text(original_source)
    if 'count' in session and session['count'] in running_counts:
        queue_add(session['count'], '.modified', 'source ' + str(modified_file))
        output = output_queues[session['count']].get()
    return jsonify(display=original_source, output=output)

@app.route('/diffsource', methods=['POST'])
def diff_source():
    if not 'uuid' in session:
        return jsonify(display='missing session', output='')
    commands_folder = UPLOAD_FOLDER / session['uuid'] / '.commands'
    if not commands_folder.exists():
        commands_folder.mkdir(parents=True, exist_ok=True)
    updated_source = '\n'.join(request.form['source'].splitlines()) + '\n'
    output = ''
    if updated_source == CLIENTLESS_GDB.read_text():
        return jsonify(display='no changes made', output=output)
    modified_file = commands_folder / 'modified.py'
    modified_file.write_text(updated_source)
    if 'count' in session and session['count'] in running_counts:
        queue_add(session['count'], '.modified', 'source ' + str(modified_file))
        output = output_queues[session['count']].get()
    diff = run(['diff', '-u', str(CLIENTLESS_GDB), str(modified_file)], stdout=PIPE, universal_newlines=True).stdout
    return jsonify(display=diff, output=output)

@app.route('/updatetimeout', methods=['POST'])
def update_timeout():
    if not 'uuid' in session:
        return 'missing session'
    commands_folder = UPLOAD_FOLDER / session['uuid'] / '.commands'
    if not commands_folder.exists():
        commands_folder.mkdir(parents=True, exist_ok=True)
    timeout_file = commands_folder / 'timeout'
    try:
        timeout_value = int(request.form['timeout'])
        if 1 <= timeout_value <= 400:
            timeout_file.write_text(str(timeout_value))
            return 'ok'
        return 'out of range'
    except:
        return 'not int'

@app.route('/quit', methods=['POST'])
def quit():
    logger.info('start')
    if not 'count' in session:
        return 'missing session'
    global running_counts, coredump_queues
    if not session['count'] in running_counts:
        logger.info('not running')
        return 'not running'
    with queues_lock:
        coredump_queues[session['count']].put('')
    logger.info('ok')
    return 'ok'

@app.route('/checksession', methods=['POST'])
def check_session():
    if not 'uuid' in session:
        return 'missing session'
    if request.form['uuid'] != session['uuid']:
        logger.info('%s and %s', request.form['uuid'], session['uuid'])
        return 'bad'
    return 'ok'

@app.before_first_request
def start():
    logger.info(version)
    s = scheduler()
    def sched_clean():
        clean_uploads()
        s.enter(3600, 1, sched_clean)
    sched_clean()
    t = Thread(target=s.run)
    t.name = 'clean-thread'
    t.start()

app.secret_key = token_bytes()
