/**
 * Съёмка органической выдачи (топ-20) для дашборда позиций и gap-отчётов.
 *
 * Интерактивный Яндекс (порядок шагов):
 * 1) открыть URL запроса;
 * 2) капча — ждём, пока сами откроется /search (без Enter на showcaptcha);
 * 3) регион в подвале — один раз на город (Москва, потом СПб), Enter;
 * 4) следующие запросы того же города — только новый URL, Enter на готовой выдаче;
 * 5) съёмка топ-20 (Яндекс: страница 1, при необходимости p=1 для 11–20).
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ORGANIC_TARGET,
  REGIONS,
  YANDEX_SEARCH_ORIGIN,
  isDeniedSerpHost,
} from "./serp-shared.mjs";
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

export const SERP_INTERACTIVE = process.env.SERP_INTERACTIVE === "1";
const DELAY_MS = Number(process.env.SERP_FETCH_DELAY_MS || "1500");

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
/** Яндекс: после 1-й страницы открыть p=1 для позиций 11–20 (0 — только первая страница). */
const YANDEX_PAGINATE =
  process.env.SERP_YANDEX_PAGINATE !== "0" && process.env.SERP_YANDEX_PAGINATE !== "false";
/** Слотов органики на первой странице (вторая = 11–20). */
const YANDEX_PAGE1_SLOTS = 10;
const GOOGLE_PAGE1_SLOTS = 10;
/** Google: вторая страница (start=10). Отключить: SERP_GOOGLE_PAGINATE=0 */
const GOOGLE_PAGINATE =
  process.env.SERP_GOOGLE_PAGINATE !== "0" && process.env.SERP_GOOGLE_PAGINATE !== "false";

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
  1) Капча — дождитесь выдачи сами (Enter не на showcaptcha).
  2) Скрипт прокрутит вниз; выберите регион в подвале → Enter.
  3) Дальше по этому городу скрипт только откроет следующий запрос; регион в сессии сохранится.
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

/**
 * Только капча: выдача открылась, регион ещё не трогаем.
 * @param {import('playwright').Page} page
 */
async function waitForYandexCaptchaClear(page) {
  if (yandexCaptchaSessionOk && !(await isBlockedPage(page))) {
    return;
  }
  if (!(await isBlockedPage(page))) {
    if (/\/search/i.test(page.url())) {
      yandexCaptchaSessionOk = true;
    }
    return;
  }

  console.log(`
🔐 SmartCaptcha
  • Пройдите «Я не робот» и дождитесь страницы поиска (${YANDEX_SEARCH_ORIGIN}/search…).
  • Пока в адресе showcaptcha — Enter в терминале НЕ жмите.
  • Скрипт страницу не перезагружает.
`);

  const maxMs = Number(process.env.SERP_CAPTCHA_WAIT_MS || "600000");
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const url = page.url();
    if (!/showcaptcha|smart-captcha/i.test(url) && !(await isBlockedPage(page))) {
      if (/\/search/i.test(url)) {
        await page.waitForTimeout(800);
        console.log("  ✓ Капча пройдена — выберите регион в подвале (скрипт попросит Enter)");
        yandexCaptchaSessionOk = true;
        return;
      }
    }
    await page.waitForTimeout(2000);
  }

  await waitEnter("\n⚠️  Долго на капче. Enter только когда открылась страница поиска (не showcaptcha).");
  yandexCaptchaSessionOk = true;
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

/**
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {boolean} regionJustSet
 */
async function confirmYandexCaptureReady(regionId, regionJustSet) {
  if (regionJustSet) {
    return;
  }
  await waitEnter(`
▶ Запрос открыт, регион «${REGIONS[regionId].label}» уже выбран в сессии.
  Проверьте выдачу в браузере → Enter для съёмки позиции.
`);
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
function mergeYandexPage1And2(page1, raw2) {
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
 * Яндекс: стр. 1 (до 10 органики) + всегда p=1 для 11–20.
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {{ afterPage1?: () => Promise<void> }} [hooks]
 */
async function collectYandexOrganicTop20(page, query, regionId, hooks = {}) {
  const raw1 = await extractOrganic(page, "yandex");
  const page1 = buildOrganicResults(raw1, YANDEX_PAGE1_SLOTS);
  const serenityOnP1 = page1.find((r) => /serenity\.agency/i.test(r.url));
  console.log(`  · страница 1: ${page1.length} органических (макс. ${YANDEX_PAGE1_SLOTS})`);
  if (page1.length > 0) {
    console.log(
      `  · топ: ${page1.map((r) => `${r.position}) ${r.displayDomain}`).join(", ")}`,
    );
  }
  if (serenityOnP1) {
    console.log(`  · Serenity на стр. 1: #${serenityOnP1.position} (${serenityOnP1.url})`);
  } else if (raw1.some((r) => /serenity\.agency/i.test(r.url))) {
    console.warn(
      "  ⚠️ serenity.agency есть в сырой выдаче, но не в топ-10 — лишние блоки или порядок парсера",
    );
  }

  if (!YANDEX_PAGINATE) {
    return buildOrganicResults(raw1);
  }

  const page2Url = yandexSearchUrl(query, regionId, 1);
  console.log(`  → вторая страница выдачи (p=1, позиции 11–20): ${page2Url}`);
  await page.goto(page2Url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await safePageDelay(page, DELAY_MS);
  if (hooks.afterPage1) await hooks.afterPage1();
  const raw2 = await extractOrganic(page, "yandex");
  const merged = mergeYandexPage1And2(page1, raw2);
  const serenityOnP2 = merged.find((r) => /serenity\.agency/i.test(r.url));
  if (serenityOnP2 && !serenityOnP1) {
    console.log(`  · Serenity на стр. 2: #${serenityOnP2.position} (${serenityOnP2.url})`);
  }
  return merged;
}

/**
 * Google: стр. 1 (до 10 органики) + start=10 для 11–20.
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 * @param {{ alreadyOnPage1?: boolean; afterPage1?: () => Promise<void> }} [opts]
 */
async function collectGoogleOrganicTop20(page, query, regionId, opts = {}) {
  if (!isSerpPageOpen(page)) {
    throw new Error("Окно браузера закрыто — не снимаем выдачу");
  }
  if (!opts.alreadyOnPage1) {
    await gotoCleanGoogleSearch(page, query, regionId, 0);
    await safePageDelay(page, DELAY_MS);
  }

  const raw1 = await extractOrganic(page, "google");
  const page1 = buildOrganicResults(raw1, GOOGLE_PAGE1_SLOTS);
  const serenityOnP1 = page1.find((r) => /serenity\.agency/i.test(r.url));
  console.log(`  · Google стр. 1: ${page1.length} органических (макс. ${GOOGLE_PAGE1_SLOTS})`);
  if (serenityOnP1) {
    console.log(`  · Serenity на стр. 1: #${serenityOnP1.position} (${serenityOnP1.url})`);
  }

  if (!GOOGLE_PAGINATE) {
    return buildOrganicResults(raw1);
  }

  const page2Url = googleSearchUrl(query, regionId, 1);
  console.log(`  → Google стр. 2 (позиции 11–20): ${page2Url}`);
  await gotoCleanGoogleSearch(page, query, regionId, 1);
  await safePageDelay(page, DELAY_MS);
  if (opts.afterPage1) await opts.afterPage1();
  if (!isSerpPageOpen(page)) {
    throw new Error("Окно браузера закрыто на стр. 2 — перезапустите съёмку");
  }
  const raw2 = await extractOrganic(page, "google");
  const merged = mergeYandexPage1And2(page1, raw2);
  const serenityOnP2 = merged.find((r) => /serenity\.agency/i.test(r.url));
  if (serenityOnP2 && !serenityOnP1) {
    console.log(`  · Serenity на стр. 2: #${serenityOnP2.position} (${serenityOnP2.url})`);
  }
  return merged;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {import('./serp-shared.mjs').RegionId} regionId
 */
async function fetchYandexInteractive(page, query, regionId) {
  printYandexWorkflowOnce();

  const searchUrl = yandexSearchUrl(query, regionId);
  const stepLabel = `${query} | yandex | ${REGIONS[regionId].label}`;

  console.log(`\n>>> ${REGIONS[regionId].label}`);
  console.log(`  Запрос: ${query}`);
  console.log(`  URL: ${searchUrl}`);

  const regionBefore = yandexFooterRegionLocked;
  const needRegionStep = regionBefore !== regionId;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await safePageDelay(page, DELAY_MS);

  await waitForYandexCaptchaClear(page);

  if (needRegionStep) {
    await ensureYandexFooterRegion(regionId, page);
  } else {
    await confirmYandexCaptureReady(regionId, false);
  }

  if (await isBlockedPage(page)) {
    console.warn("  ⚠️  Похоже, снова капча — пройдите её и запустите эту ячейку повторно.");
    return { searchUrl, blocked: true, results: [] };
  }

  const results = await collectYandexOrganicTop20(page, query, regionId, {
    afterPage1: async () => {
      await waitForYandexCaptchaClear(page);
    },
  });
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
 */
async function fetchGoogleInteractive(page, query, regionId) {
  const searchUrl = googleSearchUrl(query, regionId);
  const stepLabel = `${query} | google | ${REGIONS[regionId].label}`;
  console.log(`\n>>> Google · ${REGIONS[regionId].label}`);
  console.log(`  Запрос: ${query}`);
  console.log(`  URL: ${searchUrl}`);
  console.log(`  Регион съёмки: ${REGIONS[regionId].label} (в URL только gl/hl; город — geolocation браузера).`);
  console.log(
    "  Если в подвале «Неизвестно» / нет выдачи — «Обновить» или «Сбросить настройки», укажите город, Enter.",
  );

  const openedUrl = await gotoCleanGoogleSearch(page, query, regionId);
  await safePageDelay(page, DELAY_MS);
  await logGoogleRegionFromPage(page, regionId);
  await warnIfWrongRegion(page, regionId);

  const blocked = await isBlockedPage(page);
  if (blocked) {
    await waitEnter("▶ Google: решите капчу → Enter когда видите стр. 1.");
  } else {
    await waitEnter("▶ Google стр. 1 → Enter (далее откроется стр. 2, start=10).");
  }

  const results = await collectGoogleOrganicTop20(page, query, regionId, {
    alreadyOnPage1: true,
    afterPage1: async () => {
      const blocked2 = await isBlockedPage(page);
      if (blocked2) {
        await waitEnter("▶ Google стр. 2: капча → Enter.");
      } else {
        await waitEnter("▶ Google стр. 2 → Enter.");
      }
    },
  });
  console.log(`  ✓ ${stepLabel}: ${results.length} ссылок (стр. 1–2)`);
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
 */
export async function fetchOrganicTop20(page, query, engine, regionId) {
  if (SERP_INTERACTIVE && engine === "yandex") {
    return fetchYandexInteractive(page, query, regionId);
  }
  if (SERP_INTERACTIVE && engine === "google") {
    return fetchGoogleInteractive(page, query, regionId);
  }

  const searchUrl =
    engine === "yandex" ? yandexSearchUrl(query, regionId) : googleSearchUrl(query, regionId);
  if (engine === "google") {
    await gotoCleanGoogleSearch(page, query, regionId);
  } else {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  }
  await safePageDelay(page, DELAY_MS);

  const blocked = await isBlockedPage(page);
  if (blocked) {
    return { searchUrl, blocked: true, results: [] };
  }
  const results =
    engine === "yandex"
      ? await collectYandexOrganicTop20(page, query, regionId)
      : await collectGoogleOrganicTop20(page, query, regionId, { alreadyOnPage1: true });
  return {
    searchUrl,
    blocked: false,
    results,
  };
}

export { createRegionalContext, saveGoogleState } from "./serp-region-context.mjs";
