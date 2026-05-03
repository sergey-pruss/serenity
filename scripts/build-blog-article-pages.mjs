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
 * Цитаты `.blockquote_articles`: «текст» — подпись → cite + p без ёлочек у текста; финальная точка у подписи снимается; только «…» в span → p без кавычек.
 * Карточка специалиста (`p.text-small` + `em`/`i` перед `figure.specialist__main`): из текста цитаты убираются символы «» (U+00AB/U+00BB).
 * Легаси `.specialist-mention` из синка снимается: имя/роль/фото сливаются в тот же rail, текст blockquote — лид в первой колонке перед H2.
 *
 * SEO/GEO: полный блок head (description, OG article, Twitter, og:image — обложка из сырого hero или дефолт как на главной,
 * canonical со слэшем, robots, geo, JSON-LD BlogPosting).
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { normalizeBlogArticleBodyHtml } from "./normalize-blog-article-body-html.mjs";
import { applyBlogArticleBodyListMarkup } from "./blog-article-body-list-markup.mjs";
import { applyBlogArticleBodyMediaMarkup } from "./blog-article-body-media-markup.mjs";
import { applyBlogArticleMediaCaptionMarkup } from "./blog-article-body-caption-markup.mjs";
import { applyBlogArticleStageHeadingMarkup } from "./blog-article-stage-heading-markup.mjs";
import { normalizeBlogMetaDescription } from "./normalize-blog-meta-description.mjs";

const require = createRequire(import.meta.url);
const { processTypographyHtml } = require("./typography-nbsp.cjs");

const root = path.resolve(process.cwd());
/** Всегда собранный листинг: после `assemble-html` шапка из partials уже развёрнута. */
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

/** Точка в конце строки подписи к цитате не нужна (макет). */
function stripTrailingPeriodFromAttribution(s) {
  return String(s).replace(/\.\s*$/, "").trim();
}

function transformBlockquoteArticlesMarkup(html) {
  const withAttr = html.replace(
    /<blockquote\b([^>]*\bclass="[^"]*\bblockquote_articles\b[^"]*"[^>]*)>\s*<div\b([^>]*\bclass="row_tablet"[^>]*)>\s*<span([^>]*)>([\s\S]*?)<\/span>\s*<\/div>\s*<\/blockquote>/gi,
    (full, bqAttrs, rowAttrs, spanAttrs, innerHtml) => {
      const m = String(innerHtml).trim().match(BQ_ATTRIBUTED_IN_SPAN_RE);
      if (!m) return full;
      const quoted = m[1];
      const attrLine = stripTrailingPeriodFromAttribution(m[3].trim());
      const quoteHtml = quoted;
      const dv = spanAttrs || "";
      return `<blockquote${bqAttrs}><div${rowAttrs}><cite class="blockquote_articles__attr"${dv}>${attrLine}</cite><p class="blockquote_articles__quote"${dv}>${quoteHtml}</p></div></blockquote>`;
    }
  );
  /* Только «…» в span, без подписи — убираем ёлочки (блок уже цитата). */
  return withAttr.replace(
    /<blockquote\b([^>]*\bclass="[^"]*\bblockquote_articles\b[^"]*"[^>]*)>\s*<div\b([^>]*\bclass="row_tablet"[^>]*)>\s*<span([^>]*)>([\s\S]*?)<\/span>\s*<\/div>\s*<\/blockquote>/gi,
    (full, bqAttrs, rowAttrs, spanAttrs, innerHtml) => {
      const t = String(innerHtml).trim();
      const m = t.match(/^«([\s\S]+)»\s*$/);
      if (!m) return full;
      const inner = m[1];
      const dv = spanAttrs || "";
      return `<blockquote${bqAttrs}><div${rowAttrs}><p class="blockquote_articles__quote"${dv}>${inner}</p></div></blockquote>`;
    }
  );
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Листинг блога без этих файлов; для страниц статей вставляем после parity-sync. */
const BLOG_ARTICLE_SHELL_STYLES = `    <link rel="stylesheet" href="/_sa/css/sections/blog-article-figma.css?v=20260503blogReadMoreNoSectionMargin" />
    <link rel="stylesheet" href="/_sa/css/sections/blog-article-prose.css?v=20260503blogCaptionStripDline" />
`;

function stripBlogListingJsonPreload(html) {
  return html.replace(
    /\n\s*<link rel="preload" href="\/_sa\/json\/blog-pages\/[^"]+\.json" as="fetch" crossorigin="anonymous"\s*\/>\s*/g,
    "\n",
  );
}

function injectBlogArticleShellStyles(html) {
  const needle = 'href="/_sa/css/css__home-snapshot__overrides.parity-sync.css';
  const idx = html.indexOf(needle);
  if (idx === -1) {
    throw new Error("blog/index.html: нет parity-sync.css — некуда вставить стили статей");
  }
  const lineEnd = html.indexOf("\n", idx);
  if (lineEnd === -1) throw new Error("blog/index.html: строка parity-sync без перевода строки");
  return html.slice(0, lineEnd + 1) + BLOG_ARTICLE_SHELL_STYLES + html.slice(lineEnd + 1);
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
function blogListingCardImageAttrs(url) {
  if (!url) return { src: "", srcset: "", sizes: "" };
  const s = String(url);
  if (!s.includes("/_sa/img/blog/")) {
    return { src: s, srcset: "", sizes: "" };
  }
  const mobileSrc = s.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, "__m$1$2");
  return {
    src: s,
    srcset: `${mobileSrc} 820w, ${s} 1920w`,
    sizes: "(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 31vw",
  };
}

function renderListingCard(c, idx) {
  const tagsHtml = (c.tags || [])
    .map((t) => `<span class="case__tag" data-v-c0adc676="">${escapeXml(t)}</span>`)
    .join("");
  const imageUrl =
    c.media?.kind === "video" ? c.media.poster || c.media.image : c.media?.image;
  const fetchPriority = idx < 2 ? "high" : "low";
  const loading = idx < 2 ? "eager" : "lazy";
  const ia = blogListingCardImageAttrs(imageUrl);
  const srcsetAttr = ia.srcset
    ? ` srcset="${escapeXml(ia.srcset)}" sizes="${escapeXml(ia.sizes)}"`
    : "";
  const imgOpen = ia.src
    ? `<img data-v-c0adc676="" class="case__media--front" alt="" src="${escapeXml(ia.src)}"${srcsetAttr} fetchpriority="${fetchPriority}" decoding="async" loading="${loading}" />`
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
  const blurBlock = `<div data-v-c0adc676="" class="blur"></div>`;
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

const SITE_ORIGIN = "https://serenity.agency";
/** Тот же дефолтный OG, что на главной (`html/index.layout.html`). */
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/_sa/img/storage__2lwfrwamwdjZrXwCGrqHh1iCd0TASXMPCTozoLqM.png`;

/** Блок og:title…canonical из оболочки листинга (`blog/index.html`); ведущий `\s*` убирает отступную строку перед og:title без съедания перевода строки после предыдущего тега. */
const BLOG_SHELL_OG_CANON_RE =
  /[ \t]*\n[ \t]*<meta property="og:title" content="[^"]*" \/>\s*<meta property="og:type" content="[^"]*" \/>\s*<meta property="og:url" content="[^"]*" \/>\s*<link rel="canonical" href="[^"]*" \/>/;

function resolveAbsoluteUrl(href) {
  let h = String(href || "").trim();
  if (!h) return null;
  if (/^http:\/\//i.test(h)) h = `https://${h.slice(7)}`;
  if (/^https:\/\//i.test(h)) return h;
  if (h.startsWith("//")) return `https:${h}`;
  if (h.startsWith("/")) return `${SITE_ORIGIN}${h}`;
  return null;
}

/** Сырой `bodyHtml` до снятия blog-header: обложка hero для og:image. */
function extractHeroOgImageFromSyncedBody(rawHtml) {
  const s = String(rawHtml || "");
  const m1 =
    s.match(/<link[^>]*\bitemprop=["']image["'][^>]*\bhref=["']([^"']+)["']/i) ||
    s.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\bitemprop=["']image["']/i);
  if (m1) {
    const u = resolveAbsoluteUrl(m1[1]);
    if (u) return u;
  }
  const m2 = s.match(/href=["'](\/_sa\/img\/blog\/[^"']+\.(?:png|jpg|jpeg|webp))["']/i);
  if (m2) return resolveAbsoluteUrl(m2[1]);
  return null;
}

function ensureTrailingSlashOnCanonical(url) {
  const u = String(url || "").trim();
  if (!u) return `${SITE_ORIGIN}/`;
  const q = u.indexOf("?");
  const h = u.indexOf("#");
  if (q !== -1) {
    const base = u.slice(0, q);
    const rest = u.slice(q);
    const b = base.endsWith("/") ? base : `${base}/`;
    return b + rest;
  }
  if (h !== -1) {
    const base = u.slice(0, h);
    const frag = u.slice(h);
    return (base.endsWith("/") ? base : `${base}/`) + frag;
  }
  return u.endsWith("/") ? u : `${u}/`;
}

function ogImageMimeFromUrl(url) {
  const u = String(url || "").toLowerCase();
  if (/\.jpe?g(\?|#|$)/.test(u)) return "image/jpeg";
  if (/\.webp(\?|#|$)/.test(u)) return "image/webp";
  if (/\.png(\?|#|$)/.test(u)) return "image/png";
  return "image/png";
}

function deriveDescriptionFromArticleBody(html) {
  let t = stripInnerTags(String(html || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  const max = 158;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = sp > 70 ? cut.slice(0, sp) : cut;
  return `${base.replace(/[,;:!?.…\-—]+$/u, "").trim()}…`;
}

function buildBlogPostingJsonLd({ title, description, canonical, imageUrl, authorPersonName }) {
  const author =
    authorPersonName && String(authorPersonName).trim()
      ? { "@type": "Person", name: String(authorPersonName).trim() }
      : { "@type": "Organization", name: "Serenity" };
  const doc = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: canonical,
    image: [imageUrl],
    author,
    publisher: {
      "@type": "Organization",
      name: "Serenity",
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
  return `<script type="application/ld+json">${JSON.stringify(doc)}</script>`;
}

/**
 * Полная подстановка SEO/GEO в head: OG article, Twitter, og:image (hero или дефолт главной),
 * canonical со слэшем, robots, geo, JSON-LD BlogPosting.
 */
function injectBlogArticleHead(html, { title, description, canonical, ogImageUrl, authorPersonName }) {
  const canon = ensureTrailingSlashOnCanonical(canonical);
  const img = ogImageUrl && String(ogImageUrl).trim() ? String(ogImageUrl).trim() : DEFAULT_OG_IMAGE;
  const imType = ogImageMimeFromUrl(img);
  const metaAuthor = authorPersonName && String(authorPersonName).trim() ? String(authorPersonName).trim() : "Serenity";

  const block =
    `\n    <meta name="title" content="${escapeXml(title)}" />\n` +
    `    <meta property="og:title" content="${escapeXml(title)}" />\n` +
    `    <meta name="description" content="${escapeXml(description)}" />\n` +
    `    <meta property="og:description" content="${escapeXml(description)}" />\n` +
    `    <meta property="og:type" content="article" />\n` +
    `    <meta property="og:url" content="${escapeXml(canon)}" />\n` +
    `    <meta property="og:locale" content="ru_RU" />\n` +
    `    <meta property="og:site_name" content="Serenity" />\n` +
    `    <meta property="og:image" content="${escapeXml(img)}" />\n` +
    `    <meta property="og:image:secure_url" content="${escapeXml(img)}" />\n` +
    `    <meta property="og:image:type" content="${imType}" />\n` +
    `    <meta name="twitter:card" content="summary_large_image" />\n` +
    `    <meta name="twitter:title" content="${escapeXml(title)}" />\n` +
    `    <meta name="twitter:description" content="${escapeXml(description)}" />\n` +
    `    <meta name="twitter:image" content="${escapeXml(img)}" />\n` +
    `    <link rel="canonical" href="${escapeXml(canon)}" />\n` +
    `    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n` +
    `    <meta name="author" content="${escapeXml(metaAuthor)}" />\n` +
    `    <meta name="geo.region" content="RU" />\n` +
    `    <meta name="geo.placename" content="Россия" />`;

  if (!BLOG_SHELL_OG_CANON_RE.test(html)) {
    throw new Error(
      "injectBlogArticleHead: в оболочке блога не найден блок og:title → canonical — проверьте blog/index.html",
    );
  }
  let out = html.replace(BLOG_SHELL_OG_CANON_RE, block);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(title)}</title>`);
  const jsonLd = buildBlogPostingJsonLd({
    title,
    description,
    canonical: canon,
    imageUrl: img,
    authorPersonName,
  });
  out = out.replace(/\n  <\/head>/i, `\n    ${jsonLd}\n  </head>`);
  return out;
}

/** Легаси Nuxt: герой `blog-header` в JSON — убираем; дату публикации забираем для верхнего блока как у листинга. */
function extractDateAndStripLegacyBlogHeader(html) {
  const s = String(html).trim();
  const headerRe = /^<section\s+[^>]*\bblog-header\b[^>]*>[\s\S]*?<\/section>\s*(?:<!---->\s*)?/i;
  let datePublished = "";
  const full = s.match(/^<section\s+[^>]*\bblog-header\b[^>]*>([\s\S]*?)<\/section>/i);
  if (full) {
    const inner = full[1];
    const dm =
      inner.match(/itemprop="datePublished"[^>]*>([\s\S]*?)<\/div>/i) ||
      inner.match(/class="[^"]*blog-header__date[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (dm) datePublished = stripInnerTags(dm[1]);
  }
  return { rest: s.replace(headerRe, ""), datePublished };
}

/** Выпуски подкаста «Мышеловка»: в мета-строке страницы — «Подкаст», ссылка на ленту подкаста (не «Статьи»). */
function articleMentionsMyshelovka(data) {
  const hay = [data?.title, data?.description, data?.bodyHtml].map((x) => String(x ?? "")).join("\n");
  return /мышеловк/i.test(hay);
}

const BLOG_ARTICLE_PAGE_TOP_GRADIENT = `<div class="page-container nuxt case-all-page" data-v-6f8a040c="">
            <div class="background-gradient" data-v-6f8a040c="">
              <img fetchpriority="low" decoding="async"
                src="/_sa/img/img__gradient_dot.png"
                alt=""
                loading="lazy"
                data-v-6f8a040c=""
                style="
                  opacity: 1;
                  transition:
                    opacity 2.5s 0.7s,
                    transform 1.1s;
                  transform: rotate(2.1deg);
                "
              /><img fetchpriority="low" decoding="async"
                src="/_sa/img/img__gradient_dot.png"
                alt=""
                loading="lazy"
                data-v-6f8a040c=""
                style="
                  opacity: 1;
                  transition:
                    opacity 2.5s 0.7s,
                    transform 1.1s;
                  transform: rotate(2.1deg);
                "
              />
            </div>
          </div>`;

function renderBlogArticlePageTop({
  title,
  description,
  datePublished,
  metaCategoryLabel = "Статьи",
  metaCategoryHref = "/blog/article/",
}) {
  const catLabel = String(metaCategoryLabel || "Статьи").trim() || "Статьи";
  const catHref = String(metaCategoryHref || "/blog/article/").trim() || "/blog/article/";
  const metaParts =
    `<p class="blog-article-page-top__meta" data-v-27a87df0="">` +
    `<a href="/blog/" class="blog-article-page-top__meta-link blog-article-page-top__meta-back">←&nbsp;Назад к блогу</a>` +
    `<a href="${escapeXml(catHref)}" class="blog-article-page-top__meta-link">${escapeXml(catLabel)}</a>` +
    (datePublished
      ? `<span class="blog-article-page-top__meta-date">${escapeXml(datePublished)}</span>`
      : "") +
    `</p>`;
  const desc = description != null && String(description).trim() ? String(description).trim() : "";
  const lead = desc ? `<p class="blog-article-page-top__lead">${escapeXml(desc)}</p>` : "";
  return `<div class="blog-article-page-top">
${BLOG_ARTICLE_PAGE_TOP_GRADIENT}
            <div data-v-6f8a040c="" style="z-index: 10">
              <div data-v-27a87df0="" data-v-6f8a040c="" class="more-case-wr more-case-wr__main case-all-more-case-wr">
                <div data-v-27a87df0="" class="page__container">
                  <div class="case-all-heading-line blog-article-page-top__heading" data-v-27a87df0="">
                    ${metaParts}
                    <h1 class="cases-block__header-title case-all-heading-title" data-v-27a87df0="" style="color:#fff;opacity:1;">${escapeXml(
                      title
                    )}</h1>
                    ${lead}
                  </div>
                </div>
              </div>
            </div>
          </div>`;
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
      )}" width="80" height="80" decoding="async" loading="lazy" /></div>`
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
    if (inner) leadFragment = /^\s*</.test(inner) ? inner : `<p>${inner}</p>`;
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
    /(<section\s+(?=[^>]*\blighttheme\b)(?=[^>]*\barticle_section_l\b)[^>]*>\s*<div\s+class="row"[^>]*>\s*(?:<div class="blog-article-author-banner">[\s\S]*?<\/aside>\s*<\/div>\s*)?(?:<!---->\s*)*<div class="article-section text-content"[^>]*>)/i;
  if (!re.test(bodyHtml)) return bodyHtml;
  const inner = `<div class="article-section__info sa-blog-specialist-lead"><div>${frag}</div></div>`;
  return bodyHtml.replace(re, `$1${inner}`);
}

/** Содержимое нескольких `<p>` в один фрагмент для `p.text-small` в rail (допустимы `<br /><br />` между абзацами). */
function mergeAdjacentParagraphsForSpecialistRail(fragment) {
  const parts = [];
  const r = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = r.exec(String(fragment))) !== null) parts.push(m[1].trim());
  return parts.join("<br /><br />");
}

/**
 * Легаси Nuxt: цитата в соседнем `<div>` перед `.article-section__info--sub`, а `p.text-small` в rail пустой.
 * Переносим абзацы в `p.text-small` внутри карточки (сетка `display:contents` у figure).
 * Только если левая колонка — сплошные `<p>...</p>` (без `<ul>` и т.д.): иначе катастрофический backtracking
 * regex’ом и риск схлопнуть длинные секции; такие кейсы закрывает CSS (`position: static` у `--sub`).
 */
/** Убирает «ёлочки» в теле цитаты карточки специалиста и в `.blockquote_articles__quote` (макет без кавычек). */
function stripGuillemetsFromArticleQuoteBlocks(html) {
  let out = String(html);
  out = out.replace(
    /<p class="text-small"([^>]*)>\s*<(em|i)>([\s\S]*?)<\/\2>\s*<\/p>(\s*<figure class="specialist__main")/gi,
    (_full, pAttrs, tag, inner, rest) => {
      const stripped = inner.replace(/\u00ab/gi, "").replace(/\u00bb/gi, "");
      return `<p class="text-small"${pAttrs}><${tag}>${stripped}</${tag}></p>${rest}`;
    }
  );
  out = out.replace(/<p class="blockquote_articles__quote"([^>]*)>([\s\S]*?)<\/p>/gi, (_full, attrs, inner) => {
    if (!/[\u00ab\u00bb]/i.test(inner)) return _full;
    const stripped = inner.replace(/\u00ab/gi, "").replace(/\u00bb/gi, "");
    return `<p class="blockquote_articles__quote"${attrs}>${stripped}</p>`;
  });
  return out;
}

function relocateOrphanQuoteIntoSpecialistRail(html) {
  const s = String(html);
  const INFO = '<div class="article-section__info"';
  const SUB = '<div class="article-section__info--sub"';
  const emptyRailPrefix = /^(?:\s|<!---->)*<p class="text-small"[^>]*>\s*<\/p>\s*/i;
  const pOnlyInner = /^(?:\s*<p\b[^>]*>[\s\S]*?<\/p>\s*)+$/i;

  let cursor = 0;
  const out = [];
  while (cursor < s.length) {
    const subIdx = s.indexOf(SUB, cursor);
    if (subIdx === -1) {
      out.push(s.slice(cursor));
      break;
    }
    const subTagEnd = s.indexOf(">", subIdx);
    if (subTagEnd === -1) {
      out.push(s.slice(cursor, subIdx + SUB.length));
      cursor = subIdx + SUB.length;
      continue;
    }
    const afterOpen = s.slice(subTagEnd + 1, subTagEnd + 1 + 4000);
    const railHead = afterOpen.match(emptyRailPrefix);
    if (!railHead || !/^<figure class="specialist__main"/i.test(afterOpen.slice(railHead[0].length))) {
      out.push(s.slice(cursor, subTagEnd + 1));
      cursor = subTagEnd + 1;
      continue;
    }
    const figureStart = subTagEnd + 1 + railHead[0].length;

    const infoStart = s.lastIndexOf(INFO, subIdx);
    if (infoStart === -1 || infoStart < cursor) {
      out.push(s.slice(cursor, subTagEnd + 1));
      cursor = subTagEnd + 1;
      continue;
    }
    const infoTagEnd = s.indexOf(">", infoStart) + 1;
    const innerPart = s.slice(infoTagEnd, subIdx);
    const innerMatch = innerPart.match(/^<div[^>]*>([\s\S]*)<\/div>\s*$/i);
    if (!innerMatch) {
      out.push(s.slice(cursor, subTagEnd + 1));
      cursor = subTagEnd + 1;
      continue;
    }
    const innerContent = innerMatch[1].trim();
    if (!innerContent || !pOnlyInner.test(innerContent)) {
      out.push(s.slice(cursor, subTagEnd + 1));
      cursor = subTagEnd + 1;
      continue;
    }

    const merged = mergeAdjacentParagraphsForSpecialistRail(innerContent);
    const infoOpenTag = s.slice(infoStart, infoTagEnd);
    const subAttrs = s.slice(subIdx + SUB.length, subTagEnd);
    out.push(s.slice(cursor, infoStart));
    out.push(
      `${infoOpenTag}<div class="article-section__info--sub"${subAttrs}><p class="text-small">${merged}</p> `
    );
    cursor = figureStart;
  }
  return out.join("");
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

const postPagesManifestPath = path.join(root, "json", "blog-post-pages-manifest.json");
const postPagesJsonRoot = path.join(root, "json", "blog-post-pages");

/**
 * @param {object} data — json статьи или json/blog-post-pages/segment/slug.json
 * @param {{ readMoreSlug: string, segment: string, slug: string }} ctx — segment «article» для /blog/article/
 */
function renderTypedBlogArticlePage(data, ctx, articleFeed, prefixArticleShell, suffix) {
  const { readMoreSlug, segment, slug } = ctx;
  const rawBodyHtml = data.bodyHtml || "";
  const ogImageFromHero = extractHeroOgImageFromSyncedBody(rawBodyHtml);
  let bodyForArticle = normalizeBlogArticleBodyHtml(rawBodyHtml);
  const legacyBlogHeader = extractDateAndStripLegacyBlogHeader(bodyForArticle);
  bodyForArticle = legacyBlogHeader.rest;
  bodyForArticle = applyBlogArticleBodyListMarkup(bodyForArticle);
  bodyForArticle = applyBlogArticleStageHeadingMarkup(bodyForArticle);
  bodyForArticle = applyBlogArticleBodyMediaMarkup(bodyForArticle, {
    blogBodyMediaLayout: data.blogBodyMediaLayout,
  });
  bodyForArticle = applyBlogArticleMediaCaptionMarkup(bodyForArticle);
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
  body = relocateOrphanQuoteIntoSpecialistRail(body);
  body = stripGuillemetsFromArticleQuoteBlocks(body);
  const readAlso = buildReadMoreSection(readMoreSlug, articleFeed);
  const title = data.title || slug;
  let metaDescription = normalizeBlogMetaDescription(data.description || "");
  if (!metaDescription) {
    metaDescription = deriveDescriptionFromArticleBody(body);
  }
  if (!metaDescription) {
    metaDescription = `${title} — материалы блога агентства Serenity.`;
  }
  metaDescription = normalizeBlogMetaDescription(metaDescription);

  const canonicalRaw =
    data.canonical ||
    (segment === "article"
      ? `${SITE_ORIGIN}/blog/article/${slug}`
      : `${SITE_ORIGIN}/blog/${segment}/${slug}`);
  const canonicalForHead = ensureTrailingSlashOnCanonical(canonicalRaw);

  const authorPersonName = authorResolved?.name ? String(authorResolved.name).trim() : "";

  let metaCategoryLabel = "Статьи";
  let metaCategoryHref = "/blog/article/";
  if (segment === "case") {
    metaCategoryLabel = "Кейсы";
    metaCategoryHref = "/blog/case/";
  } else if (segment === "card") {
    metaCategoryLabel = "Карточки";
    metaCategoryHref = "/blog/card/";
  } else if (segment === "life") {
    metaCategoryLabel = "Наша жизнь";
    metaCategoryHref = "/blog/life/";
  } else if (segment === "article" && articleMentionsMyshelovka(data)) {
    metaCategoryLabel = "Подкаст";
    metaCategoryHref = "/blog/podcast/";
  }
  const pageTopHtml = renderBlogArticlePageTop({
    title,
    description: metaDescription,
    datePublished: legacyBlogHeader.datePublished,
    metaCategoryLabel,
    metaCategoryHref,
  });

  let headPart = injectBlogArticleHead(prefixArticleShell, {
    title,
    description: metaDescription,
    canonical: canonicalForHead,
    ogImageUrl: ogImageFromHero,
    authorPersonName,
  });
  const outHtml = readAlso
    ? `${headPart}${pageTopHtml}${body}\n${readAlso}\n${suffix}`
    : `${headPart}${pageTopHtml}${body}\n${suffix}`;

  const { html: typedHtml } = processTypographyHtml(outHtml, { force: true });
  return typedHtml;
}

(() => {
  if (!fs.existsSync(listingPath)) throw new Error(`Нет ${listingPath}`);

  let articleSlugs = [];
  if (fs.existsSync(manifestPath)) {
    try {
      articleSlugs = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!Array.isArray(articleSlugs)) articleSlugs = [];
    } catch (e) {
      console.warn("WARN: blog-articles-manifest:", e.message);
      articleSlugs = [];
    }
  }

  let postPageEntries = [];
  if (fs.existsSync(postPagesManifestPath)) {
    try {
      postPageEntries = JSON.parse(fs.readFileSync(postPagesManifestPath, "utf8"));
      if (!Array.isArray(postPageEntries)) postPageEntries = [];
    } catch (e) {
      console.warn("WARN: blog-post-pages-manifest:", e.message);
      postPageEntries = [];
    }
  }

  if (articleSlugs.length === 0 && postPageEntries.length === 0) {
    console.log("OK: нет статей и пост-страниц блога — пропуск");
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
  const prefixArticleShell = injectBlogArticleShellStyles(
    stripBlogListingJsonPreload(prefix.replace(/\s*<!--@blog-json-preload-->\s*\n?/, "\n")),
  );

  for (const slug of articleSlugs) {
    if (!slug || typeof slug !== "string") continue;
    const jp = path.join(jsonDir, `${slug}.json`);
    if (!fs.existsSync(jp)) {
      console.warn(`WARN: нет данных ${jp} — сначала npm run sync:blog-articles (или sync в build:blog)`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(jp, "utf8"));
    const typedHtml = renderTypedBlogArticlePage(
      data,
      { readMoreSlug: slug, segment: "article", slug },
      articleFeed,
      prefixArticleShell,
      suffix,
    );
    const outDir = path.join(root, "blog", "article", slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), typedHtml, "utf8");
    console.log("OK: blog/article/", slug, "/");
  }

  for (const row of postPageEntries) {
    const segment = String(row?.segment || "").trim();
    const slug = String(row?.slug || "").trim();
    if (!segment || !slug || slug.includes("..")) continue;
    if (!/^(case|card|life)$/.test(segment)) continue;
    const jp = path.join(postPagesJsonRoot, segment, `${slug}.json`);
    if (!fs.existsSync(jp)) {
      console.warn(`WARN: нет данных ${jp} — сначала sync:blog-articles (блок пост-страниц)`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(jp, "utf8"));
    const typedHtml = renderTypedBlogArticlePage(
      data,
      { readMoreSlug: slug, segment, slug },
      articleFeed,
      prefixArticleShell,
      suffix,
    );
    const outDir = path.join(root, "blog", segment, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), typedHtml, "utf8");
    console.log("OK: blog/", segment, "/", slug, "/");
  }
})();
