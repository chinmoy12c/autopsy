#!/bin/bash

mkdir -p database
mkdir -p uploads
alias fk="pkill -9 python ; pkill -9 flask"
alias fl="pkill -9 python ; pkill -9 flask ; flask run --host=0.0.0.0 --no-reload --with-threads"
alias gk="pkill -9 gunicorn"
alias gu="pkill -9 gunicorn ; gunicorn -b 127.0.0.1:5432 -t 999999 --threads 64 autopsy:app &"
alias nk="killall nginx"
alias ng="killall nginx ; ../nginx/sbin/nginx"
source $PWD/venv/bin/activate
export "FLASK_APP=autopsy.py"
export "FLASK_DEBUG=0"
