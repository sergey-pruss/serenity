#!/usr/bin/env node
/**
 * Сборка services/marketing/index.html из prod capture + partials (кейсы/награды с главной, форма).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { stripNuxtScopedMarkup } = require("./strip-nuxt-scoped-markup.cjs");
const { sanitizeMoreCasesCapture } = require("./sanitize-more-cases-capture.cjs");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "marketing-prod-full.html");
const indexPath = path.join(root, "services", "marketing", "index.html");
const manifestPath = path.join(root, "services", "marketing", "nuxt-css-manifest.json");
const kontekstManifestPath = path.join(root, "kontekstnaya_reklama", "nuxt-css-manifest.json");
const imageMapPath = path.join(root, "json", "services", "marketing", "image-map.json");

const MAIN_START = "<!-- MARKETING-MAIN-START -->";
const MAIN_END = "<!-- MARKETING-MAIN-END -->";
const CSS_START = "<!-- MARKETING-CSS-BUNDLE-START";
const CSS_END = "<!-- MARKETING-CSS-BUNDLE-END -->";

/** SEO из https://serenity.agency/services/marketing (Nuxt prod). */
const MARKETING_META = {
  title: "Комплексный маркетинг в Москве и Петербурге для бизнеса — Услуги — Serenity",
  description:
    "Заказать услуги комплексного маркетинга в СПБ и Москве, профессиональный веб и digital маркетинг. Уточнить стоимость и ознакомиться с кейсами на сайте агентства Serenity.",
  ogTitle: "Комплексный маркетинг",
  ogDescription:
    "Синергия маркетинговых инструментов многократно увеличивает их эффективность для бизнеса.<br /> ",
  ogImage: "https://serenity.agency/admin/wp-content/uploads/2018/10/10-1.jpg",
};

const HREF_CANON = [
  ["/services/content-strategy", "/content-strategy"],
  ["/services/context", "/kontekstnaya_reklama"],
  ["/services/targeting", "/targeting"],
  ["https://serenity.agency/services/content-strategy", "/content-strategy"],
  ["https://serenity.agency/services/context", "/kontekstnaya_reklama"],
  ["https://serenity.agency/services/targeting", "/targeting"],
];

const SECTION_H2_LINKS = [
  { title: "Cтратегия", href: "/services#services-strategy" },
  { title: "Бренд", href: "/services#services-branding" },
  { title: "Измеримое продвижение", href: "/services#services-promotion" },
  { title: "Сайт", href: "/services#services-sites", tag: "h3" },
];

function readPartial(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.warn("assemble-marketing: нет partial", p);
    return null;
  }
  return stripNuxtScopedMarkup(fs.readFileSync(p, "utf8").trim());
}

/** Кейсы/награды: data-v-* нужны для CSS бандла (stripNuxtScopedMarkup их снимает). */
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

function readImageMap() {
  if (!fs.existsSync(imageMapPath)) return {};
  return JSON.parse(fs.readFileSync(imageMapPath, "utf8"));
}

function rewriteProdSlice(html) {
  let s = html;
  const map = readImageMap();
  for (const [from, to] of Object.entries(map)) {
    s = s.split(from).join(to);
  }
  for (const [from, to] of HREF_CANON) {
    s = s.split(`href="${from}"`).join(`href="${to}"`);
  }
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/https:\/\/serenity\.agency\/admin\//g, "/admin/");
  s = s.replace(/background-image:url\(https:\/\/serenity\.agency/g, "background-image:url(");
  s = s.replace(/src="\/img\//g, 'src="/_sa/img/services/marketing/cm/');
  /* уже замапленные пути не трогаем повторно */
  return s;
}

function expandShowMore(html) {
  let s = html;
  s = s.replace(/<p class="show-more"[^>]*>Подробнее<\/p>\s*/gi, "");
  s = s.replace(/\sclass="([^"]*)\bhide\b([^"]*)"/gi, (m, a, b) => {
    const cls = `${a}${b}`.replace(/\s+/g, " ").trim();
    return cls ? ` class="${cls}"` : "";
  });
  s = s.replace(/\sclass="hide"/gi, "");
  return s;
}

function wrapSectionTitles(html) {
  let s = html;
  for (const { title, href, tag = "h2" } of SECTION_H2_LINKS) {
    const re = new RegExp(
      `<${tag}([^>]*class="[^"]*title[^"]*"[^>]*)>${title}</${tag}>`,
      "i",
    );
    s = s.replace(
      re,
      `<${tag}$1><a class="marketing-section__link" href="${href}">${title}</a></${tag}>`,
    );
  }
  return s;
}

function stripMainCases(html) {
  const start = html.indexOf("main-cases__inner");
  if (start < 0) return html;
  const secStart = html.lastIndexOf("<section", start);
  const secEnd = html.indexOf("</section>", start);
  if (secStart < 0 || secEnd < 0) return html;
  return html.slice(0, secStart) + html.slice(secEnd + "</section>".length);
}

function extractTeamBlock(html) {
  const teamIdx = html.indexOf('">Команда</h2>');
  if (teamIdx < 0) return "";
  const secStart = html.lastIndexOf("<section", teamIdx);
  const awardsIdx = html.indexOf("serenity-awards", teamIdx);
  const endNeedle = awardsIdx > teamIdx ? awardsIdx : html.indexOf("footer-modern", teamIdx);
  const secEnd = html.lastIndexOf("</section>", endNeedle > 0 ? endNeedle : html.length);
  if (secStart < 0 || secEnd <= secStart) return "";
  return html.slice(secStart, secEnd + "</section>".length);
}

function stripPriceAndAwards(html) {
  let s = html;
  const priceIdx = s.indexOf("Стоимость ведения комплексного маркетинга");
  if (priceIdx >= 0) {
    const secStart = s.lastIndexOf("<section", priceIdx);
    const teamIdx = s.indexOf('">Команда</h2>', priceIdx);
    const end = teamIdx > priceIdx ? teamIdx : s.indexOf("serenity-awards", priceIdx);
    const secEnd = s.lastIndexOf("</section>", end > 0 ? end : s.length);
    if (secStart >= 0 && secEnd > secStart) {
      s = s.slice(0, secStart) + s.slice(secEnd + "</section>".length);
    }
  }
  const awardsIdx = s.indexOf("serenity-awards");
  if (awardsIdx >= 0) {
    const secStart = s.lastIndexOf("<section", awardsIdx);
    const footerIdx = s.indexOf("footer-modern", awardsIdx);
    const secEnd = s.lastIndexOf("</section>", footerIdx > 0 ? footerIdx : s.length);
    if (secStart >= 0 && secEnd > secStart) {
      s = s.slice(0, secStart) + s.slice(secEnd + "</section>".length);
    }
  }
  return s;
}

function extractMarketingMain(layout) {
  const bh = layout.indexOf("blog-header__title");
  if (bh < 0) throw new Error("blog-header не найден в capture");
  const start = layout.lastIndexOf("<section", bh);
  const end = layout.indexOf("main-cases__inner");
  if (start < 0 || end < 0) throw new Error("границы main (blog-header → main-cases)");
  return layout.slice(start, end);
}

/** Как rewriteProdSlice / targeting: относительные пути для локалки и статики. */
function rewriteMarketingCasesHrefs(html) {
  let s = html;
  for (const [from, to] of HREF_CANON) {
    s = s.split(`href="${from}"`).join(`href="${to}"`);
  }
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  return s;
}

function prepareMarketingCasesBlock() {
  let cases = readPartialKeepScoped("html/partials/section-home-cases.html");
  if (!cases) return "";
  cases = sanitizeMoreCasesCapture(cases);
  cases = rewriteMarketingCasesHrefs(cases);
  cases = cases.replace(
    /\s*<div class="cases-block__header home-ledge" data-v-27a87df0="">[\s\S]*?<\/div>\s*/i,
    "\n",
  );
  cases = cases.replace(/\s*style="z-index:\s*10"/gi, "");
  cases = cases.replace(/^<div data-v-6f8a040c="">\s*/m, "");
  cases = cases.replace(/\s*<\/motion.div>\s*$/m, "");
  if (!cases.includes("more-case-wr__slider-heading")) {
    cases = cases.replace(
      /(<div data-v-27a87df0="" class="page__container">)/,
      `$1
                  <h3 data-v-56f85d51="" class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3>`,
    );
  }
  if (!cases.startsWith("<section")) {
    cases = `<section class="page-constructor__section marketing-cases-section">\n${cases}\n</section>`;
  }
  return cases;
}

/** Награды с главной: полный DOM (не template — mountHomeAwardsTemplate только на sa-home-page). */
function buildMarketingAwardsBlock() {
  const shellPath = path.join(root, "html/partials/services/_service-awards.shell.html");
  const slides = readPartialKeepScoped("html/partials/section-home-awards-slides.html");
  if (!fs.existsSync(shellPath) || !slides) return "";
  let shell = fs.readFileSync(shellPath, "utf8");
  const slidesHtml = slides
    .replace(/\s*swiper-container-initialized/g, "")
    .replace(/\s*swiper-container-horizontal/g, "")
    .replace(/\s*swiper-container-free-mode/g, "")
    .replace(/<span class="swiper-notification"[^>]*><\/span>/g, "")
    .trim();
  shell = shell
    .replace("__HEADING_ID__", "marketing-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml);
  return `<!-- Награды marketing: слайды с главной (section-home-awards-slides) + home-awards.css -->\n${shell.trim()}`;
}

function deferNonBlockingCss(href) {
  return [
    `    <link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'" />`,
    `    <noscript><link rel="stylesheet" href="${href}" /></noscript>`,
  ].join("\n");
}

const MARKETING_HERO_IMG_DEFAULT = "/_sa/img/services/marketing/hero/10-1-1600x900.jpg";

function extractHeroImageUrl(layout) {
  const m = layout.match(/class="blog-header__bg"[^>]*style="[^"]*background-image:\s*url\(([^)]+)\)/i);
  if (!m) return "";
  return m[1].replace(/&quot;/g, "").replace(/^["']|["']$/g, "").trim();
}

function heroImageSaPath(layout) {
  const prodUrl = extractHeroImageUrl(layout);
  if (!prodUrl) return MARKETING_HERO_IMG_DEFAULT;
  const mapPath = path.join(root, "json", "services", "marketing", "image-map.json");
  if (fs.existsSync(mapPath)) {
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    if (map[prodUrl]) return map[prodUrl];
  }
  const base = path.basename(new URL(prodUrl).pathname);
  return `/_sa/img/services/marketing/hero/${base}`;
}

function buildMarketingHero(subtitle) {
  const sub = subtitle || "";
  return `<section class="page-constructor__section marketing-hero-section"><div class="c-title-block modern">
    <div>
      <div class="header-full header-background desctop"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title jumbotron-img-aurora__title-small">Комплексный маркетинг</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${sub}</h4></div></div>
      <div class="header-full header-background mobile"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">Комплексный маркетинг</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${sub}</h4></div></div>
    </div>
  </div>
</section>`;
}
function replaceBlogHeaderWithHero(main, heroSection) {
  const start = main.search(/<section[^>]*class="[^"]*blog-header/);
  if (start < 0) return `${heroSection}\n${main}`;
  const end = main.indexOf("</section>", start);
  if (end < 0) return `${heroSection}\n${main}`;
  return `${heroSection}\n${main.slice(end + "</section>".length)}`;
}

function extractHeroSubtitle(layout) {
  const m = layout.match(/class="blog-header__descr"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return "";
  return m[1].replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
}

function buildCssBlock(v) {
  const kMan = JSON.parse(fs.readFileSync(kontekstManifestPath, "utf8"));
  const kHrefs = kMan.hrefs || kMan;
  const kontekstNuxt = kHrefs
    .map((h) => `    <link rel="stylesheet" href="${h}?v=${v}" />`)
    .join("\n");
  return [
    "    <!-- MARKETING-CSS-BUNDLE-START: Nuxt kontekst parity (как targeting) -->",
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424" />',
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260518serviceMoreCasesHeading" />',
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260516kontekstTeamDesktopRestore" />',
    kontekstNuxt,
    deferNonBlockingCss("/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell"),
    '    <link rel="stylesheet" href="/_sa/css/marketing-static-stack.css?v=20260520marketingParity45" />',
    deferNonBlockingCss("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css"),
    deferNonBlockingCss("/_sa/css/css__home-snapshot__slider-arrows.css?v=20260515asyncCssSwiper"),
    '    <link rel="stylesheet" href="/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260517morCasesTablet" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/footer-burger-chrome.css?v=20260516footerSocialIconsGridAlign" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/service-inline-lead-form.css?v=20260516leadFormFieldsVisible" />',
    '    <link rel="stylesheet" href="/_sa/css/sections/header.css?v=20260517desktopNavLogoAlign" />',
    "    <!-- MARKETING-CSS-BUNDLE-END -->",
    deferNonBlockingCss("/_sa/css/sections/lead-form.css?v=20260516leadFormFieldsVisible"),
  ].join("\n");
}

function ensureShell() {
  if (fs.existsSync(indexPath)) return;
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  const tpl = fs.readFileSync(path.join(root, "targeting", "index.html"), "utf8");
  let shell = tpl
    .replace(/TARGETING/g, "MARKETING")
    .replace(/targeting-nuxt/g, "marketing-nuxt")
    .replace(/targeting-static-stack/g, "marketing-static-stack")
    .replace(/targeting-page/g, "marketing-page")
    .replace(/targeting-faq/g, "marketing-faq")
    .replace(/targeting-awards/g, "marketing-awards")
    .replace(/Таргетированная реклама/g, "Комплексный маркетинг")
    .replace(/<title>[^<]*<\/title>/, `<title>${MARKETING_META.title}</title>`)
    .replace(
      /content="Услуги по таргетированной[^"]*"/g,
      `content="${MARKETING_META.description}"`,
    )
    .replace(/https:\/\/serenity\.agency\/targeting/g, "https://serenity.agency/services/marketing")
    .replace(/\s*<meta property="og:lowPrice"[^>]*>\s*/g, "\n");
  shell = shell.replace(
    /<!-- MARKETING-MAIN-START -->[\s\S]*<!-- MARKETING-MAIN-END -->/,
    `${MAIN_START}\n<div class="page-constructor marketing-page"><p>Placeholder</p></div>\n${MAIN_END}`,
  );
  fs.writeFileSync(indexPath, shell, "utf8");
  console.log("assemble-marketing: создан shell", indexPath);
}

function patchMarketingSeoMeta(html) {
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
  return s;
}

function patchServicesAnchors() {
  const p = path.join(root, "services", "index.html");
  let h = fs.readFileSync(p, "utf8");
  const pairs = [
    ['id="" class="services__title">Стратегия', 'id="services-strategy" class="services__title">Стратегия'],
    ['id="" class="services__title">Продвижение', 'id="services-promotion" class="services__title">Продвижение'],
    ['id="" class="services__title">Брендинг', 'id="services-branding" class="services__title">Брендинг'],
    ['id="" class="services__title">Сайты', 'id="services-sites" class="services__title">Сайты'],
  ];
  let changed = false;
  for (const [from, to] of pairs) {
    if (h.includes(from)) {
      h = h.replace(from, to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, h, "utf8");
    console.log("assemble-marketing: якоря на /services");
  }
}

function run() {
  if (process.env.SKIP_SERVICE_PARTIALS_BUILD !== "1") {
    execSync("node scripts/build-service-inline-lead-partials.cjs", { cwd: root, stdio: "inherit" });
    execSync("node scripts/build-marketing-kontekst-sections.cjs", { cwd: root, stdio: "inherit" });
  }
  if (!fs.existsSync(fullHtmlPath)) {
    console.error("Нет", fullHtmlPath, "— capture-prod-marketing-full-html.cjs");
    process.exit(1);
  }
  if (!fs.existsSync(kontekstManifestPath)) {
    console.error("Нет", kontekstManifestPath);
    process.exit(1);
  }
  ensureShell();

  const layout = fs.readFileSync(fullHtmlPath, "utf8");
  const hero = buildMarketingHero(extractHeroSubtitle(layout));

  const kontekstSections =
    readPartial("html/partials/services/marketing-kontekst-sections.html") || "";
  if (!kontekstSections) {
    console.error("Нет marketing-kontekst-sections.html — build-marketing-kontekst-sections.cjs");
    process.exit(1);
  }

  const inlineLead = readPartial("html/partials/services/service-inline-lead-marketing.html");
  const casesBlock = prepareMarketingCasesBlock();
  const awardsBlock = buildMarketingAwardsBlock();

  const parts = [
    `<div class="page-constructor marketing-page">`,
    hero,
    kontekstSections,
    inlineLead || "",
    `</div>`,
    casesBlock,
    awardsBlock,
  ];
  let assembled = parts.filter(Boolean).join("\n");
  assembled = assembled.replace(/\s*swiper-container-initialized/g, "");
  assembled = assembled.replace(/\s*swiper-container-horizontal/g, "");
  assembled = assembled.replace(/\s*swiper-container-free-mode/g, "");
  assembled = assembled.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");

  const v = "20260520marketingParity45";
  let index = fs.readFileSync(indexPath, "utf8");
  const cssStart = index.indexOf(CSS_START);
  const cssEnd = index.indexOf(CSS_END);
  if (cssStart < 0 || cssEnd < 0) {
    console.error("Нет маркеров CSS bundle");
    process.exit(1);
  }
  const cssEndLine = index.indexOf("\n", cssEnd);
  const cssSliceFrom = cssEndLine >= 0 ? cssEndLine + 1 : cssEnd + CSS_END.length;
  index = index.slice(0, cssStart) + buildCssBlock(v) + index.slice(cssSliceFrom);

  const iStart = index.indexOf(MAIN_START);
  const iEnd = index.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0) {
    console.error("Нет маркеров MAIN");
    process.exit(1);
  }
  let out = `${index.slice(0, iStart + MAIN_START.length)}\n${assembled}\n${index.slice(iEnd)}`;

  /* Как /targeting: без home-cases-auto — fetch пересобирает слайдер и ломает Swiper (тексты кейсов в hero). */
  out = out.replace(/\s*<script defer src="\/_sa\/js\/home-cases-auto\.js[^"]*"[^>]*><\/script>\n?/g, "\n");
  /* Prod marketing: без gradient-canvas и page-constructor-gradient.js */
  out = out.replace(
    /\s*<script defer src="\/_sa\/js\/gradient-animation\.min\.js[^"]*"[^>]*><\/script>\n?/g,
    "\n",
  );
  out = out.replace(
    /\s*<script defer src="\/_sa\/js\/page-constructor-gradient\.js[^"]*"[^>]*><\/script>\n?/g,
    "\n",
  );

  out = out.replace(
    /<link rel="canonical" href="https:\/\/serenity\.agency\/marketing" \/>/,
    '<link rel="canonical" href="https://serenity.agency/services/marketing" />',
  );
  out = out.replace(
    /content="https:\/\/serenity\.agency\/marketing"/g,
    'content="https://serenity.agency/services/marketing"',
  );
  out = out.replace(/<meta <meta /g, "<meta ");
  out = patchMarketingSeoMeta(out);

  const typo = processTypographyHtml(out, { force: true });
  fs.writeFileSync(indexPath, typo.html.replace(/\n+$/, "\n"), "utf8");
  patchServicesAnchors();
  console.log("assemble-marketing-from-prod-layout: ok");
}

if (require.main === module) {
  run();
}

module.exports = { run };
