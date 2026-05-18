/** Убирает хвост « — Статья» / « — Кейс» из заголовков, импортированных с прода или Wayback. */
export function stripBlogCategoryFromTitle(title) {
  return String(title || "")
    .replace(/\s*—\s*Serenity\s*$/i, "")
    .replace(/\s*—\s*(Статьи|Статья|Кейсы|Кейс|Карточки|Карточка|Подкаст|Наша жизнь)\s*$/gi, "")
    .trim();
}

/** Первое изображение обложки из hero (itemprop=image / Oblozhka). */
export function pickBlogCardCoverFromBody(bodyHtml) {
  const html = String(bodyHtml || "");
  const oblozhka = html.match(/\/_sa\/img\/blog\/[^"'\\\s]+\/Oblozhka\.(?:png|webp|jpe?g)/i);
  if (oblozhka) return oblozhka[0];
  const itemprop = html.match(/itemprop="image"[^>]*href="(\/_sa\/img\/blog\/[^"]+)"/i);
  if (itemprop) return itemprop[1];
  return "";
}
