#!/bin/bash
set -euo pipefail
#
# Выкладка vhost превью static.serenity.agency (явный location /docs/ без fallback на главную).
# После копирования: nginx -t и reload.
#
# Удалённый путь по умолчанию совпадает с комментарием в nginx/static.serenity.agency.live.conf
# (зеркало sites-available/static). При другом имени файла на сервере задайте REMOTE_STATIC_VHOST_PATH.

SERVER_HOST="${SERVER_HOST:-168.222.142.141}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_STATIC_VHOST_PATH="${REMOTE_STATIC_VHOST_PATH:-/etc/nginx/sites-available/static}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_FILE="${ROOT_DIR}/nginx/static.serenity.agency.live.conf"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  echo "file not found: ${LOCAL_FILE}" >&2
  exit 1
fi

SSH_CMD=(ssh -i "${SERVER_SSH_KEY}" "${SERVER_USER}@${SERVER_HOST}")
SCP_CMD=(scp -i "${SERVER_SSH_KEY}")
TMP_REMOTE="$(mktemp -u /tmp/serenity-static-vhost.XXXXXX.conf)"

echo "Uploading static vhost to ${SERVER_HOST}:${TMP_REMOTE}"
"${SCP_CMD[@]}" "${LOCAL_FILE}" "${SERVER_USER}@${SERVER_HOST}:${TMP_REMOTE}"

echo "Applying ${REMOTE_STATIC_VHOST_PATH} and reloading nginx"
"${SSH_CMD[@]}" "cp '${TMP_REMOTE}' '${REMOTE_STATIC_VHOST_PATH}' && nginx -t && systemctl reload nginx && rm -f '${TMP_REMOTE}'"

echo "Static vhost applied successfully."
