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
 * Google uule: каноническое имя локации → параметр uule.
 * @param {string} canonical e.g. "Moscow,Moscow Oblast,Russia"
 */
export function encodeGoogleUule(canonical) {
  return "w+CAIQICI" + Buffer.from(canonical, "utf8").toString("base64");
}

/** @param {RegionId} regionId */
export function googleSearchUrl(query, regionId) {
  const r = REGIONS[regionId];
  const uule = encodeGoogleUule(r.googleCanon);
  const params = new URLSearchParams({
    q: query,
    gl: "ru",
    hl: "ru",
    cr: "countryRU",
    pws: "0",
    num: "30",
    uule,
  });
  return `https://www.google.ru/search?${params.toString()}`;
}

/** @param {RegionId} regionId */
export function yandexSearchUrl(query, regionId) {
  const r = REGIONS[regionId];
  const params = new URLSearchParams({
    text: query,
    lr: String(r.yandexLr),
    lang: "ru",
  });
  return `https://yandex.ru/search/?${params.toString()}`;
}

const GOOGLE_STATE = path.join(ARTIFACTS_DIR, "playwright-google-ru-state.json");

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

  if (opts.engine === "google") {
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(GOOGLE_STATE)) {
        options.storageState = GOOGLE_STATE;
      }
    } catch {
      /* ignore */
    }
  }

  const context = await browser.newContext(options);

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

  return context;
}

/** @param {import('playwright').BrowserContext} context */
export async function saveGoogleState(context) {
  const fs = await import("node:fs");
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  await context.storageState({ path: GOOGLE_STATE });
  console.log("SERP: сохранён storageState Google →", GOOGLE_STATE);
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
  const ok =
    (regionId === "moscow" && (body.includes("москв") || body.includes("moscow"))) ||
    (regionId === "spb" &&
      (body.includes("санкт-петербург") ||
        body.includes("петербург") ||
        body.includes("saint petersburg")));
  if (!ok && body.length > 500) {
    console.warn(
      `\n⚠️  Не видно явной привязки к «${expected}» в тексте страницы — проверьте регион вручную.\n`,
    );
    return true;
  }
  return false;
}
