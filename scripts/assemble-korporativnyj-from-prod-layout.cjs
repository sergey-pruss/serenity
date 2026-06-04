#!/usr/bin/env node
/**
 * Сборка korporativnyj_sajt/index.html: срез prod/Nuxt + partials (FAQ из json/services/korporativnyj_sajt/faq.json — npm run build:service-faq, форма, кейсы, награды, синергия).
 * KORPORATIVNYJ_INCLUDE_PHASE2=1 — вставить html/partials/services/korporativnyj-phase2-*.html (факты, этапы, клиенты).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { sanitizeMoreCasesCapture } = require("./sanitize-more-cases-capture.cjs");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");
const { stripContentBlockSliders } = require("./lib/strip-content-block-slider.cjs");
const { repairContentBlockMotionDivTags } = require("./lib/repair-content-block-motion-div-tags.cjs");
const { repairNumberedHeaderExtraCloses } = require("./lib/repair-numbered-header-extra-closes.cjs");
const { patchServiceBreadcrumbForSlug } = require("./lib/service-breadcrumb-jsonld.cjs");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");
const {
  movePackagesBeforeInlineLead,
  indexOfInlineLeadSection,
} = require("./lib/move-packages-before-inline-lead.cjs");
const { patchKorporativnyjFirstCasesSlideMetropolitan } = require("./lib/korporativnyj-metropolitan-case-slide.cjs");
const { patchKorporativnyjSecondCasesSlideMiramar } = require("./lib/korporativnyj-miramar-case-slide.cjs");
const { patchKorporativnyjN4fvkTrailingSlides } = require("./lib/korporativnyj-n4fvk-trailing-slides.cjs");
const {
  patchN4fvkFixNestedSlides,
  patchN4fvkCloseWrapperBeforePagination,
} = require("./lib/korporativnyj-n4fvk-cases-common.cjs");

const root = path.resolve(__dirname, "..");

function buildServicePartials() {
  if (process.env.SKIP_SERVICE_PARTIALS_BUILD === "1") return;
  execSync("npm run build:service-partials", { cwd: root, stdio: "inherit" });
  execSync("node scripts/build-korporativnyj-blog-partial.mjs", {
    cwd: root,
    stdio: "inherit",
  });
}

function buildKorporativnyjPackagesPartial() {
  execSync("node scripts/build-korporativnyj-packages-partials.cjs", {
    cwd: root,
    stdio: "inherit",
  });
}

const CREON_CASE_NEEDLE = 'cases-block__swiper-slide-title">Creon Group</h3>';
const KORP_PACKAGES_MARKER = "<!-- KORPORATIVNYJ-PACKAGES-START -->";
const LEGACY_DIES_TILDA_RE = /<h3 data-v-1444f1fb="">Лендинг на(?:&nbsp;|\s)Tilda<\/h3>/;

/** Убрать legacy .dies с «Лендинг на Tilda» / «Интернет-магазин» (после «Команда»). */
function stripKorporativnyjLegacyDiesPrices(mainHtml) {
  const m = mainHtml.match(LEGACY_DIES_TILDA_RE);
  if (!m) return mainHtml;
  return stripSectionByInner(mainHtml, m[0]);
}

function stripLegacyDiesFromPublishedPage(html) {
  const MAIN_START = "<!-- KORPORATIVNYJ-MAIN-START -->";
  const MAIN_END = "<!-- KORPORATIVNYJ-MAIN-END -->";
  const iStart = html.indexOf(MAIN_START);
  const iEnd = html.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0) return html;
  const head = html.slice(0, iStart + MAIN_START.length);
  let main = html.slice(iStart + MAIN_START.length, iEnd);
  const tail = html.slice(iEnd);
  let prev;
  do {
    prev = main;
    main = stripKorporativnyjLegacyDiesPrices(main);
  } while (main !== prev);
  return head + main + tail;
}

/** Якорь вставки post-hero/cms: перед phase2 («Наш подход») или маркером middle. */
function korporativnyjPhase2ContentIndex(mainHtml) {
  const approachIdx = mainHtml.indexOf("Наш подход");
  if (approachIdx >= 0) {
    const sec = mainHtml.lastIndexOf('<section class="page-constructor__section', approachIdx);
    if (sec >= 0) return sec;
  }
  const marker = mainHtml.indexOf(MARKER_MIDDLE);
  if (marker >= 0) return marker;
  const factsIdx = mainHtml.indexOf(FACTS_SECTION_OPEN);
  if (factsIdx >= 0) return factsIdx;
  return -1;
}

/** Удаляет legacy-блок .facts (презентация бренда + 3 пункта). */
function stripKorporativnyjFactsSection(mainHtml) {
  const factsStart = mainHtml.indexOf(FACTS_SECTION_OPEN);
  if (factsStart < 0) return mainHtml;
  const approachIdx = mainHtml.indexOf("Наш подход", factsStart);
  let end;
  if (approachIdx >= 0) {
    end = mainHtml.lastIndexOf('<section class="page-constructor__section', approachIdx);
    if (end <= factsStart) {
      end = mainHtml.indexOf("</section>", factsStart) + "</section>".length;
    }
  } else {
    end = mainHtml.indexOf("</section>", factsStart) + "</section>".length;
  }
  return mainHtml.slice(0, factsStart) + mainHtml.slice(end);
}

/** После hero, перед phase2: «Создание… для роста бизнеса» + 4 колонки. */
function injectKorporativnyjPostHero(mainHtml) {
  if (!fs.existsSync(POST_HERO_PARTIAL)) {
    console.warn("assemble: korporativnyj-post-hero.html не найден");
    return mainHtml;
  }
  const partial = fs.readFileSync(POST_HERO_PARTIAL, "utf8").trim();
  const start = mainHtml.indexOf(POST_HERO_START);
  const end = mainHtml.indexOf(POST_HERO_END);
  if (start >= 0 && end > start) {
    return mainHtml.slice(0, start) + partial + mainHtml.slice(end + POST_HERO_END.length);
  }
  const insertIdx = korporativnyjPhase2ContentIndex(mainHtml);
  if (insertIdx < 0) {
    console.warn("assemble: не найдена точка вставки post-hero");
    return mainHtml;
  }
  const beforeInsert = mainHtml.slice(Math.max(0, insertIdx - 12000), insertIdx);
  if (beforeInsert.includes("korporativnyj-post-hero")) {
    return mainHtml;
  }
  return mainHtml.slice(0, insertIdx) + partial + mainHtml.slice(insertIdx);
}

/** После post-hero, перед phase2: CMS — заголовок, описание, 3 колонки критериев. */
function injectKorporativnyjCmsBlock(mainHtml) {
  if (!fs.existsSync(CMS_BLOCK_PARTIAL)) {
    console.warn("assemble: korporativnyj-cms-block.html не найден");
    return mainHtml;
  }
  const partial = fs.readFileSync(CMS_BLOCK_PARTIAL, "utf8").trim();
  const start = mainHtml.indexOf(CMS_BLOCK_START);
  const end = mainHtml.indexOf(CMS_BLOCK_END);
  if (start >= 0 && end > start) {
    return mainHtml.slice(0, start) + partial + mainHtml.slice(end + CMS_BLOCK_END.length);
  }
  const postHeroEnd = mainHtml.indexOf(POST_HERO_END);
  const insertAt =
    postHeroEnd >= 0
      ? postHeroEnd + POST_HERO_END.length
      : korporativnyjPhase2ContentIndex(mainHtml);
  if (insertAt < 0) {
    console.warn("assemble: не найдена точка вставки cms-block");
    return mainHtml;
  }
  const beforeInsert = mainHtml.slice(Math.max(0, insertAt - 12000), insertAt);
  if (beforeInsert.includes("korporativnyj-cms-block")) {
    return mainHtml;
  }
  return mainHtml.slice(0, insertAt) + partial + mainHtml.slice(insertAt);
}

function injectKorporativnyjPackagesBeforeInlineLead(mainHtml) {
  if (!mainHtml.includes(KORP_PACKAGES_MARKER)) return mainHtml;
  return movePackagesBeforeInlineLead(mainHtml, {
    startMarker: KORP_PACKAGES_MARKER,
    endMarker: "<!-- KORPORATIVNYJ-PACKAGES-END -->",
  });
}

/** После кейса Creon, перед «Стоимость и пакеты»: поддержка и SLA. */
function injectKorporativnyjSlaSupportBlock(mainHtml) {
  if (!fs.existsSync(SLA_SUPPORT_PARTIAL)) {
    console.warn("assemble: korporativnyj-sla-support-block.html не найден");
    return mainHtml;
  }
  const partial = fs.readFileSync(SLA_SUPPORT_PARTIAL, "utf8").trim();
  const start = mainHtml.indexOf(SLA_SUPPORT_START);
  const end = mainHtml.indexOf(SLA_SUPPORT_END);
  if (start >= 0 && end > start) {
    return mainHtml.slice(0, start) + partial + mainHtml.slice(end + SLA_SUPPORT_END.length);
  }
  const packagesIdx = mainHtml.indexOf(KORP_PACKAGES_MARKER);
  if (packagesIdx >= 0) {
    return `${mainHtml.slice(0, packagesIdx)}${partial}\n${mainHtml.slice(packagesIdx)}`;
  }
  const creonIdx = mainHtml.indexOf(CREON_CASE_NEEDLE);
  if (creonIdx < 0) {
    console.warn("assemble-korporativnyj: кейс Creon Group не найден — SLA-блок не вставлен");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", creonIdx) + "</section>".length;
  return `${mainHtml.slice(0, secEnd)}\n${partial}\n${mainHtml.slice(secEnd)}`;
}

/** Блок «Стоимость» (слайдер + таблица) сразу после кейса Creon Group. */
function injectKorporativnyjPackagesAfterCreonCase(mainHtml) {
  if (mainHtml.includes(KORP_PACKAGES_MARKER)) return mainHtml;
  const partial = readPartial("html/partials/services/korporativnyj-packages-block.html");
  if (!partial) return mainHtml;
  const creonIdx = mainHtml.indexOf(CREON_CASE_NEEDLE);
  if (creonIdx < 0) {
    console.warn("assemble-korporativnyj: кейс Creon Group не найден — пакеты не вставлены");
    return mainHtml;
  }
  const secEnd = mainHtml.indexOf("</section>", creonIdx) + "</section>".length;
  return `${mainHtml.slice(0, secEnd)}\n${partial}\n${mainHtml.slice(secEnd)}`;
}

const fullHtmlPath = path.join(root, "tmp", "korporativnyj-prod-full.html");
const parityLayoutPath = path.join(root, "tmp", "korporativnyj-parity-prod-layout.html");
const indexPath = path.join(root, "korporativnyj_sajt", "index.html");
const manifestPath = path.join(root, "korporativnyj_sajt", "nuxt-css-manifest.json");

const PHASE2_MIDDLE = path.join(root, "html", "partials", "services", "korporativnyj-phase2-middle.html");
const PHASE2_CLIENTS = path.join(root, "html", "partials", "services", "korporativnyj-phase2-clients.html");
/** Срез prod /targeting: секция «Наши клиенты» (clients-wrapper), не kontekst-clients-section. */
const TARGETING_CLIENTS_SLICE = path.join(
  root,
  "html",
  "partials",
  "services",
  "targeting-phase2-clients.html",
);

const MARKER_MIDDLE = "<!-- KORPORATIVNYJ-PHASE2:middle -->";
const POST_HERO_PARTIAL = path.join(root, "html", "partials", "services", "korporativnyj-post-hero.html");
const POST_HERO_START = "<!-- KORPORATIVNYJ-POST-HERO-START -->";
const POST_HERO_END = "<!-- KORPORATIVNYJ-POST-HERO-END -->";
const FACTS_SECTION_OPEN = '<section class="page-constructor__section"><div class="facts">';
const CMS_BLOCK_PARTIAL = path.join(root, "html", "partials", "services", "korporativnyj-cms-block.html");
const CMS_BLOCK_START = "<!-- KORPORATIVNYJ-CMS-BLOCK-START -->";
const CMS_BLOCK_END = "<!-- KORPORATIVNYJ-CMS-BLOCK-END -->";
const SLA_SUPPORT_PARTIAL = path.join(
  root,
  "html",
  "partials",
  "services",
  "korporativnyj-sla-support-block.html",
);
const SLA_SUPPORT_START = "<!-- KORPORATIVNYJ-SLA-SUPPORT-START -->";
const SLA_SUPPORT_END = "<!-- KORPORATIVNYJ-SLA-SUPPORT-END -->";

const FAQ_SECTION_START = '<section class="page-constructor__section korporativnyj-faq-section">';
const KORPORATIVNYJ_BLOG_SECTION = '<section class="page-constructor__section korporativnyj-blog-section">';
const BLOG_PARTIAL_PATH = path.join(
  root,
  "html",
  "partials",
  "services",
  "blog-korporativnyj-sajt.html",
);
const FAQ_BLOCK_TAIL = "</script></div></section>";
const CASES_MORE_MAIN = "more-case-wr more-case-wr__main";
const CASES_CLASS_PREFIX = 'class="more-case-wr';
const SECTION_OPEN = '<section class="page-constructor__section';

const KORPORATIVNYJ_PRODUCT_IMAGE =
  "https://serenity.agency/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp";
const KORPORATIVNYJ_PRODUCT_IMAGE_DISK = "/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp";
const KORPORATIVNYJ_HERO_H1 = "Разработка корпоративного сайта";

function patchKorporativnyjHeroH1(html) {
  return html.replace(
    /(<h1[^>]*class="c-title-block__title"[^>]*>)[^<]*(<\/h1>)/i,
    `$1${KORPORATIVNYJ_HERO_H1}$2`,
  );
}

function escapeMetaAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function patchKorporativnyjHeadMeta(html) {
  const seo = loadServiceConfig("korporativnyj_sajt").seo || {};
  const { pageTitle, metaTitle, description } = seo;
  if (!pageTitle) return html;
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeMetaAttr(pageTitle)}</title>`);
  if (metaTitle) {
    out = out.replace(
      /<meta name="title" content="[^"]*"/,
      `<meta name="title" content="${escapeMetaAttr(metaTitle)}"`,
    );
  }
  if (description) {
    const desc = escapeMetaAttr(description);
    out = out.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
    out = out.replace(
      /<meta property="og:description" content="[^"]*"/,
      `<meta property="og:description" content="${desc}"`,
    );
    out = out.replace(
      /<meta name="twitter:description" content="[^"]*"/,
      `<meta name="twitter:description" content="${desc}"`,
    );
  }
  const ogTitle = escapeMetaAttr(pageTitle);
  out = out.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${ogTitle}"`);
  out = out.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${ogTitle}"`);
  return out;
}

function resolveLayoutPath() {
  const mode = (process.env.KORPORATIVNYJ_LAYOUT_SOURCE || "auto").toLowerCase();
  if (mode === "parity") return { path: parityLayoutPath, label: "parity" };
  if (mode === "full") return { path: fullHtmlPath, label: "full" };
  if (mode !== "auto") {
    console.error("KORPORATIVNYJ_LAYOUT_SOURCE: auto | full | parity");
    process.exit(1);
  }
  if (fs.existsSync(fullHtmlPath)) return { path: fullHtmlPath, label: "full (auto)" };
  if (fs.existsSync(parityLayoutPath)) return { path: parityLayoutPath, label: "parity (auto)" };
  return { path: null, label: null };
}

function readPartial(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.warn("assemble: нет partial —", p);
    return null;
  }
  return stripNuxtScopedMarkup(fs.readFileSync(p, "utf8").trim());
}

function replaceBetween(html, startNeedle, endNeedle, replacement) {
  const i0 = html.indexOf(startNeedle);
  if (i0 < 0) return html;
  const i1 = html.indexOf(endNeedle, i0 + startNeedle.length);
  if (i1 < 0) return html;
  return html.slice(0, i0) + replacement + html.slice(i1);
}

function stripSectionByInner(html, innerNeedle, fromIndex = 0) {
  let i = html.indexOf(innerNeedle, fromIndex);
  if (i < 0) return html;
  const secStart = html.lastIndexOf('<section class="page-constructor__section', i);
  if (secStart < 0) return html;
  const secEnd = findSectionEnd(html, secStart);
  if (secEnd <= secStart) return html;
  return html.slice(0, secStart) + html.slice(secEnd);
}

function injectPartialBetween(html, startNeedle, endNeedle, partial) {
  if (!partial) return html;
  const i0 = html.indexOf(startNeedle);
  const i1 = html.indexOf(endNeedle, i0 >= 0 ? i0 : 0);
  if (i0 < 0 || i1 < 0 || i1 <= i0) {
    console.warn("assemble: не найден интервал для partial", startNeedle.slice(0, 40));
    return html;
  }
  return `${html.slice(0, i0)}${partial}\n${html.slice(i1)}`;
}

function injectKorporativnyjFaqFromPartial(mainHtml) {
  const partial = readPartial("html/partials/services/faq-korporativnyj-sajt.html");
  if (!partial) return mainHtml;
  const casesIdx = mainHtml.indexOf('class="more-case-wr');
  if (casesIdx < 0) {
    console.warn("assemble: FAQ — нет якоря more-case-wr (кейсы вставятся partial позже)");
  }
  const regionEnd = casesIdx >= 0 ? casesIdx : mainHtml.indexOf('class="awards__title">Награды');
  if (regionEnd < 0) return mainHtml;
  const region = mainHtml.slice(0, regionEnd);
  const startRes = [
    /<section class="page-constructor__section korporativnyj-faq-section">/,
    /<section class="page-constructor__section"><div[^>]*class="questions-wr page__container_admin">/,
    /<section class="page-constructor__section"><div[^>]*class="questions-wr page__container_admin">/,
  ];
  let m;
  for (const startRe of startRes) {
    m = region.match(startRe);
    if (m && m.index !== undefined) break;
  }
  if (!m || m.index === undefined) {
    console.warn("assemble: prod FAQ не найден");
    return mainHtml;
  }
  const cutEnd =
    casesIdx > m.index
      ? mainHtml.lastIndexOf('<section class="page-constructor__section">', casesIdx)
      : regionEnd;
  if (cutEnd <= m.index) return mainHtml;
  return `${mainHtml.slice(0, m.index)}${partial}\n${mainHtml.slice(cutEnd)}`;
}

function injectKorporativnyjServiceInlineLead(mainHtml) {
  if (mainHtml.includes('id="sa-inline-lead-root"')) return mainHtml;
  const partial = readPartial("html/partials/services/service-inline-lead-korporativnyj-sajt.html");
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
  const moreRe = /<section class="page-constructor__section"><div[^>]*class="more-case-wr"/;
  const m = mainHtml.match(moreRe);
  if (!m || m.index === undefined) return { start: -1, end: -1 };
  const start = m.index;
  const end = mainHtml.indexOf("</section>", start) + "</section>".length;
  return { start, end };
}

function readMoreCasesPartial() {
  const p = path.join(root, "html/partials/services/more-cases-korporativnyj-sajt.html");
  if (!fs.existsSync(p)) return null;
  let html = fs.readFileSync(p, "utf8").trim();
  html = html.replace(/^<!--[\s\S]*?-->\s*/, "");
  return html;
}

/** Синергия: data-v-56f85d51 обязателен для .services__card-img_* в snapshot.bundle (как /targeting). */
function readSynergyPartial() {
  const p = path.join(root, "html/partials/services/synergy-korporativnyj-sajt.html");
  if (!fs.existsSync(p)) return null;
  let html = fs.readFileSync(p, "utf8").trim();
  html = html.replace(/^<!--[\s\S]*?-->\s*/, "");
  html = html.replace(/<motion\.div/g, "<div");
  html = html.replace(/<\/motion\.div>/g, "</div>");
  html = html.replace(/\s*<!---->\s*/g, "");
  return html;
}

function injectKorporativnyjMoreCases(mainHtml) {
  /* data-v на more-case-wr обязателен: .more-cases--active[data-v-27a87df0] в snapshot.bundle */
  let partial = readMoreCasesPartial();
  if (partial) partial = sanitizeMoreCasesCapture(partial, { keepGrid: true });
  if (!partial) return mainHtml;
  const { start: secStart, end: secEnd } = extractMoreCasesSectionBounds(mainHtml);
  if (secStart < 0 || secEnd <= secStart) {
    console.warn("assemble: more-case-wr section не найден");
    return mainHtml;
  }
  return `${mainHtml.slice(0, secStart)}${partial}\n${mainHtml.slice(secEnd)}`;
}

function injectKorporativnyjAwards(mainHtml) {
  const partial = readPartial("html/partials/services/awards-korporativnyj-sajt.html");
  if (!partial) return mainHtml;
  const i0 = mainHtml.indexOf('id="korporativnyj-awards-heading"');
  if (i0 < 0) {
    const t = mainHtml.indexOf('class="awards__title">Награды');
    if (t < 0) return mainHtml;
    const secStart = mainHtml.lastIndexOf('<section class="page-constructor__section">', t);
    const syn = mainHtml.indexOf("kontekst-synergy-root", t);
    const secEnd =
      syn > t
        ? mainHtml.lastIndexOf('<section class="page-constructor__section">', syn)
        : mainHtml.indexOf("</section>", t) + "</section>".length;
    return `${mainHtml.slice(0, secStart)}${partial}\n${mainHtml.slice(secEnd)}`;
  }
  const secStart = mainHtml.lastIndexOf('<section class="page-constructor__section">', i0);
  const syn = mainHtml.indexOf("kontekst-synergy-root", i0);
  const secEnd = syn > i0 ? mainHtml.lastIndexOf('<section class="page-constructor__section">', syn) : mainHtml.indexOf("</section>", i0) + "</section>".length;
  return `${mainHtml.slice(0, secStart)}${partial}\n${mainHtml.slice(secEnd)}`;
}

function extractSynergySectionBounds(mainHtml) {
  const needles = [
    'id="kontekst-synergy-mounted"',
    'class="synergy-section"',
    "Синергия с&nbsp;услугами",
    "Синергия с услугами",
  ];
  let iMount = -1;
  for (const n of needles) {
    const i = mainHtml.indexOf(n);
    if (i >= 0) {
      iMount = i;
      break;
    }
  }
  if (iMount < 0) return { start: -1, end: -1 };
  const start = mainHtml.lastIndexOf('<section class="page-constructor__section', iMount);
  if (start < 0) return { start: -1, end: -1 };
  const limits = [
    mainHtml.indexOf("<!-- KORPORATIVNYJ-MAIN-END -->", start),
    mainHtml.indexOf('<footer class="footer-modern"', start),
    mainHtml.indexOf('<div itemscope="itemscope" itemtype="http://schema.org/Product"', start),
  ].filter((n) => n > start);
  const limit = limits.length ? Math.min(...limits) : mainHtml.length;
  const end = mainHtml.lastIndexOf("</section>", limit) + "</section>".length;
  return { start, end };
}

function injectKorporativnyjSynergy(mainHtml) {
  const partial = readSynergyPartial();
  if (!partial) return mainHtml;
  let { start, end } = extractSynergySectionBounds(mainHtml);
  if (start < 0 || end <= start) {
    const mainEnd = mainHtml.indexOf("<!-- KORPORATIVNYJ-MAIN-END -->");
    if (mainEnd < 0) {
      console.warn("assemble: synergy-section не найден");
      return mainHtml;
    }
    return `${mainHtml.slice(0, mainEnd)}\n${partial}\n${mainHtml.slice(mainEnd)}`;
  }
  return `${mainHtml.slice(0, start)}${partial}\n${mainHtml.slice(end)}`;
}

function stripPhase1Middle(mainHtml) {
  const heroEnd = mainHtml.indexOf("</section>", mainHtml.indexOf("c-title-block")) + "</section>".length;
  const formIdx = mainHtml.indexOf('class="forms modern"');
  if (formIdx < 0) return mainHtml;
  const formSec = mainHtml.lastIndexOf('<section class="page-constructor__section">', formIdx);
  if (formSec <= heroEnd) return mainHtml;
  return `${mainHtml.slice(0, heroEnd)}\n${MARKER_MIDDLE}\n${mainHtml.slice(formSec)}`;
}

const {
  sanitizeClientsSectionHtml,
  upgradeServiceClientsSectionHtml,
} = require("./lib/replace-service-clients-section.cjs");

/** Вырезает только <section> с .clients-wrapper из targeting-phase2-clients.html. */
function extractTargetingClientsSection(sliceHtml) {
  const wrapperIdx = sliceHtml.indexOf('class="clients-wrapper"');
  if (wrapperIdx < 0) return null;
  const secStart = sliceHtml.lastIndexOf(SECTION_OPEN, wrapperIdx);
  if (secStart < 0) return null;
  const titleIdx = sliceHtml.indexOf("Наши клиенты", wrapperIdx);
  const endAnchor = titleIdx >= 0 ? titleIdx : wrapperIdx;
  const secEnd = sliceHtml.indexOf("</section>", endAnchor) + "</section>".length;
  return sliceHtml.slice(secStart, secEnd);
}

/** Полоса логотипов как на /targeting — перед FAQ (как prod korporativnyj). */
function injectKorporativnyjClientsBeforeFaq(mainHtml) {
  let out = stripKorporativnyjClientsSection(mainHtml);
  if (!fs.existsSync(TARGETING_CLIENTS_SLICE)) {
    console.warn("assemble: нет", TARGETING_CLIENTS_SLICE);
    return out;
  }
  let slice = fs.readFileSync(TARGETING_CLIENTS_SLICE, "utf8").trim();
  slice = slice.replace(/^<!--[\s\S]*?-->\s*/, "");
  let clients = extractTargetingClientsSection(slice);
  if (!clients) {
    console.warn("assemble: секция clients не найдена в targeting-phase2-clients.html");
    return out;
  }
  /* data-v не снимаем: стили карточек логотипов в korporativnyj-nuxt.bundle.css scoped. */
  clients = upgradeServiceClientsSectionHtml(rewriteProdSlice(clients));

  const { start } = extractKorporativnyjFaqBlock(out);
  if (start < 0) {
    console.warn("assemble: FAQ не найден — clients не вставлены");
    return out;
  }
  return `${out.slice(0, start)}\n${clients}\n${out.slice(start)}`;
}

/** Убираем clients из среза /targeting до вставки нашего partial. */
function stripKorporativnyjClientsSection(mainHtml) {
  const clientsIdx = mainHtml.indexOf("Наши клиенты");
  if (clientsIdx < 0) return mainHtml;
  const clSec = mainHtml.lastIndexOf(SECTION_OPEN, clientsIdx);
  if (clSec < 0) return mainHtml;
  const secEnd = mainHtml.indexOf("</section>", clientsIdx) + "</section>".length;
  return mainHtml.slice(0, clSec) + mainHtml.slice(secEnd);
}

function findKorporativnyjCasesAnchorIndex(mainHtml) {
  const iMain = mainHtml.indexOf(CASES_MORE_MAIN);
  if (iMain >= 0) return iMain;
  return mainHtml.indexOf(CASES_CLASS_PREFIX);
}

function extractKorporativnyjFaqBlock(mainHtml) {
  let i0 = mainHtml.indexOf(FAQ_SECTION_START);
  if (i0 < 0) i0 = mainHtml.indexOf('id="korporativnyj-faq-mounted"');
  if (i0 < 0) i0 = mainHtml.indexOf('id="kontekst-faq-mounted"');
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

/** Порядок как на /kontekstnaya_reklama: форма → команда → FAQ → кейсы. */
function moveKorporativnyjFaqSectionBeforeCases(mainHtml) {
  const { block, start, end } = extractKorporativnyjFaqBlock(mainHtml);
  if (!block || start < 0) {
    console.warn("assemble: FAQ — перенос перед кейсами пропущен");
    return mainHtml;
  }
  const iCases = findKorporativnyjCasesAnchorIndex(mainHtml);
  if (iCases < 0) {
    console.warn("assemble: more-case-wr не найден — перенос FAQ пропущен");
    return mainHtml;
  }
  const iInsert = mainHtml.lastIndexOf(SECTION_OPEN, iCases);
  if (iInsert < 0 || iInsert > iCases) return mainHtml;
  const without = mainHtml.slice(0, start) + mainHtml.slice(end);
  const iCases2 = findKorporativnyjCasesAnchorIndex(without);
  if (iCases2 < 0) return mainHtml;
  const iInsert2 = without.lastIndexOf(SECTION_OPEN, iCases2);
  if (iInsert2 < 0) return mainHtml;
  return `${without.slice(0, iInsert2)}\n${block}\n${without.slice(iInsert2)}`;
}

function stripKorporativnyjBlogBlock(mainHtml) {
  let out = mainHtml;
  let idx = out.indexOf(KORPORATIVNYJ_BLOG_SECTION);
  while (idx >= 0) {
    const end = findSectionEnd(out, idx);
    if (end < 0) break;
    out = out.slice(0, idx) + out.slice(end);
    idx = out.indexOf(KORPORATIVNYJ_BLOG_SECTION);
  }
  return out;
}

/** Блог после FAQ, перед more-case (как /kontekstnaya_reklama). */
function injectKorporativnyjBlogAfterFaq(mainHtml) {
  if (!fs.existsSync(BLOG_PARTIAL_PATH)) {
    console.warn("assemble: нет blog-korporativnyj-sajt.html — пропуск вставки блога");
    return mainHtml;
  }
  let out = stripKorporativnyjBlogBlock(mainHtml);
  const { end: faqEnd } = extractKorporativnyjFaqBlock(out);
  if (faqEnd < 0) {
    console.warn("assemble: FAQ не найден — блог после FAQ не вставлен");
    return out;
  }
  const iCases = findKorporativnyjCasesAnchorIndex(out);
  if (iCases < 0 || faqEnd > iCases) {
    console.warn("assemble: кейсы не найдены после FAQ — блог не вставлен");
    return out;
  }
  const blog = fs.readFileSync(BLOG_PARTIAL_PATH, "utf8").trim();
  return `${out.slice(0, faqEnd)}\n${blog}\n${out.slice(faqEnd)}`;
}

function findSectionEnd(html, startIdx) {
  if (startIdx < 0) return -1;
  let depth = 0;
  let i = startIdx;
  while (i < html.length) {
    const relOpen = html.indexOf("<section", i);
    const relClose = html.indexOf("</section>", i);
    if (relClose < 0) return -1;
    if (relOpen >= 0 && relOpen <= relClose) {
      depth++;
      i = relOpen + 8;
    } else {
      depth--;
      i = relClose + "</section>".length;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function injectKorporativnyjSiteCalc(mainHtml) {
  if (mainHtml.includes('id="korporativnyj-site-calc-root"')) return mainHtml;
  const partial = readPartial("html/partials/services/korporativnyj-site-calc.html");
  if (!partial) return mainHtml;

  const packagesEndMarker = "<!-- KORPORATIVNYJ-PACKAGES-END -->";
  const packagesEnd = mainHtml.indexOf(packagesEndMarker);
  if (packagesEnd >= 0) {
    const insertAt = packagesEnd + packagesEndMarker.length;
    return `${mainHtml.slice(0, insertAt)}\n${partial}\n${mainHtml.slice(insertAt)}`;
  }

  const pricesIdx = mainHtml.indexOf('class="prices"');
  if (pricesIdx < 0) {
    console.warn("assemble: section.prices не найден — квиз не вставлен");
    return mainHtml;
  }
  const diesIdx = mainHtml.lastIndexOf('class="dies modern"', pricesIdx);
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, diesIdx >= 0 ? diesIdx : pricesIdx);
  const secEnd = findSectionEnd(mainHtml, secStart);
  if (secStart < 0 || secEnd <= secStart) {
    console.warn("assemble: не найден конец секции prices — квиз не вставлен");
    return mainHtml;
  }
  return `${mainHtml.slice(0, secEnd)}\n${partial}\n${mainHtml.slice(secEnd)}`;
}

/** Таблица сравнения → квиз → форма «Заказать корпоративный сайт». */
function moveKorporativnyjInlineLeadAfterSiteCalc(mainHtml) {
  const leadMarker = mainHtml.indexOf("sa-service-lead-section");
  const calcMarker = mainHtml.indexOf("sa-site-calc-section");
  if (leadMarker < 0 || calcMarker < 0) return mainHtml;

  let leadSec = mainHtml.lastIndexOf('<section class="page-constructor__section sa-service-lead-section"', leadMarker);
  if (leadSec < 0) leadSec = mainHtml.lastIndexOf(SECTION_OPEN, leadMarker);
  const leadEnd = findSectionEnd(mainHtml, leadSec);
  if (leadSec < 0 || leadEnd <= leadSec) return mainHtml;

  const block = mainHtml.slice(leadSec, leadEnd);
  const without = mainHtml.slice(0, leadSec) + mainHtml.slice(leadEnd);

  const calcMarker2 = without.indexOf("sa-site-calc-section");
  if (calcMarker2 < 0) return mainHtml;
  let calcSec = without.lastIndexOf('<section class="page-constructor__section sa-site-calc-section"', calcMarker2);
  if (calcSec < 0) calcSec = without.lastIndexOf(SECTION_OPEN, calcMarker2);
  const calcEnd = findSectionEnd(without, calcSec);
  if (calcSec < 0 || calcEnd <= calcSec) return mainHtml;

  const afterCalc = without.slice(calcEnd, calcEnd + 240);
  if (afterCalc.includes("sa-service-lead-section")) return without;

  return `${without.slice(0, calcEnd)}\n${block}\n${without.slice(calcEnd)}`;
}

function ensureKorporativnyjMoreCasesMainClass(mainHtml) {
  if (mainHtml.includes(CASES_MORE_MAIN)) return mainHtml;
  return mainHtml.replace(
    /class="more-case-wr"/,
    'class="more-case-wr more-case-wr__main"',
  );
}

function injectPhase2(mainHtml) {
  const include = process.env.KORPORATIVNYJ_INCLUDE_PHASE2 === "1" || process.env.KORPORATIVNYJ_INCLUDE_PHASE2 === "true";
  if (!include) return mainHtml;
  let out = mainHtml;
  if (fs.existsSync(PHASE2_MIDDLE) && out.includes(MARKER_MIDDLE)) {
    const mid = rewriteProdSlice(fs.readFileSync(PHASE2_MIDDLE, "utf8").trim());
    out = out.replace(MARKER_MIDDLE, mid);
  }
  return out;
}

function rewriteProdSlice(html) {
  let s = html;
  s = s.replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__");
  s = s.replace(/\/_sa\/img\/storage__null\b/g, "");
  s = s.replace(/\s*<img[^>]*src=""[^>]*>/g, "");
  s = s.replace(/url\(([a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))\)/g, "url(/_sa/img/storage__$1)");
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/https?:\/\/127\.0\.0\.1(?::\d+)?\//g, "/");
  s = s.replace(/https?:\/\/localhost(?::\d+)?\//g, "/");
  s = s.replace(/<div class="page-constructor">\s*<!---->\s*<\/div>\s*<!---->/g, "");
  s = s.replace(
    /itemprop="image" src="\/_sa\/img\/storage__kdf27Tl7T5MVvim1JcSZcnXiQzm4QOhE3IycP5bV\.webp">/g,
    `<link itemprop="image" href="${KORPORATIVNYJ_PRODUCT_IMAGE}" />`,
  );
  s = s.replace(
    /<img\s+itemprop="image"\s+src="\/_sa\/img\/storage__[^"]*">/g,
    `<link itemprop="image" href="${KORPORATIVNYJ_PRODUCT_IMAGE}" />`,
  );
  s = s.replace(/<img\s+<link itemprop="image"/g, '<link itemprop="image"');
  s = s.replace(/(<motion\.motion-div[^>]*class="case-slider"|<div[^>]*class="case-slider") style="height:\s*\d+px;"/g, "$1");
  s = s.replace(
    /class="case-slider__wrapper"(?![^"]*case-slider__margin-fix)/g,
    'class="case-slider__wrapper case-slider__margin-fix"',
  );
  s = s.replace(
    /(<img[^>]*alt="Таргетированная реклама - img 1"[^>]*)\sloading="lazy"/g,
    '$1 loading="eager" fetchpriority="high" width="906" height="515"',
  );
  return s;
}

function stripHtmlForJsonLdDescription(raw) {
  if (!raw || typeof raw !== "string") return raw;
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeProductJsonLd(html) {
  const open = "<script";
  const needle = 'type="application/ld+json"';
  let i = 0;
  let out = "";
  while (i < html.length) {
    const j = html.indexOf(open, i);
    if (j < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, j);
    const tagEnd = html.indexOf(">", j);
    if (tagEnd < 0) {
      out += html.slice(j);
      break;
    }
    const openTag = html.slice(j, tagEnd + 1);
    if (!openTag.includes(needle)) {
      out += openTag;
      i = tagEnd + 1;
      continue;
    }
    const close = html.indexOf("</script>", tagEnd + 1);
    if (close < 0) {
      out += html.slice(j);
      break;
    }
    const body = html.slice(tagEnd + 1, close);
    i = close + "</script>".length;
    try {
      const o = JSON.parse(body);
      if (o["@type"] === "Product") {
        o.image = KORPORATIVNYJ_PRODUCT_IMAGE;
        if (typeof o.description === "string") o.description = stripHtmlForJsonLdDescription(o.description);
        out += `${openTag}${JSON.stringify(o)}</script>`;
      } else {
        out += `${openTag}${body}</script>`;
      }
    } catch {
      out += `${openTag}${body}</script>`;
    }
  }
  return out;
}

function buildCssLinks(v) {
  const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const hrefs = man.hrefs || man;
  return hrefs.map((h) => `    <link rel="stylesheet" href="${h}?v=${v}" />`).join("\n");
}

function deferNonBlockingCss(href) {
  return [
    `    <link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'" />`,
    `    <noscript><link rel="stylesheet" href="${href}" /></noscript>`,
  ].join("\n");
}

function runKorporativnyjTeamSliderBuild() {
  execSync("node scripts/build-team-korporativnyj-from-capture.cjs", {
    cwd: root,
    stdio: "inherit",
  });
}

function ensureKorporativnyjPageShell(mainHtml) {
  let out = mainHtml.replace(
    /<motion.div class="page-constructor">/,
    '<div class="page-constructor korporativnyj-page">',
  );
  if (!out.includes("korporativnyj-page")) {
    out = out.replace(/<div class="page-constructor">/, '<div class="page-constructor korporativnyj-page">');
  }
  return out;
}

function ensureKorporativnyjFaqScript(html) {
  const serviceNeedle = 'src="/_sa/js/service-spoilers.js';
  if (html.includes(serviceNeedle)) return html;
  const legacyRe =
    /<script defer src="\/_sa\/js\/(?:kontekstnaya|targeting)-spoilers\.js[^"]*"><\/script>\s*/;
  if (legacyRe.test(html)) {
    return html.replace(
      legacyRe,
      '<script defer src="/_sa/js/service-spoilers.js?v=20260523targetingFaqExpanded"></script>\n    ',
    );
  }
  const appJs = '<script defer src="/_sa/js/app.js?v=20260517morCasesTablet"></script>';
  if (html.includes(appJs)) {
    return html.replace(
      appJs,
      '<script defer src="/_sa/js/service-spoilers.js?v=20260518serviceFaqPhase1"></script>\n    ' + appJs,
    );
  }
  return html;
}

function ensureKorporativnyjSiteCalcScript(html) {
  const needle = 'src="/_sa/js/korporativnyj-site-calc.js';
  if (html.includes(needle)) return html;
  const leadJs = '<script defer src="/_sa/js/leave-request-cta.js?v=20260602inlineLeadThankYouMsgCenter"></script>';
  const insert =
    '<script defer src="/_sa/js/korporativnyj-site-calc.js?v=20260602korporativnyjSiteCalc"></script>\n    ' + leadJs;
  if (html.includes('src="/_sa/js/leave-request-cta.js')) {
    return html.replace(/<script defer src="\/_sa\/js\/leave-request-cta\.js[^"]*"><\/script>/, insert);
  }
  return html;
}

function ensureKorporativnyjTeamSliderScript(html) {
  const needle = 'src="/_sa/js/service-team-slider.js';
  if (html.includes(needle)) return html;
  const appJs = '<script defer src="/_sa/js/app.js?v=20260517morCasesTablet"></script>';
  const insert =
    `${appJs}\n    <script defer src="/_sa/js/service-team-slider.js?v=20260516kontekstTeamDesktopRestore"></script>`;
  if (!html.includes(appJs)) return html;
  return html.replace(appJs, insert);
}

function ensureKorporativnyjPackagesSliderScript(html) {
  const needle = 'src="/_sa/js/service-packages-slider.js';
  if (html.includes(needle)) return html;
  const teamNeedle = 'src="/_sa/js/service-team-slider.js';
  const tag =
    '    <script defer src="/_sa/js/service-packages-slider.js?v=20260516kontekstPackagesGutter"></script>\n';
  if (html.includes(teamNeedle)) {
    return html.replace(
      /(<script defer src="\/_sa\/js\/service-team-slider\.js[^"]*"><\/script>\s*)/,
      `$1${tag}`,
    );
  }
  const appJs = '<script defer src="/_sa/js/app.js?v=20260517morCasesTablet"></script>';
  if (html.includes(appJs)) {
    return html.replace(appJs, `${appJs}\n${tag.trim()}`);
  }
  return html;
}

function ensureKorporativnyjPackagesCompareRowsScript(html) {
  const needle = 'src="/_sa/js/kontekst-packages-compare-rows.js';
  if (html.includes(needle)) return html;
  const sliderNeedle = 'src="/_sa/js/service-packages-slider.js';
  const tag =
    '    <script defer src="/_sa/js/kontekst-packages-compare-rows.js?v=20260603kontekstPackagesCompareScrollEnd"></script>\n';
  if (html.includes(sliderNeedle)) {
    return html.replace(
      /(<script defer src="\/_sa\/js\/service-packages-slider\.js[^"]*"><\/script>\s*)/,
      `$1${tag}`,
    );
  }
  return html;
}

function ensureBurgerMenuGlavnaya(html) {
  if (/<ul class="navigation-new__list"[^>]*>[\s\S]*?<a\s+href="\/"[^>]*>\s*Главная\s*<\/a>/i.test(html)) {
    return html;
  }
  return html.replace(
    /(<ul class="navigation-new__list"[^>]*>)\s*(?=<li)/i,
    '$1\n                      <li data-v-7050ddb2=""><a href="/" data-v-7050ddb2="">Главная</a></li>\n                      ',
  );
}

/** Subtitle внутри .numbered-header__title (ошибка inject) → в колонку справа. */
function repairMisplacedSubtitles(html) {
  return html.replace(
    /(<div data-v-490c7534="" class="numbered-header__title"><h2 data-v-490c7534="">[^<]+<\/h2>)\s*<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column">(<p[\s\S]*?<\/p>)<\/div>\s*/g,
    "$1 <!----> ",
  ).replace(
    /(numbered-header__title-column">[\s\S]*?<\/motion.div>\s*<\/motion.div>\s*)<!---->(\s*<\/motion.div>\s*<\/motion.div>\s*<div data-v-4ed7dc78="" class="content-block__slider)/g,
    (match, prefix, suffix, offset, full) => {
      const after = full.slice(offset + match.length - suffix.length, offset + match.length + 400);
      if (after.includes("numbered-header__subtitle-column")) return match;
      const blockStart = full.lastIndexOf('class="modern content-block"', offset);
      const blockEnd = full.indexOf('class="content-block__slider', offset);
      const text = extractContentBlockSubtitleHtml(full.slice(blockStart, blockEnd));
      if (!text) return match;
      const subtitle =
        `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column">` +
        `<p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">${text}</p></div> `;
      return `${prefix}${subtitle}<!---->${suffix}`;
    },
  );
}

/** Первый абзац колонок этапа — в subtitle-column (как шаги 2–4), иначе справа пусто без Nuxt-scroll. */
function extractContentBlockSubtitleHtml(blockHtml) {
  const m =
    blockHtml.match(
      /columns-with-progress__content[\s\S]*?<p[^>]*data-v-356d6131[^>]*>([\s\S]*?)<\/p>/,
    ) ||
    blockHtml.match(/columns-with-progress__column--scroll-fix[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/) ||
    blockHtml.match(/class="block__description"[^>]*>([\s\S]*?)<\/p>/);
  return m ? m[1].trim() : null;
}

function injectContentBlockSubtitles(html) {
  let out = html;
  let pos = 0;
  let injected = 0;
  while (pos < out.length) {
    const nhIdx = out.indexOf('class="numbered-header', pos);
    if (nhIdx < 0) break;
    const blockStart = out.lastIndexOf('class="modern content-block"', nhIdx);
    if (blockStart < 0) {
      pos = nhIdx + 1;
      continue;
    }
    const sliderIdx = out.indexOf('class="content-block__slider', nhIdx);
    if (sliderIdx < 0) {
      pos = nhIdx + 1;
      continue;
    }
    const subIdx = out.indexOf("numbered-header__subtitle-column", nhIdx);
    if (subIdx >= 0 && subIdx < sliderIdx) {
      pos = sliderIdx + 1;
      continue;
    }
    const nextBlock = out.indexOf('class="modern content-block"', nhIdx + 1);
    const blockEnd = nextBlock > 0 ? nextBlock : sliderIdx + 12000;
    const text = extractContentBlockSubtitleHtml(out.slice(blockStart, blockEnd));
    if (!text) {
      pos = nhIdx + 1;
      continue;
    }
    const headerSlice = out.slice(nhIdx, sliderIdx);
    const titleColRel = headerSlice.indexOf("numbered-header__title-column");
    if (titleColRel < 0) {
      pos = nhIdx + 1;
      continue;
    }
    const titleColClose = headerSlice.match(
      /numbered-header__title-column">[\s\S]*?<\/div>\s*<\/div>\s*<!---->/,
    );
    if (!titleColClose) {
      pos = nhIdx + 1;
      continue;
    }
    const phIdx = nhIdx + titleColClose.index + titleColClose[0].length - "<!---->".length;
    const subtitle =
      `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column">` +
      `<p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">${text}</p></div> `;
    out = out.slice(0, phIdx) + subtitle + out.slice(phIdx + "<!---->".length);
    injected += 1;
    pos = phIdx + subtitle.length;
  }
  if (injected) console.log("assemble-korporativnyj: injectContentBlockSubtitles:", injected);
  return out;
}

function run() {
  buildServicePartials();
  buildKorporativnyjPackagesPartial();
  const { path: layoutPath, label: layoutLabel } = resolveLayoutPath();
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    console.error("Нет дампа: capture tmp/korporativnyj-prod-full.html");
    process.exit(1);
  }
  console.log("assemble-korporativnyj: layout =", layoutLabel);
  if (!fs.existsSync(manifestPath)) {
    console.error("Нет", manifestPath, "— download-nuxt-css-prod-korporativnyj.cjs");
    process.exit(1);
  }

  const layout = fs.readFileSync(layoutPath, "utf8");
  let iPc = layout.indexOf('<div class="page-constructor">');
  if (iPc < 0) iPc = layout.indexOf('<motion.div class="page-constructor">');
  const iFm = layout.indexOf('<footer class="footer-modern"');
  if (iPc < 0 || iFm < 0 || iFm <= iPc) {
    console.error("Границы среза page-constructor / footer-modern");
    process.exit(1);
  }

  let main = rewriteProdSlice(layout.slice(iPc, iFm));
  main = patchKorporativnyjHeroH1(main);
  main = sanitizeProductJsonLd(main);

  const captureOnly =
    process.env.KORPORATIVNYJ_ASSEMBLE_CAPTURE_ONLY === "1" ||
    process.env.KORPORATIVNYJ_ASSEMBLE_CAPTURE_ONLY === "true";
  if (captureOnly) {
    main = stripKorporativnyjClientsSection(main);
    main = ensureKorporativnyjPageShell(main);
    main = main.replace(/\s*swiper-container-initialized/g, "");
    main = main.replace(/\s*swiper-container-horizontal/g, "");
    main = main.replace(/\s*swiper-container-free-mode/g, "");
    main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
    main = main.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
    /* prod capture as-is: data-v, порядок секций и FAQ из Nuxt */
  } else {
  const phase1Only = process.env.KORPORATIVNYJ_INCLUDE_PHASE2 !== "1" && process.env.KORPORATIVNYJ_INCLUDE_PHASE2 !== "true";
  main = stripPhase1Middle(main);
  main = injectKorporativnyjServiceInlineLead(main);
  main = stripKorporativnyjClientsSection(main);

  main = injectKorporativnyjFaqFromPartial(main);
  main = injectKorporativnyjClientsBeforeFaq(main);
  main = injectPhase2(main);
  main = patchKorporativnyjFirstCasesSlideMetropolitan(main);
  main = patchKorporativnyjSecondCasesSlideMiramar(main);
  main = patchKorporativnyjN4fvkTrailingSlides(main);
  main = patchN4fvkFixNestedSlides(main);
  main = patchN4fvkCloseWrapperBeforePagination(main);
  main = injectKorporativnyjPostHero(main);
  main = injectKorporativnyjCmsBlock(main);
  main = stripKorporativnyjFactsSection(main);
  main = injectKorporativnyjMoreCases(main);
  main = injectKorporativnyjAwards(main);
  main = injectKorporativnyjSynergy(main);
  main = stripKorporativnyjLegacyDiesPrices(main);
  main = injectKorporativnyjSlaSupportBlock(main);
  main = injectKorporativnyjPackagesAfterCreonCase(main);
  main = injectKorporativnyjSiteCalc(main);
  main = moveKorporativnyjInlineLeadAfterSiteCalc(main);
  main = stripKorporativnyjLegacyDiesPrices(main);
  main = injectKorporativnyjPackagesBeforeInlineLead(main);
  main = moveKorporativnyjFaqSectionBeforeCases(main);
  main = injectKorporativnyjBlogAfterFaq(main);
  main = ensureKorporativnyjMoreCasesMainClass(main);
  main = injectContentBlockSubtitles(main);
  main = repairMisplacedSubtitles(main);
  main = repairNumberedHeaderExtraCloses(main);
  main = repairContentBlockMotionDivTags(main);
  {
    const { html: stripped, removed } = stripContentBlockSliders(main);
    main = stripped;
    if (removed) console.log("assemble-korporativnyj: stripContentBlockSliders:", removed);
  }
  main = ensureKorporativnyjPageShell(main);
  /* data-v не снимаем с main: Nuxt bundle korporativnyj-nuxt.bundle.css завязан на scoped-атрибуты героя/case-slider */
  main = main.replace(/\s*swiper-container-initialized/g, "");
  main = main.replace(/\s*swiper-container-horizontal/g, "");
  main = main.replace(/\s*swiper-container-free-mode/g, "");
  main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  main = main.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
  }

  const index = fs.readFileSync(indexPath, "utf8");
  const MAIN_START = "<!-- KORPORATIVNYJ-MAIN-START -->";
  const MAIN_END = "<!-- KORPORATIVNYJ-MAIN-END -->";
  const v = "20260523korporativnyjBundle1";
  const cssBlock = captureOnly
    ? [
        "    <!-- KORPORATIVNYJ-CSS-BUNDLE-START: prod capture baseline (Nuxt + минимум) -->",
        buildCssLinks(v),
        deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
        deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
        '    <link rel="stylesheet" href="/_sa/css/korporativnyj-sajt-static-stack.css?v=20260523korporativnyjCaptureBaseline" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
        "    <!-- KORPORATIVNYJ-CSS-BUNDLE-END -->",
      ].join("\n")
    : [
        "    <!-- KORPORATIVNYJ-CSS-BUNDLE-START: Nuxt + kontekst parity stack (как kontekstnaya_reklama) -->",
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424" />',
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260523serviceHeroTop" />',
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260603morCasesFullBleed" />',
        buildCssLinks(v),
        deferNonBlockingCss("/_sa/css/sections/service-faq.css?v=20260523korporativnyjSynergyNavFix"),
        deferNonBlockingCss("/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell"),
        '    <link rel="stylesheet" href="/_sa/css/korporativnyj-sajt-static-stack.css?v=20260604casesWrapperFix" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/korporativnyj-hero.css?v=20260523serviceHeroTop" />',
        deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
        deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260517morCasesTablet" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/service-inline-lead-form.css?v=20260602inlineLeadThankYouMsgCenter" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/korporativnyj-site-calc.css?v=20260602korporativnyjSiteCalcTimeline" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
        "    <!-- KORPORATIVNYJ-CSS-BUNDLE-END -->",
      ].join("\n");

  const cssStart = index.indexOf("<!-- KORPORATIVNYJ-CSS-BUNDLE-START");
  const cssEnd = index.indexOf("<!-- KORPORATIVNYJ-CSS-BUNDLE-END -->");
  const cssEndLine = cssEnd + "<!-- KORPORATIVNYJ-CSS-BUNDLE-END -->".length;
  const indexCss = index.slice(0, cssStart) + cssBlock + index.slice(cssEndLine);

  const iStart = indexCss.indexOf(MAIN_START);
  const iEnd = indexCss.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0) {
    console.error("Нет маркеров KORPORATIVNYJ-MAIN-START/END");
    process.exit(1);
  }

  let out = `${indexCss.slice(0, iStart + MAIN_START.length)}\n${main}\n${indexCss.slice(iEnd)}`;
  out = ensureBurgerMenuGlavnaya(out);
  if (!captureOnly) {
    out = ensureKorporativnyjFaqScript(out);
    out = ensureKorporativnyjTeamSliderScript(out);
    out = ensureKorporativnyjPackagesSliderScript(out);
    out = ensureKorporativnyjPackagesCompareRowsScript(out);
    out = ensureKorporativnyjSiteCalcScript(out);
  }
  fs.writeFileSync(indexPath, out, "utf8");
  const typo = processTypographyHtml(fs.readFileSync(indexPath, "utf8"), { force: true });
  let finalHtml = typo.html.replace(/\n+$/, "\n");
  fs.writeFileSync(indexPath, finalHtml, "utf8");

  if (!captureOnly && process.env.KORPORATIVNYJ_SKIP_TEAM_BUILD !== "1") {
    runKorporativnyjTeamSliderBuild();
    finalHtml = fs.readFileSync(indexPath, "utf8");
    const typoAfterTeam = processTypographyHtml(finalHtml, { force: true });
    fs.writeFileSync(indexPath, typoAfterTeam.html.replace(/\n+$/, "\n"), "utf8");
  }

  let published = fs.readFileSync(indexPath, "utf8");
  published = patchKorporativnyjHeadMeta(published);
  published = patchServiceBreadcrumbForSlug(published, "korporativnyj_sajt");
  if (!captureOnly) {
    published = stripLegacyDiesFromPublishedPage(published);
  }
  fs.writeFileSync(indexPath, published.replace(/\n+$/, "\n"), "utf8");

  console.log("assemble-korporativnyj-from-prod-layout: ok, main bytes", main.length);
}

if (require.main === module) {
  run();
}

module.exports = { run };
