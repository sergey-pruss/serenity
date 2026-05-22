import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_RANK_DASHBOARD_PATH } from "./rank-dashboard-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {{ id: string; text: string }[]} DashboardQueries */

/**
 * @param {import('./rank-dashboard-utils.mjs').SearchEngine} engine
 * @param {string} region
 */
export const RANKING_REGION_COLUMNS = [
  { key: "serpGoogleRf", header: "Google", engine: "google", region: "rf" },
  { key: "serpYandexMsk", header: "Я Москва", engine: "yandex", region: "moscow" },
  { key: "serpYandexSpb", header: "Я Питер", engine: "yandex", region: "spb" },
];

/** Заголовки колонок I–K в листе миграции. */
export const MIGRATION_RANKING_HEADERS = RANKING_REGION_COLUMNS.map((c) => c.header);

/** Путь посадочной → id в rank-dashboard.json */
export const PATH_TO_RANK_PAGE_ID = {
  "/": "home",
  "/services/marketing": "marketing",
  "/kontekstnaya_reklama": "kontekstnaya",
  "/targeting": "targeting",
  "/kompleksnoye-prodvizheniye": "kompleksnoye-prodvizheniye",
  "/korporativnyj_sajt": "korporativnyj-sajt",
};

/**
 * @param {string} [filePath]
 */
export function loadRankDashboard(filePath = DEFAULT_RANK_DASHBOARD_PATH) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {{ outOfTop20?: boolean; position?: number | null } | undefined} entry
 */
export function formatSerpPosition(entry) {
  if (!entry) return "—";
  if (entry.outOfTop20) return ">50";
  if (entry.position == null || entry.position === "") return "—";
  return String(entry.position);
}

/**
 * @param {ReturnType<typeof loadRankDashboard>} dashboard
 */
function latestSerpCheck(dashboard) {
  const checks = [...(dashboard.checks || [])].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  return checks[0] || null;
}

/**
 * @param {ReturnType<typeof loadRankDashboard>} dashboard
 * @param {string} pageId
 */
function dashboardQueriesForPage(dashboard, pageId) {
  const page = (dashboard.pages || []).find((p) => p.id === pageId);
  return page?.queries || [];
}

/**
 * Позиция по одному запросу (последний SERP-снимок).
 * @param {ReturnType<typeof latestSerpCheck>} check
 * @param {string} pageId
 * @param {string} queryId
 * @param {'google' | 'yandex'} engine
 * @param {string} region
 */
/**
 * Одна ячейка — лучшая позиция среди всех запросов страницы (меньше число = выше в выдаче).
 * @param {ReturnType<typeof latestSerpCheck>} check
 * @param {string} pageId
 * @param {DashboardQueries} queries
 * @param {'google' | 'yandex'} engine
 * @param {string} region
 */
function serpCell(check, pageId, queries, engine, region) {
  if (!queries.length) return "—";

  /** @type {number | null} */
  let bestPos = null;
  let anyOut = false;
  let seen = false;

  for (const q of queries) {
    if (!check?.entries?.length) continue;
    const e = check.entries.find(
      (x) =>
        x.pageId === pageId &&
        x.queryId === q.id &&
        x.engine === engine &&
        x.region === region,
    );
    if (!e) continue;
    seen = true;
    if (e.outOfTop20 || e.position == null) {
      anyOut = true;
      continue;
    }
    const n = Number(e.position);
    if (!Number.isFinite(n)) continue;
    if (bestPos == null || n < bestPos) bestPos = n;
  }

  if (bestPos != null) return String(bestPos);
  if (seen && anyOut) return ">50";
  return "—";
}

/**
 * @param {string} path
 * @param {ReturnType<typeof loadRankDashboard>} [dashboard]
 */
export function rankingsForMigrationPath(path, dashboard = loadRankDashboard()) {
  const pageId = PATH_TO_RANK_PAGE_ID[path];
  if (!pageId) {
    return { serpGoogleRf: "", serpYandexMsk: "", serpYandexSpb: "" };
  }

  const queries = dashboardQueriesForPage(dashboard, pageId);
  const check = latestSerpCheck(dashboard);

  return {
    serpGoogleRf: serpCell(check, pageId, queries, "google", "rf"),
    serpYandexMsk: serpCell(check, pageId, queries, "yandex", "moscow"),
    serpYandexSpb: serpCell(check, pageId, queries, "yandex", "spb"),
  };
}
