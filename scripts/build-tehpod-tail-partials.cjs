#!/usr/bin/env node
/**
 * Хвост /tehnicheskaya-podderzhka-saita: блог, кейсы, награды, синергия.
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { renderSlides } = require("./lib/service-awards-render.cjs");
const { renderMorSlide, renderGridCase, buildCtaSlide } = require("./lib/build-more-cases-cards-html.cjs");

const ROOT = path.resolve(__dirname, "..");
const SLUG = "tehnicheskaya-podderzhka-saita";
const PARTIALS = path.join(ROOT, "html", "partials", "services");
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const CASES_ALL = path.join(ROOT, "json", "cases-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const AWARDS_SHELL = path.join(PARTIALS, "_service-awards.shell.html");
const SYNERGY_IMG = `/_sa/img/services/${SLUG}/synergy`;

const TEHPOD_TOPIC_RE = /поддержк|сайт|ux|seo|технич|интеграц|безопасност|cms|devops|обновлен|каталог|интернет-магазин/i;
const CURATED_BLOG_SLUGS = [
  "produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi",
  "produktovaya-analitika-cherez-glubinnye-ux-ui-intervyu",
  "kak-optimizirovat-izobrazheniya-na-sajte",
  "kak-oformlyat-stati-na-sajte-tak-chtoby-ih-chitali",
  "seo-pri-pereezde-sajta-kak-ne-poteryat-pozitsii-i-trafik",
  "rabotaem-nad-uluchsheniem-chitaemosti-teksta-na-sajte",
  "etapy-seo-prodvizheniya-sajta",
  "seo-optimizatsiya-internet-magazina",
  "kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit",
  "kak-uvelichit-trafik-sajta",
  "kontent-dlya-sajta-strategiya-i-prakticheskie-sovety-ot-serenity",
  "kak-sozdat-kachestvennyj-tekst-dlya-sajta-prakticheskoe-rukovodstvo",
  "prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet",
];
const EXCLUDED_BLOG_SLUGS = new Set([
  "rabota-s-auditoriej-konkurentov-cherez-vk-reklamu-parsing-i-sms-kanaly",
  "kak-prodvigat-magazin-vkontakte-s-nulya",
  "kak-rabotaet-targetirovannaya-reklama-v-telegram-sekrety-uspeha",
  "lidformy-kak-uvelichit-obem-zayavok-iz-facebook-i-instagram",
]);
const TEHPOD_BLOG_OFF_TOPIC_RE =
  /\bvk\b|вконтакт|instagram|facebook|telegram|таргет|конкурент|парсинг|sms-канал/i;
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;
const EXPECTED_CASES = 8;

const CURATED_CASE_SLUGS = [
  "darkrain-store",
  "skladno-internet-magazin-mebeli",
  "sytnie-ugodia",
  "volvo-penta",
  "cromi",
  "riderra",
  "evrostroj",
  "gio-welness",
];

const TEHPOD_CASE_TOPIC_RE =
  /поддержк|техподдерж|сайт|ux|обновлен|интеграц|безопасност|производительност|seo|каталог|интернет-магазин|e-?commerce|трафик|заявк/i;
const TEHPOD_CASE_RESULT_RE = /увеличил|снизил|в\s+\d+\s+раз|на\s+\d+\s*%|окупил|развиваем|поддерж/i;

const TEHPOD_AWARDS = [
  {
    rating: "Workspace Digital",
    year: "2025",
    description: "16 место в списке самых награждаемых маркетинговых агентств",
    href: null,
  },
  {
    rating: "Ruward",
    year: "2025",
    description: "17 место в рейтинге России по технической поддержке веб-проектов",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2023",
    description: "13 место в Санкт-Петербурге по разработке корпоративных цифровых решений",
    href: null,
  },
  {
    rating: "Ruward",
    year: "2022",
    description: "2 место в России по performance-маркетингу для IT-услуг и сервисов",
    href: null,
  },
  {
    rating: "Рейтинг АКАР",
    year: "2022",
    description: "ТОП-85 по России в Digital Non-Media Rating",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "44 место по России в рейтинге разработчиков сайтов",
    href: "https://api.cabinet.cmsmagazine.ru/diplom/show/a8e587222488d8c01db74777375e8bf9",
  },
  {
    rating: "Золотой<br>сайт",
    year: "2016",
    description: "1 место в номинации «Сайт магазина розничной торговли»",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2021",
    description: "19 место в России в рейтинге разработчиков сайта типа «Лендинг»",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "30 место в рейтинге ведущих веб-студий СПб",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "29 место по России в рейтинге разработчиков сайтов на Tilda",
    href: null,
  },
];

const SYNERGY_CARDS = [
  {
    title: "Сайты",
    href: "/services/production",
    description:
      "Создаем сайты, помогающие раскрыть бренд, влюбить в&nbsp;себя клиентов, увеличить продажи продуктов и&nbsp;услуг.",
    imgDesc: `${SYNERGY_IMG}/sajty-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/sajty-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/sajty-mobile.webp`,
  },
  {
    title: "Корпоративный сайт",
    href: "/korporativnyj_sajt",
    description: "Создаем сайты, которые раскрывают бренд и&nbsp;налаживают контакт с&nbsp;покупателями.",
    imgDesc: `${SYNERGY_IMG}/korporativnyj-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/korporativnyj-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/korporativnyj-mobile.webp`,
  },
  {
    title: "Интернет-магазин",
    href: "/sozdanie-internet-magazina",
    description: "Разрабатываем большие каталоги с&nbsp;глубокой аналитикой и&nbsp;простой оплатой.",
    imgDesc: `${SYNERGY_IMG}/internet-magazin-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/internet-magazin-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/internet-magazin-mobile.webp`,
  },
  {
    title: "SEO",
    href: "/seo",
    description: "Внедряем SEO-правки, микроразметку и&nbsp;технические рекомендации по&nbsp;продвижению сайта.",
    imgDesc: "/_sa/img/storage__kZKCokdVJJ0juenyabbgnTAfJvjyUXr0GriQDRh3.png",
    imgTablet: "/_sa/img/storage__sozdTTaoL9Xw2e0d9LYoExd9T2AUbzQZQ78Clv9J.png",
    imgMobile: "/_sa/img/storage__2ESWMTivkoyLXgkBdkyU8Pqp0faZFOIdZrVwzOmg.png",
  },
  {
    title: "Увеличение конверсии",
    href: "/uvelichenie-konversii-saita",
    description: "Внедряем UX-правки и&nbsp;аналитику для&nbsp;роста конверсии после аудита.",
    imgDesc: `${SYNERGY_IMG}/korporativnyj-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/korporativnyj-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/korporativnyj-mobile.webp`,
  },
  {
    title: "Комплексное продвижение",
    href: "/kompleksnoye-prodvizheniye",
    description: "Сайт и&nbsp;каналы продвижения — одной командой после стабилизации техники.",
    imgDesc: "/_sa/img/storage__1Yt1GYgHbovF9gOFZok055VJhROOXSp6GgOvev9m.png",
    imgTablet: "/_sa/img/storage__QYEKkKmG5Sc15apUCJImHJBQMfTgajkp1wbT4f8J.png",
    imgMobile: "/_sa/img/storage__jVQhfjAvEkF30CcGHZn12CjIfXAf1VSYSms2tRl2.png",
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

function caseIsTehpodTopic(c) {
  const desc = c.description || "";
  const tags = (c.tags || []).join(" ");
  return TEHPOD_CASE_TOPIC_RE.test(`${desc} ${tags}`) && TEHPOD_CASE_RESULT_RE.test(desc);
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

function postIsTehpodTopic(post) {
  if (TEHPOD_TOPIC_RE.test(post.description || "") || TEHPOD_TOPIC_RE.test(post.subtitle || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return TEHPOD_TOPIC_RE.test(meta.title) || TEHPOD_TOPIC_RE.test(meta.description);
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function postIsTehpodBlogCandidate(post) {
  const slug = slugFromHref(post.href);
  if (slug && EXCLUDED_BLOG_SLUGS.has(slug)) return false;
  const text = `${post.description || ""} ${post.subtitle || ""}`;
  if (TEHPOD_BLOG_OFF_TOPIC_RE.test(text)) return false;
  return postIsTehpodTopic(post);
}

function loadBlogManifestSlugs() {
  const manifestPath = path.join(ROOT, "json", "services", SLUG, "blog-manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (Array.isArray(manifest.slugs) && manifest.slugs.length) return manifest.slugs;
  if (Array.isArray(manifest.hrefs)) {
    return manifest.hrefs.map((h) => slugFromHref(h)).filter(Boolean);
  }
  return null;
}

function pickPostsBySlugs(posts, slugs) {
  const picked = [];
  const seen = new Set();
  for (const slug of slugs) {
    const p = posts.find((x) => slugFromHref(x.href) === slug);
    if (!p || publishYear(p) < MIN_PUBLISH_YEAR) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    picked.push(p);
  }
  return picked;
}

function selectTehpodBlogPosts(posts) {
  const manifestSlugs = loadBlogManifestSlugs();
  if (manifestSlugs?.length) {
    const fromManifest = pickPostsBySlugs(posts, manifestSlugs);
    if (fromManifest.length) return fromManifest.slice(0, SLIDE_COUNT_MAX);
  }

  const picked = pickPostsBySlugs(posts, CURATED_BLOG_SLUGS);
  const seen = new Set(picked.map((p) => hrefForPage(p.href)));
  const topic = posts.filter((p) => postIsTehpodBlogCandidate(p) && publishYear(p) >= MIN_PUBLISH_YEAR);
  for (const p of topic.sort((a, b) => publishTime(b) - publishTime(a))) {
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    picked.push(p);
    if (picked.length >= SLIDE_COUNT_MAX) break;
  }
  return picked.slice(0, SLIDE_COUNT_MAX);
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
  const imageUrl = post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
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
    "Делимся опытом развития и&nbsp;поддержки сайтов: SEO, UX, контент и&nbsp;технические доработки.",
  );
  inner = inner.replace(/\s*swiper-container-initialized/g, "");
  inner = inner.replace(/\s*swiper-container-horizontal/g, "");
  inner = inner.replace(/\s*swiper-container-free-mode/g, "");
  return `<section class="page-constructor__section tehpod-blog-section">
${inner.trim()}
</section>`;
}

function pickTehpodCases() {
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
    if (!c) throw new Error(`tehpod more-cases: нет кейса «${slug}» в cases-all.json`);
    picked.push(c);
    seen.add(slug);
  }
  for (const c of cases) {
    if (picked.length >= EXPECTED_CASES) break;
    const slug = caseSlugFromHref(c.href);
    if (!slug || seen.has(slug)) continue;
    if (!caseIsTehpodTopic(c)) continue;
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  if (picked.length !== EXPECTED_CASES) {
    throw new Error(`tehpod more-cases: нужно ${EXPECTED_CASES} кейсов, есть ${picked.length}`);
  }
  return picked;
}

function buildMoreCasesPartial(tehpodCases) {
  const slides = tehpodCases.map((c) => renderMorSlide(c)).join("");
  const cta = buildCtaSlide("/case/all/");
  const gridCases = tehpodCases
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
  return `<section class="page-constructor__section tehpod-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container"><div data-v-38965faa="" class="swiper-wrapper">${slides}${cta} </div> <div data-v-38965faa="" class="swiper-pagination"></div></div></div> ${grid}</div></div></section>`;
}

function buildAwardsPartial() {
  const shell = fs.readFileSync(AWARDS_SHELL, "utf8");
  const slidesHtml = renderSlides(TEHPOD_AWARDS);
  let sectionHtml = shell
    .replace("__HEADING_ID__", "tehpod-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml);
  sectionHtml = sectionHtml.replace(
    '<section class="page-constructor__section">',
    '<section class="page-constructor__section tehpod-awards-section">',
  );
  return `<!-- Награды /tehnicheskaya-podderzhka-saita: json/services/${SLUG}/awards.json + home-awards.css. -->\n${sectionHtml}`;
}

function renderSynergyCard(card) {
  const href = escapeXml(hrefForPage(card.href));
  return `<div data-v-627ccbce="" class="synergy__slide swiper-slide" style="margin-right: 30px;"><div data-v-627ccbce=""><div data-v-627ccbce="" class="synergy__card"><a data-v-627ccbce="" href="${href}" target="_blank" class="synergy__card-container synergy__card-container-img"><h3 data-v-627ccbce="">${escapeXml(card.title)}</h3> <p data-v-627ccbce="" class="synergy__card-description">${card.description}</p> <div data-v-627ccbce="" class="synergy__card-img-wr"><img data-v-627ccbce="" src="${escapeXml(card.imgDesc)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_desc"> <img data-v-627ccbce="" src="${escapeXml(card.imgTablet)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_tablet"> <img data-v-627ccbce="" src="${escapeXml(card.imgMobile)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_mobile"></div></a></div></div></div>`;
}

function buildSynergyPartial() {
  const slides = SYNERGY_CARDS.map(renderSynergyCard).join("");
  return `<!-- Синергия /tehnicheskaya-podderzhka-saita: 6 карточек. -->
<section class="page-constructor__section tehpod-synergy-section">
<div data-v-627ccbce="" class="synergy__text"><h2 data-v-627ccbce="" class="synergy__title kontekstnaya-page__section-heading">Синергия с&nbsp;услугами</h2></div>
<div data-v-627ccbce="" class="synergy__context-slider swiper-container">
<div data-v-627ccbce="" class="synergy__context-wrapper swiper-wrapper">
${slides}
</div>
<button data-v-627ccbce="" class="swiper-button-next" tabindex="0" role="button" aria-label="Next slide"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
<button data-v-627ccbce="" class="swiper-button-prev swiper-button-disabled" style="transform: rotate(180deg);" tabindex="0" role="button" aria-label="Previous slide"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
</div>
</section>`;
}

function main() {
  if (!fs.existsSync(BLOGS_ALL)) {
    console.error("Нет json/blogs-all.json");
    process.exit(1);
  }
  const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
  const blogPosts = selectTehpodBlogPosts(posts);
  if (!blogPosts.length) {
    console.error("Нет материалов для блога tehpod");
    process.exit(1);
  }

  const tehpodCases = pickTehpodCases();
  const moreCasesHtml = buildMoreCasesPartial(tehpodCases);

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
      { headingId: "tehpod-awards-heading", mountId: "sa-home-awards-mounted", awards: TEHPOD_AWARDS },
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
        source: "8 curated tehpod-topic cases (support, site dev, e-commerce)",
        expected: EXPECTED_CASES,
        hrefs: tehpodCases.map((c) => c.href),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const outputs = [
    ["blog-tehnicheskaya-podderzhka-saita.html", buildBlogPartial(blogPosts)],
    ["more-cases-tehnicheskaya-podderzhka-saita.html", moreCasesHtml],
    ["awards-tehnicheskaya-podderzhka-saita.html", buildAwardsPartial()],
    ["synergy-tehnicheskaya-podderzhka-saita.html", buildSynergyPartial()],
  ];

  for (const [name, html] of outputs) {
    const out = processTypographyHtml(html, { force: true }).html;
    fs.writeFileSync(path.join(PARTIALS, name), `${out.trim()}\n`, "utf8");
    console.log("Wrote html/partials/services/" + name);
  }
  console.log("blog cards:", blogPosts.length);
  console.log("more-cases:", tehpodCases.map((c) => caseSlugFromHref(c.href)).join(", "));
}

main();
