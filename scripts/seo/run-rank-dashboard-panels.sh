#!/usr/bin/env bash
# Те же secrets, что MCP (GSC SA + YANDEX_WEBMASTER_TOKEN).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
GSC_OAUTH_DEFAULT="$ROOT/secrets/mcp/gsc-oauth-desktop.json"
if [[ -z "${GSC_OAUTH_CLIENT_FILE:-}" && -f "$GSC_OAUTH_DEFAULT" ]]; then
  export GSC_OAUTH_CLIENT_FILE="$GSC_OAUTH_DEFAULT"
fi
# Как MCP: OAuth от личного Google (доступ к GSC без SA в свойстве).
if [[ "${GSC_FORCE_SERVICE_ACCOUNT:-}" != "1" && -n "${GSC_OAUTH_CLIENT_FILE:-}" && -f "$GSC_OAUTH_CLIENT_FILE" ]]; then
  unset GSC_SERVICE_ACCOUNT_KEY_FILE GSC_SERVICE_ACCOUNT_KEY || true
else
  GSC_KEY="$ROOT/secrets/mcp/google-search-console-sa.json"
  if [[ -z "${GSC_SERVICE_ACCOUNT_KEY_FILE:-}" && -f "$GSC_KEY" ]]; then
    export GSC_SERVICE_ACCOUNT_KEY_FILE="$GSC_KEY"
  fi
fi
exec node "$ROOT/scripts/seo/fetch-rank-dashboard-panels.mjs"
