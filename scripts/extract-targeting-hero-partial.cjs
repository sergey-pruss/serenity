#!/usr/bin/env node
/**
 * Герой /targeting из tmp/targeting-prod-full.html → html/partials/services/hero-targeting.html
 */
const fs = require("fs");
const path = require("path");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");

function rewriteProdSlice(html) {
  return html
    .replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__")
    .replace(/(<div[^>]*class="case-slider") style="height:\s*160px;"/g, "$1");
}

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "targeting-prod-full.html");
const outPath = path.join(root, "html", "partials", "services", "hero-targeting.html");

if (!fs.existsSync(fullHtmlPath)) {
  console.error("Нет", fullHtmlPath);
  process.exit(1);
}

const html = fs.readFileSync(fullHtmlPath, "utf8");
let i = html.indexOf('<div class="page-constructor">');
if (i < 0) i = html.indexOf('<motion.div class="page-constructor">');
const j = html.indexOf('<footer class="footer-modern"');
const main = html.slice(i, j);

const heroStart = main.indexOf('<section class="page-constructor__section">');
if (heroStart < 0) {
  console.error("Не найдена первая section page-constructor");
  process.exit(1);
}
const heroEnd = main.indexOf('<section class="page-constructor__section">', heroStart + 10);
const heroEndAlt =
  heroEnd > heroStart ? heroEnd : main.indexOf("</section>", main.indexOf("c-title-block")) + "</section>".length;
let hero = rewriteProdSlice(stripNuxtScopedMarkup(main.slice(heroStart, heroEndAlt)));
hero = hero.replace(
  '<section class="page-constructor__section">',
  '<section class="page-constructor__section sa-targeting-hero">',
);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `<!-- hero: c-title-block + case-slider -->\n${hero.trim()}\n`, "utf8");
console.log("wrote", outPath, hero.length, "bytes");
