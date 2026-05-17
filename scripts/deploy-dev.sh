#!/usr/bin/env bash
# Dev: выкладка артефакта для проверки на https://static.serenity.agency и Worker staging.
# Важно: dev пишет в отдельный каталог /var/www/static-dev, не в prod root /var/www/static.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"
export DEPLOY_NOTIFY_ROOT="$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-notify.sh"
deploy_notify_apply_cli "$@"

export DEPLOY_REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/static-dev/}"
export DEPLOY_SURFACE=dev
deploy_notify_trap_install

echo "→ Dev deploy: превью https://static.serenity.agency …"
deploy_ensure_blog_built
deploy_rsync_repo_to_static_root
deploy_remote_scrub_rsync_excluded_tmp
echo "✅ Dev: static origin обновлён (${DEPLOY_SSH_TARGET:-root@168.222.142.141}:${DEPLOY_REMOTE_PATH})"
deploy_cdn_purge_yandex_static_preview
deploy_worker_staging
deploy_notify_send success
