#!/usr/bin/env bash
# Быстрая выкладка только docs/ на dev (static.serenity.agency/docs/…).
# Полный dev: bash scripts/deploy-dev.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"

export DEPLOY_REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/static-dev/}"
export DEPLOY_SSH_TARGET="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"

if [[ ! -d docs ]] || [[ -z "$(ls -A docs 2>/dev/null || true)" ]]; then
  echo "⚠️  Каталог docs/ пуст — нечего выкладывать"
  exit 1
fi

host="${DEPLOY_SSH_TARGET}"
path="${DEPLOY_REMOTE_PATH}"
path="${path%/}/"

echo "→ Dev docs: https://static.serenity.agency/docs/ …"
rsync -avz \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  ./docs/ "${host}:${path}docs/"

# shellcheck disable=SC2086
$RSYNC_RSH "${host}" "chmod -R u=rwX,go=rX -- '${path}docs/'" || true

if command -v yc >/dev/null 2>&1; then
  YC_CLI_INITIALIZATION_SILENCE=true yc cdn cache purge \
    --resource-id "${CDN_RESOURCE_ID:-bc8r7ufcvyine32nhiun}" \
    --path '/docs/*' --async \
    && echo "🧹 CDN purge /docs/* запущен" \
    || echo "⚠️  yc cdn cache purge не выполнен"
else
  echo "ℹ️  yc CLI не найден; docs на edge обновятся по TTL (~5 мин)"
fi

echo "✅ Dev docs: ${host}:${path}docs/"
