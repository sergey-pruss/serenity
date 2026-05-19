/**
 * Удаляет legacy .content-block__slider (columns-with-progress / horizontal-scroll)
 * из статики услуг. Контент: .content-block__grid--desc (десктоп) и --tablet (телефон).
 */
function stripContentBlockSliders(html) {
  const re =
    /<div[^>]*class="content-block__slider[^"]*"[\s\S]*?(?=<div[^>]*class="content-block__grid content-block__grid--desc)/g;
  const next = html.replace(re, "");
  const removed = (html.match(re) || []).length;
  if (removed > 0) {
    return { html: next, removed };
  }
  return { html: next, removed: 0 };
}

module.exports = { stripContentBlockSliders };
