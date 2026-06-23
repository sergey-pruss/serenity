#!/usr/bin/env node
/**
 * Хвост /uvelichenie-konversii-saita после FAQ: блог, кейсы, награды, синергия (prod CMS).
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { renderSlides } = require("./lib/service-awards-render.cjs");
const { renderMorSlide, renderGridCase, buildCtaSlide } = require("./lib/build-more-cases-cards-html.cjs");

const ROOT = path.resolve(__dirname, "..");
const SLUG = "uvelichenie-konversii-saita";
const PARTIALS = path.join(ROOT, "html", "partials", "services");
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const CASES_ALL = path.join(ROOT, "json", "cases-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const AWARDS_SHELL = path.join(PARTIALS, "_service-awards.shell.html");
const SYNERGY_SRC = path.join(PARTIALS, "synergy-seo.html");

const UKS_TOPIC_RE = /конверси|ux|юзабил|трафик|сайт|seo|продуктов|каталог/i;
const CURATED_BLOG_SLUGS = [
  "produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi",
  "produktovaya-analitika-cherez-glubinnye-ux-ui-intervyu",
  "kak-uvelichit-trafik-sajta",
  "kak-optimizirovat-izobrazheniya-na-sajte",
  "etapy-seo-prodvizheniya-sajta",
];
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;

/** Карточек в блоке «Кейсы» — как /seo и /strategy. */
const EXPECTED_UKS_CASES = 8;

/**
 * Кейсы по теме UKS: конверсия, заявки, трафик, e-commerce с измеримым результатом.
 * Порядок: prod-релевантные + метрики воронки (см. more-cases-manifest.json).
 */
const CURATED_CASE_SLUGS = [
  "darkrain-store",
  "skladno-internet-magazin-mebeli",
  "evrostroj",
  "awm-trade",
  "sunseeker",
  "kaskad",
  "mosplitka",
  "gio-welness",
];

const UKS_CASE_TOPIC_RE = /конверси|заявк|обращен|продаж|romi|чек|трафик|посещаемост|каталог|интернет-магазин|e-?commerce|юзабил|ux|сайт/i;
const UKS_CASE_RESULT_RE = /увеличил|снизил|в\s+\d+\s+раз|на\s+\d+\s*%|окупил/i;

const UKS_AWARDS = [
  {
    rating: "Workspace Digital",
    year: "2024",
    description: "1 место за комплексные услуги для eCom бренда Darkrain",
    href: "https://workspace.ru/awards/cases/kompleksnaya-usluga-dlya-peterburgskogo-brenda-ukrasheniy-darkrain/",
  },
  { rating: "Рейтинг Рунета", year: "2024", description: "4 место в России по SEO-аудиту сайтов", href: null },
  { rating: "Рейтинг Рунета", year: "2024", description: "4 место в СПб по комплексному продвижению в интернете", href: null },
  {
    rating: "Рейтинг Рунета",
    year: "2024",
    description: "16 место в России по комплексному продвижению корпоративных сайтов",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "44 место по России в рейтинге разработчиков сайтов",
    href: "https://api.cabinet.cmsmagazine.ru/diplom/show/a8e587222488d8c01db74777375e8bf9",
  },
  {
    rating: "Рейтинг Рунета",
    year: "2023",
    description: "13 место в Санкт-Петербурге по разработке корпоративных цифровых решений",
    href: null,
  },
  { rating: "Ruward", year: "2021", description: "14 место в России по цифровой трансформации бизнеса", href: null },
  { rating: "Золотой<br>сайт", year: "2016", description: "1 место в номинации «Сайт магазина розничной торговли»", href: null },
];

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hrefForPage(href) {
  let h = String(href || "").trim();
  if (!h) return "#";
  try {
    const u = new URL(h, "https://serenity.agency");
    h = u.pathname || h;
  } catch {
    /* keep */
  }
  if (h.endsWith("/")) h = h.slice(0, -1);
  return h;
}

function slugFromHref(href) {
  const m = String(href).match(/\/blog\/(?:article|case)\/([^/]+)/);
  return m ? m[1] : null;
}

function caseSlugFromHref(href) {
  const h = hrefForPage(href);
  const m = h.match(/\/case(?:\/all)?\/([^/]+)$/);
  return m ? m[1] : null;
}

function caseIsUksTopic(c) {
  const desc = c.description || "";
  const tags = (c.tags || []).join(" ");
  return UKS_CASE_TOPIC_RE.test(`${desc} ${tags}`) && UKS_CASE_RESULT_RE.test(desc);
}

function normalizeCaseRow(c) {
  return { ...c, href: hrefForPage(c.href) };
}

function articleTopicMeta(slug) {
  const file = path.join(ROOT, "json", "blog-articles", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { title: j.title || "", description: j.description || "" };
}

function postIsUksTopic(post) {
  if (UKS_TOPIC_RE.test(post.description || "") || UKS_TOPIC_RE.test(post.subtitle || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return UKS_TOPIC_RE.test(meta.title) || UKS_TOPIC_RE.test(meta.description);
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function selectUksBlogPosts(posts) {
  const topic = posts.filter((p) => postIsUksTopic(p) && publishYear(p) >= MIN_PUBLISH_YEAR);
  const seen = new Set(topic.map((p) => hrefForPage(p.href)));
  const extra = [];
  for (const slug of CURATED_BLOG_SLUGS) {
    const p = posts.find((x) => slugFromHref(x.href) === slug);
    if (!p || publishYear(p) < MIN_PUBLISH_YEAR) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    extra.push(p);
  }
  return [...topic, ...extra]
    .sort((a, b) => publishTime(b) - publishTime(a))
    .slice(0, SLIDE_COUNT_MAX);
}

function linkClasses(post) {
  const parts = ["case", post.linkClass === "dark-text" ? "dark-text" : "white-text"];
  if (post.isResource !== false) parts.push("case--resource", "case-cutted");
  parts.push("more-blog-case");
  for (const code of post.tagCodesNorm || []) {
    if (code === "article") parts.push("articles");
    else if (code) parts.push(code);
  }
  return parts.join(" ");
}

function renderBlogSlide(post, idx) {
  const tagsHtml = (post.tags || [])
    .map(
      (t) =>
        `<span data-v-410c06b6="" class="case__tag">\n                            ${escapeXml(t)}\n                          </span>`,
    )
    .join("\n                          ");
  const imageUrl =
    post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
  const slideClass =
    idx === 0
      ? "swiper-slide blog-block__content-box-slide swiper-slide-active"
      : "swiper-slide blog-block__content-box-slide";
  const href = escapeXml(hrefForPage(post.href));
  const imgSrc = escapeXml(imageUrl || "");
  const alt = post.description ? escapeXml(post.description) : "";

  return `                    <div data-v-25bf775d="" class="${slideClass}" style="margin-right: 30px">
                      <a data-v-410c06b6="" data-v-25bf775d="" href="${href}" class="${linkClasses(post)}"
                        ><div data-v-410c06b6="" class="case__tags">${tagsHtml}</div>
                        <div data-v-410c06b6="" class="case__top">
                          <p data-v-410c06b6="" class="case__description case__description--static">${escapeXml(post.description)}</p>
                          <p data-v-410c06b6="" class="case__subtitle">${escapeXml(post.subtitle || "")}</p>
                        </div>
                        <div data-v-410c06b6="" class="case__media zoom">
                          <img fetchpriority="low" decoding="async" data-v-410c06b6="" src="${imgSrc}" loading="lazy" class="case__media--front" alt="${alt}" />
                        </div>
                        <div data-v-410c06b6="" class="blur"></div
                      ></a>
                    </div>`;
}

function buildBlogPartial(posts) {
  const template = fs.readFileSync(BLOG_TEMPLATE, "utf8");
  const wrapIdx = template.indexOf('class="swiper-wrapper"');
  const contentStart = template.indexOf(">", wrapIdx) + 1;
  const lastBox = template.indexOf('class="blog-box blog-box__last"');
  const tailStart = template.lastIndexOf("<div", lastBox);
  const slides = posts.map((p, i) => renderBlogSlide(p, i)).join("\n");
  let inner = `${template.slice(0, contentStart)}\n${slides}\n${template.slice(tailStart)}`;
  inner = inner.replace(
    /<h2 data-v-56f85d51="" class="services__title">Блог<\/h2>/,
    '<h2 data-v-56f85d51="" class="services__title kontekstnaya-page__section-heading">Блог</h2>',
  );
  inner = inner.replace(
    /Делимся стратегиями\. Рассказываем о маркетинговых[\s\S]*?внутренней кухни\./,
    "Рассказываем про UX, аналитику и&nbsp;улучшение сайта. Делимся подходами к&nbsp;росту конверсии.",
  );
  inner = inner.replace(/\s*swiper-container-initialized/g, "");
  inner = inner.replace(/\s*swiper-container-horizontal/g, "");
  inner = inner.replace(/\s*swiper-container-free-mode/g, "");
  return `<section class="page-constructor__section uks-blog-section">
${inner.trim()}
</section>`;
}

function pickUksCases() {
  if (!fs.existsSync(CASES_ALL)) throw new Error("Нет json/cases-all.json");
  const { cases } = JSON.parse(fs.readFileSync(CASES_ALL, "utf8"));
  const bySlug = new Map();
  for (const c of cases) {
    const slug = caseSlugFromHref(c.href);
    if (slug) bySlug.set(slug, normalizeCaseRow(c));
  }
  const picked = [];
  const seen = new Set();
  for (const slug of CURATED_CASE_SLUGS) {
    const c = bySlug.get(slug);
    if (!c) throw new Error(`uks more-cases: нет кейса «${slug}» в cases-all.json`);
    picked.push(c);
    seen.add(slug);
  }
  for (const c of cases) {
    if (picked.length >= EXPECTED_UKS_CASES) break;
    const slug = caseSlugFromHref(c.href);
    if (!slug || seen.has(slug)) continue;
    if (!caseIsUksTopic(c)) continue;
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  if (picked.length !== EXPECTED_UKS_CASES) {
    throw new Error(
      `uks more-cases: нужно ${EXPECTED_UKS_CASES} кейсов по теме UKS, есть ${picked.length}`,
    );
  }
  return picked;
}

function buildMoreCasesPartial(uksCases) {
  const slides = uksCases.map((c) => renderMorSlide(c)).join("");
  const cta = buildCtaSlide("/case/all/");
  const gridCases = uksCases
    .map((c, i) => {
      const card = {
        ...c,
        description: processTypographyHtml(c.description, { force: true }).html.replace(/<[^>]+>/g, ""),
      };
      return renderGridCase(card, i);
    })
    .join("");
  const lastCase = `<a data-v-27a87df0="" href="/case/all/" class="last-case"><p data-v-27a87df0="">Смотреть больше&nbsp;кейсов</p> <img data-v-27a87df0="" src="/_sa/img/video__lastBlogGif.gif" loop="loop" playsinline="" loading="lazy" class="video_last"> <div data-v-27a87df0="" class="last-case__bg"></div></a>`;
  const grid = `<div data-v-27a87df0="" class="more-cases"><h3 class="services__title kontekstnaya-page__section-heading">Кейсы</h3> <div data-v-27a87df0="" class="more-cases__item">${gridCases} ${lastCase}</div></div>`;
  return `<section class="page-constructor__section uks-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container"><div data-v-38965faa="" class="swiper-wrapper">${slides}${cta} </div> <div data-v-38965faa="" class="swiper-pagination"></div></div></div> ${grid}</div></div></section>`;
}

function buildAwardsPartial() {
  const shell = fs.readFileSync(AWARDS_SHELL, "utf8");
  const slidesHtml = renderSlides(UKS_AWARDS);
  let sectionHtml = shell
    .replace("__HEADING_ID__", "uks-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml);
  sectionHtml = sectionHtml.replace(
    '<section class="page-constructor__section">',
    '<section class="page-constructor__section uks-awards-section">',
  );
  return `<!-- Награды /uvelichenie-konversii-saita: json/services/${SLUG}/awards.json + home-awards.css. -->\n${sectionHtml}`;
}

function buildSynergyPartial() {
  if (!fs.existsSync(SYNERGY_SRC)) {
    throw new Error(`Нет ${SYNERGY_SRC} — сначала соберите synergy-seo.html`);
  }
  let html = fs.readFileSync(SYNERGY_SRC, "utf8");
  html = html.replace(/^<!--[\s\S]*?-->\s*/, "");
  html = html.replace("seo-synergy-section", "uks-synergy-section");
  return `<!-- Синергия /uvelichenie-konversii-saita: как /seo (связанные услуги для роста конверсии). -->\n${html.trim()}\n`;
}

function main() {
  if (!fs.existsSync(BLOGS_ALL)) {
    console.error("Нет json/blogs-all.json");
    process.exit(1);
  }
  const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
  const blogPosts = selectUksBlogPosts(posts);
  if (!blogPosts.length) {
    console.error("Нет материалов для блога UKS");
    process.exit(1);
  }

  const uksCases = pickUksCases();
  const moreCasesHtml = buildMoreCasesPartial(uksCases);

  const jsonDir = path.join(ROOT, "json", "services", SLUG);
  fs.mkdirSync(jsonDir, { recursive: true });

  fs.writeFileSync(
    path.join(jsonDir, "more-cases.json"),
    `${JSON.stringify({ bodyHtml: moreCasesHtml }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(jsonDir, "awards.json"),
    `${JSON.stringify(
      { headingId: "uks-awards-heading", mountId: "sa-home-awards-mounted", awards: UKS_AWARDS },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(jsonDir, "more-cases-manifest.json"),
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "8 curated UKS-topic cases (conversion, leads, traffic, e-commerce metrics)",
        expected: EXPECTED_UKS_CASES,
        hrefs: uksCases.map((c) => c.href),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const outputs = [
    ["blog-uvelichenie-konversii-saita.html", buildBlogPartial(blogPosts)],
    ["more-cases-uvelichenie-konversii-saita.html", moreCasesHtml],
    ["awards-uvelichenie-konversii-saita.html", buildAwardsPartial()],
    ["synergy-uvelichenie-konversii-saita.html", buildSynergyPartial()],
  ];

  for (const [name, html] of outputs) {
    const out = processTypographyHtml(html, { force: true }).html;
    fs.writeFileSync(path.join(PARTIALS, name), `${out.trim()}\n`, "utf8");
    console.log("Wrote html/partials/services/" + name);
  }
  console.log("blog cards:", blogPosts.length);
  console.log("more-cases:", uksCases.map((c) => caseSlugFromHref(c.href)).join(", "));
}

main();
