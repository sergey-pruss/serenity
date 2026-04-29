#!/bin/bash
set -euo pipefail
#
# ВНИМАНИЕ: после certbot файл на сервере содержит SSL-блоки.
# Этот скрипт перезапишет sites-available/serenity-router ТОЛЬКО HTTP-версией без HTTPS.
# На проде после выпуска сертификата используй патч или правь конфиг вручную.

SERVER_HOST="${SERVER_HOST:-168.222.142.141}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_ROUTING_PATH="${REMOTE_ROUTING_PATH:-/etc/nginx/conf.d/serenity-routing.conf}"
REMOTE_SITE_PATH="${REMOTE_SITE_PATH:-/etc/nginx/sites-available/serenity-router}"
REMOTE_SITE_LINK="${REMOTE_SITE_LINK:-/etc/nginx/sites-enabled/serenity-router}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_ROUTING_FILE="${ROOT_DIR}/nginx/routing.conf"

if [[ ! -f "${LOCAL_ROUTING_FILE}" ]]; then
  echo "routing file not found: ${LOCAL_ROUTING_FILE}" >&2
  exit 1
fi

TMP_ROUTING="$(mktemp -u /tmp/serenity-routing.XXXXXX.conf)"
TMP_SITE="$(mktemp -u /tmp/serenity-site.XXXXXX.conf)"

cat > /tmp/serenity-router-site.conf <<'EOF'
upstream serenity_legacy_origin {
    server 80.78.246.207:80;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name serenity.agency www.serenity.agency;

    root /var/www/static;
    index index.html;

    location ^~ /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://serenity_legacy_origin;
    }

    error_page 419 = @legacy_proxy;

    location / {
        if ($is_new_page = 0) {
            return 419;
        }
        try_files $uri $uri/ =404;
    }

    location @legacy_proxy {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        proxy_pass http://serenity_legacy_origin;
    }
}
EOF

echo "Uploading routing map and serenity router site config"
scp -i "${SERVER_SSH_KEY}" "${LOCAL_ROUTING_FILE}" "${SERVER_USER}@${SERVER_HOST}:${TMP_ROUTING}"
scp -i "${SERVER_SSH_KEY}" /tmp/serenity-router-site.conf "${SERVER_USER}@${SERVER_HOST}:${TMP_SITE}"

echo "Installing nginx site and reloading"
ssh -i "${SERVER_SSH_KEY}" "${SERVER_USER}@${SERVER_HOST}" "\
  cp '${TMP_ROUTING}' '${REMOTE_ROUTING_PATH}' && \
  cp '${TMP_SITE}' '${REMOTE_SITE_PATH}' && \
  ln -sfn '${REMOTE_SITE_PATH}' '${REMOTE_SITE_LINK}' && \
  nginx -t && \
  systemctl reload nginx && \
  rm -f '${TMP_ROUTING}' '${TMP_SITE}'"

rm -f /tmp/serenity-router-site.conf

echo "serenity.agency router site installed (HTTP)."
echo "Next: switch DNS A records to ${SERVER_HOST}, then run certbot for HTTPS."
