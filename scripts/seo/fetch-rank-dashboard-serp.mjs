#!/usr/bin/env node
/**
 * Интерактивная съёмка SERP для rank-dashboard: топ-20, позиция serenity.agency.
 * SERP_INTERACTIVE=1 — капча в браузере, Enter в терминале.
 */
import { chromium } from "playwright";
import {
  DASHBOARD_ENGINES,
  DASHBOARD_REGIONS,
  DEFAULT_RANK_DASHBOARD_PATH,
  findSerenityPosition,
  loadRankDashboard,
  saveRankDashboard,
  upsertCheckEntry,
} from "./lib/rank-dashboard-utils.mjs";
import { REGIONS } from "./lib/serp-shared.mjs";
import {
  SERP_INTERACTIVE,
  createRegionalContext,
  fetchOrganicTop20,
  saveGoogleState,
} from "./lib/serp-fetch-organic.mjs";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function usage() {
  console.error(`Использование:
  node scripts/seo/fetch-rank-dashboard-serp.mjs [опции]

Опции (env):
  RANK_CHECK_DATE=YYYY-MM-DD   дата снимка (по умолчанию сегодня)
  RANK_DASHBOARD_PATH=…        путь к JSON
  SERP_INTERACTIVE=1           капча + Enter (npm run seo:rank-dashboard:serp:interactive)
  SERP_SKIP_KEYS=a|b|c         пропуск pageId|queryId|engine|region через запятую
  SERP_RESUME=1                не перезаписывать уже заполненные ячейки снимка
`);
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  const date = process.env.RANK_CHECK_DATE || todayIso();
  const dashPath = process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH;
  const dash = loadRankDashboard(dashPath);
  const skipKeys = new Set(
    (process.env.SERP_SKIP_KEYS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const combos = [];
  for (const page of dash.pages) {
    for (const q of page.queries) {
      for (const engine of DASHBOARD_ENGINES) {
        for (const region of DASHBOARD_REGIONS) {
          combos.push({ page, q, engine, region });
        }
      }
    }
  }

  const existing = new Set();
  if (process.env.SERP_RESUME === "1") {
    const check = dash.checks.find((c) => c.date === date);
    if (check) {
      for (const e of check.entries) {
        existing.add(`${e.pageId}|${e.queryId}|${e.engine}|${e.region}`);
      }
      console.log(`Resume: уже ${existing.size} записей за ${date}`);
    }
  }

  if (SERP_INTERACTIVE) {
    console.log(
      `\n🌐 Chromium: ${combos.length} выдач (страницы × запросы × ПС × регион).\n`,
    );
  }

  const browser = await chromium.launch({
    headless: !SERP_INTERACTIVE && process.env.SERP_HEADED !== "1",
    slowMo: SERP_INTERACTIVE ? 80 : 0,
  });

  let done = 0;
  /** @type {import('playwright').BrowserContext | null} */
  let context = null;

  for (const { page, q, engine, region } of combos) {
    const cellKey = `${page.id}|${q.id}|${engine}|${region}`;
    if (skipKeys.has(cellKey)) {
      console.log(`Пропуск ${cellKey} (SERP_SKIP_KEYS)`);
      continue;
    }
    if (existing.has(cellKey)) {
      console.log(`Пропуск ${cellKey} (SERP_RESUME)`);
      continue;
    }

    done += 1;
    console.log(
      `\n[${done}/${combos.length - skipKeys.size - existing.size || combos.length}] ${page.title} | ${q.text} | ${engine} | ${REGIONS[region].label}`,
    );

    if (context) await context.close();
    context = await createRegionalContext(browser, region, { engine });
    const pwPage = await context.newPage();

    try {
      const block = await fetchOrganicTop20(pwPage, q.text, engine, region);
      const hit = findSerenityPosition(
        block.results,
        dash.site.primaryDomain,
        page.path,
      );
      /** @type {import('./lib/rank-dashboard-utils.mjs').RankEntry} */
      const entry = {
        pageId: page.id,
        queryId: q.id,
        engine,
        region,
        position: hit.position,
        outOfTop20: hit.position == null,
        matchedUrl: hit.matchedUrl,
        source: block.blocked ? "serp-interactive-blocked" : "serp-interactive",
      };
      upsertCheckEntry(dash, date, entry);
      saveRankDashboard(dash, dashPath);
      const posLabel = hit.position != null ? String(hit.position) : ">20";
      console.log(`  → Serenity: ${posLabel}${hit.matchedUrl ? ` (${hit.matchedUrl})` : ""}`);
      if (engine === "google" && SERP_INTERACTIVE && context) {
        await saveGoogleState(context);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${msg}`);
      upsertCheckEntry(dash, date, {
        pageId: page.id,
        queryId: q.id,
        engine,
        region,
        position: null,
        outOfTop20: true,
        matchedUrl: null,
        source: `error: ${msg.slice(0, 120)}`,
      });
      saveRankDashboard(dash, dashPath);
    }
    await pwPage.waitForTimeout(800);
  }

  if (context) await context.close();
  await browser.close();

  console.log(`\nГотово. Снимок ${date} → ${dashPath}`);
  console.log("Соберите HTML: npm run seo:rank-dashboard:build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
