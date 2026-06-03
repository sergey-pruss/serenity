#!/usr/bin/env node
/**
 * Каркас seo/index.html из kompleksnoye-prodvizheniye (без #__nuxt), SEO meta и маркеры SEO-MAIN.
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const srcPath = path.join(root, "kompleksnoye-prodvizheniye", "index.html");
const outPath = path.join(root, "seo", "index.html");

function main() {
  const seo = loadServiceConfig("seo");
  let html = fs.readFileSync(srcPath, "utf8");

  html = html.replace(/kompleksnoye-prodvizheniye/g, "seo");
  html = html.replace(/kompleksnoye-prodvizheniye-page/g, "seo-page");
  html = html.replace(/KORPORATIVNYJ/g, "SEO");
  html = html.replace(/KOMPLEKSNOYE-[A-Z-]+-START[\s\S]*?KOMPLEKSNOYE-[A-Z-]+-END\s*/g, "");
  html = html.replace(
    /kompleksnoye-prodvizheniye-static-stack\.css\?v=[^"]+/,
    "seo-static-stack.css?v=20260603seoSliderGap",
  );
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${seo.seo.pageTitle}</title>`,
  );
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${seo.seo.description}"`,
  );
  html = html.replace(
    /<meta name="title" content="[^"]*"/,
    `<meta name="title" content="${seo.seo.metaTitle}"`,
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${seo.seo.metaTitle}"`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${seo.seo.description}"`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="https://serenity.agency/seo"`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="https://serenity.agency/seo"`,
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${seo.seo.metaTitle}"`,
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${seo.seo.description}"`,
  );
  html = html.replace(
    /"name":"Комплексное продвижение","item":"https:\/\/serenity\.agency\/kompleksnoye-prodvizheniye"/,
    `"name":"${seo.seo.breadcrumbLabel}","item":"https://serenity.agency/seo"`,
  );
  html = html.replace(
    /<link rel="preload" as="image" href="\/_sa\/img\/services\/kompleksnoye-prodvizheniye\/hero\/[^"]+"/,
    '<link rel="preload" as="image" href="/_sa/img/services/seo/hero/hero.webp" fetchpriority="high" />',
  );

  const mainStart = "<!-- SEO-MAIN-START -->";
  const mainEnd = "<!-- SEO-MAIN-END -->";
  const i0 = html.indexOf(mainStart);
  const i1 = html.indexOf(mainEnd);
  if (i0 < 0 || i1 < 0) {
    throw new Error("Нет SEO-MAIN маркеров после замены KORPORATIVNYJ");
  }
  const placeholder =
    `${mainStart}\n<div class="page-constructor seo-page"><div class="page-constructor__bg isLoaded"><canvas id="gradient-canvas" width="1440" height="600" class="isLoaded"></canvas></div></div>\n${mainEnd}`;
  html = html.slice(0, i0) + placeholder + html.slice(i1 + mainEnd.length);

  html = html.replace(/id="__nuxt"/g, "");
  html = html.replace(/id="__layout"/g, "");
  html = html.replace(/data-server-rendered="true"\s*/g, "");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log("bootstrap-seo-page-shell: ok →", path.relative(root, outPath));
}

main();
