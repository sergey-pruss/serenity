# Локальная копия: secrets/mcp/env.sh (создаётся `bash scripts/mcp/bootstrap.sh`)
# Яндекс OAuth: https://oauth.yandex.ru/client/new — redirect https://oauth.yandex.ru/verification_code
# Токены: npx yandex-webmaster-mcp auth | npx yandex-metrika-mcp auth (нужны YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET)
export YANDEX_WEBMASTER_TOKEN=""
export YANDEX_METRIKA_TOKEN=""
# Google Search Console MCP — рекомендуется OAuth Desktop (не нужно добавлять SA в GSC):
# npm run mcp:gsc-install-oauth -- "$HOME/Downloads/client_secret_….json"
#   → secrets/mcp/gsc-oauth-desktop.json (лаунчер подхватывает сам)
# или: npm run mcp:gsc-sync-oauth  (копия из sergey-pruss.github.io/.cursor/mcp.json)
# или явный путь:
# export GSC_OAUTH_CLIENT_FILE="/абсолютный/путь/к/oauth-desktop.json"
# Принудительно SA вместо OAuth (если оба файла есть): export GSC_FORCE_SERVICE_ACCOUNT=1
# Сервисный аккаунт (опционально, для npm run seo:positions-report по Google):
# export GSC_SERVICE_ACCOUNT_KEY_FILE="/абсолютный/путь/к/service-account.json"
#
# Отчёт по ядру (npm run seo:positions-report): см. docs/seo-positions-mcp-workflows.md
# export SEMANTIC_CORE_PATH="$PWD/json/seo/semantic-core.json"
# export REPORT_START_DATE=2026-04-01
# export REPORT_END_DATE=2026-04-27
