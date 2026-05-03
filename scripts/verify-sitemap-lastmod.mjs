#!/usr/bin/env node
/**
 * Проверка: в sitemap.xml нет lastmod в недопустимом для GSC формате (пробел вместо T).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sitemapPath = path.join(__dirname, "..", "sitemap.xml");
const xml = fs.readFileSync(sitemapPath, "utf8");
const bad = /<lastmod>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}<\/lastmod>/;
if (bad.test(xml)) {
  console.error(
    "sitemap.xml: найдены <lastmod> с пробелом между датой и временем (не ISO 8601). Запустите: node scripts/normalize-sitemap-lastmod.mjs"
  );
  process.exit(1);
}
console.log("sitemap.xml: формат lastmod ок для GSC.");
