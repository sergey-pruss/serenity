import { MIGRATION_PAGES } from "./migration-sheet-data.mjs";
import { columnMapFromHeaderRow } from "./migration-sheet-layout.mjs";

/** Только SEO-подсказки агента при push — не путать с вашими пометками в таблице. */
const AGENT_SEO_COMMENTS = new Set([
  "Google 1/6, 0 кликов; Яндекс >20 — CTR + on-page",
  "Статика с начала мая 2026; бренд ВЧ, meta/H1",
  "SERP >20 при показах GSC",
  "Лемма таргетированная/таргетинговая",
  "Legacy; 300+ показов GSC — перенос в статику",
  "Legacy; много показов Яндекс",
  "Канон /seo",
  "Листинг /services; низкий приоритет доработок",
  "Лента на статике раньше главной; дату go-live уточнить",
]);

/**
 * @param {string} cellA
 * @returns {string | null} pathname
 */
export function pathFromSheetNameCell(cellA) {
  const s = String(cellA || "");
  const urlM = s.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  if (urlM) {
    try {
      const u = new URL(urlM[1]);
      if (!u.hostname.includes("serenity.agency")) return null;
      const p = u.pathname.replace(/\/+$/, "") || "/";
      return p;
    } catch {
      return null;
    }
  }
  const labelM = s.match(/;\s*"((?:[^"]|"")*)"\s*\)\s*$/i);
  const label = labelM ? labelM[1].replace(/""/g, '"') : s.trim();
  const page = MIGRATION_PAGES.find((p) => p.name === label);
  return page?.path ?? null;
}

/**
 * @param {string} raw
 */
export function isAgentSeoComment(raw) {
  const c = String(raw || "").trim();
  if (!c) return true;
  return AGENT_SEO_COMMENTS.has(c);
}

/**
 * @param {string[][]} rows — строки листа (без заголовка или с ним)
 * @param {boolean} [hasHeader=true]
 * @param {{ page?: number, comment?: number }} [cols]
 * @returns {Map<string, string>} path → комментарий пользователя
 */
export function commentsByPathFromSheetRows(rows, hasHeader = true, cols = {}) {
  const start = hasHeader ? 1 : 0;
  const pageCol = cols.page ?? 0;
  const commentCol = cols.comment ?? 7;
  /** @type {Map<string, string>} */
  const map = new Map();
  for (let i = start; i < rows.length; i++) {
    const row = rows[i] || [];
    const path = pathFromSheetNameCell(row[pageCol]);
    const comment = String(row[commentCol] ?? "").trim();
    if (!path || !comment || isAgentSeoComment(comment)) continue;
    map.set(path, comment);
  }
  return map;
}

/**
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} quotedSheetTitle — 'Лист' с кавычками
 */
/**
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {string} quotedSheetTitle
 * @param {import('./migration-sheet-layout.mjs').MigrationColumnMap} [col]
 */
export async function fetchPreservedComments(
  sheets,
  spreadsheetId,
  quotedSheetTitle,
  col,
) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetTitle}!A:ZZ`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = res.data.values || [];
    const cols = col ?? (rows[0] ? columnMapFromHeaderRow(rows[0]) : {});
    return commentsByPathFromSheetRows(rows, true, {
      page: cols.page,
      comment: cols.comment,
    });
  } catch {
    return new Map();
  }
}
