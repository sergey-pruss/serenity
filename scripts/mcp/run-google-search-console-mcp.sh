#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
# Если в env.sh не задан путь — подставляем стандартный файл ключа в репозитории.
if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -f "$GSC_KEY" ]]; then
  export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
fi
if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -z "${GSC_OAUTH_CLIENT_FILE:-}" && -z "${GSC_SERVICE_ACCOUNT_KEY:-}" ]]; then
  echo "GSC MCP: нет учётных данных для Google Search Console API." >&2
  echo "  • Положите ключ: $GSC_KEY" >&2
  echo "  • или в secrets/mcp/env.sh: GSC_SERVICE_ACCOUNT_KEY_FILE=… / GSC_OAUTH_CLIENT_FILE=…" >&2
  echo "  • Пошаговая инструкция: npm run mcp:gsc-help" >&2
  exit 1
fi
exec npx -y mcp-server-google-search-console
