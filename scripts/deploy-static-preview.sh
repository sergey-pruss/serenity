#!/usr/bin/env bash
# Совместимость: то же, что deploy-dev.sh (превью static.serenity.agency).
exec "$(cd "$(dirname "$0")" && pwd)/deploy-dev.sh" "$@"
