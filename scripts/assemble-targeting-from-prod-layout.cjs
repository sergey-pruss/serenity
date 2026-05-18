#!/usr/bin/env node
/**
 * Сборка targeting/index.html: срез prod/Nuxt + partials (FAQ из json/services/targeting/faq.json — npm run build:service-faq, форма, кейсы, награды, синергия).
 * TARGETING_INCLUDE_PHASE2=1 — вставить html/partials/services/targeting-phase2-*.html (факты, этапы, клиенты).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { sanitizeMoreCasesCapture } = require("./sanitize-more-cases-capture.cjs");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");

const root = path.resolve(__dirname, "..");

function buildServicePartials() {
  if (process.env.SKIP_SERVICE_PARTIALS_BUILD === "1") return;
  execSync("npm run build:service-partials", { cwd: root, stdio: "inherit" });
}

const fullHtmlPath = path.join(root, "tmp", "targeting-prod-full.html");
const parityLayoutPath = path.join(root, "tmp", "targeting-parity-prod-layout.html");
const indexPath = path.join(root, "targeting", "index.html");
const manifestPath = path.join(root, "targeting", "nuxt-css-manifest.json");

const PHASE2_MIDDLE = path.join(root, "html", "partials", "services", "targeting-phase2-middle.html");
const PHASE2_CLIENTS = path.join(root, "html", "partials", "services", "targeting-phase2-clients.html");

const MARKER_MIDDLE = "<!-- TARGETING-PHASE2:middle -->";

const FAQ_SECTION_START = '<section class="page-constructor__section targeting-faq-section">';
const FAQ_BLOCK_TAIL = "</script></div></section>";
const CASES_MORE_MAIN = "more-case-wr more-case-wr__main";
const CASES_CLASS_PREFIX = 'class="more-case-wr';
const SECTION_OPEN = '<section class="page-constructor__section';

const TARGETING_PRODUCT_IMAGE =
  "https://serenity.agency/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp";
const TARGETING_PRODUCT_IMAGE_DISK = "/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp";

function resolveLayoutPath() {
  const mode = (process.env.TARGETING_LAYOUT_SOURCE || "auto").toLowerCase();
  if (mode === "parity") return { path: parityLayoutPath, label: "parity" };
  if (mode === "full") return { path: fullHtmlPath, label: "full" };
  if (mode !== "auto") {
    console.error("TARGETING_LAYOUT_SOURCE: auto | full | parity");
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
  const secStart = html.lastIndexOf('<section class="page-constructor__section">', i);
  if (secStart < 0) return html;
  const secEnd = html.indexOf("</section>", i) + "</section>".length;
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

function injectTargetingFaqFromPartial(mainHtml) {
  const partial = readPartial("html/partials/services/faq-targeting.html");
  if (!partial) return mainHtml;
  const casesIdx = mainHtml.indexOf('class="more-case-wr');
  if (casesIdx < 0) {
    console.warn("assemble: FAQ — нет якоря more-case-wr (кейсы вставятся partial позже)");
  }
  const regionEnd = casesIdx >= 0 ? casesIdx : mainHtml.indexOf('class="awards__title">Награды');
  if (regionEnd < 0) return mainHtml;
  const region = mainHtml.slice(0, regionEnd);
  const startRes = [
    /<section class="page-constructor__section targeting-faq-section">/,
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

function injectTargetingServiceInlineLead(mainHtml) {
  if (mainHtml.includes('id="sa-inline-lead-root"')) return mainHtml;
  const partial = readPartial("html/partials/services/service-inline-lead-targeting.html");
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
  const p = path.join(root, "html/partials/services/more-cases-targeting.html");
  if (!fs.existsSync(p)) return null;
  let html = fs.readFileSync(p, "utf8").trim();
  html = html.replace(/^<!--[\s\S]*?-->\s*/, "");
  return html;
}

function injectTargetingMoreCases(mainHtml) {
  /* data-v на more-case-wr обязателен: .more-cases--active[data-v-27a87df0] в snapshot.bundle */
  let partial = readMoreCasesPartial();
  if (partial) partial = sanitizeMoreCasesCapture(partial);
  if (!partial) return mainHtml;
  const { start: secStart, end: secEnd } = extractMoreCasesSectionBounds(mainHtml);
  if (secStart < 0 || secEnd <= secStart) {
    console.warn("assemble: more-case-wr section не найден");
    return mainHtml;
  }
  return `${mainHtml.slice(0, secStart)}${partial}\n${mainHtml.slice(secEnd)}`;
}

function injectTargetingAwards(mainHtml) {
  const partial = readPartial("html/partials/services/awards-targeting.html");
  if (!partial) return mainHtml;
  const i0 = mainHtml.indexOf('id="targeting-awards-heading"');
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

function injectTargetingSynergy(mainHtml) {
  const partial = readPartial("html/partials/services/synergy-targeting.html");
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
    console.warn("assemble: synergy-section не найден");
    return mainHtml;
  }
  const close = "</section></section>";
  const j = mainHtml.indexOf(close, i0);
  if (j < 0) return mainHtml;
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(j + close.length)}`;
}

function stripPhase1Middle(mainHtml) {
  const heroEnd = mainHtml.indexOf("</section>", mainHtml.indexOf("c-title-block")) + "</section>".length;
  const formIdx = mainHtml.indexOf('class="forms modern"');
  if (formIdx < 0) return mainHtml;
  const formSec = mainHtml.lastIndexOf('<section class="page-constructor__section">', formIdx);
  if (formSec <= heroEnd) return mainHtml;
  return `${mainHtml.slice(0, heroEnd)}\n${MARKER_MIDDLE}\n${mainHtml.slice(formSec)}`;
}

/** На /kontekstnaya_reklama отдельной секции «Наши клиенты» нет — убираем с /targeting. */
function stripTargetingClientsSection(mainHtml) {
  const clientsIdx = mainHtml.indexOf("Наши клиенты");
  if (clientsIdx < 0) return mainHtml;
  const clSec = mainHtml.lastIndexOf(SECTION_OPEN, clientsIdx);
  if (clSec < 0) return mainHtml;
  const secEnd = mainHtml.indexOf("</section>", clientsIdx) + "</section>".length;
  return mainHtml.slice(0, clSec) + mainHtml.slice(secEnd);
}

function findTargetingCasesAnchorIndex(mainHtml) {
  const iMain = mainHtml.indexOf(CASES_MORE_MAIN);
  if (iMain >= 0) return iMain;
  return mainHtml.indexOf(CASES_CLASS_PREFIX);
}

function extractTargetingFaqBlock(mainHtml) {
  let i0 = mainHtml.indexOf(FAQ_SECTION_START);
  if (i0 < 0) i0 = mainHtml.indexOf('id="targeting-faq-mounted"');
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
function moveTargetingFaqSectionBeforeCases(mainHtml) {
  const { block, start, end } = extractTargetingFaqBlock(mainHtml);
  if (!block || start < 0) {
    console.warn("assemble: FAQ — перенос перед кейсами пропущен");
    return mainHtml;
  }
  const iCases = findTargetingCasesAnchorIndex(mainHtml);
  if (iCases < 0) {
    console.warn("assemble: more-case-wr не найден — перенос FAQ пропущен");
    return mainHtml;
  }
  const iInsert = mainHtml.lastIndexOf(SECTION_OPEN, iCases);
  if (iInsert < 0 || iInsert > iCases) return mainHtml;
  const without = mainHtml.slice(0, start) + mainHtml.slice(end);
  const iCases2 = findTargetingCasesAnchorIndex(without);
  if (iCases2 < 0) return mainHtml;
  const iInsert2 = without.lastIndexOf(SECTION_OPEN, iCases2);
  if (iInsert2 < 0) return mainHtml;
  return `${without.slice(0, iInsert2)}\n${block}\n${without.slice(iInsert2)}`;
}

/** Порядок как на /kontekstnaya_reklama: инлайн-форма сразу после контента, до «Команда». */
function moveTargetingInlineLeadBeforeTeam(mainHtml) {
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

function ensureTargetingMoreCasesMainClass(mainHtml) {
  if (mainHtml.includes(CASES_MORE_MAIN)) return mainHtml;
  return mainHtml.replace(
    /class="more-case-wr"/,
    'class="more-case-wr more-case-wr__main"',
  );
}

function injectPhase2(mainHtml) {
  const include = process.env.TARGETING_INCLUDE_PHASE2 === "1" || process.env.TARGETING_INCLUDE_PHASE2 === "true";
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
  s = s.replace(/url\(([a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))\)/g, "url(/_sa/img/storage__$1)");
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/https?:\/\/127\.0\.0\.1(?::\d+)?\//g, "/");
  s = s.replace(/https?:\/\/localhost(?::\d+)?\//g, "/");
  s = s.replace(/<div class="page-constructor">\s*<!---->\s*<\/div>\s*<!---->/g, "");
  s = s.replace(
    /itemprop="image" src="\/_sa\/img\/storage__kdf27Tl7T5MVvim1JcSZcnXiQzm4QOhE3IycP5bV\.webp">/g,
    `<link itemprop="image" href="${TARGETING_PRODUCT_IMAGE}" />`,
  );
  s = s.replace(
    /<img\s+itemprop="image"\s+src="\/_sa\/img\/storage__[^"]+">/g,
    `<link itemprop="image" href="${TARGETING_PRODUCT_IMAGE}" />`,
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
        o.image = TARGETING_PRODUCT_IMAGE;
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

function runTargetingTeamSliderBuild() {
  execSync("node scripts/build-team-targeting-from-kontekst.cjs", {
    cwd: root,
    stdio: "inherit",
  });
}

function ensureTargetingPageShell(mainHtml) {
  let out = mainHtml.replace(
    /<motion.div class="page-constructor">/,
    '<div class="page-constructor targeting-page">',
  );
  if (!out.includes("targeting-page")) {
    out = out.replace(/<div class="page-constructor">/, '<div class="page-constructor targeting-page">');
  }
  return out;
}

function ensureTargetingFaqScript(html) {
  const serviceNeedle = 'src="/_sa/js/service-spoilers.js';
  if (html.includes(serviceNeedle)) return html;
  const legacyRe =
    /<script defer src="\/_sa\/js\/(?:kontekstnaya|targeting)-spoilers\.js[^"]*"><\/script>\s*/;
  if (legacyRe.test(html)) {
    return html.replace(
      legacyRe,
      '<script defer src="/_sa/js/service-spoilers.js?v=20260518serviceFaqPhase1"></script>\n    ',
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

function ensureTargetingTeamSliderScript(html) {
  const needle = 'src="/_sa/js/service-team-slider.js';
  if (html.includes(needle)) return html;
  const appJs = '<script defer src="/_sa/js/app.js?v=20260517morCasesTablet"></script>';
  const insert =
    `${appJs}\n    <script defer src="/_sa/js/service-team-slider.js?v=20260516kontekstTeamDesktopRestore"></script>`;
  if (!html.includes(appJs)) return html;
  return html.replace(appJs, insert);
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

function run() {
  buildServicePartials();
  const { path: layoutPath, label: layoutLabel } = resolveLayoutPath();
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    console.error("Нет дампа: capture tmp/targeting-prod-full.html");
    process.exit(1);
  }
  console.log("assemble-targeting: layout =", layoutLabel);
  if (!fs.existsSync(manifestPath)) {
    console.error("Нет", manifestPath, "— download-nuxt-css-prod-targeting.cjs");
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
  main = sanitizeProductJsonLd(main);

  const captureOnly =
    process.env.TARGETING_ASSEMBLE_CAPTURE_ONLY === "1" ||
    process.env.TARGETING_ASSEMBLE_CAPTURE_ONLY === "true";
  if (captureOnly) {
    main = stripTargetingClientsSection(main);
    main = ensureTargetingPageShell(main);
    main = main.replace(/\s*swiper-container-initialized/g, "");
    main = main.replace(/\s*swiper-container-horizontal/g, "");
    main = main.replace(/\s*swiper-container-free-mode/g, "");
    main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
    main = main.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
    /* prod capture as-is: data-v, порядок секций и FAQ из Nuxt */
  } else {
  const phase1Only = process.env.TARGETING_INCLUDE_PHASE2 !== "1" && process.env.TARGETING_INCLUDE_PHASE2 !== "true";
  main = stripPhase1Middle(main);
  main = injectTargetingServiceInlineLead(main);
  main = stripTargetingClientsSection(main);

  main = injectTargetingFaqFromPartial(main);
  main = injectPhase2(main);
  main = injectTargetingMoreCases(main);
  main = injectTargetingAwards(main);
  main = injectTargetingSynergy(main);
  main = moveTargetingInlineLeadBeforeTeam(main);
  main = moveTargetingFaqSectionBeforeCases(main);
  main = ensureTargetingMoreCasesMainClass(main);
  main = ensureTargetingPageShell(main);
  /* data-v не снимаем с main: Nuxt bundle targeting-nuxt.bundle.css завязан на scoped-атрибуты героя/case-slider */
  main = main.replace(/\s*swiper-container-initialized/g, "");
  main = main.replace(/\s*swiper-container-horizontal/g, "");
  main = main.replace(/\s*swiper-container-free-mode/g, "");
  main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  main = main.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
  }

  const index = fs.readFileSync(indexPath, "utf8");
  const MAIN_START = "<!-- TARGETING-MAIN-START -->";
  const MAIN_END = "<!-- TARGETING-MAIN-END -->";
  const v = "20260517targetingBundle1";
  const cssBlock = captureOnly
    ? [
        "    <!-- TARGETING-CSS-BUNDLE-START: prod capture baseline (Nuxt + минимум) -->",
        buildCssLinks(v),
        deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
        deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
        '    <link rel="stylesheet" href="/_sa/css/targeting-static-stack.css?v=20260517targetingCaptureBaseline" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
        "    <!-- TARGETING-CSS-BUNDLE-END -->",
      ].join("\n")
    : [
        "    <!-- TARGETING-CSS-BUNDLE-START: Nuxt + kontekst parity stack (как kontekstnaya_reklama) -->",
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424" />',
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260516morCasesLinkSlideBg" />',
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260516kontekstTeamDesktopRestore" />',
        buildCssLinks(v),
        deferNonBlockingCss("/_sa/css/sections/service-faq.css?v=20260518serviceFaqPhase1"),
        deferNonBlockingCss("/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell"),
        '    <link rel="stylesheet" href="/_sa/css/targeting-static-stack.css?v=20260517targetingMoreCasesFix2" />',
        deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
        deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
        '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260517morCasesTablet" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/service-inline-lead-form.css?v=20260516leadFormFieldsVisible" />',
        '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
        "    <!-- TARGETING-CSS-BUNDLE-END -->",
      ].join("\n");

  const cssStart = index.indexOf("<!-- TARGETING-CSS-BUNDLE-START");
  const cssEnd = index.indexOf("<!-- TARGETING-CSS-BUNDLE-END -->");
  const cssEndLine = cssEnd + "<!-- TARGETING-CSS-BUNDLE-END -->".length;
  const indexCss = index.slice(0, cssStart) + cssBlock + index.slice(cssEndLine);

  const iStart = indexCss.indexOf(MAIN_START);
  const iEnd = indexCss.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0) {
    console.error("Нет маркеров TARGETING-MAIN-START/END");
    process.exit(1);
  }

  let out = `${indexCss.slice(0, iStart + MAIN_START.length)}\n${main}\n${indexCss.slice(iEnd)}`;
  out = ensureBurgerMenuGlavnaya(out);
  if (!captureOnly) {
    out = ensureTargetingFaqScript(out);
    out = ensureTargetingTeamSliderScript(out);
  }
  fs.writeFileSync(indexPath, out, "utf8");
  const typo = processTypographyHtml(fs.readFileSync(indexPath, "utf8"), { force: true });
  let finalHtml = typo.html.replace(/\n+$/, "\n");
  fs.writeFileSync(indexPath, finalHtml, "utf8");

  if (!captureOnly && process.env.TARGETING_SKIP_TEAM_BUILD !== "1") {
    runTargetingTeamSliderBuild();
    finalHtml = fs.readFileSync(indexPath, "utf8");
    const typoAfterTeam = processTypographyHtml(finalHtml, { force: true });
    fs.writeFileSync(indexPath, typoAfterTeam.html.replace(/\n+$/, "\n"), "utf8");
  }

  console.log("assemble-targeting-from-prod-layout: ok, main bytes", main.length);
}

if (require.main === module) {
  run();
}

module.exports = { run };
