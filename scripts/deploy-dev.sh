#!/usr/bin/env bash
# Dev: выкладка артефакта для проверки на https://static.serenity.agency (origin + purge CDN превью).
# Тот же каталог /var/www/static на сервере, что и у prod (см. AGENTS.md); отличие — сценарий и сообщение под превью.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-lib.sh"

echo "→ Dev deploy: превью https://static.serenity.agency …"
deploy_ensure_blog_built
deploy_rsync_repo_to_static_root
echo "✅ Dev: origin обновлён (${DEPLOY_SSH_TARGET:-root@168.222.142.141}:${DEPLOY_REMOTE_PATH:-/var/www/static/})"
deploy_cdn_purge_yandex_static_preview
