#!/usr/bin/env node
/**
 * Каркас strategy/index.html: шапка/подвал как targeting, main — только hero (без #__nuxt).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "strategy";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "targeting", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const ogImage = `/_sa/img/services/${slug}/og.webp`;

function readPartial(name) {
  return fs.readFileSync(path.join(root, "html", "partials", "services", name), "utf8").trim();
}

function buildMain() {
  const hero = readPartial("hero-strategy.html");
  const facts = readPartial("strategy-facts.html");
  const approach = readPartial("strategy-approach-block.html");
  const casesSlider = readPartial("strategy-cases-slider-orange.html");
  const stagesHeading = readPartial("strategy-stages-heading-block.html");
  const research = readPartial("strategy-research-block.html");
  const positioning = readPartial("strategy-positioning-block.html");
  const gioCasesSlider = readPartial("strategy-cases-slider-gio-wellness.html");
  const formation = readPartial("strategy-formation-block.html");
  const complexSolutions = readPartial("strategy-complex-solutions-block.html");
  const kauryCasesSlider = readPartial("strategy-cases-slider-kaury.html");
  const targetedProducts = readPartial("strategy-targeted-products-block.html");
  const advantages = readPartial("strategy-advantages-block.html");
  const inlineLead = readPartial("service-inline-lead-strategy.html");
  const relatedServices = readPartial("strategy-related-services-block.html");
  const team = readPartial("strategy-team-block.html");
  const blog = readPartial("blog-strategy.html");
  const clients = readPartial("clients-strategy.html");
  const moreCases = readPartial("more-cases-strategy.html");
  const awards = readPartial("awards-strategy.html");
  const synergy = readPartial("synergy-strategy.html");
  const desc = cfg.seo.description.replace(/"/g, "&quot;");
  return [
    `<!-- ${cfg.assemble.markers.mainStart} -->`,
    `<div class="page-constructor strategy-page">`,
    `<div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    hero,
    facts,
    approach,
    casesSlider,
    stagesHeading,
    research,
    positioning,
    gioCasesSlider,
    formation,
    complexSolutions,
    kauryCasesSlider,
    targetedProducts,
    advantages,
    inlineLead,
    relatedServices,
    team,
    blog,
    clients,
    moreCases,
    awards,
    synergy,
    `</div>`,
  `<div itemscope="itemscope" itemtype="http://schema.org/Product" style="display: none;"><span itemprop="brand">Serenity</span> <span itemprop="name">${cfg.seo.breadcrumbLabel}</span> <link itemprop="image" href="https://serenity.agency${ogImage}" /> <span itemprop="description">${desc}</span> <div itemprop="offers" itemscope="itemscope" itemtype="http://schema.org/AggregateOffer"><span itemprop="priceCurrency" content="RUB"></span> <span itemprop="lowPrice" content="900000.00">900000.00</span></div></div>`,
    `<!-- ${cfg.assemble.markers.mainEnd} -->`,
  ].join("\n");
}

function main() {
  let html = fs.readFileSync(srcPath, "utf8");
  const a = cfg.assemble;
  const mainStart = `<!-- ${a.markers.mainStart} -->`;
  const mainEnd = `<!-- ${a.markers.mainEnd} -->`;

  html = html.replace(
    /"name":"Таргетированная реклама","item":"https:\/\/serenity\.agency\/targeting"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(/strategy-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=20260611strategyCases8`);
  html = html.replace(/targeting-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=20260611strategyCases8`);
  html = html.replace(
    /<link rel="stylesheet" href="\/_sa\/css\/sections\/targeting-hero\.css\?v=[^"]+"\s*\/>/,
    '<link rel="stylesheet" href="/_sa/css/sections/strategy-hero.css?v=20260611strategyCases8" />',
  );
  html = html.replace(
    /sections\/strategy-hero\.css\?v=[^"]+/,
    "sections/strategy-hero.css?v=20260611strategyCases8",
  );
  html = html.replace(/\s*<link rel="stylesheet" href="\/_sa\/css\/targeting-nuxt\.bundle\.css[^"]*" \/>/, "");
  html = html.replace(
    /<link rel="stylesheet" href="\/_sa\/css\/css__home-snapshot__native-row-scroll\.css[^"]+"\s*\/>/,
    '$&\n    <link rel="stylesheet" href="/_sa/css/korporativnyj-nuxt.bundle.css?v=20260523korporativnyjBundle1" />',
  );
  html = html.replace(/targeting-page/g, "strategy-page");
  html = html.replace(/targeting/g, slug);
  html = html.replace(/TARGETING/g, "STRATEGY");

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${cfg.seo.pageTitle}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="title" content="[^"]*"/, `<meta name="title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${cfg.seo.ogDescription || cfg.seo.description}"`);
  html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="https://serenity.agency${cfg.urlPath}"`);
  html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="https://serenity.agency${ogImage}"`);
  html = html.replace(/<meta property="og:lowPrice" content="[^"]*"/, `<meta property="og:lowPrice" content="900000.00"`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="https://serenity.agency${ogImage}"`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="https://serenity.agency${cfg.urlPath}"`);
  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) {
    throw new Error("Нет STRATEGY-MAIN маркеров после замены TARGETING");
  }
  html = html.slice(0, i0) + buildMain() + html.slice(i1 + mainEnd.length);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");
  html = html.replace(/<body>\s*<div\s*>\s*<div\s*>\s*<div itemscope/, "<body>\n    <div itemscope");
  html = html.replace(/<\/footer>\s*<\/div>\s*<\/div>\s*<\/div>/, "</footer>\n\n    </div>");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-strategy-shell: ok →", path.relative(root, outPath));
}

main();
