#!/usr/bin/env bash
# Общая логика выкладки статики (rsync в origin). Подключается из deploy-dev.sh / deploy-prod.sh — не запускать напрямую.
# Переопределение цели: DEPLOY_SSH_TARGET (по умолчанию root@168.222.142.141), DEPLOY_REMOTE_PATH (задают deploy-dev/prod).

deploy_ensure_blog_built() {
  if [[ -f blog/index.html ]] && grep -q '{{BLOG_TITLE}}' blog/index.html 2>/dev/null; then
    echo "⚠️  blog/index.html с плейсхолдерами {{BLOG_*}} — запускаю node scripts/build-blog-pages.mjs"
    node scripts/build-blog-pages.mjs
  fi
}

deploy_rsync_repo_to_static_root() {
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  local -a rsync_excludes=(
    --exclude='.git'
    --exclude='.claude'
    --exclude='.cursor'
    --exclude='.codex'
    --exclude='.continue'
    --exclude='node_modules'
    --exclude='.wrangler'
    --exclude='artifacts'
    --exclude='tmp/'
    --exclude='tmp-*'
    --exclude='wrangler.toml'
    --exclude='deploy.sh'
    --exclude='case/all/*/index 2.html'
  )
  if [[ "${DEPLOY_EXCLUDE_DOCS:-}" == "1" ]]; then
    rsync_excludes+=(--exclude='docs/')
  fi
  # prodvizhenie-yandex-karty-2gis — пока только dev (static.serenity.agency), не кладём в prod-root.
  if [[ "${DEPLOY_EXCLUDE_DEV_ONLY_PAGES:-}" == "1" ]]; then
    rsync_excludes+=(--exclude='prodvizhenie-yandex-karty-2gis/')
  fi
  rsync -avz \
    --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
    "${rsync_excludes[@]}" \
    ./ "${host}:${path}"
  deploy_remote_fix_static_permissions
}

# На origin nginx (www-data) должен читать файлы. С внешних дисков macOS rsync иногда
# оставляет 0700 (drwx------) несмотря на --chmod — после каждой выкладки выравниваем права.
deploy_remote_fix_static_permissions() {
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  # shellcheck disable=SC2086
  $RSYNC_RSH "${host}" "chmod -R u=rwX,go=rX -- '${path%/}/'" || true
}

# Каталог tmp/, файлы tmp-* в корне и .continue/ не кладём на origin. Без --delete rsync старые копии не снимет — чистим по SSH.
deploy_remote_scrub_rsync_excluded_tmp() {
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  local root="${path%/}"
  # shellcheck disable=SC2086
  $RSYNC_RSH "${host}" "rm -rf -- '${root}/tmp' '${root}/.continue'" || true
  # shellcheck disable=SC2086
  $RSYNC_RSH "${host}" "find '${root}' -maxdepth 1 -name 'tmp-*' -delete" 2>/dev/null || true
  echo "🧹 На origin удалены tmp/, tmp-* и .continue (если были): ${host}:${root}"
}

# docs/ — только dev (static-dev + Worker). На prod-root каталог не держим.
deploy_remote_scrub_docs_on_origin() {
  if [[ "${DEPLOY_EXCLUDE_DOCS:-}" != "1" ]]; then
    return 0
  fi
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  # shellcheck disable=SC2086
  $RSYNC_RSH "${host}" "rm -rf -- '${path}docs'" || true
  echo "🧹 На prod-origin удалён каталог docs/ (если был): ${host}:${path}docs"
}

# Страницы, которые сознательно не выкладываем на prod-root (пока только dev-превью).
deploy_remote_scrub_dev_only_pages_on_origin() {
  if [[ "${DEPLOY_EXCLUDE_DEV_ONLY_PAGES:-}" != "1" ]]; then
    return 0
  fi
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  # shellcheck disable=SC2086
  $RSYNC_RSH "${host}" "rm -rf -- '${path}prodvizhenie-yandex-karty-2gis'" || true
  echo "🧹 На prod-origin удалён prodvizhenie-yandex-karty-2gis/ (dev-only): ${host}:${path}prodvizhenie-yandex-karty-2gis"
}

deploy_worker_staging() {
  echo "→ Worker deploy (только API формы / Amo): https://serenity.sergeyprus.workers.dev …"
  npx wrangler deploy -c wrangler.api.jsonc
}

# Edge Yandex CDN перед static.serenity.agency (см. AGENTS.md). DEV purge нужен после rsync в static-dev.
deploy_cdn_purge_yandex_static_preview() {
  if command -v yc >/dev/null 2>&1; then
    YC_CLI_INITIALIZATION_SILENCE=true yc cdn cache purge \
      --resource-id "${CDN_RESOURCE_ID:-bc8r7ufcvyine32nhiun}" \
      --path '/*' --async \
      && echo "🧹 CDN purge (static.serenity.agency) запущен" \
      || echo "⚠️  yc cdn cache purge не выполнен; HTML на static обновится через ~5 мин"
  else
    echo "ℹ️  yc CLI не найден; HTML на static.serenity.agency обновится через ~5 мин (edge TTL)"
  fi
}
