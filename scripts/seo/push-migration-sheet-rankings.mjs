#!/usr/bin/env node
/**
 * Обновить в Google Sheets только колонки позиций (Google, Я Москва, Я Питер).
 * Источник: json/seo/rank-dashboard.json (последний SERP-снимок, один запрос на страницу).
 * Не очищает лист и не меняет ширину столбцов.
 *
 * Запуск: npm run seo:migration-sheet:update-rankings
 */
import { MIGRATION_SHEET_ID } from "./lib/migration-sheet-data.mjs";
import { updateMigrationSheetRankings } from "./lib/migration-sheet-update-rankings.mjs";
import { createGoogleSheetsAuth } from "./lib/google-sheets-auth.mjs";

async function main() {
  const dryRun = process.env.MIGRATION_SHEET_DRY_RUN === "1";
  const { method, detail } = await createGoogleSheetsAuth();
  console.log(`Авторизация Sheets: ${method} (${detail})`);

  if (dryRun) {
    console.log("DRY RUN: обновление колонок позиций пропущено");
    return;
  }

  const result = await updateMigrationSheetRankings();
  console.log(
    `OK: позиции → лист «${result.title}», ${result.pageCount} страниц, ячеек обновлено: ${result.updates}`,
  );
  console.log(
    `    https://docs.google.com/spreadsheets/d/${MIGRATION_SHEET_ID}/edit`,
  );
}

main().catch((e) => {
  console.error("Ошибка обновления позиций:", e instanceof Error ? e.message : e);
  process.exit(1);
});
