#!/usr/bin/env node
/**
 * Каркас prodvizhenie-statey-v-dzene-i-promostranitsah/index.html из kompleksnoye-prodvizheniye (без #__nuxt).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "prodvizhenie-statey-v-dzene-i-promostranitsah";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "kompleksnoye-prodvizheniye", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const heroBase = `/_sa/img/services/${slug}/hero`;
const heroDeskUrl = `${heroBase}/hero.webp`;
const heroMobUrl = `${heroBase}/hero__m.webp`;
const CSS_V = "20260610dzenBlogSpacing";

function readDzenTailBlocks() {
  return [
    readPartial("service-inline-lead-prodvizhenie-statey-v-dzene-i-promostranitsah-inline.html"),
    readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-team-block.html"),
    readPartial("faq-prodvizhenie-statey-v-dzene-i-promostranitsah.html"),
    readPartial("blog-kontekstnaya-reklama.html"),
    readPartial("clients-kontekstnaya-reklama.html"),
    readPartial("more-cases-kontekstnaya-from-services.html"),
    readPartial("awards-kontekstnaya-reklama.html"),
  ];
}

function readPartial(name) {
  const p = path.join(root, "html", "partials", "services", name);
  return fs.readFileSync(p, "utf8").trim();
}

function buildHeroClean() {
  const title = "Продвижение статей в&nbsp;Дзен и&nbsp;на&nbsp;ПромоСтраницах";
  const subtitle =
    "Расскажем о&nbsp;вашем бизнесе через статьи, которые читают тысячи людей в&nbsp;нужных вам городах.";
  return `<section class="page-constructor__section"><div class="c-title-block modern" data-v-04503aeb=""><div data-v-04503aeb=""><div class="header-full header-background desctop" style="background-image: url(&quot;${heroDeskUrl}&quot;);"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">${title}</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${subtitle}</h4></div></div> <div class="header-full header-background mobile" style="background-image:url(${heroMobUrl});"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">${title}</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${subtitle}</h4></div></div></div></div></section>`;
}

function buildMain() {
  const intro = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-intro-block.html");
  const advantages = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-advantages-block.html");
  const dzenUi = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-dzen-ui-block.html");
  const audience = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-audience-block.html");
  const cases = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-cases-block.html");
  const notFit = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-not-fit-block.html");
  const strategy = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-strategy-block.html");
  const contentCreation = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-content-creation-block.html");
  const contentPreview = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-content-preview-block.html");
  const contentPromotion = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-content-promotion-block.html");
  const adInterface = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-ad-interface-block.html");
  const engagementFunnel = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-engagement-funnel-block.html");
  const engagementFunnelPreview = readPartial(
    "prodvizhenie-statey-v-dzene-i-promostranitsah-engagement-funnel-preview-block.html",
  );
  const results = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-results-block.html");
  const nextCases = readPartial("prodvizhenie-statey-v-dzene-i-promostranitsah-next-cases-block.html");
  const ogDesc = cfg.seo.ogDescription || cfg.seo.description;

  return [
    `<div class="page-constructor prodvizhenie-statey-v-dzene-i-promostranitsah-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    buildHeroClean(),
    intro,
    advantages,
    dzenUi,
    audience,
    cases,
    notFit,
    strategy,
    contentCreation,
    contentPreview,
    contentPromotion,
    adInterface,
    engagementFunnel,
    engagementFunnelPreview,
    results,
    nextCases,
    ...readDzenTailBlocks(),
    `</div>`,
    `<div itemscope="itemscope" itemtype="http://schema.org/Product" style="display: none;"><span itemprop="brand">Serenity</span> <span itemprop="name">${cfg.seo.breadcrumbLabel}</span> <link itemprop="image" href="https://serenity.agency${heroBase}/hero.webp" /> <span itemprop="description">${ogDesc}</span></div>`,
  ].join("\n");
}

function main() {
  let html = fs.readFileSync(srcPath, "utf8");
  const a = cfg.assemble;
  const mainStart = `<!-- ${a.markers.mainStart} -->`;
  const mainEnd = `<!-- ${a.markers.mainEnd} -->`;
  const cssStartMarker = a.markers.cssBundleStart;
  const cssEnd = `<!-- ${a.markers.cssBundleEnd} -->`;

  html = html.replace(/kompleksnoye-prodvizheniye-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${CSS_V}`);
  html = html.replace(/kompleksnoye-prodvizheniye-page/g, "prodvizhenie-statey-v-dzene-i-promostranitsah-page");
  html = html.replace(/kompleksnoye-prodvizheniye/g, slug);
  html = html.replace(/KORPORATIVNYJ/g, "DZEN");

  const ogDesc = cfg.seo.ogDescription || cfg.seo.description;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${cfg.seo.pageTitle}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="title" content="[^"]*"/, `<meta name="title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${cfg.seo.pageTitle}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${ogDesc}"`);
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${cfg.seo.pageTitle}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${ogDesc}"`);
  html = html.replace(
    /<meta property="og:image" content="[^"]*"/,
    `<meta property="og:image" content="https://serenity.agency${heroBase}/hero.webp"`,
  );
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"/,
    `<meta name="twitter:image" content="https://serenity.agency${heroBase}/hero.webp"`,
  );
  html = html.replace(/\s*<meta property="og:lowPrice" content="[^"]*"\s*\/?>/, "");
  html = html.replace(
    /"name":"Комплексное продвижение","item":"https:\/\/serenity\.agency\/prodvizhenie-statey-v-dzene-i-promostranitsah"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );

  const preload = `    <link rel="preload" as="image" href="${heroDeskUrl}" fetchpriority="high" />\n`;
  if (!html.includes(`href="${heroDeskUrl}"`)) {
    const anchor = '<link rel="preload" as="font" type="font/woff" href="/_sa/img/HeroNew-Medium.woff"';
    html = html.replace(anchor, preload + anchor);
  }

  if (html.includes(cssStartMarker)) {
    html = html.replace(
      new RegExp(`<!-- ${cssStartMarker}[^\\n]*\\n`),
      `<!-- ${cssStartMarker}: static stack (без Nuxt runtime) -->\n`,
    );
  }

  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) throw new Error("Нет DZEN-MAIN маркеров");
  html = html.slice(0, i0 + mainStart.length) + "\n" + buildMain() + "\n" + html.slice(i1);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-prodvizhenie-statey-v-dzene-i-promostranitsah-shell: ok →", path.relative(root, outPath));
}

main();
