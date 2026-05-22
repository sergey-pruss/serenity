#!/usr/bin/env node
/**
 * Запись листа «Страницы (по приоритету)» в Google Sheets.
 * Перед записью читает лист: заголовки и лишние колонки сохраняются (Контур/Сайт и т.д.).
 *
 * npm run seo:migration-sheet:push — по умолчанию только позиции + ссылки ТЗ
 * MIGRATION_SHEET_FULL_PUSH=1 — полная перезапись (осторожно)
 * npm run seo:migration-sheet:update-rankings — только позиции
 * npm run seo:migration-sheet:update-partial — позиции + ТЗ
 */
import { google } from "googleapis";
import { createGoogleSheetsAuth } from "./lib/google-sheets-auth.mjs";
import { MIGRATION_SHEET_ID, MIGRATION_PAGES } from "./lib/migration-sheet-data.mjs";
import { fetchPreservedComments } from "./lib/migration-sheet-preserve-comments.mjs";
import {
  applyMigrationSheetFormatting,
  columnLetter,
} from "./lib/migration-sheet-format.mjs";
import {
  buildMigrationSheetMatrix,
  formatColumnMapLog,
  pickMigrationSheetTitle,
  quoteSheetTitle,
  readMigrationSheetLayout,
  writeMigrationPartialFromLayout,
} from "./lib/migration-sheet-layout.mjs";

/** @param {import('googleapis').sheets_v4.Schema$Sheet[]} list */
function sheetIdByTitle(list, title) {
  const hit = list.find((s) => s.properties?.title === title);
  return hit?.properties?.sheetId;
}

async function main() {
  const dryRun = process.env.MIGRATION_SHEET_DRY_RUN === "1";

  const { auth, method, detail } = await createGoogleSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth });
  console.log(`Авторизация Sheets: ${method} (${detail})`);

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: MIGRATION_SHEET_ID,
    fields: "sheets.properties(title,sheetId,index)",
  });
  const list = meta.data.sheets || [];
  const title = pickMigrationSheetTitle(list);
  const quoted = quoteSheetTitle(title);

  const layout = await readMigrationSheetLayout(
    sheets,
    MIGRATION_SHEET_ID,
    quoted,
  );
  console.log(
    `Лист «${title}»: ${layout.headerRow.length} колонок в шапке; сопоставление: ${formatColumnMapLog(layout.col)}`,
  );

  const fullPush = process.env.MIGRATION_SHEET_FULL_PUSH === "1";

  if (dryRun) {
    console.log(
      fullPush
        ? `DRY RUN: полный push → ${quoted}`
        : `DRY RUN: частичное обновление (позиции + ТЗ) → ${quoted}`,
    );
    return;
  }

  if (!fullPush) {
    const result = await writeMigrationPartialFromLayout(
      sheets,
      MIGRATION_SHEET_ID,
      quoted,
      layout,
    );
    console.log(
      `OK: частичное обновление — лист «${title}», ячеек: ${result.updates} (позиции + ссылки ТЗ). Комментарии и даты не трогали.`,
    );
    console.log(
      `    Полная перезапись листа: MIGRATION_SHEET_FULL_PUSH=1 npm run seo:migration-sheet:push`,
    );
  } else {
    const preservedComments = await fetchPreservedComments(
      sheets,
      MIGRATION_SHEET_ID,
      quoted,
      layout.col,
    );

    const { rows, col, colCount } = buildMigrationSheetMatrix({
      preservedComments,
      layout,
    });
    const rowCount = rows.length;
    const lastCol = columnLetter(colCount);
    const sheetId = sheetIdByTitle(list, title);
    const range = `${quoted}!A1:${lastCol}${rowCount}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: MIGRATION_SHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    if (sheetId != null) {
      await applyMigrationSheetFormatting(
        sheets,
        MIGRATION_SHEET_ID,
        sheetId,
        rowCount,
        colCount,
        col,
      );
    }

    console.log(
      `OK: полный push — лист «${title}», ${MIGRATION_PAGES.length} страниц (A–${lastCol}), комментариев сохранено: ${preservedComments.size}`,
    );
  }
  console.log(`    https://docs.google.com/spreadsheets/d/${MIGRATION_SHEET_ID}/edit`);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Ошибка записи в Google Sheets:", msg);
  if (/disabled|Sheets API has not been used/i.test(msg)) {
    console.error(
      "Включите Google Sheets API в том же проекте Google Cloud, что и OAuth-клиент.",
    );
  }
  if (/403|permission|denied/i.test(msg)) {
    console.error(
      "Дайте аккаунту OAuth права «Редактор» на таблицу или откройте доступ по ссылке с редактированием.",
    );
  }
  process.exit(1);
});
