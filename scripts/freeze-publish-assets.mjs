#!/usr/bin/env node
/**
 * Скачивает ресурсы serenity.agency, на которые ссылается publish/index.html,
 * кладёт в public/ и пишет publish/index.frozen.html с относительными URL (/ _nuxt/...).
 * Первый проход: URL из HTML + url() внутри скачанных CSS.
 *
 * Ленивые чанки Nuxt могут подгружаться сетью при уходе на другие маршруты;
 * для одной главной обычно достаточно.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcHtml = path.join(root, "publish", "index.html");
const outHtml = path.join(root, "publish", "index.frozen.html");
const pubRoot = path.join(root, "public");
const MIN_BYTES = 2048;

const UA =
  "Mozilla/5.0 (compatible; serenity-freeze/1.0; +https://serenity.agency)";

const ORIGIN_RE = /^https?:\/\/(?:www\.)?serenity\.agency/i;

function safePublicPath(rel) {
  const clean = rel.replace(/^\/+/, "");
  const dest = path.join(pubRoot, clean);
  const resolved = path.resolve(dest);
  if (!resolved.startsWith(path.resolve(pubRoot) + path.sep) && resolved !== path.resolve(pubRoot)) {
    throw new Error("unsafe path: " + rel);
  }
  return resolved;
}

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function cleanPathSegment(raw) {
  let p = raw.split("#")[0].split("?")[0];
  p = p.split("&quot;")[0].split("&#34;")[0];
  p = p.replace(/["');]+$/g, "");
  p = p.replace(/[^\w\-./%+]+$/g, "");
  return p;
}

function extractUrlsFromHtml(html) {
  const out = new Set();
  const re =
    /https?:\/\/(?:www\.)?serenity\.agency(\/[a-zA-Z0-9\-._~/%+]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const p = cleanPathSegment(m[1]);
    if (p && p !== "/") out.add(`https://serenity.agency${p}`);
  }
  return out;
}

function extractUrlsFromCss(css) {
  const out = new Set();
  const re =
    /url\(\s*(['"]?)(https?:\/\/(?:www\.)?serenity\.agency(\/[a-zA-Z0-9\-._~/%+]+))\1\s*\)/gi;
  let m;
  while ((m = re.exec(css))) {
    const p = cleanPathSegment(m[3]);
    if (p && p !== "/") out.add(`https://serenity.agency${p}`);
  }
  return out;
}

function rewriteText(text) {
  return text
    .replace(/https:\/\/www\.serenity\.agency\//gi, "/")
    .replace(/http:\/\/www\.serenity\.agency\//gi, "/")
    .replace(/https:\/\/serenity\.agency\//gi, "/")
    .replace(/http:\/\/serenity\.agency\//gi, "/");
}

async function main() {
  if (!fs.existsSync(srcHtml) || fs.statSync(srcHtml).size < MIN_BYTES) {
    console.error("Нет publish/index.html — сначала: npm run capture:home && npm run fix:publish");
    process.exit(1);
  }

  let html = fs.readFileSync(srcHtml, "utf8");
  const queue = [...extractUrlsFromHtml(html)];
  const seen = new Set();

  while (queue.length) {
    const url = queue.pop();
    if (!url || seen.has(url)) continue;
    if (!ORIGIN_RE.test(url)) continue;
    seen.add(url);

    const u = new URL(url);
    const relPath = u.pathname.replace(/^\//, "");
    if (!relPath) continue;

    const dest = safePublicPath(relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
      try {
        const buf = await fetchBuf(url);
        fs.writeFileSync(dest, buf);
        console.log("→", path.relative(root, dest));
      } catch (e) {
        console.warn("skip:", url, e.message);
      }
    }

    if (relPath.endsWith(".css")) {
      const css = fs.readFileSync(dest, "utf8");
      for (const u2 of extractUrlsFromCss(css)) {
        if (!seen.has(u2)) queue.push(u2);
      }
      const rewritten = rewriteText(css);
      if (rewritten !== css) fs.writeFileSync(dest, rewritten, "utf8");
    }
  }

  const frozen = rewriteText(html);
  fs.writeFileSync(outHtml, frozen, "utf8");
  console.log("OK:", path.relative(root, outHtml));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
