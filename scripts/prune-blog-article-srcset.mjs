#!/usr/bin/env node
/**
 * Фаза 2: урезать легаси srcset WordPress (8–10 PNG) до 4 ширин под вёрстку Serenity.
 * Правит json/blog-articles/<slug>.json; с диска снимает файлы, выпавшие из HTML.
 *
 *   node scripts/prune-blog-article-srcset.mjs --pilot          # dry-run, 3 статьи
 *   node scripts/prune-blog-article-srcset.mjs --all --apply    # все json/blog-articles
 *   node scripts/prune-blog-article-srcset.mjs --slug=my-slug --apply
 */
import fs from "fs";
import path from "path";
import { collectUrlsFromHtml } from "./lib/blog-media-inventory.mjs";

const root = process.cwd();
const jsonDir = path.join(root, "json", "blog-articles");
const TARGET_WIDTHS = [450, 768, 1040, 1320];

const PILOT_SLUGS = [
  "brending-i-performance-marketing-pochemu-odno-bez-drugogo-sliv-byudzheta",
  "kak-sdelat-brend-kotoryj-polyubyat-klienty",
  "flowwow-nishevye-marketplejsy-protiv-gigantov",
];

const apply = process.argv.includes("--apply");
const pilot = process.argv.includes("--pilot");
const all = process.argv.includes("--all");
const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function widthFromUrl(url) {
  const m = url.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|gif)/i);
  if (m) return Math.max(Number(m[1]), Number(m[2]));
  const base = path.basename(url);
  const full = base.match(/^(\d+)\.(?:png|jpe?g|webp)/i);
  if (full) return Number(full[1]) * 400;
  return 0;
}

function parseSrcset(value) {
  const entries = [];
  for (const part of value.split(",")) {
    const t = part.trim().split(/\s+/);
    if (!t[0]) continue;
    const url = t[0];
    let w = 0;
    if (t[1] && /^\d+w$/i.test(t[1])) w = Number.parseInt(t[1], 10);
    if (!w) w = widthFromUrl(url);
    if (!w) w = 900;
    entries.push({ url, w });
  }
  return entries;
}

function pickVariants(entries, targets = TARGET_WIDTHS) {
  const sorted = [...entries].sort((a, b) => a.w - b.w);
  const chosen = [];
  const used = new Set();
  for (const t of targets) {
    let best = null;
    let bestScore = Infinity;
    for (const e of sorted) {
      if (used.has(e.url)) continue;
      let score = Math.abs(e.w - t);
      if (e.w < t * 0.82) score += 8000;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (best) {
      chosen.push(best);
      used.add(best.url);
    }
  }
  return chosen.sort((a, b) => a.w - b.w);
}

function buildSrcset(entries) {
  return entries.map((e) => `${e.url} ${e.w}w`).join(", ");
}

function pruneImgTag(match, attrs) {
  const srcM = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  const srcsetM = attrs.match(/\bsrcset\s*=\s*["']([^"']+)["']/i);
  if (!srcsetM) return match;
  const src = srcM?.[1] || "";
  const all = parseSrcset(srcsetM[1]);
  if (all.length <= TARGET_WIDTHS.length) return match;

  let kept = pickVariants(all);
  if (src && !kept.some((e) => e.url === src)) {
    const srcEntry = all.find((e) => e.url === src) || { url: src, w: widthFromUrl(src) || 900 };
    kept.push(srcEntry);
    kept = [...new Map(kept.map((e) => [e.url, e])).values()].sort((a, b) => a.w - b.w);
  }

  const newSrcset = buildSrcset(kept);
  let newAttrs = attrs.replace(srcsetM[0], `srcset="${newSrcset}"`);
  const bestSrc =
    kept.find((e) => e.w >= 768 && e.w <= 1100) ||
    kept.find((e) => e.w >= 1040) ||
    kept[Math.floor(kept.length / 2)] ||
    kept[0];
  if (srcM && bestSrc) {
    newAttrs = newAttrs.replace(srcM[0], `src="${bestSrc.url}"`);
  }
  return `<img${newAttrs}>`;
}

function pruneBodyHtml(html) {
  return html.replace(/<img\b([^>]*)>/gi, (match, attrs) => pruneImgTag(match, attrs));
}

function dirSizeAndCount(slugDir) {
  if (!fs.existsSync(slugDir)) return { count: 0, bytes: 0 };
  let count = 0;
  let bytes = 0;
  for (const name of fs.readdirSync(slugDir)) {
    const fp = path.join(slugDir, name);
    if (!fs.statSync(fp).isFile()) continue;
    count += 1;
    bytes += fs.statSync(fp).size;
  }
  return { count, bytes };
}

function processSlug(slug) {
  const jsonPath = path.join(jsonDir, `${slug}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`SKIP: нет ${jsonPath}`);
    return null;
  }
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const slugDir = path.join(root, "img", "blog", slug);
  const before = dirSizeAndCount(slugDir);

  const oldUrls = collectUrlsFromHtml(payload.bodyHtml || "");
  const newBody = pruneBodyHtml(payload.bodyHtml || "");
  const newUrls = collectUrlsFromHtml(newBody);
  const removedUrls = [...oldUrls].filter((u) => !newUrls.has(u) && u.includes(`/blog/${slug}/`));

  let deletedBytes = 0;
  let deletedCount = 0;
  if (apply) {
    payload.bodyHtml = newBody;
    fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    for (const u of removedUrls) {
      const rel = u.replace(/^\//, "").replace(/^_sa\//, "");
      const fp = path.join(root, rel);
      if (!fs.existsSync(fp)) continue;
      deletedBytes += fs.statSync(fp).size;
      fs.unlinkSync(fp);
      deletedCount += 1;
    }
  } else {
    for (const u of removedUrls) {
      const rel = u.replace(/^\//, "").replace(/^_sa\//, "");
      const fp = path.join(root, rel);
      if (fs.existsSync(fp)) deletedBytes += fs.statSync(fp).size;
      deletedCount += 1;
    }
  }

  const after = apply ? dirSizeAndCount(slugDir) : { count: before.count - deletedCount, bytes: before.bytes - deletedBytes };

  return {
    slug,
    srcsetsTrimmed: oldUrls.size !== newUrls.size,
    urlsBefore: oldUrls.size,
    urlsAfter: newUrls.size,
    filesRemoved: deletedCount,
    bytesRemoved: deletedBytes,
    before,
    after,
  };
}

let slugs = [];
if (slugArg) slugs = [slugArg];
else if (pilot) slugs = PILOT_SLUGS;
else if (all) {
  slugs = fs
    .readdirSync(jsonDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
} else {
  console.error("Укажите --pilot, --all или --slug=<slug>");
  process.exit(1);
}

console.log(`${apply ? "APPLY" : "DRY-RUN"}: srcset prune, ${slugs.length} slug(s)\n`);

let totalBytes = 0;
for (const slug of slugs) {
  const r = processSlug(slug);
  if (!r) continue;
  totalBytes += r.bytesRemoved;
  console.log(
    `${r.slug}: urls ${r.urlsBefore}→${r.urlsAfter}, −${r.filesRemoved} files (${fmtBytes(r.bytesRemoved)}), dir ${fmtBytes(r.before.bytes)}→${fmtBytes(r.after.bytes)}`
  );
}

console.log(`\nИтого ${apply ? "удалено" : "можно удалить"}: ${fmtBytes(totalBytes)}`);
if (!apply) {
  const flag = pilot ? "--pilot" : all ? "--all" : `--slug=${slugArg}`;
  console.log(`\nПрименить: node scripts/prune-blog-article-srcset.mjs ${flag} --apply`);
  console.log("Затем: npm run build:blog-articles && npm run test:blog");
}
