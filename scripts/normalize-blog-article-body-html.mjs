/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: для WebKit (Safari) на локалке:
 * — не смешиваем `src` на `<video>` и `<source>` с тем же URL (нестабильно);
 * — **только** `<source type="video/mp4" src="…">` (без `src` на `<video>`), плюс `playsinline`;
 * — убираем fallback-`<a href="…mp4">` внутри `<video>` — WebKit часто показывает «запрет
 *   воспроизведения», если внутри остаётся ссылка на тот же ресурс.
 */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripVideoSrcAttr(attrs) {
  return String(attrs || "")
    .replace(/\s+src\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+src\s*=\s*'[^']*'/gi, "");
}

function stripVideoSourcesMatchingUrl(inner, url) {
  if (!url) return inner;
  const esc = escapeRe(url);
  let s = String(inner);
  s = s.replace(new RegExp(`<source\\b[^>]*\\bsrc\\s*=\\s*"${esc}"[^>]*/?>`, "gi"), "");
  s = s.replace(new RegExp(`<source\\b[^>]*\\bsrc\\s*=\\s*'${esc}'[^>]*/?>`, "gi"), "");
  return s;
}

/** Ссылки WordPress «скачать mp4» внутри `<video>` — убираем, если ведут на тот же файл. */
function stripFallbackAnchorsMatchingUrl(inner, url) {
  if (!url) return inner;
  const esc = escapeRe(url);
  let s = String(inner);
  s = s.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*"${esc}"[^>]*>[\\s\\S]*?<\\/a>`, "gi"), "");
  s = s.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*'${esc}'[^>]*>[\\s\\S]*?<\\/a>`, "gi"), "");
  return s;
}

function normalizeWpVideoShortcodeForWebKit(html) {
  return String(html || "").replace(
    /<video(\s[^>]*\bclass="[^"]*\bwp-video-shortcode\b[^"]*"[^>]*)>([\s\S]*?)<\/video>/gi,
    (full, attrs, inner) => {
      const innerStr = String(inner);
      const sm =
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*"([^"]+)"/i) ||
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*'([^']+)'/i);
      const vm = /\bsrc\s*=\s*"([^"]+)"/i.exec(attrs) || /\bsrc\s*=\s*'([^']+)'/i.exec(attrs);
      const videoSrc = (vm && vm[1]) || (sm && sm[1]) || "";
      let next = stripVideoSrcAttr(attrs);
      if (!/\bplaysinline\b/i.test(next)) next = `${next} playsinline=""`;
      if (!videoSrc) {
        return `<video${next}>${innerStr}</video>`;
      }
      let body = stripVideoSourcesMatchingUrl(innerStr, videoSrc);
      body = stripFallbackAnchorsMatchingUrl(body, videoSrc);
      body = body.replace(/>\s+</g, "><").trim();
      const sourceTag = `<source type="video/mp4" src="${videoSrc}" />`;
      if (/<source\b/i.test(body)) {
        return `<video${next}>${body}</video>`;
      }
      return `<video${next}>${sourceTag}${body ? body : ""}</video>`;
    },
  );
}

export function normalizeBlogArticleBodyHtml(html) {
  let s = normalizeWpVideoShortcodeForWebKit(html);
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
