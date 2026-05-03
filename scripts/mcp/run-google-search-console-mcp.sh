#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
# OAuth Desktop из личного сайта: npm run mcp:gsc-sync-oauth → secrets/mcp/gsc-oauth-desktop.json
GSC_OAUTH_DEFAULT="$ROOT/secrets/mcp/gsc-oauth-desktop.json"
if [[ -z "${GSC_OAUTH_CLIENT_FILE:-}" && -f "$GSC_OAUTH_DEFAULT" ]]; then
  export GSC_OAUTH_CLIENT_FILE="$GSC_OAUTH_DEFAULT"
fi
GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
# Сервисный аккаунт (если OAuth не задан — пакет приоритезирует OAuth при наличии обоих).
if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -f "$GSC_KEY" ]]; then
  export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
fi
if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -z "${GSC_OAUTH_CLIENT_FILE:-}" && -z "${GSC_SERVICE_ACCOUNT_KEY:-}" ]]; then
  echo "GSC MCP: нет учётных данных для Google Search Console API." >&2
  echo "  • OAuth: npm run mcp:gsc-sync-oauth  (копирует JSON из пути в sergey-pruss.github.io/.cursor/mcp.json)" >&2
  echo "  • или ключ SA: $GSC_KEY" >&2
  echo "  • или в secrets/mcp/env.sh: GSC_OAUTH_CLIENT_FILE / GSC_SERVICE_ACCOUNT_KEY_FILE" >&2
  echo "  • Справка: npm run mcp:gsc-help" >&2
  exit 1
fi
exec npx -y mcp-server-google-search-console
