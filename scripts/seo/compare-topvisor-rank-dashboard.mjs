#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dashboardRegionsForEngine,
  DEFAULT_RANK_DASHBOARD_PATH,
  entryKey,
  loadRankDashboard,
  saveRankDashboard,
} from "./lib/rank-dashboard-utils.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function topvisorOutOfTop20(p) {
  return p == null || p > 20;
}

function serpMatchesTopvisor(entry, topvisorPos) {
  if (!entry) return false;
  const tvOut = topvisorOutOfTop20(topvisorPos);
  const ourOut = Boolean(entry.outOfTop20) || entry.position == null;
  if (tvOut && ourOut) return true;
  if (tvOut !== ourOut) return false;
  return entry.position === topvisorPos;
}

function findCheckEntry(dash, date, pageId, queryId, engine, region) {
  const check = dash.checks.find((c) => c.date === date);
  if (!check) return null;
  return (
    check.entries.find(
      (e) =>
        e.pageId === pageId &&
        e.queryId === queryId &&
        e.engine === engine &&
        e.region === region,
    ) ?? null
  );
}

function main() {
  const argv = process.argv.slice(2);
  let topvisorPath = path.join(ROOT, "json/seo/sources/topvisor-rank-2026-05-19.json");
  let dashPath = DEFAULT_RANK_DASHBOARD_PATH;
  let date = "";
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--topvisor") topvisorPath = path.resolve(next());
    else if (a === "--dashboard") dashPath = path.resolve(next());
    else if (a === "--date") date = next();
    else if (a === "--apply") apply = true;
  }
  const tv = JSON.parse(fs.readFileSync(topvisorPath, "utf8"));
  date = date || tv.date;
  const dash = loadRankDashboard(dashPath);
  const mismatches = [];

  for (const page of dash.pages) {
    for (const q of page.queries) {
      const tvRow = tv.queries.find(
        (r) => r.dashboard?.pageId === page.id && r.dashboard?.queryId === q.id,
      );
      if (!tvRow) continue;
      for (const engine of /** @type {const} */ (["yandex", "google"])) {
        for (const region of dashboardRegionsForEngine(engine)) {
          const tvPos = tvRow[engine]?.[region] ?? null;
          const entry = findCheckEntry(dash, date, page.id, q.id, engine, region);
          if (!serpMatchesTopvisor(entry, tvPos)) {
            const ours =
              !entry || entry.position == null
                ? entry?.outOfTop20
                  ? ">20"
                  : "—"
                : String(entry.position);
            mismatches.push({
              key: entryKey(page.id, q.id, engine, region),
              query: q.text,
              engine,
              region,
              topvisor: tvPos,
              ours,
            });
          }
        }
      }
    }
  }

  console.log(`Дата: ${date}, расхождений: ${mismatches.length}`);
  for (const m of mismatches) {
    const tv = m.topvisor == null ? "—" : String(m.topvisor);
    console.log(`  · ${m.key} — Топвизор ${tv}, у нас ${m.ours} (${m.query})`);
  }
  if (apply && mismatches.length) {
    const check = dash.checks.find((c) => c.date === date);
    if (!check) {
      console.error("Нет checks за", date);
      process.exit(1);
    }
    const drop = new Set(mismatches.map((m) => m.key));
    check.entries = check.entries.filter(
      (e) => !drop.has(entryKey(e.pageId, e.queryId, e.engine, e.region)),
    );
    saveRankDashboard(dash, dashPath);
    console.log(`Удалено ${drop.size} записей для пересъёмки.`);
  }
}

main();
