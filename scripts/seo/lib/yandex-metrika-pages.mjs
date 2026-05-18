/**
 * Топ страниц по поиску Яндекса: Метрика (переходы по URL) + показы/клики Вебмастера по фразе.
 */
import { normalizeQueryForJoin } from "./normalize-query.mjs";

const DEFAULT_COUNTER_ID = 30205029;

/**
 * @param {string} url
 * @param {string} primaryDomain
 */
export function normalizePageUrl(url, primaryDomain) {
  if (!url || typeof url !== "string") return "";
  const s = url.trim();
  if (!s.startsWith("http")) return "";
  if (/yandexwebcache\.net/i.test(s)) return "";
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const needle = primaryDomain.toLowerCase().replace(/^www\./, "");
    if (host !== needle && !host.endsWith("." + needle)) return "";
    u.hash = "";
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    u.pathname = path;
    return u.toString();
  } catch {
    return "";
  }
}

/**
 * @param {string} referer
 * @returns {string | null}
 */
export function extractPhraseFromReferer(referer) {
  if (!referer || typeof referer !== "string") return null;
  try {
    const u = new URL(referer);
    const text = u.searchParams.get("text");
    if (text && String(text).trim()) return String(text).trim();
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {string} token
 */
export async function metrikaListCounters(token) {
  const r = await fetch("https://api-metrika.yandex.net/management/v1/counters", {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Metrika counters HTTP ${r.status}: ${t.slice(0, 500)}`);
  }
  const data = await r.json();
  return Array.isArray(data.counters) ? data.counters : [];
}

/**
 * @param {string} token
 * @param {string} siteDomain e.g. serenity.agency
 */
export async function metrikaPickCounterId(token, siteDomain) {
  const envId = process.env.YANDEX_METRIKA_COUNTER_ID;
  if (envId && String(envId).trim()) return Number(envId);
  const counters = await metrikaListCounters(token);
  const needle = siteDomain.toLowerCase().replace(/^www\./, "");
  for (const c of counters) {
    const site = String(c.site || "").toLowerCase();
    if (site === needle || site.endsWith("." + needle) || site.includes(needle)) {
      return Number(c.id);
    }
  }
  return null;
}

/**
 * @param {string} token
 * @param {number} counterId
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} dimensions
 * @param {string} [filters]
 * @param {number} limit
 */
async function metrikaStatRows(
  token,
  counterId,
  startDate,
  endDate,
  dimensions,
  filters,
  limit = 10000,
) {
  const u = new URL("https://api-metrika.yandex.net/stat/v1/data");
  u.searchParams.set("ids", String(counterId));
  u.searchParams.set("metrics", "ym:s:visits");
  u.searchParams.set("dimensions", dimensions);
  if (filters) u.searchParams.set("filters", filters);
  u.searchParams.set("date1", startDate);
  u.searchParams.set("date2", endDate);
  u.searchParams.set("sort", "-ym:s:visits");
  u.searchParams.set("limit", String(Math.min(10000, limit)));
  const r = await fetch(u, { headers: { Authorization: `OAuth ${token}` } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Metrika stat HTTP ${r.status}: ${t.slice(0, 800)}`);
  }
  const data = await r.json();
  if (data.errors?.length) {
    throw new Error(`Metrika stat: ${JSON.stringify(data.errors).slice(0, 500)}`);
  }
  return data.data || [];
}

/**
 * Переходы из органического поиска Яндекса по URL (без фразы).
 * @param {string} token
 * @param {number} counterId
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} primaryDomain
 */
export async function metrikaFetchYandexEngineVisitsByUrl(
  token,
  counterId,
  startDate,
  endDate,
  primaryDomain,
) {
  const rows = await metrikaStatRows(
    token,
    counterId,
    startDate,
    endDate,
    "ym:s:startURL",
    "ym:s:lastSignTrafficSource=='organic' AND ym:s:searchEngineRoot=='Yandex'",
  );
  /** @type {Map<string, number>} */
  const byUrl = new Map();
  for (const row of rows) {
    const raw = row.dimensions?.[0]?.name;
    const url = normalizePageUrl(raw, primaryDomain);
    if (!url) continue;
    const visits = Number(row.metrics?.[0] ?? 0) || 0;
    if (visits <= 0) continue;
    byUrl.set(url, (byUrl.get(url) || 0) + visits);
  }
  return byUrl;
}

/**
 * @param {string} token
 * @param {number} counterId
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} primaryDomain
 */
export async function metrikaFetchYandexPhraseRows(
  token,
  counterId,
  startDate,
  endDate,
  primaryDomain,
) {
  const filters = "ym:s:lastSignTrafficSource=='organic' AND ym:s:searchEngineRoot=='Yandex'";
  const phraseDims = [
    "ym:s:startURL,ym:s:searchPhrase",
    "ym:s:startURL,ym:s:lastSignSearchPhrase",
    "ym:s:startURL,ym:s:referer",
  ];
  /** @type {Array<{ url: string, phrase: string | null, visits: number }>} */
  const out = [];
  for (const dimensions of phraseDims) {
    const rows = await metrikaStatRows(token, counterId, startDate, endDate, dimensions, filters);
    for (const row of rows) {
      const rawUrl = row.dimensions?.[0]?.name;
      const url = normalizePageUrl(rawUrl, primaryDomain);
      if (!url) continue;
      const dim2 = row.dimensions?.[1]?.name;
      let phrase = null;
      if (dimensions.includes("referer")) {
        phrase = extractPhraseFromReferer(dim2 != null ? String(dim2) : "");
      } else if (dim2 != null && String(dim2).trim() && String(dim2) !== "null") {
        phrase = String(dim2).trim();
      }
      const visits = Number(row.metrics?.[0] ?? 0) || 0;
      if (visits <= 0) continue;
      out.push({ url, phrase, visits });
    }
  }
  return out;
}

/**
 * @param {Map<string, number>} yandexVisitsByUrl
 * @param {Array<{ url: string, phrase: string | null, visits: number }>} phraseRows
 * @param {Array<{ text: string, shows: number, clicks: number, avgShowPosition: number | null }>} wmQueries
 */
export function aggregateYandexPagesFromMetrikaAndWm(yandexVisitsByUrl, phraseRows, wmQueries) {
  /** @type {Map<string, { shows: number, clicks: number, avgShowPosition: number | null }>} */
  const wmByPhrase = new Map();
  for (const q of wmQueries) {
    const k = normalizeQueryForJoin(q.text);
    if (!k) continue;
    wmByPhrase.set(k, {
      shows: q.shows ?? 0,
      clicks: q.clicks ?? 0,
      avgShowPosition: q.avgShowPosition ?? null,
    });
  }

  /** @type {Map<string, { url: string, yandexVisits: number, shows: number, wmClicks: number, posNum: number, posDen: number }>} */
  const byUrl = new Map();
  for (const [url, visits] of yandexVisitsByUrl) {
    byUrl.set(url, {
      url,
      yandexVisits: visits,
      shows: 0,
      wmClicks: 0,
      posNum: 0,
      posDen: 0,
    });
  }
  /** @type {Set<string>} */
  const wmAttributed = new Set();
  for (const row of phraseRows) {
    let agg = byUrl.get(row.url);
    if (!agg) {
      agg = {
        url: row.url,
        yandexVisits: row.visits,
        shows: 0,
        wmClicks: 0,
        posNum: 0,
        posDen: 0,
      };
      byUrl.set(row.url, agg);
    }
    if (row.phrase) {
      const pk = normalizeQueryForJoin(row.phrase);
      const dedupeKey = `${row.url}|${pk}`;
      if (!pk || wmAttributed.has(dedupeKey)) continue;
      const wm = wmByPhrase.get(pk);
      if (wm) {
        wmAttributed.add(dedupeKey);
        agg.shows += wm.shows;
        agg.wmClicks += wm.clicks;
        if (wm.avgShowPosition != null && wm.shows > 0) {
          agg.posNum += wm.avgShowPosition * wm.shows;
          agg.posDen += wm.shows;
        }
      }
    }
  }

  return [...byUrl.values()].map((a) => ({
    url: a.url,
    visits: a.yandexVisits,
    yandexVisits: a.yandexVisits,
    shows: a.shows,
    wmClicks: a.wmClicks,
    clicks: a.wmClicks > 0 ? a.wmClicks : a.yandexVisits,
    avgShowPosition: a.posDen > 0 ? a.posNum / a.posDen : null,
  }));
}

/**
 * @param {string} token
 * @param {string} primaryDomain
 * @param {string} startDate
 * @param {string} endDate
 * @param {Array<{ text: string, shows: number, clicks: number, avgShowPosition: number | null }>} wmQueries
 */
export async function fetchYandexPagesWithMetrics(token, primaryDomain, startDate, endDate, wmQueries) {
  const counterId = await metrikaPickCounterId(token, primaryDomain);
  if (!counterId) {
    throw new Error("не найден счётчик Метрики для " + primaryDomain);
  }
  const yandexVisitsByUrl = await metrikaFetchYandexEngineVisitsByUrl(
    token,
    counterId,
    startDate,
    endDate,
    primaryDomain,
  );
  const phraseRows = await metrikaFetchYandexPhraseRows(
    token,
    counterId,
    startDate,
    endDate,
    primaryDomain,
  );
  return {
    counterId,
    rows: aggregateYandexPagesFromMetrikaAndWm(yandexVisitsByUrl, phraseRows, wmQueries),
  };
}
