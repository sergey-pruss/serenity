#!/usr/bin/env node
/**
 * Регрессия после правок FAQ always-visible и зазора синергии (kontekstnaya + targeting).
 * Запуск: node scripts/verify-service-faq-synergy-regression.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const PAGES = [
  {
    slug: "kontekstnaya_reklama",
    faqId: "kontekst-faq-mounted",
    faqClass: "kontekst-faq-root--always-visible",
    stackV: "kontekstSynergyHeadingGap",
  },
  {
    slug: "targeting",
    faqId: "targeting-faq-mounted",
    faqClass: "targeting-faq-root--always-visible",
    stackV: "targetingFaqExpanded",
  },
];

async function checkHtml(page) {
  const html = read(`${page.slug}/index.html`);
  assert(html.includes(page.faqClass), `${page.slug}: класс ${page.faqClass}`);
  assert(
    !new RegExp(
      `id="${page.faqId}"[\\s\\S]{0,120000}spoiler__content" style="height:\\s*0`,
    ).test(html),
    `${page.slug}: FAQ без inline height:0`,
  );
  assert(html.includes("kontekst-synergy-root"), `${page.slug}: синергия`);
  assert(html.includes(page.stackV) || html.includes("kontekstSynergyHeadingGap"), `${page.slug}: актуальный ?v= CSS`);
}

async function checkRendered(baseUrl, page) {
  const url = `${baseUrl}/${page.slug}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pw = await ctx.newPage();
  await pw.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await pw.waitForTimeout(800);

  const data = await pw.evaluate((faqId) => {
    const faq = document.getElementById(faqId);
    const syn = document.querySelector(".kontekst-synergy-root");
    const h = syn?.querySelector("h3.services__title");
    const card = syn?.querySelector(".services__card");
    const spoilers = faq
      ? [...faq.querySelectorAll(".spoiler__content")].map((el) => ({
          h: getComputedStyle(el).height,
          visible: el.offsetHeight > 20,
        }))
      : [];
    const gap =
      h && card ? Math.round(card.getBoundingClientRect().top - h.getBoundingClientRect().bottom) : null;
    const text = syn?.querySelector(".services__text");
    return {
      spoilers,
      allSpoilersVisible: spoilers.length > 0 && spoilers.every((s) => s.visible),
      gap,
      textPb: text ? getComputedStyle(text).paddingBottom : null,
      h3Mb: h ? getComputedStyle(h).marginBottom : null,
      wrapperPt: syn
        ? getComputedStyle(syn.querySelector(".services__context-wrapper")).paddingTop
        : null,
    };
  }, page.faqId);

  await browser.close();

  assert(data.allSpoilersVisible, `${page.slug}: все ответы FAQ видимы (${url})`);
  assert(data.gap === 80, `${page.slug}: зазор заголовок→карточки синергии ${data.gap}px (ожид. 80)`);
  assert(data.textPb === "80px", `${page.slug}: padding-bottom .services__text = ${data.textPb}`);
  assert(data.h3Mb === "0px", `${page.slug}: margin-bottom h3 = ${data.h3Mb}`);
  assert(data.wrapperPt === "0px", `${page.slug}: padding-top wrapper = ${data.wrapperPt}`);
}

async function main() {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
  for (const page of PAGES) {
    await checkHtml(page);
    await checkRendered(baseUrl, page);
    console.log(`OK ${page.slug}`);
  }
  console.log("verify-service-faq-synergy-regression: все проверки пройдены");
}

main().catch((e) => {
  console.error("verify-service-faq-synergy-regression: FAIL");
  console.error(e.message);
  process.exit(1);
});
