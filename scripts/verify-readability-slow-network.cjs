/**
 * Медленная загрузка img: текст «Мы любим маркетинг» остаётся видимым (swap + fallback),
 * у ленты клиентов есть подписи .clients-new__label до загрузки логотипов.
 *
 * SLIDER_TEST_URL=http://127.0.0.1:8767/ node scripts/verify-readability-slow-network.cjs
 */
const { chromium } = require("playwright");

const URL = process.env.SLIDER_TEST_URL || "http://127.0.0.1:4322/";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.route("**/_sa/img/**", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".clients-new__label", { timeout: 15000 });

  const lm = await page.evaluate(() => {
    const el = document.querySelector(".live-marketing-block__title");
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily,
      opacity: cs.opacity,
      rectH: el.getBoundingClientRect().height,
      text: (el.textContent || "").trim(),
    };
  });
  assert(lm, "live-marketing title missing");
  assert(lm.text.includes("Мы любим"), "live-marketing title text");
  assert(lm.rectH > 12, `live-marketing title height ${lm.rectH}`);
  assert(
    /Museo|system-ui|ui-sans|Segoe|Roboto|sans-serif|Apple/i.test(lm.fontFamily),
    `unexpected font stack: ${lm.fontFamily}`,
  );

  await page.waitForTimeout(100);
  const clients = await page.evaluate(() => {
    const host = document.querySelector(".swiper-container-clients-new");
    const labels = host ? [...host.querySelectorAll(".clients-new__label")] : [];
    const first = labels[0];
    return {
      labelCount: labels.length,
      firstText: first ? first.textContent.trim() : "",
      firstImgAlt: host ? host.querySelector(".clients-new__slide img")?.getAttribute("alt") || "" : "",
    };
  });
  assert(clients.labelCount >= 12, `expected labels, got ${clients.labelCount}`);
  assert(clients.firstText.length > 0, "first client label empty");
  assert(
    clients.firstImgAlt.startsWith("Логотип:"),
    `first img alt should start with Логотип:, got ${clients.firstImgAlt}`,
  );

  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  console.log("verify-readability-slow-network: OK");
  await browser.close();
}

run().catch((err) => {
  console.error(`verify-readability-slow-network: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});
