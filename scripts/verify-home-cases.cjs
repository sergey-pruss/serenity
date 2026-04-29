/**
 * Проверка главного блока кейсов: 8 карточек перед ссылкой "Смотреть больше кейсов".
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};

const startStaticServer = (port) =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let u = (req.url || "/").split("?")[0];
      if (u === "/") u = "/index.html";
      const file = path.join(root, u.replace(/^\//, ""));
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
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
  const data = JSON.parse(fs.readFileSync(path.join(root, "json", "cases-all.json"), "utf8"));
  const expected = (data.cases || []).slice(0, 8);
  assert(expected.length === 8, "Ожидается минимум 8 кейсов в json/cases-all.json");

  const port = 20100 + (process.pid % 200);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  let server;

  try {
    server = await startStaticServer(port);
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".more-cases", { state: "attached", timeout: 20000 });

    const result = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".more-cases .more-cases__item > *"));
      const cases = Array.from(document.querySelectorAll(".more-cases .case > a"));
      const normalize = (text) => text.replace(/\s+/g, " ").trim();
      const cardByIndex = (idx) => {
        const link = cases[idx];
        if (!link) return null;
        const description = link.querySelector(".case__description");
        return {
          href: link.getAttribute("href"),
          className: link.getAttribute("class") || "",
          text: normalize(description?.textContent || ""),
          descriptionColor: description ? getComputedStyle(description).color : "",
          image: link.querySelector(".case__media--front")?.getAttribute("src") || "",
          tags: Array.from(link.querySelectorAll(".case__tag")).map((tag) => normalize(tag.textContent || "")),
        };
      };

      return {
        totalCases: cases.length,
        lastCaseIndex: items.findIndex((el) => el.classList.contains("last-case")),
        first: cardByIndex(0),
        eighth: cardByIndex(7),
      };
    });

    assert(result.totalCases === 8, `Ожидается 8 карточек кейсов, получено ${result.totalCases}`);
    assert(result.lastCaseIndex === 8, `"Смотреть больше кейсов" должен быть 9-м элементом, индекс ${result.lastCaseIndex}`);
    assert(result.first, "Не найдена первая карточка");
    assert(result.eighth, "Не найдена восьмая карточка");

    const normalizeHref = (href) => (href || "").replace(/^https?:\/\/[^/]+/i, "");
    assert(
      normalizeHref(result.first.href) === normalizeHref(expected[0].href),
      `Первая карточка: href ${result.first.href} не совпадает с ${expected[0].href}`,
    );
    assert(
      result.first.text === expected[0].description,
      `Первая карточка: описание "${result.first.text}" не совпадает с "${expected[0].description}"`,
    );
    assert(
      result.first.tags.join("|") === expected[0].tags.join("|"),
      `Первая карточка: теги ${result.first.tags.join("|")} не совпадают с ${expected[0].tags.join("|")}`,
    );
    const firstImage = expected[0].media?.kind === "video" ? expected[0].media.poster : expected[0].media?.image;
    assert(
      firstImage ? (result.first.image || "").includes(firstImage.split("/").pop()) : true,
      `Первая карточка: неверная картинка ${result.first.image}`,
    );
    assert(
      result.first.className.includes(expected[0].linkClass || "white-text"),
      `Первая карточка: class ${result.first.className} не содержит ${expected[0].linkClass}`,
    );

    assert(
      normalizeHref(result.eighth.href) === normalizeHref(expected[7].href),
      `Восьмая карточка: href ${result.eighth.href} не совпадает с ${expected[7].href}`,
    );
    assert(
      result.eighth.text === expected[7].description,
      `Восьмая карточка: описание "${result.eighth.text}" не совпадает с "${expected[7].description}"`,
    );

    console.log("OK: главная показывает 8 последних кейсов из json/cases-all.json");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
