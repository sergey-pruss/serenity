#!/usr/bin/env node
/**
 * Toofli /targeting: баннер пользователя 906×515 как есть + cover-фон для blur.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const userAssets = [
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Group_1597880945-1d299491-94f3-44be-b1f2-9213ef5f3b0c.png",
  ),
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Users-Projects-serenity/assets/c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_______-3d58a5ee-4443-4691-b78c-5f7b68a8fa04.png",
  ),
];
const bundledSrc = path.join(root, "img/services/smm_marketing/cases/toofli-slide-source.png");
const outDir = path.join(root, "img/services/smm_marketing/cases");
const outProduct = path.join(outDir, "toofli-product.png");
const outBg = path.join(outDir, "toofli-bg.png");
const outMeta = path.join(outDir, "toofli-product-meta.json");
const saDir = path.join(root, "_sa/img/services/smm_marketing/cases");

const BG_W = 1440;
const BG_H = 810;

function pickInput() {
  for (const userAsset of userAssets) {
    if (fs.existsSync(userAsset)) return userAsset;
  }
  if (fs.existsSync(bundledSrc)) return bundledSrc;
  throw new Error("patch-toofli-product-image: user banner not found");
}

async function main() {
  const input = pickInput();
  fs.mkdirSync(path.dirname(bundledSrc), { recursive: true });
  fs.copyFileSync(input, bundledSrc);

  const productMeta = await sharp(bundledSrc).metadata();
  const product = await sharp(bundledSrc).png().toBuffer();
  const bg = await sharp(bundledSrc)
    .resize(BG_W, BG_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(saDir, { recursive: true });

  await sharp(product).toFile(outProduct);
  await sharp(bg).toFile(outBg);
  await sharp(product).toFile(path.join(saDir, "toofli-product.png"));
  await sharp(bg).toFile(path.join(saDir, "toofli-bg.png"));

  const dimensions = {
    width: productMeta.width,
    height: productMeta.height,
  };
  fs.writeFileSync(outMeta, `${JSON.stringify(dimensions, null, 2)}\n`);

  console.log("patch-toofli-product-image: ok", outProduct, dimensions, "from", input);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
