/** @typedef {'yandex' | 'google'} SearchEngine */
/** @typedef {'moscow' | 'spb' | 'rf'} RegionId */

export const ORGANIC_TARGET = 20;

export const YANDEX_SEARCH_ORIGIN = (
  process.env.SERP_YANDEX_ORIGIN || "https://yandex.ru"
).replace(/\/$/, "");

/** Интерактивная съёмка: WebKit (Safari). Откат: SERP_BROWSER=chromium или SERP_YANDEX_BROWSER=chromium */
export function serpUseWebKit() {
  const browser = process.env.SERP_BROWSER || process.env.SERP_YANDEX_BROWSER;
  if (browser === "chromium") return false;
  if (browser === "webkit") return true;
  return process.env.SERP_INTERACTIVE === "1";
}

/** @deprecated используйте serpUseWebKit */
export function yandexUseWebKit() {
  return serpUseWebKit();
}

/** @type {Record<RegionId, { label: string; yandexLr: number; googleCanon: string; lat: number; lon: number }>} */
export const REGIONS = {
  moscow: {
    label: "Москва",
    yandexLr: 213,
    googleCanon: "Moscow,Moscow Oblast,Russia",
    lat: 55.7558,
    lon: 37.6173,
  },
  spb: {
    label: "Санкт-Петербург",
    yandexLr: 2,
    googleCanon: "Saint Petersburg,Saint Petersburg,Russia",
    lat: 59.9343,
    lon: 30.3351,
  },
  rf: {
    label: "Россия",
    yandexLr: 225,
    googleCanon: "Russia",
    lat: 55.7558,
    lon: 37.6173,
  },
};

/** Регионы для gap/SERP-кампаний kontekstnaya и targeting (без РФ). */
export const GAP_REGION_IDS = /** @type {const} */ (["moscow", "spb"]);

/** @type {SearchEngine[]} */
export const ENGINES = ["yandex", "google"];

export const SERP_DENY_HOST_PATTERNS = [
  /^yandex\./i,
  /^google\./i,
  /^go\.yandex\./i,
  /^uslugi\.yandex\./i,
  /^maps\./i,
  /^www\.google\./i,
  /^accounts\.google\./i,
  /^support\.google\./i,
  /^youtube\.com$/i,
  /^youtu\.be$/i,
  /^wikipedia\.org$/i,
  /^ru\.wikipedia\.org$/i,
  /^dzen\.ru$/i,
  /^zen\.yandex\./i,
  /^vk\.com$/i,
  /^ok\.ru$/i,
  /^t\.me$/i,
  /^webmaster\.yandex\./i,
  /^wordstat\.yandex\./i,
  /^direct\.yandex\./i,
  /^yandex\.ru$/i,
];

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..", "..");
export const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "seo");

/** @param {string} host */
export function isDeniedSerpHost(host) {
  const h = String(host || "")
    .replace(/^www\./i, "")
    .toLowerCase();
  return SERP_DENY_HOST_PATTERNS.some((re) => re.test(h) || re.test(`www.${h}`));
}

/**
 * @param {string} queryId
 * @param {SearchEngine} engine
 * @param {RegionId} regionId
 */
export function serpMatrixKey(queryId, engine, regionId) {
  return `${queryId}__${engine}__${regionId}`;
}
