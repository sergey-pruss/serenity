#!/usr/bin/env node
/**
 * Интерактивная съёмка SERP для rank-dashboard: топ-20, позиция serenity.agency.
 * SERP_INTERACTIVE=1 — капча в браузере, Enter в терминале.
 */
import { chromium } from "playwright";
import {
  DASHBOARD_ENGINES,
  dashboardRegionsForEngine,
  DEFAULT_RANK_DASHBOARD_PATH,
  entryHasSerpCapture,
  entryIsDoubtfulForRefetch,
  entryYandexRecheckSuggested,
  findSerenityPosition,
  getPage,
  loadRankDashboard,
  saveRankDashboard,
  sortPendingSerpCells,
  upsertCheckEntry,
} from "./lib/rank-dashboard-utils.mjs";
import { REGIONS, serpUseWebKit } from "./lib/serp-shared.mjs";
import fs from "node:fs";
import path from "node:path";
import {
  closeSerpWebKitContext,
  createRegionalContext,
  googleStatePath,
  launchSerpWebKitContext,
} from "./lib/serp-region-context.mjs";
import {
  SERP_INTERACTIVE,
  fetchOrganicTop20,
  isSerpPageOpen,
  resetYandexInteractiveSession,
  safePageDelay,
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
  SERP_BROWSER=webkit          Safari/WebKit для Яндекс и Google (по умолчанию в interactive)
  SERP_BROWSER=chromium        откат на Chromium
  SERP_SKIP_KEYS=a|b|c         пропуск pageId|queryId|engine|region через запятую
  SERP_RESUME=1                не перезаписывать ячейки, уже есть в снимке за дату
  SERP_ONLY_MISSING=1          только без успешной съёмки (пусто / blocked / error)
                               (= SERP_RESUME; npm run seo:rank-dashboard:serp:missing)
  SERP_REFETCH_FAILED=1        переснять капчу/ошибки (npm run seo:rank-dashboard:serp:refetch)
  SERP_REFETCH_OUT_OF_TOP20=1  переснять «>20» (см. SERP_REFETCH_ENGINE)
  SERP_REFETCH_ENGINE=yandex   с REFETCH_OUT_OF_TOP20 (по умолчанию yandex)
  SERP_REFETCH_DOUBTFUL=1      Google все + Яндекс поз. 11–20 (npm run …:refetch-doubtful)
  SERP_REFETCH_DOUBTFUL_YANDEX_OUT=1  с DOUBTFUL — ещё Яндекс «>20»
  SERP_REFETCH_YANDEX_RECHECK=1       Яндекс: >20 при ВМ ≤20, поз. 11–20, blocked (npm run …:refetch-yandex-recheck)
  SERP_LIST_DOUBTFUL=1         только список сомнительных ячеек, без браузера

npm run seo:rank-dashboard:serp:missing — снять только ячейки без успешной съёмки за дату
npm run seo:rank-dashboard:serp:refetch-yandex — переснять Яндекс >20 за сегодня
npm run seo:rank-dashboard:serp:refetch-doubtful — переснять сомнительные за дату
npm run seo:rank-dashboard:serp:list-doubtful — показать список сомнительных
`);
}

/** @param {import('./lib/rank-dashboard-utils.mjs').RankEntry} entry @param {import('./lib/rank-dashboard-utils.mjs').RankDashboard} dash */
function keepCellWithoutRefetch(entry, dash) {
  if (entry.source === "manual") return true;

  if (process.env.SERP_ONLY_MISSING === "1") {
    return entryHasSerpCapture(entry);
  }

  if (process.env.SERP_REFETCH_OUT_OF_TOP20 === "1") {
    const eng = process.env.SERP_REFETCH_ENGINE || "yandex";
    if (entry.engine !== eng) return true;
    if (!entry.outOfTop20 && entry.position != null) return true;
    return false;
  }

  if (process.env.SERP_REFETCH_FAILED === "1") {
    if (
      entry.source === "serp-interactive" &&
      !entry.outOfTop20 &&
      entry.position != null
    ) {
      return true;
    }
    return !/captcha|blocked|error:/i.test(entry.source || "");
  }

  if (process.env.SERP_REFETCH_DOUBTFUL === "1") {
    return !entryIsDoubtfulForRefetch(entry);
  }

  if (process.env.SERP_REFETCH_GOOGLE === "1") {
    if (entry.engine !== "google") return true;
    if (!entryHasSerpCapture(entry)) return false;
    if (/error:/i.test(entry.source || "")) return false;
    if (entry.source === "serp-interactive-google-p1") return true;
    if (!entry.outOfTop20 && entry.position != null) return true;
    return false;
  }

  if (process.env.SERP_REFETCH_YANDEX_RECHECK === "1") {
    if (entry.engine !== "yandex") return true;
    return !entryYandexRecheckSuggested(dash, entry);
  }

  return true;
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  if (process.env.SERP_ONLY_MISSING === "1") {
    process.env.SERP_RESUME = "1";
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
        for (const region of dashboardRegionsForEngine(engine)) {
          combos.push({ page, q, engine, region });
        }
      }
    }
  }

  const existing = new Set();
  const resumeOrRefetch =
    process.env.SERP_RESUME === "1" ||
    process.env.SERP_ONLY_MISSING === "1" ||
    process.env.SERP_REFETCH_OUT_OF_TOP20 === "1" ||
    process.env.SERP_REFETCH_FAILED === "1" ||
    process.env.SERP_REFETCH_DOUBTFUL === "1" ||
    process.env.SERP_REFETCH_GOOGLE === "1" ||
    process.env.SERP_REFETCH_YANDEX_RECHECK === "1";
  if (resumeOrRefetch) {
    const check = dash.checks.find((c) => c.date === date);
    let refetch = 0;
    if (check) {
      for (const e of check.entries) {
        const key = `${e.pageId}|${e.queryId}|${e.engine}|${e.region}`;
        if (keepCellWithoutRefetch(e, dash)) {
          existing.add(key);
        } else {
          refetch += 1;
        }
      }
      if (process.env.SERP_ONLY_MISSING === "1") {
        console.log(
          `Только без съёмки за ${date}: пропуск ${existing.size} ячеек с результатом`,
        );
      } else if (process.env.SERP_RESUME === "1") {
        console.log(`Resume: уже ${existing.size} записей за ${date}`);
      }
      if (refetch > 0) {
        let kind = "капча/ошибки";
        if (process.env.SERP_REFETCH_OUT_OF_TOP20 === "1") {
          kind = `>20 (${process.env.SERP_REFETCH_ENGINE || "yandex"})`;
        } else if (process.env.SERP_REFETCH_YANDEX_RECHECK === "1") {
          kind = "Яндекс: перепроверка (>20 при ВМ в топ-20, 11–20, blocked)";
        } else if (process.env.SERP_REFETCH_DOUBTFUL === "1") {
          kind = "сомнительные (Google все, Яндекс 11–20)";
          if (process.env.SERP_REFETCH_DOUBTFUL_YANDEX_OUT === "1") {
            kind += ", Яндекс >20";
          }
        }
        console.log(`Refetch: переснять ${refetch} ячеек (${kind})`);
      }
    }
  }

  if (process.env.SERP_LIST_DOUBTFUL === "1" && process.env.SERP_REFETCH_DOUBTFUL === "1") {
    const check = dash.checks.find((c) => c.date === date);
    if (!check) {
      console.log(`Нет снимка за ${date}.`);
      return;
    }
    const doubtful = check.entries.filter((e) => entryIsDoubtfulForRefetch(e));
    if (!doubtful.length) {
      console.log(`За ${date} сомнительных ячеек нет.`);
      return;
    }
    console.log(`\nСомнительные ячейки за ${date} (${doubtful.length}):\n`);
    for (const e of doubtful) {
      const page = getPage(dash, e.pageId);
      const q = page.queries.find((x) => x.id === e.queryId);
      const pos =
        e.outOfTop20 || e.position == null ? ">20" : String(e.position);
      const why =
        e.engine === "google"
          ? "Google (пересъёмка под РФ / чистый URL)"
          : e.outOfTop20
            ? "Яндекс >20"
            : `Яндекс поз. ${e.position} (возможен парсер стр. 1+2)`;
      console.log(
        `  · ${page.title} | ${q?.text || e.queryId} | ${e.engine} | ${e.region} → ${pos} — ${why}`,
      );
    }
    console.log(
      "\nПереснять: npm run seo:rank-dashboard:serp:refetch-doubtful",
    );
    console.log(
      "С Яндекс >20: SERP_REFETCH_DOUBTFUL_YANDEX_OUT=1 npm run seo:rank-dashboard:serp:refetch-doubtful",
    );
    return;
  }

  let queue = combos;
  if (process.env.SERP_REFETCH_ENGINE) {
    queue = queue.filter(({ engine }) => engine === process.env.SERP_REFETCH_ENGINE);
  }
  const pending = sortPendingSerpCells(
    queue.filter(({ page, q, engine, region }) => {
      const cellKey = `${page.id}|${q.id}|${engine}|${region}`;
      return !skipKeys.has(cellKey) && !existing.has(cellKey);
    }),
  );

  if (pending.length === 0) {
    console.log(`Нечего снимать за ${date} — все ячейки уже с успешной съёмкой.`);
    console.log("Добрать пустые: npm run seo:rank-dashboard:serp:missing");
    console.log("Переснять Яндекс >20: npm run seo:rank-dashboard:serp:refetch-yandex");
    console.log("Переснять сомнительные: npm run seo:rank-dashboard:serp:refetch-doubtful");
    console.log("Список сомнительных: npm run seo:rank-dashboard:serp:list-doubtful");
    return;
  }

  if (process.env.SERP_ONLY_MISSING === "1") {
    console.log(`К съёмке: ${pending.length} ячеек без результата SERP`);
  }

  if (SERP_INTERACTIVE) {
    const yM = pending.filter((c) => c.region === "moscow").length;
    const yS = pending.filter((c) => c.region === "spb").length;
    const browserLabel = serpUseWebKit() ? "WebKit (Safari)" : "Chromium";
    const legacyState = path.join(
      path.dirname(googleStatePath("moscow")),
      "playwright-google-ru-state.json",
    );
    const staleStates = ["moscow", "spb", "rf"]
      .map((id) => googleStatePath(id))
      .concat(legacyState)
      .filter((p) => fs.existsSync(p));
    if (staleStates.length && process.env.SERP_GOOGLE_PURGE_STATE === "1") {
      for (const p of staleStates) fs.unlinkSync(p);
      console.log("SERP: удалены старые storageState Google (uule в cookies).");
    } else if (staleStates.length) {
      console.log(
        "SERP: есть старые storageState Google — если в адресе снова uule/cr, удалите:\n" +
          staleStates.map((p) => `  ${p}`).join("\n") +
          "\n  или: SERP_GOOGLE_PURGE_STATE=1 npm run seo:rank-dashboard:serp:missing",
      );
    }
    console.log(
      `\n🌐 К съёмке ${pending.length} ячеек (порядок: Москва ${yM}, СПб ${yS}).\n` +
        `   Браузер: ${browserLabel}.\n` +
        `   Яндекс: капча → регион в подвале → Enter → съёмка.\n` +
        `   Google: только РФ (gl/hl), без Москва/СПб. Enter на выдаче.\n`,
    );
  }

  resetYandexInteractiveSession();

  const needsGoogle = pending.some((c) => c.engine === "google");
  const needsYandex = pending.some((c) => c.engine === "yandex");
  const useWebKit = SERP_INTERACTIVE && serpUseWebKit();

  /** @type {import('playwright').Browser | null} */
  let chromiumBrowser = null;
  if ((needsGoogle || needsYandex) && !useWebKit) {
    chromiumBrowser = await chromium.launch({
      headless: !SERP_INTERACTIVE && process.env.SERP_HEADED !== "1",
      slowMo: 0,
      ignoreDefaultArgs: SERP_INTERACTIVE ? ["--enable-automation"] : undefined,
      args: SERP_INTERACTIVE ? ["--disable-blink-features=AutomationControlled"] : undefined,
    });
  }

  let done = 0;
  /** @type {import('./lib/rank-dashboard-utils.mjs').DashboardRegionId | null} */
  let regionBanner = null;
  /** @type {import('playwright').BrowserContext | null} */
  let yandexCtx = null;
  /** @type {import('playwright').Page | null} */
  let yandexPage = null;
  /** @type {import('playwright').BrowserContext | null} */
  let googleCtx = null;
  /** @type {import('playwright').Page | null} */
  let googlePage = null;
  /** @type {import('./lib/rank-dashboard-utils.mjs').DashboardRegionId | null} */
  let googleCtxRegion = null;

  async function closeGoogleContext() {
    if (!googleCtx) return;
    if (useWebKit) await closeSerpWebKitContext(googleCtx);
    else await googleCtx.close();
    googleCtx = null;
    googlePage = null;
    googleCtxRegion = null;
  }

  for (const { page, q, engine, region } of pending) {
    done += 1;
    if (region !== regionBanner) {
      regionBanner = region;
      console.log(`\n════════ ${REGIONS[region].label.toUpperCase()} ════════`);
    }
    console.log(
      `\n[${done}/${pending.length}] ${page.title} | ${q.text} | ${engine} | ${REGIONS[region].label}`,
    );

    /** @type {import('playwright').BrowserContext} */
    let context;
    /** @type {import('playwright').Page} */
    let pwPage;

    if (engine === "yandex") {
      if (!yandexCtx) {
        if (useWebKit) {
          try {
            yandexCtx = await launchSerpWebKitContext(region, { engine: "yandex" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/Executable doesn't exist|webkit/i.test(msg)) {
              console.error(
                "WebKit не установлен. Выполните: npx playwright install webkit",
              );
            }
            throw e;
          }
        } else {
          if (!chromiumBrowser) {
            throw new Error("Chromium browser не инициализирован для Яндекса");
          }
          yandexCtx = await createRegionalContext(chromiumBrowser, region, {
            engine: "yandex",
          });
        }
        yandexPage = await yandexCtx.newPage();
      }
      context = yandexCtx;
      pwPage = yandexPage;
    } else {
      if (!googleCtx || googleCtxRegion !== region || !isSerpPageOpen(googlePage)) {
        await closeGoogleContext();
        googleCtxRegion = region;
        if (useWebKit) {
          try {
            googleCtx = await launchSerpWebKitContext(region, { engine: "google" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/Executable doesn't exist|webkit/i.test(msg)) {
              console.error(
                "WebKit не установлен. Выполните: npx playwright install webkit",
              );
            }
            throw e;
          }
        } else {
          if (!chromiumBrowser) {
            throw new Error("Chromium browser не инициализирован для Google");
          }
          googleCtx = await createRegionalContext(chromiumBrowser, region, {
            engine: "google",
          });
        }
        googlePage = await googleCtx.newPage();
        console.log(
          `  Google: новый контекст (${REGIONS[region].label}, geolocation + storageState по региону).`,
        );
      }
      context = googleCtx;
      pwPage = googlePage;
    }

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
        await saveGoogleState(context, region);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${msg}`);
      if (engine === "google" && /закрыто|has been closed/i.test(msg)) {
        console.warn(
          "  ⚠️ Не закрывайте Safari до Enter. Продолжить: npm run seo:rank-dashboard:serp:refetch-google",
        );
        await closeGoogleContext();
      }
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
    if (engine === "google" && isSerpPageOpen(pwPage) && !useWebKit) {
      await pwPage.close().catch(() => {});
    } else {
      await safePageDelay(pwPage, 800);
    }
  }

  await closeGoogleContext();
  if (yandexCtx) {
    if (useWebKit) await closeSerpWebKitContext(yandexCtx);
    else await yandexCtx.close();
  }
  if (chromiumBrowser) await chromiumBrowser.close();

  console.log(`\nГотово. Снимок ${date} → ${dashPath}`);
  console.log("Соберите HTML: npm run seo:rank-dashboard:build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
