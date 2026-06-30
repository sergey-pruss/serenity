#!/usr/bin/env node
/**
 * Сборка seo/index.html: prod-срез /seo + shell без Nuxt (как kompleksnoye-prodvizheniye).
 * SEO_ASSEMBLE_CAPTURE_ONLY=1 — main из capture без partials (parity контента с prod).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { stripContentBlockSliders } = require("./lib/strip-content-block-slider.cjs");
const { repairContentBlockMotionDivTags } = require("./lib/repair-content-block-motion-div-tags.cjs");
const { repairNumberedHeaderExtraCloses } = require("./lib/repair-numbered-header-extra-closes.cjs");
const { repairSeoMainStrayCloses } = require("./lib/repair-seo-main-stray-closes.cjs");
const { swapSeoInlineIripaToAwm } = require("./lib/swap-seo-inline-iripa-to-awm.cjs");
const { patchServiceBreadcrumbForSlug } = require("./lib/service-breadcrumb-jsonld.cjs");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");
const {
  resolveLayoutPath,
  rewriteProdSliceBase,
  ensureBurgerMenuGlavnaya,
  buildCssLinks,
  deferNonBlockingCss,
} = require("./lib/assemble-service-common.cjs");

const root = path.resolve(__dirname, "..");
const config = loadServiceConfig("seo");
const { assemble: a, indexPath, manifestPath } = config;

const MAIN_START = `<!-- ${a.markers.mainStart} -->`;
const MAIN_END = `<!-- ${a.markers.mainEnd} -->`;
const CSS_START = `<!-- ${a.markers.cssBundleStart}`;
const CSS_END = `<!-- ${a.markers.cssBundleEnd} -->`;

const SEO_HERO_DESKTOP = "/_sa/img/services/seo/hero/hero.webp";
const SEO_HERO_MOBILE = "/_sa/img/services/seo/hero/hero__m.webp";

function patchSeoHeroBackgrounds(html) {
  let s = html;
  s = s.replace(
    /(<div class="header-full header-background desctop" style="background-image:\s*url\(&quot;)[^&]+(&quot;\);)/g,
    `$1${SEO_HERO_DESKTOP}$2`,
  );
  s = s.replace(
    /(<div class="header-full header-background mobile" style="background-image:\s*url\()[^)]+(\);)/g,
    `$1${SEO_HERO_MOBILE}$2`,
  );
  s = s.replace(/\/_sa\/img\/storage__qQv2LIJk1wWDNYoKD3lvFqdfZ8lGwOIN8MrciTLQ\.webp/g, SEO_HERO_DESKTOP);
  s = s.replace(/\/storage\/qQv2LIJk1wWDNYoKD3lvFqdfZ8lGwOIN8MrciTLQ\.webp/g, SEO_HERO_DESKTOP);
  s = s.replace(/\/storage\/ry3dunSG6PrNOQGcTS3FEX4XXLOZbzgeQh6peIhB\.webp/g, SEO_HERO_MOBILE);
  return s;
}

function ensureSeoHeroPreload(html) {
  const preload =
    '    <link rel="preload" as="image" href="/_sa/img/services/seo/hero/hero.webp" fetchpriority="high" />\n';
  if (html.includes('rel="preload" as="image" href="/_sa/img/services/seo/hero/hero.webp"')) {
    return html;
  }
  const anchor = '<link rel="preload" as="font" type="font/woff" href="/_sa/img/HeroNew-Medium.woff"';
  if (html.includes(anchor)) {
    return html.replace(anchor, preload + anchor);
  }
  return html;
}

function rewriteSeoSlice(html) {
  let s = rewriteProdSliceBase(html);
  s = patchSeoHeroBackgrounds(s);
  s = s.replace(/href="\/services\/search"/g, 'href="/kompleksnoye-prodvizheniye"');
  s = s.replace(
    /(<motion\.motion-div[^>]*class="case-slider"|<div[^>]*class="case-slider") style="height:\s*\d+px;"/g,
    "$1",
  );
  s = s.replace(
    /class="case-slider__wrapper"(?![^"]*case-slider__margin-fix)/g,
    'class="case-slider__wrapper case-slider__margin-fix"',
  );
  return s;
}

const WS = "(?:&nbsp;|\\s)";

function escapeMetaAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function applySeoHeadMeta(html) {
  const { pageTitle, metaTitle, description } = config.seo;
  if (!pageTitle) return html;
  const title = escapeMetaAttr(pageTitle);
  const ogTitle = escapeMetaAttr(metaTitle || pageTitle);
  const desc = escapeMetaAttr(description || "");
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = out.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
  out = out.replace(/<meta name="title" content="[^"]*"/, `<meta name="title" content="${ogTitle}"`);
  out = out.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${ogTitle}"`);
  out = out.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${desc}"`,
  );
  out = out.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${ogTitle}"`);
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${desc}"`,
  );
  const ogImage = "https://serenity.agency/_sa/img/services/seo/hero/hero.webp";
  if (!out.includes('property="og:image:secure_url"')) {
    out = out.replace(
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${ogImage}" />\n    <meta property="og:image:secure_url" content="${ogImage}" />\n    <meta property="og:image:type" content="image/webp" />`,
    );
  }
  return out;
}

function patchSeoHeroSubtitle(html) {
  const raw = config.seo.heroSubtitle;
  if (!raw) return html;
  const sub = processTypographyHtml(raw, { force: true }).html;
  return html.replace(
    /(<h4 class="jumbotron-img-aurora__subtitle"[^>]*>)[^<]*(<\/h4>)/g,
    `$1${sub}$2`,
  );
}

function patchSeoInternalLinks(html) {
  let s = html;
  s = s.replace(
    /Мы за&nbsp;комплексность в&nbsp;маркетинге\. Поэтому в&nbsp;рамках SEO-продвижения улучшаем сайт так, чтобы это&nbsp;позитивно сказывалось и&nbsp;на&nbsp;других каналах продаж\./g,
    'Мы за&nbsp;комплексность в&nbsp;маркетинге. Сочетаем SEO с&nbsp;<a href="/kompleksnoye-prodvizheniye" class="seo-text-link">комплексным продвижением</a> и&nbsp;<a href="/kontekstnaya_reklama" class="seo-text-link">контекстной рекламой</a>, чтобы улучшения на&nbsp;сайте позитивно сказывались и&nbsp;на&nbsp;других каналах продаж.',
  );
  s = s.replace(
    /отделами аналитики, разработки, контента, дизайна и&nbsp;(?:<a href="\/kontekstnaya_reklama" class="seo-text-link">)?контекстной рекламы(?:<\/a>)?, чтобы совместно/g,
    'отделами аналитики, разработки, контента, дизайна и&nbsp;<a href="/kontekstnaya_reklama" class="seo-text-link">контекстной рекламы</a>, чтобы совместно',
  );
  s = s.replace(
    /в&nbsp;то&nbsp;время как&nbsp;контекстная реклама — это&nbsp;платные объявления/g,
    'в&nbsp;то&nbsp;время как&nbsp;<a href="/kontekstnaya_reklama" class="seo-text-link">контекстная реклама</a> — это&nbsp;платные объявления',
  );
  s = s.replace(
    /на&nbsp;конверсию в&nbsp;целом\./g,
    'на&nbsp;<a href="/uvelichenie-konversii-saita" class="seo-text-link">конверсию в&nbsp;целом</a>.',
  );
  s = s.replace(
    /А&nbsp;если сайт делается с&nbsp;нуля/g,
    'А&nbsp;если <a href="/korporativnyj_sajt" class="seo-text-link">сайт</a> делается <a href="/sozdanie-internet-magazina" class="seo-text-link">с&nbsp;нуля</a>',
  );
  s = s.replace(
    /с&nbsp;первых дней после релиза/g,
    'с&nbsp;первых дней <a href="/tehnicheskaya-podderzhka-saita" class="seo-text-link">после релиза</a>',
  );
  s = s.replace(
    /формируем промостраницу/g,
    'формируем <a href="/prodvizhenie-statey-v-dzene-i-promostranitsah" class="seo-text-link">промостраницу</a>',
  );
  return s;
}

/** Facts: переносы в левой колонке, чтобы заголовок не заезжал на .description-item. */
function patchSeoFactsTitleLineBreak(html) {
  let s = html;
  s = s.replace(
    new RegExp(`SEO-продвижение сайта \u2014 это${WS}комплекс мер`),
    "SEO-продвижение сайта \u2014 это<br>комплекс мер",
  );
  s = s.replace(
    new RegExp(`(направленный на${WS}улучшение)${WS}(позиций сайта)`),
    "$1<br>$2",
  );
  s = s.replace(
    new RegExp(`(по${WS}необходимым запросам)${WS}(в${WS}результатах)`),
    "$1<br>$2",
  );
  s = s.replace(new RegExp(`(таких)${WS}(как${WS}Google)`), "$1<br>$2");
  return s;
}

function ensureSeoPageShell(mainHtml) {
  let out = mainHtml.replace(/<motion\.div class="page-constructor">/g, '<div class="page-constructor seo-page">');
  out = out.replace(/<div class="page-constructor">/g, '<div class="page-constructor seo-page">');
  if (!out.includes("seo-page")) {
    out = `<div class="page-constructor seo-page">${out}</div>`;
  }
  if (!out.includes('id="gradient-canvas"')) {
    out = out.replace(
      /<div class="page-constructor seo-page">/,
      '<div class="page-constructor seo-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>',
    );
  }
  return out;
}

function readPartial(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8").trim();
}

function extractTeamSection(html) {
  const idx = html.indexOf("team-block");
  if (idx === -1) return null;
  const secStart = html.lastIndexOf("<section", idx);
  let pos = secStart;
  let depth = 0;
  while (pos < html.length) {
    if (html.slice(pos, pos + 8) === "<section") depth += 1;
    else if (html.slice(pos, pos + 10) === "</section>") {
      depth -= 1;
      if (depth === 0) return html.slice(secStart, pos + 10);
    }
    pos += 1;
  }
  return null;
}

/** Блок «Работаем в синергии…» — те же классы/сетка, что «Синергия каналов» на kompleksnoye. */
function tagSeoSynergyToolsSection(mainHtml) {
  const marker = "Работаем в&nbsp;синергии";
  const idx = mainHtml.indexOf(marker);
  if (idx === -1) return mainHtml;
  const secOpen = '<section class="page-constructor__section">';
  const secStart = mainHtml.lastIndexOf(secOpen, idx);
  if (secStart < 0) return mainHtml;
  let out =
    mainHtml.slice(0, secStart) +
    '<section class="page-constructor__section seo-synergy-tools-section">' +
    mainHtml.slice(secStart + secOpen.length);
  const gridClass = 'class="content-block__grid content-block__grid--desc blocks"';
  const gridIdx = out.indexOf(gridClass, idx);
  if (gridIdx !== -1) {
    out =
      out.slice(0, gridIdx) +
      'class="content-block__grid content-block__grid--desc blocks seo-synergy-tools-grid"' +
      out.slice(gridIdx + gridClass.length);
  }
  return out;
}

function removeProdTeamSection(mainHtml) {
  const block = extractTeamSection(mainHtml);
  if (!block) return mainHtml;
  return mainHtml.replace(block, "");
}

function injectSeoServiceInlineLead(mainHtml) {
  if (mainHtml.includes('id="sa-inline-lead-root"')) return mainHtml;
  const partial = readPartial(`html/partials/services/${a.partials.inlineLead}`);
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

function injectSeoTeamAfterLead(mainHtml) {
  const partial = readPartial(`html/partials/services/${a.partials.team}`);
  if (!partial) return mainHtml;
  const idx = mainHtml.indexOf("sa-service-lead-section");
  if (idx < 0) return mainHtml;
  const closeIdx = mainHtml.indexOf("</section>", idx);
  if (closeIdx < 0) return mainHtml;
  const insertAt = closeIdx + "</section>".length;
  if (mainHtml.slice(insertAt, insertAt + 200).includes("team__members-slider")) {
    return mainHtml;
  }
  return `${mainHtml.slice(0, insertAt)}\n${partial}\n${mainHtml.slice(insertAt)}`;
}

const TAIL_MARKERS = [
  "dies modern",
  "clients-wrapper",
  "more-case-wr",
  "questions__title",
  "korporativnyj-faq-section",
  "seo-blog-section",
  "blog-block-mainstr",
  "seo-awards-section",
  "awards__title",
  "seo-synergy-section",
  "synergy-section",
  "Награды",
  "Синергия с услугами",
];

function stripProdTailAfterTeam(mainHtml) {
  const teamIdx = mainHtml.indexOf("seo-team-section");
  if (teamIdx < 0) return mainHtml;
  const closeIdx = mainHtml.indexOf("</section>", teamIdx);
  if (closeIdx < 0) return mainHtml;
  const insertAt = closeIdx + "</section>".length;
  let cutAt = -1;
  for (const m of TAIL_MARKERS) {
    const i = mainHtml.indexOf(m, insertAt);
    if (i >= 0 && (cutAt < 0 || i < cutAt)) cutAt = i;
  }
  if (cutAt < 0) return mainHtml;
  return `${mainHtml.slice(0, insertAt)}\n`;
}

/**
 * Как kompleksnoye после KOMPLEKSNOYE-TEAM-END: закрыть внешнюю section/обёртки
 * из prod-среза, иначе хвост (клиенты, FAQ, блог…) остаётся на лишней вложенности.
 */
/** На /seo секции хвоста уже соседи team; двойное закрытие как у kompleks (dies) не вставляем. */
function ensureSeoOuterClosesAfterTeam(mainHtml) {
  return mainHtml;
}

function injectSeoTailAfterTeam(mainHtml) {
  const order = ["relatedServices", "clients", "faq", "blog", "moreCases", "awards", "synergy"];
  const teamIdx = mainHtml.indexOf("seo-team-section");
  if (teamIdx < 0) return mainHtml;
  const closeIdx = mainHtml.indexOf("</section>", teamIdx);
  if (closeIdx < 0) return mainHtml;
  let insertAt = closeIdx + "</section>".length;
  const chunks = [];
  for (const key of order) {
    const rel = a.partials[key];
    if (!rel) continue;
    const block = readPartial(`html/partials/services/${rel}`);
    if (!block) {
      console.warn("assemble-seo: нет partial", rel);
      continue;
    }
    chunks.push(block);
  }
  if (!chunks.length) return mainHtml;
  return `${mainHtml.slice(0, insertAt)}\n${chunks.join("\n")}\n${mainHtml.slice(insertAt)}`;
}

function ensureSeoMainTagBalance(mainHtml) {
  let out = mainHtml.trimEnd();
  const divO = (out.match(/<div/g) || []).length;
  const divC = (out.match(/<\/div>/g) || []).length;
  const secO = (out.match(/<section/g) || []).length;
  const secC = (out.match(/<\/section>/g) || []).length;
  if (divO > divC) out += "\n</div>".repeat(divO - divC);
  if (secO > secC) out += "\n</section>".repeat(secO - secC);
  return `${out}\n`;
}

function ensureSeoScripts(html) {
  let out = html;
  const spoilers = 'src="/_sa/js/service-spoilers.js';
  if (!out.includes(spoilers)) {
    const appJs = '<script defer src="/_sa/js/app.js?v=20260517menuCollapseYFix"></script>';
    if (out.includes(appJs)) {
      out = out.replace(
        appJs,
        '<script defer src="/_sa/js/service-spoilers.js?v=20260603seoFaq"></script>\n    ' + appJs,
      );
    }
  }
  const team = 'src="/_sa/js/service-team-slider.js';
  if (!out.includes(team)) {
    const swiper = '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.js"></script>';
    if (out.includes(swiper)) {
      out = out.replace(
        swiper,
        swiper + '\n    <script defer src="/_sa/js/service-team-slider.js?v=20260603seoTeam"></script>',
      );
    }
  }
  const packages = 'src="/_sa/js/service-packages-slider.js';
  if (!out.includes(packages) && out.includes(team)) {
    out = out.replace(
      team,
      team + '\n    <script defer src="/_sa/js/service-packages-slider.js?v=20260603seoPackages"></script>',
    );
  }
  out = out.replace(
    /\/_sa\/js\/app\.js\?v=[^"]+/g,
    "/_sa/js/app.js?v=20260603seoCasesActive",
  );
  return out;
}

function buildSeoPartials() {
  if (process.env.SKIP_SEO_PARTIALS_BUILD === "1") return;
  execSync("node scripts/build-service-inline-lead-partials.cjs", { cwd: root, stdio: "inherit" });
  execSync("node scripts/build-team-seo-from-capture.cjs", { cwd: root, stdio: "inherit" });
  execSync("node scripts/build-seo-tail-partials.cjs", { cwd: root, stdio: "inherit" });
}

function run() {
  buildSeoPartials();
  const shellPath = indexPath;
  if (!fs.existsSync(shellPath)) {
    console.error("Нет", shellPath, "— сначала: node scripts/bootstrap-seo-page-shell.cjs");
    process.exit(1);
  }
  const { path: layoutPath, label } = resolveLayoutPath(a);
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    console.error("Нет дампа: node scripts/capture-prod-seo-full-html.cjs");
    process.exit(1);
  }
  if (!fs.existsSync(manifestPath)) {
    console.error("Нет", manifestPath);
    process.exit(1);
  }

  console.log("assemble-seo: layout =", label);
  const layout = fs.readFileSync(layoutPath, "utf8");
  let iPc = layout.indexOf('<div class="page-constructor">');
  if (iPc < 0) iPc = layout.indexOf('<motion.div class="page-constructor">');
  const iFm = layout.indexOf('<footer class="footer-modern"');
  if (iPc < 0 || iFm < 0 || iFm <= iPc) {
    console.error("Границы среза page-constructor / footer-modern");
    process.exit(1);
  }

  let main = rewriteSeoSlice(layout.slice(iPc, iFm));
  main = ensureSeoPageShell(main);
  main = repairNumberedHeaderExtraCloses(main);
  main = repairContentBlockMotionDivTags(main);
  const { html: stripped, removed } = stripContentBlockSliders(main);
  main = stripped;
  if (removed) console.log("assemble-seo: stripContentBlockSliders:", removed);
  main = tagSeoSynergyToolsSection(main);

  main = main.replace(/\s*swiper-container-initialized/g, "");
  main = main.replace(/\s*swiper-container-horizontal/g, "");
  main = main.replace(/\s*swiper-container-free-mode/g, "");
  main = main.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  main = main.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
  main = main.replace(
    /(<div[^>]*class="swiper-wrapper cases-block__swiper-wrapper[^"]*)" style="height:\s*\d+px;[^"]*"/g,
    "$1",
  );
  main = main.replace(
    /(<div[^>]*class="swiper-slide cases-block__swiper-slide[^"]*)" style="width:\s*\d+px;[^"]*"/g,
    "$1",
  );
  /* Prod/SSR: оборванные кавычки у class ломают cases-block (слайды не попадают в DOM). */
  main = main.replace(/(class="[^"]*?)><div/g, '$1"><div');
  main = main.replace(/(swiper-slide-active)>(?=<)/g, '$1">');

  main = removeProdTeamSection(main);
  main = swapSeoInlineIripaToAwm(main);
  main = injectSeoServiceInlineLead(main);
  main = injectSeoTeamAfterLead(main);
  main = stripProdTailAfterTeam(main);
  main = injectSeoTailAfterTeam(main);
  main = ensureSeoOuterClosesAfterTeam(main);
  main = repairSeoMainStrayCloses(main);
  main = ensureSeoMainTagBalance(main);
  main = patchSeoHeroSubtitle(main);
  main = patchSeoInternalLinks(main);

  const index = fs.readFileSync(shellPath, "utf8");
  const v = "20260523korporativnyjBundle1";
  const cssBlock = [
    `    <!-- ${a.markers.cssBundleStart}: Nuxt scoped bundle + static stack (как kompleksnoye) -->`,
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424" />',
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260615blogCardBlurFix" />',
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260516kontekstTeamDesktopRestore" />',
    buildCssLinks(manifestPath, v),
    deferNonBlockingCss("/_sa/css/sections/service-faq.css?v=20260523korporativnyjSynergyNavFix"),
    deferNonBlockingCss("/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell"),
    deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
    deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260517morCasesTablet" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/service-inline-lead-form.css?v=20260601inlineLeadThankYou" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
    '    <link rel="stylesheet" href="/_sa/css/seo-static-stack.css?v=20260622seoTz1" />',
    `    <!-- ${a.markers.cssBundleEnd} -->`,
  ].join("\n");

  const cssStart = index.indexOf(CSS_START);
  const cssEnd = index.indexOf(CSS_END);
  if (cssStart < 0 || cssEnd < 0) {
    console.error("Нет маркеров CSS bundle в shell");
    process.exit(1);
  }
  const cssEndLine = cssEnd + CSS_END.length;
  let out = index.slice(0, cssStart) + cssBlock + index.slice(cssEndLine);

  const iStart = out.indexOf(MAIN_START);
  const iEnd = out.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0) {
    console.error("Нет маркеров SEO-MAIN");
    process.exit(1);
  }
  out = `${out.slice(0, iStart + MAIN_START.length)}\n${main}\n${out.slice(iEnd)}`;
  out = applySeoHeadMeta(out);
  out = ensureBurgerMenuGlavnaya(out);
  out = ensureSeoHeroPreload(out);
  out = ensureSeoScripts(out);

  const typo = processTypographyHtml(out, { force: true });
  out = typo.html.replace(/\n+$/, "\n");
  out = patchSeoFactsTitleLineBreak(out);
  out = patchServiceBreadcrumbForSlug(out, "seo");
  fs.writeFileSync(shellPath, out, "utf8");
  console.log("assemble-seo-from-prod-layout: ok, main bytes", main.length);
}

if (require.main === module) {
  run();
}

module.exports = { run };
