/**
 * Проверка: пауза автоплей «Наши клиенты» только на ленте плашек, не на заголовке;
 * ссылка Volvo открывается. Запуск: npx playwright install  (один раз)  &&  npm run test:clients
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const { stripSerenitySnapshotPrefix } = require("./strip-serenity-snapshot-prefix.cjs");
const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** Положение ленты «Наши клиенты»: нативный scrollLeft на треке (на главной есть вторая лента — «Награды»). */
const readStripPosition = (page) =>
  page.locator(".clients-mainstr .clients-new__context-wrapper").evaluate((el) => el.scrollLeft);

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const startStaticServer = (port) =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let u = stripSerenitySnapshotPrefix((req.url || "/").split("?")[0]);
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
  const port = 19990 + (process.pid % 200);
  const base = `http://127.0.0.1:${port}`;
  let server;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setExtraHTTPHeaders({ "Accept-Language": "ru-RU" });
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    server = await startStaticServer(port);
    await page.goto(`${base}/index.html`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => {
      const el = document.querySelector(".clients-new-section");
      if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForTimeout(800);
    if ((await readStripPosition(page)) === 0) {
      await page.waitForTimeout(800);
    }
    /* Курсор по умолчанию может оказаться над лентой (пауза автоплея) — уводим в угол. */
    await page.mouse.move(16, 16);
    await page.waitForTimeout(200);

    // 1) Курсор над заголовком — лента должна смещаться (автоплей)
    const title = page.locator(".clients-mainstr .clients-new__title");
    await title.waitFor({ state: "visible" });
    const tBox = await title.boundingBox();
    assert(tBox, "h2 .clients-new__title not visible / no box");
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
    await page.waitForTimeout(200);
    const x0 = await readStripPosition(page);
    await page.waitForTimeout(500);
    const x1 = await readStripPosition(page);
    const dTitle = Math.abs(x1 - x0);
    assert(dTitle > 2, `Ожидается движение ленты при hover на заголовок (scrollLeft d=${dTitle})`);

    // 2) Курсор внутри ленты клиентов — пауза (scrollLeft не меняется)
    const host = page.locator(".clients-mainstr .swiper-container-clients-new");
    await host.waitFor({ state: "visible" });
    const hBox = await host.boundingBox();
    assert(hBox, "no box for .swiper-container-clients-new");
    await page.mouse.move(hBox.x + Math.min(hBox.width * 0.5, 200), hBox.y + hBox.height / 2);
    await page.waitForTimeout(80);
    const x2 = await readStripPosition(page);
    await page.waitForTimeout(550);
    const x3 = await readStripPosition(page);
    const dHost = Math.abs(x3 - x2);
    assert(
      dHost < 0.6,
      `Ожидается пауза на ленте (hover на .swiper-container-clients-new), scrollLeft d=${dHost}`,
    );

    // 3) Снова на заголовок — движение возобновляется
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
    await page.waitForTimeout(50);
    const x4 = await readStripPosition(page);
    await page.waitForTimeout(400);
    const x5 = await readStripPosition(page);
    const dBack = Math.abs(x5 - x4);
    assert(dBack > 1, `Ожидается движение после ухода с ленты (scrollLeft d=${dBack})`);

    // 4) Volvo: href, класс, клик ведёт на /case/…volvo (ждём пока автолента подвезёт карточку в вьюпорт)
    await page.waitForFunction(
      () => {
        const list = Array.from(document.querySelectorAll('a[href*="volvo-penta"]'));
        for (const a of list) {
          const r = a.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight) {
            return true;
          }
        }
        return false;
      },
      null,
      { timeout: 20_000 },
    );
    const volvo = page
      .locator('a.clients-new__slide[href="https://serenity.agency/case/volvo-penta"]')
      .filter({ has: page.locator('img[src*="di6Ov"]') })
      .first();
    await volvo.waitFor({ state: "visible" });
    const href = await volvo.getAttribute("href");
    assert(
      href && href.includes("volvo-penta"),
      `Атрибут href на Volvo: ожидаем volvo-penta, got ${href}`,
    );
    const cls = await volvo.getAttribute("class");
    assert(cls && cls.includes("clients-new__slide--link"), `Volvo: ожидаем .clients-new__slide--link, got ${cls}`);

    const orangePaired = await page.evaluate(() =>
      Boolean(
        document.querySelector(
          'a[href="https://serenity.agency/case/all/orange"] img[src*="bR5c6w"]',
        ),
      ),
    );
    assert(orangePaired, "Прод-маппинг: лого Orange (bR5c6w) → /case/all/orange");

    // Наводим курсор на плашку, чтобы сработал pause автоплея
    const vbox = await volvo.boundingBox();
    assert(vbox, "Volvo: нет boundingBox");
    await page.mouse.move(vbox.x + 28, vbox.y + 28);
    await page.waitForTimeout(200);
    const navPromise = page.waitForURL((u) => /serenity\.agency/.test(u.href) && /volvo-penta/.test(u.href), {
      timeout: 40_000,
      waitUntil: "commit",
    });
    await page.evaluate(() => {
      const list = document.querySelectorAll('a[href="https://serenity.agency/case/volvo-penta"]');
      for (const a of list) {
        const r = a.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight) {
          a.click();
          return;
        }
      }
      throw new Error("visible Volvo <a> not found for click");
    });
    await navPromise;
    const finalUrl = page.url();
    assert(
      /serenity\.agency/.test(finalUrl) && /volvo-penta/.test(finalUrl),
      `Навигация Volvo: ${finalUrl}`,
    );

    console.log("OK: пауза/заголовок/Volvo+Orange; HORIZ_SLIDER_SIGN — в app.js");
  } catch (e) {
    if (e && e.message && e.message.includes("waitForURL") && page) {
      try {
        const u = page.url();
        const errs = consoleErrors.length ? consoleErrors.join(" | ") : "none";
        console.error("url при падении теста:", u, "JS:", errs);
      } catch (ignore) {
        /*  */
      }
    }
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
