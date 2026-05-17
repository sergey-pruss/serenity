#!/usr/bin/env bash
# Показать chat_id для DEPLOY_NOTIFY_TELEGRAM_CHAT_ID (после /start боту в Telegram).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DEPLOY_NOTIFY_ROOT="$ROOT"
# shellcheck disable=SC1091
source "${ROOT}/scripts/deploy-notify.sh"
deploy_notify_load_config

token="${DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN:-}"
if [[ -z "$token" ]]; then
  echo "Задайте DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN в secrets/deploy-notify.env" >&2
  echo "Образец: scripts/deploy-notify.env.example" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Нужен curl" >&2
  exit 1
fi

resp="$(curl -sS "https://api.telegram.org/bot${token}/getUpdates")"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$resp" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
if not data.get("ok"):
    print("API error:", data, file=sys.stderr)
    sys.exit(1)
results = data.get("result") or []
if not results:
    print("Нет сообщений. Напишите боту /start в Telegram и запустите снова.", file=sys.stderr)
    sys.exit(1)
seen = {}
for u in reversed(results):
    msg = u.get("message") or u.get("edited_message") or {}
    chat = msg.get("chat") or {}
    cid = chat.get("id")
    if cid is None or cid in seen:
        continue
    seen[cid] = True
    kind = chat.get("type", "?")
    title = chat.get("username") or chat.get("title") or (
        " ".join(filter(None, [chat.get("first_name"), chat.get("last_name")]))
    )
    print(f"chat_id={cid}  type={kind}  label={title or '-'}")
PY
else
  echo "$resp"
  echo ""
  echo "Установите python3 для разбора или возьмите chat.id из JSON выше." >&2
fi
