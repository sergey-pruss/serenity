/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: только `<source src>` без `src` на `<video>` — в Safari/WebKit локально
 * часто не подхватывается длительность/декодер; дублируем URL в `src` и добавляем playsinline.
 * Если одновременно заданы `src` на `<video>` и `<source>` с тем же URL — Safari часто
 * ломает воспроизведение; оставляем один канал — атрибут `src` на `<video>`.
 */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripVideoSourcesMatchingUrl(inner, url) {
  if (!url) return inner;
  const esc = escapeRe(url);
  let s = String(inner);
  s = s.replace(new RegExp(`<source\\b[^>]*\\bsrc\\s*=\\s*"${esc}"[^>]*/?>`, "gi"), "");
  s = s.replace(new RegExp(`<source\\b[^>]*\\bsrc\\s*=\\s*'${esc}'[^>]*/?>`, "gi"), "");
  return s;
}

function normalizeWpVideoShortcodeForWebKit(html) {
  return String(html || "").replace(
    /<video(\s[^>]*\bclass="[^"]*\bwp-video-shortcode\b[^"]*"[^>]*)>([\s\S]*?)<\/video>/gi,
    (full, attrs, inner) => {
      const innerStr = String(inner);
      const sm =
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*"([^"]+)"/i) ||
        innerStr.match(/<source\b[^>]*\bsrc\s*=\s*'([^']+)'/i) ||
        innerStr.match(/\bsrc\s*=\s*"([^"]+)"/i) ||
        innerStr.match(/\bsrc\s*=\s*'([^']+)'/i);
      const srcFromSource = sm ? sm[1] : "";
      const vm =
        /\bsrc\s*=\s*"([^"]+)"/i.exec(attrs) || /\bsrc\s*=\s*'([^']+)'/i.exec(attrs);
      let videoSrc = vm ? vm[1] : srcFromSource;
      let next = attrs;
      if (videoSrc && !/\bsrc\s*=/.test(next)) next = `${next} src="${videoSrc}"`;
      if (!/\bplaysinline\b/i.test(next)) next = `${next} playsinline=""`;
      const finalM =
        /\bsrc\s*=\s*"([^"]+)"/i.exec(next) || /\bsrc\s*=\s*'([^']+)'/i.exec(next);
      const finalSrc = finalM ? finalM[1] : videoSrc;
      const cleanInner = stripVideoSourcesMatchingUrl(innerStr, finalSrc);
      return `<video${next}>${cleanInner}</video>`;
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
