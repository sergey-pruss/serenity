import path from "node:path";
import { ARTIFACTS_DIR, REGIONS } from "./kontekstnaya-serp-config.mjs";

/** @typedef {keyof typeof REGIONS} RegionId */

const WRONG_REGION_HINTS = [
  "bangkok",
  "бангкок",
  "thailand",
  "таиланд",
  "singapore",
  "сингапур",
  "dubai",
  "дубай",
];

/**
 * URL выдачи Google без uule/cr/pws — иначе часто «ничего не найдено»,
 * пока вручную не нажать «Сбросить настройки». Регион при съёмке — geolocation
 * в браузере и «Результаты для …» в подвале; в ссылке из дашборда — только RU.
 * @param {string} query
 * @param {RegionId} [_regionId]
 * @param {number} [page] 0 — первая страница, 1 — вторая (start=10, позиции 11–20)
 */
export function googleSearchUrl(query, _regionId, page = 0) {
  const params = new URLSearchParams({
    q: query,
    hl: "ru",
    gl: "ru",
  });
  if (page > 0) {
    params.set("start", String(page * 10));
  }
  return `https://www.google.ru/search?${params.toString()}`;
}

/**
 * @param {RegionId} regionId
 * @param {number} [page] 0 — первая страница, 1 — вторая (позиции ~11–20)
 */
export function yandexSearchUrl(query, regionId, page = 0) {
  const r = REGIONS[regionId];
  const ncrnd = process.env.SERP_YANDEX_NCRND || String(Math.floor(Math.random() * 9000) + 1000);
  const params = new URLSearchParams({
    lang: "ru",
    ncrnd,
    text: query,
    lr: String(r.yandexLr),
  });
  if (page > 0) params.set("p", String(page));
  return `https://yandex.ru/search?${params.toString()}`;
}

/** @param {RegionId} regionId */
export function googleStatePath(regionId) {
  return path.join(ARTIFACTS_DIR, `playwright-google-ru-${regionId}-state.json`);
}

/** Общий файл прошлых съёмок — только для Москвы при миграции. */
const GOOGLE_STATE_LEGACY = path.join(ARTIFACTS_DIR, "playwright-google-ru-state.json");

/** Параметры, которые Google подставляет из storageState и ломают выдачу. */
const GOOGLE_POLLUTED_PARAMS = ["uule", "cr", "pws", "num"];

/** Интерактив: не подхватывать storageState (там застревает старый uule). */
function googleUsesStorageState() {
  return (
    process.env.SERP_INTERACTIVE !== "1" &&
    process.env.SERP_GOOGLE_STORAGE_STATE === "1"
  );
}

/** @param {string} urlString */
export function isPollutedGoogleSearchUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (!/google\./i.test(u.hostname)) return false;
    return GOOGLE_POLLUTED_PARAMS.some((k) => u.searchParams.has(k));
  } catch {
    return false;
  }
}

/**
 * Открыть выдачу Google по чистому URL (без uule/cr/pws).
 * @param {import('playwright').Page} page
 * @param {string} query
 * @param {RegionId} regionId
 */
export async function gotoCleanGoogleSearch(page, query, regionId, pageNum = 0) {
  const target = googleSearchUrl(query, regionId, pageNum);

  async function goOnce() {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 90000 });
  }

  await goOnce();
  if (!isPollutedGoogleSearchUrl(page.url())) return target;

  console.log(
    "  ⚠️ Google подставил uule/cr из cookies — очищаем сессию и открываем снова:",
  );
  console.log(`     ${target}`);
  await page.context().clearCookies();
  await goOnce();
  if (isPollutedGoogleSearchUrl(page.url())) {
    console.warn(
      `  ⚠️ В адресной строке всё ещё лишние параметры. Нажмите «Сбросить настройки» на странице.`,
    );
    console.warn(
      "     Либо удалите artifacts/seo/playwright-google-ru-*.json и перезапустите съёмку.",
    );
  }
  return target;
}

/**
 * @param {import('playwright').Browser} browser
 * @param {RegionId} regionId
 * @param {{ engine?: 'yandex' | 'google' }} [opts]
 */
export async function createRegionalContext(browser, regionId, opts = {}) {
  const r = REGIONS[regionId];
  /** @type {import('playwright').BrowserContextOptions} */
  const options = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    geolocation: { latitude: r.lat, longitude: r.lon },
    permissions: ["geolocation"],
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  };

  if (opts.engine === "google" && googleUsesStorageState()) {
    try {
      const fs = await import("node:fs");
      const statePath = googleStatePath(regionId);
      if (fs.existsSync(statePath)) {
        options.storageState = statePath;
      } else if (regionId === "moscow" && fs.existsSync(GOOGLE_STATE_LEGACY)) {
        options.storageState = GOOGLE_STATE_LEGACY;
      }
    } catch {
      /* ignore */
    }
  }

  const context = await browser.newContext(options);

  // В интерактиве регион в подвале — не подменяем yandex_gid (иначе сброс капчи/региона).
  if (process.env.SERP_INTERACTIVE !== "1" || process.env.SERP_YANDEX_FORCE_COOKIES === "1") {
    await context.addCookies([
      {
        name: "yandex_gid",
        value: String(r.yandexLr),
        domain: ".yandex.ru",
        path: "/",
      },
      {
        name: "gdpr",
        value: "0",
        domain: ".yandex.ru",
        path: "/",
      },
    ]);
  }

  return context;
}

/**
 * WebKit (Safari) — интерактивная съёмка Яндекс и Google.
 * @param {RegionId} regionId
 * @param {{ engine?: 'yandex' | 'google' }} [opts]
 * @returns {Promise<import('playwright').BrowserContext>}
 */
export async function launchSerpWebKitContext(regionId, opts = {}) {
  const { webkit } = await import("playwright");
  const r = REGIONS[regionId];
  const browser = await webkit.launch({ headless: false });
  /** @type {import('playwright').BrowserContextOptions} */
  const contextOptions = {
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    geolocation: { latitude: r.lat, longitude: r.lon },
    permissions: ["geolocation"],
    viewport: { width: 1366, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    extraHTTPHeaders: {
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  };
  if (opts.engine === "google" && googleUsesStorageState()) {
    try {
      const fs = await import("node:fs");
      const statePath = googleStatePath(regionId);
      if (fs.existsSync(statePath)) {
        contextOptions.storageState = statePath;
      } else if (regionId === "moscow" && fs.existsSync(GOOGLE_STATE_LEGACY)) {
        contextOptions.storageState = GOOGLE_STATE_LEGACY;
      }
    } catch {
      /* ignore */
    }
  }
  const context = await browser.newContext(contextOptions);
  /** @type {import('playwright').BrowserContext & { _serenityBrowser?: import('playwright').Browser }} */
  const tagged = context;
  tagged._serenityBrowser = browser;
  return tagged;
}

/** @returns {Promise<import('playwright').BrowserContext>} */
export async function launchYandexWebKitContext() {
  return launchSerpWebKitContext("moscow", { engine: "yandex" });
}

/** @param {import('playwright').BrowserContext} context */
export async function closeSerpWebKitContext(context) {
  const browser = /** @type {{ _serenityBrowser?: import('playwright').Browser }} */ (context)
    ._serenityBrowser;
  await context.close();
  if (browser) await browser.close();
}

/** @param {import('playwright').BrowserContext} context */
export async function closeYandexBrowserContext(context) {
  return closeSerpWebKitContext(context);
}

/**
 * @param {import('playwright').BrowserContext} context
 * @param {RegionId} regionId
 */
export async function saveGoogleState(context, regionId) {
  if (!googleUsesStorageState()) return;
  const fs = await import("node:fs");
  const statePath = googleStatePath(regionId);
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  await context.storageState({ path: statePath });
  console.log(`SERP: сохранён storageState Google (${REGIONS[regionId].label}) →`, statePath);
}

/**
 * Подсказка из выдачи Google («Результаты для …»), если блок виден без прокрутки.
 * @param {import('playwright').Page} page
 * @param {RegionId} regionId
 */
export async function logGoogleRegionFromPage(page, regionId) {
  const hint = await page.evaluate(() => {
    const text = (document.body?.innerText || "").slice(0, 12000);
    const m = text.match(/Результаты для\s+([^\n]+)/i);
    return m ? m[1].trim() : null;
  });
  if (hint) {
    console.log(`  Google на странице: «Результаты для ${hint}»`);
  } else {
    console.log(
      `  Строку «Результаты для …» не видно (подвал) — ориентир: ${REGIONS[regionId].label}.`,
    );
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {RegionId} regionId
 */
export async function warnIfWrongRegion(page, regionId) {
  const expected = REGIONS[regionId].label.toLowerCase();
  const body = ((await page.textContent("body")) || "").toLowerCase();
  const wrong = WRONG_REGION_HINTS.find((h) => body.includes(h));
  if (wrong) {
    console.warn(
      `\n⚠️  На странице есть «${wrong}» — похоже, регион НЕ ${REGIONS[regionId].label}.`,
    );
    console.warn(
      "   Google: внизу страницы «Результаты для …» → укажите Москву или Санкт-Петербург.",
    );
    console.warn("   Яндекс: проверьте «Из Москвы» / lr в URL.\n");
    return true;
  }
  if (
    regionId === "spb" &&
    (/\b109\d{3}\b/.test(body) || body.includes("москва — с вашего устройства"))
  ) {
    console.warn(
      "\n⚠️  Google в подвале показывает Москву (IP/устройство), а не Санкт-Петербург.",
    );
    console.warn(
      "   Внизу страницы: «… — Обновить» → укажите Санкт-Петербург, затем Enter в терминале.\n",
    );
    return true;
  }

  const ok =
    regionId === "rf" ||
    (regionId === "moscow" && (body.includes("москв") || body.includes("moscow"))) ||
    (regionId === "spb" &&
      (body.includes("санкт-петербург") ||
        body.includes("петербург") ||
        body.includes("saint petersburg")));
  if (!ok && body.length > 500 && regionId !== "rf") {
    console.warn(
      `\n⚠️  Не видно явной привязки к «${expected}» в тексте страницы — проверьте регион вручную.\n`,
    );
    return true;
  }
  return false;
}
