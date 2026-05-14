/**
 * Снятие эталонных метрик блока «Награды» с прод-страницы (Nuxt) для сверки с локалкой.
 * Запуск: node scripts/debug-awards-parity.cjs
 * Локалка: SERENITY_AWARDS_LOCAL_URL=http://127.0.0.1:8895/ node scripts/debug-awards-parity.cjs
 */

const { chromium } = require("playwright");

const PROD_URL = "https://serenity.agency/kontekstnaya_reklama";
const LOCAL_URL = process.env.SERENITY_AWARDS_LOCAL_URL || "";

async function harvest(page, label) {
  await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  const h = await page.locator("#home-awards-heading");
  if (!(await h.count())) {
    console.log(label, "NO_AWARDS_HEADING");
    return null;
  }
  await h.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const root =
      document.querySelector(".home-awards-block") ||
      document.querySelector(".awards")?.closest("section")?.parentElement;
    const swiperEl = document.querySelector(".home-awards-swiper");
    const slide = document.querySelector(".home-awards-swiper .swiper-slide");
    const card = slide?.querySelector(".awards__card");
    const info = card?.querySelector(".awards__card-info");
    const desc = card?.querySelector(".awards__card-description");
    const imgs = card ? [...card.querySelectorAll(".awards__card-img")] : [];
    const prev = document.querySelector(".home-awards-block .awards__prev");
    const next = document.querySelector(".home-awards-block .awards__next");
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        opacity: cs.opacity,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        position: cs.position,
        top: cs.top,
        left: cs.left,
        width: cs.width,
        zIndex: cs.zIndex,
      };
    };
    return {
      url: location.href,
      root: pick(root),
      swiper: pick(swiperEl),
      slide: pick(slide),
      card: pick(card),
      info: pick(info),
      desc: pick(desc),
      img0: pick(imgs[0]),
      img1: pick(imgs[1]),
      prev: pick(prev),
      next: pick(next),
      slideCount: document.querySelectorAll(".home-awards-swiper .swiper-slide").length,
    };
  });
}

async function harvestLocal(page, url) {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);
  const h = page.locator("#home-awards-heading");
  if (!(await h.count())) {
    return { error: "no_heading" };
  }
  await h.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const root = document.querySelector(".home-awards-block");
    const swiperEl =
      document.querySelector("#sa-home-awards-mounted .swiper-container-clients-new") ||
      document.querySelector(".home-awards-swiper");
    const slide =
      document.querySelector("#sa-home-awards-mounted .clients-new__slide") ||
      document.querySelector(".home-awards-swiper .swiper-slide");
    const card = slide?.querySelector(".awards__card");
    const info = card?.querySelector(".awards__card-info");
    const desc = card?.querySelector(".awards__card-description");
    const imgs = card ? [...card.querySelectorAll(".awards__card-img")] : [];
    const prev = document.querySelector(".home-awards-block .awards__prev");
    const next = document.querySelector(".home-awards-block .awards__next");
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        opacity: cs.opacity,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        position: cs.position,
        top: cs.top,
        left: cs.left,
        width: cs.width,
        zIndex: cs.zIndex,
      };
    };
    return {
      url: location.href,
      root: pick(root),
      swiper: pick(swiperEl),
      slide: pick(slide),
      card: pick(card),
      info: pick(info),
      desc: pick(desc),
      img0: pick(imgs[0]),
      img1: pick(imgs[1]),
      prev: pick(prev),
      next: pick(next),
      slideCount: (() => {
        const localStrip = document.querySelectorAll("#sa-home-awards-mounted .clients-new__slide").length;
        if (localStrip) return localStrip;
        return document.querySelectorAll(".home-awards-swiper .swiper-slide").length;
      })(),
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const prod = await harvest(page, "prod");
    console.log("=== PROD (kontekstnaya_reklama) ===\n", JSON.stringify(prod, null, 2));
    if (LOCAL_URL) {
      const loc = await harvestLocal(page, LOCAL_URL);
      console.log("\n=== LOCAL ===\n", JSON.stringify(loc, null, 2));
    } else {
      console.log("\n(LOCAL skip: set SERENITY_AWARDS_LOCAL_URL=http://127.0.0.1:8895/)");
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
