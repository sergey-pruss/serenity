#!/usr/bin/env bash
# Готовит img/video__home-hero-poster.jpg из вашего PNG/JPEG кадра (качество для градиентов + размер под ретину блока героя).
# Использование: bash scripts/optimize-hero-poster.sh путь/к/скрину.png
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${1:?Укажите файл кадра}"
OUT="$ROOT/img/video__home-hero-poster.jpg"
FFMPEG="${FFMPEG:-$(command -v ffmpeg || true)}"
if [[ -z "$FFMPEG" ]]; then
  echo "Нужен ffmpeg в PATH" >&2
  exit 1
fi
[[ -f "$IN" ]] || { echo "Нет файла: $IN" >&2; exit 1; }

exec "$FFMPEG" -y -i "$IN" \
  -vf "scale=min(1812\\,iw):-2:flags=lanczos" \
  -frames:v 1 \
  -update 1 \
  -q:v 2 \
  -f image2 \
  "$OUT"
