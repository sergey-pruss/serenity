#!/usr/bin/env node
/**
 * Кадр слайда «Сытные угодья» → img/services/korporativnyj_sajt/sytnie-ugodiya-case-slide.webp
 * 1920×1080 cover — как miramar/metropolitan для блока .cases-block__swiper-slide-contant (max-height 515px).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "img/services/korporativnyj_sajt");
const slug = "sytnie-ugodiya-case-slide";
const outWebp = path.join(outDir, `${slug}.webp`);
const TARGET_W = 1920;
const TARGET_H = 1080;

function findRepoSource() {
  if (process.env.KORPORATIVNYJ_SYTNIE_UGODIYA_CASE_SRC) {
    return path.resolve(process.env.KORPORATIVNYJ_SYTNIE_UGODIYA_CASE_SRC);
  }
  for (const ext of [".webp", ".png", ".jpg", ".jpeg"]) {
    const p = path.join(outDir, `${slug}.source${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const src = findRepoSource();
if (!src || !fs.existsSync(src)) {
  console.error(
    "Источник не найден. Положите sytnie-ugodiya-case-slide.source.webp или задайте KORPORATIVNYJ_SYTNIE_UGODIYA_CASE_SRC.",
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();
const info = await sharp(src)
  .resize(TARGET_W, TARGET_H, { fit: "cover", position: "centre" })
  .webp({ quality: 96, effort: 6, smartSubsample: false })
  .toFile(outWebp);

console.log("source:", src, `${meta.width}x${meta.height}`);
console.log("webp:", outWebp, `${info.width}x${info.height}`, `size=${info.size}`);
