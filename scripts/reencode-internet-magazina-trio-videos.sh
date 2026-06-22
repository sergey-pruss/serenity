#!/usr/bin/env bash
# Сжатие trio-роликов для /sozdanie-internet-magazina (визуально без потери, CRF 18).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTDIR="$ROOT/video/services/sozdanie-internet-magazina"
SRCDIR="$ROOT/tmp/trio-source"
CRF="${TRIO_WEB_CRF:-18}"
FFMPEG="${FFMPEG:-$(node -e "try{console.log(require('@ffmpeg-installer/ffmpeg').path)}catch(e){process.exit(1)}" 2>/dev/null || command -v ffmpeg)}"
if [[ -z "$FFMPEG" || ! -x "$FFMPEG" ]]; then
  echo "Нужен ffmpeg или npm-пакет @ffmpeg-installer/ffmpeg" >&2
  exit 1
fi
mkdir -p "$OUTDIR" "$SRCDIR"
encode() {
  local name="$1" url="$2"
  local src="$SRCDIR/${name}-source.mp4"
  local out="$OUTDIR/${name}.mp4"
  if [[ ! -f "$src" ]]; then
    echo "Скачиваю $url"
    curl -fsSL "$url" -o "$src"
  fi
  echo "Кодирую $name → $out (CRF $CRF)"
  "$FFMPEG" -y -i "$src" \
    -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    "$out"
  ls -lh "$src" "$out"
  "$FFMPEG" -v error -i "$out" -f null - || { echo "Ошибка: битый $out" >&2; exit 1; }
}
encode trio-desktop "https://serenity.agency/video/production/korporativniy-sait-desktop.mp4"
encode trio-tablet "https://serenity.agency/video/production/korporativniy-sait-tablet.mp4"
encode trio-mobile "https://serenity.agency/video/production/korporativniy-sait-mobile.mp4"
