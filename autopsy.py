from cgi import escape
from logging import basicConfig, DEBUG, info
from pathlib import Path
from queue import Queue, Empty
from subprocess import call, check_output, PIPE, Popen, STDOUT
from shutil import rmtree
from sqlite3 import connect
from sys import version
from threading import Lock, Thread
from time import time
from uuid import uuid4

from flask import Flask, jsonify, g, render_template, request, Response, session
from werkzeug.utils import secure_filename

basicConfig(format='[%(asctime)s] %(levelname)s [%(funcName)s:%(lineno)d] %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p', level=DEBUG)
info(version)

app = Flask(__name__)

UPLOAD_FOLDER = Path(app.root_path) / 'uploads'
DATABASE = Path(app.root_path) / 'database' / 'cores.db'
CLIENTLESS_GDB = Path(app.root_path).parent / 'clientlessgdb' / 'clientlessGdb.py'
GEN_CORE_REPORT = Path(app.root_path).parent / 'clientlessgdb' / 'gen_core_report.sh'
COMMANDS = ['asacommands', 'checkibuf', 'checkoccamframe', 'dispak47anonymouspools', 'dispak47vols', 'dispallactiveawarectx', 'dispallactiveuctectx', 'dispallactiveucteoutway', 'dispallak47instance', 'dispallattachedthreads', 'dispallawarectx', 'dispallpoolsinak47instance', 'dispallthreads', 'dispalluctectx', 'dispallucteoutway', 'dispasastate', 'dispasathread', 'dispawareurls', 'dispbacktraces', 'dispcacheinfo', 'dispclhash', 'dispcrashthread', 'dispdpthreads', 'dispfiberinfo', 'dispfiberstacks', 'dispfiberstats', 'dispgdbthreadinfo', 'displuastack', 'displuastackbyl', 'displuastackbylreverse', 'dispmeminfo', 'dispmemregion', 'dispoccamframe', 'dispramfsdirtree', 'dispsiginfo', 'dispstackforthread', 'dispstackfromrbp', 'dispthreads', 'dispthreadstacks', 'disptypes', 'dispunmangleurl', 'dispurls', 'findString', 'findmallochdr', 'findoccamframes', 'generatereport', 'searchMem', 'searchMemAll', 'search_mem', 'showak47info', 'showak47instances', 'showblocks', 'showconsolemessage', 'unescapestring', 'verifyoccaminak47instance', 'verifystacks', 'walkIntervals', 'webvpn_print_block_failures'];

uuid_queues = {}
coredump_queues = {}
command_queues = {}
output_queues = {}
queues_lock = Lock()

running_counts = set()
count = 0
count_lock = Lock()

def get_pass():
    info('opening password.txt')
    with open('password.txt') as f:
        return f.readline()

def perforce_login():
    info('start')
    perforce_login = Popen(['p4', 'login'], stdin=PIPE, stdout=PIPE, universal_newlines=True)
    info(perforce_login.communicate(get_pass())[0].rstrip())
    info('exit')

perforce_login()

def enqueue_output(out, queue):
    for line in iter(out.readline, ''):
        queue.put(line)
    out.close()

def run_gdb(count):
    info('count %d - start', count)
    global uuid_queues, coredump_queues, command_queues, output_queues
    start_uuid = uuid_queues[count].get()
    start_coredump = coredump_queues[count].get()
    coredump_path = UPLOAD_FOLDER / start_uuid / start_coredump / start_coredump
    smp_path = coredump_path.parent / (start_coredump + '_workspace') / 'Xpix' / 'target' / 'smp'
    info(str(smp_path))
    gdb = Popen(['/auto/stbu-tools/wrlinux/poc/wrl6/wrlinux-6/layers/binary-toolchain-4.8-27/bin/i686-wrs-linux-gnu-gdb', str(smp_path / 'asa' / 'bin' / 'lina')], bufsize=1, stdin=PIPE, stdout=PIPE, stderr=STDOUT, cwd=str(smp_path), universal_newlines=True)
    read_queue = Queue()
    t = Thread(target=enqueue_output, args=(gdb.stdout, read_queue))
    t.daemon = True
    t.start()
    info('count %d - thread started', count)
    entered_commands = []
    def enter_command(command):
        nonlocal entered_commands
        gdb.stdin.write(command + '\n')
        entered_commands += [command]
    enter_command('source ' + str(CLIENTLESS_GDB))
    enter_command('core-file ' + str(coredump_path))
    info('count %d - entering while', count)
    running = True
    restart = False
    while running:
        try:
            info('count %d - waiting', count)
            uuid = uuid_queues[count].get(True, 30)
            coredump = coredump_queues[count].get()
            if start_uuid != uuid or start_coredump != coredump:
                running = False
                restart = True
                info('count %d - restart', count)
            else:
                command = command_queues[count].get()
                enter_command(command)
                gdb.stdin.write('0\n')
                info('count %d - wrote into gdb', count)
                output = ''
                while True:
                    try:
                        line = read_queue.get_nowait()
                    except Empty:
                        pass
                    else:
                        undefined_index = line.find('(gdb) Undefined command: "0"')
                        if undefined_index >= 0:
                            output += line[:undefined_index]
                            info('run_gdb: count %d - reached end', count)
                            break
                        else:
                            command_index = line.find('(gdb) ')
                            while command_index >= 0:
                                line = line[:command_index + 6]  + entered_commands.pop(0) + '\n' + line[command_index + 6:]
                                command_index = line.find('(gdb)', command_index + 6)
                            output += line
                output_queues[count].put(output)
                entered_commands = []
        except Exception as e:
            print(e)
            running = False
    running_counts.remove(count)
    if restart:
        output_queues[count].put('restart')
        info('count %d - inserted restart into output_queues', count)
    else:
        delete_queues(count)
        info('count %d - no restart', count)
    info('count %d - exit', count)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect(str(DATABASE))
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        info('closing database')
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

@app.cli.command('initdb')
def initdb_command():
    init_db()
    info('initialized database')

def set_queues(count):
    global uuid_queues, coredump_queues, command_queues, output_queues
    uuid_queues[count] = Queue(maxsize=0)
    coredump_queues[count] = Queue(maxsize=0)
    command_queues[count] = Queue(maxsize=0)
    output_queues[count] = Queue(maxsize=0)

def delete_queues(count):
    global uuid_queues, coredump_queues, command_queues, output_queues
    del uuid_queues[count]
    del coredump_queues[count]
    del command_queues[count]
    del output_queues[count]

@app.route('/', methods=['GET'])
def index():
    if 'uuid' in session:
        uuid = session['uuid']
        info('uuid in session, value is %s', uuid)
        cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp FROM cores WHERE uuid = ?', (uuid,))
        coredumps = cur.fetchall()
        cur.close()
        valid_directories = []
        info('contents of coredumps')
        info('**********')
        for i in range(0, len(coredumps)):
            info('Row %d', i)
            row = coredumps[i]
            valid_directories += [row[1]]
            for obj in row:
                info('%s', str(obj))
        info('**********')
        directory = UPLOAD_FOLDER / session['uuid']
        if directory.exists():
            for entry in directory.iterdir():
                if not entry.name in valid_directories:
                    info('removing %s', entry.name)
                    if entry.is_dir():
                        rmtree(str(entry))
                    else:
                        entry.unlink()
    else:
        uuid = str(uuid4())
        session['uuid'] = uuid
        info('uuid NOT in session, value is %s', uuid)
        coredumps = ''
    global count
    with count_lock:
        session['count'] = count
        count += 1
    info('count is %d', session['count'])
    info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return render_template('autopsy.html', uuid=uuid, coredumps=coredumps)

@app.route('/delete', methods=['POST'])
def delete():
    info('start')
    if not 'uuid' in session:
        return 'missing session'
    filename = request.form['coredump']
    info('filename is %s', filename)
    db = get_db()
    db.execute('DELETE FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], filename))
    db.commit()
    info('removed from database')
    filepath = UPLOAD_FOLDER / session['uuid'] / filename
    if filepath.exists():
        info('filepath exists')
        rmtree(str(filepath))
        info('removed coredump folder')
    else:
        info('error with filepath')
    return 'ok'

@app.route('/testkey', methods=['POST'])
def testkey():
    testkey = request.form['testkey']
    logging('%s', testkey)
    cur = get_db().execute('SELECT uuid FROM cores WHERE uuid = ?', (testkey,))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        info('valid key')
        return 'yes'
    info('invalid key')
    return 'no'

@app.route('/loadkey', methods=['POST'])
def loadkey():
    loadkey = request.form['loadkey']
    info('%s', loadkey)
    cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp FROM cores WHERE uuid = ?', (loadkey,))
    coredumps = cur.fetchall()
    cur.close()
    session['uuid'] = loadkey
    session.pop('current', None)
    global count
    with count_lock:
        session['count'] = count
        count += 1
    info('count is %d', session['count'])
    info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return jsonify(coredumps)

@app.route('/generatekey', methods=['POST'])
def generatekey():
    new_uuid = str(uuid4())
    session['uuid'] = new_uuid
    info('%s', new_uuid)
    session.pop('current', None)
    global count
    with count_lock:
        session['count'] = count
        count += 1
    info('count is %d', session['count'])
    info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return new_uuid

def allowed_file(uuid, filename):
    cur = get_db().execute('SELECT coredump FROM cores WHERE uuid = ? AND coredump = ?', (uuid, secure_filename(filename)[:-3]))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        info('duplicate')
        return False
    info('ok')
    return True

@app.route('/testfilename', methods=['POST'])
def testfilename():
    info('testing %s', request.form['filename'])
    if not 'uuid' in session:
        return 'missing session'
    if request.form['filename'][-3:] != '.gz':
        info('type')
        return 'type'
    if allowed_file(session['uuid'], request.form['filename']):
        info('ok')
        return 'ok'
    info('duplicate')
    return 'duplicate'

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        info('file not in request')
        return 'notrequested'
    file = request.files['file']
    if file.filename == '':
        info('file name is empty')
        return 'empty'
    if file and allowed_file(session['uuid'], file.filename):
        info('file name allowed')
        info('file name is %s', file.filename)
        filename = secure_filename(file.filename)
        info('secure file name is %s', filename)
        directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
        if not directory.exists():
            info('making directory %s', directory)
            directory.mkdir(parents=True)
        filepath = directory / filename
        file.save(str(filepath))
        info('saved file')
        file_test = check_output(['file', '-b', str(filepath)])
        info('file type is %s', file_test.rstrip())
        if not filename.endswith('.gz') or not file_test.startswith('gzip compressed data'):
            info('removing file')
            if filepath.exists():
                info('filepath exists')
                filepath.unlink()
                info('removed file')
            else:
                info('error with filepath')
            info('not gzip')
            return 'not gzip'
        session['current'] = filename
        info('ok')
        return 'ok'
    else:
        info('duplicate')
        return 'duplicate'

@app.route('/unzip', methods=['POST'])
def unzip():
    info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current']
    filepath = UPLOAD_FOLDER / session['uuid'] / filename[:-3] / filename
    z = call(['gunzip', '-f', str(filepath)])
    new_filepath = Path(str(filepath)[:-3])
    if not new_filepath.exists():
        info('failed')
        session.pop('current', None)
        return 'unzip failed'
    info('complete')
    return 'finished'

@app.route('/build', methods=['POST'])
def build():
    info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current'][:-3]
    directory = UPLOAD_FOLDER / session['uuid'] / filename
    filepath = directory / filename
    report = check_output([GEN_CORE_REPORT, '-g', '-c', str(filepath)], cwd=str(directory))
    info(report)
    filesize = filepath.stat().st_size
    timestamp = int(time() * 1000)
    db = get_db()
    db.execute('INSERT INTO cores VALUES (?, ?, ?, ?, ?)', (session['uuid'], filename, filesize, timestamp, report))
    db.commit()
    info('inserted %s, %s, %d, %d and report into cores', session['uuid'], filename, filesize, timestamp)
    session.pop('current', None)
    return jsonify(filename=filename, filesize=filesize, timestamp=timestamp)

@app.route('/getreport', methods=['POST'])
def getreport():
    info('start')
    if not 'uuid' in session:
        return 'missing session'
    cur = get_db().execute('SELECT report FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], request.form['coredump']))
    coredumps = cur.fetchall()
    cur.close()
    info('exit')
    return escape(coredumps[0][0])

@app.route('/backtrace', methods=['POST'])
def backtrace():
    info('start')
    if not 'uuid' in session:
        return 'missing session'
    backtrace_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / (request.form['coredump'] + '.backtrace.txt')
    with backtrace_file.open() as f:
        return f.read()

@app.route('/commandinput', methods=['POST'])
def commandinput():
    info('start')
    if not 'count' in session:
        return 'missing session'
    global COMMANDS, count, running_counts, uuid_queues, coredump_queues, command_queues, output_queues
    info('%s', request.form['command'])
    if not request.form['command'].split(' ')[0] in COMMANDS:
        info('invalid command')
        return 'invalid commmand'
    info('count is %d', session['count'])
    info('running_counts is %s', str(running_counts))
    def startup():
        info('start')
        set_queues(session['count'])
        running_counts.add(session['count'])
        uuid_queues[session['count']].put(session['uuid'])
        coredump_queues[session['count']].put(request.form['coredump'])
        worker = Thread(target=run_gdb, args=(session['count'],))
        worker.start()
        info('running_counts is %s', str(running_counts))
    def queue_add():
        with queues_lock:
            uuid_queues[session['count']].put(session['uuid'])
            coredump_queues[session['count']].put(request.form['coredump'])
            command_queues[session['count']].put(request.form['command'])
    if not session['count'] in running_counts:
        info('starting')
        startup()
    queue_add()
    result = output_queues[session['count']].get()
    if result == 'restart':
        info('restart')
        delete_queues(session['count'])
        startup()
        queue_add()
        return escape(output_queues[session['count']].get())
    return escape(result)

app.secret_key = 'supersecrettemporarykey'
