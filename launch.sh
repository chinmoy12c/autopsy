#!/bin/bash

if [ ! -f autopsy.py ]; then
    echo "Error: running launch script in wrong directory"
    return
fi
ROOT_DIR=$(dirname `pwd`)
GUNICORN_PID=${ROOT_DIR}/Autopsy/gunicorn.pid
NGINX_DIR=${ROOT_DIR}/nginx/sbin/nginx
mkdir -p database
mkdir -p flasklogs
mkdir -p uploads
alias fk="pkill -9 python ; pkill -9 flask"
alias fl="pkill -9 python ; pkill -9 flask ; flask run --host=0.0.0.0 --no-reload --with-threads"
alias gk="[ -f ${GUNICORN_PID} ] && kill -9 \$(cat ${GUNICORN_PID})"
alias gu="[ -f ${GUNICORN_PID} ] && kill -9 \$(cat ${GUNICORN_PID}) ; gunicorn -b 127.0.0.1:7432 -p ${GUNICORN_PID} -t 999999 --threads 10 autopsy:app &"
alias nk="${NGINX_DIR} -s quit"
alias ng="${NGINX_DIR} -s quit ; ${NGINX_DIR}"
alias chk="ps aux | grep -e nginx -e gunicorn"
source $PWD/venv/bin/activate
export "FLASK_APP=autopsy.py"
export "FLASK_DEBUG=0"
export LC_ALL=en_US.utf8
export LANG=en_US.utf8
