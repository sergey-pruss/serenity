#!/usr/bin/env bash
#
# Оптимальный размер при сохранении нормального визуального качества для веба.
#
# Строго «без потери качества» в смысле бита в бите возможно только lossless (-qp 0 у x264),
# файл будет очень большим — для hero не используем.
#
# Для страницы подходит режим «прозрачный» для глаза:
#   libx264 + CRF 17–19 + preset slow + yuv420p + faststart (moov в начале для быстрого старта по сети).
#
# При необходимости ещё уменьшить файл без явной порчи картинки — поднять CRF до 20–22 (файл меньше).
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${1:-$ROOT/img/video__home-hero.fhls-fastly_skyfire-4398.mp4}"
OUT="${2:-$ROOT/img/video__home-hero-web.mp4}"
CRF="${HERO_WEB_CRF:-18}"
FFMPEG="${FFMPEG:-$(command -v ffmpeg || true)}"
if [[ -z "$FFMPEG" ]]; then
  echo "Нужен ffmpeg в PATH (brew install ffmpeg)" >&2
  exit 1
fi
if [[ ! -f "$IN" ]]; then
  echo "Нет входного файла: $IN" >&2
  exit 1
fi
exec "$FFMPEG" -y -i "$IN" \
  -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  "$OUT"
