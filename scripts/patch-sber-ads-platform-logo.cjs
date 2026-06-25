#!/usr/bin/env node
/**
 * SberAds: логотип SBER (иконка + текст) полностью белым + « ADS».
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const logoSrc =
  process.env.SBER_LOGO_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_sber-logo-eng-a75fe1f0-6d1d-471f-9a86-4ce4b5a7d294.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const ADS_TEXT = "ADS";
const GAP = 12;
const LOGO_MAX_H = 35;

async function toAllWhite(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 40) {
      data[i + 3] = 0;
      continue;
    }
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function getTextBand(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const startX = Math.floor(info.width * 0.28);
  let minY = info.height;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = startX; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] > 0) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minY, maxY, height: maxY - minY + 1 };
}

async function run() {
  const sberBuf = await toAllWhite(logoSrc);
  const sberTrimmed = await sharp(sberBuf).trim().png().toBuffer();
  const sberMeta = await sharp(sberTrimmed).metadata();
  const rowH = sberMeta.height;
  const textBand = await getTextBand(sberTrimmed);

  const adsSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="${rowH}">
      <text x="0" y="${textBand.maxY}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${textBand.height}" font-weight="700" letter-spacing="0.04em">${ADS_TEXT}</text>
    </svg>`,
  );
  const adsBuf = await sharp(adsSvg)
    .trim()
    .resize({ height: textBand.height })
    .png()
    .toBuffer();
  const adsMeta = await sharp(adsBuf).metadata();

  const rowW = sberMeta.width + GAP + adsMeta.width;
  const rowBuf = await sharp({
    create: {
      width: rowW,
      height: rowH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: sberTrimmed, left: 0, top: 0 },
      { input: adsBuf, left: sberMeta.width + GAP, top: textBand.minY },
    ])
    .png()
    .toBuffer();

  const finalBuf = await sharp(rowBuf)
    .resize({ height: LOGO_MAX_H, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "sber-ads.png"));
  }

  console.log("patch-sber-ads-platform-logo: ok", await sharp(finalBuf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
