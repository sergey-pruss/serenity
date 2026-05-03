# Локальная копия: secrets/mcp/env.sh (создаётся `bash scripts/mcp/bootstrap.sh`)
# Яндекс OAuth: https://oauth.yandex.ru/client/new — redirect https://oauth.yandex.ru/verification_code
# Токены: npx yandex-webmaster-mcp auth | npx yandex-metrika-mcp auth (нужны YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET)
export YANDEX_WEBMASTER_TOKEN=""
export YANDEX_METRIKA_TOKEN=""
# Опционально, если не кладёте ключ в secrets/mcp/google-search-console-sa.json:
# export GSC_SERVICE_ACCOUNT_KEY_FILE="/абсолютный/путь/к/service-account.json"
# export GSC_OAUTH_CLIENT_FILE="/абсолютный/путь/к/oauth-client-desktop.json"
