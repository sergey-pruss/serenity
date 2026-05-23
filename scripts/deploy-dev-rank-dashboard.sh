#!/usr/bin/env bash
# Только docs/seo-rank-dashboard.html на dev (static.serenity.agency).
# Полный dev: bash scripts/deploy-dev.sh · все docs/: bash scripts/deploy-dev-docs.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"

export DEPLOY_REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/static-dev/}"
export DEPLOY_SSH_TARGET="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"

HTML="docs/seo-rank-dashboard.html"
if [[ ! -f "$HTML" ]]; then
  echo "⚠️  Нет ${HTML} — сначала: npm run seo:rank-dashboard:build"
  exit 1
fi

host="${DEPLOY_SSH_TARGET}"
path="${DEPLOY_REMOTE_PATH}"
path="${path%/}/"

echo "→ Dev rank dashboard: https://static.serenity.agency/docs/seo-rank-dashboard.html …"
rsync -avz \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  "./${HTML}" "${host}:${path}${HTML}"

# shellcheck disable=SC2086
$RSYNC_RSH "${host}" "chmod -R u=rwX,go=rX -- '${path}docs/'" || true

if command -v yc >/dev/null 2>&1; then
  YC_CLI_INITIALIZATION_SILENCE=true yc cdn cache purge \
    --resource-id "${CDN_RESOURCE_ID:-bc8r7ufcvyine32nhiun}" \
    --path '/docs/seo-rank-dashboard.html' --async \
    && echo "🧹 CDN purge /docs/seo-rank-dashboard.html запущен" \
    || echo "⚠️  yc cdn cache purge не выполнен"
else
  echo "ℹ️  yc CLI не найден; HTML на edge обновится по TTL (~5 мин)"
fi

echo "✅ Dev rank dashboard: ${host}:${path}${HTML}"
