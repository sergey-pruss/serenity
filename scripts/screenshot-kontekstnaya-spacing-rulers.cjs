#!/usr/bin/env node
/**
 * Full-page скриншот /kontekstnaya_reklama/ с наложенными слева линейками (px)
 * на каждом межсекционном шаге — чтобы визуально сравнить одинаковые отступы.
 *
 *   node scripts/screenshot-kontekstnaya-spacing-rulers.cjs
 *
 *   VIEWPORT_W=1280 VIEWPORT_H=900 OUT_PNG=tmp/foo.png node scripts/...
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const VIEWPORT = {
  width: Number.parseInt(process.env.VIEWPORT_W || "1280", 10),
  height: Number.parseInt(process.env.VIEWPORT_H || "900", 10),
};
const OUT_PNG = path.join(
  ROOT,
  process.env.OUT_PNG || "tmp/kontekstnaya-spacing-rulers.png",
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolvePublicPath(urlPath) {
  const raw = decodeURIComponent(String(urlPath).split("?")[0]);
  if (raw.includes("..")) return null;
  let rel = raw.replace(/^\/+/, "");
  if (rel === "" || rel === "/") rel = "index.html";
  const resolved = path.normalize(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT)) return null;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, "index.html");
  }
  return resolved;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const fp = resolvePublicPath(req.url || "/");
        if (!fp || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": mimeFor(fp) });
        fs.createReadStream(fp).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e && e.message));
      }
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, port: server.address().port }),
    );
    server.on("error", reject);
  });
}

async function main() {
  const { server, port } = await startStaticServer();
  const url = `http://127.0.0.1:${port}/kontekstnaya_reklama/`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(url, { waitUntil: "load", timeout: 120_000 });
    await page.waitForSelector(".page-constructor", { timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));

    const summary = await page.evaluate(() => {
      const root = document.querySelector(".page-constructor");
      if (!root) return { error: "no root" };

      const scrollY = () => window.scrollY || window.pageYOffset || 0;

      function docRect(el) {
        const r = el.getBoundingClientRect();
        const sy = scrollY();
        return {
          top: r.top + sy,
          bottom: r.bottom + sy,
          height: r.height,
        };
      }

      function rhythmFor(section) {
        if (section.classList.contains("sa-service-lead-section")) {
          const cs = getComputedStyle(section);
          return {
            target: "section.sa-service-lead-section",
            pt: Math.round(parseFloat(cs.paddingTop) || 0),
            mt: Math.round(parseFloat(cs.marginTop) || 0),
          };
        }
        const pairs = [
          [".team-block", ".team-block"],
          [".more-case-wr", ".more-case-wr"],
          [".cases-block", ".cases-block"],
          [".modern.content-block", ".modern.content-block"],
          [".dies.modern", ".dies.modern"],
          [".sa-service-lead-root", ".sa-service-lead-root"],
          [".kontekst-faq-root", ".kontekst-faq-root"],
          [".home-awards-block .awards", ".awards"],
          [".kontekst-synergy-root .services-unified", ".services-unified"],
        ];
        for (const [sel, name] of pairs) {
          const el = section.querySelector(sel);
          if (!el) continue;
          const cs = getComputedStyle(el);
          return {
            target: name,
            pt: Math.round(parseFloat(cs.paddingTop) || 0),
            mt: Math.round(parseFloat(cs.marginTop) || 0),
          };
        }
        const cs = getComputedStyle(section);
        return {
          target: "section",
          pt: Math.round(parseFloat(cs.paddingTop) || 0),
          mt: Math.round(parseFloat(cs.marginTop) || 0),
        };
      }

      const sections = Array.from(
        root.querySelectorAll(":scope > section.page-constructor__section"),
      );
      const items = sections.map((el) => {
        const r = docRect(el);
        return { top: r.top, bottom: r.bottom, rhythm: rhythmFor(el) };
      });

      const gaps = [];
      for (let i = 0; i < items.length - 1; i++) {
        const domFlushPx = Math.round(items[i + 1].top - items[i].bottom);
        const rhy = items[i + 1].rhythm;
        const rhythmSum = rhy.pt + rhy.mt;
        const effectivePx =
          domFlushPx > 0 ? domFlushPx : rhythmSum;
        gaps.push({
          from: i,
          to: i + 1,
          effectivePx,
          domFlushPx,
          rhythmTarget: rhy.target,
        });
      }

      let homeBetweenPx = 112;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;left:-9999px;top:0;width:0;height:0;visibility:hidden";
      probe.style.paddingTop = "var(--home-between)";
      document.body.appendChild(probe);
      const pt = parseFloat(getComputedStyle(probe).paddingTop);
      if (Number.isFinite(pt)) homeBetweenPx = Math.round(pt);
      document.body.removeChild(probe);

      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      document.body.style.position = "relative";

      const old = document.getElementById("sa-gap-ruler-overlay");
      if (old) old.remove();

      const wrap = document.createElement("div");
      wrap.id = "sa-gap-ruler-overlay";
      wrap.setAttribute("data-sa-ruler-overlay", "1");
      wrap.style.cssText = [
        "position:absolute",
        "left:0",
        "top:0",
        "width:100%",
        `height:${docH}px`,
        "pointer-events:none",
        "z-index:2147483647",
        "box-sizing:border-box",
      ].join(";");

      function bandStyle(h, effective) {
        const sameHome = Math.abs(effective - homeBetweenPx) <= 1;
        const cases72 = effective === 72;
        const bg = sameHome
          ? "rgba(0,220,160,0.42)"
          : cases72
            ? "rgba(255,200,80,0.45)"
            : effective === 172
              ? "rgba(160,120,255,0.4)"
              : effective === 50
                ? "rgba(180,180,190,0.45)"
                : "rgba(255,120,80,0.4)";
        const border = sameHome ? "#00a070" : cases72 ? "#c90" : "#333";
        return { bg, border };
      }

      gaps.forEach((g, idx) => {
        const y = items[g.from].bottom;
        const h = Math.max(1, g.effectivePx);
        const { bg, border } = bandStyle(h, g.effectivePx);

        const band = document.createElement("div");
        band.title = `${g.from + 1}→${g.to + 1}: ${g.effectivePx}px (${g.rhythmTarget})`;
        band.style.cssText = [
          "position:absolute",
          "left:6px",
          `top:${y}px`,
          "width:64px",
          `height:${h}px`,
          "box-sizing:border-box",
          `border:2px solid ${border}`,
          `background:${bg}`,
          "border-radius:4px",
        ].join(";");

        const tickStep = h > 140 ? 14 : h > 80 ? 10 : 8;
        for (let t = 0; t <= h; t += tickStep) {
          const tick = document.createElement("div");
          tick.style.cssText = [
            "position:absolute",
            "left:0",
            `top:${t}px`,
            "width:14px",
            "height:2px",
            "background:#0a0a0a",
          ].join(";");
          band.appendChild(tick);
        }

        const lab = document.createElement("div");
        lab.textContent = `${g.effectivePx}px`;
        lab.style.cssText = [
          "position:absolute",
          "right:4px",
          "top:6px",
          "font:700 11px system-ui,sans-serif",
          "color:#061",
          "text-shadow:0 0 4px #fff,0 0 4px #fff",
          "line-height:1.1",
          "text-align:right",
          "max-width:58px",
        ].join(";");
        band.appendChild(lab);

        const sub = document.createElement("div");
        sub.textContent = `#${idx + 1}`;
        sub.style.cssText = [
          "position:absolute",
          "left:4px",
          "bottom:4px",
          "font:600 9px monospace",
          "color:#111",
          "text-shadow:0 0 3px #fff",
        ].join(";");
        band.appendChild(sub);

        wrap.appendChild(band);
      });

      const sameHomeCount = gaps.filter(
        (g) => Math.abs(g.effectivePx - homeBetweenPx) <= 1,
      ).length;

      const leg = document.createElement("div");
      leg.style.cssText = [
        "position:fixed",
        "top:10px",
        "right:10px",
        "max-width:min(320px,calc(100vw - 24px))",
        "background:rgba(0,0,0,.88)",
        "color:#eee",
        "padding:14px 16px",
        "font:12px/1.45 system-ui,sans-serif",
        "border-radius:10px",
        "box-shadow:0 8px 32px rgba(0,0,0,.4)",
        "z-index:2147483647",
      ].join(";");
      leg.innerHTML = [
        "<b>Межсекционные шаги (линейки слева)</b><br>",
        `<span style="color:#5eb">■</span> ≈ <code>--home-between</code> (${homeBetweenPx}px) — <b>${sameHomeCount}</b> из ${gaps.length} переходов<br>`,
        `<span style="color:#ec5">■</span> 72px (кейсы: max(0, ${homeBetweenPx}−40))<br>`,
        `<span style="color:#b9f">■</span> 172px (контент-блок Nuxt)<br>`,
        `<span style="color:#ccc">■</span> прочие<br>`,
        "Высота полосы = шаг в px; деления — каждые 8–14px.",
      ].join("");

      document.body.appendChild(wrap);
      document.body.appendChild(leg);

      return {
        homeBetweenPx,
        gapCount: gaps.length,
        sameHomeCount,
        outPath: "(screenshot outside)",
      };
    });

    if (summary && summary.error) throw new Error(summary.error);

    fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
    await page.screenshot({
      path: OUT_PNG,
      fullPage: true,
      animations: "disabled",
    });

    console.log(
      `\nСкриншот: ${OUT_PNG}\n` +
        `Вьюпорт: ${VIEWPORT.width}×${VIEWPORT.height}\n` +
        `Переходов с шагом как --home-between: ${summary.sameHomeCount}/${summary.gapCount}\n`,
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
