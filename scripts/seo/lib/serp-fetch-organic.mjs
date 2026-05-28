/**
 * Съёмка органической выдачи (топ-N, по умолчанию 50) для дашборда и gap-отчётов.
 *
 * Интерактивный Яндекс (порядок шагов):
 * 1) открыть URL запроса;
 * 2) капча — ждём, пока сами откроется /search (без Enter на showcaptcha);
 * 3) регион в подвале — один раз на город (Москва, потом СПб), Enter;
 * 4) следующие запросы и листание выдачи — автоматически;
 * 5) Enter только при капче (после авто-ожидания) или смене города;
 * 6) съёмка топ-N (Яндекс/Google: до 5 страниц выдачи по ~10 органики).
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ORGANIC_TARGET,
  ORGANIC_PAGE_SLOTS,
  ORGANIC_SERP_PAGES,
  REGIONS,
  YANDEX_SEARCH_ORIGIN,
  isDeniedSerpHost,
  serpStopWhenSerenityFound,
} from "./serp-shared.mjs";
import { findSerenityPosition } from "./rank-dashboard-utils.mjs";
import {
  createRegionalContext,
  googleSearchUrl,
  gotoCleanGoogleSearch,
  logGoogleRegionFromPage,
  warnIfWrongRegion,
  yandexSearchUrl,
} from "./serp-region-context.mjs";
import { isSerpJunkUrl } from "./serp-url-filter.mjs";
import {
  isYandexTrackingHref,
  yandexOrganicUrlFromNodeText,
  yandexOrganicUrlFromPathText,
} from "./yandex-organic-url.mjs";
import { captchaSolverEnabled, trySolveSerpCaptcha } from "./serp-captcha-solver.mjs";

export const SERP_INTERACTIVE = process.env.SERP_INTERACTIVE === "1";

/** @typedef {{ primaryDomain: string; preferredPath?: string }} SerpStopContext */

/**
 * @param {{ position: number; url: string }[]} merged
 * @param {SerpStopContext | null | undefined} stopCtx
 */
function shouldStopSerpPagination(merged, stopCtx) {
  if (!stopCtx || !serpStopWhenSerenityFound()) return false;
  const hit = findSerenityPosition(
    merged,
    stopCtx.primaryDomain,
    stopCtx.preferredPath,
  );
  return hit.position != null;
}

/** Пауза после открытия выдачи / между страницами пагинации (мс). */
export function serpFetchDelayMs() {
  if (process.env.SERP_FETCH_DELAY_MS != null && process.env.SERP_FETCH_DELAY_MS !== "") {
    return Number(process.env.SERP_FETCH_DELAY_MS);
  }
  return SERP_INTERACTIVE ? 2500 : 1500;
}

/** Пауза между ячейками дашборда (мс) — снижает частоту капчи. */
export function serpCellDelayMs() {
  if (process.env.SERP_CELL_DELAY_MS != null && process.env.SERP_CELL_DELAY_MS !== "") {
    return Number(process.env.SERP_CELL_DELAY_MS);
  }
  return SERP_INTERACTIVE ? 4000 : 1200;
}

/** Случайная добавка к паузе между ячейками (0 … N мс). */
export function serpDelayJitterMs() {
  if (process.env.SERP_DELAY_JITTER_MS != null && process.env.SERP_DELAY_JITTER_MS !== "") {
    return Number(process.env.SERP_DELAY_JITTER_MS);
  }
  return SERP_INTERACTIVE ? 2000 : 0;
}

/** Пауза между листанием стр. 2–5 выдачи (мс) — дольше, чем после первого открытия. */
export function serpPageFlipDelayMs() {
  if (process.env.SERP_PAGE_FLIP_DELAY_MS != null && process.env.SERP_PAGE_FLIP_DELAY_MS !== "") {
    return Number(process.env.SERP_PAGE_FLIP_DELAY_MS);
  }
  return SERP_INTERACTIVE ? 8000 : 2000;
}

/** Джиттер к паузе между страницами пагинации. */
export function serpPageFlipJitterMs() {
  if (process.env.SERP_PAGE_FLIP_JITTER_MS != null && process.env.SERP_PAGE_FLIP_JITTER_MS !== "") {
    return Number(process.env.SERP_PAGE_FLIP_JITTER_MS);
  }
  return SERP_INTERACTIVE ? 6000 : 0;
}

/**
 * Пауза перед переходом на следующую страницу SERP (+ лёгкая прокрутка).
 * @param {import('playwright').Page | null | undefined} page
 * @param {number} nextPageIndex 1-based номер следующей страницы
 */
export async function pauseBetweenSerpPageFlips(page, nextPageIndex) {
  const base = serpPageFlipDelayMs();
  const jitter = serpPageFlipJitterMs();
  const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
  const total = base + extra;
  if (process.env.SERP_VERBOSE_DELAY === "1") {
    console.log(`  … пауза перед стр. ${nextPageIndex}: ${(total / 1000).toFixed(1)} с`);
  }
  if (isSerpPageOpen(page) && process.env.SERP_HUMAN_SCROLL !== "0") {
    await humanLikeScrollOnPage(page);
  }
  if (isSerpPageOpen(page)) {
    await safePageDelay(page, total);
  } else {
    await new Promise((r) => setTimeout(r, total));
  }
}

/** @param {import('playwright').Page} page */
async function humanLikeScrollOnPage(page) {
  try {
    const steps = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < steps; i++) {
      await page.evaluate(() => {
        const step = 180 + Math.floor(Math.random() * 420);
        window.scrollBy({ top: step, behavior: "smooth" });
      });
      await page.waitForTimeout(500 + Math.floor(Math.random() * 900));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Пауза между запросами в rank-dashboard (с джиттером).
 * @param {import('playwright').Page | null | undefined} page
 */
export async function pauseBetweenSerpCells(page) {
  const base = serpCellDelayMs();
  const jitter = serpDelayJitterMs();
  const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
  const total = base + extra;
  if (process.env.SERP_VERBOSE_DELAY === "1") {
    console.log(`  … пауза ${total} ms`);
  }
  if (isSerpPageOpen(page)) {
    await safePageDelay(page, total);
  } else {
    await new Promise((r) => setTimeout(r, total));
  }
}

/** @param {import('playwright').Page | null | undefined} page */
export function isSerpPageOpen(page) {
  return !!page && !page.isClosed();
}

/** @param {import('playwright').Page | null | undefined} page @param {number} ms */
export async function safePageDelay(page, ms) {
  if (!isSerpPageOpen(page)) return false;
  try {
    await page.waitForTimeout(ms);
    return true;
  } catch {
    return false;
  }
}
/** Яндекс: страницы p=1… (0 — только первая). Для топ-50 нужны все страницы. */
const YANDEX_PAGINATE =
  process.env.SERP_YANDEX_PAGINATE !== "0" &&
  process.env.SERP_YANDEX_PAGINATE !== "false" &&
  ORGANIC_SERP_PAGES > 1;
/** Google: start=10,20,… Отключить: SERP_GOOGLE_PAGINATE=0 */
const GOOGLE_PAGINATE =
  process.env.SERP_GOOGLE_PAGINATE !== "0" &&
  process.env.SERP_GOOGLE_PAGINATE !== "false" &&
  ORGANIC_SERP_PAGES > 1;

/** @type {import('./serp-shared.mjs').RegionId | null} */
let yandexFooterRegionLocked = null;
let yandexCaptchaSessionOk = false;
let yandexWorkflowHintShown = false;

export function resetYandexInteractiveSession() {
  yandexFooterRegionLocked = null;
  yandexCaptchaSessionOk = false;
  yandexWorkflowHintShown = false;
}

/** @deprecated alias */
export function resetYandexCaptchaSession() {
  resetYandexInteractiveSession();
}

function printYandexWorkflowOnce() {
  if (yandexWorkflowHintShown) return;
  yandexWorkflowHintShown = true;
  console.log(`
Яндекс, браузер WebKit (${YANDEX_SEARCH_ORIGIN}):
  1) Капча — пройдите в браузере; скрипт ждёт сам (Enter не на showcaptcha).
  2) Регион в подвале — один раз на город → Enter.
  3) Дальше съёмка и листание выдачи автоматически; Enter только при новой капче или смене города.
  Порядок ячеек: сначала все запросы по Москве, затем по Санкт-Петербургу.
`);
}

/** @param {string} message */
async function waitEnter(message) {
  if (!SERP_INTERACTIVE) return;
  const rl = readline.createInterface({ input, output });
  console.log(message);
  await rl.question("\nEnter ");
  rl.close();
}

/** @param {import('playwright').Page} page */
export async function isBlockedPage(page) {
  const pageUrl = page.url();
  if (/showcaptcha|smart-captcha|captcha\.yandex/i.test(pageUrl)) {
    return true;
  }
  const title = await page.title();
  if (/captcha|robot|unusual traffic|подтвердите|automated|не робот/i.test(title)) {
    return true;
  }
  return (
    (await page.locator("form[action*='captcha'], #captcha, .CheckboxCaptcha").count()) > 0
  );
}

/** @param {import('playwright').Page} page */
async function captchaCleared(page) {
  if (await isBlockedPage(page)) return false;
  const url = page.url();
  if (/yandex\.(ru|com|by|kz|ua)/i.test(url)) {
    return /\/search/i.test(url);
  }
  return true;
}

/**
 * Капча: ждём в браузере; Enter — только после таймаута (SERP_CAPTCHA_WAIT_MS).
 * @param {import('playwright').Page} page
 * @param {string} [contextLabel]
 */
async function waitForSerpCaptchaClear(page, contextLabel = "Яндекс") {
  if (captchaSolverEnabled()) {
    const engine = contextLabel.startsWith("Google") ? "google" : "yandex";
    const solved = await trySolveSerpCaptcha(page, { engine, label: contextLabel });
    if (solved && (await captchaCleared(page))) {
      yandexCaptchaSessionOk = true;
      return;
    }
  }

  if (yandexCaptchaSessionOk && (await captchaCleared(page))) {
    return;
  }
  if (await captchaCleared(page)) {
    if (/\/search/i.test(page.url())) {
      yandexCaptchaSessionOk = true;
    }
    return;
  }

  console.log(`
🔐 SmartCaptcha (${contextLabel})
  • Пройдите «Я не робот» и дождитесь выдачи.
  • Пока в адресе showcaptcha — Enter в терминале НЕ жмите.
  • Скрипт ждёт автоматически; Enter только если капча не прошла за ${Math.round(Number(process.env.SERP_CAPTCHA_WAIT_MS || "600000") / 60000)} мин.
`);

  const maxMs = Number(process.env.SERP_CAPTCHA_WAIT_MS || "600000");
  const heartbeatMs = Number(process.env.SERP_CAPTCHA_HEARTBEAT_MS || "30000");
  const start = Date.now();
  let lastHeartbeat = start;
  while (Date.now() - start < maxMs) {
    if (await captchaCleared(page)) {
      await page.waitForTimeout(800);
      console.log(
        contextLabel.startsWith("Яндекс")
          ? "  ✓ Капча пройдена — выберите регион в подвале (скрипт попросит Enter)"
          : `  ✓ Капча пройдена (${contextLabel})`,
      );
      yandexCaptchaSessionOk = true;
      return;
    }
    const now = Date.now();
    if (now - lastHeartbeat >= heartbeatMs) {
      console.log(`  ⏳ ждём прохождения капчи… (${Math.round((now - start) / 1000)} с)`);
      lastHeartbeat = now;
    }
    await page.waitForTimeout(2000);
  }

  await waitEnter(
    `\n⚠️  Капча (${contextLabel}) — Enter только когда открылась страница поиска (не showcaptcha).`,
  );
  yandexCaptchaSessionOk = true;
}

/** @deprecated alias */
async function waitForYandexCaptchaClear(page) {
  return waitForSerpCaptchaClear(page, "Яндекс");
}

/**
 * Регион в подвале — один раз на город.
 * @param {import('./serp-shared.mjs').RegionId} regionId
 */
/** @param {import('playwright').Page} page */
async function scrollPageToFooter(page) {
  try {
    await page.evaluate(() => {
      const footer =
        document.querySelector("footer, .footer, .serp-footer, .Footer") ||
        document.querySelector("[class*='footer' i]");
      if (footer) {
        footer.scrollIntoView({ behavior: "instant", block: "end" });
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(600);
  } catch {
    /* ignore */
  }
}

async function ensureYandexFooterRegion(regionId, page) {
  const label = REGIONS[regionId].label;
  if (yandexFooterRegionLocked === regionId) {
    return;
  }

  await scrollPageToFooter(page);

  await waitEnter(`
▶ Регион «${label}» (lr=${REGIONS[regionId].yandexLr})
  Прокрутите вниз, в подвале выберите «${label}».
  Enter — только когда выдача для этого города на экране (не на капче).
`);
  yandexFooterRegionLocked = regionId;
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
  if (!isSerpPageOpen(page)) {
    throw new Error("Окно браузера закрыто — не снимаем выдачу");
  }
  return page.evaluate(
    ({ engine: eng, urlHelpers }) => {
      const isYandexTrackingHref = eval(`(${urlHelpers.isYandexTrackingHref})`);
      const yandexOrganicUrlFromPathText = eval(`(${urlHelpers.yandexOrganicUrlFromPathText})`);
      const yandexOrganicUrlFromNodeText = eval(`(${urlHelpers.yandexOrganicUrlFromNodeText})`);

      /** @param {Element} node */
      function yandexOrganicUrlFromNodeEl(node) {
        const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
        return yandexOrganicUrlFromNodeText(text);
      }

      /** @param {Element} node @param {HTMLAnchorElement | null} a */
      function yandexOrganicUrl(node, a) {
      if (a?.href && !isYandexTrackingHref(a.href)) {
        try {
          const u = new URL(a.href);
          const host = u.hostname.replace(/^www\./i, "");
          if (!/yandex\.(ru|com|by|kz|ua)$/i.test(host) && !/^yabs\.yandex/i.test(host)) {
            return a.href;
          }
        } catch {
          /* fall through to path */
        }
      }
      const vnlRaw = a?.getAttribute("data-vnl") || node.getAttribute("data-vnl");
      if (vnlRaw) {
        try {
          const vnl = JSON.parse(vnlRaw);
          const u = vnl?.["organic-url"]?.url || vnl?.url || vnl?.href;
          if (typeof u === "string" && /^https?:\/\//i.test(u)) return u;
        } catch {
          /* ignore */
        }
      }
      const pathEl = node.querySelector(
        ".Organic-Path, .Path, .organic__path, .Organic-Subtitle, .organic__subtitle, .Path-Item",
      );
      const pathText = (pathEl?.textContent || "").trim();
      if (pathText) {
        const fromPath = yandexOrganicUrlFromPathText(pathText);
        if (fromPath) return fromPath;
      }
      return yandexOrganicUrlFromNodeEl(node);
    }

    /** @param {Element} node */
    function isYandexOrganicNode(node) {
      if (node.closest(".serp-adv, .AdvLabel, .AdvSplash, [data-fast-name='ad']")) return false;
      if (node.querySelector(".Label_direct, .DirectLabel, .organic__label_direct")) return false;
      const label = (node.querySelector(".Organic-Label, .organic__label")?.textContent || "").trim();
      if (/^промо$/i.test(label)) return false;
      const cls = `${node.className || ""} ${node.getAttribute("data-cid") || ""}`;
      if (/video-unisearch|maps|entity|wizard|store|banner|carousel|related|images/i.test(cls)) {
        return false;
      }
      return !!node.querySelector(
        ".OrganicTitle-Link, a.organic__url, h2.OrganicTitle a, .OrganicTitle a, h2 a[href]",
      );
    }

    /** @type {{ title: string; url: string; snippet: string }[]} */
    const raw = [];
    if (eng === "yandex") {
      const listRoot =
        document.querySelector(
          "#search-result, .serp-list, .Root-Futuris, .main__content, .content__left",
        ) || document.body;
      /** @type {Element[]} */
      const nodeList = [];
      const seen = new Set();
      const pushNodes = (list) => {
        list.forEach((node) => {
          if (node.matches?.("li.serp-item")) {
            const parentItem = node.parentElement?.closest("li.serp-item");
            if (parentItem) return;
          }
          if (!seen.has(node)) {
            seen.add(node);
            nodeList.push(node);
          }
        });
      };
      for (const sel of [
        "#search-result > li.serp-item",
        ".serp-list > li.serp-item",
        "#search-result li.serp-item",
        "li.serp-item",
      ]) {
        pushNodes(listRoot.querySelectorAll(sel));
        if (nodeList.length >= 3) break;
      }
      nodeList.forEach((node) => {
        if (!isYandexOrganicNode(node)) return;
        const a =
          node.querySelector(
            "a.OrganicTitle-Link, a.organic__url, h2.OrganicTitle a, .OrganicTitle a, h2 a[href]",
          ) || node.querySelector('a[href^="http"]');
        const href = yandexOrganicUrl(node, a);
        if (!href) return;
        const title =
          (
            a?.textContent ||
            node.querySelector(".OrganicTitle, h2.OrganicTitle")?.textContent ||
            ""
          ).trim();
        const snippet =
          (
            node.querySelector(".OrganicText, .text-container, .ExtendedText")?.textContent || ""
          ).trim();
        raw.push({ title, url: href, snippet });
      });
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
  },
    {
      engine,
      urlHelpers: {
        isYandexTrackingHref: isYandexTrackingHref.toString(),
        yandexOrganicUrlFromPathText: yandexOrganicUrlFromPathText.toString(),
        yandexOrganicUrlFromNodeText: yandexOrganicUrlFromNodeText.toString(),
      },
    },
  );
}

/**
 * @param {{ title: string; url: string; snippet: string }[]} raw
 * @param {number} [maxCount]
 */
function buildOrganicResults(raw, maxCount = ORGANIC_TARGET) {
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
    if (seen.size >= maxCount) break;
    seen.set(key, {
      position: seen.size + 1,
      title: item.title.slice(0, 300),
      url,
      displayDomain: host,
    });
  }
  return [...seen.values()];
}

/**
 * @param {{ position: number; title: string; url: string; displayDomain: string }[]} page1
 * @param {{ title: string; url: string; snippet: string }[]} raw2
 */
function mergeOrganicSlices(page1, raw2) {
  /** @type {Map<string, { position: number; title: string; url: string; displayDomain: string }>} */
  const seen = new Map();
  for (const r of page1) {
    try {
      const u = new URL(r.url);
      const host = u.hostname.replace(/^www\./i, "");
      seen.set(`${host}${u.pathname}`, r);
    } catch {
      /* skip */
    }
  }
  for (const item of raw2) {
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
  return [...seen.values()];
}

/**
 * Яндекс: до ORGANIC_SERP_PAGES страниц (топ-50 по умолчанию).
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {{ afterPage?: (pageIndex: number) => Promise<void> }} [hooks]
 * @param {SerpStopContext | null} [stopCtx]
 */
async function collectYandexOrganicTop(page, query, regionId, hooks = {}, stopCtx = null) {
  let merged = [];
  const maxPages = YANDEX_PAGINATE ? ORGANIC_SERP_PAGES : 1;

  for (let p = 0; p < maxPages; p++) {
    if (p > 0) {
      await pauseBetweenSerpPageFlips(page, p + 1);
      const url = yandexSearchUrl(query, regionId, p);
      const from = p * ORGANIC_PAGE_SLOTS + 1;
      const to = Math.min((p + 1) * ORGANIC_PAGE_SLOTS, ORGANIC_TARGET);
      console.log(`  → Яндекс стр. ${p + 1} (поз. ${from}–${to}): ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await safePageDelay(page, serpFetchDelayMs());
      if (hooks.afterPage) await hooks.afterPage(p);
    }

    const raw = await extractOrganic(page, "yandex");
    if (p === 0) {
      merged = buildOrganicResults(raw, ORGANIC_PAGE_SLOTS);
      console.log(`  · страница 1: ${merged.length} органических (макс. ${ORGANIC_PAGE_SLOTS})`);
      const serenityOnP1 = merged.find((r) => /serenity\.agency/i.test(r.url));
      if (serenityOnP1) {
        console.log(`  · Serenity на стр. 1: #${serenityOnP1.position} (${serenityOnP1.url})`);
      } else if (raw.some((r) => /serenity\.agency/i.test(r.url))) {
        console.warn(
          "  ⚠️ serenity.agency в сырой выдаче, но не в топ-10 — лишние блоки или порядок парсера",
        );
      }
    } else {
      const before = merged.length;
      merged = mergeOrganicSlices(merged, raw);
      const serenity = merged.find((r) => /serenity\.agency/i.test(r.url));
      if (serenity && serenity.position > before) {
        console.log(`  · Serenity: #${serenity.position} (${serenity.url})`);
      }
    }

    if (stopCtx && shouldStopSerpPagination(merged, stopCtx)) {
      const hit = findSerenityPosition(
        merged,
        stopCtx.primaryDomain,
        stopCtx.preferredPath,
      );
      console.log(
        `  · Serenity на поз. ${hit.position} — остальные страницы выдачи не открываем`,
      );
      break;
    }

    if (merged.length >= ORGANIC_TARGET) break;
  }

  return merged.slice(0, ORGANIC_TARGET);
}

/**
 * Google: до ORGANIC_SERP_PAGES страниц (start=0,10,20…).
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {{ alreadyOnPage1?: boolean; afterPage?: (pageIndex: number) => Promise<void> }} [opts]
 * @param {SerpStopContext | null} [stopCtx]
 */
async function collectGoogleOrganicTop(page, query, regionId, opts = {}, stopCtx = null) {
  if (!isSerpPageOpen(page)) {
    throw new Error("Окно браузера закрыто — не снимаем выдачу");
  }

  let merged = [];
  const maxPages = GOOGLE_PAGINATE ? ORGANIC_SERP_PAGES : 1;

  for (let p = 0; p < maxPages; p++) {
    if (!isSerpPageOpen(page)) {
      throw new Error(`Окно браузера закрыто на стр. ${p + 1} — перезапустите съёмку`);
    }
    if (p === 0) {
      if (!opts.alreadyOnPage1) {
        await gotoCleanGoogleSearch(page, query, regionId, 0);
        await safePageDelay(page, serpFetchDelayMs());
      }
    } else {
      await pauseBetweenSerpPageFlips(page, p + 1);
      const from = p * ORGANIC_PAGE_SLOTS + 1;
      const to = Math.min((p + 1) * ORGANIC_PAGE_SLOTS, ORGANIC_TARGET);
      console.log(
        `  → Google стр. ${p + 1} (поз. ${from}–${to}): ${googleSearchUrl(query, regionId, p)}`,
      );
      await gotoCleanGoogleSearch(page, query, regionId, p);
      await safePageDelay(page, serpFetchDelayMs());
      if (opts.afterPage) await opts.afterPage(p);
    }

    const raw = await extractOrganic(page, "google");
    if (p === 0) {
      merged = buildOrganicResults(raw, ORGANIC_PAGE_SLOTS);
      console.log(`  · Google стр. 1: ${merged.length} органических (макс. ${ORGANIC_PAGE_SLOTS})`);
      const serenityOnP1 = merged.find((r) => /serenity\.agency/i.test(r.url));
      if (serenityOnP1) {
        console.log(`  · Serenity на стр. 1: #${serenityOnP1.position} (${serenityOnP1.url})`);
      }
    } else {
      const before = merged.length;
      merged = mergeOrganicSlices(merged, raw);
      const serenity = merged.find((r) => /serenity\.agency/i.test(r.url));
      if (serenity && serenity.position > before) {
        console.log(`  · Serenity: #${serenity.position} (${serenity.url})`);
      }
    }

    if (stopCtx && shouldStopSerpPagination(merged, stopCtx)) {
      const hit = findSerenityPosition(
        merged,
        stopCtx.primaryDomain,
        stopCtx.preferredPath,
      );
      console.log(
        `  · Serenity на поз. ${hit.position} — остальные страницы выдачи не открываем`,
      );
      break;
    }

    if (merged.length >= ORGANIC_TARGET) break;
  }

  return merged.slice(0, ORGANIC_TARGET);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {SerpStopContext | null} [stopCtx]
 */
async function fetchYandexInteractive(page, query, regionId, stopCtx = null) {
  printYandexWorkflowOnce();

  const searchUrl = yandexSearchUrl(query, regionId);
  const stepLabel = `${query} | yandex | ${REGIONS[regionId].label}`;

  console.log(`\n>>> ${REGIONS[regionId].label}`);
  console.log(`  Запрос: ${query}`);
  console.log(`  URL: ${searchUrl}`);

  const regionBefore = yandexFooterRegionLocked;
  const needRegionStep = regionBefore !== regionId;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await safePageDelay(page, serpFetchDelayMs());

  await waitForYandexCaptchaClear(page);

  if (needRegionStep) {
    await ensureYandexFooterRegion(regionId, page);
  }

  if (await isBlockedPage(page)) {
    console.warn("  ⚠️  Похоже, снова капча — пройдите её и запустите эту ячейку повторно.");
    return { searchUrl, blocked: true, results: [] };
  }

  const results = await collectYandexOrganicTop(
    page,
    query,
    regionId,
    {
      afterPage: async () => {
        await waitForYandexCaptchaClear(page);
      },
    },
    stopCtx,
  );
  console.log(`  ✓ ${stepLabel}: ${results.length} ссылок в топе`);
  if (results.length > 0) {
    console.log(
      `    домены: ${results
        .slice(0, 8)
        .map((r) => r.displayDomain)
        .join(", ")}`,
    );
  }

  return {
    searchUrl,
    blocked: false,
    results,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {SerpStopContext | null} [stopCtx]
 */
async function fetchGoogleInteractive(page, query, regionId, stopCtx = null) {
  const searchUrl = googleSearchUrl(query, regionId);
  const stepLabel = `${query} | google | ${REGIONS[regionId].label}`;
  console.log(`\n>>> Google · ${REGIONS[regionId].label}`);
  console.log(`  Запрос: ${query}`);
  console.log(`  URL: ${searchUrl}`);
  console.log(`  Регион съёмки: ${REGIONS[regionId].label} (в URL только gl/hl; город — geolocation браузера).`);
  console.log(
    "  Если в подвале «Неизвестно» / нет выдачи — «Обновить» или «Сбросить настройки», укажите город.",
  );

  const openedUrl = await gotoCleanGoogleSearch(page, query, regionId);
  await safePageDelay(page, serpFetchDelayMs());
  await logGoogleRegionFromPage(page, regionId);
  await warnIfWrongRegion(page, regionId);

  await waitForSerpCaptchaClear(page, "Google стр. 1");

  const results = await collectGoogleOrganicTop(
    page,
    query,
    regionId,
    {
      alreadyOnPage1: true,
      afterPage: async (p) => {
        await waitForSerpCaptchaClear(page, `Google стр. ${p + 1}`);
      },
    },
    stopCtx,
  );
  console.log(`  ✓ ${stepLabel}: ${results.length} ссылок (топ-${ORGANIC_TARGET})`);
  return {
    searchUrl: openedUrl,
    blocked: (await isBlockedPage(page)) && results.length === 0,
    results,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {'yandex' | 'google'} engine
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {SerpStopContext | null} [stopCtx]
 */
export async function fetchOrganicTop(page, query, engine, regionId, stopCtx = null) {
  if (SERP_INTERACTIVE && engine === "yandex") {
    return fetchYandexInteractive(page, query, regionId, stopCtx);
  }
  if (SERP_INTERACTIVE && engine === "google") {
    return fetchGoogleInteractive(page, query, regionId, stopCtx);
  }

  const searchUrl =
    engine === "yandex" ? yandexSearchUrl(query, regionId) : googleSearchUrl(query, regionId);
  if (engine === "google") {
    await gotoCleanGoogleSearch(page, query, regionId);
  } else {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  }
  await safePageDelay(page, serpFetchDelayMs());

  let blocked = await isBlockedPage(page);
  if (blocked && captchaSolverEnabled()) {
    const solved = await trySolveSerpCaptcha(page, { engine });
    if (solved) blocked = await isBlockedPage(page);
  }
  if (blocked) {
    return { searchUrl, blocked: true, results: [] };
  }
  const results =
    engine === "yandex"
      ? await collectYandexOrganicTop(page, query, regionId, {}, stopCtx)
      : await collectGoogleOrganicTop(
          page,
          query,
          regionId,
          { alreadyOnPage1: true },
          stopCtx,
        );
  return {
    searchUrl,
    blocked: false,
    results,
  };
}

/** @deprecated alias */
export const fetchOrganicTop20 = fetchOrganicTop;

export { createRegionalContext, saveGoogleState } from "./serp-region-context.mjs";
