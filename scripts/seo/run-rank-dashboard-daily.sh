#!/usr/bin/env bash
# Ежедневный съём: Яндекс + Google + retry + сборка + dev + Telegram.
# Cron на dev-сервере (9:00 MSK) или launchd на Mac — предпочтительно только сервер.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/secrets/mcp/env.sh"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

NOTIFY_ENV="$ROOT/secrets/deploy-notify.env"
if [[ -f "$NOTIFY_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$NOTIFY_ENV"
  set +a
fi

export RANK_CHECK_DATE="${RANK_CHECK_DATE:-$(date +%F)}"
export RANK_FETCH_ONLY_MISSING="${RANK_FETCH_ONLY_MISSING:-1}"
export RANK_COMPLETENESS_MAX_ROUNDS="${RANK_COMPLETENESS_MAX_ROUNDS:-2}"

LOG_DIR="${SERENITY_RANK_LOG_DIR:-$ROOT/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/rank-dashboard-$(date +%Y-%m-%d).log"

ON_SERVER=0
if [[ "${SERENITY_SEO_ON_SERVER:-}" == "1" ]] || [[ -w "${SERENITY_STATIC_DEV_ROOT:-/var/www/static-dev}/docs" ]]; then
  ON_SERVER=1
fi

# Сборку/публикацию — один раз в конце daily, не после каждого fetch
export RANK_DASHBOARD_SKIP_DEV_DEPLOY=1

run_retry() {
  local extra_env="${1:-}"
  # shellcheck disable=SC2086
  env $extra_env node "$ROOT/scripts/seo/retry-rank-dashboard-errors.mjs"
}

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') host=$(hostname) on_server=$ON_SERVER date=$RANK_CHECK_DATE ==="
  echo ""
  echo "--- Yandex (XMLRiver) ---"
  node "$ROOT/scripts/seo/fetch-rank-dashboard-yandex-api.mjs" || true
  echo ""
  echo "--- Google (XMLRiver) ---"
  node "$ROOT/scripts/seo/fetch-rank-dashboard-google-api.mjs" || true
  echo ""
  echo "--- Retry (все фазы) ---"
  RETRY_EXIT=0
  run_retry || RETRY_EXIT=$?

  ROUND=1
  while [[ "$RETRY_EXIT" -ne 0 ]] && [[ "$ROUND" -lt "$RANK_COMPLETENESS_MAX_ROUNDS" ]]; do
    ROUND=$((ROUND + 1))
    echo ""
    echo "--- Retry раунд $ROUND (fill + regression) ---"
    RETRY_EXIT=0
    run_retry "RANK_RETRY_ONLY_FILL_REGRESSION=1 RANK_RETRY_SKIP_VERIFY=1 RANK_RETRY_SKIP_PANEL_VERIFY=1" || RETRY_EXIT=$?
  done

  if [[ -n "${RUCAPTCHA_API_KEY:-}${CAPTCHA_API_KEY:-}${TWO_CAPTCHA_API_KEY:-}" ]]; then
    echo ""
    echo "--- Disputed SERP (Playwright + RuCaptcha) ---"
    node "$ROOT/scripts/seo/fetch-rank-dashboard-disputed-serp.mjs" || true
  else
    echo ""
    echo "--- Disputed SERP: пропуск (нет RUCAPTCHA_API_KEY / CAPTCHA_API_KEY) ---"
  fi

  MATRIX_OK=1
  if [[ "$RETRY_EXIT" -ne 0 ]]; then
    MATRIX_OK=0
    echo ""
    echo "⚠ Матрица SERP за $RANK_CHECK_DATE неполная — build/publish пропущены (RANK_ALLOW_INCOMPLETE=1 чтобы игнорировать)."
  fi

  if [[ "$MATRIX_OK" == "1" ]] || [[ "${RANK_ALLOW_INCOMPLETE:-}" == "1" ]]; then
    echo ""
    echo "--- Build dashboard ---"
    node "$ROOT/scripts/seo/build-rank-dashboard.mjs" || true
    echo ""
    echo "--- Publish dev ---"
    if [[ "$ON_SERVER" == "1" ]]; then
      bash "$ROOT/scripts/seo/publish-rank-dashboard-static-dev-local.sh" || true
    else
      bash "$ROOT/scripts/deploy-dev-rank-dashboard.sh" || true
    fi
  fi

  echo ""
  echo "=== done $(date '+%H:%M:%S') retry_exit=$RETRY_EXIT matrix_ok=$MATRIX_OK ==="
} 2>&1 | tee -a "$LOG_FILE"

node "$ROOT/scripts/seo/notify-rank-dashboard-telegram.mjs" 2>&1 | tee -a "$LOG_FILE"
