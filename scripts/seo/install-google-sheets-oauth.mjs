#!/usr/bin/env node
/**
 * OAuth для Google Таблицы миграции (не GSC): prus@serenity.ru, проект Serenity SEO.
 * Клиент: secrets/mcp/google-sheets-oauth-client.json (не gsc-oauth-desktop.json).
 *
 * GSC / дашборд — отдельно: sergeyprus@gmail.com, npm run seo:gsc-oauth-token:install
 *
 * npm run seo:sheets-oauth:install
 */
import fs from "node:fs";
import path from "node:path";
import { authenticate } from "@google-cloud/local-auth";
import {
  ROOT,
  SHEETS_SCOPE,
  createGoogleSheetsAuth,
} from "./lib/google-sheets-auth.mjs";

const clientPath =
  process.env.GOOGLE_SHEETS_OAUTH_CLIENT_FILE ||
  path.join(ROOT, "secrets", "mcp", "google-sheets-oauth-client.json");
const tokenPath =
  process.env.GOOGLE_SHEETS_OAUTH_TOKEN_FILE ||
  path.join(ROOT, "secrets", "mcp", "google-sheets-oauth-token.json");

async function main() {
  if (!fs.existsSync(clientPath)) {
    console.error("Нет OAuth client:", clientPath);
    console.error(
      "Положите Desktop JSON Serenity SEO в secrets/mcp/google-sheets-oauth-client.json",
    );
    process.exit(1);
  }

  console.log(
    "Откроется браузер Google. Войдите как prus@serenity.ru (редактор таблицы миграции).",
  );
  console.log("Для GSC/дашборда — другой аккаунт: npm run seo:gsc-oauth-token:install");
  const auth = await authenticate({
    scopes: [SHEETS_SCOPE],
    keyfilePath: clientPath,
  });

  const creds = auth.credentials || {};
  if (!creds.refresh_token) {
    console.error(
      "Refresh token не выдан. Удалите старый доступ: https://myaccount.google.com/permissions",
    );
    console.error("Повторите npm run seo:sheets-oauth:install");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(creds, null, 2) + "\n", "utf8");
  console.log("OK: сохранён refresh token →", tokenPath);
  console.log("Проверка без браузера:");
  const check = await createGoogleSheetsAuth();
  console.log("  метод:", check.method);
  if (check.method !== "oauth_token") {
    console.warn("  ожидался oauth_token — проверьте файлы в secrets/mcp/");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
