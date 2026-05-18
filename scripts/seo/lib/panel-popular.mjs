/**
 * Топ запросов и страниц из GSC / Яндекс Вебмастер (как MCP get_search_analytics / get-popular-queries).
 */

/** @param {number} [envLimit] */
export function popularLimit(envLimit) {
  const n = Number(process.env.RANK_DASHBOARD_POPULAR_LIMIT || envLimit || 50);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(200, Math.floor(n));
}

/** Топ страниц — по умолчанию 10. */
export function popularPagesLimit() {
  const n = Number(process.env.RANK_DASHBOARD_POPULAR_PAGES_LIMIT || 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(50, Math.floor(n));
}

/**
 * @param {Array<{ text: string, clicks: number, impressions: number, position: number }>} rows
 * @param {number} limit
 */
export function sortGscQueries(rows, limit) {
  return [...rows]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit)
    .map((r) => ({
      text: r.text,
      clicks: r.clicks,
      impressions: r.impressions,
      position: Math.round(r.position * 100) / 100,
      ctr:
        r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 10000) / 10000 : null,
    }));
}

/**
 * @param {Array<{ text: string, shows: number, clicks: number, avgShowPosition: number | null }>} rows
 * @param {number} limit
 */
export function sortYandexQueries(rows, limit) {
  return [...rows]
    .sort((a, b) => b.shows - a.shows || b.clicks - a.clicks)
    .slice(0, limit)
    .map((r) => ({
      text: r.text,
      shows: r.shows,
      clicks: r.clicks,
      avgShowPosition:
        r.avgShowPosition != null ? Math.round(r.avgShowPosition * 100) / 100 : null,
    }));
}

/**
 * @param {Array<{ url: string, clicks: number, impressions: number, position: number }>} rows
 * @param {number} limit
 */
export function sortGscPages(rows, limit) {
  return [...rows]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit)
    .map((r) => ({
      url: r.url,
      clicks: r.clicks,
      impressions: r.impressions,
      position: Math.round(r.position * 100) / 100,
    }));
}

/**
 * @param {Array<{ url: string, visits: number, shows: number, clicks: number, avgShowPosition: number | null }>} rows
 * @param {number} limit
 */
export function sortYandexPages(rows, limit) {
  return [...rows]
    .sort((a, b) => b.visits - a.visits || b.shows - a.shows || b.clicks - a.clicks)
    .slice(0, limit)
    .map((r) => ({
      url: r.url,
      shows: r.shows,
      clicks: r.clicks,
      visits: r.visits,
      avgShowPosition:
        r.avgShowPosition != null ? Math.round(r.avgShowPosition * 100) / 100 : null,
    }));
}

/**
 * @param {Awaited<ReturnType<import('./fetch-panel-positions.mjs').fetchPanelMaps>>} maps
 */
export function buildPopularBlock(maps) {
  const limit = popularLimit();
  const pagesLimit = popularPagesLimit();
  return {
    limit,
    pagesLimit,
    queries: {
      google: sortGscQueries(maps.gscQueriesList || [], limit),
      yandex: sortYandexQueries(maps.yandexQueriesList || [], limit),
    },
    pages: {
      google: sortGscPages(maps.gscPagesList || [], pagesLimit),
      yandex: sortYandexPages(maps.yandexPagesList || [], pagesLimit),
    },
    notes: {
      pagesYandex:
        maps.yandexPagesSource === "metrika+webmaster"
          ? "Яндекс: переходы из поиска Яндекса (Метрика); показы и клики Вебмастера — если фраза привязана к URL. Без фразы в колонке «Показы» — «—»."
          : maps.yandexPagesError ||
            "Нужны YANDEX_METRIKA_TOKEN и счётчик serenity.agency (или YANDEX_METRIKA_COUNTER_ID).",
    },
  };
}
