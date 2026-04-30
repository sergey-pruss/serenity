#!/bin/bash
set -euo pipefail

# Safe routing deploy:
# 1) uploads nginx/routing.conf to server
# 2) validates config with nginx -t
# 3) reloads nginx only after successful validation

SERVER_HOST="${SERVER_HOST:-168.222.142.141}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_ROUTING_PATH="${REMOTE_ROUTING_PATH:-/etc/nginx/conf.d/serenity-routing.conf}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_ROUTING_FILE="${ROOT_DIR}/nginx/routing.conf"

if [[ ! -f "${LOCAL_ROUTING_FILE}" ]]; then
  echo "routing file not found: ${LOCAL_ROUTING_FILE}" >&2
  exit 1
fi

SSH_CMD=(ssh -i "${SERVER_SSH_KEY}" "${SERVER_USER}@${SERVER_HOST}")
SCP_CMD=(scp -i "${SERVER_SSH_KEY}")

TMP_REMOTE="$(mktemp -u /tmp/serenity-routing.XXXXXX.conf)"

echo "Uploading routing file to ${SERVER_HOST}:${TMP_REMOTE}"
"${SCP_CMD[@]}" "${LOCAL_ROUTING_FILE}" "${SERVER_USER}@${SERVER_HOST}:${TMP_REMOTE}"

echo "Validating and applying routing config on server"
"${SSH_CMD[@]}" "cp '${TMP_REMOTE}' '${REMOTE_ROUTING_PATH}' && nginx -t && systemctl reload nginx && rm -f '${TMP_REMOTE}'"

echo "Routing config applied successfully."
echo "Если /docs/… всё ещё даёт 500 или Nuxt: bash deploy.sh и bash scripts/deploy-serenity-router-vhost.sh (см. AGENTS.md)."
