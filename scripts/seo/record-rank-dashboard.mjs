#!/usr/bin/env node
/**
 * Ручная запись позиции в rank-dashboard.json
 */
import {
  DASHBOARD_ENGINES,
  DEFAULT_RANK_DASHBOARD_PATH,
  dashboardRegionsForEngine,
  getPage,
  isDashboardRegionForEngine,
  loadRankDashboard,
  saveRankDashboard,
  upsertCheckEntry,
} from "./lib/rank-dashboard-utils.mjs";

function usage() {
  console.error(`Использование:
  node scripts/seo/record-rank-dashboard.mjs \\
    --date YYYY-MM-DD \\
    --page PAGE_ID \\
    --query QUERY_ID \\
    --engine yandex|google \\
    --region moscow|spb|rf (google — только rf) \\
    --position N|--out-of-top20

Пример:
  npm run seo:rank-dashboard:record -- --date 2026-05-18 --page home --query brand \\
    --engine yandex --region moscow --position 8
`);
}

function die(m) {
  console.error(m);
  process.exit(1);
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const o = {
    date: "",
    page: "",
    query: "",
    engine: "",
    region: "",
    position: /** @type {number | null | undefined} */ (undefined),
    outOfTop20: false,
    matchedUrl: "",
    path: DEFAULT_RANK_DASHBOARD_PATH,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
    const next = () => {
      const v = argv[++i];
      if (v == null) die(`Ожидалось значение после ${a}`);
      return v;
    };
    if (a === "--date") o.date = next();
    else if (a === "--page") o.page = next();
    else if (a === "--query") o.query = next();
    else if (a === "--engine") o.engine = next();
    else if (a === "--region") o.region = next();
    else if (a === "--position") o.position = Number(next());
    else if (a === "--out-of-top20") o.outOfTop20 = true;
    else if (a === "--matched-url") o.matchedUrl = next();
    else if (a === "--path") o.path = next();
    else die(`Неизвестный аргумент: ${a}`);
  }
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.date || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) die("--date YYYY-MM-DD обязателен");
  if (!o.page) die("--page обязателен");
  if (!o.query) die("--query обязателен");
  if (!DASHBOARD_ENGINES.includes(/** @type {'yandex'|'google'} */ (o.engine))) {
    die("--engine: yandex|google");
  }
  const engine = /** @type {'yandex'|'google'} */ (o.engine);
  const region = /** @type {'moscow'|'spb'|'rf'} */ (o.region);
  if (!isDashboardRegionForEngine(engine, region)) {
    die(`--region: для ${engine} — ${dashboardRegionsForEngine(engine).join("|")}`);
  }

  const dash = loadRankDashboard(o.path);
  const page = getPage(dash, o.page);
  if (!page.queries.some((q) => q.id === o.query)) {
    die(`query ${o.query} не найден у страницы ${o.page}`);
  }

  let position = null;
  let outOfTop20 = o.outOfTop20;
  if (o.outOfTop20) {
    position = null;
    outOfTop20 = true;
  } else if (o.position != null) {
    if (!Number.isInteger(o.position) || o.position < 1 || o.position > 50) {
      die("--position: целое 1..50 или --out-of-top20");
    }
    position = o.position;
    outOfTop20 = false;
  } else {
    die("Укажите --position N или --out-of-top20");
  }

  upsertCheckEntry(dash, o.date, {
    pageId: o.page,
    queryId: o.query,
    engine,
    region,
    position,
    outOfTop20,
    matchedUrl: o.matchedUrl || null,
    source: "manual",
  });
  saveRankDashboard(dash, o.path);
  const label = outOfTop20 ? ">50" : String(position);
  console.log(`OK: ${o.date} ${o.page}/${o.query} ${o.engine}/${o.region} → ${label}`);
}

main();
