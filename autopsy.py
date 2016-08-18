from cgi import escape
from logging import DEBUG, Formatter, getLogger, StreamHandler
from pathlib import Path
from queue import Queue, Empty
from sched import scheduler
from subprocess import PIPE, Popen, run, STDOUT
from shutil import rmtree
from sqlite3 import connect
from sys import stdout, version
from threading import Lock, Thread
from time import time
from uuid import uuid4

from flask import Flask, jsonify, g, render_template, request, Response, session
from werkzeug.utils import secure_filename

app = Flask(__name__)

logger = getLogger(__name__)
logger.setLevel(DEBUG)
ch = StreamHandler(stream=stdout)
ch.setLevel(DEBUG)
formatter = Formatter('[%(asctime)s] %(levelname)s [%(funcName)s:%(lineno)d] %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p')
ch.setFormatter(formatter)
logger.addHandler(ch)

UPLOAD_FOLDER = Path(app.root_path) / 'uploads'
DATABASE = Path(app.root_path) / 'database' / 'cores.db'
CLIENTLESS_GDB = Path(app.root_path).parent / 'clientlessgdb' / 'clientlessGdb.py'
GEN_CORE_REPORT = Path(app.root_path).parent / 'clientlessgdb' / 'gen_core_report.sh'
COMMANDS = [c.lower() for c in ['asacommands', 'checkibuf', 'checkoccamframe', 'dispak47anonymouspools', 'dispak47vols', 'dispallactiveawarectx', 'dispallactiveuctectx', 'dispallactiveucteoutway', 'dispallak47instance', 'dispallattachedthreads', 'dispallawarectx', 'dispallpoolsinak47instance', 'dispallthreads', 'dispalluctectx', 'dispallucteoutway', 'dispasastate', 'dispasathread', 'dispawareurls', 'dispbacktraces', 'dispcacheinfo', 'dispclhash', 'dispcrashthread', 'dispdpthreads', 'dispfiberinfo', 'dispfiberstacks', 'dispfiberstats', 'dispgdbthreadinfo', 'displuastack', 'displuastackbyl', 'displuastackbylreverse', 'dispmeminfo', 'dispmemregion', 'dispoccamframe', 'dispramfsdirtree', 'dispsiginfo', 'dispstackforthread', 'dispstackfromrbp', 'dispthreads', 'dispthreadstacks', 'disptypes', 'dispunmangleurl', 'dispurls', 'findString', 'findmallochdr', 'findoccamframes', 'generatereport', 'searchMem', 'searchMemAll', 'search_mem', 'showak47info', 'showak47instances', 'showblocks', 'showconsolemessage', 'unescapestring', 'verifyoccaminak47instance', 'verifystacks', 'walkIntervals', 'webvpn_print_block_failures']]
DELETE_MIN = 5760

coredump_queues = {}
command_queues = {}
output_queues = {}
queues_lock = Lock()

running_counts = set()
count = 0
count_lock = Lock()

def enqueue_output(out, queue):
    for line in iter(out.readline, ''):
        queue.put(line)
    out.close()

def run_gdb(count, uuid, workspace, gdb_location):
    logger.info('count %d - start', count)
    global coredump_queues, command_queues, output_queues
    start_coredump = coredump_queues[count].get()
    coredump_path = UPLOAD_FOLDER / uuid / start_coredump / start_coredump
    smp_path = coredump_path.parent / workspace / 'Xpix' / 'target' / 'smp'
    logger.info(gdb_location)
    logger.info(str(smp_path))
    lina_path = smp_path / 'asa' / 'bin' / 'lina'
    if not lina_path.exists():
        lina_path = smp_path / 'smp'
    gdb = Popen([gdb_location, str(lina_path)], bufsize=1, stdin=PIPE, stdout=PIPE, stderr=STDOUT, cwd=str(smp_path), universal_newlines=True)
    read_queue = Queue()
    t = Thread(target=enqueue_output, args=(gdb.stdout, read_queue))
    t.daemon = True
    t.start()
    logger.info('count %d - thread started', count)
    entered_commands = []
    def enter_command(command):
        nonlocal entered_commands
        gdb.stdin.write(command + '\n')
        entered_commands += [command]
    enter_command('source ' + str(CLIENTLESS_GDB))
    enter_command('core-file ' + str(coredump_path))
    logger.info('count %d - entering while', count)
    running = True
    restart = False
    while running:
        try:
            logger.info('count %d - waiting', count)
            coredump = coredump_queues[count].get(timeout=600)
            if coredump == '':
                running = False
                logger.info('count %d - quit', count)
            elif start_coredump != coredump:
                running = False
                restart = True
                logger.info('count %d - restart', count)
            else:
                command = command_queues[count].get()
                enter_command(command)
                gdb.stdin.write('0\n')
                logger.info('count %d - wrote into gdb', count)
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
                            logger.info('run_gdb: count %d - reached end', count)
                            break
                        else:
                            command_index = line.find('(gdb) ')
                            while entered_commands and command_index >= 0:
                                line = line[:command_index + 6]  + entered_commands.pop(0) + '\n' + line[command_index + 6:]
                                command_index = line.find('(gdb)', command_index + 6)
                            output += line
                output_queues[count].put(output)
                entered_commands = []
        except Empty:
            running = False
    running_counts.remove(count)
    if restart:
        output_queues[count].put('restart')
        logger.info('count %d - inserted restart into output_queues', count)
    else:
        delete_queues(count)
        logger.info('count %d - no restart', count)
    logger.info('count %d - exit', count)

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
    global coredump_queues, command_queues, output_queues
    coredump_queues[count] = Queue(maxsize=0)
    command_queues[count] = Queue(maxsize=0)
    output_queues[count] = Queue(maxsize=0)

def delete_queues(count):
    global coredump_queues, command_queues, output_queues
    del coredump_queues[count]
    del command_queues[count]
    del output_queues[count]

def empty_remove(path):
    try:
        path.rmdir()
        logger.info('removed empty folder %s', str(path))
    except:
        logger.info('folder %s not removed', str(path))

def clean_uploads():
    with app.app_context():
        logger.info('start')
        cur = get_db().execute('SELECT uuid, coredump FROM cores WHERE timestamp < ?', (int(time() * 1000) - DELETE_MIN * 60 * 1000,))
        coredumps = cur.fetchall()
        cur.close()
        logger.info('coredumps has %d items', len(coredumps))
        for i in range(0, len(coredumps)):
            uuid = coredumps[i][0]
            logger.info('uuid is %s', uuid)
            filename = coredumps[i][1]
            logger.info('filename is %s', filename)
            filepath = UPLOAD_FOLDER / uuid / filename
            if filepath.exists():
                logger.info('filepath %s exists', str(filepath))
                rmtree(str(filepath))
                logger.info('filepath deleted')
                db = get_db()
                db.execute('DELETE FROM cores WHERE uuid = ? AND coredump = ?', (uuid, filename))
                db.commit()
                logger.info('deleted %s from database', filename)
                empty_remove(filepath.parent)
            else:
                logger.info('filepath %s does not exist', str(filepath))
        for uuid in UPLOAD_FOLDER.iterdir():
            logger.info('testing uuid folder %s', uuid.name)
            for coredump in uuid.iterdir():
                if no_such_file(uuid.name, coredump.name):
                    logger.info('removing directory %s', str(coredump))
                    rmtree(str(coredump))
        logger.info('clean finished')

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
        coredumps = ''
    global count
    with count_lock:
        session['count'] = count
        count += 1
    logger.info('count is %d', session['count'])
    logger.info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return render_template('autopsy.html', uuid=uuid, coredumps=coredumps)

@app.route('/help', methods=['GET'])
def help():
    return render_template('help.html')

@app.route('/delete', methods=['POST'])
def delete():
    logger.info('start')
    if not 'uuid' in session:
        return 'missing session'
    filename = request.form['coredump']
    logger.info('filename is %s', filename)
    db = get_db()
    db.execute('DELETE FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], filename))
    db.commit()
    logger.info('removed from database')
    filepath = UPLOAD_FOLDER / session['uuid'] / filename
    if filepath.exists():
        logger.info('filepath exists')
        rmtree(str(filepath))
        logger.info('removed coredump folder')
        empty_remove(filepath.parent)
    else:
        logger.info('filepath does not exist')
    return 'ok'

@app.route('/testkey', methods=['POST'])
def testkey():
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
def loadkey():
    loadkey = request.form['loadkey']
    logger.info('%s', loadkey)
    cur = get_db().execute('SELECT uuid, coredump, filesize, timestamp FROM cores WHERE uuid = ?', (loadkey,))
    coredumps = cur.fetchall()
    cur.close()
    session['uuid'] = loadkey
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
    logger.info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return jsonify(uuid=loadkey, coredumps=coredumps)

@app.route('/generatekey', methods=['POST'])
def generatekey():
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
    logger.info('running_counts is %s', str(running_counts))
    set_queues(session['count'])
    return new_uuid

def no_such_file(uuid, filename):
    cur = get_db().execute('SELECT coredump FROM cores WHERE uuid = ? AND coredump = ?', (uuid, filename))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        logger.info('uuid %s and filename %s exist', uuid, filename)
        return False
    logger.info('uuid %s and filename %s do not exist', uuid, filename)
    return True

@app.route('/testfilename', methods=['POST'])
def testfilename():
    logger.info('testing %s', request.form['filename'])
    if not 'uuid' in session:
        return 'missing session'
    if request.form['filename'][-3:] != '.gz':
        logger.info('type')
        return 'type'
    if no_such_file(session['uuid'], secure_filename(request.form['filename'][:-3])):
        logger.info('ok')
        return 'ok'
    logger.info('duplicate')
    return 'duplicate'

@app.route('/upload', methods=['POST'])
def upload():
    logger.info('start')
    if 'file' not in request.files:
        logger.info('file not in request')
        return 'notrequested'
    file = request.files['file']
    if file.filename == '':
        logger.info('file name is empty')
        return 'empty'
    if file.filename[-3:] != '.gz':
        logger.info('type')
        return 'type'
    if not file or not no_such_file(session['uuid'], secure_filename(file.filename[:-3])):
        logger.info('duplicate')
        return 'duplicate'
    logger.info('file name allowed and is %s', file.filename)
    filename = secure_filename(file.filename)
    logger.info('secure file name is %s', filename)
    directory = UPLOAD_FOLDER / session['uuid'] / filename[:-3]
    if not directory.exists():
        logger.info('making directory %s', directory)
        directory.mkdir(parents=True)
    filepath = directory / filename
    file.save(str(filepath))
    logger.info('saved file')
    file_test = run(['file', '-b', str(filepath)], stdout=PIPE, universal_newlines=True).stdout
    logger.info('file type is %s', file_test.rstrip())
    if not filename.endswith('.gz') or not file_test.startswith('gzip compressed data'):
        logger.info('removing file')
        if filepath.exists():
            logger.info('filepath exists')
            filepath.unlink()
            logger.info('removed file')
        else:
            logger.info('error with filepath')
        logger.info('not gzip')
        return 'not gzip'
    session['current'] = filename
    logger.info('ok')
    return 'ok'

@app.route('/unzip', methods=['POST'])
def unzip():
    logger.info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current']
    filepath = UPLOAD_FOLDER / session['uuid'] / filename[:-3] / filename
    returncode = run(['gunzip', '-f', str(filepath)]).returncode
    if returncode != 0:
        logger.info('failed')
        session.pop('current', None)
        return 'unzip failed'
    logger.info('ok')
    return 'ok'

@app.route('/build', methods=['POST'])
def build():
    logger.info('start')
    if not 'current' in session:
        return 'missing session'
    filename = session['current'][:-3]
    directory = UPLOAD_FOLDER / session['uuid'] / filename
    filepath = directory / filename
    if not filepath.exists():
        logger.info('bad filename')
        return 'bad filename'
    report = run([str(GEN_CORE_REPORT), '-g', '-k', '-c', str(filepath)], cwd=str(directory), stdout=PIPE, universal_newlines=True).stdout
    logger.info(report.splitlines()[0])
    report_file = open(str(directory / 'gen_core_report.txt'), 'w')
    report_file.write(report)
    report_file.close()
    filesize = filepath.stat().st_size
    timestamp = int(time() * 1000)
    workspace = [line[line.rfind('/') + 1:] for line in report.splitlines() if line.startswith('A minimal')][0]
    gdb_location = [line.split()[-1] for line in report.splitlines() if line.startswith('GDB:')][0]
    db = get_db()
    db.execute('INSERT INTO cores VALUES (?, ?, ?, ?, ?, ?)', (session['uuid'], filename, filesize, timestamp, workspace, gdb_location))
    db.commit()
    logger.info('inserted %s, %s, %d, %d, %s, %s into cores', session['uuid'], filename, filesize, timestamp, workspace, gdb_location)
    session.pop('current', None)
    return jsonify(filename=filename, filesize=filesize, timestamp=timestamp)

def update_timestamp(uuid, coredump):
    timestamp = int(time() * 1000)
    db = get_db()
    db.execute('UPDATE cores SET timestamp = ? WHERE uuid = ? AND coredump = ?', (timestamp, uuid, coredump))
    db.commit()
    return timestamp

@app.route('/getreport', methods=['POST'])
def getreport():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_file(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    gen_core_report_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / 'gen_core_report.txt'
    with gen_core_report_file.open() as f:
        return jsonify(output=escape(f.read()), timestamp=timestamp)

@app.route('/backtrace', methods=['POST'])
def backtrace():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_file(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    backtrace_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / (request.form['coredump'] + '.backtrace.txt')
    with backtrace_file.open() as f:
        return jsonify(output=escape(f.read()), timestamp=timestamp)

@app.route('/siginfo', methods=['POST'])
def siginfo():
    logger.info('start')
    if not 'uuid' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    if no_such_file(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    siginfo_file = UPLOAD_FOLDER / session['uuid'] / request.form['coredump'] / (request.form['coredump'] + '.siginfo.txt')
    with siginfo_file.open() as f:
        return jsonify(output=escape(f.read()), timestamp=timestamp)

@app.route('/commandinput', methods=['POST'])
def commandinput():
    logger.info('start')
    if not 'count' in session:
        return jsonify(output='missing session', timestamp=int(time() * 1000))
    global count, running_counts, coredump_queues, command_queues, output_queues
    logger.info('%s', request.form['command'])
    if not request.form['command'].split(' ')[0].lower() in COMMANDS:
        logger.info('%s: invalid command', request.form['command'])
        return jsonify(output=request.form['command'] + ': invalid commmand', timestamp=int(time() * 1000))
    if no_such_file(session['uuid'], request.form['coredump']):
        logger.info('no such coredump')
        return jsonify(output='no such coredump', timestamp=int(time() * 1000))
    timestamp = update_timestamp(session['uuid'], request.form['coredump'])
    logger.info('count is %d', session['count'])
    logger.info('running_counts is %s', str(running_counts))
    def startup():
        logger.info('start')
        set_queues(session['count'])
        running_counts.add(session['count'])
        coredump_queues[session['count']].put(request.form['coredump'])
        cur = get_db().execute('SELECT workspace, gdb FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], request.form['coredump']))
        workspace, gdb_location = cur.fetchall()[0]
        cur.close()
        worker = Thread(target=run_gdb, args=(session['count'], session['uuid'], workspace, gdb_location))
        worker.start()
        logger.info('running_counts is %s', str(running_counts))
    def queue_add():
        with queues_lock:
            coredump_queues[session['count']].put(request.form['coredump'])
            command_queues[session['count']].put(request.form['command'])
    if not session['count'] in running_counts:
        logger.info('starting')
        startup()
    queue_add()
    result = output_queues[session['count']].get()
    if result == 'restart':
        logger.info('restart')
        delete_queues(session['count'])
        startup()
        queue_add()
        return jsonify(output=escape(output_queues[session['count']].get()), timestamp=timestamp)
    return jsonify(output=escape(result), timestamp=timestamp)

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
def checksession():
    logger.info('start')
    logger.info('%s and %s', request.form['uuid'], session['uuid'])
    if request.form['uuid'] != session['uuid']:
        logger.info('bad')
        return 'bad'
    logger.info('ok')
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
    t.daemon = True
    t.start()

app.secret_key = 'supersecrettemporarykey'
