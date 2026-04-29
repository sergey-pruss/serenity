#!/usr/bin/env node
/**
 * Проверяет: постер, лёгкий MP4 героя, data-атрибуты и разметку в собранном index.html.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const posterPath = path.join(root, "img", "video__home-hero-poster.jpg");
const litePath = path.join(root, "img", "video__home-hero-lite.mp4");
const needle = 'poster="img/video__home-hero-poster.jpg"';

if (!fs.existsSync(posterPath)) {
  console.error("Нет файла постера:", posterPath);
  process.exit(1);
}
const st = fs.statSync(posterPath);
if (st.size < 2000) {
  console.error("Постер слишком маленький (байт):", st.size);
  process.exit(1);
}

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
if (!html.includes(needle)) {
  console.error("В index.html нет атрибута poster у героя:", needle);
  process.exit(1);
}
if (!html.includes('rel="preload" as="image" href="img/video__home-hero-poster.jpg"')) {
  console.error("В index.html нет preload постера героя");
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
if (!html.includes('class="hero-video-strip"')) {
  console.error("В index.html нет блока hero-video-strip");
  process.exit(1);
}
if (!html.includes('rel="preload" as="image" href="img/video__home-hero-strip-1.jpg"')) {
  console.error("В index.html нет preload первого кадра strip");
  process.exit(1);
}
for (const n of [1, 2, 3]) {
  const p = path.join(root, "img", `video__home-hero-strip-${n}.jpg`);
  if (!fs.existsSync(p)) {
    console.error("Нет файла strip:", p);
    process.exit(1);
  }
  if (fs.statSync(p).size < 1500) {
    console.error("Strip слишком маленький:", p);
    process.exit(1);
  }
}

console.log("hero poster + lite + strip OK");
process.exit(0);
