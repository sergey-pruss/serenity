/**
 * Визуальный parity-тест шапки блока кейсов:
 * сравнивает ключевые метрики локальной /case/all/ с оригиналом serenity.agency/case/all.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const { stripSerenitySnapshotPrefix } = require("./strip-serenity-snapshot-prefix.cjs");

function resolveStaticFile(urlPath) {
  let p = stripSerenitySnapshotPrefix(urlPath.split("?")[0]);
  if (!p || p === "/") return path.join(root, "index.html");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  const rel = p.replace(/^\/+/, "");
  const full = path.join(root, rel);
  if (!full.startsWith(root) || !fs.existsSync(full)) return null;
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

async function collectMetrics(page, selectors) {
  return page.evaluate((sels) => {
    const g = (s) => document.querySelector(s)?.getBoundingClientRect() || null;
    const h = g(sels.header);
    const t = g(sels.title);
    const c = g(sels.categories);
    const card = g(sels.firstCard);
    const titleEl = document.querySelector(sels.title);
    const cs = titleEl ? getComputedStyle(titleEl) : null;
    return {
      gapHeaderToTitle: h && t ? +(t.top - h.bottom).toFixed(2) : null,
      gapTitleToCards: t && card ? +(card.top - t.bottom).toFixed(2) : null,
      titleSize: cs?.fontSize || null,
      titleColor: cs?.color || null,
      titleLineHeight: cs?.lineHeight || null,
      titleToCategoriesTop: t && c ? +(c.top - t.top).toFixed(2) : null,
    };
  }, selectors);
}

function near(actual, expected, tolerance, label) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}±${tolerance}, got ${actual}`,
  );
}

(async () => {
  const port = 20300 + (process.pid % 200);
  const screenshotsDir = path.join(root, "artifacts");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch();
  let server;

  try {
    server = await startStaticServer(port);

    const viewport = { width: 1440, height: 900 };
    const originalPage = await browser.newPage({ viewport });
    await originalPage.goto("https://serenity.agency/case/all", { waitUntil: "load", timeout: 120000 });
    await originalPage.waitForTimeout(1400);
    await originalPage.screenshot({ path: path.join(screenshotsDir, "case-all-original.png"), fullPage: false });

    const localPage = await browser.newPage({ viewport });
    await localPage.goto(`http://127.0.0.1:${port}/case/all/`, { waitUntil: "load", timeout: 120000 });
    await localPage.waitForTimeout(1400);
    await localPage.screenshot({ path: path.join(screenshotsDir, "case-all-local.png"), fullPage: false });

    const original = await collectMetrics(originalPage, {
      header: ".header__container",
      title: "h1.knowledges__main-title",
      categories: ".categories[data-v-682de319]",
      firstCard: ".cases .case",
    });
    const local = await collectMetrics(localPage, {
      header: ".header__container",
      title: ".case-all-heading-title",
      categories: "#case-all-categories",
      firstCard: "#case-all-grid .case",
    });

    assert(original.gapHeaderToTitle !== null && local.gapHeaderToTitle !== null, "Missing header/title metrics");
    assert(original.gapTitleToCards !== null && local.gapTitleToCards !== null, "Missing title/card metrics");
    assert(original.titleToCategoriesTop !== null && local.titleToCategoriesTop !== null, "Missing title/category metrics");

    near(local.gapHeaderToTitle, original.gapHeaderToTitle, 2, "Header -> title gap");
    near(local.gapTitleToCards, original.gapTitleToCards, 2, "Title -> cards gap");
    near(local.titleToCategoriesTop, original.titleToCategoriesTop, 3, "Title -> categories alignment");
    assert(local.titleSize === original.titleSize, `Title size mismatch: ${local.titleSize} vs ${original.titleSize}`);
    assert(local.titleLineHeight === original.titleLineHeight, `Title line-height mismatch: ${local.titleLineHeight} vs ${original.titleLineHeight}`);
    assert(local.titleColor === original.titleColor, `Title color mismatch: ${local.titleColor} vs ${original.titleColor}`);

    console.log("OK: visual parity for case header matched original");
    console.log("original:", original);
    console.log("local:   ", local);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();

