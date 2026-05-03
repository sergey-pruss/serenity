#!/usr/bin/env bash
# Пошаговая настройка MCP Google Search Console (русский интерфейс GSC / Google Cloud).
cat <<'EOF'
=== MCP Google Search Console — что сделать ===

1) Google Cloud (браузер): https://console.cloud.google.com/
   • Выберите проект (или создайте).
   • «APIs and services» / «APIs и сервисы» → «Library» / «Библиотека»
   • Найдите «Google Search Console API» → Enable / «Включить».

2) Сервисный аккаунт и ключ JSON:
   • «IAM and admin» / «IAM и администрирование» → «Service accounts»
     / «Сервисные аккаунты» → Create / «Создать».
   • После создания: вкладка «Keys» / «Ключи» → Add key → JSON.
   • Сохраните файл в репозиторий ТОЧНО сюда (имя важно для лаунчера):
       secrets/mcp/google-search-console-sa.json
   • Либо положите JSON куда угодно и в secrets/mcp/env.sh укажите:
       export GSC_SERVICE_ACCOUNT_KEY_FILE="/полный/путь/к/файлу.json"

3) Узнать email сервисного аккаунта (для шага 4):
       npm run mcp:gsc-email

4) Google Search Console — куда нажимать (у вас уже открыты «Настройки»):
   • На странице «Настройки» найдите блок «Общие настройки».
   • Строка «Пользователи и разрешения» — нажмите НА САМУ СТРОКУ
     (не ищите отдельный пункт в меню слева: откроется список пользователей).
   • Внутри: «Добавить пользователя» / «Add user».
   • Вставьте email из шага 3 (…@….iam.gserviceaccount.com).
   • Роль: достаточно «Полный» / «Full» для чтения отчётов через API
     (или «Ограниченный» с нужными правами — если API пустой, повысьте до Full).

5) Перезапуск MCP в Cursor (или перезапуск окна).

Альтернатива без сервисного аккаунта: OAuth Desktop — в secrets/mcp/env.sh:
   export GSC_OAUTH_CLIENT_FILE="/полный/путь/к/client_secret_….json"
При первом запуске откроется браузер для входа Google.

Проверка: npm run mcp:gsc-email (если ключ на месте — покажет email).
EOF
