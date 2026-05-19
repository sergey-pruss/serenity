#!/usr/bin/env node
/** Список ячеек Яндекс для пересъёмки (расхождение с Вебмастером / >20 в отчёте). */
import {
  DEFAULT_RANK_DASHBOARD_PATH,
  entryYandexRecheckSuggested,
  getPage,
  loadRankDashboard,
} from "./lib/rank-dashboard-utils.mjs";
import { REGIONS } from "./lib/serp-shared.mjs";

const date = process.env.RANK_CHECK_DATE || new Date().toISOString().slice(0, 10);
const dash = loadRankDashboard(process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH);
const check = dash.checks.find((c) => c.date === date);
if (!check) {
  console.error(`Нет снимка за ${date}`);
  process.exit(1);
}

const list = check.entries.filter((e) => entryYandexRecheckSuggested(dash, e));
if (!list.length) {
  console.log(`За ${date} пересъёмка Яндекс не требуется.`);
  process.exit(0);
}

console.log(`Яндекс — перепроверить за ${date} (${list.length} ячеек):\n`);
for (const e of list) {
  const page = getPage(dash, e.pageId);
  const q = page.queries.find((x) => x.id === e.queryId);
  const row = dash.panels?.byQuery?.[`${e.pageId}|${e.queryId}`];
  const avg = row?.yandex?.avgShowPosition;
  const pos = e.outOfTop20 || e.position == null ? ">20" : String(e.position);
  const vm = avg != null ? ` · ВМ ср. ${avg}` : "";
  console.log(
    `  · ${page.title} | ${q?.text || e.queryId} | ${REGIONS[e.region]?.label || e.region} → отчёт ${pos}${vm}`,
  );
}
console.log("\nПереснять: npm run seo:rank-dashboard:serp:refetch-yandex-recheck");
