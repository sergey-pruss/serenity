#!/usr/bin/env node
/**
 * Проверка: в собранных страницах блога все пути `/_sa/img/...` из `src` и `srcset`
 * указывают на существующие файлы в репозитории (как у dev-server после strip `/_sa`).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { stripSerenitySnapshotPrefix } = require("./strip-serenity-snapshot-prefix.cjs");

const root = path.resolve(__dirname, "..");

function resolveFs(u) {
  let p = stripSerenitySnapshotPrefix(String(u).split("?")[0].split("#")[0]);
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return path.join(root, p.replace(/^\/+/, ""));
}

function collectSaImgUrls(html) {
  const out = new Set();
  const h = String(html || "");
  const reSrcset = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  const reSrc = /\bsrc\s*=\s*["'](\/_sa\/img\/[^"']+)["']/gi;
  let m;
  while ((m = reSrcset.exec(h))) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith("/_sa/img/")) out.add(u);
    }
  }
  while ((m = reSrc.exec(h))) out.add(m[1]);
  return out;
}

function listBlogIndexHtmlFiles() {
  const out = [];
  const blogRoot = path.join(root, "blog");
  if (!fs.existsSync(blogRoot)) return out;
  const stack = [blogRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === "index.html") out.push(full);
    }
  }
  return out;
}

let total = 0;
let missing = 0;
const missingByFile = new Map();

for (const idxPath of listBlogIndexHtmlFiles()) {
  const html = fs.readFileSync(idxPath, "utf8");
  const urls = collectSaImgUrls(html);
  const bad = [];
  for (const u of urls) {
    total++;
    const fp = resolveFs(u);
    if (!fs.existsSync(fp)) {
      missing++;
      bad.push(u);
    }
  }
  if (bad.length) missingByFile.set(path.relative(root, idxPath), bad);
}

if (missing) {
  console.error(`verify-blog-article-img-paths: missing ${missing} / ${total} under blog/**/index.html`);
  for (const [rel, urls] of missingByFile) {
    console.error(`  ${rel}`);
    urls.forEach((u) => console.error(`    ${u}`));
  }
  process.exit(1);
}

console.log(`OK: blog pages — ${total} /_sa/img paths in blog/**/index.html, all files on disk`);
