#!/usr/bin/env bash
# Общая логика выкладки статики (rsync или tar+ssh в origin). Подключается из deploy-dev.sh / deploy-prod.sh — не запускать напрямую.
# Переопределение цели: DEPLOY_SSH_TARGET (по умолчанию root@168.222.142.141), DEPLOY_REMOTE_PATH (задают deploy-dev/prod).
# Windows/Git Bash: rsync часто ломается (Program Files, кириллица в профиле) — автоматически tar+ssh.

deploy_ssh_identity_file() {
  printf '%s' "${DEPLOY_SSH_IDENTITY:-$HOME/.ssh/id_ed25519}"
}

deploy_ssh_target() {
  printf '%s' "${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
}

deploy_ssh_run() {
  ssh -i "$(deploy_ssh_identity_file)" -o BatchMode=yes "$(deploy_ssh_target)" "$@"
}

deploy_use_tar_ssh_transport() {
  if [[ "${DEPLOY_TRANSPORT:-}" == "tar" ]]; then
    return 0
  fi
  if [[ "${DEPLOY_TRANSPORT:-}" == "rsync" ]]; then
    return 1
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*) return 0 ;;
  esac
  if ! command -v rsync >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

deploy_collect_static_excludes() {
  DEPLOY_STATIC_EXCLUDES=(
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
    DEPLOY_STATIC_EXCLUDES+=(--exclude='docs/')
  fi
}

deploy_tar_ssh_to_static_root() {
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  deploy_collect_static_excludes
  echo "ℹ️  Выкладка через tar+ssh (без rsync)…"
  deploy_ssh_run "mkdir -p -- '${path%/}'"
  tar "${DEPLOY_STATIC_EXCLUDES[@]}" -czf - . | deploy_ssh_run "cd '${path%/}' && tar -xzf -"
  deploy_remote_fix_static_permissions
}

deploy_ensure_blog_built() {
  if [[ -f blog/index.html ]] && grep -q '{{BLOG_TITLE}}' blog/index.html 2>/dev/null; then
    echo "⚠️  blog/index.html с плейсхолдерами {{BLOG_*}} — запускаю node scripts/build-blog-pages.mjs"
    node scripts/build-blog-pages.mjs
  fi
}

deploy_rsync_repo_to_static_root() {
  if deploy_use_tar_ssh_transport; then
    deploy_tar_ssh_to_static_root
    return
  fi
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $(deploy_ssh_identity_file)}"
  local host
  host="$(deploy_ssh_target)"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  deploy_collect_static_excludes
  rsync -avz \
    --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
    "${DEPLOY_STATIC_EXCLUDES[@]}" \
    ./ "${host}:${path}"
  deploy_remote_fix_static_permissions
}

# На origin nginx (www-data) должен читать файлы. С внешних дисков macOS rsync иногда
# оставляет 0700 (drwx------) несмотря на --chmod — после каждой выкладки выравниваем права.
deploy_remote_fix_static_permissions() {
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  deploy_ssh_run "chmod -R u=rwX,go=rX -- '${path%/}/'" || true
}

# Каталог tmp/, файлы tmp-* в корне и .continue/ не кладём на origin. Без --delete rsync старые копии не снимет — чистим по SSH.
deploy_remote_scrub_rsync_excluded_tmp() {
  local host
  host="$(deploy_ssh_target)"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  local root="${path%/}"
  deploy_ssh_run "rm -rf -- '${root}/tmp' '${root}/.continue'" || true
  deploy_ssh_run "find '${root}' -maxdepth 1 -name 'tmp-*' -delete" 2>/dev/null || true
  echo "🧹 На origin удалены tmp/, tmp-* и .continue (если были): ${host}:${root}"
}

# docs/ — только dev (static-dev + Worker). На prod-root каталог не держим.
deploy_remote_scrub_docs_on_origin() {
  if [[ "${DEPLOY_EXCLUDE_DOCS:-}" != "1" ]]; then
    return 0
  fi
  local host
  host="$(deploy_ssh_target)"
  local path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  deploy_ssh_run "rm -rf -- '${path}docs'" || true
  echo "🧹 На prod-origin удалён каталог docs/ (если был): ${host}:${path}docs"
}

deploy_wrangler_authenticated() {
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    return 0
  fi
  local out
  out="$(npx wrangler whoami 2>&1)" || true
  if grep -qi 'not authenticated' <<<"$out"; then
    return 1
  fi
  return 0
}

deploy_worker_staging() {
  if [[ "${DEPLOY_SKIP_WRANGLER:-}" == "1" ]]; then
    echo "ℹ️  Worker deploy пропущен (DEPLOY_SKIP_WRANGLER=1)"
    return 0
  fi
  if ! deploy_wrangler_authenticated; then
    echo "ℹ️  Worker deploy пропущен: wrangler не залогинен (статика уже на сервере)"
    echo "    Для API формы позже: npx wrangler login"
    return 0
  fi
  echo "→ Worker deploy (только API формы / Amo): https://serenity.sergeyprus.workers.dev …"
  if ! npx wrangler deploy -c wrangler.api.jsonc; then
    echo "⚠️  Worker deploy не удался; статика на сервере уже обновлена"
  fi
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
