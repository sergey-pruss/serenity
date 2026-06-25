/**
 * SVG-иконки строк таблицы пакетов /targeting (стиль kontekst-packages-compare).
 */
const SVG_WRAP = (inner) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const ROW_ICONS = {
  "Количество рекламных каналов": SVG_WRAP(
    '<rect x="5" y="5" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="10" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="15" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Доступные каналы": SVG_WRAP(
    '<rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Стратегия и медиаплан": SVG_WRAP(
    '<rect x="5" y="4" width="14" height="17" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M8 9H16M8 13H13M8 17H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Анализ аудитории и конкурентов": SVG_WRAP(
    '<circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 19C3 15.69 5.69 13 9 13C12.31 13 15 15.69 15 19" stroke="currentColor" stroke-width="1.5"/><path d="M16 8.5C17.38 8.5 18.5 9.62 18.5 11C18.5 12.38 17.38 13.5 16 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18 19C18 16.79 16.85 15 14.8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Настройка рекламных кабинетов": SVG_WRAP(
    '<rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 10H16M8 14H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="17" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Разработка офферов": SVG_WRAP(
    '<path d="M6 8H18L16.5 19H7.5L6 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8V6C9 4.9 9.9 4 11 4H13C14.1 4 15 4.9 15 6V8" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Подготовка и адаптация креативов": SVG_WRAP(
    '<rect x="4" y="6" width="16" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="10" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M4 16L8 12L11 15L16 10L20 16" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  "Ретаргетинг и look-alike": SVG_WRAP(
    '<path d="M5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 14L6 19H10L8 14Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 14L18 19H14L16 14Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  "Тестирование аудиторий и креативов": SVG_WRAP(
    '<rect x="4" y="6" width="8" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="12" y="6" width="8" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10L7.5 11L9.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 10H17M15 13H16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Оптимизация бюджета": SVG_WRAP(
    '<path d="M5 18V10M10 18V6M15 18V12M20 18V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Масштабирование кампаний": SVG_WRAP(
    '<path d="M8 16V8M8 8L5 11M8 8L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8V16M16 16L13 13M16 16L19 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
};

function getTargetingPackagesRowIcon(label) {
  return ROW_ICONS[label] || "";
}

module.exports = { ROW_ICONS, getTargetingPackagesRowIcon };
