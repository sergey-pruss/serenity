#!/usr/bin/env python3
"""Кадр из героя-видео → img/video__home-hero-poster.jpg (нужен opencv-python-headless)."""
import pathlib
import sys

try:
    import cv2
except ImportError:
    print("Установите: pip install opencv-python-headless", file=sys.stderr)
    sys.exit(1)

root = pathlib.Path(__file__).resolve().parents[1]
src = root / "img" / "video__home-hero.fhls-fastly_skyfire-4398.mp4"
out = root / "img" / "video__home-hero-poster.jpg"

cap = cv2.VideoCapture(str(src))
if not cap.isOpened():
    print("Не открыть видео:", src, file=sys.stderr)
    sys.exit(1)
fps = cap.get(cv2.CAP_PROP_FPS) or 25
cap.set(cv2.CAP_PROP_POS_FRAMES, int(fps * 0.5))
ok, frame = cap.read()
cap.release()
if not ok:
    print("Не прочитать кадр", file=sys.stderr)
    sys.exit(1)
h, w = frame.shape[:2]
maxw = 960
if w > maxw:
    scale = maxw / w
    frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
cv2.imwrite(str(out), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
print("Записано:", out, out.stat().st_size, "байт")
