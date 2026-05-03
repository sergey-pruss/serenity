#!/usr/bin/env node
/**
 * Печатает client_email из secrets/mcp/google-search-console-sa.json
 * (без секретных полей) — его нужно добавить в GSC → Пользователи.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const keyPath = path.join(root, "secrets", "mcp", "google-search-console-sa.json");

if (!fs.existsSync(keyPath)) {
  console.error("Файл не найден:", keyPath);
  console.error("Скачайте JSON ключа сервисного аккаунта и сохраните под этим путём.");
  console.error("Инструкция: npm run mcp:gsc-help");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error("Не удалось прочитать JSON:", e.message);
  process.exit(1);
}

const email = data.client_email;
if (!email) {
  console.error("В JSON нет поля client_email — это не ключ сервисного аккаунта Google?");
  process.exit(1);
}

console.log("Добавьте в Search Console → Настройки → Пользователи и разрешения → Добавить пользователя:");
console.log("");
console.log(email);
console.log("");
