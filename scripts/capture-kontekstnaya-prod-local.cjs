#!/usr/bin/env node
/**
 * Full-page скриншоты + innerHTML #__layout для prod и local (после ожидания и скролла).
 * Результаты: tmp/kontekst-parity-prod.html, tmp/kontekst-parity-local.html,
 *             tmp/kontekst-parity-prod-full.png, tmp/kontekst-parity-local-full.png
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tmp");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1536x960", width: 1536, height: 960 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
];

async function capturePage(browser, label, url, dumpLayout) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  // Прогон по высоте, чтобы подтянуть ленивые блоки
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 800) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  if (dumpLayout) {
    const layout = await page.evaluate(() => {
      const el = document.querySelector("#__layout");
      return el ? el.innerHTML : "";
    });
    fs.writeFileSync(path.join(OUT, `kontekst-parity-${label}-layout.html`), layout, "utf8");
  }

  await page.close();
}

async function screenshotViewport(browser, label, url, vp) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < Math.min(h, 12000); y += 900) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const safe = `${label}-${vp.name.replace(/x/g, "x")}`;
  await page.screenshot({
    path: path.join(OUT, `kontekst-parity-${safe}-full.png`),
    fullPage: true,
  });
  await page.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const prod = "https://serenity.agency/kontekstnaya_reklama";
  const local = process.env.LOCAL_URL || "http://127.0.0.1:8895/kontekstnaya_reklama";

  await capturePage(browser, "prod", prod, true);
  await capturePage(browser, "local", local, true);

  for (const vp of VIEWPORTS) {
    await screenshotViewport(browser, "prod", prod, vp);
    await screenshotViewport(browser, "local", local, vp);
  }

  await browser.close();
  console.log("OK: tmp/kontekst-parity-*.{html,png}");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
