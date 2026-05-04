#!/usr/bin/env node
/**
 * Проверка: в sitemap.xml нет URL /blog/ и нет «ложных» /case/all/{slug} вне статического роутинга.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keepSitemapLoc } from "./apply-sitemap-serenity-routing-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sitemapPath = path.join(__dirname, "..", "sitemap.xml");
const xml = fs.readFileSync(sitemapPath, "utf8");
const blockRe = /<url>[\s\S]*?<\/url>/g;
const blocks = xml.match(blockRe) || [];
const bad = [];
for (const block of blocks) {
  const m = block.match(/<loc>([^<]*)<\/loc>/);
  if (!m) continue;
  if (!keepSitemapLoc(m[1])) bad.push(m[1].trim());
}
if (bad.length) {
  console.error("sitemap.xml: URL не проходят политику роутинга:\n", bad.slice(0, 30).join("\n"));
  if (bad.length > 30) console.error(`… и ещё ${bad.length - 30}`);
  process.exit(1);
}
console.log(`OK: sitemap-loc-policy (${blocks.length} URL).`);
