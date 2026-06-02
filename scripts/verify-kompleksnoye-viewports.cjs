#!/usr/bin/env node
/**
 * Playwright: /kompleksnoye-prodvizheniye — hero, сетка каналов, без Nuxt runtime.
 * ORIGIN=http://127.0.0.1:8895 node scripts/verify-kompleksnoye-viewports.cjs
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const URL = `${BASE}/kompleksnoye-prodvizheniye`;
const WIDTHS = [375, 768, 1024, 1440];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const res = await page.goto(URL, { waitUntil: "load", timeout: 30000 });
    assert(res && res.status() === 200, `${width}px: HTTP ${res && res.status()}`);

    const state = await page.evaluate(() => {
      const w = window.innerWidth;
      const isMobile = w <= 720;
      const sub = document.querySelector(".jumbotron-img-aurora__subtitle");
      const h2 = document.querySelector(".kompleksnoye-channels-block h2");
      const desktopBg = document.querySelector(".header-background.desctop");
      const mobileBg = document.querySelector(".header-background.mobile");
      const cb = document.querySelector(".kompleksnoye-channels-block .content-block");
      const block = document.querySelector(".kompleksnoye-channels-block");
      const desc = block && block.querySelector(".content-block__grid--desc");
      const tablet = block && block.querySelector(".content-block__grid--tablet");
      const grid = isMobile ? tablet : desc;
      const names = grid
        ? [...grid.querySelectorAll(".block__name")].filter((n) => n.offsetHeight > 8).length
        : 0;
      return {
        w,
        isMobile,
        hasSub: !!sub,
        gap:
          sub && h2 && !isMobile
            ? Math.round(h2.getBoundingClientRect().top - sub.getBoundingClientRect().bottom)
            : null,
        channelsPad: cb && !isMobile ? getComputedStyle(cb).paddingTop : null,
        desktopOn: desktopBg && getComputedStyle(desktopBg).display !== "none",
        mobileOn: mobileBg && getComputedStyle(mobileBg).display !== "none",
        inPage: !!document.querySelector(".kompleksnoye-prodvizheniye-page"),
        hasNuxtRoot: !!document.querySelector("#__nuxt"),
        gridDisplay: grid ? getComputedStyle(grid).display : "none",
        gridH: grid ? grid.offsetHeight : 0,
        names,
      };
    });

    assert(state.inPage, `${width}px: .kompleksnoye-prodvizheniye-page`);
    assert(!state.hasNuxtRoot, `${width}px: нет #__nuxt в DOM`);
    assert(state.hasSub, `${width}px: подзаголовок hero`);
    assert(state.w === width, `${width}px: viewport ${state.w}`);

    if (!state.isMobile) {
      assert(state.desktopOn, `${width}px: desktop hero`);
      assert(state.gap >= 180 && state.gap <= 320, `${width}px: зазор подзаголовок→каналы ${state.gap}px`);
      assert(state.channelsPad === "0px", `${width}px: channels padding-top ${state.channelsPad}`);
    } else {
      assert(state.mobileOn, `${width}px: mobile hero`);
    }

    assert(state.gridDisplay !== "none" && state.gridH > 80, `${width}px: сетка каналов h=${state.gridH}`);
    assert(state.names >= 4, `${width}px: карточек каналов ${state.names}`);

    await page.close();
  }
  await browser.close();
  console.log("verify-kompleksnoye-viewports: ok", WIDTHS.join(", "));
}

run().catch((e) => {
  console.error("verify-kompleksnoye-viewports:", e.message || e);
  process.exit(1);
});
