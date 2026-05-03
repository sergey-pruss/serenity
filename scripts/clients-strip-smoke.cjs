/**
 * Смоук-тест: «Наши клиенты» — автодрейф scrollLeft, реакция на горизонтальный wheel.
 * Запуск: SLIDER_TEST_URL=http://127.0.0.1:8765/ node scripts/clients-strip-smoke.cjs
 */
const { chromium } = require("playwright");

const URL = process.env.SLIDER_TEST_URL || "http://127.0.0.1:8765/";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function readStrip(page) {
  return page.evaluate(() => {
    const host = document.querySelector(".swiper-container-clients-new");
    const track = document.querySelector(".clients-new__context-wrapper");
    if (!host || !track) return null;
    const cur = getComputedStyle(host).cursor;
    return {
      hasStrip: host.classList.contains("clients-strip"),
      hasClientsStrip: host.dataset.clientsStrip === "1",
      scrollLeft: track.scrollLeft,
      cursor: cur,
    };
  });
}

async function readScrollLeft(page) {
  return page.evaluate(() => {
    const track = document.querySelector(".clients-new__context-wrapper");
    if (!track) return null;
    return { raw: "scrollLeft", x: track.scrollLeft, y: 0 };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.locator(".swiper-container-clients-new").scrollIntoViewIfNeeded();

  const a = await readStrip(page);
  assert(a, "clients host/track not found");
  assert(a.hasStrip === true, "host must have clients-strip class");
  assert(a.hasClientsStrip === true, "host must be initialized (data-clients-strip)");
  assert(typeof a.cursor === "string", `cursor must be a string, got ${a.cursor}`);

  const t0 = await readScrollLeft(page);
  assert(t0, "scrollLeft read failed");
  await page.waitForTimeout(1400);
  const t1 = await readScrollLeft(page);
  assert(t1, "scrollLeft read failed 2");
  const dx = Math.abs((t1.x || 0) - (t0.x || 0));
  assert(dx > 3, `autoscroll: scrollLeft should move (|Δ|=${dx}): ${t0.x} -> ${t1.x}`);

  const beforeWheel = (await readScrollLeft(page)).x || 0;
  await page.locator(".clients-new__context-wrapper").hover();
  await page.mouse.wheel(120, 0);
  await page.waitForTimeout(200);
  const afterWheel = (await readScrollLeft(page)).x || 0;
  assert(
    Math.abs(afterWheel - beforeWheel) > 1,
    "horizontal wheel over clients strip should change scrollLeft",
  );

  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  console.log("clients-strip-smoke: OK");
  await browser.close();
}

run().catch((err) => {
  console.error(`clients-strip-smoke: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});
