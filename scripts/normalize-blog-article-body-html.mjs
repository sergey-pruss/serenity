/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: для WebKit (Safari) на локалке — один адрес ролика только в `src` на `<video>`,
 * без вложенных `<source>` / `<a>` (иначе 0:00, «запрещено» или нестабильный выбор дорожки).
 * `playsinline` + `webkit-playsinline` для совместимости.
 */
function stripVideoSrcAttr(attrs) {
  return String(attrs || "")
    .replace(/\s+src\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+src\s*=\s*'[^']*'/gi, "");
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
      next = next.replace(/\scontrols\s*=\s*"controls"/gi, " controls");
      if (!/\bplaysinline\b/i.test(next)) next = `${next} playsinline=""`;
      if (!/\bwebkit-playsinline\b/i.test(next)) next = `${next} webkit-playsinline=""`;
      if (!videoSrc) {
        return `<video${next}>${innerStr}</video>`;
      }
      return `<video${next} src="${videoSrc}"></video>`;
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
