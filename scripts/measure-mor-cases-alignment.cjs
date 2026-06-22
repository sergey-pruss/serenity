/**
 * Замер выравнивания «Кейсы»: левый край заголовка vs первая карточка (ожидание diff ≈ 0 на мобилке).
 * SLIDER_TEST_URL=https://static.serenity.agency/ node scripts/measure-mor-cases-alignment.cjs
 */
const { chromium } = require("playwright");

const BASE = (process.env.SLIDER_TEST_URL || "https://static.serenity.agency").replace(/\/$/, "");
const PATHS = process.env.MOR_CASES_PATHS
  ? process.env.MOR_CASES_PATHS.split(",").map((p) => p.trim())
  : ["/", "/kontekstnaya_reklama", "/korporativnyj_sajt", "/sozdanie-internet-magazina"];

const WIDTH = Number(process.env.MOR_CASES_VIEWPORT_W || 390);
const MAX_DIFF = Number(process.env.MOR_CASES_MAX_DIFF_PX || 2);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function measurePage(page, path) {
  const url = `${BASE}${path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const heading =
      document.querySelector(".more-case-wr__slider-heading") ||
      document.querySelector(".cases-block__header-title");
    const host = document.querySelector(".mor-cases-slider");
    const slide = document.querySelector(".mor-cases-slide");
    const track = host?.querySelector(".swiper-wrapper");
    if (!heading || !host || !slide || !track) {
      return { ok: false, reason: "missing nodes" };
    }
    heading.scrollIntoView({ block: "center" });
    const h = heading.getBoundingClientRect();
    const s = slide.getBoundingClientRect();
    const csHost = getComputedStyle(host);
    const csTrack = getComputedStyle(track);
    const csWr = getComputedStyle(document.querySelector(".more-case-wr") || host);
    return {
      ok: true,
      nativeRow: host.dataset.nativeRow || "",
      morCasesInit: host.dataset.morCasesInit || "",
      headingLeft: Math.round(h.left),
      slideLeft: Math.round(s.left),
      diff: Math.round(s.left - h.left),
      hostMarginLeft: csHost.marginLeft,
      trackPaddingLeft: csTrack.paddingLeft,
      moreCaseWrOverflow: csWr.overflowX,
      hostOverflow: csHost.overflowX,
      scrollMax: Math.max(0, track.scrollWidth - track.clientWidth),
    };
  });

  return { path, url, ...data };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 844 } });
  const results = [];
  let failed = false;

  for (const path of PATHS) {
    try {
      const r = await measurePage(page, path);
      results.push(r);
      console.log(JSON.stringify(r, null, 2));
      if (!r.ok) {
        failed = true;
        console.error(`FAIL ${path}: ${r.reason}`);
        continue;
      }
      if (r.nativeRow !== "1") {
        failed = true;
        console.error(`FAIL ${path}: data-native-row not set (got "${r.nativeRow}")`);
      }
      if (Math.abs(r.diff) > MAX_DIFF) {
        failed = true;
        console.error(`FAIL ${path}: heading/slide diff ${r.diff}px (max ${MAX_DIFF})`);
      }
    } catch (e) {
      failed = true;
      console.error(`FAIL ${path}:`, e.message || e);
    }
  }

  await browser.close();
  if (failed) process.exit(1);
  console.log(`OK: all ${PATHS.length} pages, viewport ${WIDTH}px, diff ≤ ${MAX_DIFF}px`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
