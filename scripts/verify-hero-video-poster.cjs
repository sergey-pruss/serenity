#!/usr/bin/env node
/**
 * Проверяет: постер героя на диске и ссылка в собранном index.html.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const posterPath = path.join(root, "img", "video__home-hero-poster.jpg");
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

const html = fs.readFileSync(indexPath, "utf8");
if (!html.includes(needle)) {
  console.error("В index.html нет атрибута poster у героя:", needle);
  process.exit(1);
}
if (!html.includes('rel="preload" as="image" href="img/video__home-hero-poster.jpg"')) {
  console.error("В index.html нет preload постера героя");
  process.exit(1);
}

console.log("hero poster OK");
process.exit(0);
