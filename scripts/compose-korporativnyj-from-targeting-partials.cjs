#!/usr/bin/env node
/**
 * Кейсы и синергия /korporativnyj_sajt: разметка как /targeting (partials + JSON), контент korporativnyj.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { KORPORATIVNYJ_SYNERGY_SLIDES_HTML } = require("./lib/korporativnyj-synergy-slides.cjs");
const {
  renderMorSlide,
  renderGridCase,
  buildCtaSlide,
  loadSitesCategoryCases,
} = require("./lib/build-more-cases-cards-html.cjs");

const root = path.resolve(__dirname, "..");
const partialsDir = path.join(root, "html", "partials", "services");

const SITES_MORE_HREF = "/case/all/category/sites/";
/** Десктопная сетка и слайдер more-cases на /korporativnyj_sajt — только первые N кейсов рубрики sites. */
const MORE_CASES_LIMIT = 8;

function stripComment(html) {
  return html.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
}

function buildMoreCasesBodyHtml() {
  const sitesCases = loadSitesCategoryCases(root, { excludeBehance: true }).slice(0, MORE_CASES_LIMIT);
  if (!sitesCases.length) {
    throw new Error("compose: нет кейсов рубрики sites (json/case-all-pages/sites/)");
  }
  const targetingPath = path.join(partialsDir, "more-cases-targeting.html");
  const targeting = stripComment(fs.readFileSync(targetingPath, "utf8"));
  const ctaSlide = buildCtaSlide(SITES_MORE_HREF);
  const slides = sitesCases.map(renderMorSlide).join("");
  const sliderInner = `<div data-v-38965faa="" class="swiper-wrapper">${slides} ${ctaSlide} </div> <div data-v-38965faa="" class="swiper-pagination"></div>`;
  let out = targeting.replace(
    /<div data-v-38965faa="" class="swiper-wrapper">[\s\S]*?<div data-v-38965faa="" class="swiper-pagination"><\/div>/,
    sliderInner,
  );
  const gridCases = sitesCases.map((c, idx) => renderGridCase(c, idx)).join("");
  const gridInner = `<h2 data-v-27a87df0="" class="case__title">Кейсы</h2> <div data-v-27a87df0="" class="more-cases__item">${gridCases} <a data-v-27a87df0="" href="${SITES_MORE_HREF}" class="last-case"><p data-v-27a87df0="">Смотреть больше&nbsp;кейсов</p> <img data-v-27a87df0="" src="/_sa/img/video__lastBlogGif.gif" loop="loop" playsinline="" loading="lazy" class="video_last"> <div data-v-27a87df0="" class="last-case__bg"></div></a></div>`;
  out = out.replace(
    /<div data-v-27a87df0="" class="more-cases">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/,
    `<div data-v-27a87df0="" class="more-cases">${gridInner}</div></div></div></section>`,
  );
  out = out.replace(/href="\/case\/all"/g, 'href="/case/all/"');
  out = out.replace(/src="\/video\/lastBlogGif\.gif"/g, 'src="/_sa/img/video__lastBlogGif.gif"');
  return out.trim();
}

function buildSynergyBodyHtml() {
  const targetingPath = path.join(partialsDir, "synergy-targeting.html");
  const targeting = fs.readFileSync(targetingPath, "utf8");
  const openRe = /<section[^>]*\bid="kontekst-synergy-mounted"[^>]*>/i;
  const m = targeting.match(openRe);
  if (!m) throw new Error("synergy-targeting: нет #kontekst-synergy-mounted");
  let inner = targeting.slice(m.index + m[0].length, targeting.lastIndexOf("</section>"));
  const wStart = inner.indexOf('<div data-v-56f85d51="" class="services__context-wrapper');
  const btn = inner.indexOf('class="swiper-button-next"', wStart);
  if (wStart < 0 || btn < 0) throw new Error("synergy-targeting: нет слайдера или кнопок");
  const navRe = /<div data-v-56f85d51="">\s*<button[\s\S]*?class="swiper-button-next"/;
  const navM = inner.slice(wStart).match(navRe);
  if (!navM) throw new Error("synergy-targeting: нет блока навигации слайдера");
  const navStart = wStart + navM.index;
  const fixed =
    inner.slice(0, wStart) +
    `<div data-v-56f85d51="" class="services__context-wrapper swiper-wrapper">${KORPORATIVNYJ_SYNERGY_SLIDES_HTML}\n          </div>\n          ` +
    inner.slice(navStart);
  if (
    fixed.includes('href="/kontekstnaya_reklama"') ||
    fixed.includes("business-analytics") ||
    fixed.includes("influence-marketing")
  ) {
    throw new Error("synergy body: остались лишние карточки (targeting / influence)");
  }
  return fixed;
}

function writeJsonAndPartials() {
  const moreBody = buildMoreCasesBodyHtml();
  const moreTypo = processTypographyHtml(moreBody, { force: true });
  const moreJsonPath = path.join(root, "json", "services", "korporativnyj_sajt", "more-cases.json");
  fs.writeFileSync(moreJsonPath, `${JSON.stringify({ bodyHtml: moreTypo.html.trim() }, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, moreJsonPath));

  const synergyHtml = buildSynergyBodyHtml();
  const synergyTypo = processTypographyHtml(synergyHtml, { force: true });
  const synergyJsonPath = path.join(root, "json", "services", "korporativnyj_sajt", "synergy.json");
  const synergyMount = JSON.parse(fs.readFileSync(synergyJsonPath, "utf8"));
  const synergyData = {
    mountId: synergyMount.mountId || "kontekst-synergy-mounted",
    rootClass: synergyMount.rootClass || "kontekst-synergy-root",
    bodyHtml: synergyTypo.html.trim(),
  };
  fs.writeFileSync(synergyJsonPath, `${JSON.stringify(synergyData, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, synergyJsonPath));

  execSync("node scripts/build-service-more-cases-partials.cjs", { cwd: root, stdio: "inherit" });
  execSync("node scripts/build-service-synergy-partials.cjs", { cwd: root, stdio: "inherit" });
}

function extractSynergyBodyFromPartial(html) {
  const openRe = /<section[^>]*\bid="kontekst-synergy-mounted"[^>]*>/i;
  const m = html.match(openRe);
  if (!m) throw new Error("synergy partial: нет #kontekst-synergy-mounted");
  const start = m.index + m[0].length;
  const close = html.lastIndexOf("</section>");
  return html.slice(start, close).trim();
}

writeJsonAndPartials();
console.log("compose-korporativnyj-from-targeting-partials: ok");
