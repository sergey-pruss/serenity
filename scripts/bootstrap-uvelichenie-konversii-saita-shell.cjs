#!/usr/bin/env node
/**
 * Каркас uvelichenie-konversii-saita/index.html: шапка/подвал как strategy, main — только hero.
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const slug = "uvelichenie-konversii-saita";
const cfg = loadServiceConfig(slug);
const srcPath = path.join(root, "strategy", "index.html");
const outPath = path.join(root, cfg.assemble.pageDir, "index.html");
const ogImage = `/_sa/img/services/${slug}/og.webp`;
const cacheBust = "20260623serviceHeadingGap45";

function readPartial(name) {
  return fs.readFileSync(path.join(root, "html", "partials", "services", name), "utf8").trim();
}

function buildMain() {
  const hero = readPartial("hero-uvelichenie-konversii-saita.html");
  const productApproach = readPartial("uvelichenie-konversii-saita-product-approach-block.html");
  const howWeWork = readPartial("uvelichenie-konversii-saita-how-we-work-block.html");
  const cycleDiagram = readPartial("uvelichenie-konversii-saita-cycle-diagram-block.html");
  const businessResult = readPartial("uvelichenie-konversii-saita-business-result-block.html");
  const darkrainCase = readPartial("uvelichenie-konversii-saita-darkrain-case-block.html");
  const serviceIncludes = readPartial("uvelichenie-konversii-saita-service-includes-block.html");
  const audienceFit = readPartial("uvelichenie-konversii-saita-audience-fit-block.html");
  const notFit = readPartial("uvelichenie-konversii-saita-not-fit-block.html");
  const skladnoCase = readPartial("uvelichenie-konversii-saita-skladno-case-block.html");
  const trust = readPartial("uvelichenie-konversii-saita-trust-block.html");
  const inlineLead = readPartial(cfg.assemble.partials.inlineLead);
  const team = readPartial("uvelichenie-konversii-saita-team-block.html");
  const clients = readPartial("clients-uvelichenie-konversii-saita.html");
  const faq = readPartial(cfg.assemble.partials.faq);
  const blog = readPartial(cfg.assemble.partials.blog);
  const moreCases = readPartial(cfg.assemble.partials.moreCases);
  const awards = readPartial(cfg.assemble.partials.awards);
  const synergy = readPartial(cfg.assemble.partials.synergy);
  const desc = cfg.seo.description.replace(/"/g, "&quot;");
  return [
    `<!-- ${cfg.assemble.markers.mainStart} -->`,
    `<div class="page-constructor uvelichenie-konversii-saita-page">`,
    `<div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div>`,
    hero,
    productApproach,
    howWeWork,
    cycleDiagram,
    businessResult,
    darkrainCase,
    serviceIncludes,
    audienceFit,
    notFit,
    skladnoCase,
    trust,
    inlineLead,
    team,
    clients,
    faq,
    blog,
    moreCases,
    awards,
    synergy,
    `</div>`,
    `<div itemscope="itemscope" itemtype="http://schema.org/Product" style="display: none;"><span itemprop="brand">Serenity</span> <span itemprop="name">${cfg.seo.breadcrumbLabel}</span> <link itemprop="image" href="https://serenity.agency${ogImage}" /> <span itemprop="description">${desc}</span> <div itemprop="offers" itemscope="itemscope" itemtype="http://schema.org/AggregateOffer"><span itemprop="priceCurrency" content="RUB"></span> <span itemprop="lowPrice" content="55000.00">55000.00</span></div></div>`,
    `<!-- ${cfg.assemble.markers.mainEnd} -->`,
  ].join("\n");
}

function main() {
  let html = fs.readFileSync(srcPath, "utf8");
  const a = cfg.assemble;
  const mainStart = `<!-- ${a.markers.mainStart} -->`;
  const mainEnd = `<!-- ${a.markers.mainEnd} -->`;

  html = html.replace(
    /"name":"Маркетинговая стратегия","item":"https:\/\/serenity\.agency\/strategy"/,
    `"name":"${cfg.seo.breadcrumbLabel}","item":"https://serenity.agency${cfg.urlPath}"`,
  );
  html = html.replace(/strategy-static-stack\.css\?v=[^"]+/, `${a.cssStack}?v=${cacheBust}`);
  html = html.replace(/\s*<link rel="stylesheet" href="\/_sa\/css\/sections\/strategy-hero\.css\?v=[^"]+"\s*\/>/, "");
  html = html.replace(/strategy-page/g, "uvelichenie-konversii-saita-page");
  html = html.replace(/\bstrategy\b/g, slug);
  html = html.replace(/STRATEGY/g, "UKS");

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${cfg.seo.pageTitle}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="title" content="[^"]*"/, `<meta name="title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${cfg.seo.ogDescription || cfg.seo.description}"`,
  );
  html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="https://serenity.agency${cfg.urlPath}"`);
  html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="https://serenity.agency${ogImage}"`);
  html = html.replace(/<meta property="og:lowPrice" content="[^"]*"/, `<meta property="og:lowPrice" content="55000.00"`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${cfg.seo.metaTitle}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${cfg.seo.description}"`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="https://serenity.agency${ogImage}"`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="https://serenity.agency${cfg.urlPath}"`);

  const preload =
    `    <link rel="preload" as="image" href="/_sa/img/services/${slug}/hero.webp" fetchpriority="high" />\n`;
  const anchor = '<link rel="preload" as="font" type="font/woff" href="/_sa/img/HeroNew-Medium.woff"';
  if (!html.includes('rel="preload" as="image" href="/_sa/img/services/uvelichenie-konversii-saita/hero.webp"')) {
    html = html.replace(anchor, preload + anchor);
  }

  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) {
    throw new Error("Нет UKS-MAIN маркеров после замены STRATEGY");
  }
  html = html.slice(0, i0) + buildMain() + html.slice(i1 + mainEnd.length);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");
  html = html.replace(/<body>\s*<div\s*>\s*<div\s*>\s*<div itemscope/, "<body>\n    <div itemscope");
  html = html.replace(/<\/footer>\s*<\/div>\s*<\/div>\s*<\/div>/, "</footer>\n\n    </div>");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-uvelichenie-konversii-saita-shell: ok →", path.relative(root, outPath));
}

main();
