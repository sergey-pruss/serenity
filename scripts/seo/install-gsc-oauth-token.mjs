#!/usr/bin/env node
/**
 * Сохранить refresh token для GSC (Search Console API).
 * В браузере войти как sergeyprus@gmail.com — тот же аккаунт, что в Search Console Serenity.
 *
 * OAuth client: secrets/mcp/gsc-oauth-desktop.json (проект с включённым Search Console API,
 * обычно sergeypruss — npm run mcp:gsc-sync-oauth, не клиент Serenity SEO для Sheets).
 *
 * npm run seo:gsc-oauth-token:install
 */
import fs from "node:fs";
import path from "node:path";
import { authenticate } from "@google-cloud/local-auth";
import { ROOT } from "./lib/google-sheets-auth.mjs";
import { GSC_OAUTH_ACCOUNT_HINT } from "./lib/gsc-auth-hints.mjs";
import { createGscSearchConsole } from "./lib/gsc-client.mjs";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const clientPath =
  process.env.GSC_OAUTH_CLIENT_FILE ||
  path.join(ROOT, "secrets", "mcp", "gsc-oauth-desktop.json");
const tokenPath =
  process.env.GSC_OAUTH_TOKEN_FILE ||
  path.join(ROOT, "secrets", "mcp", "gsc-oauth-token.json");

async function main() {
  if (!fs.existsSync(clientPath)) {
    console.error("Нет OAuth client для GSC:", clientPath);
    console.error("Восстановите клиент sergeypruss: npm run mcp:gsc-sync-oauth");
    console.error("или: npm run mcp:gsc-install-oauth -- путь/к/client_secret….json");
    process.exit(1);
  }

  console.log(
    `Откроется браузер Google. Войдите как ${GSC_OAUTH_ACCOUNT_HINT} (доступ к GSC serenity.agency).`,
  );
  console.log("Не используйте prus@serenity.ru — для таблицы миграции отдельный OAuth (seo:sheets-oauth:install).");

  const auth = await authenticate({
    scopes: [GSC_SCOPE],
    keyfilePath: clientPath,
  });

  const creds = auth.credentials || {};
  if (!creds.refresh_token) {
    console.error(
      "Refresh token не выдан. Удалите доступ приложения: https://myaccount.google.com/permissions",
    );
    console.error("Повторите npm run seo:gsc-oauth-token:install");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(creds, null, 2) + "\n", "utf8");
  console.log("OK: GSC refresh token →", tokenPath);

  const client = await createGscSearchConsole();
  console.log("  метод:", client.authMethod, client.authDetail || "");
  if (client.error) {
    console.warn("  проверка API:", client.error.slice(0, 240));
  } else {
    console.log("  клиент GSC создан, можно: npm run seo:rank-dashboard:panels");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
