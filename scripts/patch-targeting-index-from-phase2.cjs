#!/usr/bin/env node
/**
 * Патч targeting/index.html без prod-дампа: hero subtitle, phase2-middle, FAQ, CSS.
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { patchServiceBreadcrumbForSlug } = require("./lib/service-breadcrumb-jsonld.cjs");
const { injectTargetingBlogClientsAfterFaq } = require("./lib/inject-targeting-blog-clients.cjs");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "targeting", "index.html");
const phase2Path = path.join(root, "html", "partials", "services", "targeting-phase2-middle.html");
const faqPath = path.join(root, "html", "partials", "services", "faq-targeting.html");

const SUBTITLE =
  "Настраиваем и&nbsp;ведём таргетированную рекламу в&nbsp;социальных сетях в&nbsp;Москве, Санкт-Петербурге, по&nbsp;всей России и&nbsp;за&nbsp;рубежом — привлекаем целевую аудиторию, заявки и&nbsp;продажи.";

const CSS_COMPARE_LINK =
  '    <link rel="preload" href="/_sa/css/sections/kontekstnaya-packages-compare.css?v=20260609packagesMobileSlider" as="style" onload="this.onload=null;this.rel=\'stylesheet\'" />\n' +
  '    <noscript><link rel="stylesheet" href="/_sa/css/sections/kontekstnaya-packages-compare.css?v=20260609packagesMobileSlider" /></noscript>\n';

const CSS_LINK =
  '    <link rel="stylesheet" href="/_sa/css/sections/targeting-seo-blocks.css?v=20260625targetingPlatformsGapFix" />\n';

function patchHeroSubtitle(html) {
  return html.replace(
    /(<h4 class="c-title-block__subtitle"[^>]*>)[\s\S]*?(<\/h4>)/,
    `$1${SUBTITLE}$2`,
  );
}

function replaceMiddle(html, middle) {
  const heroEnd = html.indexOf("</section>", html.indexOf("c-title-block")) + "</section>".length;
  const teamIdx = html.indexOf("team-block");
  const leadIdx = html.indexOf("sa-service-lead-section");
  const anchor = teamIdx >= 0 ? teamIdx : leadIdx;
  if (heroEnd < 0 || anchor < 0) throw new Error("patch-targeting-index: границы middle не найдены");
  const secStart = html.lastIndexOf('<section class="page-constructor__section">', anchor);
  if (secStart <= heroEnd) throw new Error("patch-targeting-index: secStart invalid");
  return `${html.slice(0, heroEnd)}\n${middle}\n${html.slice(secStart)}`;
}

function replaceFaq(html) {
  const faqPartial = fs.readFileSync(faqPath, "utf8").trim();
  const faqStart = html.indexOf('<section class="page-constructor__section targeting-faq-section">');
  if (faqStart < 0) throw new Error("patch-targeting-index: FAQ section not found");
  const casesIdx = html.indexOf('class="more-case-wr', faqStart);
  const cutEnd = casesIdx > faqStart ? html.lastIndexOf('<section class="page-constructor__section">', casesIdx) : html.indexOf("</section>", faqStart) + "</section>".length;
  return `${html.slice(0, faqStart)}${faqPartial}\n${html.slice(cutEnd)}`;
}

function ensurePackagesScripts(html) {
  let out = html;
  if (!out.includes('src="/_sa/js/service-packages-slider.js')) {
    const teamRe = /(<script defer src="\/_sa\/js\/service-team-slider\.js[^"]*"><\/script>\s*)/;
    const tag =
      '    <script defer src="/_sa/js/service-packages-slider.js?v=20260516kontekstPackagesGutter"></script>\n';
    if (teamRe.test(out)) out = out.replace(teamRe, `$1${tag}`);
  }
  if (!out.includes('src="/_sa/js/kontekst-packages-compare-rows.js')) {
    const sliderRe = /(<script defer src="\/_sa\/js\/service-packages-slider\.js[^"]*"><\/script>\s*)/;
    const tag =
      '    <script defer src="/_sa/js/kontekst-packages-compare-rows.js?v=20260603kontekstPackagesCompareScrollEnd"></script>\n';
    if (sliderRe.test(out)) out = out.replace(sliderRe, `$1${tag}`);
  }
  return out;
}

function ensureCss(html) {
  const cssNeedle = "targeting-seo-blocks.css";
  let out = html;
  if (out.includes(cssNeedle)) {
    out = out.replace(
      /\/_sa\/css\/sections\/targeting-seo-blocks\.css\?v=[^"]+/,
      "/_sa/css/sections/targeting-seo-blocks.css?v=20260625targetingPlatformsGapFix",
    );
  }
  if (!out.includes("kontekstnaya-packages-compare.css")) {
    const needle = "<!-- TARGETING-CSS-BUNDLE-END -->";
    const i = out.indexOf(needle);
    if (i < 0) throw new Error("patch-targeting-index: CSS bundle end not found");
    out = out.slice(0, i) + CSS_COMPARE_LINK + out.slice(i);
  }
  if (!out.includes(cssNeedle)) {
    const needle = "<!-- TARGETING-CSS-BUNDLE-END -->";
    const i = out.indexOf(needle);
    if (i < 0) throw new Error("patch-targeting-index: CSS bundle end not found");
    out = out.slice(0, i) + CSS_LINK + out.slice(i);
  }
  return out;
}

function run() {
  if (!fs.existsSync(phase2Path)) throw new Error("Нет phase2 partial — npm run build:targeting-seo-middle");
  if (!fs.existsSync(faqPath)) throw new Error("Нет faq-targeting.html — npm run build:service-faq");

  let html = fs.readFileSync(indexPath, "utf8");
  const middle = fs.readFileSync(phase2Path, "utf8").trim();

  html = patchHeroSubtitle(html);
  html = replaceMiddle(html, middle);
  html = replaceFaq(html);
  html = injectTargetingBlogClientsAfterFaq(html);
  html = ensureCss(html);
  html = ensurePackagesScripts(html);
  html = patchServiceBreadcrumbForSlug(html, "targeting");

  const typo = processTypographyHtml(html, { force: true });
  fs.writeFileSync(indexPath, `${typo.html.replace(/\n+$/, "\n")}`, "utf8");
  console.log("patch-targeting-index-from-phase2: ok");
}

run();
