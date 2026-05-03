/**
 * После шапки эталон Nuxt даёт
 * `<section class="darktheme" data-v-96fb7d6e><div class="specialist-mention">…</div></section>`.
 * Синк иногда сохраняет «голый» `.specialist-mention` без секции — не срабатывают стили
 * `section.darktheme:has(> .specialist-mention)`.
 *
 * WP `[video]`: как на **живом** `serenity.agency` (Nuxt / старый блог) — у `<video>` нет `src`,
 * только `<source type="video/mp4" src="https://…">` с **абсолютным HTTPS**.
 * Локально `http://127.0.0.1` + относительный `/_sa/…mp4` в Safari часто даёт 0:00 / «запрет»;
 * поэтому для путей `/_sa/img/blog/…` подставляем origin (см. `SERENITY_BLOG_VIDEO_ORIGIN`).
 */
function stripVideoSrcAttr(attrs) {
  return String(attrs || "")
    .replace(/\s+src\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+src\s*=\s*'[^']*'/gi, "");
}

/** Пустая строка = оставить относительные URL (только для отладки). */
function blogVideoAssetOrigin() {
  const raw = process.env.SERENITY_BLOG_VIDEO_ORIGIN;
  if (raw === "" || raw === "0") return "";
  return String(raw || "https://serenity.agency").replace(/\/+$/, "");
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
