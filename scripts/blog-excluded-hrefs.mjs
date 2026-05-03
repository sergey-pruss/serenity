/**
 * Материалы, которые ещё приходят из CMS / светятся в ленте, но не должны попадать
 * в статический контур (нет страницы на проде, сняты с публикации и т.п.).
 * Ключ — канонический путь с `/` в конце (как в build-blog-data после canonBlogHref).
 */
export const EXCLUDED_BLOG_HREFS = new Set([
  "/blog/card/seo-v-youtube-pochemu-stoit-zanyatsya-optimizatsiej-video/",
  "/blog/life/kak-my-prevratili-rabotu-v-igru/",
  "/blog/article/ashan-tsifrovye-tehnologii-i-razvitie-klientotsentrichnosti/",
]);

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Варианты href в теле статей (относительные и абсолютные, со слэшем и без). */
export function excludedBlogArticleHrefVariants() {
  const out = [];
  for (const h of EXCLUDED_BLOG_HREFS) {
    if (!String(h).includes("/blog/article/")) continue;
    const withSlash = h.endsWith("/") ? h : `${h}/`;
    const noSlash = withSlash.replace(/\/+$/, "");
    out.push(withSlash, noSlash, `https://serenity.agency${withSlash}`, `https://serenity.agency${noSlash}`);
  }
  return [...new Set(out.filter(Boolean))];
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
  for (const href of excludedBlogArticleHrefVariants()) {
    s = unwrapAnchorsByHref(s, href);
  }
  return s;
}
