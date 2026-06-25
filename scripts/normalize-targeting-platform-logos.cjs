#!/usr/bin/env node
/**
 * Подгоняет логотипы площадок под карточки «Наши клиенты» (max 200×50, contain).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const platformsDir = path.join(root, "img", "services", "targeting", "platforms");
const saDir = path.join(root, "_sa", "img", "services", "targeting", "platforms");

const LOGO_MAX_W = 200;
const LOGO_MAX_H = 50;

const FILES = [
  "beeline-prodvizhenie.svg",
  "mts-marketolog.svg",
  "vkontakte.png",
  "sber-ads.svg",
  "megafon-probiznes.svg",
  "oohdesk-dsp.svg",
  "hybrid.svg",
  "mytarget.png",
  "dzen.png",
  "telegram-ads.svg",
];

async function normalizeOne(file) {
  const input = path.join(platformsDir, file);
  if (!fs.existsSync(input)) {
    console.warn("skip (missing):", file);
    return;
  }
  try {
    const ext = path.extname(file).toLowerCase();
    const pipeline = sharp(input).resize({
      width: LOGO_MAX_W,
      height: LOGO_MAX_H,
      fit: "inside",
      withoutEnlargement: false,
    });
    const buf = await (ext === ".png" ? pipeline.png() : pipeline.png()).toBuffer();
    const outName = ext === ".svg" ? file.replace(/\.svg$/i, ".png") : file;
    const targets = [path.join(platformsDir, outName), path.join(saDir, outName)];
    for (const target of targets) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(buf).toFile(target);
    }
    console.log("ok", outName);
  } catch (err) {
    console.warn("skip (error):", file, err.message);
  }
}

async function run() {
  for (const file of FILES) {
    await normalizeOne(file);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
