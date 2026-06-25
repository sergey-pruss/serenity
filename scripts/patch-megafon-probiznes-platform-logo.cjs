#!/usr/bin/env node
/**
 * МегаФон ПроБизнес: логотип МЕГАФОН + «Бизнес» тем же зелёным.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const logoSrc =
  process.env.MEGAFON_LOGO_SRC ||
  "C:/Users/Татьяна/.cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_MegaFon_logo_Russian-07dbd6cd-953f-46f3-892b-29a8ff727819.png";

const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

const MEGAFON_GREEN = "#00B956";
const TEXT = "Бизнес";
const TEXT_FONT_SIZE = 27;
const TEXT_CANVAS_H = 54;
/** Верх и высота букв «МЕГАФОН» в исходном логотипе 300×54 */
const MEGAFON_TEXT_TOP = 10;
const MEGAFON_TEXT_HEIGHT = 32;
const GAP = 14;
const LOGO_MAX_W = 200;
const LOGO_MAX_H = 35;

async function stripBlackBackground(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 45) data[i + 3] = 0;
    else data[i + 3] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function run() {
  const logoBuf = await stripBlackBackground(logoSrc);
  const megafonBuf = await sharp(logoBuf).trim().png().toBuffer();
  const megafonMeta = await sharp(megafonBuf).metadata();
  const rowH = megafonMeta.height || TEXT_CANVAS_H;
  const megafonW = megafonMeta.width;
  const textProbeSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${rowH}">
      <text x="0" y="${MEGAFON_TEXT_TOP + MEGAFON_TEXT_HEIGHT - 4}" fill="${MEGAFON_GREEN}" font-family="Arial, Helvetica, sans-serif" font-size="${TEXT_FONT_SIZE}" font-weight="700" letter-spacing="0.01em">${TEXT}</text>
    </svg>`,
  );
  const textScaled = await sharp(textProbeSvg)
    .trim()
    .resize({ height: MEGAFON_TEXT_HEIGHT })
    .png()
    .toBuffer();
  const textW = (await sharp(textScaled).metadata()).width;

  const rowW = megafonW + GAP + textW;
  const rowBuf = await sharp({
    create: {
      width: rowW,
      height: rowH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: megafonBuf, left: 0, top: 0 },
      { input: textScaled, left: megafonW + GAP, top: MEGAFON_TEXT_TOP },
    ])
    .png()
    .toBuffer();

  const finalBuf = await sharp(rowBuf)
    .resize({ height: LOGO_MAX_H, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(finalBuf).toFile(path.join(dir, "megafon-probiznes.png"));
  }

  console.log("patch-megafon-probiznes-platform-logo: ok", await sharp(finalBuf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
