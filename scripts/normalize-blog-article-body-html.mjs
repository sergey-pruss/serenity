import { unwrapExcludedBlogArticleLinks } from "./blog-excluded-hrefs.mjs";

/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: у `<video>` часто нет `src`, только `<source type="video/mp4" src="…">`.
 * Статика отдаётся с того же origin, что и страница — в `src` оставляем **`/_sa/img/blog/…`** (same-origin).
 * При необходимости префикса другого хоста задайте **`SERENITY_BLOG_VIDEO_ORIGIN`** (например CDN).
 * Любые **`https://serenity.agency/_sa/…`** в теле приводим к **`/_sa/…`**.
 */
function stripVideoSrcAttr(attrs) {
  return String(attrs || "")
    .replace(/\s+src\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+src\s*=\s*'[^']*'/gi, "");
}

/** По умолчанию — same-origin (`/_sa/…`). Непустой `SERENITY_BLOG_VIDEO_ORIGIN` — префикс для mp4. */
function blogVideoAssetOrigin() {
  const raw = process.env.SERENITY_BLOG_VIDEO_ORIGIN;
  if (raw === "" || raw === "0") return "";
  if (raw != null && String(raw).trim() !== "") return String(raw).replace(/\/+$/, "");
  return "";
}

function absolutizeBlogVideoUrl(url, origin) {
  let u = String(url || "").trim();
  if (!u) return u;
  u = u.split(/[?#]/)[0];
  if (!origin) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${origin}${u}`;
  return u;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripAnchorByHref(s, href) {
  if (!href) return s;
  const esc = escapeRe(href);
  let out = s;
  out = out.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*"${esc}"[^>]*>[\\s\\S]*?<\\/a>`, "gi"), "");
  out = out.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*'${esc}'[^>]*>[\\s\\S]*?<\\/a>`, "gi"), "");
  return out;
}

/** Убираем старые `<source>` и fallback-`<a>` (в JSON часто `href` относительный, после сборки — абсолютный). */
function stripInnerVideoFallback(inner, rawSrc, absSrc) {
  let s = String(inner);
  s = s.replace(/<source\b[^>]*>/gi, "");
  const seen = new Set();
  for (const u of [rawSrc, absSrc]) {
    const base = String(u || "").split(/[?#]/)[0];
    if (!base || seen.has(base)) continue;
    seen.add(base);
    s = stripAnchorByHref(s, base);
  }
  return s.replace(/>\s+</g, "><").trim();
}

function normalizeWpVideoShortcodeForWebKit(html) {
  const origin = blogVideoAssetOrigin();
  return String(html || "").replace(
    /<video(\s[^>]*\bclass="[^"]*\bwp-video-shortcode\b[^"]*"[^>]*)>([\s\S]*?)<\/video>/gi,
    (full, attrs, inner) => {
      const innerStr = String(inner);
      const sm =
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*"([^"]+)"/i) ||
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*'([^']+)'/i);
      const vm = /\bsrc\s*=\s*"([^"]+)"/i.exec(attrs) || /\bsrc\s*=\s*'([^']+)'/i.exec(attrs);
      const rawSrc = (vm && vm[1]) || (sm && sm[1]) || "";
      if (!rawSrc) return full;
      const absSrc = absolutizeBlogVideoUrl(rawSrc, origin);
      const srcAttr = absSrc.replace(/&/g, "&amp;");
      let vattrs = stripVideoSrcAttr(attrs);
      if (!/\bpreload\s*=/i.test(vattrs)) vattrs = `${vattrs} preload="metadata"`;
      if (!/\bcontrols\b/i.test(vattrs)) vattrs = `${vattrs} controls="controls"`;
      const rest = stripInnerVideoFallback(innerStr, rawSrc, absSrc);
      return `<video${vattrs}><source type="video/mp4" src="${srcAttr}" />${rest ? rest : ""}</video>`;
    },
  );
}

/** Легаси Nuxt: декоративный фон шапки статьи — не используем в статике (см. blog-article-page-top). */
const BLOG_HEADER_BG_DIV_RE = /<div\b[^>]*\bblog-header__bg\b[^>]*>\s*<\/div>\s*/gi;

/**
 * WordPress при экспорте часто вставляет «пустой» абзац с неразрывным пробелом перед/после
 * `.wp-caption` / иллюстраций — в вёрстке блога у `<p>` полный line-height тела → большой серый зазор.
 */
const EMPTY_NBSP_ONLY_P_RE = /<p\b[^>]*>(?:\s|&nbsp;|&#160;|&#xa0;|&#XA0;)+<\/p>\s*/gi;

/** Nuxt `.article-slider` (swiper): на статике без JS все слайды в одну линию — дубль контента. */
const ARTICLE_SLIDER_SECTION_RE =
  /<section\b(\s[^>]*\barticle_section_l\b[^>]*)>\s*<div\b[^>]*\barticle-slider\b[^>]*>[\s\S]*?<\/section>/gi;

/**
 * @param {string} sliderSectionHtml
 * @returns {string}
 */
function extractFirstArticleSliderSlideInner(sliderSectionHtml) {
  const open = sliderSectionHtml.match(/<div class="swiper-slide\b[^>]*>/i);
  if (!open || open.index === undefined) return "";
  const i = open.index + open[0].length;
  const rest = sliderSectionHtml.slice(i);
  const m = rest.match(
    /^([\s\S]*?)(?=<\/div>\s*<div class="swiper-slide\b|<\/div>\s*<\/div>\s*<div class="swiper-pagination\b)/i,
  );
  return m ? m[1] : rest;
}

/**
 * @param {string} slideInner
 * @returns {string}
 */
function articleSliderSlideToBodyMediaHtml(slideInner) {
  const imgMatch = String(slideInner || "").match(/<img\b([^>]*)>/i);
  if (!imgMatch) return "";
  let attrs = imgMatch[1] || "";
  attrs = attrs
    .replace(/\bclass="[^"]*"/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\balt\s*=/.test(attrs)) attrs += ' alt=""';
  if (!/\bloading\s*=/.test(attrs)) attrs += ' loading="lazy"';
  const imgTag = `<img ${attrs}>`;

  const capMatch = slideInner.match(/<p class="case-slider__text"[^>]*>([\s\S]*?)<\/p>/i);
  let caption = "";
  if (capMatch) {
    const text = capMatch[1].replace(/<[^>]+>/g, "").trim();
    if (text) caption = `<p class="sa-blog-media__caption"><small>${text}</small></p>`;
  }
  return `<p class="sa-blog-body-media sa-blog-body-media--wide">${imgTag}</p>${caption}`;
}

/**
 * @param {string} html
 * @returns {string}
 */
export function collapseLegacyArticleSlidersToFirstImage(html) {
  return String(html || "").replace(ARTICLE_SLIDER_SECTION_RE, (full, sectionAttrs) => {
    const inner = extractFirstArticleSliderSlideInner(full);
    const media = articleSliderSlideToBodyMediaHtml(inner);
    if (!media) return "";
    return `<section${sectionAttrs}><div class="row" data-v-3da4b226 data-v-96fb7d6e> <div class="article-section text-content" data-v-3da4b226> <div class="article-section__info" data-v-3da4b226><div data-v-3da4b226>${media}</div> </div></div></div></section>`;
  });
}

export function normalizeBlogArticleBodyHtml(html) {
  let s = unwrapExcludedBlogArticleLinks(String(html || ""))
    .replace(/https:\/\/serenity\.agency\/_sa\//g, "/_sa/")
    .replace(BLOG_HEADER_BG_DIV_RE, "")
    .replace(EMPTY_NBSP_ONLY_P_RE, "")
    /* WP aligncenter в теле статей — в статике колонка текста влево (см. blog-article-prose.css) */
    .replace(/\baligncenter\b/g, "alignnone");
  s = collapseLegacyArticleSlidersToFirstImage(s);
  s = normalizeWpVideoShortcodeForWebKit(s);
  if (!s.includes("specialist-mention")) return s;
  if (/<\/section>\s*<section class="darktheme"[^>]*data-v-96fb7d6e[^>]*>\s*<div class="specialist-mention"/i.test(s)) {
    return s;
  }
  if (!/<\/section>\s*<div class="specialist-mention"/i.test(s)) return s;
  let out = s.replace(
    /<\/section>\s*<div class="specialist-mention"/i,
    '</section><section class="darktheme" data-v-96fb7d6e><div class="specialist-mention"'
  );
  out = out.replace(/<\/blockquote><\/div>\s*(<section\b)/i, "</blockquote></div></section>$1");
  return out;
}
