/**
 * Авторизация Google Sheets API без браузера на каждый push:
 * 1) сервисный аккаунт (ключ JSON + редактор на таблицу для client_email)
 * 2) сохранённый refresh token (secrets/mcp/google-sheets-oauth-token.json)
 * 3) fallback: @google-cloud/local-auth (браузер)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..", "..");

export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** OAuth client для Sheets (Serenity SEO) — не подменять gsc-oauth-desktop.json. */
const DEFAULT_SHEETS_CLIENT = path.join(
  ROOT,
  "secrets",
  "mcp",
  "google-sheets-oauth-client.json",
);
const DEFAULT_TOKEN = path.join(ROOT, "secrets", "mcp", "google-sheets-oauth-token.json");
const DEFAULT_SA = path.join(ROOT, "secrets", "mcp", "google-search-console-sa.json");

/**
 * @returns {Promise<{
 *   auth: import('google-auth-library').OAuth2Client | import('google-auth-library').GoogleAuth,
 *   method: 'service_account' | 'oauth_token' | 'oauth_interactive',
 *   detail: string
 * }>}
 */
export async function createGoogleSheetsAuth() {
  const { google } = await import("googleapis");
  const forceOAuth = process.env.GOOGLE_SHEETS_FORCE_OAUTH === "1";
  const saPath =
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_FILE ||
    process.env.GSC_SERVICE_ACCOUNT_KEY_FILE ||
    DEFAULT_SA;
  const tokenPath =
    process.env.GOOGLE_SHEETS_OAUTH_TOKEN_FILE || DEFAULT_TOKEN;
  const clientPath =
    process.env.GOOGLE_SHEETS_OAUTH_CLIENT_FILE ||
    (fs.existsSync(DEFAULT_SHEETS_CLIENT)
      ? DEFAULT_SHEETS_CLIENT
      : path.join(ROOT, "secrets", "mcp", "gsc-oauth-desktop.json"));

  if (!forceOAuth && fs.existsSync(saPath)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: [SHEETS_SCOPE],
    });
    return { auth, method: "service_account", detail: saPath };
  }

  if (fs.existsSync(tokenPath) && fs.existsSync(clientPath)) {
    const rawClient = JSON.parse(fs.readFileSync(clientPath, "utf8"));
    const installed = rawClient.installed || rawClient.web;
    if (!installed?.client_id || !installed?.client_secret) {
      throw new Error(`Некорректный OAuth client: ${clientPath}`);
    }
    const redirect =
      installed.redirect_uris?.[0] || "http://localhost";
    const oauth2 = new google.auth.OAuth2(
      installed.client_id,
      installed.client_secret,
      redirect,
    );
    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    oauth2.setCredentials(tokens);
    return { auth: oauth2, method: "oauth_token", detail: tokenPath };
  }

  const { authenticate } = await import("@google-cloud/local-auth");
  const auth = await authenticate({
    scopes: [SHEETS_SCOPE],
    keyfilePath: clientPath,
  });
  return { auth, method: "oauth_interactive", detail: clientPath };
}

/** @param {string} [saPath] */
export function readServiceAccountEmail(saPath = DEFAULT_SA) {
  if (!fs.existsSync(saPath)) return null;
  const data = JSON.parse(fs.readFileSync(saPath, "utf8"));
  return data.client_email || null;
}
