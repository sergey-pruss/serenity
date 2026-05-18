#!/usr/bin/env node
/**
 * Слайдер «Блог» на главной (html/partials/section-blog.html) — 9 карточек
 * из первых posts в json/blogs-all.json (тот же порядок, что /blog/).
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const PARTIAL = path.join(ROOT, "html", "partials", "section-blog.html");
const SLIDE_COUNT = 9;

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hrefForHome(href) {
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
  const subtitle = post.subtitle ? escapeXml(post.subtitle) : "";
  const slideClass =
    idx === 0
      ? "swiper-slide blog-block__content-box-slide swiper-slide-active"
      : idx === 1
        ? "swiper-slide blog-block__content-box-slide swiper-slide-next"
        : "swiper-slide blog-block__content-box-slide";
  const href = escapeXml(hrefForHome(post.href));
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

function buildPartial(partial, top) {
  const wrapIdx = partial.indexOf('class="swiper-wrapper"');
  if (wrapIdx === -1) {
    console.error("Не найден .swiper-wrapper");
    process.exit(1);
  }
  const contentStart = partial.indexOf(">", wrapIdx) + 1;
  const lastBox = partial.indexOf('class="blog-box blog-box__last"');
  if (lastBox === -1) {
    console.error("Не найдена карточка «Больше материалов»");
    process.exit(1);
  }
  const tailStart = partial.lastIndexOf("<div", lastBox);
  const head = partial.slice(0, contentStart);
  const tail = partial.slice(tailStart);
  const slides = top.map((p, i) => renderSlide(p, i)).join("\n");
  return `${head}\n${slides}\n${tail}`;
}

if (!fs.existsSync(BLOGS_ALL)) {
  console.error("Нет json/blogs-all.json — сначала node scripts/build-blog-data.mjs");
  process.exit(1);
}
const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
if (!Array.isArray(posts) || posts.length < SLIDE_COUNT) {
  console.error(`В ленте меньше ${SLIDE_COUNT} постов`);
  process.exit(1);
}
const top = posts.slice(0, SLIDE_COUNT);
if (!fs.existsSync(PARTIAL)) {
  console.error("Нет", PARTIAL);
  process.exit(1);
}
const partial = fs.readFileSync(PARTIAL, "utf8");
fs.writeFileSync(PARTIAL, buildPartial(partial, top), "utf8");
console.log(
  "OK:",
  path.relative(ROOT, PARTIAL),
  "—",
  SLIDE_COUNT,
  "карточек:",
  top.map((p) => hrefForHome(p.href)).join(", "),
);
