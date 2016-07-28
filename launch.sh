#!/bin/bash

mkdir -p database
mkdir -p uploads
alias kf="pkill -9 python; pkill -9 flask"
alias fr="flask run --with-threads"
source $PWD/venv/bin/activate
source $PWD/.p4config
export "FLASK_APP=autopsy.py"
export "FLASK_DEBUG=1"
