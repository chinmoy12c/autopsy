# Documentation

This file serves as documentation for Autopsy. It assumes that you have read `README.md` and have a basic understanding of Flask. (Reading through the [official quickstart documentation for Flask](http://flask.pocoo.org/docs/0.11/quickstart/) is suggested.)

## Session cookie

Autopsy stores information about a user in a signed cookie, implemented with sessions in Flask. The cookie is base-64 encoded, so it is possible to see the contents of the cookie by decoding it; however, modifying the cookie manually would cause it to be rejected by the server due to the invalid signature. (The data and signature parts of the cookie are separated by a period.)

If a user visits Autopsy without a cookie (e.g. for the first time), Autopsy generates a version 4 [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) and a number that uniquely identifies the user (called "count" in the code). The count is generated from a monotonically increasing counter to ensure that it is unique. The UUID corresponds to the core dumps that the user uploads, and the count identifies the user's GDB session.

Finally, when a user uploads a core dump, the name of the core dump is stored in the cookie (called "current" in the code). The name keeps track of the core dump that the user is uploading.

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

A user has two ways to upload files: uploading a local file and submitting a link to a core dump.

### Uploading a local file

When a local file is uploaded, the client first tests if the name of the core dump is valid (i.e. no other core dumps under the client's UUID have the same name). If the name is valid, the client uploads the file. (The first file name test is purely for client convenience, as the server tests the file name again after the upload.) The server checks if the file is the right type with the Unix `file` command, and if so, unzips the core dump using `gunzip` (if it is a gzip file) and builds the workspace. The output of the build (from `gen_core_report.sh`) is stored in a text file called `gen_core_report.txt`.

### Submitting a link

If a user submits a link, the server first checks if the link is valid and if the username and password (if supplied) are correct. If so, the server downloads the file from the link and proceeds with unzipping and building as in the local file upload case.

### Core dump storage

All uploaded core dumps are stored in the `uploads` folder. Each UUID has its own folder in `uploads`, and each core dump has its own folder in each UUID folder. The unzipped core dump and its associated `gen_core_report.txt`, backtrace file, siginfo file, workspace folder, and any other files from the build process are located inside the core dump folder.

## File output

If a user clicks one of the three buttons to analyze a core dump, Autopsy will return the contents of the corresponding file (`gen_core_report.txt`, the backtrace file, or the siginfo file) to the user.

## Running GDB

When a user analyzes a core dump with a command, GDB starts up in a background thread. The count (from the cookie), along with other information, is passed to the thread. GDB needs to start up for the first command, but subsequent commands used to analyze the core dump will use the same thread. Autopsy relies on dictionaries of queues to communicate with the GDB thread: the count is the key, and the queue is the value. There are 4 such dictionaries:

* `coredump_queues`: Stores the core dump to be analyzed. If a core dump different to the initial core dump entered is stored, the GDB thread will quit and a different GDB thread will be launched (since a GDB thread can only analyze a single core dump). If an empty string is entered, the GDB thread will simply quit.
* `command_queues`: Stores the command to be entered into GDB.
* `abort_queues`: If something is entered into the abort queue, GDB will abort running the current command.
* `output_queues`: Stores output from the GDB thread. If the output is `restart` (from detecting a different core dump in the core dump queue), Autopsy will launch another GDB thread.

When a command is sent to a GDB thread, both `coredump_queues` and `command_queues` are updated.

### GDB timeout

If a GDB thread is left running without any commands being submitted, the thread will shut down after 10 minutes due to a queue timeout. It is possible for a user to have a count that does not correspond to an active GDB thread, so the `running_counts` set keeps track of all counts that do have such a thread.

## Clean-up script

Every hour, Autopsy runs a clean-up script that deletes any core dump with a last-accessed date older than 4 days. This expiration limit can be adjusted by modifying the `DELETE_MIN` variable.

## Adding additional commands