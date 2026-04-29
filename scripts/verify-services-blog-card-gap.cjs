/**
 * Визуальный ритм: расстояние от низа текстового ряда шапки (max низ заголовка и подписи)
 * до верха первого слайда — одинаково для «Услуги» и «Блог».
 * У .services__text нижний padding входит в getBoundingClientRect().bottom у блока,
 * у блога margin-bottom шапки — снаружи, поэтому сравниваем не низ border-box контейнеров,
 * а низ контентных строк.
 *
 * SLIDER_TEST_URL=http://127.0.0.1:4322/ node scripts/verify-services-blog-card-gap.cjs
 */
const { chromium } = require("playwright");

const URL = process.env.SLIDER_TEST_URL || "http://127.0.0.1:4322/";
const TOL = 2.5;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function measureServicesGap(page) {
  return page.evaluate(() => {
    const title = document.querySelector(".services__title");
    const desc = document.querySelector(".services__description");
    const bottomEl = document.querySelector(
      ".services__context-wrapper .swiper-slide, .services__context-wrapper .services__slide",
    );
    if (!title || !desc || !bottomEl) return { ok: false, gap: null, reason: "missing node" };
    const y = Math.max(title.getBoundingClientRect().bottom, desc.getBoundingClientRect().bottom);
    const b = bottomEl.getBoundingClientRect();
    return { ok: true, gap: Math.round((b.top - y) * 100) / 100 };
  });
}

async function measureBlogGap(page) {
  return page.evaluate(() => {
    const title = document.querySelector(".blog-block__header-title");
    const sub = document.querySelector(".blog-block__header-subtitle");
    const bottomEl = document.querySelector(".blog-block__swiper-container .swiper-slide");
    if (!title || !sub || !bottomEl) return { ok: false, gap: null, reason: "missing node" };
    const y = Math.max(title.getBoundingClientRect().bottom, sub.getBoundingClientRect().bottom);
    const b = bottomEl.getBoundingClientRect();
    return { ok: true, gap: Math.round((b.top - y) * 100) / 100 };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const widths = [1440, 1200, 1000, 768, 480];

  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 1100 } });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(500);

    await page.locator(".services-section").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const services = await measureServicesGap(page);

    await page.locator(".blog-block-mainstr").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const blog = await measureBlogGap(page);

    console.log(`--- ${w}px`, JSON.stringify({ services, blog }, null, 2));

    assert(services.ok, `${w}px услуги: ${services.reason}`);
    assert(blog.ok, `${w}px блог: ${blog.reason}`);
    const diff = Math.abs(services.gap - blog.gap);
    assert(
      diff <= TOL,
      `${w}px зазор шапка→карточка: услуги ${services.gap}px, блог ${blog.gap}px, Δ=${diff} (допуск ${TOL})`,
    );

    await page.close();
  }

  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  console.log("verify-services-blog-card-gap: OK");
  await browser.close();
}

run().catch((err) => {
  console.error(`verify-services-blog-card-gap: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});
