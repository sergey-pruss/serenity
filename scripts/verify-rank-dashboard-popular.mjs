#!/usr/bin/env node
/**
 * Проверка блока «Популярные запросы» (топ-50 GSC / Я.ВМ) в rank-dashboard.json
 */
import {
  loadRankDashboard,
  DEFAULT_RANK_DASHBOARD_PATH,
} from "./seo/lib/rank-dashboard-utils.mjs";
import { popularLimit } from "./seo/lib/panel-popular.mjs";

const dash = loadRankDashboard(process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH);
const expected = popularLimit(dash.panels?.popular?.limit);
const pop = dash.panels?.popular;
const src = dash.panels?.sources;

if (!dash.panels) {
  console.error("Нет panels — npm run seo:rank-dashboard:panels");
  process.exit(1);
}

if (!pop?.queries) {
  console.error("Нет panels.popular — npm run seo:rank-dashboard:panels");
  process.exit(1);
}

const gCount = pop.queries.google?.length ?? 0;
const yCount = pop.queries.yandex?.length ?? 0;
const period = dash.panels.period;
let failed = false;

if (period?.startDate && period?.endDate) {
  console.log(`OK: период панелей ${period.startDate} … ${period.endDate}`);
} else {
  console.warn("WARN: panels.period не задан");
}

if (src?.gscError) {
  console.warn(`WARN: GSC — ${src.gscError.slice(0, 200)}`);
  if (gCount === 0) failed = true;
} else if (gCount < expected) {
  console.warn(`WARN: GSC топ запросов ${gCount}/${expected} (ожидали ${expected})`);
  if (gCount === 0) failed = true;
} else {
  console.log(`OK: GSC популярные запросы ${gCount}/${expected}`);
}

if (src?.yandexError) {
  console.warn(`WARN: Яндекс — ${src.yandexError.slice(0, 200)}`);
  if (yCount === 0) failed = true;
} else if (yCount < expected) {
  console.warn(`WARN: Яндекс топ запросов ${yCount}/${expected}`);
  if (yCount < Math.min(10, expected)) failed = true;
} else {
  console.log(`OK: Яндекс популярные запросы ${yCount}/${expected}`);
}

const tracked = new Set();
for (const page of dash.pages) {
  for (const q of page.queries) tracked.add(q.text.trim().toLowerCase());
}

const inGsc = pop.queries.google?.filter((r) => tracked.has(r.text.trim().toLowerCase())) ?? [];
const inYm = pop.queries.yandex?.filter((r) => tracked.has(r.text.trim().toLowerCase())) ?? [];
console.log(
  `OK: отслеживаемые фразы в топ-${expected}: GSC ${inGsc.length}, Яндекс ${inYm.length}`,
);

const needle = "комплексный маркетинг";
const hasKompleksnyy =
  pop.queries.google?.some((r) => r.text.toLowerCase().includes(needle)) ||
  pop.queries.yandex?.some((r) => r.text.toLowerCase().includes(needle));
if (dash.pages.some((p) => p.id === "marketing" && p.queries.some((q) => q.id === "kompleksnyy"))) {
  if (hasKompleksnyy) {
    console.log(`OK: «${needle}» есть в топ-${expected}`);
  } else {
    console.warn(`WARN: «${needle}» пока нет в топ-${expected} (мало показов за период — нормально)`);
  }
}

if (failed) {
  console.error("\nТоп-50 не прошёл проверку. Обновите: npm run seo:rank-dashboard:top50");
  process.exit(1);
}

console.log(`\nOK: проверка топ-${expected} пройдена`);
