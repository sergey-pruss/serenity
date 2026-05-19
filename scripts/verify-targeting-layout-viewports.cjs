#!/usr/bin/env node
/**
 * Playwright: этапы targeting — desc (≥721) или tablet (≤720), все внутри .targeting-page.
 * ORIGIN=http://127.0.0.1:8895 npm run test:targeting-layout
 */
const path = require("path");
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const WIDTHS = [375, 768, 1024, 1440];
const STEPS = ["Исследование", "Первые шаги", "Ведение", "Оптимизация"];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const res = await page.goto(`${BASE}/targeting`, { waitUntil: "networkidle", timeout: 30000 });
    assert(res && res.ok(), `${width}px: GET /targeting ${res && res.status()}`);

    const rows = await page.evaluate(
      ({ steps, width }) => {
        const mobile = width <= 720;
        return steps.map((t) => {
          const h2 = [...document.querySelectorAll("h2")].find((e) => e.textContent.trim() === t);
          if (!h2) return { t, err: "no h2" };
          const block = h2.closest(".content-block");
          const desc = block.querySelector(".content-block__grid--desc");
          const tablet = block.querySelector(".content-block__grid--tablet");
          const pick = (el) =>
            el
              ? {
                  d: getComputedStyle(el).display,
                  h: el.offsetHeight,
                  w: el.offsetWidth,
                }
              : null;
          const grid = mobile ? tablet : desc;
          const visibleNames = grid
            ? [...grid.querySelectorAll(".block__name")].filter((n) => n.offsetHeight > 8).length
            : 0;
          return {
            t,
            inTargeting: !!h2.closest(".targeting-page"),
            desc: pick(desc),
            tablet: pick(tablet),
            visibleNames,
            mobile,
          };
        });
      },
      { steps: STEPS, width },
    );

    for (const row of rows) {
      assert(!row.err, `${width}px «${row.t}»: ${row.err}`);
      assert(row.inTargeting, `${width}px «${row.t}»: вне .targeting-page`);
      if (row.mobile) {
        assert(row.tablet && row.tablet.d !== "none" && row.tablet.h > 80, `${width}px «${row.t}»: tablet`);
        assert(row.visibleNames >= 2, `${width}px «${row.t}»: ≥2 карточки (tablet)`);
      } else {
        assert(row.desc && row.desc.d !== "none" && row.desc.h > 80, `${width}px «${row.t}»: desc`);
        assert(row.desc.w > 400, `${width}px «${row.t}»: desc ширина ${row.desc.w}`);
        assert(row.visibleNames >= 2, `${width}px «${row.t}»: ≥2 карточки (desc)`);
      }
    }
    await page.close();
  }
  await browser.close();
  console.log("verify-targeting-layout-viewports: ok", WIDTHS.join(", "));
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
