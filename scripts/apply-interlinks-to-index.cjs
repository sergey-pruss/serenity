#!/usr/bin/env node
/**
 * Применяет перелинковки к уже собранным index.html (без prod-capture).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const {
  patchHomeInterlinks,
  patchServicesIndexInterlinks,
  patchMarketingInterlinks,
} = require("./lib/hub-interlinks.cjs");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, html) {
  fs.writeFileSync(path.join(root, file), html);
}

function patchSeoInternalLinks(html) {
  let s = html;
  s = s.replace(
    /отделами аналитики, разработки, контента, дизайна и&nbsp;(?:<a href="\/kontekstnaya_reklama" class="seo-text-link">)?контекстной рекламы(?:<\/a>)?, чтобы совместно/g,
    'отделами аналитики, разработки, контента, дизайна и&nbsp;<a href="/kontekstnaya_reklama" class="seo-text-link">контекстной рекламы</a>, чтобы совместно',
  );
  s = s.replace(
    /на&nbsp;конверсию в&nbsp;целом\./g,
    'на&nbsp;<a href="/uvelichenie-konversii-saita" class="seo-text-link">конверсию в&nbsp;целом</a>.',
  );
  s = s.replace(
    /А&nbsp;если сайт делается с&nbsp;нуля/g,
    'А&nbsp;если <a href="/korporativnyj_sajt" class="seo-text-link">сайт</a> делается <a href="/sozdanie-internet-magazina" class="seo-text-link">с&nbsp;нуля</a>',
  );
  s = s.replace(
    /с&nbsp;первых дней после релиза/g,
    'с&nbsp;первых дней <a href="/tehnicheskaya-podderzhka-saita" class="seo-text-link">после релиза</a>',
  );
  s = s.replace(
    /формируем промостраницу/g,
    'формируем <a href="/prodvizhenie-statey-v-dzene-i-promostranitsah" class="seo-text-link">промостраницу</a>',
  );
  return s;
}

function patchKorporativnyjInternalLinks(html) {
  return html.replace(
    /эффективный с&nbsp;точки зрения UX\/UI дизайн/g,
    '<a href="/uvelichenie-konversii-saita" class="korporativnyj-text-link">эффективный с&nbsp;точки зрения UX/UI дизайн</a>',
  );
}

function replaceMainBetween(html, startMarker, endMarker, newMain) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) throw new Error(`markers not found: ${startMarker}`);
  return html.slice(0, start + startMarker.length) + "\n" + newMain + "\n" + html.slice(end);
}

function injectPartial(html, startMarker, endMarker, partial) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) throw new Error(`partial markers not found: ${startMarker}`);
  return html.slice(0, start) + partial.trim() + "\n" + html.slice(end + endMarker.length);
}

function syncPartial(pageDir, startMarker, endMarker, partialRel) {
  const indexPath = path.join(pageDir, "index.html");
  let html = read(indexPath);
  const partial = read(partialRel);
  html = injectPartial(html, startMarker, endMarker, partial);
  write(indexPath, html);
  console.log("partial sync:", pageDir, path.basename(partialRel));
}

function patchKontekstnayaInternalLinks(html) {
  let s = html;
  s = s.replace(
    /<a class="kontekstnaya-text-link" href="\/strategy">Стратегию продвижения строим<\/a>/g,
    "Стратегию продвижения строим",
  );
  s = s.replace(
    /как привлекать аудиторию конкурентов на сайты/g,
    'как <a class="kontekstnaya-text-link" href="/blog/article/kak-privlechat-auditoriyu-konkurentov-cherez-yandeks-direkt/">привлекать аудиторию конкурентов</a> на сайты',
  );
  s = s.replace(
    /<h3 data-v-4ed7dc78="" class="block__name">Проводим аудит посадочных страниц<\/h3>/g,
    '<h3 data-v-4ed7dc78="" class="block__name"><a class="kontekstnaya-text-link" href="/uvelichenie-konversii-saita">Проводим аудит посадочных страниц</a></h3>',
  );
  s = s.replace(
    /<a href="\/prodvizhenie-yandex-karty-2gis">Геомедийная контекстная реклама<\/a>/g,
    '<a class="kontekstnaya-text-link" href="/prodvizhenie-yandex-karty-2gis">Геомедийная контекстная реклама</a>',
  );
  s = s.replace(
    /в&nbsp;нишах с&nbsp;узкой аудиторией\./g,
    'в&nbsp;<a class="kontekstnaya-text-link" href="/blog/article/kontekstnaya-reklama-dlya-b2b-v-2026-godu-kak-privlechat-lidy/">нишах с&nbsp;узкой аудиторией</a>.',
  );
  s = s.replace(
    /Разместим рекламу в&nbsp;навигационных и&nbsp;картографических сервисах экосистемы Яндекса/g,
    'Разместим рекламу в&nbsp;<a class="kontekstnaya-text-link" href="/blog/article/kontekstnaya-i-georeklama-premium-segment/">навигационных и&nbsp;картографических сервисах</a> экосистемы Яндекса',
  );
  s = s.replace(
    /Собираем семантическое ядро, формируем портреты/g,
    'Собираем <a class="kontekstnaya-text-link" href="/blog/article/seo-ili-kontekstnaya-reklama-chto-vybrat/">семантическое ядро</a>, формируем портреты',
  );
  s = s.replace(
    /но и на качестве трафика\./g,
    'но и на <a class="kontekstnaya-text-link" href="/uvelichenie-konversii-saita">качестве трафика</a>.',
  );
  s = s.replace(
    /продаж с сайта\)/g,
    '<a class="kontekstnaya-text-link" href="/uvelichenie-konversii-saita">продаж с сайта</a>)',
  );
  return s;
}

// kontekstnaya: точечные ссылки без пересборки middle
{
  const file = "kontekstnaya_reklama/index.html";
  let html = patchKontekstnayaInternalLinks(read(file));
  write(file, html);
  console.log("ok: kontekstnaya_reklama/index.html (patch only)");
}

// seo
{
  const file = "seo/index.html";
  let html = patchSeoInternalLinks(read(file));
  write(file, html);
  console.log("ok: seo/index.html");
}

// korporativnyj
{
  const file = "korporativnyj_sajt/index.html";
  let html = patchKorporativnyjInternalLinks(read(file));
  write(file, html);
  console.log("ok: korporativnyj_sajt/index.html");
}

const internetPartials = [
  ["<!-- INTERNET-MAGAZINA-APPROACH-START -->", "<!-- INTERNET-MAGAZINA-APPROACH-END -->", "html/partials/services/sozdanie-internet-magazina-approach-block.html"],
  ["<!-- INTERNET-MAGAZINA-MARKETING-STAGE-START -->", "<!-- INTERNET-MAGAZINA-MARKETING-STAGE-END -->", "html/partials/services/sozdanie-internet-magazina-marketing-stage-block.html"],
];

for (const [s, e, p] of internetPartials) {
  syncPartial("sozdanie-internet-magazina", s, e, p);
}

syncPartial(
  "kompleksnoye-prodvizheniye",
  "<!-- KOMPLEKSNOYE-CHANNELS-USED-START -->",
  "<!-- KOMPLEKSNOYE-CHANNELS-USED-END -->",
  "html/partials/services/kompleksnoye-channels-used-block.html",
);

const homePartials = [
  "html/partials/section-services.html",
  "html/partials/section-home-cases.html",
];
for (const rel of homePartials) {
  const abs = path.join(root, rel);
  const before = fs.readFileSync(abs, "utf8");
  const after = patchHomeInterlinks(before);
  if (after !== before) {
    fs.writeFileSync(abs, after);
    console.log("ok: partial", rel);
  }
}

const marketingPartials = [
  "html/partials/services/marketing-phase2-middle.html",
  "html/partials/services/marketing-content-strategy-block.html",
  "html/partials/services/marketing-site-block.html",
  "html/partials/services/marketing-advertising-block.html",
  "html/partials/services/marketing-seo-block.html",
  "html/partials/services/marketing-sales-block.html",
];
for (const rel of marketingPartials) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const before = fs.readFileSync(abs, "utf8");
  const after = patchMarketingInterlinks(before);
  if (after !== before) {
    fs.writeFileSync(abs, after);
    console.log("ok: partial", rel);
  }
}

{
  const file = "index.html";
  let html = patchHomeInterlinks(read(file));
  write(file, html);
  console.log("ok:", file);
}

{
  const file = "services/index.html";
  let html = patchServicesIndexInterlinks(read(file));
  write(file, html);
  console.log("ok:", file);
}

{
  const file = "services/marketing/index.html";
  let html = patchMarketingInterlinks(read(file));
  write(file, html);
  console.log("ok:", file);
}

console.log("apply-interlinks-to-index: done");
