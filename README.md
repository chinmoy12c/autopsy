# Autopsy

Autopsy is a web-based core dump analyzer for Cisco ASA software. Autopsy runs on [Flask](http://flask.pocoo.org/docs/0.11/), a Python web framework.

## Table of Contents

* [What's Included](#whats-included)
* [What's Not Included](#whats-not-included)
* [Getting Started](#getting-started)
 * [Cloning repositories](#cloning-repositories)
 * [Creating a virtual environment](#creating-a-virtual-environment)
 * [Setting up Perforce](#setting-up-perforce)
 * [Using `launch.sh`](#using-launchsh)
 * [Installing Flask and setting up the database](#installing-flask-and-setting-up-the-database)
 * [Launching and quitting Autopsy](#launching-and-quitting-autopsy)

## What's Included

* `static` contains four files for the web application:
 * `autopsy.css` is the CSS file.
 * `autopsy.js` is the JavaScript file.
 * `scalpel.png` is the favicon.
 * `scalpel.svg` is an SVG version of `scalpel.png` and is displayed on the top-left corner of the application.
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
to clone the clientlessGDB repository, which is necessary for analyzing core dumps. The files should be in a folder called `clientlessGDB`. The two folders `Autopsy` and `clientlessGDB` should be in the same directory.

### Creating a virtual environment

The next step is to create the virtual environment. Autopsy works with Python 3.5.2; it is not compatible with older versions. If your version of Python is older, you will need to download and build Python 3.5.2 first. Once you have done so, you can find the location of the Python executable at `bin/python3.5` in the directory where you installed Python. Finally, run
```
virtualenv -p <path to Python executable> venv
```
inside the main `Autopsy` folder. A `venv` folder should be created. If the `virtualenv` command is not defined, you will need to download `virtualenv` using your package manager.

### Setting up Perforce

Create a file called `.p4config` inside the `Autopsy` folder. The contents of this file should look like
```
export P4CONFIG=$PWD/.p4config
export P4PORT=tuscan:1666
export P4USER=
```
with `P4USER` set to your Perforce username. Then, create a file called `password.txt` inside the `Autopsy` folder and enter your Perforce password inside.

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
to install Flask. Autopsy works with Flask version 0.11.1; ensure that the correct version is installed. You should now be able to run
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
after to completely kill the application. Note that running `fr` will automatically run `fk` before launching the application.