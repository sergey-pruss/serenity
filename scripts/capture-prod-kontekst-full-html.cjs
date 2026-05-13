#!/usr/bin/env node
/**
 * Полный HTML страницы (для извлечения link rel=stylesheet из head).
 * По умолчанию — prod; для локального Nuxt (SerenityAgency, другой порт):
 *   KONTEKST_CAPTURE_URL=http://127.0.0.1:64947/kontekstnaya_reklama node scripts/capture-prod-kontekst-full-html.cjs
 *   KONTEKST_NUXT_ORIGIN для download лучше задать тем же origin или использовать refresh-kontekstnaya-from-local-nuxt (он выставляет NUXT из CAPTURE).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "tmp", "kontekst-prod-full.html");
const CAPTURE_URL =
  process.env.KONTEKST_CAPTURE_URL || "https://serenity.agency/kontekstnaya_reklama";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(CAPTURE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  const html = await page.content();
  fs.writeFileSync(OUT, html, "utf8");
  await browser.close();
  console.log("capture:", CAPTURE_URL);
  console.log("wrote", OUT, "bytes", html.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
