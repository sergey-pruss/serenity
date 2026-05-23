#!/usr/bin/env node
/**
 * Полный HTML страницы /korporativnyj_sajt (Playwright, после гидрации Nuxt).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "tmp", "korporativnyj-prod-full.html");
const CAPTURE_URL =
  process.env.KORPORATIVNYJ_CAPTURE_URL || "https://serenity.agency/korporativnyj_sajt";

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
  await page.waitForSelector("h1.c-title-block__title", { timeout: 90000 });
  await page
    .waitForSelector(".video-header, .case-slider__wrapper, .case-slider", { timeout: 90000 })
    .catch(() => {});
  await page
    .waitForFunction(
      () => {
        const videos = document.querySelectorAll("video[src], video source[src]");
        const slides = document.querySelectorAll(".case-slider-slide__media, .case-slider");
        return videos.length >= 1 || slides.length >= 1 || document.querySelector(".video-header");
      },
      { timeout: 90000 },
    )
    .catch(() => {});
  await page.waitForTimeout(5000);
  const html = await page.content();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  await browser.close();
  const heroMedia = (html.match(/case-slider-slide__media/g) || []).length;
  console.log("capture:", CAPTURE_URL);
  console.log("wrote", OUT, "bytes", html.length, "case-slider-slide__media", heroMedia);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
