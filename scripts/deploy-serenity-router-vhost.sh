#!/bin/bash
set -euo pipefail
#
# Выкладка продового vhost serenity.agency (location ^~ /docs/, /blog, robots, sitemap, legacy-прокси).
# Путь по умолчанию — как в комментарии nginx/serenity-router.live.conf.
#
# Это НЕ scripts/deploy-routing.sh (тот только nginx/routing.conf в conf.d).

SERVER_HOST="${SERVER_HOST:-168.222.142.141}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_SERENITY_ROUTER_VHOST_PATH="${REMOTE_SERENITY_ROUTER_VHOST_PATH:-/etc/nginx/sites-available/serenity-router}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/deploy-lib.sh"
export DEPLOY_SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"
export DEPLOY_SSH_IDENTITY="${SERVER_SSH_KEY}"

LOCAL_FILE="${ROOT_DIR}/nginx/serenity-router.live.conf"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  echo "file not found: ${LOCAL_FILE}" >&2
  exit 1
fi

TMP_REMOTE="$(mktemp -u /tmp/serenity-router-vhost.XXXXXX.conf)"

echo "Uploading serenity-router vhost to ${SERVER_HOST}:${TMP_REMOTE}"
deploy_scp_run "${LOCAL_FILE}" "${DEPLOY_SSH_TARGET}:${TMP_REMOTE}"

echo "Applying ${REMOTE_SERENITY_ROUTER_VHOST_PATH} and reloading nginx"
deploy_ssh_run "cp '${TMP_REMOTE}' '${REMOTE_SERENITY_ROUTER_VHOST_PATH}' && nginx -t && systemctl reload nginx && rm -f '${TMP_REMOTE}'"

echo "Serenity-router vhost applied successfully."
echo "Reminder: bash scripts/deploy-prod.sh (файлы docs/ на диске) и bash scripts/deploy-routing.sh (карта is_new_page)."
