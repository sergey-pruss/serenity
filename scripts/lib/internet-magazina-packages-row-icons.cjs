/**
 * SVG-иконки строк таблицы пакетов /sozdanie-internet-magazina.
 */
const SVG_WRAP = (inner) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const ROW_ICONS = {
  "Объём каталога": SVG_WRAP(
    '<rect x="4" y="5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="14" width="16" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>',
  ),
  Страницы: SVG_WRAP(
    '<path d="M8 4H16L18 6V20H6V4H8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 9H16M8 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  Дизайн: SVG_WRAP(
    '<path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12L20 8M12 12V21M12 12L4 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  "Фильтры в каталоге": SVG_WRAP(
    '<path d="M4 6H20M7 12H17M10 18H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Карточка товара": SVG_WRAP(
    '<rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 9H15M9 13H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Корзина и оформление": SVG_WRAP(
    '<path d="M6 6H20L18 14H8L6 6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/><path d="M6 6L5 3H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Личный кабинет": SVG_WRAP(
    '<circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20" stroke="currentColor" stroke-width="1.5"/>',
  ),
  CMS: SVG_WRAP(
    '<rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
  ),
  Интеграции: SVG_WRAP(
    '<circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 10.5L15.5 7.5M8.5 13.5L15.5 16.5" stroke="currentColor" stroke-width="1.5"/>',
  ),
  Адаптив: SVG_WRAP(
    '<rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M10 18H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "SEO-подготовка": SVG_WRAP(
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16 16L20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
};

function getInternetMagazinaPackagesRowIcon(label) {
  return ROW_ICONS[label] || "";
}

module.exports = { ROW_ICONS, getInternetMagazinaPackagesRowIcon };
