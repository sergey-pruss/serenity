#!/usr/bin/env node
/**
 * Собирает статические страницы статей: blog/article/<slug>/index.html
 * из json/blog-articles/<slug>.json и оболочки blog/index.html (без листинга, без blog.js).
 * Стабильные классы разметки и стилей — комментарий «Контракт разметки» в css/sections/blog-article-figma.css;
 * импорт богатого HTML — css/sections/blog-article-prose.css и обёртка .sa-blog-prose.
 * Блок «Читайте ещё» — из json/blogs-all.json, порядок как в ленте:
 * /blog/article/ — только статьи; life/case/card — вся лента posts.
 * до 4 карточек раньше и 4 позже; у края — 8 вперёд или 8 назад (см. .cursor/rules/blog-articles-static.mdc).
 * Ряд карточек как на главной (blog-block__swiper-container + app.js initRow).
 * В разметке «Читайте ещё» не ставить data-native-row — атрибут выставляет initRow; иначе ряд не скроллится.
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
 * SEO/GEO: полный блок head (description, OG article, Twitter, og:image из материала или дефолт главной,
 * canonical без завершающего слэша, robots, geo, JSON-LD @graph: BlogPosting, BreadcrumbList, Person при авторе).
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { ensureCanonicalUrlNoSlash, SITE_ORIGIN as CANON_SITE_ORIGIN } from "./lib/canonical-url.mjs";
import { normalizeBlogArticleBodyHtml } from "./normalize-blog-article-body-html.mjs";
import { applyBlogArticleBodyListMarkup } from "./blog-article-body-list-markup.mjs";
import { applyBlogArticleBodyMediaMarkup } from "./blog-article-body-media-markup.mjs";
import { applyBlogArticleMediaCaptionMarkup } from "./blog-article-body-caption-markup.mjs";
import { applyBlogArticleBodyImageSrcsetSizes } from "./blog-article-body-image-srcset-sizes.mjs";
import { applyBlogArticleStageHeadingMarkup } from "./blog-article-stage-heading-markup.mjs";
import { normalizeBlogMetaDescription } from "./normalize-blog-meta-description.mjs";
import { stripBlogCategoryFromTitle } from "./normalize-blog-article-title.mjs";

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

/** Лид под H1: экранируем текст, фразы про контекстную рекламу — ссылка на услугу. */
function linkContextualAdsPhrasesInLead(plain) {
  const raw = String(plain ?? "");
  const re = /(контекстн[а-яё]*\s+реклам[а-яё]*)/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    out += escapeXml(raw.slice(last, m.index));
    out += `<a href="/kontekstnaya_reklama">${escapeXml(m[1])}</a>`;
    last = m.index + m[1].length;
  }
  out += escapeXml(raw.slice(last));
  return out;
}

/** Листинг блога без этих файлов; для страниц статей вставляем после parity-sync. */
const BLOG_ARTICLE_SHELL_STYLES = `    <link rel="stylesheet" href="/_sa/css/sections/blog-article-figma.css?v=20260518blogArticleSliderLeft" />
    <link rel="stylesheet" href="/_sa/css/sections/blog-article-prose.css?v=20260518blogBodyMediaLeft" />
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

/** Канонический путь материала для подборки «Читайте ещё». */
function postPathFromCtx(ctx) {
  const segment = String(ctx?.segment || "article").trim();
  const slug = String(ctx?.slug || ctx?.readMoreSlug || "").trim();
  if (!slug) return "";
  return normBlogPath(`/blog/${segment}/${slug}`);
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

/** Реальные ширины файлов для `srcset` карточек «Читайте ещё» (ключ — канонический URL с `/_sa/`). */
const listingCardImageWidths = new Map();

function diskPathFromSaUrl(u) {
  const raw = String(u || "")
    .split("?")[0]
    .replace(/^\//, "");
  if (!raw.startsWith("_sa/")) return "";
  return path.join(root, raw.slice(4));
}

/**
 * Без корректных `…w` в srcset браузер ошибается в выборе кандидата (легаси было 820w/1920w при реальных ~557px).
 * Заполняем `listingCardImageWidths` для основного и `__m` URL из ленты.
 */
async function primeListingCardImageWidths(posts) {
  listingCardImageWidths.clear();
  let sharpFn;
  try {
    sharpFn = (await import("sharp")).default;
  } catch (e) {
    console.warn(
      "WARN: sharp недоступен — в «Читайте ещё» остаётся только src у превью карточек (без srcset).",
      e && e.message,
    );
    return;
  }
  const urls = new Set();
  for (const p of posts || []) {
    const im = p?.media?.kind === "video" ? p.media.poster || p.media.image : p?.media?.image;
    if (!im || typeof im !== "string" || !im.includes("/_sa/img/blog/")) continue;
    urls.add(im.split("?")[0]);
    urls.add(im.split("?")[0].replace(/(\.[a-zA-Z0-9]+)$/, "__m$1"));
  }
  for (const u of urls) {
    if (listingCardImageWidths.has(u)) continue;
    const fp = diskPathFromSaUrl(u);
    if (!fp || !fs.existsSync(fp)) {
      listingCardImageWidths.set(u, 0);
      continue;
    }
    try {
      const meta = await sharpFn(fp, { failOn: "none" }).metadata();
      listingCardImageWidths.set(u, meta.width || 0);
    } catch {
      listingCardImageWidths.set(u, 0);
    }
  }
}

/**
 * Карточка как в js/blog.js renderCard; без target="_blank" (навигация в той же вкладке).
 * Видео — только постер (на странице статьи нет blog.js для отложенной загрузки ролика).
 */
function blogListingCardImageAttrs(url) {
  if (!url) return { src: "", srcset: "", sizes: "" };
  const s = String(url).split("?")[0];
  if (!s.includes("/_sa/img/blog/")) {
    return { src: s, srcset: "", sizes: "" };
  }
  const mobileSrc = s.replace(/(\.[a-zA-Z0-9]+)$/, "__m$1");
  const wMain = listingCardImageWidths.get(s) || 0;
  const wMob = listingCardImageWidths.get(mobileSrc) || 0;
  if (!wMain || !wMob || wMob >= wMain) {
    return { src: s, srcset: "", sizes: "" };
  }
  return {
    src: s,
    srcset: `${mobileSrc} ${wMob}w, ${s} ${wMain}w`,
    sizes: "(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 31vw",
  };
}

function renderListingCard(c, idx, { forReadMore = false } = {}) {
  const tagsHtml = (c.tags || [])
    .map((t) => `<span class="case__tag" data-v-c0adc676="">${escapeXml(t)}</span>`)
    .join("");
  const imageUrl =
    c.media?.kind === "video" ? c.media.poster || c.media.image : c.media?.image;
  const fetchPriority = idx < 2 ? "high" : "low";
  /* Safari: отложенная загрузка в горизонтальном «Читайте ещё» даёт битый плейсхолдер; слайдов не больше READ_MORE_EDGE. */
  const loading = idx < READ_MORE_EDGE ? "eager" : "lazy";
  const ia = blogListingCardImageAttrs(imageUrl);
  const srcsetAttr = ia.srcset
    ? ` srcset="${escapeXml(ia.srcset)}" sizes="${escapeXml(ia.sizes)}"`
    : "";
  const mediaPos = c.mediaObjectPosition
    ? ` style="object-position:${escapeXml(String(c.mediaObjectPosition))}"`
    : "";
  const imgOpen = ia.src
    ? `<img data-v-c0adc676="" class="case__media--front" alt="" src="${escapeXml(ia.src)}"${srcsetAttr}${mediaPos} fetchpriority="${fetchPriority}" decoding="async" loading="${loading}" />`
    : "";

  const media = `<div class="case__media zoom" data-v-c0adc676="">
            ${imgOpen}
          </div>`;

  const cls = (c.linkClass || "white-text").trim();
  const href = escapeXml(c.href || "#");
  const isDarkCard = c.linkClass === "dark-text";
  let cardModifier = String(c.cardModifier || "").trim();
  if (forReadMore && cardModifier && !/\bcase--title-scrim\b/.test(cardModifier)) {
    const hasWoodHeader = /\bcase--card-wood-header\b/.test(cardModifier);
    if (!hasWoodHeader) cardModifier = `${cardModifier} case--title-scrim`.trim();
  } else if (forReadMore && !cardModifier) {
    cardModifier = "case--title-scrim";
  }
  const caseClass = [
    isDarkCard ? "case case--dark-card" : "case more-blog-case case--resource case-cutted articles",
    cardModifier ? escapeXml(cardModifier) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const caseStyle = isDarkCard && !forReadMore ? ' style="background-color:#e8e8ea;"' : "";
  const linkStyle = isDarkCard && !forReadMore ? ' style="background-color:#e8e8ea;"' : "";
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

const ARTICLE_DOC_TITLE_SUFFIX = " — Блог — Serenity";

/** `<title>`, OG, Twitter, JSON-LD headline; H1 остаётся коротким (`title` без суффикса). */
function formatArticleDocumentTitle(plainTitle) {
  const t = String(plainTitle || "").trim();
  if (!t) return "";
  if (t.endsWith(ARTICLE_DOC_TITLE_SUFFIX)) return t;
  return `${t}${ARTICLE_DOC_TITLE_SUFFIX}`;
}

/**
 * Один тег `<meta …/>` без «перешагивания» через `/>` чужих тегов.
 * Иначе ленивый `<meta…[\s\S]*?name="description"` матчится от первого `<meta charset` до листингового description и вырезает шапку целиком.
 * У листинга name=description и name=title — многострочные; в content нет литерала `/>`.
 */
const SINGLE_META_WITH_NAME_VALUE = (value) =>
  new RegExp(
    `<meta\\b(?:(?!/>)[\\s\\S])*?\\bname\\s*=\\s*["']${value}["'](?:(?!/>)[\\s\\S])*?/>\\s*`,
    "gi",
  );

/** Листинговые meta name=description / name=title до первого og:title — иначе дубли с блоком injectBlogArticleHead. */
function stripBlogListingSeoMetaBeforeOg(html) {
  const ogMark = '<meta property="og:title"';
  const i = html.indexOf(ogMark);
  if (i === -1) return html;
  const before = html.slice(0, i);
  const after = html.slice(i);
  const woDesc = before.replace(SINGLE_META_WITH_NAME_VALUE("description"), "");
  const woBoth = woDesc.replace(SINGLE_META_WITH_NAME_VALUE("title"), "");
  return woBoth + after;
}

/** Если оболочка собрана без `build-blog-pages.mjs`, в head остаются `{{…}}` — убираем такие `<meta>`, чтобы не было дублей и мусора. */
function stripUnresolvedPlaceholderMetaInHead(html) {
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, (headBlock) =>
    headBlock.replace(/<meta\b[\s\S]*?\/>\s*/gi, (meta) => (/\{\{[A-Z0-9_]+\}\}/.test(meta) ? "" : meta)),
  );
}

/** Блок og:title…canonical из оболочки листинга (`blog/index.html`); ведущий `\s*` убирает отступную строку перед og:title без съедания перевода строки после предыдущего тега. Между title и type допускается многострочный `og:description`. */
const BLOG_SHELL_OG_CANON_RE =
  /[ \t]*\n[ \t]*<meta property="og:title" content="[^"]*" \/>\s*(?:<meta\s+[\s\S]*?property="og:description"[\s\S]*?\/>)?\s*<meta property="og:type" content="[^"]*" \/>\s*<meta property="og:url" content="[^"]*" \/>\s*<link rel="canonical" href="[^"]*" \/>/;

function ensureTrailingSlashOnCanonical(url) {
  return ensureCanonicalUrlNoSlash(url || `${CANON_SITE_ORIGIN}/`);
}

function ogImageMimeFromUrl(url) {
  const u = String(url || "").toLowerCase();
  if (/\.jpe?g(\?|#|$)/.test(u)) return "image/jpeg";
  if (/\.webp(\?|#|$)/.test(u)) return "image/webp";
  if (/\.png(\?|#|$)/.test(u)) return "image/png";
  return "image/png";
}

function toAbsoluteOgUrl(ref) {
  const s = String(ref || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  const p = s.startsWith("/") ? s : `/${s}`;
  return `${SITE_ORIGIN}${p}`;
}

/** Из легаси-блока `blog-header`: `og.png` или первый `link itemprop="image"`. */
function extractOgImageHrefFromLegacyBlogHeader(html) {
  const m = String(html).match(/<section[^>]*\bblog-header\b[^>]*>([\s\S]*?)<\/section>/i);
  if (!m) return "";
  const inner = m[1];
  const og = inner.match(/href="(\/_sa\/img\/blog\/[^"]*\/og\.(?:png|jpg|jpeg|webp))"/i);
  if (og) return og[1];
  let link = inner.match(/<link[^>]*\bitemprop="image"[^>]*\bhref="([^"]+)"/i);
  if (link) return link[1];
  link = inner.match(/<link[^>]*\bhref="([^"]+)"[^>]*\bitemprop="image"/i);
  if (link) return link[1];
  return "";
}

/** Первое изображение статьи под `/_sa/img/blog/` (предпочтение не только `og.*`). */
function extractFirstBlogImageFromBody(html) {
  const re = /(?:src|href)="(\/_sa\/img\/blog\/[^"]+\.(?:png|jpg|jpeg|webp))"/gi;
  let m;
  let fallback = "";
  while ((m = re.exec(String(html))) !== null) {
    if (!/\/og\.(?:png|jpg|jpeg|webp)(?:["?#]|$)/i.test(m[1])) return m[1];
    if (!fallback) fallback = m[1];
  }
  return fallback;
}

function resolveArticleOgImageUrl(rawBodyHtml, data) {
  const keys = ["ogImage", "heroImage", "coverImage", "image", "shareImage"];
  for (const k of keys) {
    const v = data?.[k];
    if (v != null && String(v).trim()) {
      const abs = toAbsoluteOgUrl(String(v).trim());
      if (abs) return abs;
    }
  }
  const fromHeader = extractOgImageHrefFromLegacyBlogHeader(rawBodyHtml);
  if (fromHeader) return toAbsoluteOgUrl(fromHeader);
  const fromBody = extractFirstBlogImageFromBody(rawBodyHtml);
  if (fromBody) return toAbsoluteOgUrl(fromBody);
  return DEFAULT_OG_IMAGE;
}

function blogSectionIndexUrl(href) {
  const h = String(href || "").trim() || "/blog/article";
  const pathOnly = h.startsWith("/") ? h : `/${h}`;
  return ensureTrailingSlashOnCanonical(`${SITE_ORIGIN}${pathOnly}`);
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

function buildArticleStructuredDataScript({
  documentTitle,
  plainTitle,
  description,
  canonical,
  imageUrl,
  authorPersonName,
  authorImageUrl,
  metaCategoryLabel,
  metaCategoryHref,
}) {
  const graph = [];
  const authorId = `${canonical}#author`;
  const blogPosting = {
    "@type": "BlogPosting",
    headline: documentTitle,
    description,
    url: canonical,
    image: [imageUrl],
    publisher: {
      "@type": "Organization",
      name: "Serenity",
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };

  const name = authorPersonName && String(authorPersonName).trim() ? String(authorPersonName).trim() : "";
  if (name) {
    blogPosting.author = { "@id": authorId };
    const person = { "@type": "Person", "@id": authorId, name };
    const img = authorImageUrl && String(authorImageUrl).trim() ? toAbsoluteOgUrl(authorImageUrl) : "";
    if (img) person.image = img;
    graph.push(person);
  } else {
    blogPosting.author = { "@type": "Organization", name: "Serenity" };
  }

  graph.unshift(blogPosting);

  const catLabel = String(metaCategoryLabel || "Статьи").trim() || "Статьи";
  const crumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Serenity", item: `${SITE_ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_ORIGIN}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: catLabel,
        item: blogSectionIndexUrl(metaCategoryHref),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: String(plainTitle || documentTitle).trim() || documentTitle,
        item: canonical,
      },
    ],
  };
  graph.push(crumbs);

  const doc = { "@context": "https://schema.org", "@graph": graph };
  return `<script type="application/ld+json">${JSON.stringify(doc)}</script>`;
}

/**
 * Полная подстановка SEO/GEO в head: OG article, Twitter, og:image (из материала или дефолт главной),
 * canonical со слэшем, robots, geo, JSON-LD @graph (BlogPosting + BreadcrumbList + Person при авторе).
 */
function injectBlogArticleHead(
  html,
  { title, description, canonical, authorPersonName, ogImageUrl, metaCategoryLabel, metaCategoryHref, authorImageUrl },
) {
  const canon = ensureTrailingSlashOnCanonical(canonical);
  const img = ogImageUrl && String(ogImageUrl).trim() ? String(ogImageUrl).trim() : DEFAULT_OG_IMAGE;
  const imType = ogImageMimeFromUrl(img);
  const metaAuthor = authorPersonName && String(authorPersonName).trim() ? String(authorPersonName).trim() : "Serenity";
  const documentTitle = formatArticleDocumentTitle(title);

  const block =
    `\n    <meta name="title" content="${escapeXml(documentTitle)}" />\n` +
    `    <meta property="og:title" content="${escapeXml(documentTitle)}" />\n` +
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
    `    <meta name="twitter:title" content="${escapeXml(documentTitle)}" />\n` +
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
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(documentTitle)}</title>`);
  const jsonLd = buildArticleStructuredDataScript({
    documentTitle,
    plainTitle: title,
    description,
    canonical: canon,
    imageUrl: img,
    authorPersonName,
    authorImageUrl,
    metaCategoryLabel,
    metaCategoryHref,
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
                loading="eager"
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
                loading="eager"
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
  metaCategoryHref = "/blog/article",
}) {
  const catLabel = String(metaCategoryLabel || "Статьи").trim() || "Статьи";
  const catHref = String(metaCategoryHref || "/blog/article").trim() || "/blog/article";
  const metaParts =
    `<p class="blog-article-page-top__meta" data-v-27a87df0="">` +
    `<a href="${escapeXml(catHref)}" class="blog-article-page-top__meta-link">${escapeXml(catLabel)}</a>` +
    (datePublished
      ? `<span class="blog-article-page-top__meta-date">${escapeXml(datePublished)}</span>`
      : "") +
    `</p>`;
  const desc = description != null && String(description).trim() ? String(description).trim() : "";
  const lead = desc ? `<p class="blog-article-page-top__lead">${linkContextualAdsPhrasesInLead(desc)}</p>` : "";
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
      )}" width="80" height="80" decoding="async" loading="eager" fetchpriority="low" /></div>`
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

function buildReadMoreSection(ctx, articleFeed, fullFeed) {
  const currentPath = postPathFromCtx(ctx);
  const useArticleOnlyFeed = String(ctx?.segment || "article") === "article";
  const rawFeed =
    useArticleOnlyFeed && Array.isArray(articleFeed) && articleFeed.length > 0
      ? articleFeed
      : Array.isArray(fullFeed) && fullFeed.length > 0
        ? fullFeed
        : articleFeed;
  /* Внешние URL (vc.ru, mave) не участвуют в порядке «8 до / после». */
  const feed = (rawFeed || []).filter((p) => normBlogPath(p.href).startsWith("/blog/"));
  if (!feed.length || !currentPath) return "";

  const isCurrent = (p) => normBlogPath(p.href) === currentPath;
  const idx = feed.findIndex(isCurrent);
  let related = [];
  if (idx === -1) {
    if (!useArticleOnlyFeed) return "";
    const currentSlug = String(ctx?.readMoreSlug || ctx?.slug || "").trim();
    related = feed
      .filter((p) => articleSlugFromHref(p.href) !== currentSlug)
      .slice(0, READ_MORE_EDGE);
  } else {
    const beforeCount = idx;
    const afterCount = feed.length - 1 - idx;
    if (beforeCount < READ_MORE_NEIGHBORS) {
      related = feed.slice(idx + 1, idx + 1 + READ_MORE_EDGE);
    } else if (afterCount < READ_MORE_EDGE) {
      /* У конца ленты (< 8 новее): 8 материалов раньше по порядку posts. */
      related = feed.slice(Math.max(0, idx - READ_MORE_EDGE), idx);
    } else {
      related = [
        ...feed.slice(idx - READ_MORE_NEIGHBORS, idx),
        ...feed.slice(idx + 1, idx + 1 + READ_MORE_NEIGHBORS),
      ];
    }
  }
  if (related.length === 0) return "";

  const afterCountForNewest = idx === -1 ? READ_MORE_EDGE : feed.length - 1 - idx;
  const usedBackwardEdge =
    idx !== -1 && afterCountForNewest < READ_MORE_EDGE && idx >= READ_MORE_NEIGHBORS;

  /* Самый свежий пост (первый в ленте) — в «Читайте ещё», если это не текущая страница и его ещё нет в подборке. */
  const newest = feed[0];
  if (!usedBackwardEdge && newest && !isCurrent(newest)) {
    const newestHref = normBlogPath(newest.href);
    const already = related.some((p) => normBlogPath(p.href) === newestHref);
    if (!already) {
      const merged = [newest, ...related];
      const seen = new Set();
      const deduped = [];
      for (const p of merged) {
        const h = normBlogPath(p.href);
        if (seen.has(h)) continue;
        seen.add(h);
        deduped.push(p);
        if (deduped.length >= READ_MORE_EDGE) break;
      }
      related = deduped;
    }
  }

  const slides = related
    .map((c, slideIdx) => {
      const card = renderListingCard(c, slideIdx, { forReadMore: true });
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
function renderTypedBlogArticlePage(data, ctx, articleFeed, fullFeed, prefixArticleShell, suffix) {
  const { readMoreSlug, segment, slug } = ctx;
  const rawBodyHtml = data.bodyHtml || "";
  let bodyForArticle = normalizeBlogArticleBodyHtml(rawBodyHtml);
  const legacyBlogHeader = extractDateAndStripLegacyBlogHeader(bodyForArticle);
  bodyForArticle = legacyBlogHeader.rest;
  bodyForArticle = applyBlogArticleBodyListMarkup(bodyForArticle);
  bodyForArticle = applyBlogArticleStageHeadingMarkup(bodyForArticle);
  bodyForArticle = applyBlogArticleBodyMediaMarkup(bodyForArticle, {
    blogBodyMediaLayout: data.blogBodyMediaLayout,
  });
  bodyForArticle = applyBlogArticleMediaCaptionMarkup(bodyForArticle);
  bodyForArticle = applyBlogArticleBodyImageSrcsetSizes(bodyForArticle, {
    blogBodyMediaLayout: data.blogBodyMediaLayout,
  });
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
  const readAlso = buildReadMoreSection(ctx, articleFeed, fullFeed);
  const title = stripBlogCategoryFromTitle(data.title) || slug;
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
  let metaCategoryHref = "/blog/article";
  if (segment === "case") {
    metaCategoryLabel = "Кейсы";
    metaCategoryHref = "/blog/case";
  } else if (segment === "card") {
    metaCategoryLabel = "Карточки";
    metaCategoryHref = "/blog/card";
  } else if (segment === "life") {
    metaCategoryLabel = "Наша жизнь";
    metaCategoryHref = "/blog/life";
  } else if (segment === "article" && articleMentionsMyshelovka(data)) {
    metaCategoryLabel = "Подкаст";
    metaCategoryHref = "/blog/podcast";
  }
  const pageTopHtml = renderBlogArticlePageTop({
    title,
    description: metaDescription,
    datePublished: legacyBlogHeader.datePublished,
    metaCategoryLabel,
    metaCategoryHref,
  });

  const ogImageResolved = resolveArticleOgImageUrl(rawBodyHtml, data);
  const authorPhotoAbs = authorResolved?.photo ? toAbsoluteOgUrl(authorResolved.photo) : "";

  let headPart = injectBlogArticleHead(prefixArticleShell, {
    title,
    description: metaDescription,
    canonical: canonicalForHead,
    authorPersonName,
    ogImageUrl: ogImageResolved,
    metaCategoryLabel,
    metaCategoryHref,
    authorImageUrl: authorPhotoAbs,
  });
  const outHtml = readAlso
    ? `${headPart}${pageTopHtml}${body}\n${readAlso}\n${suffix}`
    : `${headPart}${pageTopHtml}${body}\n${suffix}`;

  const { html: typedHtml } = processTypographyHtml(outHtml, { force: true });
  return typedHtml;
}

(async () => {
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
  await primeListingCardImageWidths(allBlogPosts);

  const blogIndex = fs.readFileSync(listingPath, "utf8");
  const startReplace = blogIndex.indexOf('<div class="page-container nuxt case-all-page"');
  const endReplace = blogIndex.indexOf('<div class="scroll-container case-all-scroll-footer"');
  if (startReplace === -1 || endReplace === -1) {
    throw new Error("blog/index.html: не найдены маркеры page-container / scroll-container");
  }

  const prefix = blogIndex.slice(0, startReplace);
  const suffix = stripBlogJs(blogIndex.slice(endReplace));
  const prefixArticleShell = injectBlogArticleShellStyles(
    stripBlogListingJsonPreload(
      stripUnresolvedPlaceholderMetaInHead(
        stripBlogListingSeoMetaBeforeOg(prefix.replace(/\s*<!--@blog-json-preload-->\s*\n?/, "\n")),
      ),
    ),
  );

  for (const slug of articleSlugs) {
    if (!slug || typeof slug !== "string") continue;
    const jp = path.join(jsonDir, `${slug}.json`);
    if (!fs.existsSync(jp)) {
      console.warn(`WARN: нет данных ${jp} — сначала npm run sync:blog-articles (или sync в build:blog)`);
      continue;
    }
    const rawArticle = fs.readFileSync(jp, "utf8");
    if (!rawArticle.trim()) {
      console.warn(`WARN: пустой JSON ${jp} — пропуск (восстановите файл или удалите slug из манифеста)`);
      continue;
    }
    const data = JSON.parse(rawArticle);
    const typedHtml = renderTypedBlogArticlePage(
      data,
      { readMoreSlug: slug, segment: "article", slug },
      articleFeed,
      allBlogPosts,
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
    const rawPost = fs.readFileSync(jp, "utf8");
    if (!rawPost.trim()) {
      console.warn(`WARN: пустой JSON ${jp} — пропуск`);
      continue;
    }
    const data = JSON.parse(rawPost);
    const typedHtml = renderTypedBlogArticlePage(
      data,
      { readMoreSlug: slug, segment, slug },
      articleFeed,
      allBlogPosts,
      prefixArticleShell,
      suffix,
    );
    const outDir = path.join(root, "blog", segment, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), typedHtml, "utf8");
    console.log("OK: blog/", segment, "/", slug, "/");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
