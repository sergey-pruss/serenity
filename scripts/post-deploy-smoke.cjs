#!/usr/bin/env node
const { chromium } = require("playwright");

const DEFAULT_URLS = [
  "https://serenity.agency/",
  "https://static.serenity.agency/",
  "https://serenity.sergeyprus.workers.dev/",
];
const URLS = process.env.SMOKE_URLS
  ? process.env.SMOKE_URLS.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_URLS;

const VIEWPORT = { width: 1366, height: 900 };

const HANDBOOK_PATH = "/docs/team-handbook.html";
/** На превью static иногда стоит gate (401 без учёток в CI) — не валим весь smoke. */
const STATIC_PREVIEW_HOST = "static.serenity.agency";
/** Уникальный маркер страницы handbook (не главная index.html). */
const HANDBOOK_MARKER = "Serenity — структура проекта, URL и проверки";
/** Типичный <title> главной — если он в ответе по /docs/…, nginx отдал SPA-fallback. */
const MAIN_INDEX_TITLE_SNIPPET = "Маркетинговое агентство Serenity. Профессиональные";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkHandbookDeployedAtOrigins() {
  const origins = [...new Set(URLS.map((u) => new URL(u).origin))];
  for (const origin of origins) {
    const url = `${origin}${HANDBOOK_PATH}`;
    const res = await fetch(url, { redirect: "follow" });
    const host = new URL(url).hostname;
    if (res.status === 401 && host === STATIC_PREVIEW_HOST) {
      console.log(
        `SKIP handbook ${url}: HTTP 401 на static-превью (gate). Полная проверка /docs/ — npm run test:post-deploy-smoke`,
      );
      continue;
    }
    const text = await res.text();
    assert(res.ok, `handbook ${url}: HTTP ${res.status}`);
    assert(
      text.includes(HANDBOOK_MARKER),
      `handbook ${url}: нет маркера справочника — часто значит нет файла на диске и nginx отдал /index.html; сделайте bash scripts/deploy-prod.sh и при необходимости bash scripts/deploy-static-vhost.sh`
    );
    assert(
      !text.includes(MAIN_INDEX_TITLE_SNIPPET),
      `handbook ${url}: пришла главная index.html вместо handbook (проверьте deploy-prod.sh и vhost static с location ^~ /docs/)`
    );
    console.log(`OK handbook ${url}`);
  }
}

async function checkUrl(browser, url) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const failures = [];
  const pageErrors = [];
  const badAssetResponses = [];

  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("response", (res) => {
    try {
      const status = res.status();
      if (!(status === 404 || status >= 500)) return;
      const u = res.url();
      if (!u.includes("/_sa/")) return;
      if (!u.startsWith(new URL(url).origin)) return;
      badAssetResponses.push(`${status} ${u}`);
    } catch (_) {}
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2200);

  const checks = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const qq = (sel) => Array.from(document.querySelectorAll(sel));

    const heroBlock = q(".video-block");
    const heroVideo = q(".video-block .video-iframe");
    const heroPoster = q(".video-block .hero-video-poster-layer");
    const servicesHost = q(".services__context-slider");
    const servicesPrev = servicesHost?.querySelector(".swiper-button-prev");
    const servicesNext = servicesHost?.querySelector(".swiper-button-next");
    const citySelected = q(".footer-modern__city-selector a.selected");

    const arrowPseudo = (el) => {
      if (!el) return "";
      const bg = getComputedStyle(el, "::before").backgroundImage || "";
      return bg;
    };

    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || "1") > 0 && r.width > 10 && r.height > 10;
    };

    return {
      hero: {
        hasBlock: !!heroBlock,
        hasVideo: !!heroVideo,
        hasPoster: !!heroPoster,
        readyClass: heroBlock?.classList.contains("video-ready") || false,
        errorClass: heroBlock?.classList.contains("video-error") || false,
      },
      arrows: {
        prevVisible: visible(servicesPrev),
        nextVisible: visible(servicesNext),
        prevIcon: arrowPseudo(servicesPrev),
        nextIcon: arrowPseudo(servicesNext),
      },
      city: {
        selectedText: (citySelected?.textContent || "").trim(),
      },
      scripts: {
        appVersion: qq("script[src*='/_sa/js/app.js']").map((n) => n.getAttribute("src"))[0] || "",
      },
    };
  });

  try {
    assert(checks.hero.hasBlock && checks.hero.hasVideo && checks.hero.hasPoster, "hero block/video/poster not found");
    assert(!checks.hero.errorClass, "hero video-error class detected");
    assert(checks.arrows.prevVisible || checks.arrows.nextVisible, "services slider arrows are not visible");
    assert(checks.arrows.prevIcon.includes("slider-arrow-prev"), "prev arrow icon is missing");
    assert(checks.arrows.nextIcon.includes("slider-arrow-next"), "next arrow icon is missing");
    assert(
      checks.city.selectedText.toLowerCase().includes("моск"),
      `default city is not Москва: "${checks.city.selectedText}"`,
    );
    assert(!checks.scripts.appVersion || checks.scripts.appVersion.includes("?v="), "app.js is loaded without cache-busting query");
    assert(badAssetResponses.length === 0, `404/5xx for _sa assets: ${badAssetResponses.join(" | ")}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
    console.log(`OK ${url}`);
  } catch (err) {
    failures.push(err.message);
    console.error(`FAIL ${url}\n- ${failures.join("\n- ")}`);
    await page.close();
    throw err;
  }

  await page.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const url of URLS) {
      await checkUrl(browser, url);
    }
    await checkHandbookDeployedAtOrigins();
    console.log("post-deploy-smoke: OK");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(`post-deploy-smoke: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});
