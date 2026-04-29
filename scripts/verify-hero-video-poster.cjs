#!/usr/bin/env node
/**
 * Проверяет: лёгкий MP4 героя, data-атрибуты, preload lite, без strip/poster у <video>.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const litePath = path.join(root, "img", "video__home-hero-lite.mp4");

if (!fs.existsSync(litePath)) {
  console.error("Нет лёгкого видео героя:", litePath);
  process.exit(1);
}
const stLite = fs.statSync(litePath);
if (stLite.size < 50_000) {
  console.error("Лёгкое видео подозрительно маленькое (байт):", stLite.size);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
if (html.includes("hero-video-strip")) {
  console.error("В index.html не должно быть hero-video-strip");
  process.exit(1);
}
if (html.includes('poster="img/video__home-hero-poster.jpg"')) {
  console.error("У героя не должно быть poster (тёмный фон → сразу lite)");
  process.exit(1);
}
if (!html.includes('rel="preload" as="video" href="img/video__home-hero-lite.mp4"')) {
  console.error("В index.html нет preload лёгкого видео героя");
  process.exit(1);
}
if (!html.includes('data-hero-full="img/video__home-hero.fhls-fastly_skyfire-4398.mp4"')) {
  console.error("В index.html нет data-hero-full у героя");
  process.exit(1);
}
if (!html.includes('data-hero-lite="img/video__home-hero-lite.mp4"')) {
  console.error("В index.html нет data-hero-lite у героя");
  process.exit(1);
}
if (!html.includes('src="img/video__home-hero-lite.mp4"')) {
  console.error("В index.html нет <source> с лёгким видео героя");
  process.exit(1);
}
if (!html.includes('class="video-block is-loading"')) {
  console.error("В index.html у героя нет начального класса is-loading (ранний тёмный плейсхолдер)");
  process.exit(1);
}

console.log("hero lite + preload OK (без strip/poster у video)");
process.exit(0);
