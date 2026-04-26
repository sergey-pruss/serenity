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
      const card = (hrefPart) => {
        const link = cases.find((a) => (a.getAttribute("href") || "").includes(hrefPart));
        if (!link) return null;
        return {
          href: link.getAttribute("href"),
          text: normalize(link.querySelector(".case__description")?.textContent || ""),
          image: link.querySelector(".case__media--front")?.getAttribute("src") || "",
          tags: Array.from(link.querySelectorAll(".case__tag")).map((tag) => normalize(tag.textContent || "")),
        };
      };

      return {
        totalCases: cases.length,
        lastCaseIndex: items.findIndex((el) => el.classList.contains("last-case")),
        vomoloko: card("vomoloko"),
        skladno: card("skladno-internet-magazin-mebeli"),
      };
    });

    assert(result.totalCases === 8, `Ожидается 8 карточек кейсов, получено ${result.totalCases}`);
    assert(result.lastCaseIndex === 8, `"Смотреть больше кейсов" должен быть 9-м элементом, индекс ${result.lastCaseIndex}`);
    assert(result.vomoloko, "Не найдена карточка Во!Молоко");
    assert(result.vomoloko.image.includes("storage__ixkjBrB1pCELGeNMCtA8BgK78AYiofKaJhJch2zK.jpg"), "Во!Молоко: неверная картинка");
    assert(result.vomoloko.text.includes("дистрибьютера «Во!Молоко»"), "Во!Молоко: неверное описание");
    assert(result.vomoloko.tags.join("|") === "Продвижение|Брендинг|Сайт", `Во!Молоко: теги ${result.vomoloko.tags.join("|")}`);
    assert(result.skladno, "Не найдена карточка Складно");
    assert(result.skladno.image.includes("storage__qaCLQ6fqiMYmxsozvWrmZGiALhEHrhOemSYToCyR.jpg"), "Складно: неверная картинка");
    assert(result.skladno.text.includes("В 6 раз окупили вложения"), "Складно: неверное описание");
    assert(result.skladno.tags.join("|") === "Продвижение|Брендинг|Сайт|Продажи", `Складно: теги ${result.skladno.tags.join("|")}`);

    console.log("OK: главная показывает 8 кейсов, ссылка на остальные стала 9-м элементом");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
