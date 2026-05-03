#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p "$ROOT/secrets/mcp"
EXAMPLE_ENV="$ROOT/scripts/mcp/env.example.sh"
TARGET_ENV="$ROOT/secrets/mcp/env.sh"
if [[ ! -f "$TARGET_ENV" ]]; then
  cp "$EXAMPLE_ENV" "$TARGET_ENV"
  echo "Создан $TARGET_ENV — вставьте OAuth-токены Яндекса (и при необходимости GSC_*)."
else
  echo "Уже есть $TARGET_ENV — не перезаписываю."
fi
EXAMPLE_MCP="$ROOT/.cursor/mcp.json.example"
TARGET_MCP="$ROOT/.cursor/mcp.json"
if [[ ! -f "$EXAMPLE_MCP" ]]; then
  echo "Нет $EXAMPLE_MCP" >&2
  exit 1
fi
cp -f "$EXAMPLE_MCP" "$TARGET_MCP"
echo "Обновлён $TARGET_MCP из шаблона (токены читаются из secrets/mcp/env.sh)."
echo "Google Search Console: JSON ключа → secrets/mcp/google-search-console-sa.json"
echo "  Подсказки: npm run mcp:gsc-help   email для GSC: npm run mcp:gsc-email"
echo "Перезапустите MCP или окно Cursor."
