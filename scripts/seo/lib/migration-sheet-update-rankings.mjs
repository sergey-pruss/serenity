import { google } from "googleapis";
import { createGoogleSheetsAuth } from "./google-sheets-auth.mjs";
import { MIGRATION_SHEET_ID, MIGRATION_PAGES } from "./migration-sheet-data.mjs";
import {
  formatColumnMapLog,
  pickMigrationSheetTitle,
  quoteSheetTitle,
  readMigrationSheetLayout,
  writeMigrationPartialFromLayout,
  writeMigrationRankingsFromLayout,
} from "./migration-sheet-layout.mjs";

/**
 * Позиции + актуальные ссылки ТЗ; остальные ячейки на листе не трогает.
 * @param {import('googleapis').sheets_v4.Sheets} [sheets]
 * @param {string} [spreadsheetId]
 */
export async function updateMigrationSheetPartial(
  sheets,
  spreadsheetId = MIGRATION_SHEET_ID,
) {
  let client = sheets;
  if (!client) {
    const { auth } = await createGoogleSheetsAuth();
    client = google.sheets({ version: "v4", auth });
  }

  const meta = await client.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });
  const list = meta.data.sheets || [];
  const title = pickMigrationSheetTitle(list);
  const quoted = quoteSheetTitle(title);

  const layout = await readMigrationSheetLayout(
    client,
    spreadsheetId,
    quoted,
  );
  console.log(
    `Лист «${title}»: частичное обновление (позиции + ТЗ); колонки: ${formatColumnMapLog(layout.col)}`,
  );

  const result = await writeMigrationPartialFromLayout(
    client,
    spreadsheetId,
    quoted,
    layout,
  );

  return {
    title,
    col: result.col,
    updates: result.updates,
    pageCount: MIGRATION_PAGES.length,
  };
}

/**
 * Только позиции (Google / Я Москва / Я Питер).
 * @param {import('googleapis').sheets_v4.Sheets} [sheets]
 * @param {string} [spreadsheetId]
 */
export async function updateMigrationSheetRankings(
  sheets,
  spreadsheetId = MIGRATION_SHEET_ID,
) {
  let client = sheets;
  if (!client) {
    const { auth } = await createGoogleSheetsAuth();
    client = google.sheets({ version: "v4", auth });
  }

  const meta = await client.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });
  const list = meta.data.sheets || [];
  const title = pickMigrationSheetTitle(list);
  const quoted = quoteSheetTitle(title);

  const layout = await readMigrationSheetLayout(
    client,
    spreadsheetId,
    quoted,
  );
  console.log(
    `Лист «${title}»: обновление позиций; колонки: ${formatColumnMapLog(layout.col)}`,
  );

  const result = await writeMigrationRankingsFromLayout(
    client,
    spreadsheetId,
    quoted,
    layout,
  );

  return {
    title,
    col: result.col,
    updates: result.updates,
    pageCount: MIGRATION_PAGES.length,
  };
}
