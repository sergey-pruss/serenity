# Локальная копия: secrets/mcp/env.sh (создаётся `bash scripts/mcp/bootstrap.sh`)
# Яндекс OAuth: https://oauth.yandex.ru/client/new — redirect https://oauth.yandex.ru/verification_code
# Токены: npx yandex-webmaster-mcp auth | npx yandex-metrika-mcp auth (нужны YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET)
export YANDEX_WEBMASTER_TOKEN=""
export YANDEX_METRIKA_TOKEN=""
# GSC / дашборд — sergeyprus@gmail.com, клиент sergeypruss (не Serenity SEO):
# npm run mcp:gsc-sync-oauth  или mcp:gsc-install-oauth → secrets/mcp/gsc-oauth-desktop.json
# npm run seo:gsc-oauth-token:install
# Google Таблица миграции — prus@serenity.ru, клиент Serenity SEO:
# secrets/mcp/google-sheets-oauth-client.json + npm run seo:sheets-oauth:install
# export GSC_OAUTH_CLIENT_FILE=…  export GOOGLE_SHEETS_OAUTH_CLIENT_FILE=…
# Принудительно SA для GSC (обычно не нужно): export GSC_FORCE_SERVICE_ACCOUNT=1
# Сервисный аккаунт (опционально, для npm run seo:positions-report по Google):
# export GSC_SERVICE_ACCOUNT_KEY_FILE="/абсолютный/путь/к/service-account.json"
#
# Отчёт по ядру (npm run seo:positions-report): см. docs/seo-positions-mcp-workflows.md
# export SEMANTIC_CORE_PATH="$PWD/json/seo/semantic-core.json"
# export REPORT_START_DATE=2026-04-01
# export REPORT_END_DATE=2026-04-27
