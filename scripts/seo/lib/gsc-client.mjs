/**
 * Клиент GSC: OAuth Desktop (как MCP) или сервисный аккаунт + перебор siteUrl.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./serp-shared.mjs";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

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
  const oauthPath =
    process.env.GSC_OAUTH_CLIENT_FILE || path.join(ROOT, "secrets", "mcp", "gsc-oauth-desktop.json");
  const saPath =
    process.env.GSC_SERVICE_ACCOUNT_KEY_FILE ||
    path.join(ROOT, "secrets", "mcp", "google-search-console-sa.json");
  const forceSa = process.env.GSC_FORCE_SERVICE_ACCOUNT === "1";

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
        error: `OAuth GSC: ${msg}`,
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
        error: `SA GSC: ${msg}`,
      };
    }
  }

  return {
    searchconsole: null,
    authMethod: null,
    authDetail: null,
    error:
      "нет учётных данных GSC: положите secrets/mcp/gsc-oauth-desktop.json (npm run mcp:gsc-install-oauth) или SA-ключ",
  };
}

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
