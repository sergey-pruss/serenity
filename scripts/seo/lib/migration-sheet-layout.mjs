/**
 * Чтение структуры листа и запись по заголовкам колонок (не фиксированным A–K).
 */
import { MIGRATION_RANKING_HEADERS } from "./migration-sheet-rankings.mjs";
import {
  MIGRATION_PAGES,
  MIGRATION_SHEET_HEADER,
  formatStaticDateForSheet,
  pageHyperlink,
  tzHyperlink,
} from "./migration-sheet-data.mjs";
import { migrationStaticDate } from "./migration-sheet-static-dates.mjs";
import { rankingsForMigrationPath } from "./migration-sheet-rankings.mjs";
import { pathFromSheetNameCell } from "./migration-sheet-preserve-comments.mjs";

/** @typedef {Record<string, number>} MigrationColumnMap */

/** Ключ поля → возможные заголовки на листе (первое совпадение побеждает). */
export const MIGRATION_COLUMN_ALIASES = {
  page: ["Страницы (по приоритету)", "Страницы"],
  type: ["Тип"],
  contour: ["Контур", "Сайт"],
  staticDate: ["Дата нового контура", "Дата статика"],
  tzStatus: ["Статус ТЗ на SEO", "Статус ТЗ"],
  tzLink: ["Ссылка на ТЗ"],
  implStatus: ["Статус реализации"],
  comment: ["Комментарий"],
  serpGoogle: ["Google", "SERP Google (РФ)"],
  serpYandexMsk: ["Я Москва", "SERP Яндекс (Москва)"],
  serpYandexSpb: ["Я Питер", "SERP Яндекс (СПб)"],
};

const MANAGED_KEYS = Object.keys(MIGRATION_COLUMN_ALIASES);

/** @param {string} h */
function normHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {string[]} headerRow
 * @returns {MigrationColumnMap}
 */
export function columnMapFromHeaderRow(headerRow) {
  /** @type {MigrationColumnMap} */
  const map = {};
  const norms = headerRow.map(normHeader);
  for (const key of MANAGED_KEYS) {
    const aliases = MIGRATION_COLUMN_ALIASES[key];
    for (const alias of aliases) {
      const idx = norms.indexOf(normHeader(alias));
      if (idx >= 0) {
        map[key] = idx;
        break;
      }
    }
  }
  return map;
}

/**
 * @param {import('googleapis').sheets_v4.Schema$Sheet[]} list
 */
export function pickMigrationSheetTitle(list) {
  const envTitle = process.env.MIGRATION_SHEET_TAB?.trim();
  if (envTitle) return envTitle;
  const byGid = process.env.MIGRATION_SHEET_GID?.trim();
  if (byGid) {
    const gid = Number(byGid);
    const hit = list.find((s) => s.properties?.sheetId === gid);
    if (hit?.properties?.title) return hit.properties.title;
  }
  const named = list.find((s) =>
    /страниц|задач/i.test(String(s.properties?.title || "")),
  );
  if (named?.properties?.title) return named.properties.title;
  return list[0]?.properties?.title || "Лист1";
}

/** @param {string} title */
export function quoteSheetTitle(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} [quotedTitle]
 */
export async function readMigrationSheetLayout(sheets, spreadsheetId, quotedTitle) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedTitle}!A1:ZZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = res.data.values || [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(values.length, 5); i++) {
    const row = values[i] || [];
    const norm = row.map((h) => String(h ?? "").trim().toLowerCase());
    if (norm.includes("страницы (по приоритету)") || norm.includes("страницы")) {
      headerIdx = i;
      break;
    }
  }
  const headerRow = values[headerIdx] || [];
  const dataRows = values.slice(headerIdx + 1);
  const col =
    headerRow.length > 0
      ? columnMapFromHeaderRow(headerRow)
      : columnMapFromHeaderRow(MIGRATION_SHEET_HEADER);

  return {
    headerRow,
    dataRows,
    col,
    headerOffset: headerIdx,
    colCount: Math.max(
      headerRow.length,
      MIGRATION_SHEET_HEADER.length,
      ...dataRows.map((r) => r.length),
      0,
    ),
  };
}

/**
 * @param {string[][]} dataRows
 * @param {MigrationColumnMap} col
 * @returns {Map<string, string[]>}
 */
export function existingRowsByPath(dataRows, col) {
  const pageCol = col.page ?? 0;
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const row of dataRows) {
    const path = pathFromSheetNameCell(row[pageCol]);
    if (path) map.set(path, row);
  }
  return map;
}

/**
 * @param {string[]} headerRow
 * @param {MigrationColumnMap} col
 */
function ensureDefaultHeader(headerRow, col) {
  if (headerRow.length > 0 && col.page != null) {
    return { headerRow: [...headerRow], col: { ...col } };
  }
  const header = [...MIGRATION_SHEET_HEADER];
  return { headerRow: header, col: columnMapFromHeaderRow(header) };
}

/**
 * @param {MigrationColumnMap} col
 * @param {string} key
 * @param {string} value
 * @param {string[]} row
 */
function setCell(col, key, value, row) {
  const i = col[key];
  if (i == null) return;
  while (row.length <= i) row.push("");
  row[i] = value;
}

/**
 * @param {{ preservedComments?: Map<string, string>, layout?: Awaited<ReturnType<typeof readMigrationSheetLayout>>, forceDefaultHeader?: boolean }} opts
 */
export function buildMigrationSheetMatrix(opts = {}) {
  const preserved = opts.preservedComments ?? new Map();
  const existing = opts.layout
    ? existingRowsByPath(opts.layout.dataRows, opts.layout.col)
    : new Map();

  const { headerRow, col } = opts.forceDefaultHeader
    ? ensureDefaultHeader([], {})
    : ensureDefaultHeader(
        opts.layout?.headerRow ?? [],
        opts.layout?.col ?? {},
      );

  let colCount = Math.max(
    headerRow.length,
    ...MANAGED_KEYS.map((k) => (col[k] != null ? col[k] + 1 : 0)),
  );

  const metaRow = Array(colCount).fill("");
  const linkCol = col.tzLink ?? 5;
  metaRow[linkCol] = `=HYPERLINK("https://static.serenity.agency/docs/seo-rank-dashboard.html";"SEO-дайджер позиций")`;

  /** @type {string[][]} */
  const rows = [metaRow, headerRow.map((h) => String(h ?? ""))];
  while (rows[1].length < colCount) rows[1].push("");

  for (const p of MIGRATION_PAGES) {
    const r = rankingsForMigrationPath(p.path);
    const base = existing.get(p.path);
    const row = base ? [...base] : [];
    while (row.length < colCount) row.push("");

    setCell(col, "page", pageHyperlink(p.name, p.path), row);
    setCell(col, "type", p.type, row);
    setCell(col, "contour", p.site, row);
    setCell(
      col,
      "staticDate",
      formatStaticDateForSheet(
        migrationStaticDate(p.path, p.site, p.staticDate),
      ),
      row,
    );
    setCell(col, "tzStatus", p.tz, row);
    setCell(col, "tzLink", tzHyperlink(p.tzUrl), row);
    setCell(col, "implStatus", p.impl, row);
    const prevComment =
      col.comment != null ? String(row[col.comment] ?? "").trim() : "";
    setCell(
      col,
      "comment",
      preserved.get(p.path) ?? prevComment,
      row,
    );
    setCell(col, "serpGoogle", r.serpGoogleRf, row);
    setCell(col, "serpYandexMsk", r.serpYandexMsk, row);
    setCell(col, "serpYandexSpb", r.serpYandexSpb, row);

    rows.push(row);
    colCount = Math.max(colCount, row.length);
  }

  for (const row of rows) {
    while (row.length < colCount) row.push("");
  }

  return { rows, col, colCount, headerRow: rows[0] };
}

/**
 * @param {MigrationColumnMap} col
 */
export function formatColumnMapLog(col) {
  const parts = MANAGED_KEYS.filter((k) => col[k] != null).map(
    (k) => `${k}=${col[k]}`,
  );
  return parts.join(", ") || "(нет сопоставленных колонок)";
}

/** @param {MigrationColumnMap} col */
export function requireRankingColumns(col) {
  const missing = ["serpGoogle", "serpYandexMsk", "serpYandexSpb"].filter(
    (k) => col[k] == null,
  );
  if (missing.length) {
    throw new Error(
      `На листе не найдены колонки позиций (${missing.join(", ")}). Ожидаются заголовки: ${MIGRATION_RANKING_HEADERS.join(", ")}`,
    );
  }
}

/**
 * Обновление только SERP-колонок по path из колонки «Страницы».
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} quotedTitle
 * @param {Awaited<ReturnType<typeof readMigrationSheetLayout>>} layout
 */
/**
 * @param {string[][]} dataRows
 * @param {MigrationColumnMap} col
 * @param {number} [headerOffset] rows before the header (0-based index of header row)
 * @returns {Map<string, number>} path → номер строки на листе (1-based)
 */
export function sheetRowIndexByPath(dataRows, col, headerOffset = 0) {
  const pageCol = col.page ?? 0;
  /** @type {Map<string, number>} */
  const map = new Map();
  for (let i = 0; i < dataRows.length; i++) {
    const path = pathFromSheetNameCell(dataRows[i][pageCol]);
    if (path) map.set(path, i + headerOffset + 2);
  }
  return map;
}

/** Ключи, которые можно перезаписывать без согласования (остальное на листе не трогаем). */
const PARTIAL_UPDATE_KEYS = ["serpGoogle", "serpYandexMsk", "serpYandexSpb", "tzStatus", "tzLink"];

/**
 * Позиции SERP, статус ТЗ и ссылки на актуальное ТЗ из репозитория.
 * Не меняет: названия, тип, контур, даты, статус реализации, комментарии.
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} quotedTitle
 * @param {Awaited<ReturnType<typeof readMigrationSheetLayout>>} layout
 */
export async function writeMigrationPartialFromLayout(
  sheets,
  spreadsheetId,
  quotedTitle,
  layout,
) {
  const rowByPath = sheetRowIndexByPath(layout.dataRows, layout.col, layout.headerOffset || 0);

  /** @type {import('googleapis').sheets_v4.Schema$ValueRange[]} */
  const data = [];

  for (let i = 0; i < MIGRATION_PAGES.length; i++) {
    const p = MIGRATION_PAGES[i];
    const fallbackRow = i + (layout.headerOffset || 0) + 2;
    const rowIndex = rowByPath.get(p.path) ?? fallbackRow;

    const r = rankingsForMigrationPath(p.path);
    const vals = {
      serpGoogle: r.serpGoogleRf,
      serpYandexMsk: r.serpYandexMsk,
      serpYandexSpb: r.serpYandexSpb,
      tzStatus: p.tz || "",
      tzLink: p.tzUrl ? tzHyperlink(p.tzUrl) : "",
    };

    for (const key of PARTIAL_UPDATE_KEYS) {
      const colIdx = layout.col[key];
      if (colIdx == null) continue;
      if (key === "tzStatus" && !p.tz) continue;
      if (key === "tzLink" && !p.tzUrl) continue;
      const colLetter = columnLetter1(colIdx + 1);
      data.push({
        range: `${quotedTitle}!${colLetter}${rowIndex}`,
        values: [[vals[key]]],
      });
    }
  }

  if (!data.length) {
    throw new Error("Нет ячеек для частичного обновления");
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { updates: data.length, col: layout.col };
}

/** Только колонки позиций (после SERP-съёмки). */
export async function writeMigrationRankingsFromLayout(
  sheets,
  spreadsheetId,
  quotedTitle,
  layout,
) {
  requireRankingColumns(layout.col);
  const rowByPath = sheetRowIndexByPath(layout.dataRows, layout.col, layout.headerOffset || 0);
  /** @type {import('googleapis').sheets_v4.Schema$ValueRange[]} */
  const data = [];

  for (let i = 0; i < MIGRATION_PAGES.length; i++) {
    const p = MIGRATION_PAGES[i];
    const r = rankingsForMigrationPath(p.path);
    const rowIndex = rowByPath.get(p.path) ?? i + 2;
    const vals = {
      serpGoogle: r.serpGoogleRf,
      serpYandexMsk: r.serpYandexMsk,
      serpYandexSpb: r.serpYandexSpb,
    };
    for (const key of ["serpGoogle", "serpYandexMsk", "serpYandexSpb"]) {
      const colIdx = layout.col[key];
      if (colIdx == null) continue;
      data.push({
        range: `${quotedTitle}!${columnLetter1(colIdx + 1)}${rowIndex}`,
        values: [[vals[key]]],
      });
    }
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
  return { updates: data.length, col: layout.col };
}

/** @param {number} n 1-based */
function columnLetter1(n) {
  let s = "";
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
