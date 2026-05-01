#!/bin/bash
set -euo pipefail
#
# Выкладка продового vhost serenity.agency (location ^~ /docs/, robots, sitemap, legacy-прокси).
# Путь по умолчанию — как в комментарии nginx/serenity-router.live.conf.
#
# Это НЕ scripts/deploy-routing.sh (тот только nginx/routing.conf в conf.d).

SERVER_HOST="${SERVER_HOST:-168.222.142.141}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_SERENITY_ROUTER_VHOST_PATH="${REMOTE_SERENITY_ROUTER_VHOST_PATH:-/etc/nginx/sites-available/serenity-router}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_FILE="${ROOT_DIR}/nginx/serenity-router.live.conf"
LOCAL_SNAPSHOT_INC="${ROOT_DIR}/nginx/serenity-router-snapshot.inc"
REMOTE_SNAPSHOT_INC="${REMOTE_SNAPSHOT_INC:-/etc/nginx/serenity-router-snapshot.inc}"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  echo "file not found: ${LOCAL_FILE}" >&2
  exit 1
fi
if [[ ! -f "${LOCAL_SNAPSHOT_INC}" ]]; then
  echo "file not found: ${LOCAL_SNAPSHOT_INC}" >&2
  exit 1
fi

SSH_CMD=(ssh -i "${SERVER_SSH_KEY}" "${SERVER_USER}@${SERVER_HOST}")
SCP_CMD=(scp -i "${SERVER_SSH_KEY}")
TMP_REMOTE="$(mktemp -u /tmp/serenity-router-vhost.XXXXXX.conf)"
TMP_REMOTE_INC="$(mktemp -u /tmp/serenity-router-snapshot.XXXXXX.inc)"

echo "Uploading serenity-router snapshot include to ${SERVER_HOST}:${TMP_REMOTE_INC}"
"${SCP_CMD[@]}" "${LOCAL_SNAPSHOT_INC}" "${SERVER_USER}@${SERVER_HOST}:${TMP_REMOTE_INC}"

echo "Uploading serenity-router vhost to ${SERVER_HOST}:${TMP_REMOTE}"
"${SCP_CMD[@]}" "${LOCAL_FILE}" "${SERVER_USER}@${SERVER_HOST}:${TMP_REMOTE}"

echo "Applying vhost, snapshot include, and reloading nginx"
"${SSH_CMD[@]}" "\
  cp '${TMP_REMOTE_INC}' '${REMOTE_SNAPSHOT_INC}' && \
  cp '${TMP_REMOTE}' '${REMOTE_SERENITY_ROUTER_VHOST_PATH}' && \
  nginx -t && systemctl reload nginx && \
  rm -f '${TMP_REMOTE}' '${TMP_REMOTE_INC}'"

echo "Serenity-router vhost applied successfully."
echo "Reminder: bash deploy.sh (файлы docs/ на диске) и bash scripts/deploy-routing.sh (карта is_new_page)."
