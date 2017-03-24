#!/bin/bash

PREFIX=/local/Autopsy_dbg
NGINX_PID=${PREFIX}/var/log/nginx/nginx.pid
GUNICORN_PID=${PREFIX}/var/log/gunicorn/gunicorn.pid

mkdir -p database
mkdir -p uploads
#alias fk="pkill -9 python ; pkill -9 flask"
#alias fl="pkill -9 python ; pkill -9 flask ; flask run --host=0.0.0.0 --no-reload --with-threads"
#alias fl="pkill -9 python ; pkill -9 flask ; flask run --host=0.0.0.0 --with-threads"
alias fl="${PREFIX}/python/bin/flask run --host=0.0.0.0 --with-threads"
alias gk="[ -e ${GUNICORN_PID} ] && kill -9 $(cat ${GUNICORN_PID})"
alias gu="${PREFIX}/python/bin/gunicorn --pid ${GUNICORN_PID} -b 127.0.0.1:5001 -t 999999 --threads 64 autopsy:app &"
#alias nk="killall nginx"
alias nk="[ -e ${NGINX_PID} ] && kill -9 $(cat ${NGINX_PID})"
alias ng="${PREFIX}/nginx/sbin/nginx"
source ${PREFIX}/venv/bin/activate
export "FLASK_APP=autopsy.py"
export "FLASK_DEBUG=0"
