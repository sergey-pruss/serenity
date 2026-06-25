#!/usr/bin/env node
/**
 * myTarget: красная иконка + «mytarget» белым текстом.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const logoSrc =
  process.env.MYTARGET_LOGO_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-af0f3359-dfab-43ab-8126-508c5dbbc7d0.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const LOGO_MAX_H = 35;

function isRed(r, g, b) {
  return r > 140 && g < 110 && b < 110 && r > g + 40 && r > b + 40;
}

async function toWhiteOnTransparent(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > 245) {
      data[i + 3] = 0;
      continue;
    }

    if (isRed(r, g, b)) {
      data[i + 3] = 255;
      continue;
    }

    const alpha = Math.min(255, Math.round((255 - lum) * 1.35));
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function run() {
  const logoBuf = await toWhiteOnTransparent(logoSrc);
  const finalBuf = await sharp(logoBuf)
    .trim()
    .resize({ height: LOGO_MAX_H, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "mytarget.png"));
  }

  console.log("patch-mytarget-platform-logo: ok", await sharp(finalBuf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
