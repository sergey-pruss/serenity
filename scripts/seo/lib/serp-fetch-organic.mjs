/**
 * Съёмка органической выдачи (топ-20) для дашборда позиций и gap-отчётов.
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ORGANIC_TARGET,
  REGIONS,
  isDeniedSerpHost,
} from "./serp-shared.mjs";
import {
  createRegionalContext,
  googleSearchUrl,
  warnIfWrongRegion,
  yandexSearchUrl,
} from "./serp-region-context.mjs";
import { isSerpJunkUrl } from "./serp-url-filter.mjs";

export const SERP_INTERACTIVE = process.env.SERP_INTERACTIVE === "1";
const DELAY_MS = Number(process.env.SERP_FETCH_DELAY_MS || "2500");

/** @param {string} label @param {{ captcha?: boolean }} [opts] */
export async function waitForUserContinue(label, opts = {}) {
  if (!SERP_INTERACTIVE) return;
  const rl = readline.createInterface({ input, output });
  console.log("\n══════════════════════════════════════════════════");
  console.log(label);
  if (opts.captcha) {
    console.log("▶ В ОТКРЫТОМ ОКНЕ БРАУЗЕРА: введите капчу.");
  }
  console.log(`▶ Проверьте регион (${REGIONS.moscow.label} / ${REGIONS.spb.label} / ${REGIONS.rf.label}).`);
  console.log("▶ Когда видите органическую выдачу — вернитесь сюда и нажмите Enter.");
  console.log("══════════════════════════════════════════════════\n");
  await rl.question("Enter ");
  rl.close();
}

/** @param {import('playwright').Page} page */
export async function isBlockedPage(page) {
  const title = await page.title();
  if (/captcha|robot|unusual traffic|подтвердите|automated|не робот/i.test(title)) {
    return true;
  }
  return (
    (await page.locator("form[action*='captcha'], #captcha, .CheckboxCaptcha").count()) > 0
  );
}

/** @param {string} url */
export function normalizeResultUrl(url) {
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
export async function extractOrganic(page, engine) {
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
            node.querySelector(".OrganicText, .text-container, .ExtendedText")?.textContent || ""
          ).trim();
        raw.push({ title, url: href, snippet });
      });
      if (raw.length < 5) {
        document.querySelectorAll('main a[href^="http"], #search-result a[href^="http"]').forEach((a) => {
          const href = /** @type {HTMLAnchorElement} */ (a).href;
          if (!href || href.includes("/search?")) return;
          raw.push({ title: (a.textContent || "").trim(), url: href, snippet: "" });
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
          if (/google\.|gstatic\.|youtube\.|accounts\.|yabs\.yandex/i.test(href)) return;
          raw.push({ title: (a.textContent || "").trim(), url: href, snippet: "" });
        });
      }
    }
    return raw;
  }, { engine });
}

/**
 * @param {import('playwright').Page} page
 * @param {'yandex' | 'google'} engine
 * @param {string} stepLabel
 * @param {boolean} wasBlocked
 */
export async function waitForOrganicResults(page, engine, stepLabel, wasBlocked) {
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

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {'yandex' | 'google'} engine
 * @param {import('./serp-shared.mjs').RegionId} regionId
 */
export async function fetchOrganicTop20(page, query, engine, regionId) {
  const searchUrl =
    engine === "yandex" ? yandexSearchUrl(query, regionId) : googleSearchUrl(query, regionId);
  const stepLabel = `${query} | ${engine} | ${REGIONS[regionId].label}`;
  console.log(`\n>>> Регион: ${REGIONS[regionId].label} (lr=${REGIONS[regionId].yandexLr})`);
  console.log(`  URL: ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(DELAY_MS);

  if (SERP_INTERACTIVE) await warnIfWrongRegion(page, regionId);

  const blocked = await isBlockedPage(page);
  let raw = [];
  if (SERP_INTERACTIVE) {
    if (blocked) {
      console.log("\n🔐 КАПЧА: решите её в открытом окне Chromium.\n");
    }
    raw = await waitForOrganicResults(page, engine, stepLabel, blocked);
  } else {
    raw = blocked ? [] : await extractOrganic(page, engine);
  }

  /** @type {Map<string, { position: number; title: string; url: string; displayDomain: string }>} */
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
    });
  }
  return {
    searchUrl,
    blocked,
    results: [...seen.values()],
  };
}

export { createRegionalContext, saveGoogleState } from "./serp-region-context.mjs";
