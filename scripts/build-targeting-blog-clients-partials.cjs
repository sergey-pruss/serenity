#!/usr/bin/env node
/**
 * Partial «Блог» и «Наши клиенты» для /targeting (после FAQ).
 * Блог: тема «таргет» + кураторские slug; клиенты — section-clients.html с главной.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const BLOGS_ALL = path.join(root, "json", "blogs-all.json");
const BLOG_TEMPLATE = path.join(root, "html", "partials", "section-blog.html");
const CLIENTS_SOURCE = path.join(root, "html", "partials", "section-clients.html");
const BLOG_OUT = path.join(root, "html", "partials", "services", "blog-targeting.html");
const CLIENTS_OUT = path.join(root, "html", "partials", "services", "clients-targeting.html");
const ARTICLES_DIR = path.join(root, "json", "blog-articles");

const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;
const TARGETING_TOPIC_RE = /таргет/i;

const CURATED_EXTRA_SLUGS = [
  "pochemu-vashemu-biznesu-nuzhna-reklama-vo-vkontakte-i-pochemu-effektivnee-ee-delegirovat-professionalam",
  "target-vk-v-2025-godu-chto-nuzhno-uchest-chtoby-ispolzovat-byudzhet-na-maksimum",
  "kak-rabotaet-targetirovannaya-reklama-v-telegram-sekrety-uspeha",
  "strategiya-v-targete-5-shagov-k-zapusku-reklamnoj-kampanii",
  "geotargeting-dlya-malogo-i-srednego-biznesa",
  "kak-vybrat-kanaly-dlya-reklamy-v-telegram",
  "serenity-kak-stroim-uspeshnyj-marketing-ot-sotrudnika-do-klienta",
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

function postIsTargetingTopic(post) {
  if (TARGETING_TOPIC_RE.test(post.description || "") || TARGETING_TOPIC_RE.test(post.subtitle || "")) {
    return true;
  }
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return TARGETING_TOPIC_RE.test(meta.title) || TARGETING_TOPIC_RE.test(meta.description);
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

function selectTargetingBlogPosts(posts) {
  const topic = posts.filter((p) => postIsTargetingTopic(p) && isRecentEnough(p));
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
  return `<section class="page-constructor__section targeting-clients-section kontekst-clients-section">
${clientsHtml.trim()}
</section>`;
}

function wrapBlogPartial(blogHtml) {
  return `<section class="page-constructor__section targeting-blog-section kontekst-blog-section">
${blogHtml.trim()}
</section>`;
}

function run() {
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

  const top = selectTargetingBlogPosts(posts);
  if (!top.length) {
    console.error(`Нет материалов для блога targeting (тема + curated) с ${MIN_PUBLISH_YEAR} года`);
    process.exit(1);
  }

  const blogTemplate = fs.readFileSync(BLOG_TEMPLATE, "utf8");
  const blogInner = buildBlogPartial(blogTemplate, top);
  const clientsInner = fs.readFileSync(CLIENTS_SOURCE, "utf8");

  fs.writeFileSync(BLOG_OUT, `${wrapBlogPartial(blogInner)}\n`, "utf8");
  fs.writeFileSync(CLIENTS_OUT, `${wrapClientsPartial(clientsInner)}\n`, "utf8");

  console.log("OK:", path.relative(root, BLOG_OUT), "—", top.length, "карточек:");
  top.forEach((p) =>
    console.log(" ", p.publishDate?.slice(0, 10) || "????-??-??", hrefForPage(p.href)),
  );
  console.log("OK:", path.relative(root, CLIENTS_OUT), "— section-clients.html");
}

run();
