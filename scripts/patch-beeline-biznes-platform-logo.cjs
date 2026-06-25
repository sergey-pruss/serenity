#!/usr/bin/env node
/**
 * билайн бизнес: иконка + «билайн» белым + «бизнес» жёлтым.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const logoSrc =
  process.env.BEELINE_LOGO_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-32fdcefd-bd06-4709-8801-7685bb10e6ad.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const LOGO_MAX_H = 35;

async function stripDarkBackground(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 40) data[i + 3] = 0;
    else data[i + 3] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function run() {
  const logoBuf = await stripDarkBackground(logoSrc);
  const finalBuf = await sharp(logoBuf)
    .trim()
    .resize({ height: LOGO_MAX_H, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "beeline-prodvizhenie.png"));
  }

  console.log("patch-beeline-biznes-platform-logo: ok", await sharp(finalBuf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
