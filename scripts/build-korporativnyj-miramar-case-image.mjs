#!/usr/bin/env node
/**
 * Кадр слайда «Miramar» → img/services/korporativnyj_sajt/miramar-case-slide.webp
 * Источник: assets/Frame_10271-*.png или KORPORATIVNYJ_MIRAMAR_CASE_SRC.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "img/services/korporativnyj_sajt");
const outWebp = path.join(outDir, "miramar-case-slide.webp");

function resolveSource() {
  if (process.env.KORPORATIVNYJ_MIRAMAR_CASE_SRC) {
    return path.resolve(process.env.KORPORATIVNYJ_MIRAMAR_CASE_SRC);
  }
  const assetsDir =
    process.env.CURSOR_ASSETS_DIR ||
    path.join(
      process.env.HOME || "",
      ".cursor/projects/Users-tatyana-Desktop-Serenity-Site-New-serenity/assets",
    );
  if (!fs.existsSync(assetsDir)) return null;
  const slice = fs
    .readdirSync(assetsDir)
    .filter((n) => n.startsWith("Frame_10271") && /\.(png|jpe?g|webp)$/i.test(n))
    .sort(
      (a, b) =>
        fs.statSync(path.join(assetsDir, b)).mtimeMs -
        fs.statSync(path.join(assetsDir, a)).mtimeMs,
    )[0];
  return slice ? path.join(assetsDir, slice) : null;
}

const src = resolveSource();
if (!src || !fs.existsSync(src)) {
  console.error(
    "Источник не найден. Задайте KORPORATIVNYJ_MIRAMAR_CASE_SRC=/path/to/image",
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();
const pipeline = sharp(src);
if ((meta.width || 0) > 1920) {
  pipeline.resize({ width: 1920, withoutEnlargement: true });
}

const info = await pipeline
  .webp({ quality: 100, effort: 6, smartSubsample: false })
  .toFile(outWebp);

console.log("source:", src, `${meta.width}x${meta.height}`);
console.log("webp:", outWebp, info);
