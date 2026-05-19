#!/usr/bin/env node
/**
 * Зафиксировать съёмку: Яндекс (все успешные) + Google только с 1-й страницы (поз. 1–10).
 * Остальные Google за дату удаляются — доберутся после SERP_GOOGLE_PAGINATE.
 */
import {
  DEFAULT_RANK_DASHBOARD_PATH,
  entryHasSerpCapture,
  loadRankDashboard,
  saveRankDashboard,
} from "./lib/rank-dashboard-utils.mjs";

const date = process.env.RANK_CHECK_DATE || new Date().toISOString().slice(0, 10);
const dashPath = process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH;
const dash = loadRankDashboard(dashPath);
const check = dash.checks.find((c) => c.date === date);
if (!check) {
  console.error(`Нет снимка за ${date}`);
  process.exit(1);
}

let yandexLocked = 0;
let googleP1 = 0;
let googleDropped = 0;

/** @type {import('./lib/rank-dashboard-utils.mjs').RankEntry[]} */
const next = [];

for (const e of check.entries) {
  if (e.engine === "yandex") {
    if (entryHasSerpCapture(e)) {
      next.push({ ...e, source: "serp-interactive-verified" });
      yandexLocked++;
    } else {
      next.push(e);
    }
    continue;
  }
  if (e.engine === "google") {
    if (
      !e.outOfTop20 &&
      e.position != null &&
      e.position >= 1 &&
      e.position <= 10 &&
      e.matchedUrl
    ) {
      next.push({ ...e, source: "serp-interactive-google-p1" });
      googleP1++;
      continue;
    }
    googleDropped++;
    continue;
  }
  next.push(e);
}

check.entries = next;
saveRankDashboard(dash, dashPath);

console.log(`Снимок ${date}:`);
console.log(`  Яндекс зафиксирован (verified): ${yandexLocked}`);
console.log(`  Google стр. 1 (p1): ${googleP1}`);
console.log(`  Google снято для пересъёмки (стр. 2): ${googleDropped}`);
console.log("\nДальше:");
console.log("  npm run seo:rank-dashboard:serp:refetch-google");
console.log("  npm run seo:rank-dashboard:build");
