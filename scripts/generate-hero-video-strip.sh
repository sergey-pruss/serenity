#!/usr/bin/env bash
# Три JPEG для цикла загрузки героя (кадры из полного ролика).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="$ROOT/img/video__home-hero.fhls-fastly_skyfire-4398.mp4"
FFMPEG="${FFMPEG:-$(command -v ffmpeg || true)}"
if [[ -z "$FFMPEG" ]]; then
  echo "Нужен ffmpeg в PATH (brew install ffmpeg)" >&2
  exit 1
fi
vf="scale=854:-2:flags=lanczos"
"$FFMPEG" -y -ss 0.6 -i "$IN" -vf "$vf" -vframes 1 -q:v 80 "$ROOT/img/video__home-hero-strip-1.jpg"
"$FFMPEG" -y -ss 7 -i "$IN" -vf "$vf" -vframes 1 -q:v 80 "$ROOT/img/video__home-hero-strip-2.jpg"
"$FFMPEG" -y -ss 14 -i "$IN" -vf "$vf" -vframes 1 -q:v 80 "$ROOT/img/video__home-hero-strip-3.jpg"
ls -la "$ROOT"/img/video__home-hero-strip-*.jpg
