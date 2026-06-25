#!/usr/bin/env node
/** OOHDesk: обрезка лишнего прозрачного поля справа для центрирования в карточке. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const outDirs = [
  path.join(root, "img", "services", "targeting", "platforms"),
  path.join(root, "_sa", "img", "services", "targeting", "platforms"),
];

async function run() {
  const src = path.join(outDirs[0], "oohdesk-dsp.png");
  const buf = await sharp(src).trim().png().toBuffer();

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(buf).toFile(path.join(dir, "oohdesk-dsp.png"));
  }

  console.log("patch-oohdesk-dsp-platform-logo: ok", await sharp(buf).metadata());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
