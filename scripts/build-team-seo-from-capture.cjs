#!/usr/bin/env node
/**
 * Блок «Команда» на /seo: разметка слайдера как на /kompleksnoye-prodvizheniye/,
 * тексты и картинки — из prod-среза /seo (col-4 сетка).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");
const { resolveLayoutPath, rewriteProdSliceBase } = require("./lib/assemble-service-common.cjs");

const ROOT = path.join(__dirname, "..");
const KONTEKST_HTML = path.join(ROOT, "kontekstnaya_reklama/index.html");
const OUT_PARTIAL = path.join(ROOT, "html/partials/services/seo-team-block.html");

function extractTeamSection(html) {
  const idx = html.indexOf("team-block");
  if (idx === -1) return null;
  const secStart = html.lastIndexOf("<section", idx);
  let pos = secStart;
  let depth = 0;
  while (pos < html.length) {
    if (html.slice(pos, pos + 8) === "<section") depth += 1;
    else if (html.slice(pos, pos + 10) === "</section>") {
      depth -= 1;
      if (depth === 0) return html.slice(secStart, pos + 10);
    }
    pos += 1;
  }
  return null;
}

function extractMembersFromGrid(block) {
  const headMatch = block.match(
    /class="team__head">[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*(?:<p[^>]*>([\s\S]*?)<\/p>|<!---->)/,
  );
  const intro = headMatch && headMatch[1] ? headMatch[1].trim() : "";
  const members = [];
  const seen = new Set();
  for (const part of block.split('class="col-4 col-md-6"').slice(1)) {
    const img = part.match(/src="([^"]+)"/);
    const h4 = part.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
    const p = part.match(/<h4[^>]*>[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    if (!img || !h4 || !p) continue;
    const key = h4[1].replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({ img: img[1], h4: h4[1].trim(), p: p[1].trim() });
  }
  return { intro, members };
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function memberSlideHtml(m) {
  const alt = stripTags(m.h4).slice(0, 120);
  return (
    `<div class="team__member-slide swiper-slide" style="margin-right:30px">` +
    `<div data-v-c03ce8dc="" class="team__member-card">` +
    `<figure data-v-c03ce8dc=""><img data-v-c03ce8dc="" src="${m.img}" alt="${alt}" loading="lazy"></figure> ` +
    `<h4 data-v-c03ce8dc="">${m.h4}</h4> ` +
    `<p data-v-c03ce8dc="">${m.p}</p>` +
    `</div></div>`
  );
}

function carouselSlideHtml(m, index) {
  const alt = stripTags(m.h4).slice(0, 120);
  return (
    `<div data-v-3b1bcda9="" class="swiper-slide" data-swiper-slide-index="${index}">` +
    `<figure data-v-3b1bcda9=""><img data-v-3b1bcda9="" src="${m.img}" alt="${alt}" loading="lazy"></figure> ` +
    `<h4 data-v-3b1bcda9="">${m.h4}</h4> ` +
    `<p data-v-3b1bcda9="">${m.p}</p></div>`
  );
}

function buildTeamSection(templateSection, intro, members) {
  let out = templateSection;

  if (intro) {
    out = out.replace(
      /(<p data-v-c03ce8dc="">)([\s\S]*?)(<\/p><\/div> <div data-v-c03ce8dc="" class="row team__cards)/,
      `$1${intro}$3`,
    );
  } else {
    out = out.replace(
      /<p data-v-c03ce8dc="">[\s\S]*?<\/p>(?=<\/div> <div data-v-c03ce8dc="" class="row team__cards)/,
      "<!----> ",
    );
  }

  const trackOpen = '<div class="team__members-track swiper-wrapper">';
  const carouselOpen = '<div data-v-3b1bcda9="" data-v-c03ce8dc="" class="team-carousel-block"';
  const trackIdx = out.indexOf(trackOpen);
  const carouselIdx = out.indexOf(carouselOpen);
  if (trackIdx < 0 || carouselIdx < 0) throw new Error("team track/carousel markers missing");
  const trackContentStart = out.indexOf(">", trackIdx) + 1;
  const slidesHtml = members.map((m) => memberSlideHtml(m)).join("");
  /* track → members-slider → team__cards.row */
  const structuralCloses = "</div></div></div>";
  out = out.slice(0, trackContentStart) + slidesHtml + structuralCloses + out.slice(carouselIdx);

  return out
    .replace(/<section class="page-constructor__section">/, '<section class="page-constructor__section seo-team-section">')
    .replace(/\s*swiper-container-initialized\b/g, "")
    .replace(/\s*swiper-container-horizontal\b/g, "")
    .replace(/\s*swiper-container-free-mode\b/g, "")
    .replace(/\s*swiper-container-autoheight\b/g, "")
    .replace(/\s*swiper-slide-duplicate\b/g, "")
    .replace(/\s*data-swiper-slide-index="[^"]*"/g, "")
    .replace(/\s*style="transition-duration:\s*0ms;?"/g, "")
    .replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
}

function assertBalanced(fragment, label) {
  const divO = (fragment.match(/<div/g) || []).length;
  const divC = (fragment.match(/<\/div>/g) || []).length;
  const secO = (fragment.match(/<section/g) || []).length;
  const secC = (fragment.match(/<\/section>/g) || []).length;
  if (divO !== divC || secO !== secC) {
    throw new Error(
      `${label}: несбалансированная разметка section ${secO}/${secC}, div ${divO}/${divC}`,
    );
  }
}

function readSeoCaptureHtml() {
  const indexPath = path.join(ROOT, "seo/index.html");
  const MS = "<!-- SEO-MAIN-START -->";
  const ME = "<!-- SEO-MAIN-END -->";
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf8");
    const block = extractTeamSection(html);
    if (block?.includes('class="col-4 col-md-6"')) {
      const i0 = html.indexOf(MS);
      const i1 = html.indexOf(ME);
      if (i0 >= 0 && i1 > i0) return html.slice(i0 + MS.length, i1);
    }
  }
  const cfg = loadServiceConfig("seo");
  const { path: layoutPath } = resolveLayoutPath(cfg.assemble);
  if (layoutPath && fs.existsSync(layoutPath)) {
    const layout = fs.readFileSync(layoutPath, "utf8");
    let iPc = layout.indexOf('<div class="page-constructor">');
    if (iPc < 0) iPc = layout.indexOf('<motion.div class="page-constructor">');
    const iFm = layout.indexOf('<footer class="footer-modern"');
    if (iPc >= 0 && iFm > iPc) return layout.slice(iPc, iFm);
    return layout;
  }
  return null;
}

function main() {
  const template = extractTeamSection(fs.readFileSync(KONTEKST_HTML, "utf8"));
  if (!template?.includes("team__members-slider")) {
    throw new Error("kontekst team slider markup missing");
  }
  assertBalanced(template, "kontekst-team");

  const capture = readSeoCaptureHtml();
  if (!capture) throw new Error("нет prod-среза /seo для команды");
  const block = extractTeamSection(capture);
  if (!block) throw new Error("team-block not found in SEO capture");

  const { intro, members } = extractMembersFromGrid(block);
  if (!members.length) throw new Error("no SEO team members in capture");

  let section = buildTeamSection(template, intro, members);
  section = rewriteProdSliceBase(section);
  assertBalanced(section, "seo-team-block");

  fs.mkdirSync(path.dirname(OUT_PARTIAL), { recursive: true });
  fs.writeFileSync(OUT_PARTIAL, section.trim() + "\n", "utf8");
  console.log(`build-team-seo-from-capture: ok (${members.length} members)`);
}

main();
