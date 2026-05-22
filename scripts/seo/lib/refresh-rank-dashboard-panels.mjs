/**
 * Обновление panels (byQuery + popular queries/pages) в rank-dashboard.json.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_RANK_DASHBOARD_PATH,
  loadRankDashboard,
  saveRankDashboard,
} from "./rank-dashboard-utils.mjs";
import { buildPanelsBlock, fetchPanelMaps } from "./fetch-panel-positions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEO_ROOT = path.join(__dirname, "..", "..", "..");

/**
 * @param {string} [dashPath]
 * @returns {Promise<{ ok: boolean, dashPath: string, period?: { startDate: string, endDate: string }, popular?: { queries: { google: unknown[]; yandex: unknown[] } } }>}
 */
export async function refreshRankDashboardPanels(dashPath = DEFAULT_RANK_DASHBOARD_PATH) {
  const resolved = path.resolve(dashPath);
  const dash = loadRankDashboard(resolved);
  const site = {
    primaryDomain: dash.site.primaryDomain,
    gscSiteUrl: dash.site.gscSiteUrl || "sc-domain:serenity.agency",
    yandexHostId: dash.site.yandexHostId,
  };

  console.log("\nПанели GSC / Я.ВМ (+ популярные запросы и страницы)…");
  const maps = await fetchPanelMaps(site);
  dash.panels = buildPanelsBlock(dash, maps);
  saveRankDashboard(dash, resolved);

  const pop = dash.panels.popular;
  console.log(
    `  период ${maps.period.startDate} … ${maps.period.endDate}` +
      (pop
        ? `; топ-${pop.limit} запросов, топ-${pop.pagesLimit} страниц` +
          ` (GSC ${pop.queries.google.length}/${pop.pages.google.length},` +
          ` Яндекс ${pop.queries.yandex.length}/${pop.pages.yandex.length})`
        : ""),
  );
  if (maps.gscError) console.warn("  GSC:", maps.gscError);
  if (maps.yandexError) console.warn("  Яндекс:", maps.yandexError);
  if (maps.yandexPagesError) console.warn("  Страницы Яндекс:", maps.yandexPagesError);

  return {
    ok: !maps.gscError || maps.yandexUsed,
    dashPath: resolved,
    period: maps.period,
    popular: pop,
  };
}

/**
 * panels через bash (подхватывает secrets/mcp/env.sh).
 * @param {{ skipBuild?: boolean }} [opts]
 */
export function runPanelsViaShell(opts = {}) {
  const panels = spawnSync("bash", ["scripts/seo/run-rank-dashboard-panels.sh"], {
    cwd: SEO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (panels.status !== 0) {
    console.warn("Панели: run-rank-dashboard-panels.sh завершился с кодом", panels.status);
    return false;
  }
  if (!opts.skipBuild) {
    const build = spawnSync("npm", ["run", "seo:rank-dashboard:build"], {
      cwd: SEO_ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (build.status !== 0) return false;
  }
  return true;
}
