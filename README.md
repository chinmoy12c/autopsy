# Autopsy

Autopsy is a web-based core dump analyzer for Cisco ASA software. Autopsy runs on [Flask](http://flask.pocoo.org/docs/0.11/), a Python web framework.

## Table of Contents

* [What's Included](#whats-included)
* [What's Not Included](#whats-not-included)
* [Getting Started](#getting-started)
 * [Cloning the repository](#cloning-the-repository)
 * [Creating a virtual environment](#creating-a-virtual-environment)
 * [Setting up Perforce](#setting-up-perforce)
 * [Using `launch.sh`](#using-launchsh)
 * [Installing Flask and setting up the database](#installing-flask-and-setting-up-the-database)
 * [Launching and quitting Autopsy](#launching-and-quitting-autopsy)

## What's Included

* `static` contains two files: `autopsy.css` and `autopsy.js`. This folder stores the CSS and JavaScript files for the web application.
* `templates` contains `autopsy.html`, which is the HTML for the application.
* `.gitignore` lists files that are ignored when committing. Some of these files will have to be created first before running the application.
* `README.md` is this file.
* `autopsy.py` is the core application.
* `launch.sh` contains several commands to be executed before starting the application.
* `schema.sql` defines the structure of the database used to store core dumps.

## What's Not Included

* `database` and `uploads` folders will be created when running `launch.sh`.
* A `.p4config` file will need to be created, which stores Perforce parameters.
* A `password.txt` file will store the password for the Perforce account to be used to create the workspace for a core dump.
* A `venv` folder will be generated after using `virtualenv` to create an isolated Python environment.

## Getting Started

### Cloning the repository

Run
```
git clone http://gitlab.cisco.com/clientlessvpn/Autopsy.git
```
to clone the repository. The files should be in a folder called `Autopsy`.

### Creating a virtual environment

The next step is to create the virtual environment. Autopsy works with Python 2.7.12. After checking your Python version to see if it's compatible (e.g. with `python -V`), run
```
which python
```
to get the location of your Python executable. Finally, run
```
virtualenv -p <path to Python executable> venv
```
inside the main `Autopsy` folder. A `venv` folder should be created.

### Setting up Perforce

Create a file called `.p4config` inside `Autopsy` folder. The contents of this file should look like
```
export P4CONFIG=
export P4CLIENT=
export P4PORT=
export P4USER=
export P4EDITOR=
export P4DIFF=
```
with each variable set to the appropriate value. `P4CONFIG` is the path to the `.p4config` file. Then, create a file called `password.txt` inside the `Autopsy` folder and enter your Perforce password inside.

### Using `launch.sh`

`launch.sh` does several things:
* Creates the `database` and `uploads` folders
* Sets up two useful aliases (`fk`, short for "flask kill", to completely kill the application and `fr`, short for "flask run", to launch the application)
* Launches the virtual environment
* Sets up the Perforce parameters from `.p4config`
* Exports a Flask variable pointing to `autopsy.py`
* Sets up debug mode for Flask
Run
```
. launch.sh
```
to execute this file. Your prompt should start with `(venv)`, indicating that you are in a virtual environment. You can exit the virtual environment by running
```
deactivate
```
You can continue to use `launch.sh` whenever you wish to enter the virtual environment.

### Installing Flask and setting up the database

While you are in the virtual environment, run
```
pip install Flask
```
to install Flask. You should now be able to run
```
flask initdb
```
to create a file called `cores.db` inside the `database` folder.

### Launching and quitting Autopsy

To launch Autopsy on the Flask development server, run
```
fr
```
to access the application at `127.0.0.1:5000`. You can quit the application with <kbd>Ctrl-C</kbd>, but sometimes a few threads linger, so use
```
fk
```
after to completely kill the application.