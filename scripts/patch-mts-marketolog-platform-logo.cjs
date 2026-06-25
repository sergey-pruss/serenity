#!/usr/bin/env node
/**
 * МТС Маркетолог: иконка МТС + белый текст «МАРКЕТОЛОГ» для карточек площадок.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const iconSrc =
  process.env.MTS_ICON_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_______________2026-06-25_194634-9af6572c-6876-425e-a5ad-801fb63da7de.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const ICON_H = 48;
const TEXT_FONT_SIZE = 19;
const TEXT_CANVAS_H = 28;
const TEXT_Y = 22;
const GAP = 10;
const LOGO_MAX_W = 200;
const LOGO_MAX_H = 50;

async function extractRedSquare(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 150 && g < 80 && b < 80) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return sharp(src).png().toBuffer();
  }

  return sharp(src)
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png()
    .toBuffer();
}

async function run() {
  const squareBuf = await extractRedSquare(iconSrc);
  const iconBuf = await sharp(squareBuf).resize({ height: ICON_H }).png().toBuffer();
  const iconW = (await sharp(iconBuf).metadata()).width;

  const textSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="${TEXT_CANVAS_H}">
      <text x="0" y="${TEXT_Y}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${TEXT_FONT_SIZE}" font-weight="700" letter-spacing="0.06em">МАРКЕТОЛОГ</text>
    </svg>`,
  );
  const textBuf = await sharp(textSvg).trim().png().toBuffer();
  const textMeta = await sharp(textBuf).metadata();

  const rowW = iconW + GAP + textMeta.width;
  const rowH = ICON_H;
  const rowBuf = await sharp({
    create: {
      width: rowW,
      height: rowH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: iconBuf, left: 0, top: 0 },
      {
        input: textBuf,
        left: iconW + GAP,
        top: Math.round((rowH - textMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  const finalBuf = await sharp(rowBuf)
    .resize({
      width: LOGO_MAX_W,
      height: LOGO_MAX_H,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "mts-marketolog.png"));
  }

  const meta = await sharp(finalBuf).metadata();
  console.log("patch-mts-marketolog-platform-logo: ok", meta);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
