#!/usr/bin/env bash
# Лёгкий герой для первого кадра на медленных каналах: -movflags +faststart обязателен.
# Ещё меньше файл: заменить scale на -2:360 и/или -crf 32 (качество ниже).
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
  -vf "scale=-2:480:flags=lanczos" \
  -c:v libx264 -preset fast -crf 29 -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  "$OUT"
