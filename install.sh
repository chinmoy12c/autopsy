#!/bin/bash

if [ ! -f autopsy.py ]; then
    echo "Error: running install script in wrong directory"
    return
fi
cd ..
base_dir=$(pwd)
git clone https://wwwin-gitlab-sjc.cisco.com/SSLMIDPATH/clientlessGDB.git
echo "Enter your Perforce ticket:"
read ticket
echo ${ticket} > clientlessGDB/ticket.txt
mkdir -p python
cd python
python_dir=$(pwd)
wget https://www.python.org/ftp/python/3.6.1/Python-3.6.1.tar.xz
tar -xf Python-3.6.1.tar.xz
rm Python-3.6.1.tar.xz
cd Python-3.6.1
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
cd ..
mkdir -p nginx
cd nginx
nginx_dir=$(pwd)
wget http://nginx.org/download/nginx-1.13.1.tar.gz
tar -xf nginx-1.13.1.tar.gz
rm nginx-1.13.1.tar.gz
cd nginx-1.13.1
./configure --with-http_ssl_module --prefix=${nginx_dir}
make
make install
cd ..
cat << 'EOF' > conf/nginx.conf
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
        server  127.0.0.1:5432;
    }

    server {
        listen  9002;
        return  301 https://$host$request_uri;
    }

    server {
        listen                  9001 ssl;
        client_max_body_size    0;

        location / {
            proxy_pass          http://app_servers;
            proxy_redirect      off;
            proxy_set_header    Host $host;
            proxy_set_header    X-Real-IP $remote_addr;
            proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header    X-Forwarded-Proto $scheme;
            proxy_read_timeout  9999;
        }

        ssl                 on;
        ssl_certificate     /local/Autopsy/certs/autopsyStackedPEMCerts.pem;
        ssl_certificate_key /local/Autopsy/certs/autopsy.key;
    }
}
EOF
cd ..
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
crontab cronjob
cd ../Autopsy
