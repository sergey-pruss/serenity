#!/usr/bin/env node
/**
 * Хвост /lending_na_tilda: форма, команда, клиенты, FAQ, блог, кейсы, награды, синергия.
 * Контент FAQ/команда/блог/синергия — из legacy Nuxt (serenity.agency/lending_na_tilda).
 * Разметка и стили — как korporativnyj / sozdanie-internet-magazina.
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const {
  extractFaqPairsFromHtml,
  syncFaqBodyHtmlJsonLd,
  stripNuxtScopedAttrs,
} = require("./lib/build-faq-page-jsonld.cjs");
const { renderSlides } = require("./lib/service-awards-render.cjs");
const { renderMorSlide, renderGridCase, buildCtaSlide } = require("./lib/build-more-cases-cards-html.cjs");

const ROOT = path.resolve(__dirname, "..");
const SLUG = "lending_na_tilda";
const PARTIALS = path.join(ROOT, "html", "partials", "services");
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const CASES_ALL = path.join(ROOT, "json", "cases-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const AWARDS_SHELL = path.join(PARTIALS, "_service-awards.shell.html");
const FAQ_SHELL = path.join(PARTIALS, "_service-faq.shell.html");
const INLINE_SHELL = path.join(PARTIALS, "_service-inline-lead.shell.html");
const CLIENTS_SRC = path.join(PARTIALS, "korporativnyj-phase2-clients.html");
const SYNERGY_IMG = `/_sa/img/services/tehnicheskaya-podderzhka-saita/synergy`;

const LEGACY_URL = "https://serenity.agency/lending_na_tilda";
const EXPECTED_CASES = 8;
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;

const LENDING_TOPIC_RE =
  /лендинг|landing|tilda|тильд|посадочн|конверси|заявк|продающ|одностранич/i;
const LENDING_CASE_TOPIC_RE =
  /лендинг|landing|tilda|посадочн|конверси|заявк|продаж|трафик|e-?commerce|сайт/i;
const LENDING_CASE_RESULT_RE = /увеличил|снизил|в\s+\d+\s+раз|на\s+\d+\s*%|заявк|продаж|конверс/i;

const CURATED_BLOG_SLUGS = [
  "kak-uvelichit-konversiyu-sajta",
  "produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi",
  "kak-oformlyat-stati-na-sajte-tak-chtoby-ih-chitali",
  "kontent-dlya-sajta-strategiya-i-prakticheskie-sovety-ot-serenity",
  "kak-sozdat-kachestvennyj-tekst-dlya-sajta-prakticheskoe-rukovodstvo",
  "etapy-seo-prodvizheniya-sajta",
  "kak-optimizirovat-izobrazheniya-na-sajte",
  "rabotaem-nad-uluchsheniem-chitaemosti-teksta-na-sajte",
  "prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet",
  "kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit",
];

const CURATED_CASE_SLUGS = [
  "bez-ramok",
  "voice",
  "miramarhome",
  "darkrain-store",
  "riderra",
  "orange",
  "mosplitka",
  "gio-welness",
];

const LENDING_AWARDS = [
  {
    rating: "Рейтинг Рунета",
    year: "2021",
    description: "19 место в России в рейтинге разработчиков сайта типа «Лендинг»",
    href: null,
  },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "29 место по России в рейтинге разработчиков сайтов на Tilda",
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
    year: "2022",
    description: "6 место в рейтинге креативности веб-студий",
    href: null,
  },
  {
    rating: "Workspace Digital",
    year: "2025",
    description: "16 место в списке самых награждаемых маркетинговых агентств",
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
    description: "30 место в рейтинге ведущих веб-студий СПб",
    href: null,
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

function decodeNuxtString(s) {
  return String(s || "")
    .replace(/\\u002F/g, "/")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, "\u00a0");
}

function extractLegacyStrings(html) {
  const out = {};
  const leadTitle = html.match(/order-popup__meta[^>]*>[\s\S]*?<h2[^>]*>([^<]+)</i)
    || html.match(/Заказать лендинг[^<]*/i);
  if (leadTitle) out.leadTitle = decodeNuxtString(leadTitle[1] || leadTitle[0]).trim();

  const teamHead = html.match(/team__head[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (teamHead) {
    out.teamTitle = decodeNuxtString(teamHead[1]).trim();
    out.teamDesc = decodeNuxtString(teamHead[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  }

  const blogDesc = html.match(/blog-block-mainstr[\s\S]*?services__description[^>]*>([^<]+)</i);
  if (blogDesc) out.blogDesc = decodeNuxtString(blogDesc[1]).trim();

  const synergyCards = [];
  for (const m of html.matchAll(/synergy__card-container[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?synergy__card-description[^>]*>([\s\S]*?)<\/p>[\s\S]*?href="([^"]+)"/gi)) {
    synergyCards.push({
      title: decodeNuxtString(m[1]).trim(),
      description: decodeNuxtString(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
      href: hrefForPage(m[3]),
    });
  }
  if (synergyCards.length) out.synergyCards = synergyCards;

  return out;
}

async function fetchLegacyHtml() {
  const local = path.join(__dirname, "lending-legacy-snapshot.html");
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");
  const res = await fetch(LEGACY_URL);
  if (!res.ok) throw new Error(`legacy fetch ${res.status}`);
  return res.text();
}

function loadLegacyTail() {
  const p = path.join(ROOT, "json", "services", SLUG, "legacy-tail.json");
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  return {};
}

function buildInlineLeadPartial(legacy) {
  const title = legacy.leadTitle || "Заказать лендинг на Tilda";
  const lead =
    legacy.leadText ||
    "Оставьте заявку, и мы в скором времени с вами свяжемся, чтобы обсудить задачи и стоимость лендинга.";
  const shell = fs.readFileSync(INLINE_SHELL, "utf8");
  return shell
    .replace("__TITLE_HTML__", title)
    .replace("__LEAD_HTML__", lead)
    .replace(
      'class="page-constructor__section sa-service-lead-section"',
      'class="page-constructor__section sa-service-lead-section lending-tilda-inline-lead-section"',
    );
}

function buildTeamPartial(legacy) {
  const korTeam = fs.readFileSync(
    path.join(PARTIALS, "sozdanie-internet-magazina-team-block.html"),
    "utf8",
  );
  const title = legacy.teamTitle || "Команда";
  const desc =
    legacy.teamDesc ||
    "Разработка лендинга на&nbsp;Tilda от&nbsp;нашего агентства — это&nbsp;слаженная работа проектировщика, маркетолога, контент-маркетолога, дизайнера, специалиста по&nbsp;Tilda, проджект-менеджера, руководителя направления и&nbsp;других специалистов.";

  let html = korTeam
    .replace(/<!-- INTERNET-MAGAZINA-TEAM-START -->/, "<!-- LENDING-TILDA-TEAM-START -->")
    .replace(/<!-- INTERNET-MAGAZINA-TEAM-END -->/, "<!-- LENDING-TILDA-TEAM-END -->")
    .replace(/internet-magazina-team-section/g, "lending-tilda-team-section")
    .replace(/<h2 data-v-c03ce8dc="">Команда<\/h2>/, `<h2 data-v-c03ce8dc="">${title}</h2>`)
    .replace(
      /<p data-v-c03ce8dc="">Разработка интернет-магазина[\s\S]*?<\/p>/,
      `<p data-v-c03ce8dc="">${desc}</p>`,
    );

  html = html.replace(/прототип корпоративного сайта/g, "прототип лендинга на Tilda");
  html = html.replace(/ключевых идей корпоративного сайта/g, "ключевых идей лендинга");
  return html;
}

function buildClientsPartial() {
  const raw = fs.readFileSync(path.join(PARTIALS, "clients-tehnicheskaya-podderzhka-saita.html"), "utf8");
  return raw
    .replace("tehpod-clients-section", "tehpod-clients-section lending-tilda-clients-section")
    .replace("<!-- TEHPOD-CLIENTS-START -->", "<!-- LENDING-TILDA-CLIENTS-START -->")
    .replace("<!-- TEHPOD-CLIENTS-END -->", "<!-- LENDING-TILDA-CLIENTS-END -->");
}

function buildFaqPartial(legacyHtml, legacy) {
  let pairs = legacy.faqPairs || extractFaqPairsFromHtml(legacyHtml);
  if (!pairs.length) {
    pairs = [
      {
        question: "Сколько стоит лендинг на Tilda?",
        answer:
          "Стартовая цена — от 150 000 ₽. Финальная сумма зависит от объёма блоков, уникальности дизайна, анимации и интеграций. После брифа называем точную стоимость в коммерческом предложении.",
      },
      {
        question: "Сколько времени занимает разработка?",
        answer:
          "В среднем — от 3 до 8 недель. Простой лендинг с готовой структурой запускаем за 3–4 недели. Проект с уникальным дизайном, анимацией и интеграциями — за 6–8 недель.",
      },
      {
        question: "Что входит в работу?",
        answer:
          "Исследование, проектирование, тексты, дизайн, вёрстка на Tilda, настройка форм и аналитики, базовая SEO-подготовка и тестирование перед запуском.",
      },
      {
        question: "Можно ли доработать существующий лендинг?",
        answer:
          "Да. Начинаем с аудита: смотрим структуру, конверсию, скорость и визуал. Дорабатываем текущий лендинг или предлагаем перезапуск, если быстрее получить результат с нуля.",
      },
      {
        question: "Нужна ли поддержка после запуска?",
        answer:
          "После релиза можем вести техническую поддержку: правки контента, доработки блоков, подключение новых интеграций — см. услугу технической поддержки сайта.",
      },
    ];
  }

  const ico =
    '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

  function spoiler(q, a) {
    return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${q}</h3> ${ico}</div> <div class="spoiler__content"><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${a}</div></div></div></div></div></div>`;
  }

  const cols = [[], [], []];
  pairs.forEach((p, i) => cols[i % 3].push(spoiler(p.question, p.answer)));
  const columns = cols.map((c) => `<div class="blocks__column">${c.join("")}</div>`).join("");
  const bodyInner = `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
  const bodyHtml = syncFaqBodyHtmlJsonLd(bodyInner);

  const jsonDir = path.join(ROOT, "json", "services", SLUG);
  fs.mkdirSync(jsonDir, { recursive: true });
  const faqJson = {
    mountId: "lending-tilda-faq-mounted",
    sectionClass: "lending-tilda-faq-section korporativnyj-faq-section",
    rootClass: "lending-tilda-faq-root korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    bodyHtml,
  };
  fs.writeFileSync(path.join(jsonDir, "faq.json"), `${JSON.stringify(faqJson, null, 2)}\n`, "utf8");

  const shell = fs.readFileSync(FAQ_SHELL, "utf8");
  const partial =
    `<!-- FAQ ${SLUG}: json/services/${SLUG}/faq.json + service-faq.css. -->\n` +
    shell
      .replace("__MOUNT_ID__", faqJson.mountId)
      .replace("__SECTION_CLASS__", faqJson.sectionClass)
      .replace("__ROOT_CLASS__", faqJson.rootClass)
      .replace("__BODY_HTML__", stripNuxtScopedAttrs(bodyHtml));
  return partial;
}

function articleTopicMeta(slug) {
  const file = path.join(ROOT, "json", "blog-articles", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { title: j.title || "", description: j.description || "" };
}

function postIsLendingTopic(post) {
  if (LENDING_TOPIC_RE.test(post.description || "") || LENDING_TOPIC_RE.test(post.subtitle || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return LENDING_TOPIC_RE.test(meta.title) || LENDING_TOPIC_RE.test(meta.description);
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
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

function selectLendingBlogPosts(posts) {
  const picked = pickPostsBySlugs(posts, CURATED_BLOG_SLUGS);
  const seen = new Set(picked.map((p) => hrefForPage(p.href)));
  for (const p of posts.filter((x) => postIsLendingTopic(x) && publishYear(x) >= MIN_PUBLISH_YEAR).sort((a, b) => publishTime(b) - publishTime(a))) {
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
    .map((t) => `<span data-v-410c06b6="" class="case__tag">\n                            ${escapeXml(t)}\n                          </span>`)
    .join("\n                          ");
  const imageUrl = post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
  const slideClass = idx === 0 ? "swiper-slide blog-block__content-box-slide swiper-slide-active" : "swiper-slide blog-block__content-box-slide";
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

function buildBlogPartial(posts, legacy) {
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
  const desc =
    legacy.blogDesc ||
    "Делимся опытом создания лендингов: конверсия, тексты, дизайн, Tilda и&nbsp;измеримый результат для&nbsp;бизнеса.";
  inner = inner.replace(
    /Делимся стратегиями\. Рассказываем о маркетинговых[\s\S]*?внутренней кухни\./,
    desc,
  );
  inner = inner.replace(/\s*swiper-container-initialized/g, "");
  inner = inner.replace(/\s*swiper-container-horizontal/g, "");
  inner = inner.replace(/\s*swiper-container-free-mode/g, "");
  return `<section class="page-constructor__section lending-tilda-blog-section korporativnyj-blog-section">
${inner.trim()}
</section>`;
}

function caseIsLendingTopic(c) {
  const desc = c.description || "";
  const tags = (c.tags || []).join(" ");
  return LENDING_CASE_TOPIC_RE.test(`${desc} ${tags}`) && LENDING_CASE_RESULT_RE.test(desc);
}

function normalizeCaseRow(c) {
  return { ...c, href: hrefForPage(c.href) };
}

function pickLendingCases() {
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
    if (!c) throw new Error(`lending more-cases: нет кейса «${slug}» в cases-all.json`);
    picked.push(c);
    seen.add(slug);
  }
  for (const c of cases) {
    if (picked.length >= EXPECTED_CASES) break;
    const slug = caseSlugFromHref(c.href);
    if (!slug || seen.has(slug)) continue;
    if (!caseIsLendingTopic(c)) continue;
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  if (picked.length !== EXPECTED_CASES) {
    throw new Error(`lending more-cases: нужно ${EXPECTED_CASES} кейсов, есть ${picked.length}`);
  }
  return picked;
}

function buildMoreCasesPartial(cases) {
  const slides = cases.map((c) => renderMorSlide(c)).join("");
  const cta = buildCtaSlide("/case/all/");
  const gridCases = cases
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
  return `<section class="page-constructor__section lending-tilda-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container"><div data-v-38965faa="" class="swiper-wrapper">${slides}${cta} </div> <div data-v-38965faa="" class="swiper-pagination"></div></div></div> ${grid}</div></div></section>`;
}

function buildAwardsPartial() {
  const shell = fs.readFileSync(AWARDS_SHELL, "utf8");
  const slidesHtml = renderSlides(LENDING_AWARDS);
  let sectionHtml = shell
    .replace("__HEADING_ID__", "lending-tilda-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml);
  sectionHtml = sectionHtml.replace(
    '<section class="page-constructor__section">',
    '<section class="page-constructor__section lending-tilda-awards-section">',
  );
  return `<!-- Награды /${SLUG}: json/services/${SLUG}/awards.json + home-awards.css. -->\n${sectionHtml}`;
}

const DEFAULT_SYNERGY = [
  {
    title: "Корпоративный сайт",
    href: "/korporativnyj_sajt",
    description: "Создаём сайты, которые раскрывают бренд и&nbsp;налаживают контакт с&nbsp;покупателями.",
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
    description: "Продвигаем сайт в&nbsp;поиске и&nbsp;увеличиваем органический трафик на&nbsp;лендинг.",
    imgDesc: "/_sa/img/storage__kZKCokdVJJ0juenyabbgnTAfJvjyUXr0GriQDRh3.png",
    imgTablet: "/_sa/img/storage__sozdTTaoL9Xw2e0d9LYoExd9T2AUbzQZQ78Clv9J.png",
    imgMobile: "/_sa/img/storage__2ESWMTivkoyLXgkBdkyU8Pqp0faZFOIdZrVwzOmg.png",
  },
  {
    title: "Контекстная реклама",
    href: "/kontekstnaya_reklama",
    description: "Приводим целевой трафик на&nbsp;посадочную и&nbsp;масштабируем заявки.",
    imgDesc: "/_sa/img/storage__1Yt1GYgHbovF9gOFZok055VJhROOXSp6GgOvev9m.png",
    imgTablet: "/_sa/img/storage__QYEKkKmG5Sc15apUCJImHJBQMfTgajkp1wbT4f8J.png",
    imgMobile: "/_sa/img/storage__jVQhfjAvEkF30CcGHZn12CjIfXAf1VSYSms2tRl2.png",
  },
  {
    title: "Увеличение конверсии",
    href: "/uvelichenie-konversii-saita",
    description: "Улучшаем конверсию лендинга через UX, аналитику и&nbsp;тестирование гипотез.",
    imgDesc: `${SYNERGY_IMG}/korporativnyj-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/korporativnyj-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/korporativnyj-mobile.webp`,
  },
  {
    title: "Техническая поддержка",
    href: "/tehnicheskaya-podderzhka-saita",
    description: "Поддерживаем лендинг после запуска: правки, интеграции, скорость и&nbsp;стабильность.",
    imgDesc: `${SYNERGY_IMG}/internet-magazin-desc.webp`,
    imgTablet: `${SYNERGY_IMG}/internet-magazin-tablet.webp`,
    imgMobile: `${SYNERGY_IMG}/internet-magazin-mobile.webp`,
  },
];

function renderSynergyCard(card) {
  const href = escapeXml(hrefForPage(card.href));
  return `<div data-v-627ccbce="" class="synergy__slide swiper-slide" style="margin-right: 30px;"><div data-v-627ccbce=""><div data-v-627ccbce="" class="synergy__card"><a data-v-627ccbce="" href="${href}" target="_blank" class="synergy__card-container synergy__card-container-img"><h3 data-v-627ccbce="">${escapeXml(card.title)}</h3> <p data-v-627ccbce="" class="synergy__card-description">${card.description}</p> <div data-v-627ccbce="" class="synergy__card-img-wr"><img data-v-627ccbce="" src="${escapeXml(card.imgDesc)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_desc"> <img data-v-627ccbce="" src="${escapeXml(card.imgTablet)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_tablet"> <img data-v-627ccbce="" src="${escapeXml(card.imgMobile)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_mobile"></div></a></div></div></div>`;
}

function buildSynergyPartial(legacy) {
  const cards = (legacy.synergyCards || []).map((c, i) => ({
    ...DEFAULT_SYNERGY[i % DEFAULT_SYNERGY.length],
    title: c.title,
    href: c.href,
    description: c.description.replace(/ /g, " ").replace(/ и /g, " и\u00a0"),
  }));
  const list = cards.length >= 4 ? cards : DEFAULT_SYNERGY;
  const slides = list.map(renderSynergyCard).join("");
  return `<!-- Синергия /${SLUG}. -->
<section class="page-constructor__section lending-tilda-synergy-section">
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

async function main() {
  const legacyHtml = await fetchLegacyHtml();
  const legacyTail = loadLegacyTail();
  const legacy = { ...extractLegacyStrings(legacyHtml), ...legacyTail };
  if (legacyTail.faq?.length) legacy.faqPairs = legacyTail.faq;

  if (!fs.existsSync(BLOGS_ALL)) throw new Error("Нет json/blogs-all.json");
  const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
  const blogPosts = selectLendingBlogPosts(posts);
  if (!blogPosts.length) throw new Error("Нет материалов для блога lending");

  const lendingCases = pickLendingCases();
  const moreCasesHtml = buildMoreCasesPartial(lendingCases);

  const jsonDir = path.join(ROOT, "json", "services", SLUG);
  fs.mkdirSync(jsonDir, { recursive: true });

  fs.writeFileSync(
    path.join(jsonDir, "inline-lead.json"),
    `${JSON.stringify(
      {
        titleHtml: legacy.leadTitle || "Заказать лендинг на Tilda",
        leadHtml:
          legacy.leadText ||
          "Оставьте заявку, и мы в скором времени с вами свяжемся, чтобы обсудить задачи и стоимость лендинга.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(jsonDir, "more-cases.json"),
    `${JSON.stringify({ bodyHtml: moreCasesHtml }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(jsonDir, "awards.json"),
    `${JSON.stringify(
      { headingId: "lending-tilda-awards-heading", mountId: "sa-home-awards-mounted", awards: LENDING_AWARDS },
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
        source: "8 curated lending/Tilda-topic cases",
        expected: EXPECTED_CASES,
        hrefs: lendingCases.map((c) => c.href),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(jsonDir, "synergy.json"),
    `${JSON.stringify({ cards: DEFAULT_SYNERGY }, null, 2)}\n`,
    "utf8",
  );

  const outputs = [
    ["service-inline-lead-lending-na-tilda.html", buildInlineLeadPartial(legacy)],
    ["lending-na-tilda-team-block.html", buildTeamPartial(legacy)],
    ["clients-lending-na-tilda.html", buildClientsPartial()],
    ["faq-lending-na-tilda.html", buildFaqPartial(legacyHtml, legacy)],
    ["blog-lending-na-tilda.html", buildBlogPartial(blogPosts, legacy)],
    ["more-cases-lending-na-tilda.html", moreCasesHtml],
    ["awards-lending-na-tilda.html", buildAwardsPartial()],
    ["synergy-lending-na-tilda.html", buildSynergyPartial(legacy)],
  ];

  for (const [name, html] of outputs) {
    const out = processTypographyHtml(html, { force: true }).html;
    fs.writeFileSync(path.join(PARTIALS, name), `${out.trim()}\n`, "utf8");
    console.log("Wrote html/partials/services/" + name);
  }
  console.log("blog cards:", blogPosts.length);
  console.log("more-cases:", lendingCases.map((c) => caseSlugFromHref(c.href)).join(", "));
  console.log("faq pairs:", extractFaqPairsFromHtml(legacyHtml).length || "fallback");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
