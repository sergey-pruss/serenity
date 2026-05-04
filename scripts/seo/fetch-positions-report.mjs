#!/usr/bin/env node
/**
 * Сводка позиций/показов по семантическому ядру: Google Search Console + Яндекс Вебмастер.
 * Секреты только из env / secrets (см. docs/seo-positions-mcp-workflows.md).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { normalizeQueryForJoin } from "./lib/normalize-query.mjs";
import { loadSemanticCore, coreQueriesByNormalizedKey } from "./lib/semantic-core-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return isoDate(d);
}

function defaultStartDate(end) {
  const e = new Date(`${end}T00:00:00.000Z`);
  e.setUTCDate(e.getUTCDate() - 27);
  return isoDate(e);
}

/**
 * @param {string} token
 */
async function yandexGetUser(token) {
  const r = await fetch("https://api.webmaster.yandex.net/v4/user", {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Yandex /v4/user HTTP ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

/**
 * @param {string} token
 * @param {string|number} userId
 */
async function yandexListHosts(token, userId) {
  const r = await fetch(`https://api.webmaster.yandex.net/v4/user/${userId}/hosts`, {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Yandex hosts HTTP ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

/**
 * @param {object} body
 */
function pickYandexHostId(body, primaryDomain) {
  const hosts = body.hosts;
  if (!Array.isArray(hosts)) return null;
  const needle = primaryDomain.toLowerCase().replace(/^www\./, "");
  for (const h of hosts) {
    const id = h && (h.host_id ?? h.unic_host_id ?? h.hostId);
    if (typeof id === "string" && id.toLowerCase().includes(needle)) return id;
  }
  return null;
}

/**
 * @param {string} token
 * @param {string|number} userId
 * @param {string} hostId
 * @param {string} dateFrom YYYY-MM-DD
 * @param {string} dateTo YYYY-MM-DD
 */
async function yandexFetchPopularQueries(token, userId, hostId, dateFrom, dateTo) {
  const limit = 500;
  const all = [];
  let offset = 0;
  let total = Infinity;
  const encHost = encodeURIComponent(hostId);
  while (offset < total) {
    const u = new URL(
      `https://api.webmaster.yandex.net/v4/user/${userId}/hosts/${encHost}/search-queries/popular`,
    );
    u.searchParams.set("order_by", "TOTAL_SHOWS");
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("offset", String(offset));
    u.searchParams.set("date_from", dateFrom);
    u.searchParams.set("date_to", dateTo);
    // Без query_indicator API может вернуть пустой indicators (см. SEO_DEBUG).
    for (const ind of ["TOTAL_SHOWS", "TOTAL_CLICKS", "AVG_SHOW_POSITION", "AVG_CLICK_POSITION"]) {
      u.searchParams.append("query_indicator", ind);
    }
    const r = await fetch(u, { headers: { Authorization: `OAuth ${token}` } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Yandex popular-queries HTTP ${r.status}: ${t.slice(0, 800)}`);
    }
    const data = await r.json();
    const chunk = Array.isArray(data.queries) ? data.queries : [];
    const count = Number(data.count);
    if (Number.isFinite(count)) total = count;
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return all;
}

/**
 * @param {ReturnType<typeof google.searchconsole>} searchconsole
 * @param {string} siteUrl
 * @param {string} startDate
 * @param {string} endDate
 */
async function gscFetchAllQueries(searchconsole, siteUrl, startDate, endDate) {
  const rowLimit = 25000;
  const rows = [];
  let startRow = 0;
  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit,
        startRow,
        aggregationType: "auto",
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

function main() {
  const corePath =
    process.env.SEMANTIC_CORE_PATH || path.join(ROOT, "json", "seo", "semantic-core.json");
  if (!fs.existsSync(corePath)) {
    console.error("Нет файла семантического ядра:", corePath);
    console.error("Скопируйте json/seo/semantic-core.example.json → json/seo/semantic-core.json и заполните.");
    process.exit(1);
  }

  const core = loadSemanticCore(corePath);
  const site = /** @type {{ primaryDomain: string, gscSiteUrl?: string, yandexHostId?: string }} */ (core.site);
  const endDate = process.env.REPORT_END_DATE || defaultEndDate();
  const startDate = process.env.REPORT_START_DATE || defaultStartDate(endDate);

  const skipGsc = process.env.SEO_SKIP_GSC === "1";

  const gscKeyFile =
    process.env.GSC_SERVICE_ACCOUNT_KEY_FILE || path.join(ROOT, "secrets", "mcp", "google-search-console-sa.json");
  if (!skipGsc && !fs.existsSync(gscKeyFile)) {
    console.error("Нет ключа GSC:", gscKeyFile);
    console.error("Задайте GSC_SERVICE_ACCOUNT_KEY_FILE или положите ключ в secrets/mcp/google-search-console-sa.json");
    console.error("Или только Яндекс: SEO_SKIP_GSC=1 npm run seo:positions-report");
    process.exit(1);
  }

  const gscSiteUrl = process.env.GSC_SITE_URL || site.gscSiteUrl;
  if (!gscSiteUrl || typeof gscSiteUrl !== "string") {
    console.error("Укажите site.gscSiteUrl в ядре или переменную окружения GSC_SITE_URL.");
    process.exit(1);
  }

  const yandexToken = process.env.YANDEX_WEBMASTER_TOKEN || "";

  const outDir = process.env.SEO_REPORT_DIR || path.join(ROOT, "artifacts", "seo");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outFile = path.join(outDir, `positions-report-${stamp}.json`);

  let searchconsole = null;
  if (!skipGsc) {
    const auth = new google.auth.GoogleAuth({
      keyFile: gscKeyFile,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    searchconsole = google.searchconsole({ version: "v1", auth });
  }

  const run = async () => {
    let gscRows = [];
    if (!skipGsc && searchconsole) {
      gscRows = await gscFetchAllQueries(searchconsole, gscSiteUrl, startDate, endDate);
    } else if (skipGsc) {
      console.warn("SEO_SKIP_GSC=1 — блок Google Search Console в отчёте пустой.");
    }
    /** @type {Map<string, { clicks: number, impressions: number, position: number }>} */
    const gscByKey = new Map();
    for (const row of gscRows) {
      const q = row.keys && row.keys[0];
      if (!q) continue;
      const k = normalizeQueryForJoin(q);
      if (!k) continue;
      gscByKey.set(k, {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        position: row.position ?? 0,
      });
    }

    /** @type {Map<string, { totalShows: number, totalClicks: number, avgShowPosition: number | null, avgClickPosition: number | null }>} */
    const yandexByKey = new Map();
    if (yandexToken) {
      const user = await yandexGetUser(yandexToken);
      const userId = user.user_id ?? user.userId;
      if (userId == null) throw new Error("Yandex /v4/user: нет user_id в ответе");
      let hostId = process.env.YANDEX_WEBMASTER_HOST_ID || site.yandexHostId || "";
      if (!hostId) {
        const hostsBody = await yandexListHosts(yandexToken, userId);
        hostId = pickYandexHostId(hostsBody, site.primaryDomain) || "";
      }
      if (!hostId) {
        console.warn("Яндекс: не удалось определить host_id; блок Яндекса будет пустым.");
      } else {
        const popular = await yandexFetchPopularQueries(yandexToken, userId, hostId, startDate, endDate);
        for (const item of popular) {
          const text = item.query_text ?? item.queryText;
          if (!text) continue;
          const k = normalizeQueryForJoin(text);
          if (!k) continue;
          const ind = item.indicators || item.Indicators || {};
          const totalShows = Number(ind.TOTAL_SHOWS ?? ind.total_shows ?? 0) || 0;
          const totalClicks = Number(ind.TOTAL_CLICKS ?? ind.total_clicks ?? 0) || 0;
          const avgShowPosition =
            ind.AVG_SHOW_POSITION != null ? Number(ind.AVG_SHOW_POSITION) : ind.avg_show_position != null ? Number(ind.avg_show_position) : null;
          const avgClickPosition =
            ind.AVG_CLICK_POSITION != null
              ? Number(ind.AVG_CLICK_POSITION)
              : ind.avg_click_position != null
                ? Number(ind.avg_click_position)
                : null;
          yandexByKey.set(k, { totalShows, totalClicks, avgShowPosition, avgClickPosition });
        }
      }
    } else {
      console.warn("YANDEX_WEBMASTER_TOKEN не задан — пропуск данных Яндекс Вебмастера.");
    }

    const coreMap = coreQueriesByNormalizedKey(/** @type {any} */ (core));
    const merged = [];
    for (const row of core.queries) {
      const k = normalizeQueryForJoin(row.query);
      const g = gscByKey.get(k);
      const y = yandexByKey.get(k);
      merged.push({
        query: row.query,
        cluster: row.cluster,
        priority: row.priority,
        targetUrl: row.targetUrl ?? null,
        normalizedKey: k,
        google: g
          ? {
              clicks: g.clicks,
              impressions: g.impressions,
              avgPosition: Math.round(g.position * 100) / 100,
            }
          : null,
        yandex:
          y && (y.totalShows > 0 || y.totalClicks > 0 || y.avgShowPosition != null || y.avgClickPosition != null)
            ? {
                shows: y.totalShows,
                clicks: y.totalClicks,
                avgShowPosition: y.avgShowPosition != null ? Math.round(y.avgShowPosition * 100) / 100 : null,
                avgClickPosition: y.avgClickPosition != null ? Math.round(y.avgClickPosition * 100) / 100 : null,
              }
            : null,
        panelGap:
          !g &&
          !(y && (y.totalShows > 0 || y.totalClicks > 0 || y.avgShowPosition != null || y.avgClickPosition != null))
            ? "нет данных в GSC и Яндекс за период (часто порог показов; см. rank-tracker в доке)"
            : null,
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      sources: {
        gscSiteUrl,
        gscSkipped: skipGsc,
        gscRowCount: gscRows.length,
        yandexUsed: Boolean(yandexToken),
      },
      corePath: path.relative(ROOT, corePath),
      rows: merged,
    };

    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
    console.log("Отчёт записан:", outFile);
    const gaps = merged.filter((r) => r.panelGap).length;
    if (gaps) console.log(`Строк без данных в панелях: ${gaps} из ${merged.length}`);
  };

  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

main();
