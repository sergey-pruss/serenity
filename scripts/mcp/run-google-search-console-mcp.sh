#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

GSC_OAUTH_DEFAULT="$ROOT/secrets/mcp/gsc-oauth-desktop.json"
if [[ -z "${GSC_OAUTH_CLIENT_FILE:-}" && -f "$GSC_OAUTH_DEFAULT" ]]; then
  export GSC_OAUTH_CLIENT_FILE="$GSC_OAUTH_DEFAULT"
fi

# Обход без SA в Search Console: OAuth Desktop — запросы API от вашего Google.
# Если OAuth задан и файл есть, не передаём SA (иначе пакет/ключи могут дать 403 при отсутствии SA в GSC).
if [[ "${GSC_FORCE_SERVICE_ACCOUNT:-}" != "1" && -n "${GSC_OAUTH_CLIENT_FILE:-}" && -f "$GSC_OAUTH_CLIENT_FILE" ]]; then
  unset GSC_SERVICE_ACCOUNT_KEY_FILE GSC_SERVICE_ACCOUNT_KEY || true
else
  GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
  if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -f "$GSC_KEY" ]]; then
    export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
  fi
fi

if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -z "${GSC_OAUTH_CLIENT_FILE:-}" && -z "${GSC_SERVICE_ACCOUNT_KEY:-}" ]]; then
  echo "GSC MCP: нет учётных данных для Google Search Console API." >&2
  echo "  Рекомендуется OAuth (без добавления SA в GSC):" >&2
  echo "    • Скачайте JSON клиента «Desktop» в Cloud Console → Credentials" >&2
  echo "    • npm run mcp:gsc-install-oauth -- /путь/к/client_secret_….json" >&2
  echo "    • или npm run mcp:gsc-sync-oauth  (копирует из sergey-pruss.github.io/.cursor/mcp.json)" >&2
  echo "  Альтернатива — ключ SA: $ROOT/secrets/mcp/google-search-console-sa.json + пользователь в GSC" >&2
  echo "  • env.sh: GSC_OAUTH_CLIENT_FILE / GSC_SERVICE_ACCOUNT_KEY_FILE" >&2
  echo "  • Справка: npm run mcp:gsc-help" >&2
  exit 1
fi
exec npx -y mcp-server-google-search-console
