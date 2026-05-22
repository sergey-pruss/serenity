#!/usr/bin/env node
/**
 * Экспорт приоритетного листа «Страницы» для Google Sheets (CSV).
 * Прямая запись в таблицу: npm run seo:migration-sheet:push
 * Позиции: json/seo/rank-dashboard.json. Дата статика: первый коммит nginx/routing.conf ($is_new_page).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORIGIN,
  MIGRATION_PAGES,
  buildMigrationSheetValues,
} from "./lib/migration-sheet-data.mjs";
import { rankingsForMigrationPath } from "./lib/migration-sheet-rankings.mjs";
import { migrationStaticDate } from "./lib/migration-sheet-static-dates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

const values = buildMigrationSheetValues();
const lines = values.map((row) => row.map(csvEscape).join(","));

const outDir = path.join(root, "docs");
fs.mkdirSync(outDir, { recursive: true });
const tsvPath = path.join(outDir, "seo-migration-sheet-import.csv");
fs.writeFileSync(tsvPath, "\uFEFF" + lines.join("\n") + "\n", "utf8");

const jsonPath = path.join(root, "json/seo/migration-pages-priority.json");
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      updated: new Date().toISOString().slice(0, 10),
      origin: ORIGIN,
      pages: MIGRATION_PAGES.map((p, i) => ({
        priority: i + 1,
        ...p,
        url: p.path === "/" ? ORIGIN : `${ORIGIN}${p.path}`,
        staticDate: migrationStaticDate(p.path, p.site, p.staticDate),
        rankings: rankingsForMigrationPath(p.path),
      })),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`OK: ${tsvPath} (${MIGRATION_PAGES.length} строк)`);
console.log(`OK: ${jsonPath}`);
