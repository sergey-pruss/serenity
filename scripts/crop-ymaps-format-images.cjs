#!/usr/bin/env node
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "tmp", "ymaps-formats-src");
const destDir = path.join(root, "img/services/prodvizhenie-yandex-karty-2gis/formats");
const REF_W = 1488;
const REF_H = 1224;

const sources = [
  "geocontext-2gis.png",
  "branded-ya-maps.png",
  "priority-yandex-maps.png",
  "showcase-products.png",
  "media-navigator-billboard.png",
  "residential-3d-yandex-maps.png",
];

// Эталон CDEK: карточка без полос карты слева/сверху.
const trims = {
  "geocontext-2gis.png": { left: 0, top: 0 },
  "branded-ya-maps.png": { left: 14, top: 14 },
  "priority-yandex-maps.png": { left: 25, top: 29 },
  // Boca «Витрина»: убрать тонкую белую полосу снизу скрина.
  "showcase-products.png": { left: 0, top: 0, bottom: 5 },
  "media-navigator-billboard.png": { left: 0, top: 0 },
  "residential-3d-yandex-maps.png": { left: 0, top: 0 },
};

const resizePosition = {
  "media-navigator-billboard.png": "top",
};

// Уже обрезано вручную — только масштаб, без cover.
const fitFill = new Set([
  "showcase-products.png",
  "residential-3d-yandex-maps.png",
]);

fs.mkdirSync(destDir, { recursive: true });

async function process(name) {
  const src = path.join(srcDir, name);
  const dest = path.join(destDir, name);
  const meta = await sharp(src).metadata();
  const trim = trims[name];
  const left = trim.left || 0;
  const top = trim.top || 0;
  const right = trim.right || 0;
  const bottom = trim.bottom || 0;
  const width = (trim.splitX ?? meta.width - right) - left;
  const height = meta.height - top - bottom;
  let pipeline = sharp(src).extract({ left, top, width, height });
  if (fitFill.has(name)) {
    pipeline = pipeline.resize(REF_W, REF_H);
  } else {
    pipeline = pipeline.resize(REF_W, REF_H, {
      fit: "cover",
      position: resizePosition[name] || "left top",
    });
  }
  await pipeline.png({ compressionLevel: 9 }).toFile(dest);
  const splitNote = trim.splitX != null ? ` splitX${trim.splitX}` : "";
  console.log(`${name}: trim L${left} T${top}${splitNote}, ${meta.width}x${meta.height} -> ${REF_W}x${REF_H}`);
}

(async () => {
  for (const name of sources) {
    await process(name);
  }
})();
