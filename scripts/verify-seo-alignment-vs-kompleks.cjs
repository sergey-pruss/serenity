#!/usr/bin/env node
/**
 * Сравнение левого края заголовков /seo vs /kompleksnoye-prodvizheniye (эталон).
 * ORIGIN=http://127.0.0.1:8895 node scripts/verify-seo-alignment-vs-kompleks.cjs
 */
const { chromium } = require("playwright");

const BASE = (process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function measure(page, selectors) {
  const out = {};
  for (const [key, sel] of Object.entries(selectors)) {
    const left = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      return Math.round(el.getBoundingClientRect().left);
    }, sel);
    out[key] = left;
    await page.waitForTimeout(50);
  }
  return out;
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const komSels = {
    channelsTitle: ".kompleksnoye-channels-block h2",
    channelsCol: ".kompleksnoye-channels-grid .block__name",
    teamTitle: ".kompleksnoye-team-section .team__head h2",
    clientsTitle: ".clients-mainstr .home-clients-awards__title",
    faqTitle: ".korporativnyj-faq-root .questions__title",
    blogTitle: ".kompleksnoye-blog-section .services__title",
    synergyServicesTitle: ".kontekst-synergy-root .services__title",
    casesTitle: ".more-case-wr__main h3.kontekstnaya-page__section-heading",
    awardsTitle: ".home-clients-awards__title",
  };

  const seoSels = {
    synergyTitle: ".seo-synergy-tools-section h2",
    synergyCol: ".seo-synergy-tools-grid .block__name",
    teamTitle: ".seo-team-section .team__head h2",
    clientsTitle: ".seo-clients-section .home-clients-awards__title",
    faqTitle: ".korporativnyj-faq-root .questions__title",
    blogTitle: ".seo-blog-section .services__title",
    synergyServicesTitle: ".seo-synergy-section .synergy__title",
    casesTitle: ".seo-cases-section .more-cases h3",
    awardsTitle: ".seo-awards-section .home-clients-awards__title",
  };

  await page.goto(`${BASE}/kompleksnoye-prodvizheniye`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  const kom = await measure(page, komSels);

  await page.goto(`${BASE}/seo`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  const seoHref = await page.evaluate(() =>
    document.querySelector('link[href*="seo-static-stack"]')?.getAttribute("href"),
  );
  const seo = await measure(page, seoSels);

  await browser.close();

  const ref = kom.teamTitle ?? kom.channelsTitle;
  const tol = 2;
  const errors = [];

  const check = (label, seoKey, komKey) => {
    const s = seo[seoKey];
    const k = kom[komKey];
    if (s == null) errors.push(`${label}: нет элемента SEO (${seoKey})`);
    else if (k == null) errors.push(`${label}: нет элемента KOM (${komKey})`);
    else if (Math.abs(s - k) > tol) errors.push(`${label}: SEO ${s}px vs KOM ${k}px (Δ${s - k})`);
  };

  check("Команда", "teamTitle", "teamTitle");
  check("Синергия/каналы заголовок", "synergyTitle", "channelsTitle");
  check("Синергия/каналы колонка", "synergyCol", "channelsCol");
  check("Клиенты", "clientsTitle", "clientsTitle");
  check("FAQ", "faqTitle", "faqTitle");
  check("Блог", "blogTitle", "blogTitle");
  check("Синергия услуг", "synergyServicesTitle", "synergyServicesTitle");
  if (kom.casesTitle != null && kom.casesTitle > 0) {
    check("Кейсы заголовок", "casesTitle", "casesTitle");
  } else if (seo.casesTitle != null && Math.abs(seo.casesTitle - (kom.blogTitle ?? 78)) > tol) {
    errors.push(
      `Кейсы заголовок: SEO ${seo.casesTitle}px vs эталон ~${kom.blogTitle ?? 78}px (на kompleks h3 скрыт)`,
    );
  }
  check("Награды", "awardsTitle", "awardsTitle");

  console.log("kompleksnoye", kom);
  console.log("seo", seo);
  console.log("seo-static-stack", seoHref);

  if (errors.length) {
    console.error("verify-seo-alignment-vs-kompleks: FAIL");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("verify-seo-alignment-vs-kompleks: ok");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
