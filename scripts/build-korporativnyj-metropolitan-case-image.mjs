#!/usr/bin/env node
/**
 * Кадр слайда «Метрополитан» → img/services/korporativnyj_sajt/metropolitan-case-slide.webp
 * Источник: assets/Slice_1-*.png (JPEG внутри) или KORPORATIVNYJ_METRO_CASE_SRC.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "img/services/korporativnyj_sajt");
const outWebp = path.join(outDir, "metropolitan-case-slide.webp");

function findRepoSource(slug) {
  for (const ext of [".webp", ".png", ".jpg", ".jpeg"]) {
    const p = path.join(outDir, `${slug}.source${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveSource() {
  if (process.env.KORPORATIVNYJ_METRO_CASE_SRC) {
    return path.resolve(process.env.KORPORATIVNYJ_METRO_CASE_SRC);
  }
  const repoSrc = findRepoSource("metropolitan-case-slide");
  if (repoSrc) return repoSrc;
  const assetsDir =
    process.env.CURSOR_ASSETS_DIR ||
    path.join(
      process.env.HOME || "",
      ".cursor/projects/Users-tatyana-Desktop-Serenity-Site-New-serenity/assets",
    );
  if (!fs.existsSync(assetsDir)) return null;
  const candidates = fs
    .readdirSync(assetsDir)
    .filter((n) => /^Slice_1/i.test(n) && /\.(png|jpe?g|webp)$/i.test(n));
  const slice = candidates
    .sort((a, b) => {
      const aNew = /Slice_1__1_/i.test(a) ? 1 : 0;
      const bNew = /Slice_1__1_/i.test(b) ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;
      return fs.statSync(path.join(assetsDir, b)).mtimeMs - fs.statSync(path.join(assetsDir, a)).mtimeMs;
    })[0];
  return slice ? path.join(assetsDir, slice) : null;
}

const src = resolveSource();
if (!src || !fs.existsSync(src)) {
  console.error("Источник не найден. Задайте KORPORATIVNYJ_METRO_CASE_SRC=/path/to/image");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();

// Без crop и resize. Источник уже .webp — копируем 1:1, иначе конвертируем в WebP.
let info;
if (/\.webp$/i.test(src)) {
  await fs.promises.copyFile(src, outWebp);
  info = await sharp(outWebp).metadata();
  info = { width: info.width, height: info.height, size: fs.statSync(outWebp).size };
} else {
  info = await sharp(src)
    .webp({ quality: 96, effort: 6, smartSubsample: false })
    .toFile(outWebp);
}

console.log("source:", src, `${meta.width}x${meta.height}`);
console.log("webp:", outWebp, `${info.width}x${info.height}`, `size=${info.size}`);
if ((meta.width || 0) < 1600) {
  console.warn(
    "warn: источник уже 1600px — для слайдера лучше экспорт 1920+ (в чат Cursor часто приходит ~1024).",
  );
}
