# Documentation

This file serves as documentation for Autopsy. It assumes that you have read [`README.md`](README.md) and have a basic understanding of Flask. (Reading through the [official quickstart documentation for Flask](http://flask.pocoo.org/docs/0.12/quickstart/) is suggested.)

## Table of contents

* [Session cookie](#session-cookie)
* [Database](#database)
* [Uploading process](#uploading-process)
 * [Uploading a local file](#uploading-a-local-file)
 * [Submitting a link](#submitting-a-link)
 * [Using SCP to retrieve a file](#using-scp-to-retrieve-a-file)
 * [Core dump storage](#core-dump-storage)
* [File output](#file-output)
* [ASA decoder](#asa-decoder)
* [Running GDB](#running-gdb)
 * [GDB timeouts](#gdb-timeouts)
* [Code editor](#code-editor)
* [`.commands` folder](#commands-folder)
* [Clean-up script](#clean-up-script)
* [Thread monitoring](#thread-monitoring)
* [Functions in `autopsy.py`](#functions-in-autopsypy)
* [JavaScript](#javascript)
 * [Storage](#storage)
* [CSS](#css)
* [Logging](#logging)
* [Adding additional commands](#adding-additional-commands)

## Session cookie

Autopsy stores information about a user in a signed cookie, implemented with sessions in Flask. The cookie is base-64 encoded, so it is possible to see the contents of the cookie by decoding it; however, modifying the cookie manually would cause it to be rejected by the server due to the invalid signature. (The data and signature parts of the cookie are separated by a period.)

If a user visits Autopsy without a cookie (e.g. for the first time), Autopsy generates a version 4 [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) and a number that uniquely identifies the user (called `count` in the code). `count` is generated from a monotonically increasing counter to ensure that it is unique. The UUID corresponds to the core dumps that the user uploads, and the count identifies the user's GDB session.

Finally, when a user uploads a core dump, the name of the core dump is stored in the cookie (called `current` in the code). The name keeps track of the core dump that the user is uploading.

## Database

Autopsy stores information about uploaded core dumps inside the `cores.db` database. This database has six columns, as can be seen in `schema.sql`:

* **uuid**: the UUID of the user who uploaded the core dump.
* **coredump**: the name of the core dump.
* **filesize**: the file size of the core dump.
* **timestamp**: the last-accessed date of the core dump.
* **workspace**: the name of the workspace folder for the core dump.
* **gdb**: the path to the version of GDB to use for the core dump.

The uuid, coredump, filesize, and timestamp fields are obtained when the user uploads the core dump. The workspace and gdb fields are extracted from the output of `gen_core_report.sh`. The timestamp field is updated whenever the core dump is accessed by a user.

## Uploading process

A user has three ways to upload files: uploading a local file, submitting a link to a core dump, and using SCP to retrieve a file from a remote server.

### Uploading a local file

When a local file is uploaded, the client tests if the name of the core dump is valid (i.e. no other core dumps under the client's UUID have the same name). If the name is valid, the client uploads the file. (The first file name test is purely for client convenience, as the server tests the file name again after the upload.) The server checks if the file is the right type with the Unix `file` command, and if so, unzips the core dump using `gunzip` (if it is a gzip file) and builds the workspace. The output of the build (from `gen_core_report.sh`) is stored in a text file called `gen_core_report.txt`.

### Submitting a link

If a user submits a link, the server checks if the link is valid and if the username and password (if supplied) are correct. If so, the server downloads the file from the link and proceeds with unzipping and building as in the local file upload case.

### Using SCP to retrieve a file

If a user chooses to SCP a file, the server checks if the server and path are valid using the supplied username and password. If the information provided is correct, the server copies the file and proceeds with unzipping and building as above.

### Core dump storage

All uploaded core dumps are stored in the `uploads` folder. Each UUID has its own folder in `uploads`, and each core dump has its own folder in each UUID folder. The unzipped core dump and its associated `gen_core_report.txt`, backtrace file, siginfo file, workspace folder, and any other files from the build process are located inside the core dump folder.

## File output

If a user clicks one of the three buttons to analyze a core dump, Autopsy will return the contents of the corresponding file (`gen_core_report.txt`, the backtrace file, or the siginfo file) to the user.

## ASA decoder

If the `decode` button for a core dump is clicked for the first time, GDB is launched in order to extract register values from the crashed thread. These are used to compile `decoder.txt`, which can be inputted into the [ASA traceback decoder](http://asa-decoder/asadecoder.php) to list possible bugs that caused the crash. Autopsy submits the contents of `decoder.txt` to the ASA traceback decoder and displays the output. Autopsy saves this output in `decoder_output.html` and reads from this file instead during subsequent runs.

## Running GDB

When a user analyzes a core dump with a command, GDB starts up in a background thread. The count (from the cookie), along with other information, is passed to the thread. GDB needs to start up for the first command, but subsequent commands used to analyze the core dump will use the same thread. Autopsy relies on dictionaries of queues to communicate with the GDB thread: the count is the key, and the queue is the value. There are 4 such dictionaries:

* `coredump_queues`: stores the core dump to be analyzed. If a core dump different to the initial core dump entered is stored, the GDB thread will quit and a different GDB thread will be launched (since a GDB thread can only analyze a single core dump). If an empty string is entered, the GDB thread will simply quit.
* `command_queues`: stores the command to be entered into GDB.
* `abort_queues`: if something is entered into the abort queue, GDB will abort running the current command.
* `output_queues`: stores output from the GDB thread. If the output is `restart` (from detecting a different core dump in the core dump queue), Autopsy will launch another GDB thread.

When a command is sent to a GDB thread, both `coredump_queues` and `command_queues` are updated.

### GDB timeouts

If a GDB thread is left running without any commands being submitted, the thread will shut down after 10 minutes due to a queue timeout. Furthermore, a command will be aborted if it takes more than 1 hour to run by default; the user can increase this limit to 400 hours. This value is stored inside a `timeout` file (in hours). It is possible for a user to have a count that does not correspond to an active GDB thread, so the `running_counts` set keeps track of all counts that do have such a thread. A new thread will be started when the user submits a command.

## Code editor

Autopsy allows users to edit `clientlessGdb.py` to suit their needs. The modified version is stored in a `modified.py` file.

## `.commands` folder

Each UUID folder contains a `.commands` folder, which stores content that is specific to each UUID (rather than each core dump). This folder contains the `timeout` and `modified.py` files and also stores the zip file that is generated for exported data.

## Clean-up script

Every hour, Autopsy runs a clean-up script that deletes any core dump with a last-accessed date older than 4 days. This expiration limit can be adjusted by modifying the `DELETE_MIN` variable.

## Thread monitoring

Autopsy prints the number and names of threads that are currently running to monitor a potential source of memory leaks. These threads can be split into two types: Autopsy threads (launched from `autopsy.py`) and Gunicorn threads. The upper limit on the number of Gunicorn threads is specified by the argument to the `--threads` flag for `gu` and can be found in `launch.sh`. All Autopsy threads should be named, and two threads should be running at all times: `MainThread` and `clean-thread`. Threads named `enqueue-thread-#` and `worker-thread-#` (where `#` is the user's `count`) will appear when a user has a GDB session running; they should disappear after 10 minutes of inactivity.

## Functions in `autopsy.py`

* `_write` and `_flush`: configures the logger to record `pexpect` output.
* `get_db`, `close_connection`, and `init_db`: sets up the SQLite database. See the [Flask SQLite documentation](http://flask.pocoo.org/docs/0.12/patterns/sqlite3/) for more details.
* `initdb_command`: registers `initdb` as a Flask command. See [this](http://flask.pocoo.org/docs/0.12/tutorial/dbinit/) for more.
* `set_queues`: creates queues with a particular count as the key.
* `delete_queues`: deletes the queues associated with a particular count.
* `run_gdb`: runs GDB. This is called as a separate thread.
* `startup`: launches GDB by calling `run_gdb`.
* `queue_add`: adds a command for GDB using the appropriate queues.
* `remove_directory_and_parent`: used to delete the core dump directory and UUID directory if it is empty afterwards.
* `delete_coredump`: deletes a core dump and removes it from the database.
* `clean_uploads`: runs every hour to remove old core dumps.
* `no_such_coredump`: tests whether a UUID and a core dump with a particular name already exists.
* `check_filename`: tests whether a particular filename is valid and works for both gzip and unzipped core dumps.
* `compile_decoder_text`: extracts information from the core dump and associated files, which is compiled into a format suitable for the ASA traceback decoder.
* `update_timestamp`: updates the timestamp field in the database. Called when a core dump is analyzed.
* `get_timeout`: returns the value in the user's `timeout` file or 1 if it does not exist.
* `enum_threads`: prints all active threads. Called every time the page is loaded.
* `dump_database`: logs a database dump. Called by `clean_uploads` once every 24 hours and by the user through `dump`.
* `index`: returns the Autopsy HTML, along with the data for any core dumps if the user has a UUID.
* `help`: returns the help page HTML.
* `demo`: returns the video demo page HTML.
* `dump`: allows the user to log a database dump.
* `delete`: uses `delete_coredump` to delete a core dump. Called when the × next to a core dump is clicked.
* `test_key`: tests whether a UUID has core dumps in the database. Called when validating a key.
* `load_key`: returns the core dump data for a particular UUID.
* `generate_key`: generates a new key for the user.
* `link_test`: tests whether the URL that a user provides for submitting a core dump is valid, as well as the credentials supplied. Also extracts the core dump name from the URL response headers.
* `link_upload`: downloads the core dump from a URL. (This function is called `link_upload` because from a user's perspective, a core dump is being uploaded from a link.)
* `file_test`: tests whether the server, path, and credentials provided for using SCP are correct and extracts the core dump name from the path.
* `file_upload`: retrieves the core dump using SCP.
* `test_filename`: uses `check_filename` to test a file name.
* `upload`: saves the file that a user uploads, checks whether it is valid, and deletes it if it is not.
* `unzip`: unzips the uploaded file.
* `build`: builds the workspace for the uploaded file using `gen_core_report.sh` and extracts information from its output.
* `get_report`, `backtrace`, and `siginfo`: returns the contents of the relevant files for a core dump.
* `decode`: launches GDB to extract registers, submits `decoder.txt` to the ASA traceback decoder, and returns the output on first run, or returns the contents of `decoder_output.html` on subsequent runs.
* `abort`: aborts the current command.
* `command_input`: manages launching the GDB thread and communicates with the thread using the appropriate queues.
* `get_source`: returns the source code of the user's `modified.py` file (or `clientlessGdb.py` if `modified.py` does not exist).
* `update_source`: updates the source code of the user's `modified.py` file.
* `reset_source`: resets the source code of the user's `modified.py` file to the original version.
* `diff_source`: returns a diff of the user's `modified.py` file with the original `clientlessGdb.py` file.
* `update_timeout`: updates the user's `timeout` file.
* `quit`: quits a GDB thread. Called when the user closes the Autopsy window.
* `check_session`: checks whether the session UUID matches the UUID shown on the page. Used to check whether the cookie has changed.
* `export`: returns a zip file of data specific to the session UUID.
* `start`: called when the server starts. Launches the clean-up script.

## JavaScript

Much of the JavaScript used on the web page is used for updating the user interface, as Autopsy is designed to be a [single-page application](https://en.wikipedia.org/wiki/Single-page_application). Autopsy uses XMLHttpRequest to send POST requests to the server when the user interacts with the application and [CodeMirror](https://github.com/codemirror/CodeMirror) to implement the code editor.

### Storage

Aside from the session cookie, Autopsy stores a dictionary and a list on the user's computer using local storage to save previously used UUIDs and their core dumps. The dictionary's keys are UUIDs, and its values are the list of core dumps associated with that UUID. The list determines the order of the UUIDs, starting with the most-recently used UUID.

## CSS

Autopsy uses [Bootstrap 4](https://v4-alpha.getbootstrap.com) as a CSS framework and flexbox for a responsive layout. However, the Autopsy window has a minimum width and height, and there is no mobile version of the site.

## Logging

Logs are stored in two locations: the `Autopsy/flasklogs` folder and the `nginx/logs` folder. The `flasklogs` folder contains the logs generated from `autopsy.py`, and these logs are rotated with `autopsy.py` to ensure that they do not take up too much space. The nginx logs store logs from nginx itself (e.g. requests to the Autopsy website), and they are managed with `logrotate` and `crontab` (see `install.sh`).

## Adding additional commands

Important: If a new command is added to `clientlessGdb.py`, it is simple to add the command to Autopsy as well. Add the command name to `commands` in `autopsy.js` (note that `commands` must be in alphabetical order), and if the command has options, add the command and argument to `options` as well, with special characters escaped.
