#!/usr/bin/env node
/**
 * Снимает полный HTML главной https://serenity.agency/ (или CAPTURE_URL) после гидрации.
 * Результат: publish/index.html.
 *
 * Важно: не вставляем <base href="https://serenity.agency/"> — из‑за него Vue/Nuxt
 * и обычные ссылки ведут на прод. Вместо этого абсолютизируем только статику (_nuxt, fonts, …).
 *
 * Переменные окружения:
 *   CAPTURE_URL       — страница (по умолчанию https://serenity.agency/). Для свежей вёрстки без деплоя на прод:
 *                       CAPTURE_URL=http://127.0.0.1:4333/ npm run capture:home
 *   CAPTURE_VIEWPORT  — JSON { "width": 1440, "height": 900 }
 *   CAPTURE_REWRITE   — если "1", заменяет localhost:4333 / 127.0.0.1:4333 на https://serenity.agency
 *   CAPTURE_BASE_HREF — origin статики (по умолчанию из CAPTURE_URL или https://serenity.agency)
 *   MIRROR_STRIP_TRACKERS — если "1", вырезает сторонние счётчики (GTM, Метрика, …); по умолчанию счётчики сохраняются
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  stripBaseTag,
  fixMirrorTypos,
  absolutizeStaticAssets,
  injectWebpackPublicPath,
  stripFontPreloadCrossorigin,
  rewriteSvgsetToLocal,
  relaxMirrorHeader,
  injectMirrorDesktopNavFix,
  injectMirrorBandArtifactFix,
  stripMirrorTrackers,
} from "./asset-urls.mjs";
import { writeSvgsetFromOrigin } from "./fetch-svgset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "publish");
const outFile = path.join(outDir, "index.html");

const url = process.env.CAPTURE_URL || "https://serenity.agency/";
const rewrite = process.env.CAPTURE_REWRITE === "1";

let viewport = { width: 1440, height: 900 };
if (process.env.CAPTURE_VIEWPORT) {
  try {
    viewport = { ...viewport, ...JSON.parse(process.env.CAPTURE_VIEWPORT) };
  } catch {
    console.warn("CAPTURE_VIEWPORT JSON invalid, using default");
  }
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport,
  locale: "ru-RU",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
});
const page = await context.newPage();

await page.goto(url, { waitUntil: "load", timeout: 120000 });

await page.waitForSelector("h1", { timeout: 90000 });

try {
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".preloader, .preloader-box, [class*='preloader']");
      if (!el) return true;
      const st = getComputedStyle(el);
      return st.display === "none" || st.visibility === "hidden" || st.opacity === "0";
    },
    { timeout: 45000 }
  );
} catch {
  // ignore
}

await new Promise((r) => setTimeout(r, 2500));

await page.evaluate(async () => {
  const step = Math.max(200, Math.floor(window.innerHeight * 0.85));
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((res) => setTimeout(res, 120));
  }
  window.scrollTo(0, 0);
});

await new Promise((r) => setTimeout(r, 800));

let html = await page.content();

if (rewrite) {
  html = html
    .replaceAll("http://127.0.0.1:4333", "https://serenity.agency")
    .replaceAll("http://localhost:4333", "https://serenity.agency")
    .replaceAll("https://127.0.0.1:4333", "https://serenity.agency")
    .replaceAll("https://localhost:4333", "https://serenity.agency");
}

function assetOrigin() {
  const manual = process.env.CAPTURE_BASE_HREF?.trim();
  if (manual) return manual.replace(/\/+$/, "");
  if (rewrite) return "https://serenity.agency";
  try {
    return new URL(url).origin;
  } catch {
    return "https://serenity.agency";
  }
}

const origin = assetOrigin();
html = stripBaseTag(html);
html = fixMirrorTypos(html);
if (process.env.MIRROR_STRIP_TRACKERS === "1") html = stripMirrorTrackers(html);
html = absolutizeStaticAssets(html, origin);
html = injectWebpackPublicPath(html, origin);
html = stripFontPreloadCrossorigin(html);
html = rewriteSvgsetToLocal(html, origin);
html = relaxMirrorHeader(html);
html = injectMirrorDesktopNavFix(html);
html = injectMirrorBandArtifactFix(html);

fs.writeFileSync(outFile, html, "utf8");
try {
  await writeSvgsetFromOrigin(origin, path.join(outDir, "svgset.svg"));
} catch (e) {
  console.warn("svgset.svg:", e.message);
}
await browser.close();

console.log(`OK: wrote ${outFile} (${Math.round(html.length / 1024)} KB) from ${url}`);
