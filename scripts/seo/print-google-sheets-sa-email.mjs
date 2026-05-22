#!/usr/bin/env node
/**
 * Email сервисного аккаунта — добавьте его редактором в Google-таблицу
 * (тогда push без браузера и без prus/gmail OAuth).
 */
import { readServiceAccountEmail, ROOT } from "./lib/google-sheets-auth.mjs";
import path from "node:path";

const saPath =
  process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_FILE ||
  path.join(ROOT, "secrets", "mcp", "google-search-console-sa.json");

const email = readServiceAccountEmail(saPath);
if (!email) {
  console.error("Нет ключа SA:", saPath);
  process.exit(1);
}

console.log("В таблице «Поделиться» добавьте редактора:");
console.log(email);
console.log("");
console.log("Затем: npm run seo:migration-sheet:push (без браузера)");
