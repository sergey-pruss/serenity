#!/usr/bin/env node
/**
 * Копирует OAuth Desktop JSON (из Google Cloud → Credentials → скачанный клиент)
 * в secrets/mcp/gsc-oauth-desktop.json — лаунчер MCP подхватывает автоматически.
 *
 * Использование:
 *   node scripts/mcp/install-gsc-oauth-desktop.mjs /путь/к/client_secret_….json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const dest = path.join(root, "secrets", "mcp", "gsc-oauth-desktop.json");

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("Укажите путь к JSON OAuth-клиента типа Desktop (скачан в Google Cloud → Credentials).");
  console.error("Пример:");
  console.error("  npm run mcp:gsc-install-oauth -- \"$HOME/Downloads/client_secret_….json\"");
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(src, "utf8");
} catch (e) {
  console.error("Не удалось прочитать файл:", e.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch {
  console.error("Файл не похож на JSON OAuth-клиента.");
  process.exit(1);
}

if (!data.installed && !data.web) {
  console.error("Ожидается JSON OAuth с полем «installed» (Desktop) или «web».");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("Скопировано в:", dest);
console.log("Перезапустите MCP google-search-console в Cursor. При первом запросе откроется вход в Google.");
