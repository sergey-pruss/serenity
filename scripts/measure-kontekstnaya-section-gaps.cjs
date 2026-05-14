#!/usr/bin/env node
/**
 * Локально измеряет вертикальные промежутки (px) между соседними
 * section.page-constructor__section внутри .page-constructor на странице
 * /kontekstnaya_reklama/ и пишет таблицу + SVG-схему с подписями в px.
 *
 * Запуск из корня репозитория:
 *   node scripts/measure-kontekstnaya-section-gaps.cjs
 *
 * Переменные окружения:
 *   VIEWPORT_W=1280 VIEWPORT_H=900 — вьюпорт браузера
 *   GAP_SVG=tmp/kontekstnaya-section-gaps.svg — путь к SVG (по умолчанию tmp/…)
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
const OUT_SVG = path.join(
  ROOT,
  process.env.GAP_SVG || "tmp/kontekstnaya-section-gaps.svg",
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
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
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
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
    server.on("error", reject);
  });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg({ sections, gaps, homeBetween }) {
  const bandW = 280;
  const sectionBandH = 36;
  const gapScale = 1.2;
  const maxGapDraw = 160;
  const rulerW = 48;
  const pad = 12;
  const gapHeights = gaps.map((g) =>
    Math.min(maxGapDraw, Math.max(22, Math.max(0, g.effectivePx) * gapScale)),
  );
  const headerH = 52;
  let yTotal =
    pad +
    headerH +
    sections.length * sectionBandH +
    gapHeights.reduce((a, h) => a + h + 4, 0) +
    pad;

  const svgW = rulerW + bandW + pad * 2;
  const parts = [];
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${yTotal}" viewBox="0 0 ${svgW} ${yTotal}" style="background:#1a1a1a">`,
    `<text x="${pad}" y="22" fill="#eee" font-size="13" font-family="system-ui,sans-serif">--home-between: ${homeBetween}px (computed)</text>`,
    `<text x="${pad}" y="38" fill="#999" font-size="10" font-family="system-ui,sans-serif">Зазор: max(DOM между section, padding-top+margin-top следующего блока)</text>`,
  );
  let y = pad + headerH;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    parts.push(
      `<rect x="${pad + rulerW}" y="${y}" width="${bandW}" height="${sectionBandH}" fill="#2d3d55" stroke="#5a7ab0"/>`,
      `<text x="${pad + rulerW + 6}" y="${y + 22}" fill="#fff" font-size="11" font-family="system-ui,sans-serif">${escapeXml(
        `${i + 1}. ${sec.label}`,
      )}</text>`,
    );
    parts.push(
      `<text x="${pad + 4}" y="${y + 22}" fill="#888" font-size="10" font-family="monospace">${Math.round(sec.top)}</text>`,
    );
    y += sectionBandH;

    if (i < gaps.length) {
      const g = gaps[i];
      const h = gapHeights[i];
      parts.push(
        `<rect x="${pad + rulerW}" y="${y}" width="${bandW}" height="${h}" fill="#3d2d40" stroke="#b05a7a"/>`,
        `<text x="${pad + rulerW + bandW / 2}" y="${y + h / 2 + 4}" fill="#ffb3c9" font-size="13" font-weight="600" font-family="system-ui,sans-serif" text-anchor="middle">${g.effectivePx}px</text>`,
      );
      parts.push(
        `<line x1="${pad}" y1="${y + h / 2}" x2="${pad + rulerW - 4}" y2="${y + h / 2}" stroke="#666" stroke-width="1"/>`,
        `<text x="${pad + 2}" y="${y + h / 2 + 4}" fill="#aaa" font-size="10" font-family="monospace">${g.effectivePx}</text>`,
      );
      y += h + 4;
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

async function main() {
  const { server, port } = await startStaticServer();
  const url = `http://127.0.0.1:${port}/kontekstnaya_reklama/`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForSelector(".page-constructor", { timeout: 30_000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    const data = await page.evaluate(() => {
      const root = document.querySelector(".page-constructor");
      if (!root) return null;
      const sections = Array.from(
        root.querySelectorAll(":scope > section.page-constructor__section"),
      );
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

      function labelFor(sec) {
        const h1 = sec.querySelector("h1");
        if (h1 && h1.textContent) return h1.textContent.trim().slice(0, 56);
        const h2 = sec.querySelector("h2");
        if (h2 && h2.textContent) return h2.textContent.trim().slice(0, 56);
        const h3 = sec.querySelector("h3");
        if (h3 && h3.textContent) return h3.textContent.trim().slice(0, 56);
        if (sec.classList.contains("sa-service-lead-section")) return "Инлайн-форма заявки";
        if (sec.querySelector(".cases-block")) return "Кейсы (слайдер)";
        if (sec.querySelector(".team-block")) return "Команда";
        if (sec.classList.contains("kontekst-faq-section")) return "Вопрос-ответ";
        if (sec.classList.contains("kontekst-synergy-root")) return "Синергия услуг";
        return sec.className.trim().slice(0, 48) || "section";
      }

      /** Отступ «сверху» у следующей секции: margin/padding у секции или у внутреннего блока с --home-between. */
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

      const items = sections.map((el) => {
        const r = docRect(el);
        return {
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          label: labelFor(el),
          rhythm: rhythmFor(el),
        };
      });

      const gaps = [];
      for (let i = 0; i < items.length - 1; i++) {
        const domFlushPx = Math.round(items[i + 1].top - items[i].bottom);
        const rhy = items[i + 1].rhythm;
        const rhythmSum = rhy.pt + rhy.mt;
        gaps.push({
          from: i,
          to: i + 1,
          domFlushPx,
          rhythmPx: rhythmSum,
          rhythmTarget: rhy.target,
          rhythmPt: rhy.pt,
          rhythmMt: rhy.mt,
          /** Что показываем как «шаг»: внешний зазор между section или внутренний верхний отступ следующей. */
          effectivePx: domFlushPx > 0 ? domFlushPx : rhythmSum,
        });
      }

      const homeBetween = getComputedStyle(document.documentElement)
        .getPropertyValue("--home-between")
        .trim();

      let homeBetweenPx = null;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;left:-9999px;top:0;width:0;height:0;visibility:hidden";
      probe.style.paddingTop = "var(--home-between)";
      document.body.appendChild(probe);
      const st = getComputedStyle(probe);
      const pt = parseFloat(st.paddingTop);
      if (Number.isFinite(pt)) homeBetweenPx = Math.round(pt);
      document.body.removeChild(probe);

      return { items, gaps, homeBetween, homeBetweenPx };
    });

    if (!data) throw new Error("Нет .page-constructor или секций");

    console.log(
      `\nВьюпорт: ${VIEWPORT.width}×${VIEWPORT.height}\nURL: ${url}\n`,
    );
    console.log(
      `CSS --home-between (raw): "${data.homeBetween}"  →  resolved ~ ${data.homeBetweenPx}px\n`,
    );
    console.log(
      "Межсекционный шаг (пиксели):\n" +
        "  effective — если между <section> есть зазор (DOM), он; иначе padding-top+margin-top у внутреннего блока следующей секции (ритм --home-between и т.д.).\n",
    );
    for (const g of data.gaps) {
      const a = data.items[g.from].label;
      const b = data.items[g.to].label;
      console.log(
        `  [${g.from + 1}→${g.to + 1}] ${g.effectivePx}px  (DOM между section: ${g.domFlushPx}px; следующий блок ${g.rhythmTarget}: padding-top ${g.rhythmPt}px + margin-top ${g.rhythmMt}px)`,
      );
      console.log(`      после: «${a}»`);
      console.log(`      до:    «${b}»\n`);
    }

    const svg = buildSvg({
      sections: data.items,
      gaps: data.gaps,
      homeBetween: data.homeBetweenPx ?? (data.homeBetween || "?"),
    });
    fs.mkdirSync(path.dirname(OUT_SVG), { recursive: true });
    fs.writeFileSync(OUT_SVG, svg, "utf8");
    console.log(`SVG: ${OUT_SVG}`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
