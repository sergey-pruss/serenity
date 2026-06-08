#!/usr/bin/env node
/**
 * Каркас prodvizhenie-yandex-karty-2gis/index.html из kompleksnoye-prodvizheniye (без #__nuxt).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "prodvizhenie-yandex-karty-2gis";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "kompleksnoye-prodvizheniye", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const heroBase = `/_sa/img/services/${slug}/hero`;

function readPartial(name) {
  const p = path.join(root, "html", "partials", "services", name);
  return fs.readFileSync(p, "utf8").trim();
}

/** Хвост страницы — контент как на /kontekstnaya_reklama (static partials, без Nuxt). */
function readKontekstTailBlocks() {
  const kontekstHtml = fs.readFileSync(path.join(root, "kontekstnaya_reklama", "index.html"), "utf8");
  const teamStart = '<section class="page-constructor__section"><div class="team-block">';
  const t0 = kontekstHtml.indexOf(teamStart);
  const t1 = kontekstHtml.indexOf("<!-- FAQ «Вопрос-ответ»", t0);
  if (t0 < 0 || t1 < 0) {
    throw new Error("Не найден team-block в kontekstnaya_reklama/index.html");
  }
  const team = kontekstHtml.slice(t0, t1).trim();

  return [
    readPartial("service-inline-lead-prodvizhenie-yandex-karty-2gis-inline.html"),
    team,
    readPartial("faq-prodvizhenie-yandex-karty-2gis.html"),
    readPartial("blog-kontekstnaya-reklama.html"),
    readPartial("clients-kontekstnaya-reklama.html"),
    readPartial("more-cases-kontekstnaya-from-services.html"),
    readPartial("awards-kontekstnaya-reklama.html"),
    readPartial("synergy-kontekstnaya-reklama.html"),
  ];
}

const YMAPS_CASES_SLIDER_SLOT = "<!-- YMAPS-CASES-SLIDER -->";
const YMAPS_CASES_SLIDER_2_SLOT = "<!-- YMAPS-CASES-SLIDER-2 -->";

function injectCasesSliders(contentBlocksHtml) {
  const casesSlider = readPartial("prodvizhenie-yandex-karty-2gis-cases-slider.html");
  const casesSlider2 = readPartial("prodvizhenie-yandex-karty-2gis-cases-slider-2.html");
  if (!contentBlocksHtml.includes(YMAPS_CASES_SLIDER_SLOT)) {
    throw new Error(`Нет маркера ${YMAPS_CASES_SLIDER_SLOT} в prodvizhenie-yandex-karty-2gis-content-blocks.html`);
  }
  if (!contentBlocksHtml.includes(YMAPS_CASES_SLIDER_2_SLOT)) {
    throw new Error(`Нет маркера ${YMAPS_CASES_SLIDER_2_SLOT} в prodvizhenie-yandex-karty-2gis-content-blocks.html`);
  }
  return contentBlocksHtml
    .replace(YMAPS_CASES_SLIDER_SLOT, casesSlider)
    .replace(YMAPS_CASES_SLIDER_2_SLOT, casesSlider2);
}

function buildMain() {
  const factsCard = readPartial("prodvizhenie-yandex-karty-2gis-facts-card-block.html");
  const contentBlocks = injectCasesSliders(readPartial("prodvizhenie-yandex-karty-2gis-content-blocks.html"));
  const pricingTables = readPartial("prodvizhenie-yandex-karty-2gis-pricing-tables.html");
  const costFactors = readPartial("prodvizhenie-yandex-karty-2gis-cost-factors-block.html");
  const hero = `<section class="page-constructor__section"><div class="c-title-block modern" data-v-04503aeb=""><div data-v-04503aeb=""><div class="header-full header-background desctop" style="background-image: url(&quot;${heroBase}/hero.webp&quot;);"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title jumbotron-img-aurora__title-small">Продвижение в&nbsp;Яндекс Картах и&nbsp;2ГИС</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">Настраиваем георекламу и&nbsp;продвижение карточек, чтобы клиенты чаще находили вас в&nbsp;Яндекс Картах и&nbsp;2ГИС.</h4></div></div> <div class="header-full header-background mobile" style="background-image:url(${heroBase}/hero__m.webp);"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">Продвижение в&nbsp;Яндекс Картах и&nbsp;2ГИС</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">Настраиваем георекламу и&nbsp;продвижение карточек, чтобы клиенты чаще находили вас в&nbsp;Яндекс Картах и&nbsp;2ГИС.</h4></div></div></div></div></section>`;

  return [
    `<div class="page-constructor prodvizhenie-yandex-karty-2gis-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    hero,
    factsCard,
    contentBlocks,
    "<!-- YMAPS-CONTENT-BLOCKS-REMAINING: виды (отложено) -->",
    pricingTables,
    costFactors,
    ...readKontekstTailBlocks(),
    `</div>`,
    `<div itemscope="itemscope" itemtype="http://schema.org/Product" style="display: none;"><span itemprop="brand">Serenity</span> <span itemprop="name">${cfg.seo.breadcrumbLabel}</span> <link itemprop="image" href="https://serenity.agency${heroBase}/hero.webp" /> <span itemprop="description">${cfg.seo.description}</span></div>`,
  ].join("\n");
}

function main() {
  let html = fs.readFileSync(srcPath, "utf8");
  const a = cfg.assemble;
  const mainStart = `<!-- ${a.markers.mainStart} -->`;
  const mainEnd = `<!-- ${a.markers.mainEnd} -->`;
  const cssStartMarker = a.markers.cssBundleStart;
  const cssEnd = `<!-- ${a.markers.cssBundleEnd} -->`;

  html = html.replace(/kompleksnoye-prodvizheniye-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=20260608ymapsEkskluziv3`);
  html = html.replace(/kompleksnoye-prodvizheniye-page/g, "prodvizhenie-yandex-karty-2gis-page");
  html = html.replace(/kompleksnoye-prodvizheniye/g, slug);
  html = html.replace(/KORPORATIVNYJ/g, "YMAPS");

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${cfg.seo.pageTitle}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="title" content="[^"]*"/, `<meta name="title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${cfg.seo.description}"`);
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${cfg.seo.description}"`,
  );
  html = html.replace(
    /<meta property="og:image" content="[^"]*"/,
    `<meta property="og:image" content="https://serenity.agency${heroBase}/hero.webp"`,
  );
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"/,
    `<meta name="twitter:image" content="https://serenity.agency${heroBase}/hero.webp"`,
  );
  html = html.replace(
    /"name":"Комплексное продвижение","item":"https:\/\/serenity\.agency\/prodvizhenie-yandex-karty-2gis"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );

  const preload =
    `    <link rel="preload" as="image" href="${heroBase}/hero.webp" fetchpriority="high" />\n`;
  if (!html.includes(`href="${heroBase}/hero.webp"`)) {
    const anchor = '<link rel="preload" as="font" type="font/woff" href="/_sa/img/HeroNew-Medium.woff"';
    html = html.replace(anchor, preload + anchor);
  }

  if (html.includes(cssStartMarker)) {
    html = html.replace(
      new RegExp(`<!-- ${cssStartMarker}[^\\n]*\\n`),
      `<!-- ${cssStartMarker}: Nuxt scoped bundle + static stack (без Nuxt runtime) -->\n`,
    );
  }

  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) throw new Error("Нет YMAPS-MAIN маркеров");
  html = html.slice(0, i0 + mainStart.length) + "\n" + buildMain() + "\n" + html.slice(i1);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-prodvizhenie-yandex-karty-2gis-shell: ok →", path.relative(root, outPath));
}

main();
