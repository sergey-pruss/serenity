/**
 * Единая нормализация текста запроса для join между семантическим ядром,
 * Google Search Console и Яндекс Вебмастером.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeQueryForJoin(raw) {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw.normalize("NFKC").trim().toLowerCase();
  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/[\u200b-\u200d\ufeff]/g, "");
  s = s.replace(/\s+/g, " ");
  return s;
}
