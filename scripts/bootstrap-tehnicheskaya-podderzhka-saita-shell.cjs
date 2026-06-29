#!/usr/bin/env node
/**
 * Каркас tehnicheskaya-podderzhka-saita/index.html из kompleksnoye-prodvizheniye (без #__nuxt).
 * Hero + контентные блоки + хвост (форма, команда, клиенты, FAQ, блог, кейсы, награды, синергия).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "tehnicheskaya-podderzhka-saita";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "kompleksnoye-prodvizheniye", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const heroBase = `/_sa/img/services/${slug}/hero`;
const heroDeskUrl = `${heroBase}/hero.webp`;
const heroMobUrl = `${heroBase}/hero__m.webp`;
const cssVersion = "20260629tehpodCrossLinks1";
const faqCssVersion = "20260629tehpodFaqFix2";

function readPartial(name) {
  const p = path.join(root, "html", "partials", "services", name);
  return fs.readFileSync(p, "utf8").trim();
}

function buildMain() {
  const hero = `<section class="page-constructor__section"><div class="c-title-block modern" data-v-04503aeb=""><div data-v-04503aeb=""><div class="header-full header-background desctop" style="background-image: url(&quot;${heroDeskUrl}&quot;);"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title jumbotron-img-aurora__title-small">Техническая поддержка сайта</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">Поддерживаем бесперебойную работу сайта и&nbsp;помогаем ему развиваться: от&nbsp;технических задач и&nbsp;безопасности до&nbsp;UX-улучшений, аналитики и&nbsp;роста конверсии.</h4></div></div> <div class="header-full header-background mobile" style="background-image:url(${heroMobUrl});"><div class="jumbotron"><h1 class="jumbotron-img-aurora__title">Техническая поддержка сайта</h1> <h4 class="jumbotron-img-aurora__subtitle" style="text-align: center;">Поддерживаем бесперебойную работу сайта и&nbsp;помогаем ему развиваться: от&nbsp;технических задач и&nbsp;безопасности до&nbsp;UX-улучшений, аналитики и&nbsp;роста конверсии.</h4></div></div></div></div></section>`;

  return [
    `<div class="page-constructor ${slug}-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    hero,
    readPartial("tehnicheskaya-podderzhka-saita-approach-block.html"),
    readPartial("tehnicheskaya-podderzhka-saita-business-result-block.html"),
    readPartial("tehnicheskaya-podderzhka-saita-cases-slider-darkrain.html"),
    readPartial("tehnicheskaya-podderzhka-saita-formats-block.html"),
    readPartial("tehnicheskaya-podderzhka-saita-audience-block.html"),
    readPartial("tehnicheskaya-podderzhka-saita-not-suitable-block.html"),
    readPartial("tehnicheskaya-podderzhka-saita-cases-slider-skladno-sytnie.html"),
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

  html = html.replace(/kompleksnoye-prodvizheniye-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cssVersion}`);
  html = html.replace(/app\.js\?v=[^"]+/, "app.js?v=20260629tehpodCaseFit1");
  html = html.replace(/service-faq\.css\?v=[^"]+/g, `service-faq.css?v=${faqCssVersion}`);
  html = html.replace(/kompleksnoye-prodvizheniye-page/g, `${slug}-page`);
  html = html.replace(/kompleksnoye-prodvizheniye/g, slug);
  html = html.replace(/KORPORATIVNYJ/g, "TEHPOD");

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
  html = html.replace(/<meta property="og:lowPrice" content="[^"]*"/, `<meta property="og:lowPrice" content="47000.00"`);
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"/,
    `<meta name="twitter:image" content="https://serenity.agency${heroBase}/hero.webp"`,
  );
  html = html.replace(
    /"name":"Комплексное продвижение","item":"https:\/\/serenity\.agency\/tehnicheskaya-podderzhka-saita"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );

  const preload = `    <link rel="preload" as="image" href="${heroDeskUrl}" fetchpriority="high" />\n`;
  if (!html.includes(`href="${heroDeskUrl}"`)) {
    const anchor = '<link rel="preload" as="font" type="font/woff" href="/_sa/img/HeroNew-Medium.woff"';
    html = html.replace(anchor, preload + anchor);
  }

  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) throw new Error("Нет TEHPOD-MAIN маркеров");
  html = html.slice(0, i0 + mainStart.length) + "\n" + buildMain() + "\n" + html.slice(i1);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");

  if (!html.includes("leave-request-cta.js")) {
    html = html.replace(
      '<script defer src="/_sa/js/service-team-slider.js',
      '<script defer src="/_sa/js/leave-request-cta.js?v=20260601inlineLeadThankYou"></script>\n    <script defer src="/_sa/js/service-team-slider.js',
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-tehnicheskaya-podderzhka-saita-shell: ok →", path.relative(root, outPath));
}

main();
