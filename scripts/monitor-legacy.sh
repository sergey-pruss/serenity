#!/usr/bin/env bash
# Мониторинг legacy-origin: шлёт Telegram-уведомление только при первом сбое
# и при восстановлении. Запускается из cron каждые 5 минут.
#
# Зависимости на сервере: curl, bash
# Конфиг через переменные окружения (или файл /etc/serenity-monitor.env):
#   MONITOR_HOST        — хост/IP для проверки (обязательно)
#   MONITOR_PORT        — порт (по умолчанию 443)
#   MONITOR_NOTIFY_URL  — URL Worker-эндпоинта (обязательно)
#   MONITOR_SECRET      — Bearer-токен для Worker (обязательно)
#   MONITOR_STATE_FILE  — файл состояния (по умолчанию /var/run/serenity-monitor.state)

set -euo pipefail

ENV_FILE="${MONITOR_ENV_FILE:-/etc/serenity-monitor.env}"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

HOST="${MONITOR_HOST:?MONITOR_HOST is required}"
PORT="${MONITOR_PORT:-443}"
NOTIFY_URL="${MONITOR_NOTIFY_URL:?MONITOR_NOTIFY_URL is required}"
SECRET="${MONITOR_SECRET:?MONITOR_SECRET is required}"
STATE_FILE="${MONITOR_STATE_FILE:-/var/run/serenity-monitor.state}"
TIMEOUT=10

send_telegram() {
  local text="$1"
  curl -sf --max-time 15 \
    -X POST "$NOTIFY_URL" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"text\": $(printf '%s' "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
    > /dev/null 2>&1 || true
}

# Проверка TCP-доступности
if timeout "$TIMEOUT" bash -c "echo > /dev/tcp/$HOST/$PORT" 2>/dev/null; then
  STATUS="up"
else
  STATUS="down"
fi

PREV_STATUS="$(cat "$STATE_FILE" 2>/dev/null || echo "up")"

if [[ "$STATUS" == "down" && "$PREV_STATUS" == "up" ]]; then
  send_telegram "🔴 <b>serenity.agency упал</b>

Legacy-origin <code>$HOST:$PORT</code> не отвечает.
Время: $(date '+%Y-%m-%d %H:%M UTC')"
  echo "down" > "$STATE_FILE"

elif [[ "$STATUS" == "up" && "$PREV_STATUS" == "down" ]]; then
  send_telegram "🟢 <b>serenity.agency восстановлен</b>

Legacy-origin <code>$HOST:$PORT</code> снова доступен.
Время: $(date '+%Y-%m-%d %H:%M UTC')"
  echo "up" > "$STATE_FILE"

else
  # Состояние не изменилось — молчим
  echo "$STATUS" > "$STATE_FILE"
fi
