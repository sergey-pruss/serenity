/**
 * Скачивает изображения и GIF главной в public/media/home/ для локальной отдачи.
 * Фоновое видео — Vimeo iframe (player.vimeo.com); прямой MP4 с их API без браузера недоступен.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "media", "home");

const UA =
  "Mozilla/5.0 (compatible; serenity-static-fetch/1.0; +https://serenity.agency)";

/** Имена файлов совпадают с путями в src/data/home-more-cases.ts и src/styles/home.css */
const assets = [
  {
    url: "https://serenity.agency/storage/WLXF5HzKVQUYRIDLQ7zOSRVDwZw17ziScjgTQABI.jpg",
    file: "case-darkrain.jpg",
  },
  {
    url: "https://serenity.agency/storage/fcinfNVrWIvITcJr2rUpiKLo7K4C8Oif44dl5Kjs.webp",
    file: "case-boca.webp",
  },
  {
    url: "https://serenity.agency/storage/AndTNWYK9X0q8jK1uKSkDrOF4PAEKyfO91k2aqI5.webp",
    file: "case-grandmed.webp",
  },
  {
    url: "https://serenity.agency/storage/eEn5z5K1VqnFurjwT6vHFhSyHwKolEzUF41JawC9.jpg",
    file: "case-eurostroy.jpg",
  },
  {
    url: "https://serenity.agency/storage/gxMhco4GICqvNHFrpJgfjadii3akfWNphHHA44Zr.jpg",
    file: "case-orange.jpg",
  },
  {
    url: "https://serenity.agency/storage/chL4LbnmmiU2maPGxKZgbFOkCsbzoA5kgg4YSpUh.jpg",
    file: "case-cromi.jpg",
  },
  {
    url: "https://serenity.agency/video/lastBlogGif.gif",
    file: "lastBlogGif.gif",
  },
];

async function downloadOne(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const offline = process.env.SKIP_HOME_MEDIA_FETCH === "1";
  const skipExisting =
    process.argv.includes("--skip-existing") && !offline;

  if (offline) {
    let ok = true;
    for (const { file } of assets) {
      const dest = path.join(outDir, file);
      if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
        console.error("missing:", path.relative(root, dest));
        ok = false;
      }
    }
    if (!ok) {
      console.error(
        "Run `npm run fetch:home-media` once with network, or remove SKIP_HOME_MEDIA_FETCH.",
      );
      process.exit(1);
    }
    console.log("offline OK:", assets.length, "files in", path.relative(root, outDir));
    return;
  }

  for (const { url, file } of assets) {
    const dest = path.join(outDir, file);
    if (skipExisting && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log("skip (exists):", file);
      continue;
    }
    const n = await downloadOne(url, dest);
    console.log("wrote", file, `(${n} bytes)`);
  }
  console.log("done →", path.relative(root, outDir));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
