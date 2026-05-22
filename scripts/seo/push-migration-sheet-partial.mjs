#!/usr/bin/env node
/**
 * Обновить таблицу без затирания: только позиции SERP + ссылки на актуальное ТЗ.
 * npm run seo:migration-sheet:update-partial
 */
import { MIGRATION_SHEET_ID } from "./lib/migration-sheet-data.mjs";
import { updateMigrationSheetPartial } from "./lib/migration-sheet-update-rankings.mjs";
import { createGoogleSheetsAuth } from "./lib/google-sheets-auth.mjs";

async function main() {
  const { method, detail } = await createGoogleSheetsAuth();
  console.log(`Авторизация Sheets: ${method} (${detail})`);

  const result = await updateMigrationSheetPartial();
  console.log(
    `OK: лист «${result.title}», обновлено ячеек: ${result.updates}`,
  );
  console.log(
    `    https://docs.google.com/spreadsheets/d/${MIGRATION_SHEET_ID}/edit`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
