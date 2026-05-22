#!/usr/bin/env node
/**
 * Адаптив /services/marketing (targeting-каркас): desc ≥721px, tablet ≤720px.
 * ORIGIN=http://127.0.0.1:8895 npm run test:marketing-layout
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const WIDTHS = [375, 768, 1024, 1440];
const SECTIONS = ["Стратегия", "Бренд", "Измеримое продвижение", "Продажи"];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const res = await page.goto(`${BASE}/services/marketing`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    assert(res && res.ok(), `${width}px: GET /services/marketing ${res && res.status()}`);

    const rows = await page.evaluate(
      ({ sections, width }) => {
        const mobile = width <= 720;
        return sections.map((t) => {
          const h2 = [...document.querySelectorAll("h2")].find((e) =>
            (e.textContent || "").trim().includes(t),
          );
          if (!h2) return { t, err: "no h2" };
          const block = h2.closest(".content-block");
          if (!block) return { t, err: "no content-block" };
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
          const subtitle = block.querySelector(".content-block__desc");
          const subtitleVisible =
            subtitle && getComputedStyle(subtitle).display !== "none" && subtitle.offsetHeight > 8;
          return {
            t,
            inTargeting: !!h2.closest(".targeting-page"),
            desc: pick(desc),
            tablet: pick(tablet),
            visibleNames,
            subtitleVisible,
            mobile,
          };
        });
      },
      { sections: SECTIONS, width },
    );

    for (const row of rows) {
      assert(!row.err, `${width}px «${row.t}»: ${row.err}`);
      assert(row.inTargeting, `${width}px «${row.t}»: вне .targeting-page`);
      if (row.mobile) {
        assert(row.tablet && row.tablet.d !== "none" && row.tablet.h > 40, `${width}px «${row.t}»: tablet`);
      } else {
        assert(row.desc && row.desc.d !== "none" && row.desc.h > 40, `${width}px «${row.t}»: desc`);
        if (row.t === "Стратегия" || row.t === "Бренд" || row.t === "Измеримое продвижение") {
          assert(row.visibleNames >= 2, `${width}px «${row.t}»: ≥2 карточки (desc)`);
        }
      }
    }

    const hero = await page.evaluate(() => {
      const h1 = document.querySelector(".c-title-block__title");
      return { w: h1?.getBoundingClientRect().width || 0, text: h1?.textContent?.trim() || "" };
    });
    assert(hero.w > 100, `${width}px: hero H1 width ${hero.w}`);
    assert(hero.text.includes("Комплексный маркетинг"), `${width}px: H1 текст`);

    await page.close();
  }
  await browser.close();
  console.log("verify-marketing-layout-viewports: ok", WIDTHS.join(", "));
}

run().catch((e) => {
  console.error("verify-marketing-layout-viewports:", e.message || e);
  process.exit(1);
});
