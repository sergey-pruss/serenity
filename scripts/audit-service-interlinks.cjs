#!/usr/bin/env node
/**
 * Аудит текстовых перелинковок в основном контенте страниц услуг.
 * Исключает: блог, синергию, клиентов, кейсы/слайды кейсов, факты, FAQ.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const PAGES = [
  { slug: "kontekstnaya_reklama", title: "Контекстная реклама", file: "kontekstnaya_reklama/index.html" },
  { slug: "korporativnyj_sajt", title: "Корпоративный сайт", file: "korporativnyj_sajt/index.html" },
  { slug: "sozdanie-internet-magazina", title: "Интернет-магазин", file: "sozdanie-internet-magazina/index.html" },
  { slug: "uvelichenie-konversii-saita", title: "УКС", file: "uvelichenie-konversii-saita/index.html" },
  { slug: "tehnicheskaya-podderzhka-saita", title: "Техподдержка", file: "tehnicheskaya-podderzhka-saita/index.html" },
  { slug: "kompleksnoye-prodvizheniye", title: "Комплексное продвижение", file: "kompleksnoye-prodvizheniye/index.html" },
  { slug: "seo", title: "SEO-продвижение", file: "seo/index.html" },
  { slug: "prodvizhenie-yandex-karty-2gis", title: "Продвижение в Яндекс Картах", file: "prodvizhenie-yandex-karty-2gis/index.html" },
  {
    slug: "prodvizhenie-statey-v-dzene-i-promostranitsah",
    title: "Продвижение в Дзене",
    file: "prodvizhenie-statey-v-dzene-i-promostranitsah/index.html",
  },
  { slug: "strategy", title: "Маркетинговая стратегия", file: "strategy/index.html" },
];

const EXCLUDE_MARKERS = [
  /faq-section|korporativnyj-faq|uks-faq|tehpod-faq/i,
  /blog-block|more-blog|section-blog/i,
  /kontekst-synergy|synergy-root/i,
  /clients-new-section|clients-wrapper_main|home-clients-awards/i,
  /more-case-wr|mor-cases-slider|more-cases__/i,
  /cases-block__slider|internet-magazina-case-slider/i,
  /facts-section|internet-magazina-facts|class="facts"/i,
  /awards__card-wraper|home-awards/i,
];

const LINK_RE = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const H2_RE = /<h2[^>]*>([\s\S]*?)<\/h2>/i;
const H3_RE = /<h3[^>]*class="block__name"[^>]*>([\s\S]*?)<\/h3>/i;

function stripTags(s) {
  return String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isExcludedChunk(html) {
  return EXCLUDE_MARKERS.some((re) => re.test(html));
}

function extractMain(html) {
  const start = html.indexOf('class="page-constructor');
  const endMarkers = [
    "<!-- INTERNET-MAGAZINA-FAQ-START -->",
    '<section class="page-constructor__section korporativnyj-faq-section',
    '<section class="page-constructor__section uks-faq-section',
    '<section class="page-constructor__section tehpod-faq-section',
    '<section class="page-constructor__section kontekst-synergy-root',
    'class="clients-new-section home-between"',
    'class="more-case-wr more-case-wr__main"',
    'class="component-block blog-block-mainstr',
  ];
  let end = html.length;
  for (const m of endMarkers) {
    const i = html.indexOf(m);
    if (i > start && i < end) end = i;
  }
  if (start < 0) return html;
  return html.slice(start, end);
}

function findBlockTitle(before) {
  const h3s = [...before.matchAll(/<h3[^>]*class="block__name"[^>]*>([\s\S]*?)<\/h3>/gi)];
  if (h3s.length) return stripTags(h3s[h3s.length - 1][1]);
  const h2s = [...before.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  if (h2s.length) return stripTags(h2s[h2s.length - 1][1]);
  return "—";
}

function findSectionTitle(before) {
  const sections = before.split(/<section class="page-constructor__section"/);
  const last = sections[sections.length - 1] || "";
  const h2 = last.match(H2_RE);
  if (h2) return stripTags(h2[1]);
  const hero = last.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (hero && sections.length <= 2) return "Hero: " + stripTags(hero[1]);
  return "—";
}

function extractLinks(html) {
  const main = extractMain(html);
  const links = [];
  let m;
  const seen = new Set();
  while ((m = LINK_RE.exec(main))) {
    const full = m[0];
    const href = m[1];
    const anchor = stripTags(m[2]);
    if (!href.startsWith("/")) continue;
    if (href.startsWith("/case")) continue;
    if (href === "/blog" || href.startsWith("/blog/")) {
      // blog articles in main content — include; blog block excluded by chunk
    }
    const idx = m.index;
    const chunkStart = Math.max(0, idx - 4000);
    const chunk = main.slice(chunkStart, idx + 500);
    if (isExcludedChunk(chunk)) continue;
    const key = `${href}|${anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const before = main.slice(0, idx);
    links.push({
      href,
      anchor,
      block: findBlockTitle(before),
      section: findSectionTitle(before),
    });
  }
  return links;
}

for (const p of PAGES) {
  const fp = path.join(root, p.file);
  if (!fs.existsSync(fp)) {
    console.log(`\n=== ${p.title} (${p.slug}) === FILE MISSING`);
    continue;
  }
  const html = fs.readFileSync(fp, "utf8");
  const links = extractLinks(html);
  console.log(`\n=== ${p.title} (${p.slug}) — ${links.length} уникальных ссылок ===`);
  for (const l of links) {
    console.log(`  [${l.section}] / ${l.block}`);
    console.log(`    «${l.anchor}» → ${l.href}`);
  }
}
