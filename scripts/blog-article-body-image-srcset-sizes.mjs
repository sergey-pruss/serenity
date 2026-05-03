/**
 * WordPress экспорт задаёт sizes «как у встроенной medium (900px)», а вёрстка Serenity шире:
 * `.sa-blog-body-media--wide` — до min(100vw − 2×gutter, 1040px) (см. blog-article-prose.css);
 * `--text` / `--content` — max 733px.
 * Браузер тогда недобирает кандидата из srcset (остаётся 900w на ~1040px CSS) — картинка мылится.
 * Заменяем легаси-строку на sizes с теми же брейкпоинтами gutter, что в blog-article-figma.css (78 / 55 / 36 px).
 */

/** Легаси из WP: одинаковая строка во всех старых статьях с responsive srcset. */
const WP_LEGACY_SIZES = 'sizes="(max-width: 900px) 100vw, 900px"';

/** Широкая иллюстрация в теле (по умолчанию `--wide`). */
const SIZES_BODY_WIDE =
  'sizes="(max-width: 767px) calc(100vw - 72px), (max-width: 1025px) min(1040px, calc(100vw - 110px)), min(1040px, calc(100vw - 156px))"';

/** Узкая колонка текста (`blogBodyMediaLayout`: text | content). */
const SIZES_BODY_NARROW =
  'sizes="(max-width: 767px) calc(100vw - 72px), (max-width: 1025px) min(733px, calc(100vw - 110px)), min(733px, calc(100vw - 156px))"';

/**
 * @param {string} html
 * @param {{ blogBodyMediaLayout?: string }} [options]
 * @returns {string}
 */
export function applyBlogArticleBodyImageSrcsetSizes(html, options = {}) {
  const layout = String(options.blogBodyMediaLayout || "").toLowerCase();
  const replacement = layout === "text" || layout === "content" ? SIZES_BODY_NARROW : SIZES_BODY_WIDE;
  let out = String(html || "");
  if (!out.includes(WP_LEGACY_SIZES)) return out;
  return out.split(WP_LEGACY_SIZES).join(replacement);
}
