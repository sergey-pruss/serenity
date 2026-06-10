#!/usr/bin/env bash
# Prod: выкладка статики для основного домена https://serenity.agency.
# Важно: prod пишет только в /var/www/static; Worker staging обновляется dev-деплоем отдельно.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"
export DEPLOY_NOTIFY_ROOT="$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-notify.sh"
deploy_notify_apply_cli "$@"

export DEPLOY_REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/static/}"
export DEPLOY_EXCLUDE_DOCS=1
export DEPLOY_EXCLUDE_DEV_ONLY_PAGES=1
export DEPLOY_SURFACE=prod
deploy_notify_trap_install

echo "→ Prod deploy: основной домен https://serenity.agency (origin статики) …"
deploy_ensure_blog_built
deploy_rsync_repo_to_static_root
deploy_remote_scrub_rsync_excluded_tmp
deploy_remote_scrub_docs_on_origin
deploy_remote_scrub_dev_only_pages_on_origin
echo "✅ Prod: статика на origin для serenity.agency (nginx: root /var/www/static)."
deploy_notify_send success
