#!/usr/bin/env bash
# Загружает SLACK_MORNING_* из integrations/slack/secrets.env в GitHub Actions Secrets.
# Использование:
#   cp integrations/slack/secrets.example.env integrations/slack/secrets.env
#   # отредактировать secrets.env (не коммитить)
#   bash scripts/set-slack-morning-github-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${SLACK_MORNING_SECRETS_FILE:-$ROOT/integrations/slack/secrets.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет файла: $ENV_FILE"
  echo "Скопируйте: cp integrations/slack/secrets.example.env integrations/slack/secrets.env"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

missing=()
[[ -z "${SLACK_MORNING_BOT_TOKEN:-}" || "$SLACK_MORNING_BOT_TOKEN" == xoxb-your-bot-token ]] && missing+=(SLACK_MORNING_BOT_TOKEN)
[[ -z "${SLACK_MORNING_CHANNEL_ID:-}" || "$SLACK_MORNING_CHANNEL_ID" == C0123456789 ]] && missing+=(SLACK_MORNING_CHANNEL_ID)
[[ -z "${SLACK_MORNING_LLM_API_KEY:-}" || "$SLACK_MORNING_LLM_API_KEY" == sk-your-openai-key ]] && missing+=(SLACK_MORNING_LLM_API_KEY)

if ((${#missing[@]})); then
  echo "Заполните в $ENV_FILE: ${missing[*]}"
  exit 1
fi

cd "$ROOT"
gh secret set SLACK_MORNING_BOT_TOKEN --body "$SLACK_MORNING_BOT_TOKEN"
gh secret set SLACK_MORNING_CHANNEL_ID --body "$SLACK_MORNING_CHANNEL_ID"
gh secret set SLACK_MORNING_LLM_API_KEY --body "$SLACK_MORNING_LLM_API_KEY"

if [[ -n "${SLACK_MORNING_LLM_MODEL:-}" ]]; then
  gh secret set SLACK_MORNING_LLM_MODEL --body "$SLACK_MORNING_LLM_MODEL"
fi

echo "OK: секреты SLACK_MORNING_* записаны в GitHub Actions."
