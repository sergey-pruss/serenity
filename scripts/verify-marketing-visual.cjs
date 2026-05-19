#!/usr/bin/env node
/**
 * Визуальные проверки /services/marketing (5 итераций parity с kontekst/targeting).
 * Запуск: npm run test:marketing-visual
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.MARKETING_VISUAL_PORT || 18995);
const URL = `http://127.0.0.1:${PORT}/services/marketing`;
const SHOT_DIR = path.join(root, "tmp", "marketing-visual");

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function resolveStaticFile(urlPath) {
  let p = urlPath.split("?")[0];
  if (p === "/services/marketing" || p === "/services/marketing/") {
    return path.join(root, "services", "marketing", "index.html");
  }
  if (p.startsWith("/_sa/")) p = p.slice("/_sa".length);
  if (!p || p === "/") return path.join(root, "services", "marketing", "index.html");
  const rel = p.replace(/^\/+/, "");
  const full = path.join(root, rel);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = resolveStaticFile(req.url || "/");
      if (!file) {
        res.writeHead(404);
        return res.end("404");
      }
      res.setHeader("Content-Type", mimes[path.extname(file).toLowerCase()] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function runIteration(page, n) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const g = (s) => document.querySelector(s)?.getBoundingClientRect();
    const hero = g(".jumbotron-img-aurora__title");
    const gridEl = document.querySelector(".content-block__grid.content-block__grid--desc");
    const grid = gridEl?.getBoundingClientRect();
    const bullet = document.querySelector(
      ".marketing-kontekst-section .numbered-header:not(.number-header__empty) .numbered-header__bullet",
    );
    const bulletRect = bullet?.getBoundingClientRect();
    const canvas = document.querySelector("#gradient-canvas");
    const legacy = document.querySelector(".cm-page, .cm-about, .grid_three");
    const h1 = document.querySelector("h1")?.textContent?.trim();
    const sections = document.querySelectorAll(".marketing-kontekst-section").length;
    const gridCols = gridEl ? getComputedStyle(gridEl).display : "";
    const gridVisible =
      gridEl instanceof Element &&
      gridCols !== "none" &&
      gridEl.offsetHeight > 40;
    const heroTitleGap = (() => {
      const jumbotron =
        document.querySelector(".marketing-hero-section .header-background.desctop .jumbotron") ||
        document.querySelector(".marketing-hero-section .jumbotron");
      if (!jumbotron) return -1;
      const h1 = jumbotron.querySelector(".jumbotron-img-aurora__title");
      const sub = jumbotron.querySelector(".jumbotron-img-aurora__subtitle");
      if (!h1 || !sub) return -1;
      const hr = h1.getBoundingClientRect();
      const sr = sub.getBoundingClientRect();
      if (hr.height < 1 || sr.height < 1) return -1;
      return sr.top - hr.bottom;
    })();

    const heroSolidBg = (() => {
      const hero = document.querySelector(".marketing-hero-section");
      if (!hero) return false;
      const bg = getComputedStyle(hero).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      return Number(m[1]) === 25 && Number(m[2]) === 26 && Number(m[3]) === 27;
    })();

    const headerDarkBg = (() => {
      const line = document.querySelector(".header .header__top-line");
      if (!line) return false;
      const bg = getComputedStyle(line).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      return r === 25 && g === 26 && b === 27;
    })();

    const firstGrid = document.querySelector(
      ".marketing-kontekst-section .content-block__grid--desc.blocks",
    );
    const gridCols3 = firstGrid ? [...firstGrid.querySelectorAll(":scope > .col-4")] : [];
    const colWidths = gridCols3.map((el) => el.getBoundingClientRect().width);
    const threeColumnGrid =
      gridCols3.length >= 3 &&
      colWidths.every((w) => w > 200) &&
      colWidths[0] + colWidths[1] < window.innerWidth * 0.95;

    const promoSection = [...document.querySelectorAll(".marketing-kontekst-section")].find((s) =>
      (s.querySelector(".numbered-header__title")?.textContent || "").includes("Измеримое продвижение"),
    );
    const promoCols = promoSection
      ? [...promoSection.querySelectorAll(".content-block__grid--desc > .col-4")]
      : [];
    const promoCounts = promoCols.map((c) => c.querySelectorAll(".block-item").length);
    const promoBalanced =
      promoCols.length === 3 &&
      promoCounts.length === 3 &&
      Math.max(...promoCounts) - Math.min(...promoCounts) <= 1;
    const heroSec = document.querySelector(".marketing-hero-section");
    const sliderWrap = document.querySelector(".mor-cases-slider-wrapper.more-cases--active");
    const slideText =
      sliderWrap && getComputedStyle(sliderWrap).display !== "none"
        ? sliderWrap.querySelector(".mor-cases-slide__text")
        : null;
    const hr = heroSec?.getBoundingClientRect();
    const sr = slideText?.getBoundingClientRect();
    const casesBelowHero = !hr || !slideText || !sr || sr.top >= hr.bottom - 24;
    const awardsCards = document.querySelectorAll(".awards__card").length;
    const sliderHidden =
      document.querySelector(".mor-cases-slider-wrapper.more-cases--active") &&
      getComputedStyle(document.querySelector(".mor-cases-slider-wrapper.more-cases--active")).display ===
        "none";
    const hasHomeCasesAuto = [...document.scripts].some((s) => s.src.includes("home-cases-auto"));
    return {
      h1,
      heroW: hero?.width || 0,
      gridW: grid?.width || 0,
      blockItems: document.querySelectorAll(".block-item").length,
      bulletW: bulletRect?.width || 0,
      headerEmpty: !!document.querySelector(".marketing-kontekst-section .number-header__empty"),
      hasLegacy: !!legacy,
      sections,
      hasTeam: !!document.querySelector(".marketing-team-section, .team-block"),
      bodyColor: getComputedStyle(document.body).color,
      gridDisplay: gridCols,
      gridVisible,
      threeColumnGrid,
      gridColCount: gridCols3.length,
      heroTitleGap,
      heroSolidBg,
      headerDarkBg,
      hasGradientCanvas: !!document.querySelector("#gradient-canvas"),
      promoBalanced,
      promoColCounts: promoCounts.join(","),
      casesBelowHero,
      awardsCards,
      sliderHiddenDesktop: sliderHidden,
      hasHomeCasesAuto,
    };
  });

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `iter-${n}-1440.png`), fullPage: false });

  assert(metrics.h1?.includes("Комплексный маркетинг"), `итерация ${n}: H1`);
  assert(metrics.heroW > 200, `итерация ${n}: hero title width ${metrics.heroW}`);
  assert(metrics.heroTitleGap >= 36 && metrics.heroTitleGap <= 48, `итерация ${n}: зазор h1→описание ${metrics.heroTitleGap}px (ожид. ~40)`);
  assert(metrics.heroSolidBg, `итерация ${n}: hero не #191a1b`);
  assert(!metrics.hasGradientCanvas, `итерация ${n}: лишний gradient-canvas`);
  assert(metrics.headerDarkBg, `итерация ${n}: шапка не #191a1b`);
  assert(metrics.gridVisible, `итерация ${n}: desc-сетка скрыта (display=${metrics.gridDisplay})`);
  assert(metrics.threeColumnGrid, `итерация ${n}: не 3 колонки (cols=${metrics.gridColCount})`);
  assert(metrics.promoBalanced, `итерация ${n}: продвижение — не 3 колонки (${metrics.promoColCounts})`);
  assert(
    metrics.gridW > 600,
    `итерация ${n}: grid width ${metrics.gridW}px (cards ${metrics.blockItems})`,
  );
  if (!metrics.headerEmpty) {
    assert(metrics.bulletW > 0, `итерация ${n}: numbered-header bullet`);
  }
  assert(!metrics.hasLegacy, `итерация ${n}: нет legacy cm-page/cm-about`);
  assert(metrics.sections >= 5, `итерация ${n}: секций content-block ${metrics.sections}`);
  assert(!metrics.hasTeam, `итерация ${n}: секция «Команда» убрана`);
  assert(metrics.casesBelowHero, `итерация ${n}: текст кейсов не наезжает на hero`);
  assert(metrics.awardsCards >= 3, `итерация ${n}: награды в DOM (${metrics.awardsCards})`);
  assert(metrics.sliderHiddenDesktop, `итерация ${n}: слайдер скрыт на desktop (сетка)`);
  assert(!metrics.hasHomeCasesAuto, `итерация ${n}: нет home-cases-auto.js`);

  console.log(`  итерация ${n}/5: ok (секций ${metrics.sections}, grid ${Math.round(metrics.gridW)}px)`);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log("verify-marketing-visual:", URL);
    for (let i = 1; i <= 5; i += 1) {
      await runIteration(page, i);
    }
    console.log("verify-marketing-visual: 5/5 ok, скриншоты в", SHOT_DIR);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error("verify-marketing-visual:", e.message || e);
  process.exit(1);
});
