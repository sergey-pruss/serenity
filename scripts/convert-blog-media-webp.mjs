#!/usr/bin/env node
/**
 * Фаза 3: PNG/JPEG в img/blog → WebP, пути в JSON/HTML.
 *
 *   node scripts/convert-blog-media-webp.mjs --pilot
 *   node scripts/convert-blog-media-webp.mjs --all --apply
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { loadReferencedUrls } from "./lib/blog-media-inventory.mjs";

const root = process.cwd();
const WEBP_QUALITY = 85;
const RASTER_RE = /\.(png|jpe?g)$/i;

const PILOT_SLUGS = [
  "brending-i-performance-marketing-pochemu-odno-bez-drugogo-sliv-byudzheta",
  "kak-sdelat-brend-kotoryj-polyubyat-klienty",
  "flowwow-nishevye-marketplejsy-protiv-gigantov",
];

const apply = process.argv.includes("--apply");
const pilot = process.argv.includes("--pilot");
const all = process.argv.includes("--all");

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function urlToDisk(url) {
  let rel = url.replace(/^\//, "");
  if (rel.startsWith("_sa/")) rel = rel.slice(4);
  return path.join(root, rel);
}

function toWebpUrl(url) {
  return url.replace(RASTER_RE, ".webp");
}

function replaceUrls(text, urlMap) {
  let out = String(text || "");
  const pairs = [...urlMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

function collectTargetUrls(slugFilters) {
  const refs = loadReferencedUrls(root);
  const rootCardRe = /^\/_sa\/img\/blog\/[^/]+\.(png|jpe?g)$/i;
  const urls = [];
  for (const u of refs) {
    if (!RASTER_RE.test(u)) continue;
    if (slugFilters?.length) {
      const inSlug = slugFilters.some((s) => u.includes(`/blog/${s}/`));
      if (!inSlug && !rootCardRe.test(u)) continue;
    }
    urls.push(u);
  }
  return [...new Set(urls)].sort();
}

async function convertOne(diskPath) {
  const webpPath = diskPath.replace(RASTER_RE, ".webp");
  if (!fs.existsSync(diskPath)) return { ok: false, reason: "missing" };
  const before = fs.statSync(diskPath).size;
  if (fs.existsSync(webpPath)) {
    const wst = fs.statSync(webpPath);
    if (wst.mtimeMs >= fs.statSync(diskPath).mtimeMs && wst.size > 0) {
      return { ok: true, webpPath, before, after: wst.size, skipped: true };
    }
  }
  if (!apply) return { ok: true, webpPath, before, after: Math.round(before * 0.65), skipped: false, dry: true };
  await sharp(diskPath, { failOn: "none" })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(webpPath);
  const after = fs.statSync(webpPath).size;
  return { ok: true, webpPath, before, after, skipped: false };
}

function mobileUrl(url) {
  return url.replace(/(\.[^.]+)$/, "__m$1");
}

function shouldUpdateArticle(slug, slugFilters) {
  if (!slugFilters?.length) return true;
  return slugFilters.includes(slug);
}

function updateJsonFiles(urlMap, slugFilters) {
  const articlesDir = path.join(root, "json", "blog-articles");
  let articles = 0;
  for (const f of fs.readdirSync(articlesDir)) {
    if (!f.endsWith(".json")) continue;
    const slug = f.slice(0, -5);
    if (!shouldUpdateArticle(slug, slugFilters)) continue;

    const fp = path.join(articlesDir, f);
    const payload = JSON.parse(fs.readFileSync(fp, "utf8"));
    const nextHtml = replaceUrls(payload.bodyHtml || "", urlMap);
    if (nextHtml !== payload.bodyHtml) {
      payload.bodyHtml = nextHtml;
      if (apply) fs.writeFileSync(fp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      articles += 1;
    }
  }

  const jsonTargets = [
    path.join(root, "json", "blogs-all.json"),
    path.join(root, "json", "blog-posts-manual.json"),
  ];
  for (const fp of jsonTargets) {
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    const next = replaceUrls(raw, urlMap);
    if (next !== raw && apply) fs.writeFileSync(fp, next, "utf8");
  }
  return articles;
}

function removeOldRasters(urlMap) {
  let removed = 0;
  let freed = 0;
  for (const [oldUrl] of urlMap) {
    const disk = urlToDisk(oldUrl);
    if (fs.existsSync(disk)) {
      freed += fs.statSync(disk).size;
      fs.unlinkSync(disk);
      removed += 1;
    }
    const mob = urlToDisk(mobileUrl(oldUrl));
    if (fs.existsSync(mob)) {
      freed += fs.statSync(mob).size;
      fs.unlinkSync(mob);
      removed += 1;
    }
  }
  return { removed, freed };
}

let slugFilters = null;
if (pilot) slugFilters = PILOT_SLUGS;
else if (!all) {
  const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
  if (!slugArg) {
    console.error("Укажите --pilot, --all или --slug=<slug>");
    process.exit(1);
  }
  slugFilters = [slugArg];
}

const targetUrls = collectTargetUrls(slugFilters);

console.log(`${apply ? "APPLY" : "DRY-RUN"}: webp, ${targetUrls.length} raster URL(s)\n`);

const urlMap = new Map();
let convertBefore = 0;
let convertAfter = 0;
let converted = 0;
let skipped = 0;

for (let i = 0; i < targetUrls.length; i++) {
  const oldUrl = targetUrls[i];
  const disk = urlToDisk(oldUrl);
  const res = await convertOne(disk);
  if (!res.ok) continue;
  const newUrl = toWebpUrl(oldUrl);
  urlMap.set(oldUrl, newUrl);
  convertBefore += res.before;
  convertAfter += res.after;
  if (res.skipped) skipped += 1;
  else if (!res.dry) converted += 1;
  if ((i + 1) % 100 === 0) console.log(`  … ${i + 1}/${targetUrls.length}`);
}

function patchBlogPagesJson(urlMap) {
  const pagesRoot = path.join(root, "json", "blog-pages");
  if (!fs.existsSync(pagesRoot)) return 0;
  let n = 0;
  for (const dir of fs.readdirSync(pagesRoot)) {
    const d = path.join(pagesRoot, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith(".json")) continue;
      const fp = path.join(d, f);
      const raw = fs.readFileSync(fp, "utf8");
      const next = replaceUrls(raw, urlMap);
      if (next !== raw) {
        fs.writeFileSync(fp, next, "utf8");
        n += 1;
      }
    }
  }
  return n;
}

if (apply && urlMap.size) {
  const articles = updateJsonFiles(urlMap, slugFilters);
  const pages = patchBlogPagesJson(urlMap);
  const { removed, freed } = removeOldRasters(urlMap);
  console.log(
    `JSON: статей ${articles}, blog-pages ${pages}, удалено старых файлов ${removed} (${fmtBytes(freed)})`
  );
}

const saved = convertBefore - convertAfter;
console.log(
  `\nКонвертация: ${converted} новых, ${skipped} уже webp, экономия ~${fmtBytes(Math.max(0, saved))} (${convertBefore ? ((saved / convertBefore) * 100).toFixed(0) : 0}%)`
);
if (!apply) {
  console.log("\nПрименить: node scripts/convert-blog-media-webp.mjs --all --apply");
  console.log(
    "Затем: npm run build:blog-articles && node scripts/build-blog-mobile-media.mjs && npm run test:blog"
  );
  console.log("(листинг /blog/: при необходимости node scripts/assemble-html.cjs build && node scripts/build-blog-pages.mjs)");
}
