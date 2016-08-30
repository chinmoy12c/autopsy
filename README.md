# Autopsy

Autopsy is a web-based core dump analyzer for Cisco ASA software. Autopsy runs on [Flask](http://flask.pocoo.org/docs/0.11/), a Python web framework.

## Table of contents

* [What's included](#whats-included)
* [What's not included](#whats-not-included)
* [Requirements](#requirements)
* [Development vs. production server](#development-vs-production-server)
* [Getting started with the development server](#getting-started-with-the-development-server)
 * [Cloning repositories](#cloning-repositories)
 * [Creating a virtual environment](#creating-a-virtual-environment)
 * [Using `launch.sh`](#using-launchsh)
 * [Installing packages and setting up the database](#installing-packages-and-setting-up-the-database)
 * [Launching and quitting Autopsy](#launching-and-quitting-autopsy)
 * [Launch process](#launch-process)

## What's included

* `static` contains four files for the web application:
 * `autopsy.css` is the CSS file.
 * `autopsy.js` is the JavaScript file.
 * `scalpel.png` is the favicon.
 * `scalpel.svg` is an SVG version of `scalpel.png` and is displayed on the top-left corner of the application.
* `templates` contains `autopsy.html`, which is the HTML for the main application, and `help.html`, which is the HTML for the help page.
* `.gitignore` lists files that are ignored when committing. Some of these files will have to be created first before running the application.
* `README.md` is this file.
* `autopsy.py` is the core application.
* `launch.sh` contains several commands to be executed before starting the application.
* `schema.sql` defines the structure of the database used to store core dumps.

## What's not included

* `database` and `uploads` folders will be created when running `launch.sh`.
* A `venv` folder will be generated after using `virtualenv` to create an isolated Python environment.
* A `flask-log.txt` file will be generated once the server starts to log interactions with the application.

## Requirements

Autopsy only works on Cisco machines with Perforce access and appropriate versions of GDB.

## Development vs. production server

There are two ways to launch Autopsy: with the [Flask development server](http://flask.pocoo.org/docs/0.11/server/) and with a production server like [nginx](https://nginx.org/). The development server is not suitable for production use; see more [here](http://flask.pocoo.org/docs/0.11/deploying/). This guide will provide steps on using the development server as well as setting up nginx as a proxy server to Autopsy running on [Gunicorn](http://gunicorn.org/), a Python HTTP server. This setup is detailed [here](http://flask.pocoo.org/docs/0.11/deploying/wsgi-standalone/).

## Getting started with the development server

### Cloning repositories

Run
```
git clone http://gitlab.cisco.com/clientlessvpn/Autopsy.git
```
to clone the Autopsy repository. The files should be in a folder called `Autopsy`.

Next, in the parent folder to `Autopsy`, run
```
git clone http://gitlab.cisco.com/clientlessvpn/clientlessgdb.git
```
to clone the clientlessGDB repository, which is necessary for analyzing core dumps. The files should be in a folder called `clientlessGDB`. The two folders `Autopsy` and `clientlessGDB` should be in the same directory. In the `clientlessGDB` folder, create a file called `ticket.txt` and enter your Perforce ticket inside.

### Creating a virtual environment

The next step is to create the virtual environment. Autopsy works with Python 3.5.2; it is not compatible with older versions. If your version of Python is older, you will need to download and build Python 3.5.2 first.

If you don't have the current version of Python, you need download and build the corresponding packages (perhaps in `/home` so as not to interfere with your default Python installation). To do this, get the  Python file [here](https://www.python.org/downloads/release/python-352/)  with `wget` and uncompress it with `tar`. Then, follow the instructions in the `README` file to build Python; when you run `./configure`, be sure to use the `--prefix` flag to install Python in the  directory. Once you have done so, you can find the location of the Python executable at `bin/python3.5` in the directory where you installed Python.

Finally, run
```
virtualenv -p <path to Python executable> venv
```
inside the main `Autopsy` folder. A `venv` folder should be created. If the `virtualenv` command is not defined, you will need to download `virtualenv` using your package manager.

### Using `launch.sh`

`launch.sh` does several things:
* Creates the `database` and `uploads` folders if they don't exist
* Sets up several useful aliases
 * `fk`, short for "flask kill", to completely kill the application
 * `fl`, short for "flask", to launch the application
 * `gk` to kill the Gunicorn server
 * `gu` to start the Gunicorn server
 * `nk` to kill the nginx server
 * `ng` to start nginx server
* Launches the virtual environment
* Exports a Flask variable pointing to `autopsy.py`
* Configures debug mode for Flask (off by default; set `FLASK_DEBUG` to 1 instead of 0 to enable debug mode)

Run
```
. launch.sh
```
to execute this file. Your prompt should start with `(venv)`, indicating that you are in a virtual environment. You can exit the virtual environment by running
```
deactivate
```
You can continue to use `launch.sh` whenever you wish to enter the virtual environment.

### Installing packages and setting up the database

While you are in the virtual environment, run
```
pip install Flask
```
to install Flask. Autopsy works with Flask version 0.11.1; ensure that the correct version is installed. You should now be able to run
```
flask initdb
```
to create a file called `cores.db` inside the `database` folder. Ensure that `cores.db` is writable by a non-root user; if it is not, run
```
chmod 777 database/cores.db
```
from root to make it writable.

Next, run
```
pip install requests
```
and
```
pip install requests-ntlm
```
to install other packages used by Autopsy. 

### Launching and quitting Autopsy

It is suggested to use Autopsy as a non-root user to avoid issues with GDB auto-loading. To launch Autopsy on the Flask development server, run
```
fl
```
to access the application at the machine's IP address. You can quit the application with <kbd>Ctrl-C</kbd>, but sometimes a few threads linger, so use
```
fk
```
after to completely kill the application. Note that running `fl` will automatically run `fk` before launching the application, so you can just use <kbd>Ctrl-C</kbd> and `fl` to restart the application.

### Launch process

After completing the steps above, only two steps are needed — running
```
. launch.sh
```
and
```
fl
```
to launch Autopsy.