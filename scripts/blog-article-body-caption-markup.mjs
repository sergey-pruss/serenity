/**
 * Единый класс подписи к иллюстрациям — `sa-blog-media__caption` (см. css/sections/blog-article-prose.css).
 * После `applyBlogArticleBodyMediaMarkup`: навешиваем класс на `<p>` с подписью (`<small>` / `<em>`) рядом с блоком медиа,
 * нормализуем легаси `wp-caption-text` и `content-figure__caption` в тот же класс без дублей.
 */

const CAPTION = "sa-blog-media__caption";

/**
 * @param {string} attrs — фрагмент между `<p` и `>` (без угловых скобок)
 */
function injectCaptionClassIntoOpeningTagAttrs(attrs) {
  const raw = String(attrs || "");
  const dq = raw.match(/\bclass\s*=\s*"([^"]*)"/i);
  if (dq) {
    let cls = dq[1]
      .replace(/\bwp-caption-text\b/gi, "")
      .replace(/\bcontent-figure__caption\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!new RegExp(`\\b${CAPTION}\\b`).test(cls)) cls = `${cls} ${CAPTION}`.trim();
    return raw.replace(/\bclass\s*=\s*"[^"]*"/i, `class="${cls}"`);
  }
  const sq = raw.match(/\bclass\s*=\s*'([^']*)'/i);
  if (sq) {
    let cls = sq[1]
      .replace(/\bwp-caption-text\b/gi, "")
      .replace(/\bcontent-figure__caption\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!new RegExp(`\\b${CAPTION}\\b`).test(cls)) cls = `${cls} ${CAPTION}`.trim();
    return raw.replace(/\bclass\s*=\s*'[^']*'/i, `class='${cls}'`);
  }
  const t = raw.trim();
  return t ? ` ${t} class="${CAPTION}"` : ` class="${CAPTION}"`;
}

/** Легаси-классы подписи в любом `class="..."` → канон + без дублей `sa-blog-media__caption`. */
function normalizeLegacyCaptionClassesInQuotedAttrs(html) {
  return String(html || "").replace(/\bclass\s*=\s*"([^"]*)"/gi, (full, cls) => {
    if (!/\bwp-caption-text\b/i.test(cls) && !/\bcontent-figure__caption\b/i.test(cls)) return full;
    let c = cls
      .replace(/\bwp-caption-text\b/gi, "")
      .replace(/\bcontent-figure__caption\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!new RegExp(`\\b${CAPTION}\\b`).test(c)) c = `${c} ${CAPTION}`.trim();
    return `class="${c}"`;
  });
}

/**
 * WP-экспорт: `<p class="sa-blog-body-media…"><img/><br/><small>…</small></p>` — подпись внутри блока медиа,
 * без отступов/интерлиньяжа из `p.sa-blog-media__caption`. Выносим подпись во второй абзац с каноном.
 */
function splitInlineCaptionOutOfBodyMediaParagraph(html) {
  return String(html || "").replace(
    /<p(\b[^>]*\bsa-blog-body-media\b[^>]*)>\s*(<img\b[^>]*>)\s*(?:<br\s*\/?>\s*)?<(small|em|strong)(\b[^>]*>)([\s\S]*?)<\/\3>\s*<\/p>/gi,
    (_, attrs, img, tag, tagOpenRest, inner) => `<p${attrs}>${img}</p><p class="${CAPTION}"><${tag}${tagOpenRest}${inner}</${tag}></p>`,
  );
}

/** `<p class="sa-blog-body-media…">…</p>` + `<p>…<small|em>…` */
function tagCaptionParagraphAfterBodyMediaP(html) {
  return String(html || "").replace(
    /(<p\b[^>]*\bsa-blog-body-media\b[^>]*>[\s\S]*?<\/p>)\s*<p(\b[^>]*?)(\s*>[\s\r\n]*<(?:small|em)\b[^>]*>[\s\S]*?<\/(?:small|em)>[\s\r\n]*<\/p>)/gi,
    (full, closeMedia, pAttrs, pTail) => {
      if (new RegExp(`\\b${CAPTION}\\b`).test(pAttrs)) return full;
      return `${closeMedia}<p${injectCaptionClassIntoOpeningTagAttrs(pAttrs)}${pTail}`;
    }
  );
}

/** `<p>…<small|em>…</p>` сразу перед `<p class="sa-blog-body-media` */
function tagCaptionParagraphBeforeBodyMediaP(html) {
  return String(html || "").replace(
    /(<p)(\b[^>]*?)(\s*>[\s\r\n]*<(?:small|em)\b[^>]*>[\s\S]*?<\/(?:small|em)>[\s\r\n]*<\/p>)\s*(<p\b[^>]*\bsa-blog-body-media\b)/gi,
    (full, op, pAttrs, innerClose, mediaOpen) => {
      if (new RegExp(`\\b${CAPTION}\\b`).test(pAttrs)) return full;
      return `${op}${injectCaptionClassIntoOpeningTagAttrs(pAttrs)}${innerClose}${mediaOpen}`;
    }
  );
}

/**
 * У `figure` с медиа-классами — `figcaption` без `sa-blog-media__caption`: добавить канон.
 * Не трогаем `specialist__attributes`.
 */
function tagFigcaptionOnMediaFigures(html) {
  return String(html || "").replace(
    /<figure(\b[^>]*\b(?:sa-blog-media|sa-blog-body-media)\b[^>]*)>((?:(?!<\/figure>)[\s\S])*?)<\/figure>/gi,
    (full, openAttrs, inner) => {
      if (/\bspecialist__attributes\b/.test(inner)) return full;
      const inner2 = inner.replace(/<figcaption\b([^>]*)>/gi, (m, attrs) => {
        if (/\bspecialist__attributes\b/.test(attrs)) return m;
        if (new RegExp(`\\b${CAPTION}\\b`).test(attrs)) return m;
        if (/\bclass\s*=/i.test(attrs)) {
          const dq = attrs.match(/\bclass\s*=\s*"([^"]*)"/i);
          if (dq) {
            let cls = dq[1].replace(/\s+/g, " ").trim();
            if (!new RegExp(`\\b${CAPTION}\\b`).test(cls)) cls = `${cls} ${CAPTION}`.trim();
            return `<figcaption${attrs.replace(/\bclass\s*=\s*"[^"]*"/i, `class="${cls}"`)}>`;
          }
        }
        const a = String(attrs || "").trim();
        return a ? `<figcaption ${a} class="${CAPTION}">` : `<figcaption class="${CAPTION}">`;
      });
      return `<figure${openAttrs}>${inner2}</figure>`;
    }
  );
}

/**
 * @param {string} html
 * @returns {string}
 */
export function applyBlogArticleMediaCaptionMarkup(html) {
  let out = String(html || "");
  out = normalizeLegacyCaptionClassesInQuotedAttrs(out);
  out = splitInlineCaptionOutOfBodyMediaParagraph(out);
  out = tagCaptionParagraphBeforeBodyMediaP(out);
  out = tagCaptionParagraphAfterBodyMediaP(out);
  out = tagFigcaptionOnMediaFigures(out);
  return out;
}
