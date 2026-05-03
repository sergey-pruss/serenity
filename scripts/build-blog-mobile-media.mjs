#!/usr/bin/env node
/**
 * Мобильные превью для карточек блога: `__m` рядом с исходником в img/blog/
 * (как scripts/build-case-mobile-media.mjs для /_sa/img/case/).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const blogsPath = path.join(root, "json", "blogs-all.json");
const MOBILE_MAX_WIDTH = 820;
const MOBILE_SUFFIX = "__m";

function urlPathOnDisk(url) {
  let rel = url.replace(/^\//, "");
  if (rel.startsWith("_sa/")) rel = rel.slice(4);
  return rel;
}

function getMobileVariantPath(url) {
  if (!url || !url.startsWith("/_sa/img/")) return "";
  const ext = path.extname(url);
  const base = url.slice(0, -ext.length);
  return `${base}${MOBILE_SUFFIX}${ext}`;
}

function collectImageUrls(payload) {
  const urls = new Set();
  for (const p of payload.posts || []) {
    const m = p?.media;
    if (!m) continue;
    if (m.kind === "video" && m.poster) urls.add(m.poster);
    else if (m.kind === "picture" && m.image) urls.add(m.image);
  }
  return Array.from(urls).filter((u) => u.startsWith("/_sa/img/blog/"));
}

async function buildOneVariant(sourceUrl) {
  const sourcePath = path.join(root, urlPathOnDisk(sourceUrl));
  const targetUrl = getMobileVariantPath(sourceUrl);
  const targetPath = path.join(root, urlPathOnDisk(targetUrl));
  if (!fs.existsSync(sourcePath)) return { built: false, skipped: true, reason: "source-missing" };

  const sourceStat = fs.statSync(sourcePath);
  if (fs.existsSync(targetPath)) {
    const targetStat = fs.statSync(targetPath);
    if (targetStat.mtimeMs >= sourceStat.mtimeMs) {
      return { built: false, skipped: true, reason: "up-to-date" };
    }
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const image = sharp(sourcePath, { failOn: "none" });
  const meta = await image.metadata();
  if (!meta.width || meta.width <= MOBILE_MAX_WIDTH) {
    fs.copyFileSync(sourcePath, targetPath);
    return { built: true, copied: true };
  }

  let pipeline = image.resize({ width: MOBILE_MAX_WIDTH, withoutEnlargement: true });
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  } else if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, palette: false });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 88, effort: 6 });
  }
  await pipeline.toFile(targetPath);
  return { built: true, copied: false };
}

(async () => {
  if (!fs.existsSync(blogsPath)) {
    throw new Error(`Missing ${blogsPath}. Run build-blog-data first.`);
  }
  const payload = JSON.parse(fs.readFileSync(blogsPath, "utf8"));
  const imageUrls = collectImageUrls(payload);
  let built = 0;
  let copied = 0;
  let skipped = 0;
  for (const imageUrl of imageUrls) {
    const res = await buildOneVariant(imageUrl);
    if (res.built) {
      built += 1;
      if (res.copied) copied += 1;
    } else if (res.skipped) {
      skipped += 1;
    }
  }
  console.log(
    `OK: blog mobile media. total=${imageUrls.length}, built=${built}, copied=${copied}, skipped=${skipped}`
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
