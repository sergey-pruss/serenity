#!/usr/bin/env node
/**
 * Блок «Кейсы» /seo: только SEO-продвижение с измеримыми результатами (cases-all + страница кейса).
 * Порядок — как на /case/all/ среди прошедших фильтр.
 *
 * REFRESH_SEO_CASE_TOPIC_CACHE=1 — перепроверить страницы и обновить seo-case-topic-cache.json.
 * SEO_MORE_CASES_OFFLINE=1 — только кэш + текст карточек (без fetch страниц).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const {
  renderMorSlide,
  renderGridCase,
  buildCtaSlide,
  normalizeHref,
} = require("./lib/build-more-cases-cards-html.cjs");
const { pickSeoCasesForServiceBlock } = require("./lib/seo-case-topic.cjs");

const root = path.resolve(__dirname, "..");
const CASES_ALL = path.join(root, "json", "cases-all.json");
const OUT_JSON = path.join(root, "json", "services", "seo", "more-cases.json");
const MANIFEST_PATH = path.join(root, "json", "services", "seo", "more-cases-manifest.json");
const MORE_HREF = "/case/all/";
/** Карточек в блоке «Кейсы» на /seo (порядок — /case/all/, скоринг SEO + результат). */
const EXPECTED = 8;

function normHref(h) {
  return normalizeHref(h).replace(/\/$/, "");
}

function loadCasesByHrefs(hrefs) {
  const data = JSON.parse(fs.readFileSync(CASES_ALL, "utf8"));
  const byHref = new Map();
  for (const c of data.cases || []) {
    byHref.set(normHref(c.href), c);
  }
  return hrefs.map((h) => {
    const key = normHref(h);
    const c = byHref.get(key);
    if (!c) throw new Error(`build-seo-more-cases: нет кейса в cases-all: ${h}`);
    return c;
  });
}

function buildBodyHtml(cases) {
  const ctaSlide = buildCtaSlide(MORE_HREF);
  const slides = cases.map(renderMorSlide).join("");
  const sliderInner = `<div data-v-38965faa="" class="swiper-wrapper">${slides} ${ctaSlide} </div> <div data-v-38965faa="" class="swiper-pagination"></div>`;
  const gridCases = cases.map((c, idx) => renderGridCase(c, idx)).join("");
  const lastCase = `<a data-v-27a87df0="" href="${MORE_HREF}" class="last-case"><p data-v-27a87df0="">Смотреть больше&nbsp;кейсов</p> <img data-v-27a87df0="" src="/_sa/img/video__lastBlogGif.gif" loop="loop" playsinline="" loading="lazy" class="video_last"> <div data-v-27a87df0="" class="last-case__bg"></div></a>`;

  return `<section class="page-constructor__section seo-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container">${sliderInner}</div></div> <div data-v-27a87df0="" class="more-cases"><h3 class="services__title kontekstnaya-page__section-heading">Кейсы</h3> <div data-v-27a87df0="" class="more-cases__item">${gridCases} ${lastCase}</div></div></div></div></section>`;
}

async function main() {
  const refreshCache = process.env.REFRESH_SEO_CASE_TOPIC_CACHE === "1";
  const offline = process.env.SEO_MORE_CASES_OFFLINE === "1";

  const { hrefs, cachePath } = await pickSeoCasesForServiceBlock({
    root,
    limit: EXPECTED,
    refreshCache,
    fetchPages: !offline,
  });

  if (hrefs.length !== EXPECTED) {
    throw new Error(`pickSeoCases: нужно ${EXPECTED} href, сейчас ${hrefs.length}`);
  }

  const cases = loadCasesByHrefs(hrefs);
  const body = processTypographyHtml(buildBodyHtml(cases), { force: true }).html.trim();

  const manifest = {
    builtAt: new Date().toISOString(),
    source: "case-all listing order + SEO topic filter",
    cachePath: path.relative(root, cachePath),
    hrefs,
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify({ manifest, bodyHtml: body }, null, 2)}\n`,
    "utf8",
  );

  console.log("Wrote", path.relative(root, MANIFEST_PATH));
  console.log("Wrote", path.relative(root, OUT_JSON), "—", cases.length, "кейсов");
  console.log("  order:", hrefs.join(", "));
  execSync("node scripts/build-service-more-cases-partials.cjs", { cwd: root, stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
