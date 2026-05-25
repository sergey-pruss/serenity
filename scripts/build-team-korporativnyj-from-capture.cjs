#!/usr/bin/env node
/**
 * Блок «Команда» на /korporativnyj_sajt/: разметка слайдера как на /kontekstnaya_reklama/ и /targeting/,
 * тексты и картинки — из текущего korporativnyj (capture / phase2).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const KONTEKST_HTML = path.join(ROOT, "kontekstnaya_reklama/index.html");
const KORPORATIVNYJ_HTML = path.join(ROOT, "korporativnyj_sajt/index.html");
const PHASE2_PARTIAL = path.join(ROOT, "html/partials/services/korporativnyj-phase2-middle.html");

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
  const headMatch = block.match(/class="team__head">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
  const intro = headMatch ? headMatch[1].trim() : "";
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

function extractMembersFromSlider(block) {
  const headMatch = block.match(/class="team__head">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
  const intro = headMatch ? headMatch[1].trim() : "";
  const members = [];
  const seen = new Set();
  const re =
    /<div class="team__member-slide[^>]*>[\s\S]*?src="([^"]+)"[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(block))) {
    const key = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({ img: m[1], h4: m[2].trim(), p: m[3].trim() });
  }
  return { intro, members };
}

function extractKorporativnyjMembersAndIntro(html) {
  const block = extractTeamSection(html);
  if (!block) throw new Error("team-block not found");
  if (block.includes('class="col-4 col-md-6"')) {
    return extractMembersFromGrid(block);
  }
  return extractMembersFromSlider(block);
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

function buildTeamSection(kontekstSection, intro, members) {
  let out = kontekstSection;

  out = out.replace(
    /(<p data-v-c03ce8dc="">)([\s\S]*?)(<\/p><\/div> <div data-v-c03ce8dc="" class="row team__cards)/,
    `$1${intro}$3`,
  );

  const slidesHtml = members.map((m) => memberSlideHtml(m)).join("");
  out = out.replace(
    /(<div class="team__members-track swiper-wrapper">)[\s\S]*?(<div data-v-3b1bcda9="" data-v-c03ce8dc="" class="team-carousel-block")/,
    `$1${slidesHtml}$2`,
  );

  const carouselSlides = members.map((m, i) => carouselSlideHtml(m, i)).join("");
  out = out.replace(
    /(<div data-v-3b1bcda9="" class="swiper-wrapper"[^>]*>)[\s\S]*?(<div class="swiper-pagination")/,
    `$1${carouselSlides}$2`,
  );

  return out
    .replace(/\s*swiper-container-initialized\b/g, "")
    .replace(/\s*swiper-container-horizontal\b/g, "")
    .replace(/\s*swiper-container-free-mode\b/g, "")
    .replace(/\s*swiper-container-autoheight\b/g, "")
    .replace(/\s*swiper-slide-duplicate\b/g, "")
    .replace(/\s*data-swiper-slide-index="[^"]*"/g, "")
    .replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
}

function replaceTeamInFile(filePath, newSection) {
  const html = fs.readFileSync(filePath, "utf8");
  const old = extractTeamSection(html);
  if (!old) throw new Error(`team-block not found in ${filePath}`);
  fs.writeFileSync(filePath, html.replace(old, newSection));
}

function main() {
  const kontekstTeam = extractTeamSection(fs.readFileSync(KONTEKST_HTML, "utf8"));
  if (!kontekstTeam?.includes("team__members-slider")) {
    throw new Error("kontekst team slider markup missing");
  }

  let { intro, members } = { intro: "", members: [] };
  if (fs.existsSync(PHASE2_PARTIAL)) {
    ({ intro, members } = extractKorporativnyjMembersAndIntro(
      fs.readFileSync(PHASE2_PARTIAL, "utf8"),
    ));
  }
  if (!members.length) {
    ({ intro, members } = extractKorporativnyjMembersAndIntro(
      fs.readFileSync(KORPORATIVNYJ_HTML, "utf8"),
    ));
  }
  if (!members.length) throw new Error("no korporativnyj team members");

  const newTeam = buildTeamSection(kontekstTeam, intro, members);
  replaceTeamInFile(KORPORATIVNYJ_HTML, newTeam);
  if (fs.existsSync(PHASE2_PARTIAL)) replaceTeamInFile(PHASE2_PARTIAL, newTeam);

  console.log(`build-team-korporativnyj-from-capture: ok (${members.length} members)`);
}

main();
