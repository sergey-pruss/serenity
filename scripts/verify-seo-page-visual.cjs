#!/usr/bin/env node
/**
 * Playwright: /seo — кейсы, форма (ширина), команда (сетка/слайдер).
 * ORIGIN=http://127.0.0.1:8895 node scripts/verify-seo-page-visual.cjs
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const URL = `${BASE}/seo`;
const REF_FORM = `${BASE}/kompleksnoye-prodvizheniye`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function measureForm(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#sa-inline-lead-root");
    const container = document.querySelector(".sa-service-lead-section__container");
    if (!root || !container) return null;
    const rr = root.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return {
      rootW: Math.round(rr.width),
      containerW: Math.round(cr.width),
      rootLeft: Math.round(rr.left),
      containerLeft: Math.round(cr.left),
    };
  });
}

async function measureCases(page) {
  return page.evaluate(() => {
    const blocks = [...document.querySelectorAll(".cases-block")];
    let visible = 0;
    let withActive = 0;
    for (const b of blocks) {
      const slide = b.querySelector(".cases-block__swiper-slide.swiper-slide-active");
      const img = b.querySelector(
        ".cases-block__swiper-slide.swiper-slide-active .cases-block__swiper-slide-contant-image",
      );
      const cont = b.querySelector(".cases-block__swiper-slide-contant");
      const h = cont ? cont.offsetHeight : 0;
      if (slide && img && img.offsetHeight > 40 && h > 80) visible += 1;
      if (slide) withActive += 1;
    }
    return { blocks: blocks.length, visible, withActive };
  });
}

async function measureTeam(page) {
  return page.evaluate(() => {
    const section = document.querySelector(".seo-team-section");
    const host = section && section.querySelector(".team__members-slider");
    const track = section && section.querySelector(".team__members-track");
    const cards = section
      ? [...section.querySelectorAll(".team__member-card")].filter((c) => c.offsetHeight > 40)
      : [];
    const imgs = section
      ? [...section.querySelectorAll(".team__member-card img")].filter((i) => i.offsetHeight > 30)
      : [];
    const titles = section
      ? [...section.querySelectorAll(".team__member-card h4")].filter((h) => h.offsetHeight > 8)
      : [];
    return {
      hasSection: !!section,
      nativeRow: host ? host.getAttribute("data-native-row") : null,
      trackDisplay: track ? getComputedStyle(track).display : null,
      cards: cards.length,
      imgs: imgs.length,
      titles: titles.length,
    };
  });
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  assert(res && res.status() === 200, `HTTP ${res && res.status()}`);

  await page.waitForTimeout(800);

  const cases = await measureCases(page);
  assert(cases.blocks >= 1, "есть .cases-block");
  assert(cases.withActive >= 1, "кейсы: есть swiper-slide-active");
  assert(cases.visible >= 1, `кейсы видимы: ${cases.visible}/${cases.blocks}`);

  const teamSection = page.locator(".seo-team-section");
  await teamSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const team = await measureTeam(page);
  assert(team.hasSection, "есть .seo-team-section");
  assert(team.titles >= 3, `команда: карточек с заголовком ${team.titles}`);
  assert(team.imgs >= 3, `команда: фото ${team.imgs}`);
  if (page.viewportSize().width >= 1025) {
    assert(team.nativeRow === "1", "команда: data-native-row на десктопе");
    assert(team.trackDisplay === "flex", `команда: track display ${team.trackDisplay}`);
  }

  await page.locator(".sa-service-lead-section").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const seoForm = await measureForm(page);
  assert(seoForm, "форма SEO");
  const refPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await refPage.goto(REF_FORM, { waitUntil: "networkidle", timeout: 60000 });
  await refPage.waitForTimeout(800);
  const refForm = await measureForm(refPage);
  assert(refForm, "форма kompleksnoye");
  const dw = Math.abs(seoForm.containerW - refForm.containerW);
  assert(dw <= 24, `ширина контейнера формы: seo ${seoForm.containerW} vs ref ${refForm.containerW} (Δ${dw})`);

  await page.screenshot({ path: "tmp/seo-verify-team-form-1440.png", fullPage: false });
  await browser.close();
  console.log("verify-seo-page-visual: ok", { cases, team, seoForm, refForm });
}

run().catch((e) => {
  console.error("verify-seo-page-visual:", e.message || e);
  process.exit(1);
});
