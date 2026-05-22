#!/usr/bin/env node
/**
 * Визуальные инварианты /services/marketing (targeting-каркас, Результат1).
 * npm run test:marketing-visual
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
  await page.waitForTimeout(600);

  const metrics = await page.evaluate(() => {
    const pc = document.querySelector(".page-constructor.targeting-page");
    const h1 = document.querySelector(".c-title-block__title");
    const h1r = h1?.getBoundingClientRect();
    const sub = document.querySelector(".c-title-block__subtitle");
    const titleGap = h1r && sub ? sub.getBoundingClientRect().top - h1r.bottom : -1;
    const gridEl = pc?.querySelector(".content-block__grid.content-block__grid--desc");
    const grid = gridEl?.getBoundingClientRect();
    const gridCols = gridEl ? getComputedStyle(gridEl).display : "";
    const gridVisible =
      gridEl instanceof Element && gridCols !== "none" && gridEl.offsetHeight > 40;
    const col4 = gridEl ? [...gridEl.querySelectorAll(":scope > .col-4")] : [];
    const colWidths = col4.map((el) => el.getBoundingClientRect().width);
    const threeColumnGrid =
      col4.length >= 3 &&
      colWidths.every((w) => w > 180) &&
      colWidths[0] + colWidths[1] < window.innerWidth * 0.95;
    const bullet = pc?.querySelector(".numbered-header__bullet");
    const sections = pc?.querySelectorAll(".page-constructor__section").length || 0;
    const stratH2 = [...document.querySelectorAll("h2")].find((e) =>
      (e.textContent || "").includes("Стратегия"),
    );
    const stratBlock = stratH2?.closest(".content-block");
    const stratDesc = stratBlock?.querySelector(".content-block__grid--desc");
    const stratSlider = stratBlock?.querySelector(".content-block__slider");
    const cmWide = document.querySelector(".marketing-cm-wide-slider");
    const awareness = document.querySelector(".marketing-brand-awareness-grid");
    const casesSec = document.querySelector(".marketing-cases-section");
    const awardsCards = document.querySelectorAll(".awards__card").length;
    const synergyRoot = document.querySelector(".kontekst-synergy-root, .marketing-synergy-diagram");
    const caseSliderHero = document.querySelector(".case-slider__wrapper");
    const team = document.querySelector(".team-block, .marketing-team-section");

    return {
      h1: h1?.textContent?.trim(),
      h1W: h1r?.width || 0,
      titleGap,
      gridW: grid?.width || 0,
      gridVisible,
      threeColumnGrid,
      gridColCount: col4.length,
      bulletW: bullet?.getBoundingClientRect().width || 0,
      sections,
      blockItems: pc?.querySelectorAll(".block-item").length || 0,
      stratDescVisible: stratDesc && getComputedStyle(stratDesc).display !== "none",
      stratHasSlider: !!stratSlider,
      hasCmWide: !!cmWide,
      hasAwarenessGrid: !!awareness,
      hasCases: !!casesSec,
      awardsCards,
      hasSynergy: !!synergyRoot,
      hasHeroSlider: !!caseSliderHero,
      hasTeam: !!team,
      isTargeting: !!pc,
    };
  });

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `iter-${n}-1440.png`), fullPage: false });

  assert(metrics.isTargeting, `итерация ${n}: .targeting-page`);
  assert(metrics.h1?.includes("Комплексный маркетинг"), `итерация ${n}: H1`);
  assert(metrics.h1W > 200, `итерация ${n}: H1 width ${metrics.h1W}`);
  assert(metrics.titleGap >= 8 && metrics.titleGap < 120, `итерация ${n}: зазор h1→subtitle ${metrics.titleGap}px`);
  assert(metrics.gridVisible, `итерация ${n}: desc-сетка скрыта`);
  assert(metrics.threeColumnGrid, `итерация ${n}: не 3 колонки (${metrics.gridColCount})`);
  assert(metrics.gridW > 600, `итерация ${n}: grid ${metrics.gridW}px`);
  assert(metrics.bulletW > 0, `итерация ${n}: numbered bullet`);
  assert(metrics.sections >= 12, `итерация ${n}: мало секций (${metrics.sections})`);
  assert(metrics.blockItems >= 20, `итерация ${n}: block-item ${metrics.blockItems}`);
  assert(metrics.stratDescVisible, `итерация ${n}: стратегия desc-сетка`);
  assert(!metrics.stratHasSlider, `итерация ${n}: слайдер в стратегии`);
  assert(metrics.hasCmWide, `итерация ${n}: cm-wide-slider`);
  assert(metrics.hasAwarenessGrid, `итерация ${n}: brand-awareness grid`);
  assert(metrics.hasCases, `итерация ${n}: кейсы`);
  assert(metrics.awardsCards >= 3, `итерация ${n}: награды (${metrics.awardsCards})`);
  assert(!metrics.hasSynergy, `итерация ${n}: синергия`);
  assert(!metrics.hasHeroSlider, `итерация ${n}: case-slider в hero`);
  assert(!metrics.hasTeam, `итерация ${n}: команда`);

  console.log(
    `  итерация ${n}/3: ok (секций ${metrics.sections}, grid ${Math.round(metrics.gridW)}px, cards ${metrics.blockItems})`,
  );
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log("verify-marketing-visual:", URL);
    for (let i = 1; i <= 3; i += 1) {
      await runIteration(page, i);
    }
    console.log("verify-marketing-visual: 3/3 ok, скриншоты в", SHOT_DIR);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error("verify-marketing-visual:", e.message || e);
  process.exit(1);
});
