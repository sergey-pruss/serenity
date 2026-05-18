/**
 * Материалы, которые ещё приходят из CMS / светятся в ленте, но не должны попадать
 * в статический контур (нет страницы на проде, сняты с публикации и т.п.).
 * Ключ — канонический путь с `/` в конце (как в build-blog-data после canonBlogHref).
 */
export const EXCLUDED_BLOG_HREFS = new Set([
  "/blog/card/seo-v-youtube-pochemu-stoit-zanyatsya-optimizatsiej-video/",
  "/blog/card/kak-prevratit-klientov-v-poklonnikov/",
  "/blog/card/marketingovoe-agentstvo-polnogo-tsikla-i-digital-marketing/",
  "/blog/card/kak-dostich-masterstva/",
  "/blog/card/vrednye-sovety/",
  "/blog/article/vystuplenie-sergeya-prussa-na-digitale-masterstvo/",
  "/blog/article/videokontent-kak-emotsionalnyj-kontakt-s-brendom/",
  "/blog/article/ashan-tsifrovye-tehnologii-i-razvitie-klientotsentrichnosti/",
  "/blog/card/reklama-protiv-marketinga-kto-kogo/",
]);

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Варианты href в теле статей (относительные и абсолютные, со слэшем и без). */
export function excludedBlogHrefVariants() {
  const out = [];
  for (const h of EXCLUDED_BLOG_HREFS) {
    const withSlash = h.endsWith("/") ? h : `${h}/`;
    const noSlash = withSlash.replace(/\/+$/, "");
    out.push(withSlash, noSlash, `https://serenity.agency${withSlash}`, `https://serenity.agency${noSlash}`);
  }
  return [...new Set(out.filter(Boolean))];
}

/** @deprecated используйте excludedBlogHrefVariants */
export function excludedBlogArticleHrefVariants() {
  return excludedBlogHrefVariants();
}

/** Оставляем текст ссылки, убираем мёртвый URL (без «дыры» в предложении). */
function unwrapAnchorsByHref(html, href) {
  if (!href) return html;
  const esc = escapeRe(href);
  let out = String(html || "");
  out = out.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*"${esc}"[^>]*>([\\s\\S]*?)<\\/a>`, "gi"), "$1");
  out = out.replace(new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*'${esc}'[^>]*>([\\s\\S]*?)<\\/a>`, "gi"), "$1");
  return out;
}

/** Убрать ссылки на исключённые материалы из HTML тела статьи. */
export function unwrapExcludedBlogArticleLinks(html) {
  let s = String(html || "");
  for (const href of excludedBlogHrefVariants()) {
    s = unwrapAnchorsByHref(s, href);
  }
  return s;
}
