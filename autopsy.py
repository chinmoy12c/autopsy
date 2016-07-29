import json
import os
import sqlite3
import shutil
import json
from flask import Flask, jsonify, g, render_template, request, Response, session
from werkzeug.utils import secure_filename
from subprocess import call, check_output, PIPE, STDOUT, Popen
from threading import Lock, Thread
from Queue import Queue, Empty
from cgi import escape
from uuid import uuid4
from time import sleep

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
DATABASE = os.path.join(app.root_path, 'database', 'cores.db')
CLIENTLESS_GDB = os.path.join(os.path.dirname(app.root_path), 'clientlessgdb', 'clientlessGdb.py')
GEN_CORE_REPORT = os.path.join(os.path.dirname(app.root_path), 'clientlessgdb', 'gen_core_report.sh')
COMMANDS = ['asacommands', 'checkibuf', 'checkoccamframe', 'dispak47anonymouspools', 'dispak47vols', 'dispallactiveawarectx', 'dispallactiveuctectx', 'dispallactiveucteoutway', 'dispallak47instance', 'dispallattachedthreads', 'dispallawarectx', 'dispallpoolsinak47instance', 'dispallthreads', 'dispalluctectx', 'dispallucteoutway', 'dispasastate', 'dispasathread', 'dispawareurls', 'dispbacktraces', 'dispcacheinfo', 'dispclhash', 'dispdpthreads', 'dispfiberinfo', 'dispfiberstacks', 'dispfiberstats', 'displuastack', 'displuastackbyl', 'displuastackbylreverse', 'dispmeminfo', 'dispmemregion', 'dispoccamframe', 'dispramfsdirtree', 'dispsiginfo', 'dispstackforthread', 'dispstackfromrbp', 'dispthreadinfo', 'dispthreads', 'dispthreadstacks', 'disptypes', 'dispunmangleurl', 'dispurls', 'findString', 'findmallochdr', 'findoccamframes', 'generatereport', 'searchMem', 'searchMemAll', 'search_mem', 'showak47info', 'showak47instances', 'showblocks', 'showconsolemessage', 'unescapestring', 'verifyoccaminak47instance', 'verifystacks', 'walkIntervals', 'webvpn_print_block_failures'];

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

def get_pass():
    print 'get_pass: opening password.txt'
    with open('password.txt') as f:
        return f.readline()

@app.before_first_request
def perforce_login():
    print 'perforce_login: start'
    perforce_login = Popen(['p4', 'login'], stdin=PIPE, stdout=PIPE)
    print perforce_login.communicate(get_pass())[0].rstrip()
    print 'perforce_login: exit'

def run_gdb(uuid, count):
    print 'run_gdb: start with count ' + str(count)
    gdb = Popen(['/auto/stbu-tools/wrlinux/poc/wrl6/wrlinux-6/layers/binary-toolchain-4.8-27/bin/i686-wrs-linux-gnu-gdb'], stdin=PIPE, stdout=PIPE, stderr=STDOUT, bufsize=1)
    read_queue = Queue()
    t = Thread(target=enqueue_output, args=(gdb.stdout, read_queue))
    t.daemon = True
    t.start()
    print 'run_gdb: thread started'
    entered_commands = []
    gdb.stdin.write('source ' + CLIENTLESS_GDB + '\n')
    entered_commands += ['source ' + CLIENTLESS_GDB]
    current_coredump = ''
    global coredump_queues, command_queues, output_queues
    print 'run_gdb: entering while'
    while True:
        try:
            print 'run_gdb: waiting'
            coredump = coredump_queues[count].get()#True, 120)
            if current_coredump != coredump:
                coredump_path = os.path.join(app.config['UPLOAD_FOLDER'], uuid, coredump, coredump)
                lina_path = os.path.join(app.config['UPLOAD_FOLDER'], uuid, coredump, coredump + '_workspace', 'Xpix', 'target', 'smp', 'asa', 'bin', 'lina')
                gdb.stdin.write('exec-file ' + lina_path + '\n')
                entered_commands += ['exec-file ' + lina_path]
                gdb.stdin.write('symbol-file ' + lina_path + '\n')
                entered_commands += ['symbol-file ' + lina_path]
                gdb.stdin.write('core-file ' + coredump_path + '\n')
                entered_commands += ['core-file ' + coredump_path]
                current_coredump = coredump
            command = command_queues[count].get()
            gdb.stdin.write(command + '\n')
            gdb.stdin.write('0\n')
            entered_commands += [command]
            print 'run_gdb: wrote into gdb'
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
                        print 'run_gdb: reached end'
                        break
                    else:
                        command_index = line.find('(gdb)')
                        while command_index >= 0:
                            line = line[:command_index + 5] + ' ' + entered_commands.pop(0) + '\n' + line[command_index + 6:]
                            command_index = line.find('(gdb)', command_index + 5)
                        output += line
            command_queues[count].task_done()
            output_queues[count].put(output)
            entered_commands = []
        except:
            break
    delete_queues(count)
    running_counts.remove(count)
    print 'run_gdb: exit with count ' + str(count)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        print 'close_connection: closing database'
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
    print 'initdb_command: initialized database'

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

@app.route('/', methods=['GET'])
def index():
    if 'uuid' in session:
        uuid = session['uuid']
        print 'index: uuid in session, value is ' + uuid
        cur = get_db().execute('SELECT * FROM cores WHERE uuid = ?', (uuid,))
        coredumps = cur.fetchall()
        cur.close()
        valid_directories = []
        print 'index: contents of coredumps'
        print 'index: **********'
        for i in xrange(0, len(coredumps)):
            print 'index: Row ' + str(i)
            row = coredumps[i]
            valid_directories += [row[1]]
            for obj in row:
                print 'index: ' + obj.splitlines()[0]
        print 'index: **********'
        directory = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'])
        if os.path.exists(directory):
            contents = os.listdir(directory)
            for entry in contents:
                if not entry in valid_directories:
                    print 'index: removing ' + entry
                    entry_path = os.path.join(directory, entry)
                    if os.path.isdir(entry_path):
                        shutil.rmtree(entry_path)
                    else:
                        os.remove(entry_path)
    else:
        uuid = str(uuid4())
        session['uuid'] = uuid
        print 'index: uuid NOT in session, value is ' + uuid
        coredumps = ''
    global count
    with count_lock:
        print 'index: count is ' + str(count)
        set_queues(count)
        worker = Thread(target=run_gdb, args=(session['uuid'], count))
        worker.start()
        session['count'] = count
        running_counts.add(count)
        count += 1
    return render_template('autopsy.html', uuid=uuid, coredumps=coredumps)

@app.route('/delete', methods=['POST'])
def delete():
    print 'delete: start'
    if not 'uuid' in session:
        return 'missing session'
    filename = request.form['coredump']
    print 'delete: filename is ' + filename
    db = get_db()
    db.execute('DELETE FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], filename))
    db.commit()
    print 'delete: removed from database'
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'], filename)
    if os.path.exists(filepath):
        print 'delete: filepath exists'
        shutil.rmtree(filepath)
        print 'delete: removed coredump folder'
    else:
        print 'delete: error with filepath'
    return 'ok'

@app.route('/testkey', methods=['POST'])
def testkey():
    testkey = request.form['testkey']
    print 'testkey: ' + testkey
    cur = get_db().execute('SELECT * FROM cores WHERE uuid = ?', (testkey,))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        print 'testkey: valid key'
        return 'yes'
    print 'testkey: invalid key'
    return 'no'

@app.route('/loadkey', methods=['POST'])
def loadkey():
    loadkey = request.form['loadkey']
    print 'loadkey: ' + loadkey
    cur = get_db().execute('SELECT * FROM cores WHERE uuid = ?', (loadkey,))
    coredumps = cur.fetchall()
    cur.close()
    session['uuid'] = loadkey
    session.pop('current', None)
    global count
    with count_lock:
        print 'index: count is ' + str(count)
        set_queues(count)
        worker = Thread(target=run_gdb, args=(session['uuid'], count))
        worker.start()
        session['count'] = count
        running_counts.add(count)
        count += 1
    return jsonify(coredumps)

@app.route('/generatekey', methods=['POST'])
def generatekey():
    new_uuid = str(uuid4())
    session['uuid'] = new_uuid
    print 'generatekey: ' + new_uuid
    session.pop('current', None)
    global count
    with count_lock:
        print 'index: count is ' + str(count)
        set_queues(count)
        worker = Thread(target=run_gdb, args=(session['uuid'], count))
        worker.start()
        session['count'] = count
        running_counts.add(count)
        count += 1
    return new_uuid

def allowed_file(uuid, filename):
    cur = get_db().execute('SELECT * FROM cores WHERE uuid = ? AND coredump = ?', (uuid, secure_filename(filename)[:-3]))
    coredumps = cur.fetchall()
    cur.close()
    if len(coredumps) != 0:
        print 'allowed_file: duplicate'
        return False
    print 'allowed_file: ok'
    return True

@app.route('/testfilename', methods=['POST'])
def testfilename():
    print 'testfilename: start'
    if not 'uuid' in session:
        return 'missing session'
    if allowed_file(session['uuid'], request.form['filename']):
        print 'testfilename: ok'
        return 'ok'
    print 'testfilename: duplicate'
    return 'duplicate'

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        print 'upload: file not in request'
        return 'notrequested'
    file = request.files['file']
    if file.filename == '':
        print 'upload: file name is empty'
        return 'empty'
    if file and allowed_file(session['uuid'], file.filename):
        print 'upload: file name allowed'
        print 'upload: file name is ' + file.filename
        filename = secure_filename(file.filename)
        print 'upload: secure file name is ' + filename
        directory = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'], filename[:-3])
        if not os.path.exists(directory):
            print 'upload: making directory ' + directory
            os.makedirs(directory)
        filepath = os.path.join(directory, filename)
        file.save(filepath)
        print 'upload: saved file'
        file_test = check_output(['file', '-b', filepath])
        print 'upload: file type is ' + file_test.rstrip()
        if not filename.endswith('.gz') or not file_test.startswith('gzip compressed data'):
            print 'upload: removing file'
            if os.path.exists(filepath):
                print 'upload: filepath exists'
                os.remove(filepath)
                print 'upload: removed file'
            else:
                print 'upload: error with filepath'
            print 'upload: not gzip'
            return 'not gzip'
        session['current'] = filename
        print 'upload: ok'
        return 'ok'
    else:
        print 'upload: duplicate'
        return 'duplicate'

@app.route('/unzip', methods=['POST'])
def unzip():
    print 'unzip: start'
    if not 'current' in session:
        return 'missing session'
    filename = session['current']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'], filename[:-3], filename)
    z = call(['gunzip', '-f', filepath])
    if not os.path.exists(filepath[:-3]):
        print 'unzip: failed'
        session.pop('current', None)
        return 'unzip failed'
    filesize = os.path.getsize(filepath[:-3])
    print 'unzip: complete'
    return 'finished'

@app.route('/build', methods=['POST'])
def build():
    print 'build: start'
    if not 'current' in session:
        return 'missing session'
    filename = session['current'][:-3]
    directory = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'], filename)
    filepath = os.path.join(directory, filename)
    report = check_output([GEN_CORE_REPORT, '-g', '-c', filepath], cwd=directory)
    print report
    filesize = os.path.getsize(filepath)
    db = get_db()
    db.execute('INSERT INTO cores VALUES (?, ?, ?, ?)', (session['uuid'], filename, filesize, report))
    db.commit()
    print 'build: inserted ' + session['uuid'], filename, str(filesize) + ' and report into cores'
    session.pop('current', None)
    return jsonify(filename=filename, filesize=os.path.getsize(filepath))

@app.route('/getreport', methods=['POST'])
def getreport():
    print 'getreport: start'
    if not 'uuid' in session:
        return 'missing session'
    cur = get_db().execute('SELECT * FROM cores WHERE uuid = ? AND coredump = ?', (session['uuid'], request.form['coredump']))
    coredumps = cur.fetchall()
    cur.close()
    print 'getreport: exit'
    return escape(coredumps[0][3])

@app.route('/backtrace', methods=['POST'])
def backtrace():
    print 'backtrace: start'
    if not 'uuid' in session:
        return 'missing session'
    backtrace_file = os.path.join(app.config['UPLOAD_FOLDER'], session['uuid'], request.form['coredump'], request.form['coredump'] + '.backtrace.txt')
    with open(backtrace_file) as f:
        return f.read()

@app.route('/commandinput', methods=['POST'])
def commandinput():
    print 'commandinput: start'
    if not 'count' in session:
        return 'missing session'
    global COMMANDS, count, running_counts, coredump_queues, command_queues, output_queues
    if not session['count'] in running_counts:
        with count_lock:
            print 'commandinput: count is ' + str(count)
            set_queues(count)
            worker = Thread(target=run_gdb, args=(session['uuid'], count))
            worker.start()
            session['count'] = count
            running_counts.add(count)
            count += 1
    with queues_lock:
        if not request.form['command'].split(" ")[0] in COMMANDS:
            print 'commandinput: invalid command'
            return 'invalid commmand'
        print 'commandinput: ' + request.form['command']
        coredump_queues[session['count']].put(request.form['coredump'])
        command_queues[session['count']].put(request.form['command'])
    return escape(output_queues[session['count']].get())

app.secret_key = 'supersecrettemporarykey'
