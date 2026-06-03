#!/usr/bin/env node
/**
 * Полный HTML страницы /seo (Playwright, после гидрации Nuxt).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "tmp", "seo-prod-full.html");
const CAPTURE_URL = process.env.SEO_CAPTURE_URL || "https://serenity.agency/seo";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(CAPTURE_URL, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector("h1.c-title-block__title, h1", { timeout: 90000 });
  await page.waitForTimeout(4000);
  const html = await page.content();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  await browser.close();
  const sections = (html.match(/page-constructor__section/g) || []).length;
  console.log("capture:", CAPTURE_URL);
  console.log("wrote", OUT, "bytes", html.length, "sections", sections);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
