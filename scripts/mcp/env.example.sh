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

# XMLRiver — ежедневный съём позиций (run-rank-dashboard-daily.sh)
# export XMLRIVER_USER="..."
# export XMLRIVER_KEY="..."

# Опционально: глубина органики (daily по умолчанию 50)
# export SERP_ORGANIC_DEPTH=30
# export RANK_PANEL_VERIFY_ATTEMPTS=15
# export SERENITY_SEO_ON_SERVER=1   # на сервере в cron уже задано

# RuCaptcha + SERP_PROXY_URL — только ручная пересъёмка спорных ячеек:
#   npm run seo:rank-dashboard:serp:disputed
# export RUCAPTCHA_API_KEY="..."
# export SERP_PROXY_URL="http://user:pass@host:8080"
# export GSC_OAUTH_CLIENT_FILE=…  export GOOGLE_SHEETS_OAUTH_CLIENT_FILE=…
# Принудительно SA для GSC (обычно не нужно): export GSC_FORCE_SERVICE_ACCOUNT=1
#
# SEO-отчёты, позиции и semantic-core перенесены в репозиторий dashboard (../dashboard).
