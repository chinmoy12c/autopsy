# Documentation

This file serves as documentation for Autopsy. It assumes that you have read `README.md` and have a basic understanding of Flask. (Reading through the [official quickstart documentation for Flask](http://flask.pocoo.org/docs/0.11/quickstart/) is suggested.)

## Session cookie

Autopsy stores information about a user in a signed cookie, implemented with sessions in Flask. The cookie is base-64 encoded, so it is possible to see the contents of the cookie by decoding it; however, modifying the cookie manually would cause it to be rejected by the server due to the invalid signature. (The data and signature parts of the cookie are separated by a period.)

If a user visits Autopsy without a cookie (e.g. for the first time), Autopsy generates a version 4 [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) and a number that uniquely identifies the user (called "count" in the code). The count is generated from a monotonically increasing counter to ensure that it is unique. The UUID corresponds to the core dumps that the user uploads, and the count identifies the user's GDB session.

Finally, when a user uploads a core dump, the name of the core dump is stored in the cookie (called "current" in the code). The name keeps track of the core dump that the user is uploading.

## Database

Autopsy stores information about uploaded core dumps inside the `cores.db` database. This database has six columns:

* **uuid**: the UUID of the user who uploaded the core dump.
* **coredump**: the name of the core dump.
* **filesize**: the file size of the core dump.
* **timestamp**: the last-accessed date of the core dump.
* **workspace**: the name of the workspace folder for the core dump.
* **gdb**: the path to the version of GDB to use for the core dump.

The uuid, coredump, filesize, and timestamp fields are obtained when the user uploads the core dump. The workspace and gdb fields are extracted from the output of `gen_core_report.sh`. The timestamp field is updated whenever the core dump is accessed by a user.

## Adding additional commands