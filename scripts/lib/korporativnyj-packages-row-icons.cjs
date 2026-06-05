/**
 * SVG-иконки строк таблицы пакетов /korporativnyj_sajt (стиль как kontekst-packages-compare).
 */
const SVG_WRAP = (inner) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const ROW_ICONS = {
  "Углубленное исследование конкурентов, рынка, поиск лучших практик": SVG_WRAP(
    '<path d="M5 18V10M10 18V6M15 18V12M20 18V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Выделение портретов целевой аудитории бизнеса": SVG_WRAP(
    '<circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 19C3 15.69 5.69 13 9 13C12.31 13 15 15.69 15 19" stroke="currentColor" stroke-width="1.5"/><path d="M16 8.5C17.38 8.5 18.5 9.62 18.5 11C18.5 12.38 17.38 13.5 16 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18 19C18 16.79 16.85 15 14.8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "SEO проектирование сайта": SVG_WRAP(
    '<rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="17" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="15" y="17" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M12 7V12M7 15L12 12L17 15" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Базовое SEO": SVG_WRAP(
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16 16L20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Разработка подробного ТЗ на&nbsp;разработку сайта, соответствует требованиям ГОСТ": SVG_WRAP(
    '<path d="M8 4H16L18 6V20H6V4H8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 9H16M8 13H16M8 17H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Разработка общих требований к&nbsp;проекту": SVG_WRAP(
    '<rect x="5" y="4" width="14" height="17" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M9 4V3C9 2.45 9.45 2 10 2H14C14.55 2 15 2.45 15 3V4" stroke="currentColor" stroke-width="1.5"/><path d="M8 10H16M8 14H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Разработка полной структуры сайта": SVG_WRAP(
    '<rect x="8" y="3" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="17" width="7" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="17" width="7" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M12 7V11M6.5 15L12 11L17.5 15" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "UX прототипирование в&nbsp;Figma": SVG_WRAP(
    '<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="8" y="8" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M8 16H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Проектирование в&nbsp;HTML с&nbsp;использованием ИИ": SVG_WRAP(
    '<path d="M8 8L4 12L8 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8L20 12L16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 6L11 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Написание текстов под каждую страницу сайта": SVG_WRAP(
    '<path d="M4 18L5.5 14L15 4.5L18.5 8L9 17.5L4 18Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 6L18 11" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Написание текстов с&nbsp;использованием ИИ": SVG_WRAP(
    '<path d="M6 5H18M6 9H18M6 13H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 15L17.5 17.5L21 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  "Использование шаблона": SVG_WRAP(
    '<rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="13" width="18" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Дизайн макеты с&nbsp;адаптивами в&nbsp;Figma": SVG_WRAP(
    '<path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12L20 8M12 12V21M12 12L4 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  "Дизайн сайта с&nbsp;использованием ИИ": SVG_WRAP(
    '<path d="M4 20L14 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15 5L17 3L19 5L17 7L15 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 7H5.01M8 4H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ),
  "Верстка и&nbsp;бэкенд разработка": SVG_WRAP(
    '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 9L6 12L8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 9L18 12L16 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Интеграция управления в&nbsp;CMS": SVG_WRAP(
    '<rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Разработка с&nbsp;использованием ИИ": SVG_WRAP(
    '<rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 3V7M12 3V7M15 3V7M9 17V21M12 17V21M15 17V21M3 9H7M3 12H7M3 15H7M17 9H21M17 12H21M17 15H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  "Интеграции с&nbsp;CRM": SVG_WRAP(
    '<circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 10.5L15.5 7.5M8.5 13.5L15.5 16.5" stroke="currentColor" stroke-width="1.5"/>',
  ),
  "Тестирование": SVG_WRAP(
    '<path d="M9 11L11 13L15 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3L19 6V11C19 15.42 15.87 19.17 12 20C8.13 19.17 5 15.42 5 11V6L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  "Перенос на&nbsp;сервер клиента": SVG_WRAP(
    '<rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 6V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V6" stroke="currentColor" stroke-width="1.5"/><path d="M12 11V16M9.5 13.5L12 16L14.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
};

function getKorporativnyjPackagesRowIcon(label) {
  return ROW_ICONS[label] || "";
}

module.exports = { ROW_ICONS, getKorporativnyjPackagesRowIcon };
