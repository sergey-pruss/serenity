#!/usr/bin/env bash
# Prod: выкладка статики для основного домена https://serenity.agency.
# Важно: prod пишет только в /var/www/static; Worker staging обновляется dev-деплоем отдельно.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"

export DEPLOY_REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/static/}"

echo "→ Prod deploy: основной домен https://serenity.agency (origin статики) …"
deploy_ensure_blog_built
deploy_rsync_repo_to_static_root
echo "✅ Prod: статика на origin для serenity.agency (nginx: root /var/www/static)."
