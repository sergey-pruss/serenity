#!/usr/bin/env node
/**
 * Вырезает из tmp/targeting-prod-full.html секции для phase2 partials.
 */
const fs = require("fs");
const path = require("path");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");

function rewriteProdSlice(html) {
  return html
    .replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__")
    .replace(/url\(&quot;https:\/\/serenity\.agency\/storage\//g, 'url(&quot;/_sa/img/storage__')
    .replace(/url\("https:\/\/serenity\.agency\/storage\//g, 'url("/_sa/img/storage__');
}

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "targeting-prod-full.html");
const middleOut = path.join(root, "html", "partials", "services", "targeting-phase2-middle.html");
const clientsOut = path.join(root, "html", "partials", "services", "targeting-phase2-clients.html");

if (!fs.existsSync(fullHtmlPath)) {
  console.error("Нет", fullHtmlPath);
  process.exit(1);
}

const html = fs.readFileSync(fullHtmlPath, "utf8");
let i = html.indexOf('<div class="page-constructor">');
if (i < 0) i = html.indexOf('<motion.div class="page-constructor">');
const j = html.indexOf('<footer class="footer-modern"');
const main = html.slice(i, j);

const heroEnd = main.indexOf("</section>", main.indexOf("c-title-block")) + "</section>".length;
const formIdx = main.indexOf('class="forms modern"');
const formSec = main.lastIndexOf('<section class="page-constructor__section">', formIdx);
const formEnd = main.indexOf("</section>", main.indexOf("</form>", formIdx)) + "</section>".length;
const faqSec = main.lastIndexOf('<section', main.indexOf("questions-wr"));

const middle = main.slice(heroEnd, formSec);

const clients = main.slice(formEnd, faqSec);

fs.mkdirSync(path.dirname(middleOut), { recursive: true });
const middleClean = rewriteProdSlice(middle);
fs.writeFileSync(middleOut, `<!-- phase2: facts, approach, stages, advantages, team -->\n${middleClean}`, "utf8");
fs.writeFileSync(clientsOut, `<!-- phase2: our clients -->\n${clients}`, "utf8");
console.log("wrote", middleOut, middle.length, "bytes");
console.log("wrote", clientsOut, clients.length, "bytes");
