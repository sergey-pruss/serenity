/**
 * Якоря заголовков /services/marketing (targeting-каркас, Результат1).
 * Один источник для assemble и verify — без расхождения строк.
 */
function linkedH2(label, href) {
  return `<h2 data-v-490c7534=""><a class="marketing-section__link" href="${href}">${label}</a></h2>`;
}

function plainH2(label) {
  return `<h2 data-v-490c7534="">${label}</h2>`;
}

const MARKETING_H2 = {
  SITE: linkedH2("Сайт", "/services#services-sites"),
  PROMOTION: linkedH2("Измеримое продвижение", "/services#services-promotion"),
  ADVERTISING: plainH2("Реклама"),
  TOOLS: plainH2("Инструменты"),
  CONTENT_MARKETING: linkedH2("Контент-маркетинг", "/services/content"),
  CONTENT_MARKETING_CHANNELS: plainH2("Каналы контент-маркетинга"),
  SEO: linkedH2("SEO", "/services/seo"),
  SALES: linkedH2("Продажи", "/services/salesmarketing"),
  BRAND: linkedH2("Бренд", "/services#services-branding"),
  BRAND_STRATEGY: linkedH2("Бренд-стратегия", "/services/brend-strategy"),
};

/** Секция content-block уже есть (только h2 в .numbered-header__title, не h3 в футере/слайдерах). */
function htmlHasSectionTitle(html, title) {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `numbered-header__title"><h2[^>]*>(?:<a[^>]*>)?${esc}(?:</a>)?</h2>`,
  ).test(html);
}

module.exports = {
  linkedH2,
  plainH2,
  MARKETING_H2,
  htmlHasSectionTitle,
};
