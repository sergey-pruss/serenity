#!/usr/bin/env node
/**
 * Хвост /strategy после «Команда»: блог, клиенты, кейсы, награды, синергия (prod /strategy).
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { renderSlides } = require("./lib/service-awards-render.cjs");
const { renderMorSlide, renderGridCase, buildCtaSlide } = require("./lib/build-more-cases-cards-html.cjs");

const ROOT = path.resolve(__dirname, "..");
const PARTIALS = path.join(ROOT, "html", "partials", "services");
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const CASES_ALL = path.join(ROOT, "json", "cases-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const AWARDS_SHELL = path.join(PARTIALS, "_service-awards.shell.html");

const STRATEGY_TOPIC_RE = /стратег|позиционирован|бренд-стратег/i;
const CURATED_BLOG_SLUGS = [
  "kak-sozdat-konkurentosposobnoe-imya",
  "prodvizhenie-brenda-v-telegram",
  "ekspress-instruktsiya-kak-ne-slit-reklamnyj-byudzhet",
];
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;

const STRATEGY_CLIENTS = [
  { name: "alfa", file: "PGi2bChOs2bXV2X4tL3pLVtNqreYGocLWQJwqX0V.png" },
  { name: "groop", file: "sCAHr1EVxx63n932wlgY12N3VvOym4rB0595WOJG.png" },
  { name: "word", file: "ipeVjURn4jlW7NGYMy9XAaIslnTydJ6vmmRQFGdh.svg" },
  { name: "orange business services", file: "bR5c6wK4E0fnHM77iHDSUFS4S0A3h99BlK4LRSYG.png" },
  { name: "mts", file: "h3JPY6U5ICIxcj7TiJOSX0O3DAqEVPjfkv3pkTTa.png" },
  { name: "miratorg", file: "VYilJPLPBBeu4APyQHjwOyBQPS93Tahs75rGmk8w.svg" },
  { name: "Volvo penta", file: "di6OvWVvImeiVprIQOsnSThMtQArzCThnt9aNQHl.png" },
  { name: "Газпром", file: "48eY8HtiowBxzmSHd4CppIf3uiamDHFxKTeIhHBQ.png" },
  { name: "Технониколь", file: "QfyxZ8bEL5NTkfkRPolKdC1eOsuKWtRagVlEgmTp.png" },
  { name: "Группа эталон", file: "NROwzT3nByfcmr5WtQFlPRD1nlfL3VxceucgN1C3.png" },
];

/** Карточек в блоке «Кейсы» — как на /seo и /targeting (сетка 4×2 на десктопе). */
const EXPECTED_STRATEGY_CASES = 8;
/** Порядок с prod /strategy (CMS more-cases-block, сейчас 5); добор — лента /case/all/ с тегом strategiya. */
const CURATED_STRATEGY_CASE_SLUGS = [
  "schaeferfliesen",
  "solvik",
  "alfakabel",
  "orange",
  "kaury",
];

const STRATEGY_AWARDS = [
  { rating: "Рейтинг Рунета", year: "2025", description: "6 место в России по разработке бренд-стратегий", href: null },
  { rating: "Рейтинг Рунета", year: "2025", description: "5 место в России по анализу бренда", href: null },
  { rating: "Рейтинг Рунета", year: "2023", description: "1 место в России по разработке позиционирования", href: null },
  { rating: "Рейтинг Рунета", year: "2019", description: "6 место в рейтинге креативности веб-студий", href: null },
  {
    rating: "Tagline",
    year: "2018",
    description: "3 место в Санкт-Петербурге в рейтинге креативных digital-агентств",
    href: null,
  },
  { rating: "Рейтинг Рунета", year: "2021", description: "2 место в СПб в рейтинге брендинговых агентств", href: null },
  { rating: "Рейтинг Рунета", year: "2023", description: "3 место в СПб в рейтинге брендинговых агентство", href: null },
];

const STRATEGY_SYNERGY = [
  {
    title: "Комплексное продвижение",
    description: "Доносим преимущества бренда до аудитории и увеличиваем конверсию через различные инструменты.",
    href: "/kompleksnoye-prodvizheniye",
    img: {
      desc: "/_sa/img/services/strategy/synergy/kompleksnoe-desc.png",
      tablet: "/_sa/img/services/strategy/synergy/kompleksnoe-tablet.png",
      mobile: "/_sa/img/services/strategy/synergy/kompleksnoe-mobile.png",
    },
  },
  {
    title: "Сайт",
    description:
      "Создаем сайты, помогающие раскрыть бренд, влюбить в себя клиентов, увеличить продажи продуктов и услуг.",
    href: "/services/production",
    img: {
      desc: "/_sa/img/services/strategy/synergy/site-desc.png",
      tablet: "/_sa/img/services/strategy/synergy/site-tablet.png",
      mobile: "/_sa/img/services/strategy/synergy/site-mobile.png",
    },
  },
  {
    title: "Контент-маркетинг",
    description: "Исследуем нишу компании и формируем вокруг бренда аудиторию, которая рекомендует вас другим.",
    href: "/content",
    img: {
      desc: "/_sa/img/services/strategy/synergy/content-desc.png",
      tablet: "/_sa/img/services/strategy/synergy/content-tablet.png",
      mobile: "/_sa/img/services/strategy/synergy/content-mobile.png",
    },
  },
  {
    title: "Комплексный SMM",
    description:
      "Создаем сильный бренд, регулярно общаемся с аудиторией и отслеживаем ее путь от поста до покупки.",
    href: "/smm_marketing",
    img: {
      desc: "/_sa/img/services/strategy/synergy/smm-desc.png",
      tablet: "/_sa/img/services/strategy/synergy/smm-tablet.png",
      mobile: "/_sa/img/services/strategy/synergy/smm-mobile.png",
    },
  },
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

function normalizeCaseRow(c) {
  return { ...c, href: hrefForPage(c.href) };
}

function pickStrategyCasesForBlock() {
  if (!fs.existsSync(CASES_ALL)) {
    throw new Error("Нет json/cases-all.json — npm run build:cases");
  }
  const { cases } = JSON.parse(fs.readFileSync(CASES_ALL, "utf8"));
  const bySlug = new Map();
  for (const c of cases) {
    const slug = caseSlugFromHref(c.href);
    if (slug) bySlug.set(slug, c);
  }
  const picked = [];
  const seen = new Set();
  for (const slug of CURATED_STRATEGY_CASE_SLUGS) {
    const c = bySlug.get(slug);
    if (!c) throw new Error(`strategy more-cases: нет кейса «${slug}» в cases-all.json`);
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  for (const c of cases) {
    if (picked.length >= EXPECTED_STRATEGY_CASES) break;
    if (!c.tagCodes?.includes("strategiya")) continue;
    const slug = caseSlugFromHref(c.href);
    if (!slug || seen.has(slug)) continue;
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  if (picked.length !== EXPECTED_STRATEGY_CASES) {
    throw new Error(
      `strategy more-cases: нужно ${EXPECTED_STRATEGY_CASES} кейсов с тегом «Стратегия», есть ${picked.length}`,
    );
  }
  return picked;
}

function articleTopicMeta(slug) {
  const file = path.join(ROOT, "json", "blog-articles", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { title: j.title || "", description: j.description || "" };
}

function postIsStrategyTopic(post) {
  if (STRATEGY_TOPIC_RE.test(post.description || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return STRATEGY_TOPIC_RE.test(meta.title) || STRATEGY_TOPIC_RE.test(meta.description);
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function selectStrategyBlogPosts(posts) {
  const topic = posts.filter((p) => postIsStrategyTopic(p) && publishYear(p) >= MIN_PUBLISH_YEAR);
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
  if (post.isResource !== false) parts.push("case--resource");
  /* Высота ряда = max(слайды); без case-cutted карточка 500px и пустота до «Наши клиенты». */
  parts.push("case-cutted");
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
  const inner = `${template.slice(0, contentStart)}\n${slides}\n${template.slice(tailStart)}`;
  return `<section class="page-constructor__section strategy-blog-section">
${inner.trim()}
</section>`;
}

function buildClientsPartial() {
  const renderSlide = (c, i) =>
    `<a data-v-08586076="" class="swiper-slide clients-new__slide" data-swiper-slide-index="${i}" style="margin-right: 40px;"><img data-v-08586076="" src="/_sa/img/storage__${c.file}" alt="${escapeXml(c.name)}" loading="lazy"></a>`;
  const once = STRATEGY_CLIENTS.map((c, i) => renderSlide(c, i));
  const slides = [...once, ...once, ...once].join("");
  return `<section class="page-constructor__section strategy-clients-section">
<div data-v-6f8a040c="" style="z-index: 10">
              <div data-v-08586076="" class="clients-wrapper clients-mainstr clients-wrapper_main-structure"><div data-v-08586076="" class="clients-new-section home-between"><div data-v-08586076="" class="clients-new home-ledge"><h2 data-v-08586076="" class="home-clients-awards__title">
        Наши клиенты
      </h2> <div data-v-08586076="" class="swiper-buttons"><div data-v-08586076="" class="swiper-button-prev" tabindex="0" role="button" aria-label="Previous slide" aria-disabled="false"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" class=""><path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div> <div data-v-08586076="" class="swiper-button-next" tabindex="0" role="button" aria-label="Next slide" aria-disabled="false"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" class=""><path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div></div></div> <div data-v-08586076="" class="swiper-container swiper-container-clients-new"><div data-v-08586076="" class="swiper-wrapper clients-new__context-wrapper">${slides}</div></div></div></div>
            </div>
</section>`;
}

function buildMoreCasesPartial(strategyCases) {
  const slides = strategyCases.map((c) => renderMorSlide(c)).join("");
  const cta = buildCtaSlide("/case/all/");
  const gridCases = strategyCases.map((c, i) => {
    const card = {
      ...c,
      description: processTypographyHtml(c.description, { force: true }).html.replace(/<[^>]+>/g, ""),
    };
    return renderGridCase(card, i);
  }).join("");
  const lastCase = `<a data-v-27a87df0="" href="/case/all/" class="last-case"><p data-v-27a87df0="">Смотреть больше&nbsp;кейсов</p> <img data-v-27a87df0="" src="/_sa/img/video__lastBlogGif.gif" loop="loop" playsinline="" loading="lazy" class="video_last"> <div data-v-27a87df0="" class="last-case__bg"></div></a>`;
  const grid = `<div data-v-27a87df0="" class="more-cases"><h3 class="services__title kontekstnaya-page__section-heading">Кейсы</h3> <div data-v-27a87df0="" class="more-cases__item">${gridCases} ${lastCase}</div></div>`;
  return `<section class="page-constructor__section strategy-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container"><div data-v-38965faa="" class="swiper-wrapper">${slides}${cta} </div> <div data-v-38965faa="" class="swiper-pagination"></div></div></div> ${grid}</div></div></section>`;
}

function buildAwardsPartial() {
  const shell = fs.readFileSync(AWARDS_SHELL, "utf8");
  const slidesHtml = renderSlides(STRATEGY_AWARDS);
  let sectionHtml = shell
    .replace("__HEADING_ID__", "strategy-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml);
  sectionHtml = sectionHtml.replace(
    '<section class="page-constructor__section">',
    '<section class="page-constructor__section strategy-awards-section">',
  );
  return `<!-- Награды /strategy: json/services/strategy/awards.json + home-awards.css. -->\n${sectionHtml}`;
}

function synergyImgCard(card) {
  const desc = processTypographyHtml(card.description, { force: true }).html;
  return `<div data-v-627ccbce="" class="synergy__slide swiper-slide" style="margin-right: 30px;"><div data-v-627ccbce=""><div data-v-627ccbce="" class="synergy__card"><a data-v-627ccbce="" href="${escapeXml(card.href)}" target="_blank" class="synergy__card-container synergy__card-container-img" style="cursor: pointer;"><h3 data-v-627ccbce="">${escapeXml(card.title)}</h3> <!----> <p data-v-627ccbce="" class="synergy__card-description">${desc}</p> <!----> <div data-v-627ccbce="" class="synergy__card-img-wr"><img data-v-627ccbce="" src="${escapeXml(card.img.desc)}" alt="#" loading="lazy" class="synergy__card-img synergy__card-img_desc"> <img data-v-627ccbce="" src="${escapeXml(card.img.tablet)}" alt="#" loading="lazy" class="synergy__card-img synergy__card-img_tablet"> <img data-v-627ccbce="" src="${escapeXml(card.img.mobile)}" alt="#" loading="lazy" class="synergy__card-img synergy__card-img_mobile"></div></a> <!----></div></div></div>`;
}

function buildSynergyPartial() {
  const slides = STRATEGY_SYNERGY.map((c) => synergyImgCard(c)).join("");
  return `<section class="page-constructor__section strategy-synergy-section">
<div data-v-627ccbce="" class="synergy__text"><h2 data-v-627ccbce="" class="synergy__title">Синергия с&nbsp;услугами</h2></div> <div data-v-627ccbce="" class="synergy__context-slider swiper-container"><div data-v-627ccbce="" class="synergy__context-wrapper swiper-wrapper" style="transform: translate3d(0px, 0px, 0px);">${slides}</div> <div data-v-627ccbce=""><button data-v-627ccbce="" class="swiper-button-next" tabindex="0" role="button" aria-label="Next slide" aria-disabled="false"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button> <button data-v-627ccbce="" class="swiper-button-prev swiper-button-disabled" style="transform: rotate(180deg);" tabindex="0" role="button" aria-label="Previous slide" aria-disabled="true"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button></div></div>
</section>`;
}

function main() {
  if (!fs.existsSync(BLOGS_ALL)) {
    console.error("Нет json/blogs-all.json — npm run build:blog-prereq");
    process.exit(1);
  }
  const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
  const blogPosts = selectStrategyBlogPosts(posts);
  if (!blogPosts.length) {
    console.error("Нет материалов для блога strategy");
    process.exit(1);
  }

  const strategyCases = pickStrategyCasesForBlock();
  const moreCasesHtml = buildMoreCasesPartial(strategyCases);
  const moreCasesManifestPath = path.join(ROOT, "json", "services", "strategy", "more-cases-manifest.json");
  fs.mkdirSync(path.dirname(moreCasesManifestPath), { recursive: true });
  fs.writeFileSync(
    moreCasesManifestPath,
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "5 curated (prod /strategy CMS) + fill /case/all/ strategiya",
        expected: EXPECTED_STRATEGY_CASES,
        hrefs: strategyCases.map((c) => c.href),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const awardsJson = {
    headingId: "strategy-awards-heading",
    mountId: "sa-home-awards-mounted",
    awards: STRATEGY_AWARDS,
  };
  const awardsJsonPath = path.join(ROOT, "json", "services", "strategy", "awards.json");
  fs.mkdirSync(path.dirname(awardsJsonPath), { recursive: true });
  fs.writeFileSync(awardsJsonPath, `${JSON.stringify(awardsJson, null, 2)}\n`, "utf8");

  const moreCasesJsonPath = path.join(ROOT, "json", "services", "strategy", "more-cases.json");
  fs.writeFileSync(
    moreCasesJsonPath,
    `${JSON.stringify({ bodyHtml: moreCasesHtml }, null, 2)}\n`,
    "utf8",
  );

  const outputs = [
    ["blog-strategy.html", buildBlogPartial(blogPosts)],
    ["clients-strategy.html", buildClientsPartial()],
    ["more-cases-strategy.html", moreCasesHtml],
    ["awards-strategy.html", buildAwardsPartial()],
    ["synergy-strategy.html", buildSynergyPartial()],
  ];

  for (const [name, html] of outputs) {
    const out = processTypographyHtml(html, { force: true }).html;
    fs.writeFileSync(path.join(PARTIALS, name), `${out.trim()}\n`, "utf8");
    console.log("Wrote html/partials/services/" + name);
  }
  console.log("blog cards:", blogPosts.length);
  console.log("more-cases:", strategyCases.length, strategyCases.map((c) => caseSlugFromHref(c.href)).join(", "));
}

main();
