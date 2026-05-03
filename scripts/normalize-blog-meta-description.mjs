/**
 * Плоский текст для meta description и лида статьи блога.
 * С прода в атрибут meta иногда попадают literal `&lt;br /&gt;` вместо переноса строки.
 */
export function normalizeBlogMetaDescription(s) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&lt;br\s*\/?&gt;/gi, " ")
    .replace(/&amp;lt;br\s*\/?&amp;gt;/gi, " ")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
