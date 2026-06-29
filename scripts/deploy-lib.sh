#!/usr/bin/env bash
# Общая логика выкладки статики (rsync или tar+ssh в origin). Подключается из deploy-dev.sh / deploy-prod.sh — не запускать напрямую.
# Переопределение цели: DEPLOY_SSH_TARGET (по умолчанию root@168.222.142.141), DEPLOY_REMOTE_PATH (задают deploy-dev/prod).
# Windows/Git Bash: rsync через Windows OpenSSH (инкрементально); tar+ssh — запасной (DEPLOY_TRANSPORT=tar).

deploy_ssh_identity_file() {
  if [[ -n "${DEPLOY_SSH_IDENTITY:-}" ]]; then
    printf '%s' "${DEPLOY_SSH_IDENTITY}"
    return 0
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      if [[ -n "${USERPROFILE:-}" ]]; then
        cygpath -u "${USERPROFILE}/.ssh/id_ed25519" 2>/dev/null && return 0
      fi
      ;;
  esac
  printf '%s' "${HOME}/.ssh/id_ed25519"
}

deploy_ssh_known_hosts_file() {
  if [[ -n "${DEPLOY_SSH_KNOWN_HOSTS:-}" ]]; then
    printf '%s' "${DEPLOY_SSH_KNOWN_HOSTS}"
    return 0
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      if [[ -n "${USERPROFILE:-}" ]]; then
        cygpath -u "${USERPROFILE}/.ssh/known_hosts" 2>/dev/null && return 0
      fi
      ;;
  esac
  printf '%s' "${HOME}/.ssh/known_hosts"
}

deploy_ssh_bin() {
  if [[ -n "${DEPLOY_SSH_BIN:-}" ]]; then
    printf '%s' "${DEPLOY_SSH_BIN}"
    return 0
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      if [[ -x "/c/Windows/System32/OpenSSH/ssh.exe" ]]; then
        printf '%s' "/c/Windows/System32/OpenSSH/ssh.exe"
        return 0
      fi
      ;;
  esac
  command -v ssh 2>/dev/null || printf '%s' ssh
}

deploy_scp_bin() {
  if [[ -n "${DEPLOY_SCP_BIN:-}" ]]; then
    printf '%s' "${DEPLOY_SCP_BIN}"
    return 0
  fi
  local ssh_bin
  ssh_bin="$(deploy_ssh_bin)"
  case "$ssh_bin" in
    *ssh.exe) printf '%s' "${ssh_bin/ssh.exe/scp.exe}" ;;
    *) command -v scp 2>/dev/null || printf '%s' scp ;;
  esac
}

deploy_ssh_target() {
  printf '%s' "${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
}

deploy_ssh_path_for_bin() {
  local p="$1"
  local ssh_bin="$2"
  case "$ssh_bin" in
    *OpenSSH*ssh.exe | *OpenSSH*/ssh.exe)
      cygpath -w "$p" 2>/dev/null || printf '%s' "$p"
      ;;
    *) printf '%s' "$p" ;;
  esac
}

deploy_ssh_opts_array() {
  local idf kh ssh_bin idf_arg kh_arg
  ssh_bin="$(deploy_ssh_bin)"
  DEPLOY_SSH_OPTS=(
    -o BatchMode=yes
    -o ConnectTimeout=30
    -o ServerAliveInterval=15
    -o ServerAliveCountMax=6
  )
  idf="$(deploy_ssh_identity_file)"
  DEPLOY_SSH_OPTS+=(-i "$(deploy_ssh_path_for_bin "$idf" "$ssh_bin")")
  kh="$(deploy_ssh_known_hosts_file)"
  if [[ -f "$kh" ]]; then
    kh_arg="$(deploy_ssh_path_for_bin "$kh" "$ssh_bin")"
    DEPLOY_SSH_OPTS+=(-o "UserKnownHostsFile=${kh_arg}" -o StrictHostKeyChecking=yes)
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      DEPLOY_SSH_OPTS+=(-o GlobalKnownHostsFile=/dev/null)
      export SSH_ASKPASS_REQUIRE=never
      ;;
  esac
}

deploy_ssh_run() {
  deploy_ssh_opts_array
  "$(deploy_ssh_bin)" "${DEPLOY_SSH_OPTS[@]}" "$(deploy_ssh_target)" "$@"
}

deploy_scp_run() {
  deploy_ssh_opts_array
  "$(deploy_scp_bin)" "${DEPLOY_SSH_OPTS[@]}" "$@"
}

deploy_ssh_preflight() {
  echo "→ Проверка SSH к $(deploy_ssh_target)…"
  if ! deploy_ssh_run "echo deploy_ssh_ok" >/dev/null 2>&1; then
    echo "❌ SSH не отвечает (BatchMode). На Windows: один раз подтвердите хост в окне Git for Windows или проверьте ~/.ssh/known_hosts." >&2
    return 1
  fi
  echo "✓ SSH ок"
}

deploy_rsync_ssh_e() {
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      local idf kh
      idf="$(cygpath -w "$(deploy_ssh_identity_file)")"
      kh="$(cygpath -w "$(deploy_ssh_known_hosts_file)")"
      printf '/usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=6 -i "%s" -o UserKnownHostsFile="%s" -o StrictHostKeyChecking=yes -o GlobalKnownHostsFile=/dev/null' "$idf" "$kh"
      ;;
    *)
      printf 'ssh -o BatchMode=yes -i "%s"' "$(deploy_ssh_identity_file)"
      ;;
  esac
}

deploy_rsync_protocol_args() {
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*) printf '%s' --protocol=30 ;;
  esac
}

deploy_use_tar_ssh_transport() {
  if [[ "${DEPLOY_TRANSPORT:-}" == "tar" ]]; then
    return 0
  fi
  if [[ "${DEPLOY_TRANSPORT:-}" == "rsync" ]]; then
    return 1
  fi
  if ! command -v rsync >/dev/null 2>&1; then
    return 0
  fi
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      # rsync + Windows OpenSSH: инкрементальная выкладка без GUI Git SSH.
      if [[ -x "/c/Windows/System32/OpenSSH/ssh.exe" ]]; then
        return 1
      fi
      return 0
      ;;
  esac
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
  deploy_ssh_preflight
  case "$(uname -s 2>/dev/null)" in
    MINGW* | MSYS*)
      deploy_tar_ssh_via_staged_archive "${path}"
      return
      ;;
  esac
  echo "ℹ️  Выкладка через tar+ssh (без rsync)…"
  deploy_ssh_run "mkdir -p -- '${path%/}'"
  tar "${DEPLOY_STATIC_EXCLUDES[@]}" -czf - . | deploy_ssh_run "cd '${path%/}' && tar -xzf -"
  deploy_remote_fix_static_permissions
}

# Windows: отдельно pack → scp → extract — видны этапы, меньше «тишины» в чате Cursor.
deploy_tar_ssh_via_staged_archive() {
  local path="$1"
  local archive remote_archive mb size
  archive="${TMPDIR:-/tmp}/serenity-deploy-$$.tar.gz"
  remote_archive="/tmp/serenity-deploy-$$.tar.gz"
  mb="$(du -sm . 2>/dev/null | awk '{print $1}' || echo '?')"
  echo "ℹ️  Выкладка через tar+scp+ssh (~${mb} MB в репо, 5–15 мин — это нормально)."
  echo "→ Упаковка архива локально…"
  tar "${DEPLOY_STATIC_EXCLUDES[@]}" -czf "$archive" .
  size="$(du -h "$archive" 2>/dev/null | awk '{print $1}' || echo '?')"
  echo "→ Загрузка ${size} на сервер…"
  deploy_ssh_run "mkdir -p -- '${path%/}'"
  deploy_scp_run "$archive" "$(deploy_ssh_target):${remote_archive}"
  echo "→ Распаковка на сервере…"
  deploy_ssh_run "cd '${path%/}' && tar -xzf '${remote_archive}' && rm -f '${remote_archive}'"
  rm -f "$archive"
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
  local host path rsh
  local -a rsync_extra=()
  host="$(deploy_ssh_target)"
  path="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH is required; use deploy-dev.sh or deploy-prod.sh}"
  deploy_collect_static_excludes
  deploy_ssh_preflight
  rsh="${RSYNC_RSH:-$(deploy_rsync_ssh_e)}"
  if [[ -n "$(deploy_rsync_protocol_args)" ]]; then
    rsync_extra+=(--protocol=30)
  fi
  echo "ℹ️  Выкладка через rsync (только изменённые файлы)…"
  deploy_ssh_run "mkdir -p -- '${path%/}'"
  rsync -avz "${rsync_extra[@]}" -e "$rsh" \
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
