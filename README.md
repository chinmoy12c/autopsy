# Autopsy

Autopsy is a web-based core dump analyzer for Cisco ASA software. Autopsy runs on [Flask](http://flask.pocoo.org/docs/0.12/), a Python web framework.

## Table of contents

* [What's included](#whats-included)
* [What's not included](#whats-not-included)
* [Requirements](#requirements)
* [Installation](#installation)
* [Development vs. production server](#development-vs-production-server)
* [Using `launch.sh`](#using-launchsh)
* [Getting started with the development server](#getting-started-with-the-development-server)
 * [Launching and quitting Autopsy](#launching-and-quitting-autopsy)
 * [Launch process](#launch-process)
* [Using the production server](#using-the-production-server)
* [Running Autopsy](#running-autopsy)
* [Logging](#logging)
* [Documentation](#documentation)

## What's included

* `static` contains four files for the web application:
 * `autopsy.css` is the CSS file.
 * `autopsy.js` is the JavaScript file, which works together with autopsy.html in the front end.
 * `scalpel.png` is the favicon.
 * `scalpel.svg` is an SVG version of `scalpel.png` and is displayed on the top-left corner of the application.
* `templates` contains `autopsy.html`, which is the HTML for the main application, `help.html`, which is the HTML for the help page.
* `.gitignore` lists files that are ignored when committing. Some of these files will have to be created first before running the application.
* `DOCUMENTATION.md` is the documentation for Autopsy.
* `README.md` is this file.
* `autopsy.py` is the core application.
* `install.sh` completes the installation of Autopsy.
* `launch.sh` contains several commands to be executed before starting the application.
* `schema.sql` defines the structure of the database used to store core dumps.

## What's not included

* `database`, `flasklogs`, and `uploads` folders will be created when running `launch.sh`.
* A `venv` folder will be generated after using `virtualenv` to create an isolated Python environment.

## Requirements

Autopsy only works on Cisco machines with Perforce access and appropriate versions of GDB.

## Installation

If you are reinstalling Autopsy, make sure to delete the previous version completely first and clean up the output of `crontab -l` (see the [logging section](#logging) below).

Run the following commands to install Autopsy in a directory named `Autopsy`:
```
mkdir Autopsy
cd Autopsy
git clone https://wwwin-gitlab-sjc.cisco.com/SSLMIDPATH/Autopsy.git
cd Autopsy
. install.sh
```
You may have to enter your CEC credentials to clone the clientlessGDB repository, which is necessary for analyzing core dumps. You will also be prompted to enter your Perforce ticket and an external port number (used to access Autopsy).

The installation should set up six folders in the main `Autopsy` directory:
* `Autopsy` contains the contents of this repository.
* `clientlessGDB` contains the contents of the clientlessGDB respository.
* `logrotate` contains files used for managing nginx log files.
* `nginx` contains an installation of nginx 1.13.4.
* `python` contains an installation of Python 3.6.2.
* `virtualenv-15.1.0` contains an installation of virtualenv, which creates a virtual Python environment.

It is recommended to keep the installations of nginx, Python, and virtualenv up to date (possibly by periodically updating `install.sh`).

## Development vs. production server

There are two ways to launch Autopsy: with the [Flask development server](http://flask.pocoo.org/docs/0.12/server/) and with a production server like [nginx](https://nginx.org/). The development server is not suitable for production use; see more [here](http://flask.pocoo.org/docs/0.12/deploying/). This guide will provide steps on using the development server as well as using nginx as a proxy server to Autopsy running on [Gunicorn](http://gunicorn.org/), a Python HTTP server. This setup is detailed [here](http://flask.pocoo.org/docs/0.12/deploying/wsgi-standalone/).

## Using `launch.sh`

`launch.sh` does several things:
* Creates the `database`, `flasklogs`, and `uploads` folders if they don't exist
* Sets up several useful aliases
 * `fk`, short for "flask kill", to completely kill the application
 * `fl`, short for "flask", to launch the application
 * `gk` to kill the Gunicorn server
 * `gu` to start the Gunicorn server
 * `nk` to kill the nginx server
 * `ng` to start nginx server
 * `chk` to check which nginx and Gunicorn processes are running
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

## Getting started with the development server

If you just want to set up Autopsy, you can skip this section.

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

## Using the production server

The configuration file for Autopsy is located at `nginx/conf/nginx.conf`, which specifies the port number for the application, the location of the nginx logs, and the website's certificate (`ssl_certificate` and `ssl_certificate_key`), among other things. Autopsy allows users to input their CEC credentials to access core dumps online and SCP files, so certificates should be used. You may have to modify the configuration file to point at the correct certificates.

## Running Autopsy

Start nginx with `ng` and then start Gunicorn by running `gu` in the `Autopsy` folder. To stop the application, use `gk`. To shut down nginx as well, use `nk`.

You should monitor the running nginx and Gunicorn processes with `chk` to ensure that no leftover processes are running. (Typically, there should be two nginx and two Gunicorn processes per instance.)

## Logging

By default, Autopsy logs output from `autopsy.py` to both the console and `flask.log`, which is located in the `flasklogs` folder. To turn off console logging, comment out (i.e. put a `#` in front of)
```
logger.addHandler(ch)
```
at the top of `autopsy.py`.

Application logs are stored at `nginx/logs/access.log` and `nginx/logs/error.log`.

You should check that `crontab -l` does not have any duplicate lines for rotating nginx logs. (The install process does not clear previous lines, so multiple lines can appear if you reinstall Autopsy.) You can use `crontab -e` to delete the duplicate lines.

## Documentation


See [`DOCUMENTATION.md`](DOCUMENTATION.md) for documentation on Autopsy.

