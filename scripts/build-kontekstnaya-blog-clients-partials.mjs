#!/usr/bin/env node
/**
 * Partial «Блог» и «Наши клиенты» для страниц услуг:
 * - /kontekstnaya_reklama — blog-kontekstnaya-reklama.html
 * - /kompleksnoye-prodvizheniye — blog-kompleksnoye-prodvizheniye.html (тот же подбор)
 * - /prodvizhenie-yandex-karty-2gis — blog-prodvizhenie-yandex-karty-2gis.html (кураторский)
 * Подбор kontekst/kompleks: тема «контекстная реклама» + CURATED_EXTRA_SLUGS; ≥2020; до 10 карточек.
 * clients: копия html/partials/section-clients.html с главной (kontekstnaya).
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const CLIENTS_SOURCE = path.join(ROOT, "html", "partials", "section-clients.html");
const BLOG_OUT = path.join(ROOT, "html", "partials", "services", "blog-kontekstnaya-reklama.html");
const YMAPS_BLOG_OUT = path.join(
  ROOT,
  "html",
  "partials",
  "services",
  "blog-prodvizhenie-yandex-karty-2gis.html",
);
const KOMPLEKS_BLOG_OUT = path.join(
  ROOT,
  "html",
  "partials",
  "services",
  "blog-kompleksnoye-prodvizheniye.html",
);
const KOMPLEKS_PAGE = path.join(ROOT, "kompleksnoye-prodvizheniye", "index.html");
const KOMPLEKS_BLOG_START = "<!-- KOMPLEKSNOYE-BLOG-START -->";
const KOMPLEKS_BLOG_END = "<!-- KOMPLEKSNOYE-BLOG-END -->";
const CLIENTS_OUT = path.join(ROOT, "html", "partials", "services", "clients-kontekstnaya-reklama.html");
const ARTICLES_DIR = path.join(ROOT, "json", "blog-articles");
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;
/** Тема поста — контекстная реклама (все падежи), не «лидер контекстной рекламы» в subtitle. */
const CONTEXTUAL_TOPIC_RE = /контекстн[а-яё-]*\s+реклам/i;

/** Доп. карточки для /kontekstnaya_reklama (релевантны контексту/Директу, см. подбор в задаче). */
const CURATED_EXTRA_SLUGS = [
  "prodvizhenie-na-yandex-kartah-dlya-biznesa",
  "kak-privlekat-auditoriyu-konkurentov-cherez-yandeks-direkt",
  "kak-uvelichit-trafik-sajta",
  "serenity-kak-stroim-uspeshnyj-marketing-ot-sotrudnika-do-klienta",
];

/** Кураторный блок «Блог» для /prodvizhenie-yandex-karty-2gis — сначала материал про Карты. */
const YMAPS_CURATED_SLUGS = [
  "prodvizhenie-na-yandex-kartah-dlya-biznesa",
  "kontekstnaya-i-georeklama-premium-segment",
  "kak-privlekat-auditoriyu-konkurentov-cherez-yandeks-direkt",
  "kontekstnaya-reklama-dlya-b2b-v-2026-godu-kak-privlekat-lidy",
  "kak-uvelichit-trafik-sajta",
  "serenity-kak-stroim-uspeshnyj-marketing-ot-sotrudnika-do-klienta",
  "seo-ili-kontekstnaya-reklama-chto-vybrat",
  "ekspress-instruktsiya-kak-ne-slit-reklamnyj-byudzhet",
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

function articleTopicMeta(slug) {
  const file = path.join(ARTICLES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { title: j.title || "", description: j.description || "" };
}

/** Контекстная реклама — тема материала (description карточки или title/description статьи). */
function postIsContextualTopic(post) {
  if (CONTEXTUAL_TOPIC_RE.test(post.description || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return (
    CONTEXTUAL_TOPIC_RE.test(meta.title) || CONTEXTUAL_TOPIC_RE.test(meta.description)
  );
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function isRecentEnough(post) {
  const y = publishYear(post);
  return y >= MIN_PUBLISH_YEAR;
}

function sortPostsNewestFirst(list) {
  return [...list].sort((a, b) => publishTime(b) - publishTime(a));
}

function postBySlug(posts, slug) {
  return posts.find((p) => slugFromHref(p.href) === slug);
}

/** Тема «контекстная реклама» + кураторские slug; без дублей по href; новые первыми. */
function selectKontekstBlogPosts(posts) {
  const topic = posts.filter((p) => postIsContextualTopic(p) && isRecentEnough(p));
  const seen = new Set(topic.map((p) => hrefForPage(p.href)));
  const extra = [];
  for (const slug of CURATED_EXTRA_SLUGS) {
    const p = postBySlug(posts, slug);
    if (!p) {
      console.warn(`WARN: curated slug не найден в blogs-all: ${slug}`);
      continue;
    }
    if (!isRecentEnough(p)) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    extra.push(p);
  }
  return sortPostsNewestFirst([...topic, ...extra]).slice(0, SLIDE_COUNT_MAX);
}

function selectYmapsBlogPosts(posts) {
  const seen = new Set();
  const picked = [];
  for (const slug of YMAPS_CURATED_SLUGS) {
    const p = postBySlug(posts, slug);
    if (!p) {
      console.warn(`WARN: ymaps curated slug не найден в blogs-all: ${slug}`);
      continue;
    }
    if (!isRecentEnough(p)) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    picked.push(p);
    if (picked.length >= SLIDE_COUNT_MAX) break;
  }
  return picked;
}

function linkClasses(post) {
  const parts = ["case", post.linkClass === "dark-text" ? "dark-text" : "white-text"];
  if (post.isResource !== false) {
    parts.push("case--resource", "case-cutted");
  }
  parts.push("more-blog-case");
  for (const code of post.tagCodesNorm || []) {
    if (code === "article") parts.push("articles");
    else if (code) parts.push(code);
  }
  const modifier = String(post.cardModifier || "").trim();
  if (modifier) parts.push(modifier);
  return parts.join(" ");
}

function renderSlide(post, idx) {
  const tagsHtml = (post.tags || [])
    .map(
      (t) =>
        `<span data-v-410c06b6="" class="case__tag">\n                            ${escapeXml(t)}\n                          </span>`,
    )
    .join("\n                          ");
  const imageUrl =
    post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
  const subtitle = post.subtitle ? escapeXml(post.subtitle) : "";
  const slideClass =
    idx === 0
      ? "swiper-slide blog-block__content-box-slide swiper-slide-active"
      : idx === 1
        ? "swiper-slide blog-block__content-box-slide swiper-slide-next"
        : "swiper-slide blog-block__content-box-slide";
  const href = escapeXml(hrefForPage(post.href));
  const imgSrc = escapeXml(imageUrl || "");
  const alt =
    idx === 0 && post.description
      ? escapeXml(`Иллюстрация к статье: ${post.description}`)
      : post.description
        ? escapeXml(post.description)
        : "";

  return `                    <div
                      data-v-25bf775d=""
                      class="${slideClass}"
                      style="margin-right: 30px"
                    >
                      <a
                        data-v-410c06b6=""
                        data-v-25bf775d=""
                        href="${href}"
                        class="${linkClasses(post)}"
                        ><div data-v-410c06b6="" class="case__tags">
                          ${tagsHtml}
                        </div>
                        <div data-v-410c06b6="" class="case__top">
                          <p
                            data-v-410c06b6=""
                            class="case__description case__description--static"
                          >
                            ${escapeXml(post.description)}
                          </p>
                          <p data-v-410c06b6="" class="case__subtitle">
                            ${subtitle}
                          </p>
                        </div>
                        <div data-v-410c06b6="" class="case__media zoom">
                          <img fetchpriority="low" decoding="async"
                            data-v-410c06b6=""
                            src="${imgSrc}"
                            loading="lazy"
                            class="case__media--front"
                           alt="${alt}" />
                        </div>
                        <div data-v-410c06b6="" class="blur"></div
                      ></a>
                    </div>`;
}

function buildBlogPartial(template, posts) {
  const wrapIdx = template.indexOf('class="swiper-wrapper"');
  if (wrapIdx === -1) throw new Error("Не найден .swiper-wrapper в section-blog.html");
  const contentStart = template.indexOf(">", wrapIdx) + 1;
  const lastBox = template.indexOf('class="blog-box blog-box__last"');
  if (lastBox === -1) throw new Error("Не найдена карточка «Больше материалов»");
  const tailStart = template.lastIndexOf("<div", lastBox);
  const head = template.slice(0, contentStart);
  const tail = template.slice(tailStart);
  const slides = posts.map((p, i) => renderSlide(p, i)).join("\n");
  return `${head}\n${slides}\n${tail}`;
}

function wrapClientsPartial(clientsHtml) {
  return `<section class="page-constructor__section kontekst-clients-section">
${clientsHtml.trim()}
</section>`;
}

function wrapBlogPartial(blogHtml, sectionClass = "kontekst-blog-section") {
  return `<section class="page-constructor__section ${sectionClass}">
${blogHtml.trim()}
</section>`;
}

function patchKompleksnoyeBlogSection(blogPartialHtml) {
  if (!fs.existsSync(KOMPLEKS_PAGE)) {
    console.warn("WARN: нет kompleksnoye-prodvizheniye/index.html — пропуск патча блога");
    return;
  }
  let html = fs.readFileSync(KOMPLEKS_PAGE, "utf8");
  const start = html.indexOf(KOMPLEKS_BLOG_START);
  const end = html.indexOf(KOMPLEKS_BLOG_END);
  if (start < 0 || end < 0 || end <= start) {
    console.warn("WARN: маркеры KOMPLEKSNOYE-BLOG не найдены в kompleksnoye-prodvizheniye/index.html");
    return;
  }
  html =
    html.slice(0, start + KOMPLEKS_BLOG_START.length) +
    "\n" +
    blogPartialHtml.trim() +
    "\n" +
    html.slice(end);
  fs.writeFileSync(KOMPLEKS_PAGE, html, "utf8");
}

if (!fs.existsSync(BLOGS_ALL)) {
  console.error("Нет json/blogs-all.json — сначала node scripts/build-blog-data.mjs");
  process.exit(1);
}
if (!fs.existsSync(BLOG_TEMPLATE)) {
  console.error("Нет", BLOG_TEMPLATE);
  process.exit(1);
}
if (!fs.existsSync(CLIENTS_SOURCE)) {
  console.error("Нет", CLIENTS_SOURCE);
  process.exit(1);
}

const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
if (!Array.isArray(posts) || !posts.length) {
  console.error("Пустая лента blogs-all.json");
  process.exit(1);
}

const top = selectKontekstBlogPosts(posts);
if (!top.length) {
  console.error(
    `Нет материалов для блога контекстной (тема + curated) с ${MIN_PUBLISH_YEAR} года`,
  );
  process.exit(1);
}
const ymapsTop = selectYmapsBlogPosts(posts);
if (!ymapsTop.length) {
  console.error(`Нет материалов для блога prodvizhenie-yandex-karty-2gis с ${MIN_PUBLISH_YEAR} года`);
  process.exit(1);
}
const blogTemplate = fs.readFileSync(BLOG_TEMPLATE, "utf8");
const blogInner = buildBlogPartial(blogTemplate, top);
const kompleksBlogInner = buildBlogPartial(blogTemplate, top);
const ymapsBlogInner = buildBlogPartial(blogTemplate, ymapsTop);
const clientsInner = fs.readFileSync(CLIENTS_SOURCE, "utf8");

const kontekstBlogPartial = wrapBlogPartial(blogInner);
const kompleksBlogPartial = wrapBlogPartial(kompleksBlogInner, "kompleksnoye-blog-section");

fs.writeFileSync(BLOG_OUT, `${kontekstBlogPartial}\n`, "utf8");
fs.writeFileSync(KOMPLEKS_BLOG_OUT, `${kompleksBlogPartial}\n`, "utf8");
fs.writeFileSync(YMAPS_BLOG_OUT, `${wrapBlogPartial(ymapsBlogInner, "ymaps-blog-section")}\n`, "utf8");
fs.writeFileSync(CLIENTS_OUT, `${wrapClientsPartial(clientsInner)}\n`, "utf8");
patchKompleksnoyeBlogSection(kompleksBlogPartial);

console.log("OK:", path.relative(ROOT, BLOG_OUT), "—", top.length, "карточек (новые первыми):");
top.forEach((p) =>
  console.log(" ", p.publishDate?.slice(0, 10) || "????-??-??", hrefForPage(p.href), "—", p.description?.slice(0, 60)),
);
console.log("OK:", path.relative(ROOT, KOMPLEKS_BLOG_OUT), "—", top.length, "карточек (как kontekstnaya)");
console.log("OK:", path.relative(ROOT, KOMPLEKS_PAGE), "— блок блога обновлён по маркерам");
console.log(
  "OK:",
  path.relative(ROOT, YMAPS_BLOG_OUT),
  "—",
  ymapsTop.length,
  "карточек (кураторский порядок):",
);
ymapsTop.forEach((p) =>
  console.log(" ", p.publishDate?.slice(0, 10) || "????-??-??", hrefForPage(p.href), "—", p.description?.slice(0, 60)),
);
console.log("OK:", path.relative(ROOT, CLIENTS_OUT), "— копия section-clients.html");
