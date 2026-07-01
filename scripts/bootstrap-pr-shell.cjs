#!/usr/bin/env node
/**
 * Каркас pr/index.html из prodvizhenie-yandex-karty-2gis (image hero, без #__nuxt).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "pr";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "prodvizhenie-yandex-karty-2gis", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const heroBase = `/_sa/img/services/${slug}/hero`;
const heroDeskUrl = `${heroBase}/hero.webp`;
const heroMobUrl = `${heroBase}/hero__m.webp`;
const cssVersion = "20260701prAdvantagesLeadGap1";
const legacy = JSON.parse(
  fs.readFileSync(path.join(root, "json", "services", "pr", "legacy-content.json"), "utf8"),
);
const heroData = legacy.content.find((b) => b.component === "title-block").data;

function readPartial(name) {
  return fs.readFileSync(path.join(root, "html", "partials", "services", name), "utf8").trim();
}

function buildHero() {
  const title = heroData.title;
  const subtitle = String(heroData.subtitle || "").trim();
  return `<section class="page-constructor__section"><div class="c-title-block modern" data-v-04503aeb=""><div data-v-04503aeb=""><div class="header-full header-background desctop" style="background-image: url(&quot;${heroDeskUrl}&quot;);"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title jumbotron-img-aurora__title-small">${title}</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${subtitle}</h4></div></div> <div class="header-full header-background mobile" style="background-image:url(${heroMobUrl});"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">${title}</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">${subtitle}</h4></div></div></div></div></section>`;
}

function buildMain() {
  return [
    `<div class="page-constructor pr-page prodvizhenie-yandex-karty-2gis-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    buildHero(),
    readPartial("pr-mission-facts-block.html"),
    readPartial("pr-approach-block.html"),
    readPartial("pr-cases-slider-1.html"),
    readPartial("pr-stages-block.html"),
    readPartial("pr-strategy-development-block.html"),
    readPartial("pr-strategy-implementation-block.html"),
    readPartial("pr-cases-slider-2.html"),
    readPartial("pr-when-necessary-block.html"),
    readPartial("pr-advantages-block.html"),
    readPartial(cfg.assemble.partials.inlineLead),
    readPartial(cfg.assemble.partials.team),
    readPartial(cfg.assemble.partials.clients),
    readPartial(cfg.assemble.partials.faq),
    readPartial(cfg.assemble.partials.blog),
    readPartial(cfg.assemble.partials.moreCases),
    readPartial(cfg.assemble.partials.awards),
    readPartial(cfg.assemble.partials.synergy),
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
  const altStart = "<!-- YMAPS-MAIN-START -->";
  const altEnd = "<!-- YMAPS-MAIN-END -->";

  html = html.replace(/prodvizhenie-yandex-karty-2gis-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cssVersion}`);
  html = html.replace(/pr-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cssVersion}`);
  if (!html.includes(a.cssStack)) {
    html = html.replace(
      /(<link rel="stylesheet" href="\/_sa\/css\/prodvizhenie-yandex-karty-2gis-static-stack\.css\?v=[^"]+" \/>)/,
      `$1\n    <link rel="stylesheet" href="/_sa/css/${a.cssStack}?v=${cssVersion}" />`,
    );
  }
  html = html.replace(/prodvizhenie-yandex-karty-2gis-page/g, "pr-page prodvizhenie-yandex-karty-2gis-page");
  html = html.replace(/prodvizhenie-yandex-karty-2gis/g, slug);
  html = html.replace(/YMAPS/g, "PR");

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
    `<meta property="og:image" content="https://serenity.agency${heroDeskUrl}"`,
  );
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"/,
    `<meta name="twitter:image" content="https://serenity.agency${heroDeskUrl}"`,
  );
  html = html.replace(
    /"name":"[^"]*","item":"https:\/\/serenity\.agency\/pr"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(
    /"name":"Продвижение в Яндекс Картах и 2ГИС","item":"https:\/\/serenity\.agency\/prodvizhenie-yandex-karty-2gis"/,
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
  if (i0 >= 0 && i1 >= 0) {
    html = html.slice(0, i0 + mainStart.length) + "\n" + buildMain() + "\n" + html.slice(i1);
  } else {
    const j0 = html.indexOf(altStart);
    const j1 = html.indexOf(altEnd);
    if (j0 < 0 || j1 < 0) throw new Error("Нет PR / YMAPS MAIN маркеров");
    html = html.slice(0, j0) + mainStart + "\n" + buildMain() + "\n" + mainEnd + html.slice(j1 + altEnd.length);
  }

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");

  if (!html.includes("leave-request-cta.js")) {
    html = html.replace(
      '<script defer src="/_sa/js/service-team-slider.js',
      '<script defer src="/_sa/js/leave-request-cta.js?v=20260602inlineLeadThankYouMsgCenter"></script>\n    <script defer src="/_sa/js/service-team-slider.js',
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-pr-shell: ok →", path.relative(root, outPath));
}

main();
