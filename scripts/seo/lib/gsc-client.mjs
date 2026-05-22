/**
 * Клиент GSC: refresh token → OAuth Desktop → сервисный аккаунт.
 * Аккаунт Search Console: sergeyprus@gmail.com (см. gsc-auth-hints.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { formatGscErrorForUi } from "./gsc-auth-hints.mjs";
import { ROOT } from "./serp-shared.mjs";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const DEFAULT_GSC_CLIENT = path.join(ROOT, "secrets", "mcp", "gsc-oauth-desktop.json");
const DEFAULT_GSC_TOKEN = path.join(ROOT, "secrets", "mcp", "gsc-oauth-token.json");
const DEFAULT_SA = path.join(ROOT, "secrets", "mcp", "google-search-console-sa.json");

/**
 * @param {string} oauthClientPath
 * @returns {Promise<import('google-auth-library').OAuth2Client | null>}
 */
async function oauth2FromTokenFile(oauthClientPath, tokenPath) {
  const { google } = await import("googleapis");
  const rawClient = JSON.parse(fs.readFileSync(oauthClientPath, "utf8"));
  const installed = rawClient.installed || rawClient.web;
  if (!installed?.client_id || !installed?.client_secret) return null;
  const redirect = installed.redirect_uris?.[0] || "http://localhost";
  const oauth2 = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    redirect,
  );
  oauth2.setCredentials(JSON.parse(fs.readFileSync(tokenPath, "utf8")));
  return oauth2;
}

/**
 * @param {import('googleapis').searchconsole_v1.Searchconsole} searchconsole
 * @param {string} siteUrl
 * @param {string} startDate
 * @param {string} endDate
 */
/**
 * @param {import('googleapis').searchconsole_v1.Searchconsole} searchconsole
 * @param {string} siteUrl
 * @param {string} startDate
 * @param {string} endDate
 * @param {string[]} dimensions
 * @param {string} [aggregationType]
 */
async function gscFetchAnalytics(searchconsole, siteUrl, startDate, endDate, dimensions, aggregationType = "auto") {
  const rowLimit = 25000;
  const rows = [];
  let startRow = 0;
  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        startRow,
        aggregationType,
        dataState: "final",
      },
    });
    const chunk = res.data.rows || [];
    rows.push(...chunk);
    if (chunk.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

export async function gscFetchAllQueries(searchconsole, siteUrl, startDate, endDate) {
  return gscFetchAnalytics(searchconsole, siteUrl, startDate, endDate, ["query"], "auto");
}

/** @param {import('googleapis').searchconsole_v1.Searchconsole} searchconsole */
export async function gscFetchAllPages(searchconsole, siteUrl, startDate, endDate) {
  return gscFetchAnalytics(searchconsole, siteUrl, startDate, endDate, ["page"], "byPage");
}

/** @param {string} [preferred] */
export function gscSiteUrlCandidates(preferred) {
  const env = process.env.GSC_SITE_URL?.trim();
  if (env) return [env];
  const fallbacks = [
    "sc-domain:serenity.agency",
    "https://serenity.agency/",
    "https://www.serenity.agency/",
  ];
  return [...new Set([...(preferred && preferred.trim() ? [preferred.trim()] : []), ...fallbacks])];
}

/**
 * @returns {Promise<{
 *   searchconsole: import('googleapis').searchconsole_v1.Searchconsole | null,
 *   authMethod: 'oauth' | 'service_account' | null,
 *   authDetail: string | null,
 *   error: string | null
 * }>}
 */
export async function createGscSearchConsole() {
  const { google } = await import("googleapis");
  const oauthPath = process.env.GSC_OAUTH_CLIENT_FILE || DEFAULT_GSC_CLIENT;
  const tokenPath = process.env.GSC_OAUTH_TOKEN_FILE || DEFAULT_GSC_TOKEN;
  const saPath = process.env.GSC_SERVICE_ACCOUNT_KEY_FILE || DEFAULT_SA;
  const forceSa = process.env.GSC_FORCE_SERVICE_ACCOUNT === "1";

  if (!forceSa && fs.existsSync(tokenPath) && fs.existsSync(oauthPath)) {
    try {
      const auth = await oauth2FromTokenFile(oauthPath, tokenPath);
      if (auth) {
        return {
          searchconsole: google.searchconsole({ version: "v1", auth }),
          authMethod: "oauth",
          authDetail: tokenPath,
          error: null,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        searchconsole: null,
        authMethod: null,
        authDetail: tokenPath,
        error: formatGscErrorForUi(`OAuth token GSC: ${msg}`),
      };
    }
  }

  if (!forceSa && fs.existsSync(oauthPath)) {
    try {
      const { authenticate } = await import("@google-cloud/local-auth");
      const auth = await authenticate({
        scopes: [GSC_SCOPE],
        keyfilePath: oauthPath,
      });
      return {
        searchconsole: google.searchconsole({ version: "v1", auth }),
        authMethod: "oauth",
        authDetail: oauthPath,
        error: null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        searchconsole: null,
        authMethod: null,
        authDetail: oauthPath,
        error: formatGscErrorForUi(`OAuth GSC: ${msg}`),
      };
    }
  }

  if (fs.existsSync(saPath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: saPath,
        scopes: [GSC_SCOPE],
      });
      return {
        searchconsole: google.searchconsole({ version: "v1", auth }),
        authMethod: "service_account",
        authDetail: saPath,
        error: null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        searchconsole: null,
        authMethod: null,
        authDetail: saPath,
        error: formatGscErrorForUi(`SA GSC: ${msg}`),
      };
    }
  }

  return {
    searchconsole: null,
    authMethod: null,
    authDetail: null,
    error:
      "нет учётных данных GSC: gsc-oauth-desktop.json + npm run seo:gsc-oauth-token:install (вход sergeyprus@gmail.com)",
  };
}

export { formatGscErrorForUi } from "./gsc-auth-hints.mjs";

/**
 * @param {import('googleapis').searchconsole_v1.Searchconsole} searchconsole
 * @param {string[]} candidates
 * @param {string} startDate
 * @param {string} endDate
 */
async function gscFetchWithSiteFallback(searchconsole, candidates, startDate, endDate, fetchFn) {
  let lastError = null;
  for (const siteUrl of candidates) {
    try {
      const rows = await fetchFn(searchconsole, siteUrl, startDate, endDate);
      return { rows, siteUrl, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const retry =
        /permission|403|forbidden|not found|404|insufficient/i.test(lastError) && candidates.length > 1;
      if (!retry) throw e;
    }
  }
  return { rows: [], siteUrl: candidates[0] || "", error: lastError };
}

export async function gscFetchQueriesWithSiteFallback(searchconsole, candidates, startDate, endDate) {
  return gscFetchWithSiteFallback(searchconsole, candidates, startDate, endDate, gscFetchAllQueries);
}

export async function gscFetchPagesWithSiteFallback(searchconsole, candidates, startDate, endDate) {
  return gscFetchWithSiteFallback(searchconsole, candidates, startDate, endDate, gscFetchAllPages);
}
