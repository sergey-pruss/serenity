/**
 * Убирает scoped-атрибуты Nuxt/Vue и motion.div из HTML-срезов для статики.
 */
function stripNuxtScopedMarkup(html) {
  if (!html || typeof html !== "string") return html;
  let s = html;
  s = s.replace(/<motion\.div/g, "<div");
  s = s.replace(/<\/motion\.div>/g, "</div>");
  s = s.replace(/\sdata-v-[a-z0-9]+=""/gi, "");
  s = s.replace(/\s*<!---->\s*/g, "");
  return s;
}

module.exports = { stripNuxtScopedMarkup };
