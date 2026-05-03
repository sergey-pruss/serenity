#!/usr/bin/env node
/**
 * Собирает статические страницы статей: blog/article/<slug>/index.html
 * из json/blog-articles/<slug>.json и оболочки blog/index.html (без листинга, без blog.js).
 * Стабильные классы разметки и стилей — комментарий «Контракт разметки» в css/sections/blog-article-figma.css;
 * импорт богатого HTML — css/sections/blog-article-prose.css и обёртка .sa-blog-prose.
 * Блок «Читайте ещё» — из json/blogs-all.json (только /blog/article/<slug>), порядок как в ленте:
 * до 4 карточек раньше и 4 позже; у края ленты — 8 вперёд или 8 назад (см. .cursor/rules/blog-articles-static.mdc).
 * Ряд карточек как на главной (blog-block__swiper-container + app.js initRow).
 *
 * Перед записью — типографика неразрывных пробелов (как npm run typography:nbsp для главной),
 * т.к. в шаблоне уже стоит data-typography-nbsp="1" — прогон с { force: true }.
 *
 * Блок автора справа в начале тела: строка «Автор статьи — …» в конце `bodyHtml` парсится на имя/роль;
 * фото — `author.photo` в JSON (`/_sa/img/blog/<slug>/…`). Синхрон с прода сохраняет `author` в json.
 * Легаси `.specialist-mention` из синка снимается: имя/роль/фото сливаются в тот же rail, текст blockquote — лид в первой колонке перед H2.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { normalizeBlogArticleBodyHtml } from "./normalize-blog-article-body-html.mjs";

const require = createRequire(import.meta.url);
const { processTypographyHtml } = require("./typography-nbsp.cjs");

const root = path.resolve(process.cwd());
const listingPath = path.join(root, "blog", "index.html");
const jsonDir = path.join(root, "json", "blog-articles");
const manifestPath = path.join(root, "json", "blog-articles-manifest.json");
const blogsAllPath = path.join(root, "json", "blogs-all.json");

const READ_MORE_NEIGHBORS = 4;
const READ_MORE_EDGE = 8;

function stripBlogJs(html) {
  return html.replace(/<script defer="" src="\/_sa\/js\/blog\.js[^"]*"><\/script>\s*\n?/g, "");
}

/** «Текст цитаты» … — подпись → подпись сверху (cite) + абзац цитаты; иначе разметка без изменений. */
const BQ_ATTRIBUTED_IN_SPAN_RE = /^«([\s\S]+?)»\s*([,.]?\s*—\s*)([\s\S]+)$/;

function transformBlockquoteArticlesMarkup(html) {
  return html.replace(
    /<blockquote\b([^>]*\bclass="[^"]*\bblockquote_articles\b[^"]*"[^>]*)>\s*<div\b([^>]*\bclass="row_tablet"[^>]*)>\s*<span([^>]*)>([\s\S]*?)<\/span>\s*<\/div>\s*<\/blockquote>/gi,
    (full, bqAttrs, rowAttrs, spanAttrs, innerHtml) => {
      const m = String(innerHtml).trim().match(BQ_ATTRIBUTED_IN_SPAN_RE);
      if (!m) return full;
      const quoted = m[1];
      const attrLine = m[3].trim();
      const quoteHtml = `«${quoted}»`;
      const dv = spanAttrs || "";
      return `<blockquote${bqAttrs}><div${rowAttrs}><cite class="blockquote_articles__attr"${dv}>${attrLine}</cite><p class="blockquote_articles__quote"${dv}>${quoteHtml}</p></div></blockquote>`;
    }
  );
}

function injectHead(html, { title, description, canonical }) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(title)}</title>`);
    out = out.replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeXml(title)}" />`
    );
  }
  if (description) {
    if (/<meta name="description"/.test(out)) {
      out = out.replace(
        /<meta name="description"[^>]*\/>/,
        `<meta name="description" content="${escapeXml(description)}" />`
      );
    } else {
      out = out.replace(
        /(<meta property="og:type" content="website" \/>)/,
        `$1\n    <meta name="description" content="${escapeXml(description)}" />`
      );
    }
    if (/<meta property="og:description"/.test(out)) {
      out = out.replace(
        /<meta property="og:description" content="[^"]*"\s*\/>/,
        `<meta property="og:description" content="${escapeXml(description)}" />`
      );
    } else {
      out = out.replace(
        /(<meta property="og:title" content="[^"]*" \/>)/,
        `$1\n    <meta property="og:description" content="${escapeXml(description)}" />`
      );
    }
  }
  if (canonical) {
    out = out.replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeXml(canonical)}" />`
    );
    out = out.replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${escapeXml(canonical)}" />`
    );
  }
  return out;
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Нормализация пути поста для сравнения с текущей статьёй */
function normBlogPath(href) {
  if (!href) return "";
  try {
    const u = new URL(href, "https://serenity.agency");
    let p = u.pathname || "";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  } catch {
    let p = String(href);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }
}

/** Slug статьи из href или "" если не /blog/article/<slug>. */
function articleSlugFromHref(href) {
  const p = normBlogPath(href);
  const m = p.match(/^\/blog\/article\/([^/]+)$/);
  return m && m[1] !== "article" ? m[1] : "";
}

/** Порядок постов как в blogs-all: только свои материалы /blog/article/<slug>/. */
function buildStaticArticleFeed(allPosts) {
  const out = [];
  const seen = new Set();
  for (const p of allPosts || []) {
    const sl = articleSlugFromHref(p.href);
    if (!sl || seen.has(sl)) continue;
    seen.add(sl);
    out.push(p);
  }
  return out;
}

/**
 * Карточка как в js/blog.js renderCard; без target="_blank" (навигация в той же вкладке).
 * Видео — только постер (на странице статьи нет blog.js для отложенной загрузки ролика).
 */
function renderListingCard(c, idx) {
  const tagsHtml = (c.tags || [])
    .map((t) => `<span class="case__tag" data-v-c0adc676="">${escapeXml(t)}</span>`)
    .join("");
  const imageUrl =
    c.media?.kind === "video" ? c.media.poster || c.media.image : c.media?.image;
  const fetchPriority = idx < 2 ? "high" : "low";
  const loading = idx < 2 ? "eager" : "lazy";
  const imgOpen = imageUrl
    ? `<img data-v-c0adc676="" class="case__media--front" alt="" src="${escapeXml(imageUrl)}" fetchpriority="${fetchPriority}" decoding="async" loading="${loading}" />`
    : "";

  const media = `<div class="case__media zoom" data-v-c0adc676="">
            ${imgOpen}
          </div>`;

  const cls = (c.linkClass || "white-text").trim();
  const href = escapeXml(c.href || "#");
  const isDarkCard = c.linkClass === "dark-text";
  const caseClass = isDarkCard
    ? "case case--dark-card"
    : "case more-blog-case case--resource case-cutted articles";
  const caseStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
  const linkStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
  const subtitleBody = c.subtitle ? escapeXml(c.subtitle) : "";
  const tagsBlock = tagsHtml ? `<div data-v-c0adc676="" class="case__tags">${tagsHtml}</div>` : "";
  const topBlock = `<div data-v-c0adc676="" class="case__top">
        <p data-v-c0adc676="" class="case__description case__description--static">${escapeXml(c.description)}</p>
        <p data-v-c0adc676="" class="case__subtitle">${subtitleBody}</p>
      </div>`;
  const blurBlock = isDarkCard ? "" : `<div data-v-c0adc676="" class="blur"></div>`;
  return `<div data-v-c0adc676="" data-v-27a87df0="" class="${caseClass}"${caseStyle}>
      <a data-v-c0adc676="" href="${href}" class="${cls}"${linkStyle} rel="noopener noreferrer">${tagsBlock}${topBlock}${media}${blurBlock}
      </a>
    </div>`;
}

function stripInnerTags(s) {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Подпись под именем: без кавычек «», SEO прописью, с заглавной первой буквы. */
function normalizeAuthorTitle(title) {
  let s = String(title || "")
    .replace(/[«»""„]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  s = s.replace(/([а-яёА-ЯЁa-z])(SEO)\b/gi, "$1 $2");
  s = s.replace(/\bseo\b/gi, "SEO");
  const first = s.charAt(0).toLocaleUpperCase("ru-RU");
  return first + s.slice(1);
}

/** Строка «Автор статьи — …» в конце тела (до переноса в блок справа). */
function parseAuthorBylineFromBody(html) {
  const re =
    /<p>[\s\u00A0]*(?:<br\s*\/?>[\s\u00A0]*)*<em>[\s\u00A0]*Автор статьи\s*(?:—|–|-)\s*([^<]+)<\/em>[\s\u00A0]*<\/p>/i;
  const m = String(html).match(re);
  if (!m) return null;
  const inner = stripInnerTags(m[1]).replace(/\.\s*$/, "");
  if (!inner) return null;
  const comma = inner.indexOf(",");
  if (comma === -1) return { name: inner, title: "" };
  return {
    name: inner.slice(0, comma).trim(),
    title: inner.slice(comma + 1).trim(),
  };
}

function stripAuthorByline(html) {
  return String(html).replace(
    /<p>[\s\u00A0]*(?:<br\s*\/?>[\s\u00A0]*)*<em>[\s\u00A0]*Автор статьи[\s\S]*?<\/em>[\s\u00A0]*<\/p>/gi,
    ""
  );
}

/**
 * Имя/роль из конца статьи + опционально `author` в JSON (фото `/_sa/img/blog/<slug>/…`).
 * Фото задаётся вручную в JSON — при синхронизации с прода поле `author` сохраняется в sync-скрипте.
 */
function resolveAuthor(data, bodyHtml) {
  const parsed = parseAuthorBylineFromBody(bodyHtml);
  const o = data.author && typeof data.author === "object" ? data.author : {};
  const nameRaw = o.name != null && String(o.name).trim() ? o.name : parsed?.name || "";
  const titleRaw = o.title != null && String(o.title).trim() ? o.title : parsed?.title || "";
  const name = stripInnerTags(nameRaw);
  const title = normalizeAuthorTitle(stripInnerTags(titleRaw));
  const photo = o.photo != null && String(o.photo).trim() ? String(o.photo).trim() : "";
  if (!name) return null;
  return { name, title, photo };
}

function renderAuthorRailHtml(author) {
  if (!author?.name) return "";
  const photoBlock = author.photo
    ? `<div class="blog-article-author__photo"><img src="${escapeXml(author.photo)}" alt="${escapeXml(
        author.name
      )}" width="96" height="96" decoding="async" loading="lazy" /></div>`
    : "";
  const titleBlock = author.title
    ? `<p class="blog-article-author__title">${escapeXml(author.title)}</p>`
    : "";
  return `<div class="blog-article-author-banner"><aside class="blog-article-author" aria-label="Автор статьи">${photoBlock}<p class="blog-article-author__name">${escapeXml(
    author.name
  )}</p>${titleBlock}</aside></div>`;
}

/** Первый блок `.article_section_l` — в начале `.row` вставляем карточку автора. */
function injectAuthorRail(bodyHtml, authorRailHtml) {
  if (!authorRailHtml) return bodyHtml;
  const re =
    /(<section\s+(?=[^>]*\blighttheme\b)(?=[^>]*\barticle_section_l\b)[^>]*>\s*<div\s+class="row"[^>]*>)/i;
  if (!re.test(bodyHtml)) return bodyHtml;
  return bodyHtml.replace(re, `$1${authorRailHtml}`);
}

/** Границы внешнего `<div class="…specialist-mention…">` (вложенные `div` через баланс). */
function findSpecialistMentionBounds(html) {
  const re = /<div\b[^>]*\bspecialist-mention\b[^>]*>/i;
  const m = String(html).match(re);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  let pos = html.indexOf(">", start) + 1;
  let depth = 1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      pos = nextClose + 6;
    }
  }
  return { start, end: pos };
}

/**
 * Снимает один блок specialist-mention: данные для rail и HTML лида (inner blockquote).
 */
function extractAndStripSpecialistMention(html) {
  const bounds = findSpecialistMentionBounds(html);
  if (!bounds) return { html, author: null, leadFragment: "" };
  const chunk = html.slice(bounds.start, bounds.end);
  const nameM = chunk.match(/<span\b[^>]*\bspecialist-mention__name\b[^>]*>([\s\S]*?)<\/span>/i);
  const posM = chunk.match(/<span\b[^>]*\bspecialist-mention__position\b[^>]*>([\s\S]*?)<\/span>/i);
  const imgM = chunk.match(/<img\b[^>]*\bsrc="([^"]+)"/i);
  const descM = chunk.match(
    /<blockquote\b[^>]*\bspecialist-mention__description\b[^>]*>([\s\S]*?)<\/blockquote>/i
  );
  const name = nameM ? stripInnerTags(nameM[1]) : "";
  const title = posM ? normalizeAuthorTitle(stripInnerTags(posM[1])) : "";
  const photo = imgM ? String(imgM[1]).trim() : "";
  let leadFragment = "";
  if (descM) {
    const inner = String(descM[1] ?? "").trim();
    if (inner) leadFragment = inner;
  }
  const left = html.slice(0, bounds.start).replace(/\s+$/, "");
  const right = html.slice(bounds.end).replace(/^\s+/, "");
  const out = left + right;
  return {
    html: out,
    author: name ? { name, title, photo } : null,
    leadFragment,
  };
}

function mergeAuthorWithSpecialist(resolved, specAuthor) {
  if (!specAuthor) return resolved;
  if (!resolved) {
    const n = stripInnerTags(specAuthor.name || "");
    if (!n) return null;
    return {
      name: n,
      title: normalizeAuthorTitle(stripInnerTags(specAuthor.title || "")),
      photo: specAuthor.photo ? String(specAuthor.photo).trim() : "",
    };
  }
  return {
    name: resolved.name,
    title: resolved.title || normalizeAuthorTitle(stripInnerTags(specAuthor.title || "")),
    photo: resolved.photo || (specAuthor.photo ? String(specAuthor.photo).trim() : ""),
  };
}

/** Текст лида из specialist — в первую `.article-section.text-content` первого блока тела (до title-wrap). */
function injectSpecialistLeadIntoFirstBodyColumn(bodyHtml, leadFragment) {
  const frag = String(leadFragment || "").trim();
  if (!frag) return bodyHtml;
  const re =
    /(<section\s+(?=[^>]*\blighttheme\b)(?=[^>]*\barticle_section_l\b)[^>]*>\s*<div\s+class="row"[^>]*>\s*(?:<div class="blog-article-author-banner">[\s\S]*?<\/div>\s*)?<div class="article-section text-content"[^>]*>)/i;
  if (!re.test(bodyHtml)) return bodyHtml;
  const inner = `<div class="article-section__info sa-blog-specialist-lead"><div>${frag}</div></div>`;
  return bodyHtml.replace(re, `$1${inner}`);
}

function buildReadMoreSection(currentSlug, articleFeed) {
  if (!Array.isArray(articleFeed) || articleFeed.length === 0) return "";
  const idx = articleFeed.findIndex((p) => articleSlugFromHref(p.href) === currentSlug);
  let related = [];
  if (idx === -1) {
    related = articleFeed
      .filter((p) => articleSlugFromHref(p.href) !== currentSlug)
      .slice(0, READ_MORE_EDGE);
  } else {
    const beforeCount = idx;
    const afterCount = articleFeed.length - 1 - idx;
    if (beforeCount < READ_MORE_NEIGHBORS || afterCount < READ_MORE_NEIGHBORS) {
      if (beforeCount < READ_MORE_NEIGHBORS) {
        related = articleFeed.slice(idx + 1, idx + 1 + READ_MORE_EDGE);
      } else {
        related = articleFeed.slice(Math.max(0, idx - READ_MORE_EDGE), idx);
      }
    } else {
      related = [
        ...articleFeed.slice(idx - READ_MORE_NEIGHBORS, idx),
        ...articleFeed.slice(idx + 1, idx + 1 + READ_MORE_NEIGHBORS),
      ];
    }
  }
  if (related.length === 0) return "";

  const slides = related
    .map((c, slideIdx) => {
      const card = renderListingCard(c, slideIdx);
      return `<div class="swiper-slide blog-block__content-box-slide" style="margin-right:30px" data-v-25bf775d="">
${card}
</div>`;
    })
    .join("\n");

  return `<section class="darktheme blog-read-more component-block blog-block-mainstr isNewContent" aria-labelledby="blog-read-more-title" data-v-25bf775d="">
  <div class="services__text home-ledge blog-read-more__intro" data-v-25bf775d="">
    <h2 id="blog-read-more-title" class="services__title" data-v-56f85d51="">Читайте ещё</h2>
  </div>
  <div class="swiper-container blog-block__swiper-container swiper-container-horizontal" data-v-25bf775d="">
    <div class="swiper-wrapper" data-v-25bf775d="">
${slides}
    </div>
  </div>
</section>`;
}

(() => {
  if (!fs.existsSync(listingPath)) throw new Error(`Нет ${listingPath}`);
  if (!fs.existsSync(manifestPath)) {
    console.log("OK: нет манифеста статей — пропуск");
    process.exit(0);
  }

  const slugs = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(slugs) || slugs.length === 0) {
    console.log("OK: blog-articles-manifest пуст");
    process.exit(0);
  }

  let allBlogPosts = [];
  if (fs.existsSync(blogsAllPath)) {
    try {
      const blogsAll = JSON.parse(fs.readFileSync(blogsAllPath, "utf8"));
      allBlogPosts = Array.isArray(blogsAll.posts) ? blogsAll.posts : [];
    } catch (e) {
      console.warn("WARN: не удалось прочитать json/blogs-all.json", e.message);
    }
  }
  const articleFeed = buildStaticArticleFeed(allBlogPosts);

  const blogIndex = fs.readFileSync(listingPath, "utf8");
  const startReplace = blogIndex.indexOf('<div class="page-container nuxt case-all-page"');
  const endReplace = blogIndex.indexOf('<div class="scroll-container case-all-scroll-footer"');
  if (startReplace === -1 || endReplace === -1) {
    throw new Error("blog/index.html: не найдены маркеры page-container / scroll-container");
  }

  const prefix = blogIndex.slice(0, startReplace);
  const suffix = stripBlogJs(blogIndex.slice(endReplace));

  for (const slug of slugs) {
    if (!slug || typeof slug !== "string") continue;
    const jp = path.join(jsonDir, `${slug}.json`);
    if (!fs.existsSync(jp)) {
      console.warn(`WARN: нет данных ${jp} — сначала npm run sync:blog-articles (или sync в build:blog)`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(jp, "utf8"));
    let bodyForArticle = normalizeBlogArticleBodyHtml(data.bodyHtml || "");
    const spec = extractAndStripSpecialistMention(bodyForArticle);
    bodyForArticle = spec.html;
    bodyForArticle = bodyForArticle.replace(/<section\s+class="darktheme"[^>]*>\s*<\/section>\s*/gi, "");
    let authorResolved = resolveAuthor(data, bodyForArticle);
    authorResolved = mergeAuthorWithSpecialist(authorResolved, spec.author);
    if (authorResolved) {
      bodyForArticle = stripAuthorByline(bodyForArticle);
    }
    let body = bodyForArticle;
    if (authorResolved) {
      body = injectAuthorRail(body, renderAuthorRailHtml(authorResolved));
    }
    body = injectSpecialistLeadIntoFirstBodyColumn(body, spec.leadFragment);
    body = transformBlockquoteArticlesMarkup(body);
    const readAlso = buildReadMoreSection(slug, articleFeed);
    const title = data.title || slug;
    const description = data.description || "";
    const canonical = data.canonical || `https://serenity.agency/blog/article/${slug}`;

    let headPart = injectHead(prefix, { title, description, canonical });
    const outHtml = readAlso
      ? `${headPart}${body}\n${readAlso}\n${suffix}`
      : `${headPart}${body}\n${suffix}`;

    const { html: typedHtml } = processTypographyHtml(outHtml, { force: true });

    const outDir = path.join(root, "blog", "article", slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), typedHtml, "utf8");
    console.log("OK: blog/article/", slug, "/");
  }
})();
