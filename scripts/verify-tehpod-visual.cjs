#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.TEHPOD_VISUAL_PORT || 18996);
const PAGE = "/tehnicheskaya-podderzhka-saita";
const URL = `http://127.0.0.1:${PORT}${PAGE}`;
const cssV = "20260629tehpodFormatsFix4";
const crypto = require("crypto");

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function resolveStaticFile(urlPath) {
  let p = (urlPath || "/").split("?")[0];
  if (p === PAGE || p === `${PAGE}/`) {
    return path.join(root, "tehnicheskaya-podderzhka-saita", "index.html");
  }
  if (p.startsWith("/_sa/")) p = p.slice("/_sa".length);
  const rel = p.replace(/^\/+/, "");
  const full = path.join(root, rel);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = resolveStaticFile(req.url || "/");
      if (!file) {
        res.writeHead(404);
        return res.end("404");
      }
      res.setHeader("Content-Type", mimes[path.extname(file).toLowerCase()] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const html = fs.readFileSync(path.join(root, "tehnicheskaya-podderzhka-saita", "index.html"), "utf8");
  assert(!html.includes('id="__nuxt"'), "Найден #__nuxt");
  assert(html.includes("tehpod-approach-block"), "Нет блока подхода");
  assert(html.includes("tehpod-business-result-section"), "Нет блока результата");
  assert(html.includes("swiper-container-tehpod-darkrain"), "Нет слайдера Darkrain");
  assert(html.includes("tehpod-case-video"), "Нет видео Darkrain");
  assert(html.includes("tehpod-formats-heading-section"), "Нет блока форматов");
  assert(html.includes("tehpod-formats-cards-section"), "Нет карточек форматов");
  assert(html.includes("swiper-container-tehpod-cases"), "Нет слайдера Складно/Сытные");
  assert(html.includes("tehpod-inline-lead-section"), "Нет формы обратной связи");
  assert(html.includes("tehpod-team-section"), "Нет блока команды");
  assert(html.includes("tehpod-clients-section"), "Нет блока клиентов");
  assert(html.includes("tehpod-faq-section"), "Нет FAQ");
  assert(html.includes("tehpod-blog-section"), "Нет блога");
  assert(html.includes("tehpod-cases-section"), "Нет кейсов");
  assert(html.includes("tehpod-awards-section"), "Нет наград");
  assert(html.includes("tehpod-synergy-section"), "Нет синергии");
  assert(html.includes("leave-request-cta.js"), "Нет leave-request-cta.js");

  const sytnieBg = fs.readFileSync(path.join(root, "img/services/tehnicheskaya-podderzhka-saita/cases/sytnie-bg.webp"));
  const sytnieSlide = fs.readFileSync(path.join(root, "img/services/tehnicheskaya-podderzhka-saita/cases/sytnie-slide.webp"));
  assert(
    crypto.createHash("md5").update(sytnieBg).digest("hex") !== crypto.createHash("md5").update(sytnieSlide).digest("hex"),
    "sytnie-slide.webp совпадает с фоном — нужен background_small с прода",
  );

  const server = await startServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${URL}/?v=${cssV}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const heroTitle = await page.locator("h1.jumbotron-img-aurora__title").first().textContent();
    assert(/Техническая поддержка сайта/.test(heroTitle || ""), `Hero: ${heroTitle}`);

    const blocks = await page.evaluate(() => {
      const notSuitable = document.querySelector(".tehpod-not-suitable-block");
      const descGrid = notSuitable?.querySelector(".content-block__grid--desc");
      const cols = descGrid ? [...descGrid.querySelectorAll(":scope > .col-4")] : [];
      const sampleDesc = notSuitable?.querySelector(".block__description");
      const sampleName = notSuitable?.querySelector(".block__name");
      return {
        approach: !!document.querySelector(".tehpod-approach-block .block-item"),
        facts: document.querySelectorAll(".tehpod-business-result-section .facts__item").length,
        formats: document.querySelectorAll(".tehpod-formats-cards-section .price-card").length,
        notSuitableColor: sampleDesc ? getComputedStyle(sampleDesc).color : "",
        notSuitableNameColor: sampleName ? getComputedStyle(sampleName).color : "",
        notSuitableGridDisplay: descGrid ? getComputedStyle(descGrid).display : "",
        notSuitableCols: cols.length,
      };
    });
    assert(blocks.approach, "Сетка подхода пустая");
    assert(blocks.facts === 6, `Ожидали 6 facts, got ${blocks.facts}`);
    assert(blocks.formats === 4, `Ожидали 4 price-card, got ${blocks.formats}`);
    assert(blocks.notSuitableColor === "rgb(150, 150, 150)", `Цвет «не подойти»: ${blocks.notSuitableColor}`);
    assert(blocks.notSuitableNameColor === "rgb(255, 255, 255)", `Заголовки «не подойти»: ${blocks.notSuitableNameColor}`);
    assert(blocks.notSuitableGridDisplay === "flex", `Сетка «не подойти»: ${blocks.notSuitableGridDisplay}`);
    assert(blocks.notSuitableCols === 3, `Колонок «не подойти»: ${blocks.notSuitableCols}`);

    const factsGap = await page.evaluate(() => {
      const header = document.querySelector(".tehpod-business-result-section .facts-header");
      const items = document.querySelector(".tehpod-business-result-section .facts__items--desktop");
      const first = items?.querySelector(".facts__item");
      if (!header || !items || !first) return null;
      return {
        headerToFirst: first.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
        firstMarginTop: getComputedStyle(first).marginTop,
        itemsMarginTop: getComputedStyle(items).marginTop,
      };
    });
    assert(factsGap && factsGap.headerToFirst >= 100, `Зазор заголовок→facts: ${factsGap?.headerToFirst}`);
    assert(factsGap?.firstMarginTop === "64px", `margin-top первого facts__item: ${factsGap?.firstMarginTop}`);

    const formatsLayout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".tehpod-formats-cards-section .tehpod-formats-card")];
      if (cards.length !== 4) return null;
      const tops = cards.map((c) => c.getBoundingClientRect().top);
      const uniqueTops = [...new Set(tops.map((t) => Math.round(t)))];
      return { count: cards.length, rows: uniqueTops.length, width: cards[0].getBoundingClientRect().width };
    });
    assert(formatsLayout && formatsLayout.count === 4, "Нужно 4 плашки форматов");
    assert(formatsLayout && formatsLayout.rows === 1, `На десктопе ожидали 1 ряд, got ${formatsLayout?.rows}`);

    const shotDir = path.join(root, "tmp", "tehpod-visual");
    fs.mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: path.join(shotDir, "hero-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 900 } });
    await page.evaluate(() => window.scrollTo(0, 2200));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shotDir, "formats-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 900 } });
    await page.evaluate(() => {
      document.querySelector(".tehpod-not-suitable-block")?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(shotDir, "not-suitable-1440.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    const tail = await page.evaluate(() => {
      const leadTitle = document.querySelector("#sa-inline-lead-root .order-popup__meta h2");
      return {
        leadTitle: leadTitle?.textContent?.trim() || "",
        leadAlign: leadTitle ? getComputedStyle(leadTitle).textAlign : "",
        teamCards: document.querySelectorAll(".tehpod-team-section .team__member-card").length,
        faqQuestions: document.querySelectorAll(".tehpod-faq-section .block__question").length,
        blogSlides: document.querySelectorAll(".tehpod-blog-section .blog-block__content-box-slide").length,
        morSlides: document.querySelectorAll(".tehpod-cases-section .mor-cases-slide:not(.mor-cases-slide_link)").length,
        gridCases: document.querySelectorAll(".tehpod-cases-section .more-cases__item > .case").length,
        awardsUnique: new Set(
          [...document.querySelectorAll(".tehpod-awards-section .awards__card-rating")].map((e) => e.textContent?.trim()),
        ).size,
        synergySlides: document.querySelectorAll(".tehpod-synergy-section .synergy__slide").length,
      };
    });
    assert(/Техническая поддержка сайта/.test(tail.leadTitle), `Заголовок формы: ${tail.leadTitle}`);
    assert(tail.leadAlign === "center", `Форма: text-align ${tail.leadAlign}`);
    assert(tail.teamCards === 9, `Команда: ${tail.teamCards} карточек`);
    assert(tail.faqQuestions === 7, `FAQ: ${tail.faqQuestions} вопросов`);

    const faqLayout = await page.evaluate(() => {
      const section = document.querySelector(".tehpod-faq-section");
      const wr = document.querySelector(".tehpod-faq-root.questions-wr");
      const blocks = document.querySelector(".tehpod-faq-root .questions__blocks");
      const title = document.querySelector(".tehpod-faq-root .questions__title");
      if (!section || !wr || !blocks || !title) return null;
      const sectionPt = parseFloat(getComputedStyle(section).paddingTop) || 0;
      const wrPt = parseFloat(getComputedStyle(wr).paddingTop) || 0;
      return {
        gridDisplay: getComputedStyle(blocks).display,
        gridCols: getComputedStyle(blocks).gridTemplateColumns.split(" ").length,
        titleFontSize: getComputedStyle(title).fontSize,
        titleMarginBottom: getComputedStyle(title).marginBottom,
        sectionPaddingTop: sectionPt,
        wrPaddingTop: wrPt,
        totalTopPad: sectionPt + wrPt,
      };
    });
    assert(faqLayout, "FAQ layout: нет DOM");
    assert(faqLayout.gridDisplay === "grid", `FAQ grid: ${faqLayout.gridDisplay}`);
    assert(faqLayout.gridCols === 3, `FAQ колонок: ${faqLayout.gridCols}`);
    assert(faqLayout.titleFontSize === "46px", `FAQ заголовок: ${faqLayout.titleFontSize}`);
    assert(faqLayout.titleMarginBottom === "80px", `FAQ margin заголовка: ${faqLayout.titleMarginBottom}`);
    assert(faqLayout.sectionPaddingTop === 0, `FAQ section padding-top: ${faqLayout.sectionPaddingTop}`);
    assert(faqLayout.wrPaddingTop >= 100, `FAQ questions-wr padding-top: ${faqLayout.wrPaddingTop}`);
    assert(faqLayout.totalTopPad < 150, `FAQ двойной отступ: ${faqLayout.totalTopPad}`);

    await page.evaluate(() => {
      document.querySelector(".tehpod-faq-section")?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(shotDir, "faq-1440.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    assert(tail.blogSlides === 10, `Блог: ${tail.blogSlides} слайдов`);
    const blogFirst = await page.evaluate(() => {
      const first = document.querySelector(".tehpod-blog-section .blog-block__content-box-slide a");
      return first?.getAttribute("href") || "";
    });
    assert(
      !blogFirst.includes("rabota-s-auditoriej-konkurentov"),
      `Блог: первая карточка не по теме — ${blogFirst}`,
    );
    assert(
      blogFirst.includes("produktovyj-ux-analiz") || blogFirst.includes("kak-optimizirovat-izobrazheniya"),
      `Блог: ожидали UX/SEO статью первой, got ${blogFirst}`,
    );
    assert(tail.morSlides === 8, `Кейсы слайдер: ${tail.morSlides}`);
    assert(tail.gridCases === 8, `Кейсы сетка: ${tail.gridCases}`);
    assert(tail.awardsUnique === 10, `Награды: ${tail.awardsUnique} уникальных`);
    assert(tail.synergySlides === 3, `Синергия: ${tail.synergySlides}`);

    await page.evaluate(() => {
      document.querySelector(".tehpod-inline-lead-section")?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(shotDir, "inline-lead-1440.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    console.log("verify-tehpod-visual: ok", shotDir);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error("verify-tehpod-visual:", e.message);
  process.exit(1);
});
