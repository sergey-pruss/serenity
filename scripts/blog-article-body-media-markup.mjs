/**
 * Класс `sa-blog-body-media` на блоках с иллюстрациями/видео в теле статей
 * (см. css/sections/blog-article-prose.css). Опционально `sa-blog-body-media--text` — ширина как у колонки текста
 * (поле JSON `blogBodyMediaLayout`: `"text"` у `<slug>.json`, см. build-blog-article-pages.mjs).
 * Расширение «как видео» до края вьюпорта: класс `sa-blog-body-media--wide` (поле JSON `blogBodyMediaWideFilenameTokens` — подстроки в `src` у `<img>`).
 * Не трогаем `<figure>` с общими стилями margin — только WP `.wp-caption` / `.wp-video` и `<p>` только с `<img>`.
 */

const MEDIA_CLASS = "sa-blog-body-media";
const MEDIA_TEXT_CLASS = "sa-blog-body-media--text";
const WIDE_CLASS = "sa-blog-body-media--wide";

/**
 * @param {string} attrs
 * @param {{ narrow?: boolean }} [opts]
 * @returns {string}
 */
function mergeMediaClassIntoAttrs(attrs, opts = {}) {
  const a = attrs || "";
  const narrow = Boolean(opts.narrow);
  if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return a;
  const tail = narrow ? ` ${MEDIA_CLASS} ${MEDIA_TEXT_CLASS}` : ` ${MEDIA_CLASS}`;
  const dq = a.match(/\bclass\s*=\s*"([^"]*)"/i);
  if (dq) {
    const merged = `${dq[1].trim()}${tail}`.trim();
    return a.replace(/\bclass\s*=\s*"[^"]*"/i, `class="${merged}"`);
  }
  const sq = a.match(/\bclass\s*=\s*'([^']*)'/i);
  if (sq) {
    const merged = `${sq[1].trim()}${tail}`.trim();
    return a.replace(/\bclass\s*=\s*'[^']*'/i, `class='${merged}'`);
  }
  const t = a.trim();
  const cls = `${MEDIA_CLASS}${narrow ? ` ${MEDIA_TEXT_CLASS}` : ""}`.trim();
  if (t) return ` ${t} class="${cls}"`;
  return ` class="${cls}"`;
}

/**
 * @param {string} html
 * @param {string} token class token, e.g. wp-caption
 * @param {{ narrow?: boolean }} [opts]
 */
function addMediaClassToDivWithClassToken(html, token, opts = {}) {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<div(\\b[^>]*\\bclass="[^"]*\\b${esc}\\b[^"]*"[^>]*)>`, "gi");
  return String(html || "").replace(re, (full, attrs) => {
    if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(attrs)) return full;
    return `<div${mergeMediaClassIntoAttrs(attrs, opts)}>`;
  });
}

/**
 * `<p><img … /></p>` без других тегов — отступ на обёртке.
 * @param {string} html
 * @param {{ narrow?: boolean }} [opts]
 */
function addMediaClassToImageOnlyParagraphs(html, opts = {}) {
  return String(html || "").replace(
    /<p(\b[^>]*)>(\s*<img\b[^>]*>\s*)<\/p>/gi,
    (full, attrs, inner) => {
      const a = attrs || "";
      if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return full;
      return `<p${mergeMediaClassIntoAttrs(a, opts)}>${inner}</p>`;
    }
  );
}

/**
 * Уже есть `sa-blog-body-media` в разметке (ручная вставка) — добавить модификатор ширины текста.
 * @param {string} html
 * @returns {string}
 */
function appendBodyMediaTextModifier(html) {
  return String(html || "").replace(/\bclass="([^"]*\bsa-blog-body-media\b[^"]*)"/gi, (full, cls) => {
    if (new RegExp(`\\b${MEDIA_TEXT_CLASS}\\b`).test(cls)) return full;
    return `class="${cls.trim()} ${MEDIA_TEXT_CLASS}"`;
  });
}

/**
 * @param {string} html
 * @param {{ blogBodyMediaLayout?: string }} [options] — `blogBodyMediaLayout: "text"` → класс `sa-blog-body-media--text`
 * @returns {string}
 */
export function applyBlogArticleBodyMediaMarkup(html, options = {}) {
  const narrow = String(options.blogBodyMediaLayout || "").toLowerCase() === "text";
  const opts = { narrow };
  let out = String(html || "");
  out = addMediaClassToDivWithClassToken(out, "wp-caption", opts);
  out = addMediaClassToDivWithClassToken(out, "wp-video", opts);
  out = addMediaClassToImageOnlyParagraphs(out, opts);
  if (narrow) {
    out = appendBodyMediaTextModifier(out);
  }
  return out;
}

/**
 * Добавляет `sa-blog-body-media--wide` к `<p class="… sa-blog-body-media …">` с `<img src="…">`, если `src` содержит любой из токенов.
 * @param {string} html
 * @param {string[]|undefined} tokens
 * @returns {string}
 */
export function applyBlogArticleBodyWideMediaByTokens(html, tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return String(html || "");
  const needle = tokens.map((t) => String(t).trim()).filter(Boolean);
  if (!needle.length) return String(html || "");
  return String(html || "").replace(/<p\b([^>]*)>(\s*<img\b[^>]*>)\s*<\/p>/gi, (full, innerAttrs, inner) => {
    const clsM = String(innerAttrs || "").match(/\bclass\s*=\s*"([^"]*)"/i);
    if (!clsM) return full;
    const cls = clsM[1];
    if (!new RegExp(`\\b${MEDIA_CLASS}\\b`).test(cls)) return full;
    if (new RegExp(`\\b${MEDIA_TEXT_CLASS}\\b`).test(cls)) return full;
    if (new RegExp(`\\b${WIDE_CLASS}\\b`).test(cls)) return full;
    const srcM = /\bsrc="([^"]+)"/i.exec(inner);
    if (!srcM) return full;
    const src = srcM[1];
    if (!needle.some((tok) => src.includes(tok))) return full;
    const newCls = `${cls.trim()} ${WIDE_CLASS}`.trim();
    return `<p${String(innerAttrs).replace(/\bclass\s*=\s*"[^"]*"/i, `class="${newCls}"`)}>${inner}</p>`;
  });
}
