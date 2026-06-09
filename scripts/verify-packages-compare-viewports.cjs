#!/usr/bin/env node
/**
 * Playwright: пакеты на /korporativnyj_sajt и /kontekstnaya_reklama.
 * ≤1024px — карточный слайдер; ≥1025px — таблица сравнения.
 * ORIGIN=http://127.0.0.1:8895 npm run test:packages-compare-viewports
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");
const WIDTHS = [375, 768, 1024, 1440];
const CACHE_BUST = "20260609packagesMobileSlider";

const PAGES = [
  {
    path: "/korporativnyj_sajt",
    mountId: "korporativnyj-packages-compare-mounted",
    planName: "Базовый",
    cardPlanName: "Базовый",
    iconRows: 20,
    wrapNeedle: "ГОСТ",
  },
  {
    path: "/kontekstnaya_reklama",
    mountId: "kontekst-packages-compare-mounted",
    planName: "Минимальный",
    cardPlanName: "Минимальный",
    iconRows: 8,
    wrapNeedle: "Telegram",
  },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function probeMobileSlider(page, cfg) {
  return page.evaluate(
    ({ mountId, cardPlanName }) => {
      const compare = document.getElementById(mountId);
      const cardsRow = document.querySelector(".prices__cards--packages");
      const slider = document.querySelector(".prices__packages-slider");
      const track = document.querySelector(".prices__packages-track");
      const slides = track ? [...track.querySelectorAll(".prices__packages-slide")] : [];
      const activeCard = slides.find((slide) => {
        const h3 = slide.querySelector(".price-card h3");
        return h3 && h3.textContent.includes(cardPlanName) && slide.offsetWidth > 0;
      });
      const compareCs = compare ? getComputedStyle(compare) : null;
      const cardsCs = cardsRow ? getComputedStyle(cardsRow) : null;
      const docOverflow = document.documentElement.scrollWidth - window.innerWidth;
      return {
        compareDisplay: compareCs?.display ?? null,
        cardsDisplay: cardsCs?.display ?? null,
        cardsVisible: !!(cardsRow && cardsCs?.display !== "none" && cardsRow.offsetHeight > 40),
        sliderVisible: !!(slider && slider.offsetHeight > 40),
        slideCount: slides.length,
        activeCardVisible: !!activeCard,
        nativeRow: track?.dataset?.nativeRow === "1",
        docOverflow,
      };
    },
    { mountId: cfg.mountId, cardPlanName: cfg.cardPlanName },
  );
}

async function probeCompare(page, cfg, width) {
  const res = await page.evaluate(
    ({ mountId, planName, wrapNeedle, width }) => {
      const root = document.getElementById(mountId);
      if (!root) return { err: `нет #${mountId}` };

      root.scrollIntoView({ block: "center" });

      const layout = root.querySelector(".kontekst-packages-compare__layout");
      const pinned = root.querySelector(".kontekst-packages-compare__pinned");
      const scroll = root.querySelector(".kontekst-packages-compare__scroll");
      const pinnedTable = root.querySelector(".kontekst-packages-compare__table--pinned");
      const plansTable = root.querySelector(".kontekst-packages-compare__table--plans");

      const pick = (el) =>
        el
          ? {
              w: el.offsetWidth,
              h: el.offsetHeight,
              display: getComputedStyle(el).display,
              overflowX: getComputedStyle(el).overflowX,
            }
          : null;

      const pinnedRows = pinnedTable ? [...pinnedTable.querySelectorAll("tbody tr")] : [];
      const planRows = plansTable ? [...plansTable.querySelectorAll("tbody tr")] : [];

      const rowHeightsOk = pinnedRows.every((row, i) => {
        const other = planRows[i];
        if (!other) return false;
        const dh = Math.abs(row.offsetHeight - other.offsetHeight);
        return dh <= 4;
      });

      const icons = [...root.querySelectorAll(".kontekst-packages-compare__icon")];
      const visibleIcons = icons.filter((el) => {
        const cs = getComputedStyle(el);
        return cs.display !== "none" && el.offsetWidth > 0 && el.offsetHeight > 0;
      }).length;

      const labelWithIcon = root.querySelector(
        ".kontekst-packages-compare__row-label:has(.kontekst-packages-compare__icon)",
      );
      const labelText = labelWithIcon
        ? labelWithIcon.querySelector(".kontekst-packages-compare__row-label-text")
        : null;

      let wrapAligned = null;
      const wrapRow = labelText
        ? [...root.querySelectorAll(".kontekst-packages-compare__row-label-text")].find((el) =>
            el.textContent.includes(wrapNeedle),
          )
        : null;
      if (wrapRow && wrapRow.firstChild && wrapRow.firstChild.nodeType === 3) {
        const text = wrapRow.firstChild;
        const str = text.textContent || "";
        const lh = parseFloat(getComputedStyle(wrapRow).lineHeight) || 18;
        if (wrapRow.offsetHeight > lh * 1.25) {
          const range = document.createRange();
          let line1Left = null;
          let line2Left = null;
          let prevTop = null;
          for (let i = 0; i < str.length; i += 1) {
            range.setStart(text, i);
            range.setEnd(text, i + 1);
            const rect = range.getBoundingClientRect();
            if (prevTop === null) {
              prevTop = rect.top;
              line1Left = rect.left;
            } else if (rect.top > prevTop + 2 && line2Left === null) {
              line2Left = rect.left;
              break;
            }
          }
          if (line2Left != null) {
            wrapAligned = Math.abs(line1Left - line2Left) < 3;
          }
        }
      }

      const planHead = [...root.querySelectorAll(".kontekst-packages-compare__plan-name")].find((el) =>
        el.textContent.trim().includes(planName),
      );

      const docOverflow = document.documentElement.scrollWidth - window.innerWidth;

      return {
        rootDisplay: getComputedStyle(root).display,
        layout: pick(layout),
        pinned: pick(pinned),
        scroll: pick(scroll),
        pinnedRows: pinnedRows.length,
        planRows: planRows.length,
        rowHeightsOk,
        visibleIcons,
        labelFlex: labelWithIcon ? getComputedStyle(labelWithIcon).display : null,
        hasLabelText: !!labelText,
        wrapAligned,
        planHeadVisible: !!(planHead && planHead.offsetHeight > 0),
        docOverflow,
      };
    },
    { mountId: cfg.mountId, planName: cfg.planName, wrapNeedle: cfg.wrapNeedle, width },
  );

  return res;
}

async function run() {
  const browser = await chromium.launch();

  for (const cfg of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const url = `${BASE}${cfg.path}?v=${CACHE_BUST}`;
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      assert(res && res.ok(), `${cfg.path} ${width}px: HTTP ${res && res.status()}`);

      const tag = `${cfg.path} ${width}px`;

      if (width <= 1024) {
        await page.evaluate(() => {
          document.querySelector(".prices__packages-slider")?.scrollIntoView({ block: "center" });
        });
        await page.waitForTimeout(300);
        const data = await probeMobileSlider(page, cfg);
        assert(data.compareDisplay === "none", `${tag}: таблица скрыта (${data.compareDisplay})`);
        assert(data.cardsVisible, `${tag}: карточный слайдер виден`);
        assert(data.sliderVisible, `${tag}: .prices__packages-slider виден`);
        assert(data.slideCount >= 3, `${tag}: слайдов ${data.slideCount}`);
        assert(data.activeCardVisible, `${tag}: карточка «${cfg.cardPlanName}» видна`);
        assert(data.docOverflow <= 2, `${tag}: нет горизонтального overflow (${data.docOverflow}px)`);
      } else {
        await page.evaluate((mountId) => {
          document.getElementById(mountId)?.scrollIntoView({ block: "center" });
        }, cfg.mountId);
        await page.waitForFunction(
          (mountId) => {
            const root = document.getElementById(mountId);
            if (!root) return false;
            if (getComputedStyle(root).display === "none") return false;
            const pinnedTable = root.querySelector(".kontekst-packages-compare__table--pinned");
            const plansTable = root.querySelector(".kontekst-packages-compare__table--plans");
            if (!pinnedTable || !plansTable) return false;
            const pinnedRows = [...pinnedTable.querySelectorAll("tbody tr")];
            const planRows = [...plansTable.querySelectorAll("tbody tr")];
            if (!pinnedRows.length || pinnedRows.length !== planRows.length) return false;
            return pinnedRows.every((row, i) => {
              const other = planRows[i];
              if (!other) return false;
              return Math.abs(row.offsetHeight - other.offsetHeight) <= 4;
            });
          },
          cfg.mountId,
          { timeout: 10000 },
        );
        const data = await probeCompare(page, cfg, width);
        assert(!data.err, `${tag}: ${data.err}`);
        assert(data.rootDisplay !== "none", `${tag}: таблица видна`);
        assert(data.layout && data.layout.h > 120, `${tag}: layout h=${data.layout && data.layout.h}`);
        assert(data.pinned && data.pinned.w > 40 && data.pinned.h > 80, `${tag}: pinned`);
        assert(data.scroll && data.scroll.h > 80, `${tag}: scroll`);
        assert(
          data.pinnedRows >= 10 && data.planRows === data.pinnedRows,
          `${tag}: rows ${data.pinnedRows}/${data.planRows}`,
        );
        assert(data.rowHeightsOk, `${tag}: высоты строк pinned/plans синхронны`);
        assert(data.planHeadVisible, `${tag}: колонка «${cfg.planName}» видна`);
        assert(data.docOverflow <= 2, `${tag}: нет горизонтального overflow страницы (${data.docOverflow}px)`);
        assert(data.visibleIcons >= cfg.iconRows, `${tag}: иконки видны (${data.visibleIcons})`);
        assert(data.labelFlex === "flex", `${tag}: row-label flex`);
        assert(data.hasLabelText, `${tag}: row-label-text в разметке`);
        if (data.wrapAligned != null) {
          assert(data.wrapAligned, `${tag}: перенос текста выровнен по первой строке`);
        }
      }

      await page.close();
    }
  }

  await browser.close();
  console.log(
    "verify-packages-compare-viewports: ok",
    PAGES.map((p) => p.path).join(", "),
    WIDTHS.join(", "),
  );
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
