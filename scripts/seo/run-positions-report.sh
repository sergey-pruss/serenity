#!/usr/bin/env bash
# Подхватывает те же переменные, что и MCP-лаунчеры (secrets/mcp/env.sh).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -f "$GSC_KEY" ]]; then
  export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
fi
exec node "$ROOT/scripts/seo/fetch-positions-report.mjs"
