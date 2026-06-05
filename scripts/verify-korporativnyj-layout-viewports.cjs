#!/usr/bin/env node
/**
 * Playwright: адаптив /korporativnyj_sajt — overflow, таблица пакетов, слайдер кейсов 24ow7.
 * ORIGIN=http://127.0.0.1:8895 npm run test:korporativnyj-layout-viewports
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const WIDTHS = [375, 768, 1024, 1440];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const browser = await chromium.launch();

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const res = await page.goto(`${BASE}/korporativnyj_sajt?v=20260605packagesLabelWrap`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    assert(res && res.ok(), `${width}px: HTTP ${res && res.status()}`);

    await page.waitForFunction(
      () => document.documentElement.scrollWidth - window.innerWidth <= 2,
      { timeout: 10000 },
    );

    const data = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth - window.innerWidth;
      const packages = document.getElementById("korporativnyj-packages-compare-mounted");
      const ow24Root =
        document.querySelector(".swiper-slide-24ow7")?.closest(".cases-block__slider") ||
        document.querySelector(".swiper-pagination-24ow7")?.closest(".cases-block__slider");
      const ow24Slides = ow24Root
        ? [...ow24Root.querySelectorAll(".swiper-slide-24ow7")].filter((el) => el.offsetHeight > 0)
        : [];
      const slideTitles = ow24Root
        ? [...ow24Root.querySelectorAll(".cases-block__swiper-slide-title")]
            .map((el) => el.textContent.trim())
            .filter(Boolean)
        : [];
      const team = document.querySelector(".team-block");

      return {
        docOverflow,
        packagesH: packages?.offsetHeight || 0,
        ow24H: ow24Root?.offsetHeight || 0,
        ow24Slides: ow24Slides.length,
        slideTitles,
        teamH: team?.offsetHeight || 0,
      };
    });

    const tag = `${width}px`;
    assert(data.docOverflow <= 2, `${tag}: горизонтальный overflow (${data.docOverflow}px)`);
    assert(data.packagesH > 200, `${tag}: таблица пакетов h=${data.packagesH}`);
    assert(data.ow24H > 120, `${tag}: слайдер 24ow7 h=${data.ow24H}`);
    assert(data.ow24Slides >= 1, `${tag}: видимые слайды 24ow7 (${data.ow24Slides})`);
    assert(
      data.slideTitles.includes("Solvik") &&
        data.slideTitles.includes("Volvo Penta") &&
        data.slideTitles.includes("Foil"),
      `${tag}: слайды Solvik / Volvo Penta / Foil в DOM (${data.slideTitles.join(", ")})`,
    );
    assert(data.teamH > 80, `${tag}: блок команды h=${data.teamH}`);

    await page.close();
  }

  await browser.close();
  console.log("verify-korporativnyj-layout-viewports: ok", WIDTHS.join(", "));
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
