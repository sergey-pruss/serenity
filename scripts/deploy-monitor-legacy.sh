#!/usr/bin/env bash
# Выкладывает monitor-legacy.sh на роутер и настраивает cron (каждые 5 минут).
# Конфиг берётся из secrets/deploy-notify.env (не коммитится).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_KEY="${SERVER_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_HOST="${SERVER_HOST:-root@168.222.142.141}"

ENV_FILE="$ROOT_DIR/secrets/deploy-notify.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Файл $ENV_FILE не найден" >&2; exit 1
fi
source "$ENV_FILE"

MONITOR_HOST="${MONITOR_HOST:-194.58.104.78}"
MONITOR_PORT="${MONITOR_PORT:-443}"
NOTIFY_URL="https://serenity.agency/api/internal/rank-dashboard-notify"
SECRET="${RANK_DASHBOARD_NOTIFY_SECRET:?RANK_DASHBOARD_NOTIFY_SECRET не задан в deploy-notify.env}"

echo "Копирую скрипт мониторинга на сервер..."
scp -i "$SSH_KEY" "$ROOT_DIR/scripts/monitor-legacy.sh" \
  "${SSH_HOST}:/usr/local/bin/serenity-monitor-legacy.sh"

echo "Настраиваю конфиг и cron..."
ssh -i "$SSH_KEY" "${SSH_HOST}" bash <<REMOTE
set -euo pipefail

chmod +x /usr/local/bin/serenity-monitor-legacy.sh

# Конфиг (перезаписываем при повторном деплое)
cat > /etc/serenity-monitor.env <<ENV
MONITOR_HOST=${MONITOR_HOST}
MONITOR_PORT=${MONITOR_PORT}
MONITOR_NOTIFY_URL=${NOTIFY_URL}
MONITOR_SECRET=${SECRET}
ENV
chmod 600 /etc/serenity-monitor.env

# Cron: каждые 5 минут, лог в /var/log/serenity-monitor.log
CRON_LINE="*/5 * * * * bash /usr/local/bin/serenity-monitor-legacy.sh >> /var/log/serenity-monitor.log 2>&1"
# Добавляем только если ещё нет
( crontab -l 2>/dev/null | grep -v serenity-monitor-legacy; echo "\$CRON_LINE" ) | crontab -

echo "Проверяю первый запуск..."
bash /usr/local/bin/serenity-monitor-legacy.sh && echo "OK (состояние: \$(cat /var/run/serenity-monitor.state))"
REMOTE

echo "Готово. Мониторинг запускается каждые 5 минут."
