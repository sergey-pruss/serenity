#!/usr/bin/env node
/**
 * Полный HTML страницы /targeting (Playwright, после гидрации Nuxt).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "tmp", "targeting-prod-full.html");
const CAPTURE_URL =
  process.env.TARGETING_CAPTURE_URL || "https://serenity.agency/targeting";

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
  await page.waitForSelector(".case-slider__wrapper", { timeout: 60000 });
  await page
    .waitForFunction(
      () => document.querySelectorAll(".case-slider-slide__media img").length >= 8,
      { timeout: 90000 },
    )
    .catch(() => {});
  await page.waitForTimeout(3000);
  const html = await page.content();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  await browser.close();
  const heroImgs = (html.match(/case-slider-slide__media/g) || []).length;
  console.log("capture:", CAPTURE_URL);
  console.log("wrote", OUT, "bytes", html.length, "case-slider-slide__media", heroImgs);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
