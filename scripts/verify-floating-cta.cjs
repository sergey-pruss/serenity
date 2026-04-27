/**
 * Плавающий CTA на mobile/tablet (≤1200px):
 * - в середине страницы: ~15px от низа визуального viewport до низа CTA;
 * - в самом низу: нижний край CTA и нижний край иконки в footer совпадают.
 *
 * Реализация проверки: headless Chrome (CDP), без Playwright — так стабильнее на Node 25.
 * Переменные окружения:
 *   - CHROME_BIN: путь к Chrome/Chromium (по умолчанию macOS Google Chrome)
 *
 * Запуск: npm run test:floating-cta
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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

const defaultChrome = () => {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(mac)) return mac;
  return null;
};

const waitForCdpLine = (getText, timeoutMs) =>
  new Promise((resolve, reject) => {
    const re = /DevTools listening on (ws:\/\/[^\s]+)/;
    const t0 = Date.now();
    const tick = () => {
      const m = String(getText()).match(re);
      if (m) return resolve(m[1]);
      if (Date.now() - t0 > timeoutMs) return reject(new Error("Не получили DevTools WebSocket URL от Chrome"));
      setTimeout(tick, 20);
    };
    tick();
  });

class Cdp {
  /**
   * @param {string} pageWsUrl ответ /json* — ws://.../devtools/page/...
   */
  constructor(pageWsUrl) {
    this.ws = new WebSocket(pageWsUrl);
    this._id = 0;
    this._resolvers = new Map();
    this._pending = "";
    this.ws.addEventListener("message", (ev) => this._onMessage(ev.data));
    this.ws.addEventListener("error", (e) => {
      for (const [, { reject }] of this._resolvers) {
        reject(e);
      }
      this._resolvers.clear();
    });
  }

  _onMessage(data) {
    const chunk = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
    this._pending += chunk;
    let msg;
    try {
      msg = JSON.parse(this._pending);
    } catch {
      // неполный JSON — ждём следующий фрагмент фрейма
      return;
    }
    this._pending = "";
    if (msg.id != null) {
      const p = this._resolvers.get(msg.id);
      if (!p) return;
      this._resolvers.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    }
  }

  ready() {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve(), { once: true });
      this.ws.addEventListener("error", (e) => reject(e), { once: true });
    });
  }

  send(method, params) {
    const id = ++this._id;
    const payload = JSON.stringify({ id, method, params: params || {} });
    return new Promise((resolve, reject) => {
      this._resolvers.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scrollPageToEnd = async (cdp) => {
  let lastY = -1;
  for (let i = 0; i < 24; i += 1) {
    const { y, maxY, rest, h, innerH } = await cdp
      .send("Runtime.evaluate", {
        expression: `(() => {
          const h = document.documentElement?.scrollHeight || 0;
          const innerH = window.innerHeight || 0;
          const maxY = Math.max(0, h - innerH);
          window.scrollTo(0, maxY);
          return { y: window.scrollY || 0, maxY, rest: h - ((window.scrollY || 0) + innerH), h, innerH };
        })()`,
        returnByValue: true,
      })
      .then((r) => r?.result?.value);
    if (!y && y !== 0) break;
    if (lastY === y && (rest ?? 1) <= 2) return { y, maxY, rest, h, innerH };
    lastY = y;
    await sleep(200);
  }
  return cdp
    .send("Runtime.evaluate", {
      expression: `(() => {
        const h = document.documentElement?.scrollHeight || 0;
        const innerH = window.innerHeight || 0;
        const maxY = Math.max(0, h - innerH);
        return {
          y: window.scrollY || 0,
          maxY,
          rest: h - ((window.scrollY || 0) + innerH),
          h,
          innerH,
        };
      })()`,
      returnByValue: true,
    })
    .then((r) => r?.result?.value);
};

(async () => {
  const chrome = defaultChrome();
  assert(chrome, "Не найден Google Chrome. Укажи CHROME_BIN=/path/to/chrome");
  const port = 20150 + (process.pid % 200);
  const base = `http://127.0.0.1:${port}/index.html`;
  const userData = path.join(
    require("os").tmpdir(),
    `serenity-floating-cta-cdp-${port}-${process.pid}`,
  );
  if (fs.existsSync(userData)) fs.rmSync(userData, { recursive: true, force: true });

  let server;
  let cdp;
  let chromeProc;
  const out = { text: "" };

  try {
    server = await startStaticServer(port);
    const cdpPort = 14000 + (process.pid % 1000);
    chromeProc = spawn(
      chrome,
      [
        "--headless=new",
        `--remote-debugging-port=${cdpPort}`,
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${userData}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    chromeProc.stderr.on("data", (d) => {
      out.text += d.toString("utf8");
    });

    await waitForCdpLine(() => out.text, 20_000);

    const newTab = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(base)}`, {
      method: "PUT",
    });
    assert(newTab.ok, `CDP /json/new failed: ${newTab.status}`);
    const pageInfo = await newTab.json();
    const pageWs = pageInfo.webSocketDebuggerUrl;
    assert(pageWs, "Нет webSocketDebuggerUrl в ответе /json/new");

    cdp = new Cdp(pageWs);
    await cdp.ready();
    await cdp.send("Page.enable", {});
    await cdp.send("Runtime.enable", {});

    await cdp.send("Page.navigate", { url: base });

    // ждём load
    for (let i = 0; i < 60; i += 1) {
      const ready = await cdp
        .send("Runtime.evaluate", {
          expression: `(() => {
            return Boolean(document.querySelector("header.header"));
          })()`,
          returnByValue: true,
        })
        .catch(() => null);
      const v = ready?.result?.value;
      if (v) break;
      await sleep(200);
    }

    // середина: скролл + зазор
    await cdp.send("Runtime.evaluate", { expression: "window.scrollTo(0, 220);", returnByValue: true });
    await sleep(500);

    const mid = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const cta = document.querySelector("#body.body-application");
        const pill =
          document.querySelector("#body.body-application .application, #body.body-application .footer__link") || cta;
        const vv = window.visualViewport;
        const h = vv && vv.height ? vv.height : window.innerHeight;
        const br = pill ? pill.getBoundingClientRect().bottom : NaN;
        const gap = pill ? (h - br) : NaN;
        const t = cta ? getComputedStyle(cta).transform : "";
        return { hasCta: Boolean(cta) && Boolean(pill), gap, transform: t };
      })()`,
      returnByValue: true,
    });
    const midVal = mid?.result?.value;
    assert(midVal?.hasCta, "Нет #body.body-application");
    assert(typeof midVal?.gap === "number" && Number.isFinite(midVal.gap), "Не удалось измерить зазор CTA");
    assert(Math.abs(midVal.gap - 15) <= 1, `Середина: ожидается ~15px до низа viewport, получено ${midVal.gap}`);
    assert(
      midVal.transform === "none" || midVal.transform === "matrix(1, 0, 0, 1, 0, 0)",
      `Середина: transform CTA должен быть сброшен, сейчас: ${midVal.transform}`,
    );

    // низ: максимальный скролл + сходимость с иконкой
    const endPos = await scrollPageToEnd(cdp);
    assert(
      (endPos?.rest ?? 99) <= 2,
      `Низ: страница не докручена, rest=${endPos?.rest} (h=${endPos?.h} inner=${endPos?.innerH} y=${endPos?.y} maxY=${endPos?.maxY})`,
    );
    await sleep(200);

    const end = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const cta = document.querySelector("#body.body-application .application, #body.body-application .footer__link");
        const icon = document.querySelector("footer.footer-modern .footer-modern__social > a");
        if (!cta || !icon) return { ok: false, reason: "no nodes" };
        const cr = cta.getBoundingClientRect();
        const ir = icon.getBoundingClientRect();
        return { ok: true, deltaBottom: Math.abs(cr.bottom - ir.bottom) };
      })()`,
      returnByValue: true,
    });
    const endVal = end?.result?.value;
    assert(endVal?.ok, "Не удалось измерить геометрию CTA/социконки");
    assert(
      (endVal.deltaBottom ?? 99) <= 1.5,
      `Низ: нижний край CTA и иконки должны совпадать, Δ=${endVal.deltaBottom}`,
    );

    console.log("OK: mobile CTA — ~15px в середине, сходится снизу с иконкой в футере");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    try {
      cdp?.close();
    } catch {
      // ignore
    }
    if (chromeProc) {
      try {
        chromeProc.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
    if (fs.existsSync(userData)) {
      try {
        fs.rmSync(userData, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    if (server) server.close();
  }
})();
