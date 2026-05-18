#!/usr/bin/env node
/**
 * Пересборка sitemap.xml: «основные» URL из текущего файла (без /blog/… и без мусорных путей)
 * плюс все реально собранные страницы под blog/…/index.html.
 *
 * Запуск: node scripts/build-sitemap.mjs
 * Обычно вызывается из npm run build:html после build-blog-pages и build-blog-article-pages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keepSitemapLoc } from "./apply-sitemap-serenity-routing-policy.mjs";
import { ensureCanonicalUrlNoSlash } from "./lib/canonical-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sitemapPath = path.join(root, "sitemap.xml");
const ORIGIN = "https://serenity.agency";

/** Не включать в sitemap (нет смысла в индексе или не поддерживаются). */
const EXCLUDE_PATHNAMES = new Set(["/test", "/testkonsrtuktor"]);

function pathnameFromLoc(loc) {
  try {
    return new URL(String(loc).trim()).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function parseUrlBlocks(xml) {
  const blockRe = /<url>[\s\S]*?<\/url>/g;
  const blocks = xml.match(blockRe) || [];
  const out = [];
  for (const block of blocks) {
    const lm = block.match(/<lastmod>([^<]*)<\/lastmod>/);
    const locM = block.match(/<loc>([^<]*)<\/loc>/);
    if (!locM) continue;
    out.push({ loc: locM[1].trim(), lastmod: lm ? lm[1].trim() : null, block });
  }
  return out;
}

function walkBlogIndexFiles() {
  const blogRoot = path.join(root, "blog");
  const rels = [];
  if (!fs.existsSync(blogRoot)) return rels;

  const walk = (dirRel) => {
    const abs = path.join(blogRoot, dirRel);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs)) {
      if (name === ".DS_Store") continue;
      const rel = dirRel ? `${dirRel}/${name}` : name;
      const full = path.join(blogRoot, rel);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(rel);
      else if (name === "index.html") rels.push(rel);
    }
  };
  walk("");
  return rels;
}

function blogRelToLoc(rel) {
  const dir = path.posix.dirname(rel.replace(/\\/g, "/"));
  const urlPath = dir === "." ? "/blog" : `/blog/${dir}`;
  return `${ORIGIN}${urlPath}`;
}

function isoLastmodFromFile(filePath) {
  const m = fs.statSync(filePath).mtime.toISOString();
  if (/\.\d{3}Z$/.test(m)) return m.replace(/\.\d{3}Z$/, "Z");
  return m;
}

/** lastmod из mtime index.html для страниц из json/services/<slug>/service.config.json */
function servicePageLastmodsByPathname() {
  const map = new Map();
  const servicesRoot = path.join(root, "json", "services");
  if (!fs.existsSync(servicesRoot)) return map;
  for (const slug of fs.readdirSync(servicesRoot)) {
    const cfgPath = path.join(servicesRoot, slug, "service.config.json");
    if (!fs.existsSync(cfgPath)) continue;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    const urlPath = String(cfg.urlPath || "").replace(/\/+$/, "");
    if (!urlPath) continue;
    const idx = path.join(root, slug, "index.html");
    if (fs.existsSync(idx)) map.set(urlPath, isoLastmodFromFile(idx));
  }
  return map;
}

function buildUrlXml(loc, lastmod) {
  const normLoc = ensureCanonicalUrlNoSlash(loc);
  const lm = lastmod || new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `        <url>\n` +
    `            <loc>${normLoc}</loc>\n` +
    `            <lastmod>${lm}</lastmod>\n` +
    `            <changefreq>weekly</changefreq>\n` +
    `            <priority>1.0</priority>\n` +
    `        </url>\n`
  );
}

function main() {
  if (!fs.existsSync(sitemapPath)) {
    throw new Error(`Missing ${sitemapPath}`);
  }
  const xml = fs.readFileSync(sitemapPath, "utf8");
  const parsed = parseUrlBlocks(xml);

  const coreEntries = [];
  const seen = new Set();
  for (const { loc, lastmod } of parsed) {
    const p = pathnameFromLoc(loc);
    if (!p || EXCLUDE_PATHNAMES.has(p)) continue;
    if (p === "/blog" || p.startsWith("/blog/")) continue;
    if (seen.has(loc)) continue;
    seen.add(loc);
    coreEntries.push({ loc, lastmod: lastmod || null });
  }

  const blogRels = walkBlogIndexFiles();
  const blogEntries = [];
  for (const rel of blogRels) {
    const loc = blogRelToLoc(rel);
    if (seen.has(loc)) continue;
    seen.add(loc);
    const idx = path.join(root, "blog", rel);
    const lastmod = isoLastmodFromFile(idx);
    blogEntries.push({ loc, lastmod });
  }
  blogEntries.sort((a, b) => a.loc.localeCompare(b.loc, "ru"));

  const serviceLastmod = servicePageLastmodsByPathname();
  const chunks = [];
  for (const e of coreEntries) {
    if (!keepSitemapLoc(e.loc)) continue;
    const p = pathnameFromLoc(e.loc);
    const lm =
      (p && serviceLastmod.get(p)) ||
      e.lastmod ||
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    chunks.push(buildUrlXml(e.loc, lm));
  }
  for (const e of blogEntries) {
    if (!keepSitemapLoc(e.loc)) continue;
    chunks.push(buildUrlXml(e.loc, e.lastmod));
  }

  const body = chunks.join("");
  const out =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `</urlset>\n`;

  fs.writeFileSync(sitemapPath, out, "utf8");
  const nCore = coreEntries.filter((e) => keepSitemapLoc(e.loc)).length;
  const nBlog = blogEntries.filter((e) => keepSitemapLoc(e.loc)).length;
  console.log(`OK: sitemap.xml — core ${nCore} + blog ${nBlog} = ${nCore + nBlog} URL`);
}

main();
