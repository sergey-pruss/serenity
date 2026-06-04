#!/usr/bin/env node
/**
 * Partial «Блог» для /korporativnyj_sajt: материалы про сайты, разработку, CMS, SEO;
 * порядок — по publishDate, сначала новые (до 10 карточек).
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const BLOG_OUT = path.join(ROOT, "html", "partials", "services", "blog-korporativnyj-sajt.html");
const ARTICLES_DIR = path.join(ROOT, "json", "blog-articles");
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;

const CORPORATE_TOPIC_RE =
  /корпоративн|корпоративный\s+сайт|сайт\s+компани|разработк[аиё][\s\S]{0,24}сайт|создани[ея][\s\S]{0,20}сайт|веб-разработк|структур[аы]\s+сайт|оформлять\s+статьи|оптимизировать\s+изображения|трафик\s+сайт|продвижени[ея]\s+сайт|этап[ыа]\s+seo[\s-]?продвижени/i;

const CURATED_EXTRA_SLUGS = [
  "kak-optimizirovat-izobrazheniya-na-sajte",
  "kak-oformlyat-stati-na-sajte-tak-chtoby-ih-chitali",
  "kak-uvelichit-trafik-sajta",
  "prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet",
  "etapy-seo-prodvizheniya-sajta",
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

function postIsCorporateTopic(post) {
  if (CORPORATE_TOPIC_RE.test(post.description || "") || CORPORATE_TOPIC_RE.test(post.subtitle || "")) {
    return true;
  }
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return (
    CORPORATE_TOPIC_RE.test(meta.title) || CORPORATE_TOPIC_RE.test(meta.description)
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
  return publishYear(post) >= MIN_PUBLISH_YEAR;
}

function sortPostsNewestFirst(list) {
  return [...list].sort((a, b) => publishTime(b) - publishTime(a));
}

function postBySlug(posts, slug) {
  return posts.find((p) => slugFromHref(p.href) === slug);
}

function selectKorporativnyjBlogPosts(posts) {
  const topic = posts.filter((p) => postIsCorporateTopic(p) && isRecentEnough(p));
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
  let inner = `${head}\n${slides}\n${tail}`;
  inner = inner.replace(
    /<h2([^>]*)class="services__title"/,
    '<h2$1class="services__title kontekstnaya-page__section-heading"',
  );
  inner = inner.replace(/\s*swiper-container-initialized/g, "");
  inner = inner.replace(/\s*swiper-container-horizontal/g, "");
  inner = inner.replace(/\s*swiper-container-free-mode/g, "");
  inner = inner.replace(/\s*swiper-slide-active/g, "");
  inner = inner.replace(/\s*swiper-slide-next/g, "");
  inner = inner.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  inner = inner.replace(/\s*style="transform:\s*translate3d\([^"]*\)"/g, "");
  return inner;
}

function wrapBlogPartial(blogHtml) {
  return `<section class="page-constructor__section korporativnyj-blog-section">
${blogHtml.trim()}
</section>`;
}

if (!fs.existsSync(BLOGS_ALL)) {
  console.error("Нет json/blogs-all.json — сначала node scripts/build-blog-data.mjs");
  process.exit(1);
}
if (!fs.existsSync(BLOG_TEMPLATE)) {
  console.error("Нет", BLOG_TEMPLATE);
  process.exit(1);
}

const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
if (!Array.isArray(posts) || !posts.length) {
  console.error("Пустая лента blogs-all.json");
  process.exit(1);
}

const top = selectKorporativnyjBlogPosts(posts);
if (!top.length) {
  console.error(`Нет материалов для блога корп. сайта с ${MIN_PUBLISH_YEAR} года`);
  process.exit(1);
}

const blogTemplate = fs.readFileSync(BLOG_TEMPLATE, "utf8");
const blogInner = buildBlogPartial(blogTemplate, top);
fs.writeFileSync(BLOG_OUT, `${wrapBlogPartial(blogInner)}\n`, "utf8");

console.log("OK:", path.relative(ROOT, BLOG_OUT), "—", top.length, "карточек (новые первыми):");
top.forEach((p) =>
  console.log(
    " ",
    p.publishDate?.slice(0, 10) || "????-??-??",
    hrefForPage(p.href),
    "—",
    p.description?.slice(0, 60),
  ),
);
