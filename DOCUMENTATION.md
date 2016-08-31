# Documentation

This file serves as documentation for Autopsy. It assumes that you have read `README.md` and have a basic understanding of Flask. (Reading through the [official quickstart documentation for Flask](http://flask.pocoo.org/docs/0.11/quickstart/) is suggested.)

# Session cookie

Someone that visits the Autopsy website for the first time receives a signed cookie (implemented with sessions in Flask).

# Database

Autopsy stores information about core dumps that are uploaded inside the `cores.db` database.