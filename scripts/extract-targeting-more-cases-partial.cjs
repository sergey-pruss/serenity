#!/usr/bin/env node
/**
 * more-cases-targeting.html из tmp/targeting-prod-full.html
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { sanitizeMoreCasesCapture } = require("./sanitize-more-cases-capture.cjs");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "targeting-prod-full.html");
const outPath = path.join(root, "html", "partials", "services", "more-cases-targeting.html");

function rewriteProdSlice(html) {
  return html
    .replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__")
    .replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
}

function extractMoreCasesSection(main) {
  const moreRe = /<section class="page-constructor__section"><div[^>]*class="more-case-wr"/;
  const m = main.match(moreRe);
  if (!m || m.index === undefined) {
    console.error("more-case-wr section не найден");
    process.exit(1);
  }
  const start = m.index;
  const end = main.indexOf("</section>", start) + "</section>".length;
  return main.slice(start, end);
}

function run() {
  if (!fs.existsSync(fullHtmlPath)) {
    console.error("Нет", fullHtmlPath);
    process.exit(1);
  }
  const html = fs.readFileSync(fullHtmlPath, "utf8");
  let i = html.indexOf('<div class="page-constructor">');
  if (i < 0) i = html.indexOf('<motion.div class="page-constructor">');
  const j = html.indexOf('<footer class="footer-modern"');
  const main = html.slice(i, j);
  let slice = extractMoreCasesSection(main);
  slice = rewriteProdSlice(slice);
  slice = sanitizeMoreCasesCapture(slice);
  slice = slice.replace(/kontekstnaya-page__section-heading/g, "targeting-page__section-heading");
  const typo = processTypographyHtml(slice, { force: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    `<!-- more-cases targeting: из prod capture -->\n${typo.html.trim()}\n`,
    "utf8",
  );
  console.log("wrote", outPath, typo.html.length, "bytes");
}

run();
