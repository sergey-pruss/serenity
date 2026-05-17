#!/usr/bin/env node
/**
 * Статический FAQ /targeting из capture-partial (без data-v, id targeting-faq-mounted).
 */
const fs = require("fs");
const path = require("path");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");
const { processTypographyHtml } = require("./typography-nbsp.cjs");

const root = path.resolve(__dirname, "..");
const inPath = path.join(root, "html", "partials", "services", "faq-targeting.html");
const outPath = inPath;

function run() {
  if (!fs.existsSync(inPath)) {
    console.error("Нет", inPath);
    process.exit(1);
  }
  let html = fs.readFileSync(inPath, "utf8");
  html = html.replace(/<!--[\s\S]*?-->\s*/g, "");
  html = stripNuxtScopedMarkup(html);
  html = html.replace(/kontekst-faq-mounted/g, "targeting-faq-mounted");
  html = html.replace(/kontekst-faq-root/g, "targeting-faq-root");
  html = html.replace(/kontekst-faq-section/g, "targeting-faq-section");
  html = html.replace(/kontekstnaya-page__section-heading/g, "targeting-page__section-heading");
  html = html.replace(/<script[^>]*type="application\/ld\+json">[\s\S]*?<\/script>/, (block) => {
    return block.replace(/\sdata-v-[a-z0-9]+=""/gi, "");
  });
  const typo = processTypographyHtml(html, { force: true });
  const body = `<!-- FAQ targeting: статика (build-faq-targeting-static.cjs) -->\n${typo.html.trim()}\n`;
  fs.writeFileSync(outPath, body, "utf8");
  console.log("build-faq-targeting-static: ok", outPath);
}

run();
