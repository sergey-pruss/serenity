import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..", "..");
export const DEFAULT_RANK_DASHBOARD_PATH = path.join(ROOT, "json", "seo", "rank-dashboard.json");

/** @typedef {'yandex' | 'google'} SearchEngine */
/** @typedef {'moscow' | 'spb' | 'rf'} DashboardRegionId */

export const DASHBOARD_ENGINES = /** @type {const} */ (["yandex", "google"]);
/** Яндекс: Москва и СПб; Google: только РФ (город в URL Google ненадёжен). */
export const DASHBOARD_YANDEX_REGIONS = /** @type {const} */ (["moscow", "spb"]);
export const DASHBOARD_GOOGLE_REGIONS = /** @type {const} */ (["rf"]);
export const DASHBOARD_SERP_REGIONS = /** @type {const} */ ([
  ...DASHBOARD_YANDEX_REGIONS,
  ...DASHBOARD_GOOGLE_REGIONS,
]);
/** Страницы в конце таблицы (хуже средний SERP / ниже приоритет). */
export const RANK_DASHBOARD_TAIL_PAGE_IDS = /** @type {const} */ (["kontekstnaya", "targeting"]);
/** @deprecated используйте DASHBOARD_YANDEX_REGIONS / dashboardRegionsForEngine */
export const DASHBOARD_REGIONS = DASHBOARD_YANDEX_REGIONS;

/** @param {SearchEngine} engine */
export function dashboardRegionsForEngine(engine) {
  return engine === "google" ? DASHBOARD_GOOGLE_REGIONS : DASHBOARD_YANDEX_REGIONS;
}

/** @param {SearchEngine} engine @param {DashboardRegionId} region */
export function isDashboardRegionForEngine(engine, region) {
  return dashboardRegionsForEngine(engine).includes(region);
}

/** @type {Record<DashboardRegionId, number>} */
const DASHBOARD_REGION_SORT = { moscow: 0, spb: 1, rf: 2 };

/**
 * Съёмка: Москва → СПб; внутри региона — Яндекс, потом Google.
 * @param {{ page: { id: string }; q: { id: string }; engine: SearchEngine; region: DashboardRegionId }[]} items
 */
export function sortPendingSerpCells(items) {
  return [...items].sort((a, b) => {
    const ra = DASHBOARD_REGION_SORT[a.region] ?? 9;
    const rb = DASHBOARD_REGION_SORT[b.region] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.engine !== b.engine) return a.engine === "yandex" ? -1 : 1;
    const pc = a.page.id.localeCompare(b.page.id);
    if (pc !== 0) return pc;
    return a.q.id.localeCompare(b.q.id);
  });
}

/**
 * @param {string} pageId
 * @param {string} queryId
 * @param {SearchEngine} engine
 * @param {DashboardRegionId} region
 */
export function entryKey(pageId, queryId, engine, region) {
  return `${pageId}|${queryId}|${engine}|${region}`;
}

/**
 * @param {unknown} data
 * @returns {{ ok: true, data: import('./rank-dashboard-utils.mjs').RankDashboard } | { ok: false, errors: string[] }}
 */
export function validateRankDashboard(data) {
  const errors = [];
  if (data == null || typeof data !== "object") {
    return { ok: false, errors: ["Корень JSON должен быть объектом"] };
  }
  const o = /** @type {Record<string, unknown>} */ (data);
  if (!Number.isInteger(o.version) || o.version < 1) errors.push("version должен быть целым >= 1");
  if (o.site == null || typeof o.site !== "object") errors.push("site обязателен");
  else {
    const site = /** @type {Record<string, unknown>} */ (o.site);
    if (typeof site.primaryDomain !== "string" || !site.primaryDomain.trim()) {
      errors.push("site.primaryDomain обязателен");
    }
  }
  if (!Array.isArray(o.pages) || o.pages.length === 0) errors.push("pages: непустой массив");
  else {
    const pageIds = new Set();
    o.pages.forEach((p, i) => {
      if (p == null || typeof p !== "object") {
        errors.push(`pages[${i}]: ожидается объект`);
        return;
      }
      const row = /** @type {Record<string, unknown>} */ (p);
      for (const k of ["id", "title", "path", "url", "priority", "queries"]) {
        if (!(k in row)) errors.push(`pages[${i}].${k} обязателен`);
      }
      if (typeof row.id === "string") {
        if (pageIds.has(row.id)) errors.push(`дубликат pages[].id: ${row.id}`);
        pageIds.add(row.id);
      }
      if (!Array.isArray(row.queries) || row.queries.length < 1 || row.queries.length > 2) {
        errors.push(`pages[${i}].queries: от 1 до 2 запросов`);
      } else {
        const qids = new Set();
        row.queries.forEach((q, j) => {
          if (q == null || typeof q !== "object") {
            errors.push(`pages[${i}].queries[${j}]: объект`);
            return;
          }
          const qr = /** @type {Record<string, unknown>} */ (q);
          if (typeof qr.id !== "string" || !qr.id.trim()) errors.push(`pages[${i}].queries[${j}].id обязателен`);
          else if (qids.has(qr.id)) errors.push(`pages[${i}]: дубликат query id ${qr.id}`);
          else qids.add(qr.id);
          if (typeof qr.text !== "string" || !qr.text.trim()) {
            errors.push(`pages[${i}].queries[${j}].text обязателен`);
          }
        });
      }
    });
  }
  if (!Array.isArray(o.checks)) errors.push("checks должен быть массивом");
  else {
    const checkDates = new Set();
    o.checks.forEach((c, i) => {
      if (c == null || typeof c !== "object") {
        errors.push(`checks[${i}]: объект`);
        return;
      }
      const ch = /** @type {Record<string, unknown>} */ (c);
      if (typeof ch.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ch.date)) {
        errors.push(`checks[${i}].date: YYYY-MM-DD`);
      } else if (checkDates.has(ch.date)) errors.push(`дубликат checks[].date: ${ch.date}`);
      else checkDates.add(ch.date);
      if (!Array.isArray(ch.entries)) errors.push(`checks[${i}].entries: массив`);
      else {
        const keys = new Set();
        ch.entries.forEach((e, j) => {
          if (e == null || typeof e !== "object") {
            errors.push(`checks[${i}].entries[${j}]: объект`);
            return;
          }
          const en = /** @type {Record<string, unknown>} */ (e);
          for (const k of ["pageId", "queryId", "engine", "region", "outOfTop20"]) {
            if (!(k in en)) errors.push(`checks[${i}].entries[${j}].${k} обязателен`);
          }
          if (en.engine !== "yandex" && en.engine !== "google") {
            errors.push(`checks[${i}].entries[${j}].engine: yandex|google`);
          }
          const region = /** @type {DashboardRegionId} */ (en.region);
          const engine = /** @type {SearchEngine} */ (en.engine);
          if (!isDashboardRegionForEngine(engine, region)) {
            errors.push(
              `checks[${i}].entries[${j}].region: для ${engine} — ${dashboardRegionsForEngine(engine).join("|")}`,
            );
          }
          if (en.outOfTop20 === true) {
            if (en.position != null) {
              errors.push(`checks[${i}].entries[${j}]: outOfTop20=true требует position=null`);
            }
          } else if (!Number.isInteger(en.position) || en.position < 1 || en.position > 20) {
            errors.push(`checks[${i}].entries[${j}].position: 1..20 или outOfTop20=true`);
          }
          const k = entryKey(
            String(en.pageId),
            String(en.queryId),
            /** @type {SearchEngine} */ (en.engine),
            /** @type {DashboardRegionId} */ (en.region),
          );
          if (keys.has(k)) errors.push(`checks[${i}]: дубликат ${k}`);
          keys.add(k);
        });
      }
    });
  }
  if (o.panels !== undefined && o.panels !== null) {
    if (typeof o.panels !== "object") errors.push("panels должен быть объектом");
    else {
      const p = /** @type {Record<string, unknown>} */ (o.panels);
      if (p.byQuery != null && typeof p.byQuery !== "object") errors.push("panels.byQuery должен быть объектом");
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, data: /** @type {RankDashboard} */ (o) };
}

/**
 * @param {string} [filePath]
 */
export function loadRankDashboard(filePath = DEFAULT_RANK_DASHBOARD_PATH) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON parse ${abs}: ${/** @type {Error} */ (e).message}`);
  }
  const migrated = migrateGoogleEntriesToRf(data);
  const v = validateRankDashboard(data);
  if (!v.ok) throw new Error(`${abs}:\n${v.errors.join("\n")}`);
  if (migrated > 0) {
    saveRankDashboard(v.data, abs);
    console.log(`rank-dashboard: Google Москва/СПб → РФ (${migrated} записей)`);
  }
  return v.data;
}

/**
 * @param {RankDashboard} dash
 * @param {string} filePath
 */
export function saveRankDashboard(dash, filePath = DEFAULT_RANK_DASHBOARD_PATH) {
  const v = validateRankDashboard(dash);
  if (!v.ok) throw new Error(v.errors.join("\n"));
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(dash, null, 2)}\n`, "utf8");
}

/**
 * Google: Москва/СПб → одна колонка РФ; убрать yandex+rf.
 * @param {RankDashboard} dash
 * @returns {number} число удалённых/слитых записей
 */
export function migrateGoogleEntriesToRf(dash) {
  let n = 0;
  for (const check of dash.checks) {
    /** @type {RankEntry[]} */
    const kept = [];
    /** @type {Map<string, RankEntry>} */
    const googleRf = new Map();
    for (const e of check.entries) {
      if (e.engine === "yandex" && e.region === "rf") {
        n++;
        continue;
      }
      if (e.engine !== "google") {
        kept.push(e);
        continue;
      }
      const rfKey = entryKey(e.pageId, e.queryId, "google", "rf");
      if (e.region === "rf") {
        googleRf.set(rfKey, e);
        continue;
      }
      if (e.region === "moscow" || e.region === "spb") {
        const prev = googleRf.get(rfKey);
        if (!prev) googleRf.set(rfKey, { ...e, region: "rf" });
        else if (e.position != null && prev.position == null) {
          googleRf.set(rfKey, { ...e, region: "rf" });
        }
        n++;
        continue;
      }
      kept.push(e);
    }
    for (const e of googleRf.values()) kept.push(e);
    if (kept.length !== check.entries.length) check.entries = kept;
  }
  return n;
}

/**
 * @param {RankDashboard} dash
 * @param {string} pageId
 */
export function getPage(dash, pageId) {
  const p = dash.pages.find((x) => x.id === pageId);
  if (!p) throw new Error(`Неизвестная страница: ${pageId}`);
  return p;
}

/**
 * Ключ сортировки: 1 = лучше, 100 = >20, 1000 = нет съёмки.
 * @param {RankEntry | null | undefined} entry
 */
export function serpPositionSortKey(entry) {
  if (!entry || !entryHasSerpCapture(entry)) return 1000;
  if (entry.outOfTop20 || entry.position == null) return 100;
  return entry.position;
}

/**
 * @param {RankEntry[]} entries
 * @param {string} pageId
 * @param {string} queryId
 * @param {SearchEngine} engine
 * @param {DashboardRegionId} region
 */
function findEntryInList(entries, pageId, queryId, engine, region) {
  let e = entries.find(
    (x) =>
      x.pageId === pageId &&
      x.queryId === queryId &&
      x.engine === engine &&
      x.region === region,
  );
  if (!e && engine === "google") {
    e = entries.find(
      (x) =>
        x.pageId === pageId &&
        x.queryId === queryId &&
        x.engine === "google" &&
        (x.region === "moscow" || x.region === "spb"),
    );
  }
  return e;
}

/**
 * Страницы и запросы: лучшие позиции выше; kontekstnaya и targeting — в конце.
 * @param {RankDashboard} dash
 * @param {string} [checkDate]
 * @returns {boolean} изменился порядок pages/queries
 */
export function sortRankDashboardByResults(dash, checkDate) {
  const dates = [...dash.checks].map((c) => c.date).sort();
  const date = checkDate || dates[dates.length - 1];
  const check = dash.checks.find((c) => c.date === date);
  const entries = check?.entries || [];

  /** @type {{ engine: SearchEngine; region: DashboardRegionId }[]} */
  const slices = [];
  for (const engine of DASHBOARD_ENGINES) {
    for (const region of dashboardRegionsForEngine(engine)) {
      slices.push({ engine, region });
    }
  }

  const queryScore = (pageId, queryId) => {
    let best = 1000;
    for (const sl of slices) {
      const e = findEntryInList(entries, pageId, queryId, sl.engine, sl.region);
      best = Math.min(best, serpPositionSortKey(e));
    }
    return best;
  };

  const pageScore = (page) => {
    let best = 1000;
    for (const q of page.queries) {
      best = Math.min(best, queryScore(page.id, q.id));
    }
    return best;
  };

  const orderKey = () =>
    dash.pages
      .map((p) => `${p.id}:${p.queries.map((q) => q.id).join(",")}`)
      .join("|");

  const before = orderKey();

  for (const page of dash.pages) {
    page.queries.sort((a, b) => {
      const d = queryScore(page.id, a.id) - queryScore(page.id, b.id);
      if (d !== 0) return d;
      return a.text.localeCompare(b.text, "ru");
    });
  }

  dash.pages.sort((a, b) => {
    const aTail = RANK_DASHBOARD_TAIL_PAGE_IDS.includes(
      /** @type {(typeof RANK_DASHBOARD_TAIL_PAGE_IDS)[number]} */ (a.id),
    );
    const bTail = RANK_DASHBOARD_TAIL_PAGE_IDS.includes(
      /** @type {(typeof RANK_DASHBOARD_TAIL_PAGE_IDS)[number]} */ (b.id),
    );
    if (aTail !== bTail) return aTail ? 1 : -1;
    if (aTail && bTail) {
      return (
        RANK_DASHBOARD_TAIL_PAGE_IDS.indexOf(
          /** @type {(typeof RANK_DASHBOARD_TAIL_PAGE_IDS)[number]} */ (a.id),
        ) -
        RANK_DASHBOARD_TAIL_PAGE_IDS.indexOf(
          /** @type {(typeof RANK_DASHBOARD_TAIL_PAGE_IDS)[number]} */ (b.id),
        )
      );
    }
    const d = pageScore(a) - pageScore(b);
    if (d !== 0) return d;
    return a.title.localeCompare(b.title, "ru");
  });

  return orderKey() !== before;
}

/**
 * Успешная SERP-съёмка ячейки (есть позиция 1–20 или подтверждённый «>20»).
 * @param {RankEntry | null | undefined} entry
 */
export function entryHasSerpCapture(entry) {
  if (!entry) return false;
  if (entry.source === "manual") return true;
  const src = String(entry.source || "");
  if (!src || /blocked|error:/i.test(src)) return false;
  return (
    src === "serp-interactive" ||
    src === "serp-interactive-verified" ||
    src === "serp-interactive-google-p1" ||
    /^serp-interactive\b/.test(src)
  );
}

/**
 * Ячейки, которые стоит переснять: Google (регион/URL менялись), Яндекс 11–20 (риск парсера).
 * @param {RankEntry} entry
 */
/**
 * Яндекс: в отчёте >20, но в Вебмастере средняя позиция ≤20 — переснять.
 * @param {RankDashboard} dash
 * @param {RankEntry} entry
 */
export function entryYandexRecheckSuggested(dash, entry) {
  if (!entry || entry.engine !== "yandex") return false;
  if (!entryHasSerpCapture(entry)) return true;
  if (/error:/i.test(entry.source || "") || entry.source === "serp-interactive-blocked") {
    return true;
  }
  if (!entry.outOfTop20 && entry.position != null) {
    return false;
  }
  if (entry.outOfTop20) {
    const row = dash.panels?.byQuery?.[`${entry.pageId}|${entry.queryId}`];
    const avg = row?.yandex?.avgShowPosition;
    if (avg != null && avg <= 20) return true;
    if (entry.source === "serp-interactive-verified") return true;
  }
  return false;
}

export function entryIsDoubtfulForRefetch(entry) {
  if (!entry || entry.source === "manual") return false;
  if (entry.source === "serp-interactive-verified") return false;
  if (entry.source === "serp-interactive-google-p1") return false;
  if (!entryHasSerpCapture(entry)) return false;
  if (entry.engine === "google") return true;
  if (entry.engine === "yandex") {
    if (process.env.SERP_REFETCH_DOUBTFUL_YANDEX_OUT === "1" && entry.outOfTop20) {
      return true;
    }
    return (
      !entry.outOfTop20 &&
      typeof entry.position === "number" &&
      entry.position >= 11
    );
  }
  return false;
}

/**
 * @param {{ url: string; position: number }[]} results
 * @param {string} primaryDomain
 * @param {string} [preferredPath]
 */
export function findSerenityPosition(results, primaryDomain, preferredPath) {
  const domain = primaryDomain.replace(/^www\./i, "").toLowerCase();
  const want = preferredPath ? preferredPath.replace(/\/$/, "") || "/" : null;

  /** @type {{ position: number; url: string } | null} */
  let bestAny = null;
  /** @type {{ position: number; url: string } | null} */
  let bestPath = null;

  for (const r of results) {
    try {
      const u = new URL(r.url);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (host !== domain && !host.endsWith(`.${domain}`)) continue;
      const hit = { position: r.position, url: r.url };
      if (!bestAny || hit.position < bestAny.position) bestAny = hit;
      if (want != null) {
        const p = u.pathname.replace(/\/$/, "") || "/";
        if (p === want || u.pathname.startsWith(`${want}/`)) {
          if (!bestPath || hit.position < bestPath.position) bestPath = hit;
        }
      }
    } catch {
      continue;
    }
  }

  const pick = bestPath || bestAny;
  if (!pick) return { position: null, matchedUrl: null };
  return { position: pick.position, matchedUrl: pick.url };
}

/**
 * @param {RankDashboard} dash
 * @param {string} date
 * @param {import('./rank-dashboard-utils.mjs').RankEntry} entry
 */
export function upsertCheckEntry(dash, date, entry) {
  let check = dash.checks.find((c) => c.date === date);
  if (!check) {
    check = { date, label: date, entries: [] };
    dash.checks.push(check);
    dash.checks.sort((a, b) => a.date.localeCompare(b.date));
  }
  const k = entryKey(entry.pageId, entry.queryId, entry.engine, entry.region);
  const idx = check.entries.findIndex(
    (e) => entryKey(e.pageId, e.queryId, e.engine, e.region) === k,
  );
  if (idx >= 0) check.entries[idx] = entry;
  else check.entries.push(entry);
}

/**
 * @typedef {object} RankQuery
 * @property {string} id
 * @property {string} text
 */

/**
 * @typedef {object} RankPage
 * @property {string} id
 * @property {string} title
 * @property {string} path
 * @property {string} url
 * @property {number} priority
 * @property {RankQuery[]} queries
 */

/**
 * @typedef {object} RankEntry
 * @property {string} pageId
 * @property {string} queryId
 * @property {SearchEngine} engine
 * @property {DashboardRegionId} region
 * @property {number | null} position
 * @property {boolean} outOfTop20
 * @property {string | null} [matchedUrl]
 * @property {string} [source]
 */

/**
 * @typedef {object} RankCheck
 * @property {string} date
 * @property {string} [label]
 * @property {RankEntry[]} entries
 */

/**
 * @typedef {object} RankDashboard
 * @property {number} version
 * @property {{ primaryDomain: string }} site
 * @property {RankPage[]} pages
 * @property {RankCheck[]} checks
 */
