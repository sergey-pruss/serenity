#!/usr/bin/env node
/**
 * Полный HTML страницы /services/marketing (Playwright, после гидрации Nuxt).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "tmp", "marketing-prod-full.html");
const CAPTURE_URL =
  process.env.MARKETING_CAPTURE_URL || "https://serenity.agency/services/marketing";

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
  await page.waitForSelector(".cm-page", { timeout: 60000 });
  await page.waitForSelector(".blog-header__title", { timeout: 60000 });
  await page.waitForTimeout(3000);
  const html = await page.content();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  await browser.close();
  console.log("capture:", CAPTURE_URL);
  console.log("wrote", OUT, "bytes", html.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
