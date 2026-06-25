#!/usr/bin/env node
/**
 * Telegram Ads: иконка Telegram + белый текст «Telegram Ads».
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const logoSrc =
  process.env.TELEGRAM_LOGO_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Telegram_2019_Logo-d75cf956-3610-40e6-b558-6e28ea53c78d.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const ICON_H = 35;
const TEXT = "Telegram Ads";
const TEXT_FONT_SIZE = 19;
const TEXT_CANVAS_H = 35;
const TEXT_Y = 26;
const GAP = 10;
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
  const iconBuf = await stripDarkBackground(logoSrc);
  const iconTrimmed = await sharp(iconBuf).trim().png().toBuffer();
  const iconScaled = await sharp(iconTrimmed).resize({ height: ICON_H }).png().toBuffer();
  const iconW = (await sharp(iconScaled).metadata()).width;

  const textSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${TEXT_CANVAS_H}">
      <text x="0" y="${TEXT_Y}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${TEXT_FONT_SIZE}" font-weight="700" letter-spacing="0.01em">${TEXT}</text>
    </svg>`,
  );
  const textBuf = await sharp(textSvg).trim().png().toBuffer();
  const textMeta = await sharp(textBuf).metadata();

  const rowH = ICON_H;
  const rowW = iconW + GAP + textMeta.width;
  const rowBuf = await sharp({
    create: {
      width: rowW,
      height: rowH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: iconScaled, left: 0, top: 0 },
      {
        input: textBuf,
        left: iconW + GAP,
        top: Math.round((rowH - textMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  const finalBuf = await sharp(rowBuf)
    .resize({ height: LOGO_MAX_H, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "telegram-ads.png"));
  }

  console.log("patch-telegram-ads-platform-logo: ok", await sharp(finalBuf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
