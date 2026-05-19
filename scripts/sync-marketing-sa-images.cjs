#!/usr/bin/env node
/**
 * Копирует /img/services/cm/* и связанные пути с prod в img/services/marketing/ и переписывает пути в HTML.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const capturePath = path.join(root, "tmp", "marketing-prod-full.html");
const imgRoot = path.join(root, "img", "services", "marketing");
const origin = process.env.MARKETING_IMAGE_ORIGIN || "https://serenity.agency";

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http:") ? http : https;
    lib
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) return reject(new Error("redirect"));
          return resolve(fetchBuffer(new URL(loc, url).href));
        }
        if (res.statusCode !== 200) return reject(new Error(`${url} -> ${res.statusCode}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function collectImagePaths(html) {
  const set = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/img\/[^"]+)"/g)) set.add(m[1]);
  for (const m of html.matchAll(/url\((\/img\/[^)]+)\)/g)) set.add(m[1]);
  return [...set].filter((p) => p.includes("/services/") || p.includes("/cases/"));
}

function collectAbsoluteImageUrls(html) {
  const set = new Set();
  for (const m of html.matchAll(/background-image:\s*url\(([^)]+)\)/gi)) {
    let raw = m[1].trim().replace(/&quot;/g, "").replace(/^["']|["']$/g, "");
    if (raw.startsWith("http://") || raw.startsWith("https://")) set.add(raw);
  }
  return [...set];
}

(async () => {
  if (!fs.existsSync(capturePath)) {
    console.error("Нет", capturePath);
    process.exit(1);
  }
  const html = fs.readFileSync(capturePath, "utf8");
  const paths = collectImagePaths(html);
  fs.mkdirSync(imgRoot, { recursive: true });
  const map = new Map();
  for (const absUrl of collectAbsoluteImageUrls(html)) {
    const base = path.basename(new URL(absUrl).pathname);
    const destDir = path.join(imgRoot, "hero");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, base);
    if (!fs.existsSync(dest)) {
      console.log("fetch", absUrl);
      const buf = await fetchBuffer(absUrl);
      fs.writeFileSync(dest, buf);
    }
    map.set(absUrl, `/_sa/img/services/marketing/hero/${base}`);
  }
  for (const p of paths) {
    const base = path.basename(p);
    const sub = p.includes("/services/sites/") ? "sites" : p.includes("/cases/") ? "cases" : "cm";
    const destDir = path.join(imgRoot, sub);
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, base);
    const url = `${origin}${p}`;
    if (!fs.existsSync(dest)) {
      console.log("fetch", url);
      const buf = await fetchBuffer(url);
      fs.writeFileSync(dest, buf);
    }
    map.set(p, `/_sa/img/services/marketing/${sub}/${base}`);
  }
  const manifest = path.join(root, "json", "services", "marketing", "image-map.json");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(map), null, 2), "utf8");
  console.log("images:", map.size, "→", path.relative(root, manifest));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
