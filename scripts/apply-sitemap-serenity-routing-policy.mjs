#!/usr/bin/env node
/**
 * Сужает sitemap.xml под фактический роутинг serenity.agency (nginx/routing.conf):
 * - убирает /case/all/{slug} и /case/all/all/… (не статика; в индекс попадали «ложные» loc).
 *
 * Оставляет /case/all, /case/all/{N}, /case/all/category/{code}[/N], URL блога и прочие (не подпадающие под фильтр /case/all/…).
 *
 * Запуск: node scripts/apply-sitemap-serenity-routing-policy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sitemapPath = path.join(root, "sitemap.xml");

/** Согласовано с nginx/routing.conf: статические префиксы под /case/all/ */
export function keepSitemapLoc(locRaw) {
  const loc = String(locRaw || "").trim();
  if (!loc.startsWith("https://serenity.agency")) return true;

  const prefix = "https://serenity.agency/case/all";
  if (!loc.startsWith(prefix)) return true;

  if (loc === prefix) return true;

  const suffix = loc.slice(prefix.length);
  if (suffix === "" || suffix === "/") return true;

  const p = suffix.replace(/^\//, "");
  if (/^\d+$/.test(p)) return true;

  if (p.startsWith("category/")) {
    const parts = p.split("/").filter(Boolean);
    if (parts.length === 2) return true;
    if (parts.length === 3 && /^\d+$/.test(parts[2])) return true;
    return false;
  }

  return false;
}

export function applySitemapSerenityRoutingPolicy() {
  const xml = fs.readFileSync(sitemapPath, "utf8");
  const blockRe = /<url>[\s\S]*?<\/url>/g;
  const blocks = xml.match(blockRe) || [];
  const kept = [];
  for (const block of blocks) {
    const m = block.match(/<loc>([^<]*)<\/loc>/);
    if (!m) continue;
    if (keepSitemapLoc(m[1])) kept.push(block.trim());
  }

  const body = kept.map((b) => `        ${b}\n`).join("");
  const out =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `</urlset>\n`;

  fs.writeFileSync(sitemapPath, out, "utf8");
  console.log(`OK: sitemap.xml — было ${blocks.length} <url>, оставлено ${kept.length} (без нестатических /case/all/…).`);
}

const isMain = process.argv[1]?.endsWith("apply-sitemap-serenity-routing-policy.mjs");
if (isMain) {
  applySitemapSerenityRoutingPolicy();
}
