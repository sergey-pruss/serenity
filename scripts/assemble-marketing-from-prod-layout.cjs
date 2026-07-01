#!/usr/bin/env node
/**
 * Сборка /services/marketing — тот же каркас и стили, что /targeting (без правок targeting/).
 * Источник разметки: targeting/index.html; контент — partials + json/services/marketing/.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");
const { sanitizeMoreCasesCapture } = require("./sanitize-more-cases-capture.cjs");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");
const { MARKETING_H2, htmlHasSectionTitle } = require("./lib/marketing-h2-anchors.cjs");

const root = path.resolve(__dirname, "..");
const cfg = loadServiceConfig("marketing");
const targetingIndexPath = path.join(root, "targeting", "index.html");
const marketingIndexPath = cfg.indexPath;
const partialsRoot = path.join(root, "html", "partials", "services");

const SRC_MAIN_START = "<!-- TARGETING-MAIN-START -->";
const SRC_MAIN_END = "<!-- TARGETING-MAIN-END -->";
const SRC_CSS_START = "<!-- TARGETING-CSS-BUNDLE-START";
const SRC_CSS_END = "<!-- TARGETING-CSS-BUNDLE-END -->";
const MAIN_START = "<!-- MARKETING-MAIN-START -->";
const MAIN_END = "<!-- MARKETING-MAIN-END -->";
const CSS_END = "<!-- MARKETING-CSS-BUNDLE-END -->";

const PHASE2_MIDDLE = path.join(partialsRoot, "marketing-phase2-middle.html");
const CM_WIDE_SLIDER_BLOCK = path.join(partialsRoot, "marketing-cm-wide-slider-block.html");
const BRAND_BLOCK = path.join(partialsRoot, "marketing-brand-block.html");
const BRAND_STRATEGY_BLOCK = path.join(partialsRoot, "marketing-brand-strategy-block.html");
const CONTENT_STRATEGY_BLOCK = path.join(partialsRoot, "marketing-content-strategy-block.html");
const ORANGE_CASE_SLIDER_BLOCK = path.join(partialsRoot, "marketing-case-slider-orange.html");
const SITE_CASES_SLIDER_BLOCK = path.join(partialsRoot, "marketing-case-slider-site.html");
const SEO_CASES_SLIDER_BLOCK = path.join(partialsRoot, "marketing-case-slider-seo.html");
const BRAND_AWARENESS_BLOCK = path.join(partialsRoot, "marketing-brand-awareness-block.html");
const SITE_BLOCK = path.join(partialsRoot, "marketing-site-block.html");
const SITE_H2 = MARKETING_H2.SITE;
const PROMOTION_H2 = MARKETING_H2.PROMOTION;
const ADVERTISING_H2 = MARKETING_H2.ADVERTISING;
const TOOLS_H2 = MARKETING_H2.TOOLS;
const CONTENT_MARKETING_H2 = MARKETING_H2.CONTENT_MARKETING;
const CONTENT_MARKETING_CHANNELS_H2 = MARKETING_H2.CONTENT_MARKETING_CHANNELS;
const SEO_H2 = MARKETING_H2.SEO;
const SALES_H2 = MARKETING_H2.SALES;
const BRAND_H2 = MARKETING_H2.BRAND;
const BRAND_STRATEGY_H2 = MARKETING_H2.BRAND_STRATEGY;
const MEASURABLE_PROMOTION_BLOCK = path.join(partialsRoot, "marketing-measurable-promotion-block.html");
const ADVERTISING_BLOCK = path.join(partialsRoot, "marketing-advertising-block.html");
const TOOLS_BLOCK = path.join(partialsRoot, "marketing-tools-block.html");
const CONTENT_MARKETING_BLOCK = path.join(partialsRoot, "marketing-content-marketing-block.html");
const CONTENT_MARKETING_CHANNELS_BLOCK = path.join(
  partialsRoot,
  "marketing-content-marketing-channels-block.html",
);
const SEO_BLOCK = path.join(partialsRoot, "marketing-seo-block.html");
const SALES_BLOCK = path.join(partialsRoot, "marketing-sales-block.html");
const MARKER_MIDDLE = "<!-- TARGETING-PHASE2:middle -->";

const FAQ_SECTION_START = '<section class="page-constructor__section targeting-faq-section">';
const FAQ_BLOCK_TAIL = "</script></div></section>";
const CASES_MORE_MAIN = "more-case-wr more-case-wr__main";
const CASES_CLASS_PREFIX = 'class="more-case-wr';
const SECTION_OPEN = '<section class="page-constructor__section';

/** SEO /services/marketing (prod). */
const MARKETING_META = {
  title: "Агентство комплексного маркетинга — услуги в Москве и СПб | Serenity",
  description:
    "Услуги комплексного маркетинга для бизнеса: стратегия, контекст, таргет, SEO. Кейсы и стоимость — агентство Serenity, Москва и Санкт-Петербург. Оставить заявку →",
  ogTitle: "Агентство комплексного маркетинга — услуги в Москве и СПб | Serenity",
  ogDescription:
    "Услуги комплексного маркетинга для бизнеса: стратегия, контекст, таргет, SEO. Кейсы и стоимость — агентство Serenity, Москва и Санкт-Петербург. Оставить заявку →",
  ogImage: "https://serenity.agency/_sa/img/services/marketing/hero/10-1-1600x900.jpg",
};

const MARKETING_HERO_SUBTITLE =
  "Агентство комплексного маркетинга: синергия маркетинговых инструментов многократно увеличивает их&nbsp;эффективность для&nbsp;бизнеса.";
const MARKETING_HERO_LEAD =
  '<p class="marketing-hero-lead content-block__desc" data-v-04503aeb="">Услуги комплексного маркетинга объединяют стратегию, бренд и&nbsp;измеримое продвижение — выстраиваем систему, которая приносит заявки и&nbsp;продажи.</p>';

function readPartialKeepScoped(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.warn("assemble-marketing: нет partial", p);
    return null;
  }
  let html = fs.readFileSync(p, "utf8").trim();
  html = html.replace(/<motion\.div/g, "<div");
  html = html.replace(/<\/motion\.div>/g, "</div>");
  html = html.replace(/\s*<!---->\s*/g, "\n");
  return html;
}

/** Блок наград: frozen partial с prod-marketing (lead + слайды), data-v сохраняются. */
function readMarketingAwardsBlock() {
  const p = path.join(partialsRoot, "awards-marketing-block.html");
  if (!fs.existsSync(p)) {
    console.warn("assemble-marketing: нет awards-marketing-block.html");
    return "";
  }
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .replace(/\s*swiper-container-initialized/g, "")
    .replace(/\s*swiper-container-horizontal/g, "")
    .replace(/\s*swiper-container-free-mode/g, "")
    .replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
}

function readPartial(file) {
  const p = path.join(partialsRoot, file);
  if (!fs.existsSync(p)) {
    console.warn("assemble-marketing: нет partial", p);
    return null;
  }
  return stripNuxtScopedMarkup(fs.readFileSync(p, "utf8").trim());
}

function readMoreCasesPartial() {
  const p = path.join(partialsRoot, "more-cases-marketing.html");
  if (!fs.existsSync(p)) return null;
  let html = fs.readFileSync(p, "utf8").trim().replace(/^<!--[\s\S]*?-->\s*/, "");
  return sanitizeMoreCasesCapture(html, { keepGrid: true });
}

/** Только тексты героя — разметка и data-v-* как на /targeting (иначе ломается шрифт Nuxt-бандла). */
function patchHeroTexts(main, h1Text, subtitleHtml) {
  const titleIdx = main.indexOf("c-title-block__title");
  if (titleIdx < 0) return main;
  let out = main;
  out = out.replace(/(<h1 class="c-title-block__title"[^>]*>)[^<]*(<\/h1>)/, `$1${h1Text}$2`);
  out = out.replace(
    /(<h4 class="c-title-block__subtitle"[^>]*>)[\s\S]*?(<\/h4>)/,
    `$1${subtitleHtml}$2`,
  );
  return out;
}

function injectHeroLead(main) {
  if (main.includes("marketing-hero-lead")) return main;
  return main.replace(/(<\/header>)/, `$1 ${MARKETING_HERO_LEAD}`);
}

/** Коллаж case-slider под заголовком — только на /targeting, на marketing не нужен. */
function stripHeroCaseSlider(mainHtml) {
  const wrap = mainHtml.indexOf("case-slider__wrapper");
  if (wrap < 0) return mainHtml;
  const hero = mainHtml.indexOf("c-title-block");
  if (hero < 0) return mainHtml;
  const divStart = mainHtml.lastIndexOf("<div", wrap);
  const keepFrom = mainHtml.indexOf("<!----> <!----></div></section>", divStart);
  if (divStart < 0 || keepFrom < 0) return mainHtml;
  return mainHtml.slice(0, divStart) + mainHtml.slice(keepFrom);
}

function injectFaq(mainHtml) {
  const partial = readPartial("faq-marketing.html");
  if (!partial) return mainHtml;
  const casesIdx = mainHtml.indexOf('class="more-case-wr');
  const regionEnd = casesIdx >= 0 ? casesIdx : mainHtml.indexOf('class="awards__title">Награды');
  if (regionEnd < 0) return mainHtml;
  const region = mainHtml.slice(0, regionEnd);
  const startRes = [
    /<section class="page-constructor__section targeting-faq-section">/,
    /<section class="page-constructor__section"><div[^>]*class="questions-wr page__container_admin">/,
  ];
  let m;
  for (const startRe of startRes) {
    m = region.match(startRe);
    if (m && m.index !== undefined) break;
  }
  if (!m || m.index === undefined) {
    console.warn("assemble-marketing: FAQ не найден");
    return mainHtml;
  }
  const cutEnd =
    casesIdx > m.index
      ? mainHtml.lastIndexOf('<section class="page-constructor__section">', casesIdx)
      : regionEnd;
  if (cutEnd <= m.index) return mainHtml;
  return `${mainHtml.slice(0, m.index)}${partial}\n${mainHtml.slice(cutEnd)}`;
}

function injectInlineLead(mainHtml) {
  if (mainHtml.includes('id="sa-inline-lead-root"')) {
    const partial = readPartial("service-inline-lead-marketing.html");
    if (!partial) return mainHtml;
    const leadIdx = mainHtml.indexOf("sa-service-lead-section");
    if (leadIdx < 0) return mainHtml;
    const leadSec = mainHtml.lastIndexOf(SECTION_OPEN, leadIdx);
    const leadEnd = mainHtml.indexOf("</section>", leadIdx) + "</section>".length;
    if (leadSec < 0) return mainHtml;
    return `${mainHtml.slice(0, leadSec)}${partial}\n${mainHtml.slice(leadEnd)}`;
  }
  const partial = readPartial("service-inline-lead-marketing.html");
  if (!partial) return mainHtml;
  const starts = [
    '<section class="page-constructor__section"><div class="forms modern">',
    '<section class="page-constructor__section"><motion.div class="forms modern">',
  ];
  let i0 = -1;
  for (const s of starts) {
    const i = mainHtml.indexOf(s);
    if (i >= 0) {
      i0 = i;
      break;
    }
  }
  if (i0 < 0) return mainHtml;
  const iClose = mainHtml.indexOf("</form>", i0);
  if (iClose < 0) return mainHtml;
  const iEnd = mainHtml.indexOf("</section>", iClose) + "</section>".length;
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(iEnd)}`;
}

function extractMoreCasesSectionBounds(mainHtml) {
  const idxMarketing = mainHtml.indexOf("marketing-cases-section");
  const idx =
    idxMarketing >= 0
      ? idxMarketing
      : mainHtml.indexOf("more-case-wr more-case-wr__main") >= 0
        ? mainHtml.indexOf("more-case-wr more-case-wr__main")
        : mainHtml.indexOf('class="more-case-wr');
  if (idx < 0) return { start: -1, end: -1 };
  const start = mainHtml.lastIndexOf('<section class="page-constructor__section', idx);
  if (start < 0) return { start: -1, end: -1 };
  const end = mainHtml.indexOf("</section>", idx) + "</section>".length;
  return { start, end };
}

function injectMoreCases(mainHtml) {
  const partial = readMoreCasesPartial();
  if (!partial) return mainHtml;
  const { start, end } = extractMoreCasesSectionBounds(mainHtml);
  if (start < 0 || end <= start) {
    console.warn("assemble-marketing: more-case-wr не найден");
    return mainHtml;
  }
  return `${mainHtml.slice(0, start)}${partial}\n${mainHtml.slice(end)}`;
}

function injectAwards(mainHtml) {
  const partial = readMarketingAwardsBlock();
  if (!partial) return mainHtml;
  const needles = [
    'id="targeting-awards-heading"',
    'id="marketing-awards-heading"',
    'id="sa-home-awards-mounted"',
    'class="awards__title">Награды',
  ];
  let i0 = -1;
  for (const n of needles) {
    const i = mainHtml.indexOf(n);
    if (i >= 0) {
      i0 = i;
      break;
    }
  }
  if (i0 < 0) {
    console.warn("assemble-marketing: секция наград не найдена");
    return mainHtml;
  }
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, i0);
  const syn = mainHtml.indexOf("kontekst-synergy-root", i0);
  const secEnd =
    syn > i0
      ? mainHtml.lastIndexOf(SECTION_OPEN, syn)
      : mainHtml.indexOf("</section>", i0) + "</section>".length;
  if (secStart < 0) return mainHtml;
  return `${mainHtml.slice(0, secStart)}${partial}\n${mainHtml.slice(secEnd)}`;
}

function injectSynergy(mainHtml) {
  const partial = readPartial("synergy-marketing.html");
  if (!partial) return mainHtml;
  const starts = [
    '<section class="page-constructor__section kontekst-synergy-root',
    '<section class="page-constructor__section"><section data-v-627ccbce="" class="synergy-section">',
  ];
  let i0 = -1;
  for (const s of starts) {
    const i = mainHtml.indexOf(s);
    if (i >= 0) {
      i0 = i;
      break;
    }
  }
  if (i0 < 0) {
    console.warn("assemble-marketing: synergy не найден");
    return mainHtml;
  }
  const close = "</section></section>";
  const j = mainHtml.indexOf(close, i0);
  if (j < 0) return mainHtml;
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(j + close.length)}`;
}

function injectPhase2(mainHtml) {
  const include =
    process.env.MARKETING_INCLUDE_PHASE2 === "1" ||
    process.env.MARKETING_INCLUDE_PHASE2 === "true" ||
    cfg.assemble.phase2 === true;
  if (!include || !fs.existsSync(PHASE2_MIDDLE)) return mainHtml;
  const mid = fs.readFileSync(PHASE2_MIDDLE, "utf8").trim();
  if (mainHtml.includes(MARKER_MIDDLE)) {
    return mainHtml.replace(MARKER_MIDDLE, mid);
  }
  const phase2Start = mainHtml.indexOf("<!-- phase2: approach") >= 0
    ? mainHtml.indexOf("<!-- phase2: approach")
    : mainHtml.indexOf("<!-- phase2: facts");
  const leadIdx = mainHtml.indexOf("sa-service-lead-section");
  if (phase2Start < 0 || leadIdx <= phase2Start) {
    console.warn("assemble-marketing: phase2 — не найден срез (comment или lead)");
    return mainHtml;
  }
  const leadSec = mainHtml.lastIndexOf(SECTION_OPEN, leadIdx);
  if (leadSec < 0) return mainHtml;
  return `${mainHtml.slice(0, phase2Start)}${mid}\n${mainHtml.slice(leadSec)}`;
}

/** После «Бренд» — полноширинный cm-wide-slider (prod, cm-slide*.jpg). */
function injectCmWideSliderAfterBrand(mainHtml) {
  if (!fs.existsSync(CM_WIDE_SLIDER_BLOCK)) return mainHtml;
  if (mainHtml.includes("marketing-cm-wide-slider")) return mainHtml;
  const brandIdx = mainHtml.indexOf(BRAND_H2);
  if (brandIdx < 0) {
    console.warn("assemble-marketing: блок Бренд не найден для cm-wide-slider");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", brandIdx) + "</section>".length;
  const block = fs.readFileSync(CM_WIDE_SLIDER_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

/** После «Стратегия» — «Бренд-стратегия» (тот же targeting-каркас). */
function injectBrandStrategyBlock(mainHtml) {
  if (!fs.existsSync(BRAND_STRATEGY_BLOCK)) return mainHtml;
  if (htmlHasSectionTitle(mainHtml, "Бренд-стратегия")) return mainHtml;
  const stratIdx = mainHtml.indexOf(">Стратегия<");
  if (stratIdx < 0) {
    console.warn("assemble-marketing: блок Стратегия не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", stratIdx) + "</section>".length;
  const brand = fs.readFileSync(BRAND_STRATEGY_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${brand}\n${mainHtml.slice(secEnd)}`;
}

/** После «Бренд-стратегия» — «Контент-стратегия». */
function injectContentStrategyBlock(mainHtml) {
  if (!fs.existsSync(CONTENT_STRATEGY_BLOCK)) return mainHtml;
  if (htmlHasSectionTitle(mainHtml, "Контент-стратегия")) return mainHtml;
  const brandIdx = mainHtml.indexOf(">Бренд-стратегия<");
  if (brandIdx < 0) {
    console.warn("assemble-marketing: блок Бренд-стратегия не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", brandIdx) + "</section>".length;
  const block = fs.readFileSync(CONTENT_STRATEGY_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

/** После «Контент-стратегия» — слайдер кейса Orange. */
function injectOrangeCaseSliderAfterContentStrategy(mainHtml) {
  if (!fs.existsSync(ORANGE_CASE_SLIDER_BLOCK)) return mainHtml;
  if (mainHtml.includes("marketing-case-slider-orange")) return mainHtml;
  const brandIdx = mainHtml.indexOf(MARKETING_H2.BRAND);
  if (brandIdx < 0) {
    console.warn("assemble-marketing: якорь «Бренд» не найден для слайдера Orange");
    return mainHtml;
  }
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, brandIdx);
  if (secStart < 0) return mainHtml;
  const block = fs.readFileSync(ORANGE_CASE_SLIDER_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secStart)}\n${block}\n${mainHtml.slice(secStart)}`;
}

/** После «Контент-стратегия» — «Бренд» (нумерация 2). */
function injectBrandBlock(mainHtml) {
  if (!fs.existsSync(BRAND_BLOCK)) return mainHtml;
  if (htmlHasSectionTitle(mainHtml, "Бренд")) return mainHtml;
  const contentIdx = mainHtml.indexOf(">Контент-стратегия<");
  if (contentIdx < 0) {
    console.warn("assemble-marketing: блок Контент-стратегия не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", contentIdx) + "</section>".length;
  const block = fs.readFileSync(BRAND_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

/** После «Бренд» — «Увеличение известности бренда». */
function injectBrandAwarenessBlock(mainHtml) {
  if (!fs.existsSync(BRAND_AWARENESS_BLOCK)) return mainHtml;
  if (mainHtml.includes(">Увеличение известности бренда<")) return mainHtml;
  const brandIdx = mainHtml.indexOf(BRAND_H2);
  if (brandIdx < 0) {
    console.warn("assemble-marketing: блок Бренд не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", brandIdx) + "</section>".length;
  const block = fs.readFileSync(BRAND_AWARENESS_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

/** После «Увеличение известности бренда» — «Сайт». */
function injectSiteBlock(mainHtml) {
  if (!fs.existsSync(SITE_BLOCK)) return mainHtml;
  if (htmlHasSectionTitle(mainHtml, "Сайт")) return mainHtml;
  const awarenessIdx = mainHtml.indexOf(">Увеличение известности бренда<");
  if (awarenessIdx < 0) {
    console.warn("assemble-marketing: блок Увеличение известности не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", awarenessIdx) + "</section>".length;
  const block = fs.readFileSync(SITE_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

/** После «SEO» — слайдер кейсов Darkrain, Складно, AWM-Trade (перед «Продажи»). */
function injectSeoCasesSliderAfterSeo(mainHtml) {
  if (!fs.existsSync(SEO_CASES_SLIDER_BLOCK)) return mainHtml;
  if (mainHtml.includes("swiper-container-marketing-seo")) return mainHtml;
  const seoIdx = mainHtml.indexOf(SEO_H2);
  if (seoIdx < 0) {
    console.warn("assemble-marketing: блок SEO не найден для слайдера кейсов");
    return mainHtml;
  }
  const salesIdx = mainHtml.indexOf(SALES_H2);
  const insertAt =
    salesIdx > seoIdx
      ? mainHtml.lastIndexOf(SECTION_OPEN, salesIdx)
      : mainHtml.indexOf("</section>", seoIdx) + "</section>".length;
  if (insertAt < 0) return mainHtml;
  const block = fs.readFileSync(SEO_CASES_SLIDER_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, insertAt)}\n${block}\n${mainHtml.slice(insertAt)}`;
}

/** После «Сайт» — слайдер кейсов Cromi, Riderra, Каскад (перед «Измеримое продвижение»). */
function injectSiteCasesSliderAfterSite(mainHtml) {
  if (!fs.existsSync(SITE_CASES_SLIDER_BLOCK)) return mainHtml;
  if (mainHtml.includes("swiper-container-marketing-site")) return mainHtml;
  const siteIdx = mainHtml.indexOf(SITE_H2);
  if (siteIdx < 0) {
    console.warn("assemble-marketing: блок Сайт не найден для слайдера кейсов");
    return mainHtml;
  }
  const promoIdx = mainHtml.indexOf(MARKETING_H2.PROMOTION);
  const insertAt =
    promoIdx > siteIdx ? mainHtml.lastIndexOf(SECTION_OPEN, promoIdx) : mainHtml.indexOf("</section>", siteIdx) + "</section>".length;
  if (insertAt < 0) return mainHtml;
  const block = fs.readFileSync(SITE_CASES_SLIDER_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, insertAt)}\n${block}\n${mainHtml.slice(insertAt)}`;
}

/** После «Сайт» — «Измеримое продвижение» (нумерация 3). */
function injectMeasurablePromotionBlock(mainHtml) {
  if (!fs.existsSync(MEASURABLE_PROMOTION_BLOCK)) return mainHtml;
  if (htmlHasSectionTitle(mainHtml, "Измеримое продвижение")) return mainHtml;
  const siteIdx = mainHtml.indexOf(SITE_H2);
  if (siteIdx < 0) {
    console.warn("assemble-marketing: блок Сайт не найден");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", siteIdx) + "</section>".length;
  const block = fs.readFileSync(MEASURABLE_PROMOTION_BLOCK, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

function injectBlockAfterSection(mainHtml, afterH2, partialPath, blockH2, label) {
  if (!fs.existsSync(partialPath)) return mainHtml;
  const blockTitle = blockH2.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (htmlHasSectionTitle(mainHtml, blockTitle)) return mainHtml;
  const anchorIdx = mainHtml.indexOf(afterH2);
  if (anchorIdx < 0) {
    console.warn(`assemble-marketing: якорь не найден — ${label}`);
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", anchorIdx) + "</section>".length;
  const block = fs.readFileSync(partialPath, "utf8").trim();
  return `${mainHtml.slice(0, secEnd)}\n${block}\n${mainHtml.slice(secEnd)}`;
}

function injectPromotionFollowBlocks(mainHtml) {
  let out = mainHtml;
  out = injectBlockAfterSection(out, PROMOTION_H2, ADVERTISING_BLOCK, ADVERTISING_H2, "Реклама");
  out = injectBlockAfterSection(out, ADVERTISING_H2, TOOLS_BLOCK, TOOLS_H2, "Инструменты");
  out = injectBlockAfterSection(
    out,
    TOOLS_H2,
    CONTENT_MARKETING_BLOCK,
    CONTENT_MARKETING_H2,
    "Контент-маркетинг",
  );
  out = injectBlockAfterSection(
    out,
    CONTENT_MARKETING_H2,
    CONTENT_MARKETING_CHANNELS_BLOCK,
    CONTENT_MARKETING_CHANNELS_H2,
    "Каналы контент-маркетинга",
  );
  out = injectBlockAfterSection(
    out,
    CONTENT_MARKETING_CHANNELS_H2,
    SEO_BLOCK,
    SEO_H2,
    "SEO",
  );
  out = injectBlockAfterSection(out, SEO_H2, SALES_BLOCK, SALES_H2, "Продажи");
  return out;
}

function stripClientsSection(mainHtml) {
  const clientsIdx = mainHtml.indexOf("Наши клиенты");
  if (clientsIdx < 0) return mainHtml;
  const clSec = mainHtml.lastIndexOf(SECTION_OPEN, clientsIdx);
  if (clSec < 0) return mainHtml;
  const secEnd = mainHtml.indexOf("</section>", clientsIdx) + "</section>".length;
  return mainHtml.slice(0, clSec) + mainHtml.slice(secEnd);
}

/** Секции этапов /targeting — не для marketing (см. скрины: Этапы, Исследование, Первые шаги, Ведение, Оптимизация, Преимущества). */
const TARGETING_ONLY_SECTION_MARKERS = [
  '<h2 data-v-490c7534="">Этапы таргетинга</h2>',
  '<h2 data-v-490c7534="">Исследование</h2>',
  '<h2 data-v-490c7534="">Первые шаги</h2>',
  '<h2 data-v-490c7534="">Ведение</h2>',
  '<h2 data-v-490c7534="">Оптимизация</h2>',
  "advantages-card__title\">Преимущества работы",
];

function stripSectionByMarker(mainHtml, marker) {
  const idx = mainHtml.indexOf(marker);
  if (idx < 0) return mainHtml;
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, idx);
  if (secStart < 0) return mainHtml;
  const secEnd = mainHtml.indexOf("</section>", idx) + "</section>".length;
  return mainHtml.slice(0, secStart) + mainHtml.slice(secEnd);
}

function stripTargetingOnlySections(mainHtml) {
  let out = mainHtml;
  for (const marker of TARGETING_ONLY_SECTION_MARKERS) {
    out = stripSectionByMarker(out, marker);
  }
  return out;
}

/** Удаляет top-level `<section>`, если predicate(sec) истинен. */
function stripSectionsWhere(mainHtml, predicate) {
  let out = mainHtml;
  let pos = 0;
  while (pos < out.length) {
    const start = out.indexOf(SECTION_OPEN, pos);
    if (start < 0) break;
    const end = out.indexOf("</section>", start) + "</section>".length;
    const sec = out.slice(start, end);
    if (predicate(sec)) {
      out = out.slice(0, start) + out.slice(end);
      pos = start;
    } else {
      pos = end;
    }
  }
  return out;
}

/** Слайдеры cases-block из /targeting (AWM-Trade и т.п.), не блок «Наши кейсы». */
/** Блок .facts про таргетинг из /targeting (не для marketing). */
function stripTargetingFactsSection(mainHtml) {
  return stripSectionsWhere(
    mainHtml,
    (sec) =>
      sec.includes('class="facts"') ||
      sec.includes("Таргетированная реклама — гибкий формат"),
  );
}

function stripTargetingCasesSliders(mainHtml) {
  return stripSectionsWhere(
    mainHtml,
    (sec) =>
      sec.includes('class="cases-block"') &&
      !sec.includes("marketing-cases-section") &&
      !sec.includes("marketing-case-slider-section") &&
      !sec.includes("more-case-wr__main"),
  );
}

function stripFaqSection(mainHtml) {
  return stripSectionsWhere(
    mainHtml,
    (sec) =>
      sec.includes("targeting-faq-section") ||
      sec.includes('id="targeting-faq-mounted"') ||
      (sec.includes("Вопрос-ответ") && sec.includes("questions-wr")),
  );
}

function stripTeamSections(mainHtml) {
  return stripSectionsWhere(mainHtml, (sec) => sec.includes("team-block"));
}

function findCasesAnchorIndex(mainHtml) {
  const iMain = mainHtml.indexOf(CASES_MORE_MAIN);
  if (iMain >= 0) return iMain;
  return mainHtml.indexOf(CASES_CLASS_PREFIX);
}

function extractFaqBlock(mainHtml) {
  let i0 = mainHtml.indexOf(FAQ_SECTION_START);
  if (i0 < 0) i0 = mainHtml.indexOf('id="targeting-faq-mounted"');
  if (i0 < 0) return { block: null, start: -1, end: -1 };
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, i0);
  if (secStart < 0) return { block: null, start: -1, end: -1 };
  const iClose = mainHtml.indexOf(FAQ_BLOCK_TAIL, i0);
  const end =
    iClose >= 0
      ? iClose + FAQ_BLOCK_TAIL.length
      : mainHtml.indexOf("</section>", i0) + "</section>".length;
  return { block: mainHtml.slice(secStart, end), start: secStart, end };
}

function moveFaqBeforeCases(mainHtml) {
  const { block, start, end } = extractFaqBlock(mainHtml);
  if (!block || start < 0) return mainHtml;
  const iCases = findCasesAnchorIndex(mainHtml);
  if (iCases < 0) return mainHtml;
  const without = mainHtml.slice(0, start) + mainHtml.slice(end);
  const iCases2 = findCasesAnchorIndex(without);
  if (iCases2 < 0) return mainHtml;
  const iInsert = without.lastIndexOf(SECTION_OPEN, iCases2);
  if (iInsert < 0) return mainHtml;
  return `${without.slice(0, iInsert)}\n${block}\n${without.slice(iInsert)}`;
}

function moveInlineLeadBeforeTeam(mainHtml) {
  const leadIdx = mainHtml.indexOf("sa-service-lead-section");
  const teamIdx = mainHtml.indexOf("team-block");
  if (leadIdx < 0 || teamIdx < 0 || leadIdx < teamIdx) return mainHtml;
  const leadSec = mainHtml.lastIndexOf(SECTION_OPEN, leadIdx);
  const leadEnd = mainHtml.indexOf("</section>", leadIdx) + "</section>".length;
  if (leadSec < 0 || leadEnd <= leadSec) return mainHtml;
  const block = mainHtml.slice(leadSec, leadEnd);
  const without = mainHtml.slice(0, leadSec) + mainHtml.slice(leadEnd);
  const teamSec = without.lastIndexOf(SECTION_OPEN, without.indexOf("team-block"));
  if (teamSec < 0) return mainHtml;
  return `${without.slice(0, teamSec)}\n${block}\n${without.slice(teamSec)}`;
}

function ensureMoreCasesMainClass(mainHtml) {
  if (mainHtml.includes(CASES_MORE_MAIN)) return mainHtml;
  return mainHtml.replace(/class="more-case-wr"/, 'class="more-case-wr more-case-wr__main"');
}

function patchMarketingSeo(html) {
  let s = html.replace(/<title>[^<]*<\/title>/, `<title>${MARKETING_META.title}</title>`);
  s = s.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${MARKETING_META.description}" />`,
  );
  s = s.replace(
    /<meta name="title" content="[^"]*"\s*\/>/,
    `<meta name="title" content="${MARKETING_META.title}" />`,
  );
  s = s.replace(
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${MARKETING_META.ogTitle}" />`,
  );
  s = s.replace(
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${MARKETING_META.ogDescription}" />`,
  );
  s = s.replace(
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${MARKETING_META.ogImage}" />`,
  );
  s = s.replace(
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    '<meta property="og:url" content="https://serenity.agency/services/marketing" />',
  );
  s = s.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${MARKETING_META.title}" />`,
  );
  s = s.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${MARKETING_META.description}" />`,
  );
  s = s.replace(
    /<meta name="twitter:image" content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${MARKETING_META.ogImage}" />`,
  );
  s = s.replace(
    /<link rel="canonical" href="https:\/\/serenity\.agency\/[^"]*"\s*\/>/,
    '<link rel="canonical" href="https://serenity.agency/services/marketing" />',
  );
  s = s.replace(/https:\/\/serenity\.agency\/targeting/g, "https://serenity.agency/services/marketing");
  s = s.replace(/content="https:\/\/serenity\.agency\/targeting"/g, 'content="https://serenity.agency/services/marketing"');
  s = s.replace(
    /targeting-static-stack\.css\?v=[^"]+/g,
    "targeting-static-stack.css?v=20260630hubInterlinks",
  );
  s = s.replace(
    /sections\/home-awards\.css\?v=[^"]+/g,
    "sections/home-awards.css?v=20260522marketingAwardsGapOutsidePc",
  );
  return s;
}

function renameBundleMarkers(html) {
  return html
    .replace(/<!-- TARGETING-CSS-BUNDLE-START/g, "<!-- MARKETING-CSS-BUNDLE-START")
    .replace(/<!-- TARGETING-CSS-BUNDLE-END -->/g, CSS_END)
    .replace(SRC_MAIN_START, MAIN_START)
    .replace(SRC_MAIN_END, MAIN_END);
}

function run() {
  if (!fs.existsSync(targetingIndexPath)) {
    console.error("Нет", targetingIndexPath, "— сначала npm run assemble:service:targeting");
    process.exit(1);
  }
  if (process.env.SKIP_SERVICE_PARTIALS_BUILD !== "1") {
    execSync("npm run build:service-partials", { cwd: root, stdio: "inherit" });
  }
  const targetingHtml = fs.readFileSync(targetingIndexPath, "utf8");
  const iMainStart = targetingHtml.indexOf(SRC_MAIN_START);
  const iMainEnd = targetingHtml.indexOf(SRC_MAIN_END);
  if (iMainStart < 0 || iMainEnd < 0) {
    console.error("Нет маркеров TARGETING-MAIN в targeting/index.html");
    process.exit(1);
  }

  let main = targetingHtml.slice(iMainStart + SRC_MAIN_START.length, iMainEnd).trim();
  main = patchHeroTexts(main, "Комплексный маркетинг", MARKETING_HERO_SUBTITLE);
  main = injectHeroLead(main);
  main = stripHeroCaseSlider(main);
  main = injectInlineLead(main);
  main = stripClientsSection(main);
  main = injectPhase2(main);
  main = stripTargetingFactsSection(main);
  main = injectBrandStrategyBlock(main);
  main = injectContentStrategyBlock(main);
  main = injectBrandBlock(main);
  main = injectBrandAwarenessBlock(main);
  main = injectSiteBlock(main);
  main = injectMeasurablePromotionBlock(main);
  main = injectPromotionFollowBlocks(main);
  main = stripTargetingOnlySections(main);
  main = stripTargetingCasesSliders(main);
  main = stripFaqSection(main);
  main = stripTeamSections(main);
  main = injectOrangeCaseSliderAfterContentStrategy(main);
  main = injectSiteCasesSliderAfterSite(main);
  main = injectSeoCasesSliderAfterSeo(main);
  main = injectMoreCases(main);
  main = injectAwards(main);
  main = stripSectionsWhere(main, (sec) => sec.includes("kontekst-synergy-root"));
  main = ensureMoreCasesMainClass(main);

  main = main.replace(/\s*swiper-container-initialized/g, "");
  main = main.replace(/\s*swiper-container-horizontal/g, "");
  main = main.replace(/\s*swiper-container-free-mode/g, "");
  main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");

  let shell = targetingHtml.slice(0, iMainStart + SRC_MAIN_START.length);
  shell += `\n${main}\n`;
  shell += targetingHtml.slice(iMainEnd);
  shell = renameBundleMarkers(shell);
  shell = patchMarketingSeo(shell);
  shell = shell.replace(/\s*<script defer src="\/_sa\/js\/home-cases-auto\.js[^"]*"[^>]*><\/script>\n?/g, "\n");
  shell = shell.replace(
    /<span itemprop="name">Таргетированная реклама<\/span>/g,
    '<span itemprop="name">Комплексный маркетинг</span>',
  );

  fs.mkdirSync(path.dirname(marketingIndexPath), { recursive: true });
  const typo = processTypographyHtml(shell, { force: true });
  fs.writeFileSync(marketingIndexPath, typo.html.replace(/\n+$/, "\n"), "utf8");
  console.log("assemble-marketing-from-prod-layout: ok (layout from targeting)");
}

if (require.main === module) {
  run();
}

module.exports = { run };
