/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: только `<source src>` без `src` на `<video>` — в Safari/WebKit локально
 * часто не подхватывается длительность/декодер; дублируем URL в `src` и добавляем playsinline.
 */
function normalizeWpVideoShortcodeForWebKit(html) {
  return String(html || "").replace(
    /<video(\s[^>]*\bclass="[^"]*\bwp-video-shortcode\b[^"]*"[^>]*)>([\s\S]*?)<\/video>/gi,
    (full, attrs, inner) => {
      const sm = String(inner).match(/\bsrc\s*=\s*"([^"]+)"/i);
      const srcUrl = sm ? sm[1] : "";
      let next = attrs;
      if (srcUrl && !/\bsrc\s*=/.test(next)) next = `${next} src="${srcUrl}"`;
      if (!/\bplaysinline\b/i.test(next)) next = `${next} playsinline=""`;
      return `<video${next}>${inner}</video>`;
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
