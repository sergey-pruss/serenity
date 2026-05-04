#!/usr/bin/env node
/**
 * Выгрузка запросов из GSC по страницам, содержащим URL главной (OAuth Desktop + браузер).
 * Пишет json/seo/sources/gsc-home-queries.json — затем npm run seo:merge-gsc-core.
 *
 * Требуется secrets/mcp/gsc-oauth-desktop.json (npm run mcp:gsc-install-oauth).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const keyfilePath = path.join(ROOT, "secrets", "mcp", "gsc-oauth-desktop.json");
const OUT = path.join(ROOT, "json", "seo", "sources", "gsc-home-queries.json");
const SEMANTIC_CORE = path.join(ROOT, "json", "seo", "semantic-core.json");

function tryReadGscSiteUrlFromCore() {
  try {
    const j = JSON.parse(fs.readFileSync(SEMANTIC_CORE, "utf8"));
    const u = j?.site?.gscSiteUrl;
    return typeof u === "string" && u.trim() ? u.trim() : null;
  } catch {
    return null;
  }
}

/** Как в интерфейсе GSC: сначала явный GSC_SITE_URL, иначе ядро + типовые варианты. */
function gscSiteUrlCandidates() {
  const env = process.env.GSC_SITE_URL?.trim();
  if (env) return [env];
  const fromCore = tryReadGscSiteUrlFromCore();
  const fallbacks = [
    "sc-domain:serenity.agency",
    "https://serenity.agency/",
    "https://www.serenity.agency/",
  ];
  return [...new Set([...(fromCore ? [fromCore] : []), ...fallbacks])];
}

/** Варианты URL главной для фильтра `page` в GSC (часть трафика может быть на http/www). */
const DEFAULT_HOME_PAGE_EQUALS = [
  "https://serenity.agency/",
  "https://serenity.agency",
  "http://serenity.agency/",
  "http://serenity.agency",
  "https://www.serenity.agency/",
  "https://www.serenity.agency",
  "http://www.serenity.agency/",
  "http://www.serenity.agency",
];

function isHomeUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== "string") return false;
  try {
    const u = new URL(pageUrl);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "serenity.agency") return false;
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return path === "/";
  } catch {
    return false;
  }
}

function defaultEndDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
}

function startDateFromEnd(end, days) {
  const e = new Date(`${end}T00:00:00.000Z`);
  e.setUTCDate(e.getUTCDate() - (days - 1));
  return e.toISOString().slice(0, 10);
}

const endDate = process.env.REPORT_END_DATE || defaultEndDate();
const startDate = process.env.REPORT_START_DATE || startDateFromEnd(endDate, 90);

/**
 * Запросы с фильтром page=… (только измерение query — совместимо с sc-domain).
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {"final"|"all"} dataState
 * @param {string} pageEquals
 * @param {Set<string>} queries
 */
/**
 * Одна регулярка на все канонические варианты главной (http/https, www).
 * Переопределение: GSC_HOME_PAGE_REGEX=…
 */
async function fetchQueriesForPageRegex(searchconsole, dataState, siteUrlParam, expression, queries) {
  const rowLimit = 25000;
  let startRow = 0;
  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrlParam,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        dimensionFilterGroups: [
          {
            filters: [{ dimension: "page", operator: "includingRegex", expression }],
          },
        ],
        rowLimit,
        startRow,
        aggregationType: "auto",
        dataState,
      },
    });
    const chunk = res.data.rows || [];
    for (const row of chunk) {
      const query = row.keys && row.keys[0];
      if (query) queries.add(query);
    }
    if (chunk.length < rowLimit) break;
    startRow += rowLimit;
  }
}

async function fetchQueriesForPageEquals(searchconsole, dataState, siteUrlParam, pageEquals, queries) {
  const rowLimit = 25000;
  let startRow = 0;
  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrlParam,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        dimensionFilterGroups: [
          {
            filters: [{ dimension: "page", operator: "equals", expression: pageEquals }],
          },
        ],
        rowLimit,
        startRow,
        aggregationType: "auto",
        dataState,
      },
    });
    const chunk = res.data.rows || [];
    for (const row of chunk) {
      const query = row.keys && row.keys[0];
      if (query) queries.add(query);
    }
    if (chunk.length < rowLimit) break;
    startRow += rowLimit;
  }
}

/**
 * Fallback: page+query, автоагрегация, отбор главной в коде.
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {"final"|"all"} dataState
 */
async function fetchHomeQueriesPageQueryFallback(searchconsole, dataState, siteUrlParam) {
  const rowLimit = 25000;
  const queries = new Set();
  let startRow = 0;
  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrlParam,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page", "query"],
        rowLimit,
        startRow,
        aggregationType: "auto",
        dataState,
      },
    });
    const chunk = res.data.rows || [];
    for (const row of chunk) {
      const page = row.keys && row.keys[0];
      const query = row.keys && row.keys[1];
      if (!query || !isHomeUrl(page)) continue;
      queries.add(query);
    }
    if (chunk.length < rowLimit) break;
    startRow += rowLimit;
  }
  return [...queries];
}

/**
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {"final"|"all"} dataState
 * @param {string} siteUrlParam — ровно как в списке ресурсов GSC
 */
async function fetchHomeQueries(searchconsole, dataState, siteUrlParam) {
  const queries = new Set();
  const regex =
    process.env.GSC_HOME_PAGE_REGEX?.trim() || "^https?://(www\\.)?serenity\\.agency/?$";
  try {
    await fetchQueriesForPageRegex(searchconsole, dataState, siteUrlParam, regex, queries);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(/** @type {{ message?: string }} */ (e).message) : String(e);
    console.error("Regex-фильтр page пропущен:", msg.slice(0, 280));
  }

  const rawHome = process.env.GSC_HOME_URLS?.trim();
  const homeUrls = rawHome
    ? rawHome.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_HOME_PAGE_EQUALS;

  if (queries.size === 0) {
    for (const pageEquals of homeUrls) {
      await fetchQueriesForPageEquals(searchconsole, dataState, siteUrlParam, pageEquals, queries);
    }
  }
  if (queries.size > 0) return [...queries];

  console.error(
    `Фильтры page для «${siteUrlParam}» не дали строк — fallback: [page,query], aggregationType auto.`,
  );
  return fetchHomeQueriesPageQueryFallback(searchconsole, dataState, siteUrlParam);
}

/**
 * Если совсем пусто — есть ли данные по ресурсу без фильтра (диагностика).
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {"final"|"all"} dataState
 */
async function logUnfilteredSample(searchconsole, siteUrlParam, dataState) {
  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrlParam,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 5,
        startRow: 0,
        aggregationType: "auto",
        dataState,
      },
    });
    const rows = res.data.rows || [];
    console.error(
      `[GSC] проба без фильтра, ресурс ${siteUrlParam}, dataState=${dataState}: строк ${rows.length}`,
    );
    for (const row of rows.slice(0, 3)) {
      console.error("  пример query:", JSON.stringify(row.keys?.[0]));
    }
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(/** @type {{ message?: string }} */ (e).message) : String(e);
    console.error("[GSC] проба без фильтра не удалась:", msg.slice(0, 400));
  }
}

/**
 * Проба API: сколько строк и примеры ключей (stderr). Запуск: GSC_DEBUG=1 node …
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {"final"|"all"} dataState
 */
async function debugProbe(searchconsole, dataState, siteUrlParam) {
  const base = { siteUrl: siteUrlParam, requestBody: { startDate, endDate, rowLimit: 10, startRow: 0, dataState } };
  const qOnly = await searchconsole.searchanalytics.query({
    ...base,
    requestBody: { ...base.requestBody, dimensions: ["query"], aggregationType: "auto" },
  });
  const rowsQ = qOnly.data.rows || [];
  console.error(`[GSC_DEBUG] query-only rows (first page): ${rowsQ.length}`);
  for (const row of rowsQ.slice(0, 3)) {
    console.error("  keys:", JSON.stringify(row.keys));
  }
  const pq = await searchconsole.searchanalytics.query({
    ...base,
    requestBody: {
      ...base.requestBody,
      dimensions: ["page", "query"],
      aggregationType: "auto",
    },
  });
  const rowsPQ = pq.data.rows || [];
  console.error(`[GSC_DEBUG] page+query aggregationType=auto rows: ${rowsPQ.length}`);
  for (const row of rowsPQ.slice(0, 5)) {
    console.error("  keys:", JSON.stringify(row.keys), "home?", isHomeUrl(row.keys?.[0]));
  }
  const pqByPage = await searchconsole.searchanalytics.query({
    ...base,
    requestBody: {
      ...base.requestBody,
      dimensions: ["page", "query"],
      aggregationType: "byPage",
    },
  });
  const rowsByPage = pqByPage.data.rows || [];
  console.error(`[GSC_DEBUG] page+query aggregationType=byPage rows: ${rowsByPage.length}`);
  for (const row of rowsByPage.slice(0, 5)) {
    console.error("  keys:", JSON.stringify(row.keys), "home?", isHomeUrl(row.keys?.[0]));
  }
}

async function main() {
  if (!fs.existsSync(keyfilePath)) {
    console.error("Нет", keyfilePath, "— выполните: npm run mcp:gsc-install-oauth -- /путь/к/client_secret_….json");
    process.exit(1);
  }
  const candidates = gscSiteUrlCandidates();
  console.error("Откроется браузер: Google-аккаунт с доступом к GSC. Ресурсы по очереди:", candidates.join(" | "));
  const auth = await authenticate({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    keyfilePath,
  });
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const dataState = process.env.GSC_DATA_STATE === "all" ? "all" : "final";
  if (process.env.GSC_DEBUG === "1") {
    const ds = dataState;
    for (const s of candidates) {
      console.error("[GSC_DEBUG] site=", s, "dataState=", ds);
      await debugProbe(searchconsole, ds, s);
      if (ds === "final") {
        console.error("[GSC_DEBUG] same site, dataState=all");
        await debugProbe(searchconsole, "all", s);
      }
    }
  }

  let keys = [];
  let usedSite = "";
  for (const s of candidates) {
    console.error("Выгрузка: пробуем ресурс", s);
    let k = await fetchHomeQueries(searchconsole, dataState, s);
    if (k.length === 0 && dataState === "final") {
      console.error("Пусто при dataState=final — повтор с dataState=all для", s);
      k = await fetchHomeQueries(searchconsole, "all", s);
    }
    if (k.length > 0) {
      keys = k;
      usedSite = s;
      break;
    }
  }

  if (keys.length === 0) {
    const probeSite = candidates[0];
    const probeState = dataState === "final" ? "all" : dataState;
    console.error("Все кандидаты вернули 0 запросов по главной. Диагностика для первого ресурса:", probeSite);
    await logUnfilteredSample(searchconsole, probeSite, probeState);
    if (dataState === "final" && probeState === "all") {
      await logUnfilteredSample(searchconsole, probeSite, "final");
    }
  }

  const unique = [...new Set(keys)];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ queries: unique }, null, 2), "utf8");
  console.error("Период:", startDate, "—", endDate, "| главная: serenity.agency /");
  if (usedSite) console.error("Сработал ресурс GSC:", usedSite);
  console.error("Записано уникальных запросов:", unique.length, "→", path.relative(ROOT, OUT));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
