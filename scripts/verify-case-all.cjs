/**
 * Проверка страницы /case/all: данные, фильтр по категории, пагинация (6 рядов × колонки сетки).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");

function resolveStaticFile(urlPath) {
  let p = urlPath.split("?")[0];
  if (!p || p === "/") return path.join(root, "index.html");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  const rel = p.replace(/^\/+/, "");
  const full = path.join(root, rel);
  if (!full.startsWith(root)) return null;
  if (!fs.existsSync(full)) return null;
  const st = fs.statSync(full);
  if (st.isFile()) return full;
  if (st.isDirectory()) {
    const idx = path.join(full, "index.html");
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const startStaticServer = (port) =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || "/").split("?")[0];
      const file = resolveStaticFile(urlPath);
      if (!file) {
        res.writeHead(404, noCache);
        return res.end("Not found");
      }
      for (const k of Object.keys(noCache)) res.setHeader(k, noCache[k]);
      res.setHeader("Content-Type", mimes[path.extname(file).toLowerCase()] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });

(async () => {
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
    }

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
