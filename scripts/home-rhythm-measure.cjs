/**
 * Проверяет, что фактические отступы .home-ledge / .home-between совпадают с :root
 * (--home-ledge, --home-between) для всех маркеров, без getBoundingClientRect.
 *
 * SLIDER_TEST_URL=http://127.0.0.1:4322/ node scripts/home-rhythm-measure.cjs
 */
const { chromium } = require("playwright");

const URL = process.env.SLIDER_TEST_URL || "http://127.0.0.1:4322/";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function readComputed(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const expLedge = parseFloat(root.getPropertyValue("--home-ledge").replace("px", "").trim()) || null;
    const expBetween = parseFloat(root.getPropertyValue("--home-between").replace("px", "").trim()) || null;

    const out = { expected: { lede: expLedge, between: expBetween }, items: [] };
    const add = (name, prop, from, px) => {
      out.items.push({ name, prop, from, valuePx: Math.round((px || 0) * 100) / 100 });
    };

    const s = document.querySelector(".services__text.home-ledge");
    if (s) add("Услуги", "padding-bottom", "services__text", parseFloat(getComputedStyle(s).paddingBottom));

    const ch = document.querySelector(".cases-block__header.home-ledge");
    if (ch) add("Кейсы", "margin-bottom", "cases header", parseFloat(getComputedStyle(ch).marginBottom));

    const bh = document.querySelector(".blog-block__header.home-ledge");
    if (bh) {
      add("Блог (низ шапки)", "margin-bottom", "blog header", parseFloat(getComputedStyle(bh).marginBottom));
      add("Блог (сверху сек.)", "margin-top", "blog header", parseFloat(getComputedStyle(bh).marginTop));
    }

    const cn = document.querySelector(".clients-new.home-ledge");
    if (cn) add("Наши клиенты", "margin-bottom", "clients-new", parseFloat(getComputedStyle(cn).marginBottom));

    const lm = document.querySelector(".home-ledge--lm.home-ledge");
    if (lm) add("Мы любим маркетинг", "margin-bottom", "ledge-lm", parseFloat(getComputedStyle(lm).marginBottom));

    const cs = document.querySelector(".clients-new-section.home-between");
    if (cs) add("PT секции клиентов", "padding-top", "clients-new-section", parseFloat(getComputedStyle(cs).paddingTop));

    const lwr = document.querySelector(".live-marketing-block-wr.home-between");
    if (lwr) add("MT live-блок", "margin-top", "live wr", parseFloat(getComputedStyle(lwr).marginTop));

    return out;
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  for (const w of [1440, 1000, 500, 400]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(400);

    const data = await readComputed(page);
    console.log(`--- ${w}px`, JSON.stringify(data, null, 2));

    const { lede, between } = data.expected;
    for (const it of data.items) {
      if (it.name === "Блог (сверху сек.)" || it.name === "PT секции клиентов" || it.name === "MT live-блок") {
        assert(
          between != null && Math.abs(it.valuePx - between) < 0.5,
          `${w}px ${it.name}: got ${it.valuePx}, want --home-between ${between}`,
        );
      } else {
        assert(
          lede != null && Math.abs(it.valuePx - lede) < 0.5,
          `${w}px ${it.name}: got ${it.valuePx}, want --home-ledge ${lede}`,
        );
      }
    }

    await page.close();
  }
  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  console.log("home-rhythm-measure: OK");
  await browser.close();
}

run().catch((err) => {
  console.error(`home-rhythm-measure: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});
