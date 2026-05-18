#!/usr/bin/env node
/**
 * Снимок органической выдачи: 2 запроса × Яндекс/Google × Москва/СПб.
 * Результат: artifacts/seo/kontekstnaya-serp-snapshots-YYYYMMDD.json
 *
 * SERP_SKIP_FETCH=1 — не ходить в сеть, только проверить существующий JSON.
 * SERP_FIXTURE=path — импорт готового JSON вместо Playwright.
 * SERP_HEADED=1 — видимый браузер.
 * SERP_INTERACTIVE=1 — пауза Enter после каждой выдачи (ввод капчи вручную).
 * SERP_LIVE_ONLY=1 — не подмешивать curated baseline.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";
import { getSerpCampaign, SNAPSHOT_DATE } from "./lib/serp-campaigns.mjs";
import {
  ARTIFACTS_DIR,
  ENGINES,
  GAP_REGION_IDS,
  ORGANIC_TARGET,
  REGIONS,
  isDeniedSerpHost,
  serpMatrixKey,
} from "./lib/serp-shared.mjs";

const campaign = getSerpCampaign();
const QUERIES = campaign.queries;
import { baselineOrganicResults } from "./lib/serp-baseline-pools.mjs";
import { isSerpJunkUrl } from "./lib/serp-url-filter.mjs";
import {
  createRegionalContext,
  googleSearchUrl,
  saveGoogleState,
  warnIfWrongRegion,
  yandexSearchUrl,
} from "./lib/serp-region-context.mjs";

const DELAY_MS = Number(process.env.SERP_FETCH_DELAY_MS || "2500");
const INTERACTIVE = process.env.SERP_INTERACTIVE === "1";
const LIVE_ONLY = process.env.SERP_LIVE_ONLY === "1";

/** @param {string} label @param {{ captcha?: boolean }} [opts] */
async function waitForUserContinue(label, opts = {}) {
  if (!INTERACTIVE) return;
  const rl = readline.createInterface({ input, output });
  console.log("\n══════════════════════════════════════════════════");
  console.log(label);
  if (opts.captcha) {
    console.log("▶ В ОТКРЫТОМ ОКНЕ БРАУЗЕРА: введите капчу.");
  }
  console.log("▶ Проверьте регион (Москва или Санкт-Петербург, не Бангкок).");
  console.log("▶ Когда видите органическую выдачу — вернитесь сюда и нажмите Enter.");
  console.log("══════════════════════════════════════════════════\n");
  await rl.question("Enter ");
  rl.close();
}

/**
 * Ждёт появления органики после капчи (без Enter в терминале).
 * @param {import('playwright').Page} page
 * @param {'yandex' | 'google'} engine
 * @param {string} stepLabel
 * @param {boolean} wasBlocked
 */
async function waitForOrganicResults(page, engine, stepLabel, wasBlocked) {
  const maxMs = Number(process.env.SERP_WAIT_MS || "300000");
  const step = 3000;
  const need = 8;
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    const blocked = await isBlockedPage(page);
    if (!blocked) {
      const raw = await extractOrganic(page, engine);
      if (raw.length >= need) {
        console.log(`✓ ${stepLabel}: собрано ${raw.length} ссылок`);
        return raw;
      }
      if (raw.length > 0 && Date.now() - start > 45000) {
        console.log(`✓ ${stepLabel}: ${raw.length} ссылок (продолжаем)`);
        return raw;
      }
    }
    const left = Math.round((maxMs - (Date.now() - start)) / 1000);
    process.stdout.write(`\r  … ждём выдачу (${left} с)   `);
    await page.waitForTimeout(step);
  }
  console.log("\n⚠️  Таймаут ожидания. Enter в терминале — если выдача уже на экране.");
  await waitForUserContinue(stepLabel, { captcha: wasBlocked });
  return extractOrganic(page, engine);
}

/** @param {import('playwright').Page} page */
async function isBlockedPage(page) {
  const title = await page.title();
  if (/captcha|robot|unusual traffic|подтвердите|automated|не робот/i.test(title)) {
    return true;
  }
  return (
    (await page.locator("form[action*='captcha'], #captcha, .CheckboxCaptcha").count()) >
    0
  );
}

/** @param {string} url */
function normalizeResultUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/i.test(u.protocol)) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {'yandex' | 'google'} engine
 */
async function extractOrganic(page, engine) {
  return page.evaluate(({ engine: eng }) => {
      /** @type {{ title: string; url: string; snippet: string }[]} */
      const raw = [];

      if (eng === "yandex") {
        const nodes = document.querySelectorAll(
          "li.serp-item, li[data-cid], .Organic, .organic, .VanillaOrganic",
        );
        nodes.forEach((node) => {
          if (node.closest(".serp-adv, .AdvLabel, [data-fast-name='ad']")) return;
          const a =
            node.querySelector("a.OrganicTitle-Link, a.organic__url, h2 a[href], a.Link[href]") ||
            node.querySelector('a[href^="http"]');
          if (!a) return;
          const href = a.href;
          if (
            !href ||
            href.includes("yandex.ru/clck") ||
            href.includes("/search?") ||
            /yabs\.yandex/i.test(href) ||
            /yandex\.(ru|com)\/count\//i.test(href)
          ) {
            return;
          }
          const title =
            (a.textContent || node.querySelector(".OrganicTitle")?.textContent || "").trim();
          const snippet =
            (
              node.querySelector(".OrganicText, .text-container, .ExtendedText")?.textContent ||
              ""
            ).trim();
          raw.push({ title, url: href, snippet });
        });
        if (raw.length < 5) {
          document.querySelectorAll('main a[href^="http"], #search-result a[href^="http"]').forEach((a) => {
            const href = /** @type {HTMLAnchorElement} */ (a).href;
            if (!href || href.includes("/search?")) return;
            raw.push({
              title: (a.textContent || "").trim(),
              url: href,
              snippet: "",
            });
          });
        }
      } else {
        document.querySelectorAll("#search .g, div[data-sokoban-container] div.g").forEach((node) => {
          if (node.querySelector("[data-text-ad], .uEierd")) return;
          const a = node.querySelector("a[href^='http']:not([href*='google.'])");
          if (!a) return;
          const href = /** @type {HTMLAnchorElement} */ (a).href;
          const h3 = node.querySelector("h3");
          const title = (h3?.textContent || a.textContent || "").trim();
          const snippet = (node.querySelector(".VwiC3b, .IsZvec, .st")?.textContent || "").trim();
          raw.push({ title, url: href, snippet });
        });
        if (raw.length < 5) {
          document.querySelectorAll("#search a[href^='http']").forEach((a) => {
            const href = /** @type {HTMLAnchorElement} */ (a).href;
            if (/google\.|gstatic\.|youtube\.|accounts\.|yabs\.yandex/i.test(href)) {
              return;
            }
            raw.push({
              title: (a.textContent || "").trim(),
              url: href,
              snippet: "",
            });
          });
        }
      }

      return raw;
    }, { engine });
}

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {'yandex' | 'google'} engine
 * @param {import('./lib/kontekstnaya-serp-config.mjs').RegionId} regionId
 */
async function fetchOneSerp(page, query, engine, regionId) {
  const searchUrl =
    engine === "yandex"
      ? yandexSearchUrl(query, regionId)
      : googleSearchUrl(query, regionId);

  const stepLabel = `${query} | ${engine} | ${REGIONS[regionId].label}`;
  console.log(`\n>>> Ожидаемый регион: ${REGIONS[regionId].label} (lr=${REGIONS[regionId].yandexLr})`);
  console.log(`  URL: ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(DELAY_MS);

  if (INTERACTIVE) {
    await warnIfWrongRegion(page, regionId);
  }

  let blocked = await isBlockedPage(page);
  let raw = [];

  if (INTERACTIVE) {
    if (blocked) {
      console.log("\n🔐 КАПЧА: решите её в открытом окне Chromium. Скрипт ждёт выдачу автоматически…\n");
    } else {
      console.log("Ждём органическую выдачу (автопроверка каждые 3 с)…");
    }
    raw = await waitForOrganicResults(page, engine, stepLabel, blocked);
  } else {
    raw = blocked ? [] : await extractOrganic(page, engine);
  }
  /** @type {Map<string, { position: number; title: string; url: string; displayDomain: string; snippet: string }>} */
  const seen = new Map();

  for (const item of raw) {
    const url = normalizeResultUrl(item.url);
    if (!url) continue;
    let host;
    try {
      host = new URL(url).hostname.replace(/^www\./i, "");
    } catch {
      continue;
    }
    if (isDeniedSerpHost(host) || isSerpJunkUrl(url)) continue;
    const key = `${host}${new URL(url).pathname}`;
    if (seen.has(key)) continue;
    if (seen.size >= ORGANIC_TARGET) break;
    seen.set(key, {
      position: seen.size + 1,
      title: item.title.slice(0, 300),
      url,
      displayDomain: host,
      snippet: (item.snippet || "").slice(0, 400),
    });
  }

  const results = [...seen.values()];

  return mergeWithBaseline(
    query,
    engine,
    regionId,
    searchUrl,
    blocked,
    results,
  );
}

/**
 * @param {string} query
 * @param {'yandex' | 'google'} engine
 * @param {import('./lib/kontekstnaya-serp-config.mjs').RegionId} regionId
 * @param {string} searchUrl
 * @param {boolean} blocked
 * @param {{ position: number; title: string; url: string; displayDomain: string; snippet: string }[]} liveResults
 */
function mergeWithBaseline(query, engine, regionId, searchUrl, blocked, liveResults) {
  const q = QUERIES.find((x) => x.text === query);
  const queryId = q?.id || "nastroyka";
  const baseline = LIVE_ONLY ? [] : baselineOrganicResults(queryId, engine, regionId);
  const seen = new Map();
  for (const r of liveResults) {
    seen.set(r.url, { ...r, source: "playwright" });
  }
  for (const r of baseline) {
    if (!seen.has(r.url) && seen.size < ORGANIC_TARGET) {
      seen.set(r.url, r);
    }
  }
  const results = [...seen.values()].map((r, i) => ({ ...r, position: i + 1 }));
  const liveN = liveResults.length;
  const method =
    liveN >= ORGANIC_TARGET
      ? "playwright"
      : liveN > 0
        ? "playwright+curated-baseline"
        : "curated-baseline";
  let warning = null;
  if (blocked && liveN === 0) {
    warning =
      "Playwright: капча/блокировка Яндекса или Google — топ-20 из curated baseline (публичная выдача, май 2026)";
  } else if (liveN < ORGANIC_TARGET) {
    warning = `Playwright: ${liveN} URL; дополнено curated baseline до ${results.length}`;
  }
  return { searchUrl, blocked, warning, results, fetchMethod: method };
}

/**
 * @param {string} outPath
 * @param {Record<string, unknown>} matrix
 * @param {string[]} warnings
 * @param {string} method
 */
function writeSnapshotPartial(outPath, matrix, warnings, method) {
  const payload = {
    snapshotDate: SNAPSHOT_DATE,
    snapshotDateIso: `${SNAPSHOT_DATE.slice(0, 4)}-${SNAPSHOT_DATE.slice(4, 6)}-${SNAPSHOT_DATE.slice(6, 8)}`,
    method,
    matrix,
    warnings,
    partial: true,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const outPath = campaign.snapshotsPath();
  const fixture = process.env.SERP_FIXTURE;

  if (fixture) {
    const abs = path.resolve(fixture);
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    fs.copyFileSync(abs, outPath);
    console.log("SERP: скопирован fixture →", outPath);
    return;
  }

  if (process.env.SERP_SKIP_FETCH === "1") {
    if (!fs.existsSync(outPath)) {
      console.error("SERP_SKIP_FETCH=1, но нет файла:", outPath);
      process.exit(1);
    }
    console.log("SERP: пропуск fetch, есть", outPath);
    return;
  }

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  /** @type {Record<string, unknown>} */
  const matrix = {};
  const warnings = [];

  if (process.env.SERP_SKIP_PLAYWRIGHT === "1") {
    for (const q of QUERIES) {
      for (const engine of ENGINES) {
        for (const regionId of GAP_REGION_IDS) {
          const rid = /** @type {import('./lib/serp-shared.mjs').RegionId} */ (regionId);
          const key = serpMatrixKey(q.id, engine, rid);
          const block = mergeWithBaseline(q.text, engine, rid, "", true, []);
          matrix[key] = {
            queryId: q.id,
            query: q.text,
            engine,
            regionId: rid,
            regionLabel: REGIONS[rid].label,
            ...block,
            fetchedAt: new Date().toISOString(),
          };
          if (block.warning) warnings.push(`${key}: ${block.warning}`);
        }
      }
    }
    const payload = {
      snapshotDate: SNAPSHOT_DATE,
      snapshotDateIso: `${SNAPSHOT_DATE.slice(0, 4)}-${SNAPSHOT_DATE.slice(4, 6)}-${SNAPSHOT_DATE.slice(6, 8)}`,
      method: "curated-baseline",
      matrix,
      warnings,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
    console.log("SERP: baseline-only →", outPath);
    return;
  }

  if (INTERACTIVE) {
    console.log(
      `\n🌐 Откроется окно Chromium. ${campaign.serpCount} выдач (${campaign.id}). Капчу — только в браузере; выдача подхватится автоматически.\n`,
    );
  }

  if (process.env.SERP_FORCE_REFETCH === "1" && fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);
    console.log("SERP: удалён старый снимок (SERP_FORCE_REFETCH=1)");
  }

  const skipKeys = new Set(
    (process.env.SERP_SKIP_KEYS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (fs.existsSync(outPath) && process.env.SERP_RESUME === "1") {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
      Object.assign(matrix, prev.matrix || {});
      warnings.push(...(prev.warnings || []));
      console.log("SERP: resume — уже есть ключей:", Object.keys(matrix).length);
    } catch {
      /* ignore */
    }
  }

  const browser = await chromium.launch({
    headless: INTERACTIVE ? false : process.env.SERP_HEADED !== "1",
    slowMo: INTERACTIVE ? 80 : 0,
  });

  /** @type {import('playwright').BrowserContext | null} */
  let context = null;
  /** @type {import('playwright').Page | null} */
  let page = null;

  for (const q of QUERIES) {
    for (const engine of ENGINES) {
      for (const regionId of GAP_REGION_IDS) {
        const rid = /** @type {import('./lib/serp-shared.mjs').RegionId} */ (regionId);
        const key = serpMatrixKey(q.id, engine, rid);
        if (skipKeys.has(key)) {
          console.log(`SERP: пропуск ${key} (SERP_SKIP_KEYS)`);
          continue;
        }
        if (process.env.SERP_RESUME === "1" && matrix[key]?.results?.length >= 15) {
          console.log(`SERP: пропуск ${key} (уже ${matrix[key].results.length} URL)`);
          continue;
        }

        if (context) await context.close();
        context = await createRegionalContext(browser, rid, { engine });
        page = await context.newPage();

        console.log(
          `\nSERP [${Object.keys(matrix).length + 1}/${campaign.serpCount}]: ${q.text} | ${engine} | ${REGIONS[rid].label}`,
        );
        try {
          const block = await fetchOneSerp(page, q.text, engine, rid);
          matrix[key] = {
            queryId: q.id,
            query: q.text,
            engine,
            regionId: rid,
            regionLabel: REGIONS[rid].label,
            ...block,
            fetchedAt: new Date().toISOString(),
          };
          if (block.warning) warnings.push(`${key}: ${block.warning}`);
          if (engine === "google" && INTERACTIVE && context) {
            await saveGoogleState(context);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          warnings.push(`${key}: ${msg}`);
          const block = mergeWithBaseline(q.text, engine, rid, "", true, []);
          matrix[key] = {
            queryId: q.id,
            query: q.text,
            engine,
            regionId: rid,
            regionLabel: REGIONS[rid].label,
            ...block,
            warning: `${msg}. ${block.warning || ""}`.trim(),
            fetchedAt: new Date().toISOString(),
          };
        }
        writeSnapshotPartial(outPath, matrix, warnings, "playwright-interactive");
        await page.waitForTimeout(800);
      }
    }
  }

  if (context) await context.close();
  await browser.close();

  const methods = new Set(
    Object.values(matrix).map((b) => /** @type {{ fetchMethod?: string }} */ (b).fetchMethod),
  );
  const payload = {
    snapshotDate: SNAPSHOT_DATE,
    snapshotDateIso: `${SNAPSHOT_DATE.slice(0, 4)}-${SNAPSHOT_DATE.slice(4, 6)}-${SNAPSHOT_DATE.slice(6, 8)}`,
    method: methods.size === 1 ? [...methods][0] : [...methods].join(", "),
    matrix,
    warnings,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("SERP: записано", outPath);
  if (warnings.length) {
    console.warn("SERP: предупреждения:\n", warnings.join("\n"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
