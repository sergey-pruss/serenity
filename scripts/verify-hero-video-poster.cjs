#!/usr/bin/env node
/**
 * Проверяет: web MP4 героя, слой обложки hero-video-poster-layer и отложенную загрузку hero video.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const webPath = path.join(root, "img", "video__home-hero-web.mp4");
const posterPath = path.join(root, "img", "video__home-hero-poster.jpg");

if (!fs.existsSync(webPath)) {
  console.error("Нет файла героя (web):", webPath);
  process.exit(1);
}
const stWeb = fs.statSync(webPath);
if (stWeb.size < 80_000) {
  console.error("Видео героя подозрительно маленькое (байт):", stWeb.size);
  process.exit(1);
}

if (!fs.existsSync(posterPath)) {
  console.error("Нет постера героя:", posterPath);
  process.exit(1);
}
const stPoster = fs.statSync(posterPath);
if (stPoster.size < 1500) {
  console.error("Постер слишком маленький (байт):", stPoster.size);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
if (html.includes("hero-video-strip")) {
  console.error("В index.html не должно быть hero-video-strip");
  process.exit(1);
}
if (!html.includes('class="hero-video-poster-layer"')) {
  console.error("В index.html нет слоя hero-video-poster-layer (обложка поверх фона)");
  process.exit(1);
}
if (!html.includes('src="img/video__home-hero-poster.jpg"')) {
  console.error("В index.html нет img обложки video__home-hero-poster.jpg");
  process.exit(1);
}
if (html.includes('poster="img/video__home-hero-poster.jpg"')) {
  console.error("Уберите атрибут poster у <video> — обложка через hero-video-poster-layer");
  process.exit(1);
}
if (!html.includes('rel="preload" as="image" href="img/video__home-hero-poster.jpg"')) {
  console.error("В index.html нет preload постера героя");
  process.exit(1);
}
if (html.includes('rel="preload" as="video" href="img/video__home-hero-web.mp4"')) {
  console.error("Уберите preload as=video у hero — видео должно грузиться отложенно");
  process.exit(1);
}
if (!html.includes('data-src="img/video__home-hero-web.mp4"')) {
  console.error("В index.html у hero нет <source data-src> с video__home-hero-web.mp4");
  process.exit(1);
}
if (html.includes("data-hero-lite")) {
  console.error("Уберите data-hero-lite — один файл без lite→full");
  process.exit(1);
}
if (!html.includes('class="video-block is-loading"')) {
  console.error("В index.html у героя нет начального класса is-loading");
  process.exit(1);
}

console.log("hero web mp4 + poster layer OK");
process.exit(0);
