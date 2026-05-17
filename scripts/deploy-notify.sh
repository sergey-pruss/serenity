#!/usr/bin/env bash
# Опциональные уведомления после deploy-dev / deploy-prod (Telegram Bot API).
# По умолчанию выключены; включить на один запуск: --notify или DEPLOY_NOTIFY=1.
# Секреты — только локально; агент в Cursor токен не видит, пока вы не положите файл у себя.
set -euo pipefail

deploy_notify_root() {
  if [[ -n "${DEPLOY_NOTIFY_ROOT:-}" ]]; then
    printf '%s\n' "$DEPLOY_NOTIFY_ROOT"
    return 0
  fi
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  printf '%s\n' "$here"
}

deploy_notify_load_config() {
  if [[ "${DEPLOY_NOTIFY_LOADED:-}" == "1" ]]; then
    return 0
  fi
  export DEPLOY_NOTIFY_LOADED=1

  local root
  root="$(deploy_notify_root)"
  local -a candidates=(
    "${root}/secrets/deploy-notify.env"
    "${root}/scripts/deploy-notify.env"
    "${HOME}/.config/serenity/deploy-notify.env"
  )
  local f
  for f in "${candidates[@]}"; do
    if [[ -f "$f" ]]; then
      # shellcheck disable=SC1090
      set -a
      source "$f"
      set +a
      return 0
    fi
  done
}

deploy_notify_apply_cli() {
  local arg
  for arg in "$@"; do
    case "$arg" in
      --notify) export DEPLOY_NOTIFY=1 ;;
    esac
  done
}

deploy_notify_enabled() {
  deploy_notify_load_config
  if [[ "${DEPLOY_NOTIFY:-0}" != "1" ]]; then
    return 1
  fi
  [[ -n "${DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN:-}" && -n "${DEPLOY_NOTIFY_TELEGRAM_CHAT_ID:-}" ]]
}

deploy_notify_git_line() {
  local root branch sha
  root="$(deploy_notify_root)"
  if ! command -v git >/dev/null 2>&1 || ! git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return 0
  fi
  branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  sha="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || true)"
  if [[ -n "$branch" && -n "$sha" ]]; then
    printf '%s @ %s' "$branch" "$sha"
  fi
}

deploy_notify_escape_html() {
  local s="$1"
  s="${s//&/&amp;}"
  s="${s//</&lt;}"
  s="${s//>/&gt;}"
  printf '%s' "$s"
}

deploy_notify_telegram() {
  local text="$1"
  local token chat_id
  token="${DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN:?}"
  chat_id="${DEPLOY_NOTIFY_TELEGRAM_CHAT_ID:?}"

  if ! command -v curl >/dev/null 2>&1; then
    echo "⚠️  deploy-notify: curl не найден, Telegram пропущен" >&2
    return 0
  fi

  local http_code
  http_code="$(
    curl -sS -o /tmp/serenity-deploy-notify.json -w '%{http_code}' \
      -X POST "https://api.telegram.org/bot${token}/sendMessage" \
      --data-urlencode "chat_id=${chat_id}" \
      --data-urlencode "parse_mode=HTML" \
      --data-urlencode "disable_web_page_preview=true" \
      --data-urlencode "text=${text}" \
      2>/dev/null || echo "000"
  )"

  if [[ "$http_code" != "200" ]]; then
    echo "⚠️  deploy-notify: Telegram HTTP ${http_code} (см. /tmp/serenity-deploy-notify.json)" >&2
    return 0
  fi
  echo "📬 Уведомление в Telegram отправлено"
}

deploy_notify_send() {
  local status="${1:-success}"
  local exit_code="${2:-0}"

  deploy_notify_load_config
  if ! deploy_notify_enabled; then
    return 0
  fi

  local surface host path user hostline gitline icon headline urls
  surface="${DEPLOY_SURFACE:-deploy}"
  host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  path="${DEPLOY_REMOTE_PATH:-}"
  user="$(whoami 2>/dev/null || echo unknown)"
  hostline="$(hostname -s 2>/dev/null || hostname 2>/dev/null || echo local)"
  gitline="$(deploy_notify_git_line || true)"

  if [[ "$surface" == "dev" ]]; then
    urls=$'https://static.serenity.agency\nhttps://serenity.sergeyprus.workers.dev'
    icon="🟢"
  elif [[ "$surface" == "prod" ]]; then
    urls="https://serenity.agency"
    icon="🔴"
  else
    urls=""
    icon="📦"
  fi

  if [[ "$status" == "success" ]]; then
    headline="успешно"
    icon="${icon} ✅"
  else
    headline="ошибка (код ${exit_code})"
    icon="❌ ${icon}"
  fi

  local msg
  msg="$(printf '%s <b>Serenity deploy %s</b> %s\n\n' "$icon" "$(deploy_notify_escape_html "$surface")" "$headline")"
  msg+="$(printf 'Поверхность: <code>%s</code>\n' "$(deploy_notify_escape_html "$surface")")"
  if [[ -n "$urls" ]]; then
    msg+="$(printf 'URL:\n%s\n\n' "$urls")"
  fi
  msg+="$(printf 'Origin: <code>%s</code>\n' "$(deploy_notify_escape_html "${host}:${path}")")"
  msg+="$(printf 'С машины: %s @ %s\n' "$(deploy_notify_escape_html "$user")" "$(deploy_notify_escape_html "$hostline")")"
  if [[ -n "$gitline" ]]; then
    msg+="$(printf 'Git: <code>%s</code>\n' "$(deploy_notify_escape_html "$gitline")")"
  fi

  deploy_notify_telegram "$msg"
}

deploy_notify_trap_install() {
  deploy_notify_load_config
  if ! deploy_notify_enabled; then
    return 0
  fi
  deploy_notify_on_exit() {
    local ec=$?
    if [[ $ec -ne 0 ]]; then
      deploy_notify_send failure "$ec"
    fi
  }
  trap deploy_notify_on_exit EXIT
}
