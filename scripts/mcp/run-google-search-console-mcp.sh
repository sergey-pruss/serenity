#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
if [[ -f "$GSC_KEY" ]]; then
  export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
fi
exec npx -y mcp-server-google-search-console
