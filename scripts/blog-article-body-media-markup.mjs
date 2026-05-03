/**
 * Класс `sa-blog-body-media` на блоках с иллюстрациями/видео в теле статей
 * (см. css/sections/blog-article-prose.css). Узкая ширина как у колонки текста (~733px):
 * `sa-blog-body-media--text` (`blogBodyMediaLayout`: `"text"`) или `sa-blog-body-media--content` (`"content"` — то же по ширине, отдельное имя класса).
 * Широкий блок: второй класс `sa-blog-body-media--wide` (ширина с отступами как у сетки страницы), если в JSON нет `blogBodyMediaLayout: "text"` / `"content"`.
 * Не трогаем `<figure>` с общими стилями margin — только WP `.wp-caption` / `.wp-video` и `<p>` с картинкой:
 * только `<img>` или `<img>` + опц. `<br>` + подпись `<small|em|strong>…</>` (частый WP-паттерн).
 */

const MEDIA_CLASS = "sa-blog-body-media";
const MEDIA_TEXT_CLASS = "sa-blog-body-media--text";
const MEDIA_CONTENT_CLASS = "sa-blog-body-media--content";
const MEDIA_WIDE_CLASS = "sa-blog-body-media--wide";

/** @param {string} layout */
function mediaLayoutModifier(layout) {
  const l = String(layout || "").toLowerCase();
  if (l === "text") return MEDIA_TEXT_CLASS;
  if (l === "content") return MEDIA_CONTENT_CLASS;
  return "";
}

/**
 * @param {string} attrs
 * @param {{ layout?: string }} [opts] — `layout`: `""` | `"text"` | `"content"`
 * @returns {string}
 */
function mergeMediaClassIntoAttrs(attrs, opts = {}) {
  const a = attrs || "";
  const mod = mediaLayoutModifier(opts.layout);
  if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return a;
  const tail = mod ? ` ${MEDIA_CLASS} ${mod}` : ` ${MEDIA_CLASS}`;
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
  const cls = mod ? `${MEDIA_CLASS} ${mod}` : MEDIA_CLASS;
  if (t) return ` ${t} class="${cls}"`;
  return ` class="${cls}"`;
}

/**
 * @param {string} html
 * @param {string} token class token, e.g. wp-caption
 * @param {{ layout?: string }} [opts]
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
 * Абзацы с ведущей иллюстрацией: `<p><img/></p>`, с `<br>`, с подписью `<small>` / `<em>` / `<strong>` (с br или без).
 * @param {string} html
 * @param {{ layout?: string }} [opts]
 */
function addMediaClassToImageOnlyParagraphs(html, opts = {}) {
  let out = String(html || "");
  // Сначала абзацы «картинка + br + подпись small/em» — иначе не попадут под узкий паттерн «только img».
  out = out.replace(
    /<p(\b[^>]*)>\s*(<img\b[^>]*>)\s*(<br\s*\/?>\s*<(small|em|strong)\b[^>]*>[\s\S]*?<\/\4>\s*)<\/p>/gi,
    (full, attrs, imgPart, tail) => {
      const a = attrs || "";
      if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return full;
      return `<p${mergeMediaClassIntoAttrs(a, opts)}>${imgPart}${tail}</p>`;
    }
  );
  // Картинка + подпись без br (частый WP-экспорт).
  out = out.replace(
    /<p(\b[^>]*)>\s*(<img\b[^>]*>)\s*(<(small|em|strong)\b[^>]*>[\s\S]*?<\/\4>\s*)<\/p>/gi,
    (full, attrs, imgPart, tail) => {
      const a = attrs || "";
      if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return full;
      return `<p${mergeMediaClassIntoAttrs(a, opts)}>${imgPart}${tail}</p>`;
    }
  );
  // Картинка + одиночный br без подписи.
  out = out.replace(
    /<p(\b[^>]*)>\s*(<img\b[^>]*>)\s*(<br\s*\/?>\s*)<\/p>/gi,
    (full, attrs, imgPart, tail) => {
      const a = attrs || "";
      if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return full;
      return `<p${mergeMediaClassIntoAttrs(a, opts)}>${imgPart}${tail}</p>`;
    }
  );
  out = out.replace(
    /<p(\b[^>]*)>(\s*<img\b[^>]*>\s*)<\/p>/gi,
    (full, attrs, inner) => {
      const a = attrs || "";
      if (new RegExp(`\\b${MEDIA_CLASS}\\b`).test(a)) return full;
      return `<p${mergeMediaClassIntoAttrs(a, opts)}>${inner}</p>`;
    }
  );
  return out;
}

/** Снять широкие модификаторы перед навешиванием узкой колонки (в синке уже может быть `--wide` / `--bleed`). */
function stripWideModifiersFromBodyMediaClass(cls) {
  return String(cls || "")
    .replace(/\bsa-blog-body-media--bleed\b/g, "")
    .replace(/\bsa-blog-body-media--wide\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function appendBodyMediaTextModifier(html) {
  return String(html || "").replace(/\bclass="([^"]*\bsa-blog-body-media\b[^"]*)"/gi, (full, cls) => {
    let c = stripWideModifiersFromBodyMediaClass(cls);
    c = c.replace(new RegExp(`\\b${MEDIA_CONTENT_CLASS}\\b`, "g"), "").replace(/\s+/g, " ").trim();
    if (new RegExp(`\\b${MEDIA_TEXT_CLASS}\\b`).test(c)) return `class="${c}"`;
    return `class="${c} ${MEDIA_TEXT_CLASS}"`.replace(/\s+/g, " ").trim();
  });
}

/** Добавить `sa-blog-body-media--content` к уже размеченным блокам. */
function appendBodyMediaContentModifier(html) {
  return String(html || "").replace(/\bclass="([^"]*\bsa-blog-body-media\b[^"]*)"/gi, (full, cls) => {
    let c = stripWideModifiersFromBodyMediaClass(cls);
    c = c.replace(new RegExp(`\\b${MEDIA_TEXT_CLASS}\\b`, "g"), "").replace(/\s+/g, " ").trim();
    if (new RegExp(`\\b${MEDIA_CONTENT_CLASS}\\b`).test(c)) return `class="${c}"`;
    return `class="${c} ${MEDIA_CONTENT_CLASS}"`.replace(/\s+/g, " ").trim();
  });
}

/** Второй класс для широких иллюстраций (не `--text` / `--content`). Легаси `--bleed` приводим к `--wide`. */
function appendBodyMediaWideModifier(html) {
  let out = String(html || "").replace(/\bsa-blog-body-media--bleed\b/g, MEDIA_WIDE_CLASS);
  return out.replace(/\bclass="([^"]*\bsa-blog-body-media\b[^"]*)"/gi, (full, cls) => {
    if (new RegExp(`\\b${MEDIA_TEXT_CLASS}\\b`).test(cls)) return full;
    if (new RegExp(`\\b${MEDIA_CONTENT_CLASS}\\b`).test(cls)) return full;
    if (new RegExp(`\\b${MEDIA_WIDE_CLASS}\\b`).test(cls)) return full;
    return `class="${cls.trim()} ${MEDIA_WIDE_CLASS}"`;
  });
}

/**
 * @param {string} html
 * @param {{ blogBodyMediaLayout?: string }} [options] — `"text"` → `--text`, `"content"` → `--content` (узкая колонка); иначе → `--wide`
 * @returns {string}
 */
export function applyBlogArticleBodyMediaMarkup(html, options = {}) {
  const layout = String(options.blogBodyMediaLayout || "").toLowerCase();
  const opts = { layout };
  let out = String(html || "");
  out = addMediaClassToDivWithClassToken(out, "wp-caption", opts);
  out = addMediaClassToDivWithClassToken(out, "wp-video", opts);
  out = addMediaClassToImageOnlyParagraphs(out, opts);
  if (layout === "text") {
    out = appendBodyMediaTextModifier(out);
  } else if (layout === "content") {
    out = appendBodyMediaContentModifier(out);
  } else {
    out = appendBodyMediaWideModifier(out);
  }
  return out;
}
