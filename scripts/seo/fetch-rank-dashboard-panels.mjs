#!/usr/bin/env node
/**
 * Подтягивает GSC + Яндекс Вебмастер по запросам из rank-dashboard.json
 * (те же API, что MCP; secrets/mcp/env.sh через run-скрипт).
 */
import path from "node:path";
import {
  DEFAULT_RANK_DASHBOARD_PATH,
  loadRankDashboard,
  saveRankDashboard,
} from "./lib/rank-dashboard-utils.mjs";
import { buildPanelsBlock, fetchPanelMaps } from "./lib/fetch-panel-positions.mjs";

function usage() {
  console.error(`Использование:
  bash scripts/seo/run-rank-dashboard-panels.sh
  # или:
  node scripts/seo/fetch-rank-dashboard-panels.mjs

Переменные: REPORT_START_DATE, REPORT_END_DATE, GSC_SITE_URL, SEO_SKIP_GSC=1,
YANDEX_WEBMASTER_TOKEN, GSC_SERVICE_ACCOUNT_KEY_FILE, RANK_DASHBOARD_PATH
`);
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  const dashPath = process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH;
  const dash = loadRankDashboard(dashPath);
  const site = {
    primaryDomain: dash.site.primaryDomain,
    gscSiteUrl: dash.site.gscSiteUrl || "sc-domain:serenity.agency",
    yandexHostId: dash.site.yandexHostId,
  };

  console.log("Панели: загрузка GSC + Яндекс Вебмастер…");
  const maps = await fetchPanelMaps(site);
  dash.panels = buildPanelsBlock(dash, maps);
  saveRankDashboard(dash, dashPath);

  const n = Object.keys(dash.panels.byQuery).length;
  let withGsc = 0;
  let withYwm = 0;
  for (const row of Object.values(dash.panels.byQuery)) {
    if (/** @type {{ google?: object }} */ (row).google) withGsc++;
    if (/** @type {{ yandex?: object }} */ (row).yandex) withYwm++;
  }

  console.log("OK:", dashPath);
  const pop = dash.panels.popular;
  console.log(
    `  период ${maps.period.startDate} … ${maps.period.endDate}, запросов: ${n}, GSC: ${withGsc}, Я.ВМ: ${withYwm}`,
  );
  if (pop) {
    console.log(
      `  популярное: запросы топ-${pop.limit}, страницы топ-${pop.pagesLimit}; GSC ${pop.queries.google.length}/${pop.pages.google.length}; Яндекс ${pop.queries.yandex.length}/${pop.pages.yandex.length}`,
    );
  }
  if (maps.gscError) console.warn("  GSC:", maps.gscError);
  if (maps.yandexError) console.warn("  Яндекс:", maps.yandexError);
  console.log("  npm run seo:rank-dashboard:build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
