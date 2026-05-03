#!/usr/bin/env node
/**
 * Приводит <lastmod> в sitemap.xml к ISO 8601 (пробел между датой и временем → T…Z),
 * как ожидает Google Search Console (W3C Datetime).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sitemapPath = path.join(__dirname, "..", "sitemap.xml");

let xml = fs.readFileSync(sitemapPath, "utf8");
const before = xml;
// MySQL/WordPress-стиль: "YYYY-MM-DD HH:MM:SS" без часового пояса — считаем UTC.
xml = xml.replace(
  /<lastmod>(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})<\/lastmod>/g,
  "<lastmod>$1T$2Z</lastmod>"
);
if (xml === before) {
  console.log("sitemap.xml: исправлений lastmod не требуется.");
} else {
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log("sitemap.xml: lastmod нормализованы под ISO 8601 (…T…Z).");
}
