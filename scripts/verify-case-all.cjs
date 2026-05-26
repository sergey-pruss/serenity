/**
 * Проверка страницы /case/all: данные, фильтр по категории, пагинация (6 рядов × колонки сетки).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const { startStaticServer, root } = require("./lib/test-static-server.cjs");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

async function assertMobileCategoriesReachViewportEdge(page, url) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("#case-all-categories .categories__link", { timeout: 20000 });
  const metrics = await page.evaluate(async () => {
    const categories = document.querySelector("#case-all-categories");
    const links = Array.from(categories?.querySelectorAll(".categories__link") || []);
    if (!categories || links.length === 0) return { ok: false };
    categories.scrollLeft = categories.scrollWidth;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const cr = categories.getBoundingClientRect();
    const last = links[links.length - 1].getBoundingClientRect();
    return {
      ok: true,
      viewportWidth: window.innerWidth,
      scrollRoom: categories.scrollWidth - categories.clientWidth,
      scrollLeft: categories.scrollLeft,
      containerRightGap: window.innerWidth - cr.right,
      lastRightGap: window.innerWidth - last.right,
    };
  });
  assert(metrics.ok, "Mobile categories: не найдены категории");
  assert(
    Math.abs(metrics.containerRightGap) <= 2,
    `Mobile categories: scrollport должен доходить до правого края viewport, gap=${metrics.containerRightGap}`,
  );
  if (metrics.scrollRoom > 2) {
    assert(
      Math.abs(metrics.lastRightGap) <= 3,
      `Mobile categories: последний пункт должен докручиваться до края без пустого хвоста, gap=${metrics.lastRightGap}`,
    );
  }
}

(async () => {
  const caseAllIndexPath = path.join(root, "case", "all", "index.html");
  const caseAllTemplate = fs.readFileSync(caseAllIndexPath, "utf8");
  assert(caseAllTemplate.includes("ym(30205029"), "case/all/index.html — Яндекс.Метрика");
  assert(
    (caseAllTemplate.match(/ym\s*\(\s*30205029\s*,\s*"init"/g) || []).length === 1,
    "case/all/index.html — ровно один ym(30205029, \"init\")",
  );
  assert(
    (caseAllTemplate.match(/\/_sa\/js\/leave-request-cta\.js/g) || []).length === 1,
    "case/all/index.html — ровно один leave-request-cta.js",
  );
  assert(
    !/\{\{CASE_(TITLE|CANONICAL|DESCRIPTION)\}\}/.test(caseAllTemplate),
    "case/all/index.html: после build-case-all-pages не должно оставаться плейсхолдеров {{CASE_*}}",
  );

  const payload = JSON.parse(fs.readFileSync(path.join(root, "json/cases-all.json"), "utf8"));
  const cases = payload.cases || [];
  const total = cases.length;
  assert(total >= 1, "json/cases-all.json пустой — выполни: node scripts/build-cases-all-data.mjs");

  const brendingCount = cases.filter((c) => (c.tagCodes || []).includes("brending")).length;
  assert(brendingCount >= 1, "Нет кейсов с тегом brending для проверки фильтра");

  const ROWS = 6;
  const colsDesktop = 4;
  const pageDesktop = ROWS * colsDesktop;

  const port = 20200 + (process.pid % 200);
  const browser = await chromium.launch();
  /* >1500px — 4 колонки сетки .more-cases__item; иначе 3 колонки и 18 карточек на «6 рядов» */
  const page = await browser.newPage({ viewport: { width: 1520, height: 900 } });
  let server;

  try {
    server = await startStaticServer(port);
    await page.goto(`http://127.0.0.1:${port}/case/all/`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("#case-all-grid .case", { timeout: 20000 });

    const countCases = async () => page.$$eval("#case-all-grid .case", (els) => els.length);

    const nFirst = await countCases();
    assert(nFirst === Math.min(total, pageDesktop), `Страница 1: ожидается ${Math.min(total, pageDesktop)} карточек, получено ${nFirst}`);

    await page.click('a.categories__link[href="/case/all/category/brending/"]');
    await page.waitForURL(/\/case\/all\/category\/brending\/?$/);
    await page.waitForFunction(
      ([expected, ps]) =>
        document.querySelectorAll("#case-all-grid .case").length === Math.min(expected, ps),
      [brendingCount, pageDesktop],
    );
    const nBrand = await countCases();
    assert(nBrand === Math.min(brendingCount, pageDesktop), `После фильтра «Брендинг»: ожидается ${Math.min(brendingCount, pageDesktop)}, получено ${nBrand}`);

    await page.click('a.categories__link[href="/case/all/"]');
    await page.waitForURL(/\/case\/all\/?$/);
    await page.waitForFunction(
      ([expected, ps]) =>
        document.querySelectorAll("#case-all-grid .case").length === Math.min(expected, ps),
      [total, pageDesktop],
    );

    const totalPages = Math.ceil(total / pageDesktop);
    if (totalPages >= 3) {
      await page.click('a.case-all-pagination__page[href="/case/all/3/"]');
      await page.waitForURL(/\/case\/all\/3\/?$/);
      await page.waitForFunction(() => document.querySelectorAll("#case-all-grid .case").length > 0);
      const lastPageCount = await countCases();
      const expectedLast = total - pageDesktop * 2;
      assert(lastPageCount === expectedLast, `Страница 3: ожидается ${expectedLast} карточек, получено ${lastPageCount}`);
      const p3Desc = await page.$eval('meta[name="description"]', (el) => el.getAttribute("content") || "");
      assert(
        /Страница\s+3\./.test(p3Desc),
        `meta description страницы 3 кейсов должна содержать «Страница 3.», получено: ${p3Desc.slice(0, 140)}…`,
      );
    }

    await assertMobileCategoriesReachViewportEdge(page, `http://127.0.0.1:${port}/case/all/`);

    console.log(
      `OK: /case/all — всего кейсов ${total}, фильтр «Брендинг» (${brendingCount}), пагинация при ширине 1520px (${pageDesktop} карточек на страницу)`,
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
