import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..", "..");
export const DEFAULT_RANK_DASHBOARD_PATH = path.join(ROOT, "json", "seo", "rank-dashboard.json");

/** @typedef {'yandex' | 'google'} SearchEngine */
/** @typedef {'moscow' | 'spb' | 'rf'} DashboardRegionId */

export const DASHBOARD_ENGINES = /** @type {const} */ (["yandex", "google"]);
export const DASHBOARD_REGIONS = /** @type {const} */ (["moscow", "spb", "rf"]);

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
          if (!DASHBOARD_REGIONS.includes(/** @type {DashboardRegionId} */ (en.region))) {
            errors.push(`checks[${i}].entries[${j}].region: moscow|spb|rf`);
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
  const v = validateRankDashboard(data);
  if (!v.ok) throw new Error(`${abs}:\n${v.errors.join("\n")}`);
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
 * @param {RankDashboard} dash
 * @param {string} pageId
 */
export function getPage(dash, pageId) {
  const p = dash.pages.find((x) => x.id === pageId);
  if (!p) throw new Error(`Неизвестная страница: ${pageId}`);
  return p;
}

/**
 * @param {{ url: string; position: number }[]} results
 * @param {string} primaryDomain
 * @param {string} [preferredPath]
 */
export function findSerenityPosition(results, primaryDomain, preferredPath) {
  const domain = primaryDomain.replace(/^www\./i, "").toLowerCase();
  const normPath = preferredPath
    ? preferredPath.replace(/\/$/, "") || "/"
    : null;

  for (const r of results) {
    try {
      const u = new URL(r.url);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (host !== domain && !host.endsWith(`.${domain}`)) continue;
      if (normPath != null) {
        const p = u.pathname.replace(/\/$/, "") || "/";
        const want = normPath.replace(/\/$/, "") || "/";
        if (p !== want && !u.pathname.startsWith(want + "/")) continue;
      }
      return { position: r.position, matchedUrl: r.url };
    } catch {
      continue;
    }
  }
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./i, "").toLowerCase();
      if (host === domain || host.endsWith(`.${domain}`)) {
        return { position: r.position, matchedUrl: r.url };
      }
    } catch {
      continue;
    }
  }
  return { position: null, matchedUrl: null };
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
