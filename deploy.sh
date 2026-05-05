#!/bin/bash
# Совместимость: выкладка статики «как в прод» — см. scripts/deploy-prod.sh
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/scripts/deploy-prod.sh" "$@"
