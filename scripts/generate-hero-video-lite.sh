#!/usr/bin/env bash
# Лёгкий герой: 360p + агрессивный CRF для медленных каналов.
# Оригинал и lite должны быть одним и тем же роликом (одинаковая длительность) — тогда currentTime совпадает при смене на full.
# -movflags +faststart — moov в начале, быстрый старт по сети.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="$ROOT/img/video__home-hero.fhls-fastly_skyfire-4398.mp4"
OUT="$ROOT/img/video__home-hero-lite.mp4"
FFMPEG="${FFMPEG:-$(command -v ffmpeg || true)}"
if [[ -z "$FFMPEG" ]]; then
  echo "Нужен ffmpeg в PATH (brew install ffmpeg)" >&2
  exit 1
fi
exec "$FFMPEG" -y -i "$IN" \
  -vf "scale=-2:360:flags=lanczos" \
  -c:v libx264 -preset veryfast -crf 32 -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  "$OUT"
