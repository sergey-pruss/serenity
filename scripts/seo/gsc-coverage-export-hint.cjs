#!/usr/bin/env node
/**
 * Памятка: как выгрузить из Google Search Console URL для разбора «Покрытие».
 * Запуск: node scripts/seo/gsc-coverage-export-hint.cjs
 */
const lines = [
  "GSC — экспорт URL по причинам неиндексации:",
  "1. Индексирование → Страницы → строка причины (например «Не найдено (404)»).",
  "2. Открыть список затронутых URL → Экспорт (таблица / Google Таблицы / загрузка).",
  "3. Повторить для: 404, 5xx, 403/4xx, при необходимости «canonical не совпал».",
  "4. Сохранить CSV и прогнать: node scripts/seo/gsc-url-triage.mjs путь/к/файлу.csv",
  "",
  "Агрегатный xlsx без колонки URL не заменяет этот шаг.",
];
console.log(lines.join("\n"));
