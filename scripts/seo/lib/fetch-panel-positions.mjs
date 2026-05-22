/**
 * Данные панелей GSC и Яндекс Вебмастер (те же API, что MCP / positions-report).
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeQueryForJoin } from "./normalize-query.mjs";
import { ROOT } from "./serp-shared.mjs";

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function defaultPanelEndDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return isoDate(d);
}

export function defaultPanelStartDate(end) {
  const e = new Date(`${end}T00:00:00.000Z`);
  e.setUTCDate(e.getUTCDate() - 27);
  return isoDate(e);
}

/** @param {string} token */
export async function yandexGetUser(token) {
  const r = await fetch("https://api.webmaster.yandex.net/v4/user", {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Yandex /v4/user HTTP ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

/** @param {string} token @param {string|number} userId */
export async function yandexListHosts(token, userId) {
  const r = await fetch(`https://api.webmaster.yandex.net/v4/user/${userId}/hosts`, {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Yandex hosts HTTP ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

/** @param {object} body @param {string} primaryDomain */
export function pickYandexHostId(body, primaryDomain) {
  const hosts = body.hosts;
  if (!Array.isArray(hosts)) return null;
  const needle = primaryDomain.toLowerCase().replace(/^www\./, "");
  for (const h of hosts) {
    const id = h && (h.host_id ?? h.unic_host_id ?? h.hostId);
    if (typeof id === "string" && id.toLowerCase().includes(needle)) return id;
  }
  return null;
}

/** @param {string} token @param {string|number} userId @param {string} hostId @param {string} dateFrom @param {string} dateTo */
export async function yandexFetchPopularQueries(token, userId, hostId, dateFrom, dateTo) {
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

import {
  createGscSearchConsole,
  formatGscErrorForUi,
  gscSiteUrlCandidates,
  gscFetchQueriesWithSiteFallback,
  gscFetchPagesWithSiteFallback,
} from "./gsc-client.mjs";
import { buildPopularBlock } from "./panel-popular.mjs";
import { fetchYandexPagesWithMetrics } from "./yandex-metrika-pages.mjs";

export { gscFetchAllQueries } from "./gsc-client.mjs";

/**
 * @param {{ primaryDomain: string, gscSiteUrl?: string, yandexHostId?: string }} site
 * @param {{ startDate?: string, endDate?: string, skipGsc?: boolean }} [opts]
 */
export async function fetchPanelMaps(site, opts = {}) {
  const endDate = opts.endDate || process.env.REPORT_END_DATE || defaultPanelEndDate();
  const startDate = opts.startDate || process.env.REPORT_START_DATE || defaultPanelStartDate(endDate);
  const skipGsc = opts.skipGsc || process.env.SEO_SKIP_GSC === "1";

  const gscSiteUrlPreferred = process.env.GSC_SITE_URL || site.gscSiteUrl || "sc-domain:serenity.agency";
  const gscSiteCandidates = gscSiteUrlCandidates(gscSiteUrlPreferred);

  /** @type {Map<string, { clicks: number, impressions: number, position: number }>} */
  const gscByKey = new Map();
  /** @type {Array<{ text: string, clicks: number, impressions: number, position: number }>} */
  const gscQueriesList = [];
  /** @type {Array<{ url: string, clicks: number, impressions: number, position: number }>} */
  const gscPagesList = [];
  let gscRowCount = 0;
  let gscPageRowCount = 0;
  let gscError = null;
  let gscSiteUrl = gscSiteUrlPreferred;
  /** @type {'oauth' | 'service_account' | null} */
  let gscAuthMethod = null;
  if (!skipGsc) {
    const client = await createGscSearchConsole();
    if (client.error || !client.searchconsole) {
      gscError = client.error || "не удалось создать клиент GSC";
    } else {
      gscAuthMethod = client.authMethod;
      try {
        const fetched = await gscFetchQueriesWithSiteFallback(
          client.searchconsole,
          gscSiteCandidates,
          startDate,
          endDate,
        );
        gscSiteUrl = fetched.siteUrl;
        if (fetched.error && !fetched.rows.length) {
          gscError = fetched.error;
        }
        gscRowCount = fetched.rows.length;
        for (const row of fetched.rows) {
          const q = row.keys && row.keys[0];
          if (!q) continue;
          const k = normalizeQueryForJoin(q);
          if (!k) continue;
          const clicks = row.clicks ?? 0;
          const impressions = row.impressions ?? 0;
          const position = row.position ?? 0;
          gscByKey.set(k, { clicks, impressions, position });
          gscQueriesList.push({ text: q, clicks, impressions, position });
        }
        if (!gscRowCount && !gscError) {
          gscError = "GSC вернул 0 строк за период (проверьте siteUrl и даты)";
        }
        const pagesFetched = await gscFetchPagesWithSiteFallback(
          client.searchconsole,
          [gscSiteUrl],
          startDate,
          endDate,
        );
        gscPageRowCount = pagesFetched.rows.length;
        for (const row of pagesFetched.rows) {
          const url = row.keys && row.keys[0];
          if (!url) continue;
          gscPagesList.push({
            url,
            clicks: row.clicks ?? 0,
            impressions: row.impressions ?? 0,
            position: row.position ?? 0,
          });
        }
      } catch (e) {
        gscError = formatGscErrorForUi(e instanceof Error ? e.message : String(e));
      }
    }
  }

  /** @type {Map<string, { totalShows: number, totalClicks: number, avgShowPosition: number | null }>} */
  const yandexByKey = new Map();
  /** @type {Array<{ text: string, shows: number, clicks: number, avgShowPosition: number | null }>} */
  const yandexQueriesList = [];
  /** @type {Array<{ url: string, visits: number, shows: number, clicks: number, avgShowPosition: number | null }>} */
  let yandexPagesList = [];
  let yandexPagesSource = null;
  let yandexPagesError = null;
  let yandexMetrikaCounterId = null;
  let yandexError = null;
  const yandexToken = process.env.YANDEX_WEBMASTER_TOKEN || "";
  const metrikaToken = process.env.YANDEX_METRIKA_TOKEN || "";

  if (!yandexToken) {
    yandexError = "YANDEX_WEBMASTER_TOKEN не задан";
  } else {
    try {
      const user = await yandexGetUser(yandexToken);
      const userId = user.user_id ?? user.userId;
      if (userId == null) throw new Error("Yandex /v4/user: нет user_id");
      let hostId = process.env.YANDEX_WEBMASTER_HOST_ID || site.yandexHostId || "";
      if (!hostId) {
        const hostsBody = await yandexListHosts(yandexToken, userId);
        hostId = pickYandexHostId(hostsBody, site.primaryDomain) || "";
      }
      if (!hostId) {
        yandexError = "не удалось определить host_id";
      } else {
        const popular = await yandexFetchPopularQueries(
          yandexToken,
          userId,
          hostId,
          startDate,
          endDate,
        );
        for (const item of popular) {
          const text = item.query_text ?? item.queryText;
          if (!text) continue;
          const k = normalizeQueryForJoin(text);
          if (!k) continue;
          const ind = item.indicators || item.Indicators || {};
          const totalShows = Number(ind.TOTAL_SHOWS ?? ind.total_shows ?? 0) || 0;
          const totalClicks = Number(ind.TOTAL_CLICKS ?? ind.total_clicks ?? 0) || 0;
          const avgShowPosition =
            ind.AVG_SHOW_POSITION != null
              ? Number(ind.AVG_SHOW_POSITION)
              : ind.avg_show_position != null
                ? Number(ind.avg_show_position)
                : null;
          yandexByKey.set(k, { totalShows, totalClicks, avgShowPosition });
          yandexQueriesList.push({
            text,
            shows: totalShows,
            clicks: totalClicks,
            avgShowPosition,
          });
        }
        if (metrikaToken) {
          try {
            const yp = await fetchYandexPagesWithMetrics(
              metrikaToken,
              site.primaryDomain,
              startDate,
              endDate,
              yandexQueriesList,
            );
            yandexPagesList = yp.rows;
            yandexPagesSource = "metrika+webmaster";
            yandexMetrikaCounterId = yp.counterId;
          } catch (e) {
            yandexPagesError = e instanceof Error ? e.message : String(e);
          }
        } else {
          yandexPagesError = "YANDEX_METRIKA_TOKEN не задан";
        }
      }
    } catch (e) {
      yandexError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    period: { startDate, endDate },
    gscSiteUrl,
    gscAuthMethod,
    gscByKey,
    gscQueriesList,
    gscPagesList,
    gscRowCount,
    gscPageRowCount,
    gscError,
    gscSkipped: skipGsc,
    yandexByKey,
    yandexQueriesList,
    yandexPagesList,
    yandexPagesSource,
    yandexPagesError,
    yandexMetrikaCounterId,
    yandexError,
    yandexUsed: Boolean(yandexToken),
    metrikaUsed: Boolean(metrikaToken),
  };
}

/**
 * @param {import('./rank-dashboard-utils.mjs').RankDashboard} dash
 * @param {Awaited<ReturnType<typeof fetchPanelMaps>>} maps
 */
export function buildPanelsBlock(dash, maps) {
  /** @type {Record<string, object>} */
  const byQuery = {};
  for (const page of dash.pages) {
    for (const q of page.queries) {
      const k = normalizeQueryForJoin(q.text);
      const key = `${page.id}|${q.id}`;
      const g = maps.gscByKey.get(k);
      const y = maps.yandexByKey.get(k);
      byQuery[key] = {
        pageId: page.id,
        queryId: q.id,
        queryText: q.text,
        normalizedKey: k,
        google: g
          ? {
              avgPosition: Math.round(g.position * 100) / 100,
              clicks: g.clicks,
              impressions: g.impressions,
            }
          : null,
        yandex:
          y && (y.totalShows > 0 || y.totalClicks > 0 || y.avgShowPosition != null)
            ? {
                avgShowPosition:
                  y.avgShowPosition != null ? Math.round(y.avgShowPosition * 100) / 100 : null,
                shows: y.totalShows,
                clicks: y.totalClicks,
              }
            : null,
      };
    }
  }
  return {
    fetchedAt: new Date().toISOString(),
    period: maps.period,
    sources: {
      gscSiteUrl: maps.gscSiteUrl,
      gscAuthMethod: maps.gscAuthMethod ?? null,
      gscSkipped: maps.gscSkipped,
      gscRowCount: maps.gscRowCount,
      gscPageRowCount: maps.gscPageRowCount ?? 0,
      gscError: maps.gscError,
      yandexUsed: maps.yandexUsed,
      yandexError: maps.yandexError,
      yandexPopularQueryCount: maps.yandexQueriesList?.length ?? 0,
      yandexPagesSource: maps.yandexPagesSource ?? null,
      yandexPagesError: maps.yandexPagesError ?? null,
      yandexMetrikaCounterId: maps.yandexMetrikaCounterId ?? null,
      metrikaUsed: maps.metrikaUsed ?? false,
    },
    note:
      "Средняя позиция по данным панелей (GSC / Яндекс Вебмастер), без разбивки Москва/СПб/РФ. Не совпадает 1:1 с органической выдачей SERP.",
    byQuery,
    popular: buildPopularBlock(maps),
  };
}
