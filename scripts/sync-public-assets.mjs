#!/usr/bin/env node
/**
 * Копирует локальные ассеты из `assets/` в `public/` для Astro (`/img/...` в браузере).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcImg = path.join(root, "assets", "img");
const dstImg = path.join(root, "public", "img");

if (!fs.existsSync(srcImg)) {
  console.warn("sync-public-assets: нет папки", srcImg);
  process.exit(0);
}

fs.mkdirSync(dstImg, { recursive: true });
for (const name of fs.readdirSync(srcImg)) {
  const from = path.join(srcImg, name);
  if (!fs.statSync(from).isFile()) continue;
  fs.copyFileSync(from, path.join(dstImg, name));
}
console.log("OK: public/img ← assets/img");

const svgFrom = path.join(root, "publish", "svgset.svg");
const svgTo = path.join(root, "public", "svgset.svg");
if (fs.existsSync(svgFrom) && fs.statSync(svgFrom).isFile() && fs.statSync(svgFrom).size > 0) {
  fs.mkdirSync(path.dirname(svgTo), { recursive: true });
  fs.copyFileSync(svgFrom, svgTo);
  console.log("OK: public/svgset.svg ← publish/svgset.svg");
}
