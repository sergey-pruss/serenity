export const MIGRATION_SHEET_ID =
  process.env.MIGRATION_SHEET_ID || "11s7YOyT2BJPbm3R-2hvqXAlykb6zD2F3ppU-5eVvuw8";

export const ORIGIN = "https://serenity.agency";
export const STATIC_DOCS = "https://static.serenity.agency/docs";

/** Значения колонки «Контур». */
export const MIGRATION_CONTOUR_NEW = "новый";
export const MIGRATION_CONTOUR_OLD = "старый";

/** Чем выше в массиве — тем выше приоритет работ (строка 2 в таблице = №1). */
export const MIGRATION_PAGES = [
  {
    name: "Комплексный маркетинг",
    path: "/services/marketing",
    type: "Комплекс",
    site: "новый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/marketing-onepage-seo-tz.html`,
    impl: "В работе",
    comment: "",
  },
  {
    name: "Главная страница",
    path: "/",
    type: "",
    site: "новый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/home-onepage-seo-tz.html`,
    impl: "В работе",
    comment: "",
  },
  {
    name: "Контекстная реклама",
    path: "/kontekstnaya_reklama",
    type: "Услуга",
    site: "новый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/kontekstnaya-seo-strategy-top10.html`,
    impl: "В работе",
    comment: "",
  },
  {
    name: "Таргетинговая реклама",
    path: "/targeting",
    type: "Услуга",
    site: "новый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/targeting-serp-content-gap.html`,
    impl: "В работе",
    comment: "",
  },
  {
    name: "Комплексное продвижение",
    path: "/kompleksnoye-prodvizheniye",
    type: "Комплекс",
    site: "старый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/kompleksnoye-prodvizheniye-onepage-seo-tz.html`,
    impl: "Очередь",
    comment: "",
  },
  {
    name: "Корпоративный сайт",
    path: "/korporativnyj_sajt",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "Готово",
    tzUrl: `${STATIC_DOCS}/korporativnyj-sajt-onepage-seo-tz.html`,
    impl: "Очередь",
    comment: "",
  },
  {
    name: "SEO-продвижение",
    path: "/seo",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Маркетинговая стратегия",
    path: "/strategy",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Фирменный стиль",
    path: "/firmennyj-stil-ajdentika",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "SMM-продвижение",
    path: "/smm_marketing",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Influence-маркетинг",
    path: "/influence-marketing",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "УКС",
    path: "/uvelichenie-konversii-saita",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "Увеличение конверсии сайта",
  },
  {
    name: "Создание интернет-магазина",
    path: "/sozdanie-internet-magazina",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Медицинский маркетинг",
    path: "/medicinskij-marketing",
    type: "Комплекс",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Продвижение в Дзен и на Промостраницах",
    path: "/prodvizhenie-statey-v-dzene-i-promostranitsah",
    type: "3 уровень",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Видеопродакшн",
    path: "/services/video",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Sales marketing",
    path: "/services/salesmarketing",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "Переименовать в CRM-маркетинг",
  },
  {
    name: "Продвижение IT-компаний",
    path: "/services/prodvizhenie-it-kompanij",
    type: "Комплекс",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "E-commerce маркетинг",
    path: "/ecom",
    type: "Комплекс",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Маркетинг недвижимости",
    path: "/nedvijimost",
    type: "Комплекс",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "PR",
    path: "/pr",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Коммуникационная стратегия",
    path: "/communication-strategy",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Сквозная аналитика",
    path: "/end-to-end-analytics",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Бизнес-аналитика",
    path: "/business-analytics",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Мини-стратегия",
    path: "/mini-strategiya",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Лендинг на Tilda",
    path: "/lending_na_tilda",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "Переделать в «лендинг»",
  },
  {
    name: "Техническая поддержка",
    path: "/tehnicheskaya-podderzhka-saita",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Внедрение ИИ",
    path: "/vnedrenie-iskusstvennogo-intellekta",
    type: "Услуга",
    site: "старый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "",
    comment: "",
  },
  {
    name: "Разводящая страница услуг",
    path: "/services",
    type: "",
    site: "новый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "Готово",
    comment: "",
  },
  {
    name: "Блог",
    path: "/blog",
    type: "",
    site: "новый",
    staticDate: "",
    tz: "",
    tzUrl: "",
    impl: "Готово",
    comment: "",
  },
];

import {
  MIGRATION_RANKING_HEADERS,
  rankingsForMigrationPath,
} from "./migration-sheet-rankings.mjs";
import { migrationStaticDate } from "./migration-sheet-static-dates.mjs";

export const MIGRATION_SHEET_HEADER = [
  "Страницы (по приоритету)",
  "Тип",
  "Контур",
  "Дата статика",
  "Статус ТЗ на SEO",
  "Ссылка на ТЗ",
  "Статус реализации",
  "Комментарий",
  ...MIGRATION_RANKING_HEADERS,
];

/** Индекс колонки F «Ссылка на ТЗ» (0-based), для форматирования в Sheets API. */
export const MIGRATION_COL_TZ_LINK = MIGRATION_SHEET_HEADER.indexOf("Ссылка на ТЗ");

/** Индекс первой колонки позиций (Google), 0-based. */
export const MIGRATION_COL_SERP_START =
  MIGRATION_SHEET_HEADER.indexOf("Google") >= 0
    ? MIGRATION_SHEET_HEADER.indexOf("Google")
    : 8;

/**
 * Шапка + позиции SERP (3 колонки) для частичного обновления листа.
 * @returns {string[][]}
 */
export function buildMigrationRankingValues() {
  const rows = [MIGRATION_RANKING_HEADERS];
  for (const p of MIGRATION_PAGES) {
    const r = rankingsForMigrationPath(p.path);
    rows.push([r.serpGoogleRf, r.serpYandexMsk, r.serpYandexSpb]);
  }
  return rows;
}

/**
 * Дата go-live на статике для колонки D (DD.MM.YYYY).
 * В данных хранить YYYY-MM-DD; «2026-05» Sheets превращает в 01.05.2026.
 * @param {string} raw
 */
export function formatStaticDateForSheet(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return s;
}

/** @param {string} name @param {string} urlPath */
export function pageHyperlink(name, urlPath) {
  const url = urlPath === "/" ? ORIGIN : `${ORIGIN}${urlPath}`;
  const label = String(name).replace(/"/g, '""');
  return `=HYPERLINK("${url}";"${label}")`;
}

/** Ссылка на onepage-ТЗ: кликабельный URL в одну строку (как авто-ссылка в Sheets). */
export function tzHyperlink(url) {
  const u = String(url ?? "").trim();
  if (!u) return "";
  const safe = u.replace(/"/g, '""');
  return `=HYPERLINK("${safe}";"${safe}")`;
}

/**
 * CSV/JSON экспорт без чтения Google Sheets (фиксированные колонки).
 * @param {{ preservedComments?: Map<string, string> }} [opts]
 * @returns {string[][]}
 */
export function buildMigrationSheetValues(opts = {}) {
  const preserved = opts.preservedComments ?? new Map();
  const rows = [MIGRATION_SHEET_HEADER];
  for (const p of MIGRATION_PAGES) {
    const r = rankingsForMigrationPath(p.path);
    rows.push([
      pageHyperlink(p.name, p.path),
      p.type,
      p.site,
      formatStaticDateForSheet(
        migrationStaticDate(p.path, p.site, p.staticDate),
      ),
      p.tz,
      tzHyperlink(p.tzUrl),
      p.impl,
      preserved.get(p.path) ?? "",
      r.serpGoogleRf,
      r.serpYandexMsk,
      r.serpYandexSpb,
    ]);
  }
  return rows;
}
