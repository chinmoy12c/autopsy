#!/bin/bash

if [ ! -f autopsy.py ]; then
    echo "Error: running install script in wrong directory"
    return
fi

clientlessGDB_install() {
    cd ..
    git clone https://wwwin-gitlab-sjc.cisco.com/SSLMIDPATH/clientlessGDB.git
    echo "Enter your Perforce ticket:"
    read ticket
    echo ${ticket} > clientlessGDB/ticket.txt
    cd Autopsy
}

python_virtualenv_flask_install() {
    cd ..
    mkdir -p python
    cd python
    python_dir=$(pwd)
    wget https://www.python.org/ftp/python/3.6.2/Python-3.6.2.tar.xz
    tar -xf Python-3.6.2.tar.xz
    rm Python-3.6.2.tar.xz
    cd Python-3.6.2
    ./configure --prefix=${python_dir}
    make
    make test
    make install
    cd ../..
    wget https://github.com/pypa/virtualenv/archive/15.1.0.tar.gz
    tar -xf 15.1.0.tar.gz
    rm 15.1.0.tar.gz
    python virtualenv-15.1.0/virtualenv.py -p python/bin/python3.6 Autopsy/venv
    cd Autopsy
    . launch.sh
    pip install Flask requests requests-ntlm pexpect gunicorn
    flask initdb
    chmod 777 database/cores.db
    deactivate
}

nginx_install() {
    cd ..
    mkdir -p nginx
    cd nginx
    nginx_dir=$(pwd)
    wget http://nginx.org/download/nginx-1.13.4.tar.gz
    tar -xf nginx-1.13.4.tar.gz
    rm nginx-1.13.4.tar.gz
    cd nginx-1.13.4
    ./configure --with-http_ssl_module --prefix=${nginx_dir}
    make
    make install
    cd ..
    eport="5000"
    while [[ "$eport" == "5000" ]] ; do
        echo "Enter the external port you wish to use (anything except 5000):"
        read eport
    done
    cat << EOF > conf/nginx.conf
worker_processes    1;

events {
    worker_connections  1024;
}

http {
    include             mime.types;
    default_type        application/octet-stream;

    access_log          logs/access.log;
    error_log           logs/error.log;

    sendfile            on;
    keepalive_timeout   9999;

    upstream app_servers {
        server  127.0.0.1:5000;
    }

    server {
        listen                  $eport ssl;
        client_max_body_size    0;
        error_page 497          https://\$host:$eport\$request_uri;

        location / {
            proxy_pass          http://app_servers;
            proxy_redirect      off;
            proxy_set_header    Host \$host;
            proxy_set_header    X-Real-IP \$remote_addr;
            proxy_set_header    X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header    X-Forwarded-Proto \$scheme;
            proxy_read_timeout  9999;
        }

        ssl                 on;
        ssl_certificate     /local/certs/autopsyStackedPEMCerts.pem;
        ssl_certificate_key /local/certs/autopsy.key;
    }
}
EOF
    cd ../Autopsy
}

logrotate_install() {
    cd ..
    base_dir=$(pwd)
    mkdir -p logrotate
    cd logrotate
    cat << EOF > logrotate.conf
${base_dir}/nginx/logs/*.log {
    weekly
    dateext
    missingok
    rotate 7305
    postrotate
        if [ -f ${base_dir}/nginx/logs/nginx.pid ]; then
            kill -USR1 \`cat ${base_dir}/nginx/logs/nginx.pid\`
        fi
    endscript
}
EOF
    echo "0 0 * * 0 logrotate -s ${base_dir}/logrotate/status ${base_dir}/logrotate/logrotate.conf > /dev/null 2>&1" > cronjob
    (crontab -l ; cat cronjob) | crontab -
    cd ../Autopsy
}

unset OPTIND
while getopts ":cpnlh" opt; do
    case $opt in
        c)
            clientlessGDB_install
            return
            ;;
        p)
            python_virtualenv_flask_install
            return
            ;;
        n)
            nginx_install
            return
            ;;
        l)
            logrotate_install
            return
            ;;
        h)
            cat << 'EOF'
Installer script for Autopsy.
Run with no flags to install all needed components.

Previous versions of these components should be uninstalled first before using the installer.

Flags:
    -c: Install clientlessGDB
    -p: Install Python, virtualenv, and Flask
    -n: Install nginx
    -l: Install (set up) logrotate
EOF
            return
            ;;
        \?)
            echo "-$OPTARG: Invalid flag."
            return
            ;;
    esac
done
unset OPTIND

clientlessGDB_install
python_virtualenv_flask_install
nginx_install
logrotate_install
