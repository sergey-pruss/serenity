#!/usr/bin/env node
/**
 * Каркас lending_na_tilda/index.html из korporativnyj_sajt (video hero, без #__nuxt).
 * Контентные блоки + хвост (форма, команда, клиенты, FAQ, блог, кейсы, награды, синергия).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "lending_na_tilda";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "korporativnyj_sajt", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const heroBase = `/_sa/img/services/${slug}/hero`;
const cssVersion = "20260701lendingTildaAwardsSynergyGap1";
const appJsVersion = "20260701lendingTildaCase100vh2";

function readPartial(name) {
  const p = path.join(root, "html", "partials", "services", name);
  return fs.readFileSync(p, "utf8").trim();
}

function buildHero() {
  const desk = `${heroBase}/hero-desktop.mp4`;
  const mob = `${heroBase}/hero-mobile.mp4`;
  return `<section class="page-constructor__section"><div class="c-title-block modern" data-v-04503aeb=""><header class="c-title-block__header video-header" data-v-04503aeb=""><h1 class="c-title-block__title" data-v-04503aeb="">Лендинг на&nbsp;Tilda</h1> <h4 class="c-title-block__subtitle" data-v-04503aeb="">Создаём канал стабильных продаж: функциональный и&nbsp;удобный для&nbsp;вас, привлекательный и&nbsp;понятный для&nbsp;ваших клиентов.</h4></header> <section data-v-f2e07ed8="" data-v-04503aeb="" class="jumbotron-video-aurora"><div data-v-f2e07ed8="" class="container"><div data-v-f2e07ed8="" class="jumbotron-video-aurora_blok"><video data-v-f2e07ed8="" src="${desk}" muted="muted" playsinline="" loop="loop" autoplay="autoplay" preload="none" class="jumbotron-video-aurora__video lending-tilda-hero-video--desktop"></video><video data-v-f2e07ed8="" src="${mob}" muted="muted" playsinline="" loop="loop" autoplay="autoplay" preload="none" class="jumbotron-video-aurora__video lending-tilda-hero-video--mobile"></video></div></div></section></div></section>`;
}

function buildMain() {
  return [
    `<div class="page-constructor lending-na-tilda-page korporativnyj-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    buildHero(),
    readPartial("lending-na-tilda-facts-block.html"),
    readPartial("lending-na-tilda-approach-block.html"),
    readPartial("lending-na-tilda-case-bez-ramok.html"),
    readPartial("lending-na-tilda-stages-heading-block.html"),
    readPartial("lending-na-tilda-stage-research-block.html"),
    readPartial("lending-na-tilda-stage-projecting-block.html"),
    readPartial("lending-na-tilda-case-voice.html"),
    readPartial("lending-na-tilda-stage-design-block.html"),
    readPartial("lending-na-tilda-stage-layout-block.html"),
    readPartial("lending-na-tilda-case-ihelp-pro.html"),
    readPartial("lending-na-tilda-advantages-block.html"),
    readPartial(cfg.assemble.partials.inlineLead),
    readPartial(cfg.assemble.partials.team),
    readPartial(cfg.assemble.partials.clients),
    readPartial(cfg.assemble.partials.faq),
    readPartial(cfg.assemble.partials.blog),
    readPartial(cfg.assemble.partials.moreCases),
    readPartial(cfg.assemble.partials.awards),
    readPartial(cfg.assemble.partials.synergy),
    `</div>`,
    `<div itemscope="itemscope" itemtype="http://schema.org/Product" style="display: none;"><span itemprop="brand">Serenity</span> <span itemprop="name">${cfg.seo.breadcrumbLabel}</span> <span itemprop="description">${cfg.seo.description}</span></div>`,
  ].join("\n");
}

function main() {
  let html = fs.readFileSync(srcPath, "utf8");
  const a = cfg.assemble;
  const mainStart = `<!-- ${a.markers.mainStart} -->`;
  const mainEnd = `<!-- ${a.markers.mainEnd} -->`;

  html = html.replace(/korporativnyj-sajt-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cssVersion}`);
  html = html.replace(/lending-na-tilda-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cssVersion}`);
  if (!html.includes(a.cssStack)) {
    html = html.replace(
      /(<link rel="stylesheet" href="\/_sa\/css\/korporativnyj-sajt-static-stack\.css\?v=[^"]+" \/>)/,
      `$1\n    <link rel="stylesheet" href="/_sa/css/${a.cssStack}?v=${cssVersion}" />`,
    );
  }
  html = html.replace(/app\.js\?v=[^"]+/, `app.js?v=${appJsVersion}`);
  html = html.replace(/korporativnyj-page/g, "lending-na-tilda-page korporativnyj-page");
  html = html.replace(/korporativnyj_sajt/g, slug);
  html = html.replace(/KORPORATIVNYJ/g, "LENDING-TILDA");

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
  html = html.replace(/<meta property="og:lowPrice" content="[^"]*"/, `<meta property="og:lowPrice" content="150000.00"`);
  html = html.replace(
    /"name":"Корпоративный сайт","item":"https:\/\/serenity\.agency\/korporativnyj_sajt"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(
    /"name":"[^"]*","item":"https:\/\/serenity\.agency\/lending_na_tilda"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );

  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  const altStart = "<!-- KORPORATIVNYJ-MAIN-START -->";
  const altEnd = "<!-- KORPORATIVNYJ-MAIN-END -->";
  if (i0 >= 0 && i1 >= 0) {
    html = html.slice(0, i0 + mainStart.length) + "\n" + buildMain() + "\n" + html.slice(i1);
  } else {
    const j0 = html.indexOf(altStart);
    const j1 = html.indexOf(altEnd);
    if (j0 < 0 || j1 < 0) throw new Error("Нет LENDING-TILDA / KORPORATIVNYJ MAIN маркеров");
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
  console.log("bootstrap-lending-na-tilda-shell: ok →", path.relative(root, outPath));
}

main();
