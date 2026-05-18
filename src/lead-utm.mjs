/**
 * Нормализация UTM для заявок: yclid/gclid, дефолт direct/none (как в GA).
 * Держать в синхроне с js/leave-request-cta.js (клиент не импортирует этот модуль).
 */

export const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const EMPTY_VALUES = new Set(["", "(not set)", "(none)", "undefined", "null"]);

export function pickUtmScalar(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s || EMPTY_VALUES.has(s.toLowerCase())) return "";
  return s;
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {Record<string, string>}
 */
export function inferUtmFromSearchParams(searchParams) {
  const out = {};
  if (!searchParams) return out;

  for (const param of UTM_PARAMS) {
    const v = pickUtmScalar(searchParams.get(param));
    if (v) out[param] = v;
  }

  if (pickUtmScalar(searchParams.get("yclid"))) {
    if (!out.utm_source) out.utm_source = "yandex";
    if (!out.utm_medium) out.utm_medium = "cpc";
  }
  if (pickUtmScalar(searchParams.get("gclid"))) {
    if (!out.utm_source) out.utm_source = "google";
    if (!out.utm_medium) out.utm_medium = "cpc";
  }
  if (pickUtmScalar(searchParams.get("fbclid"))) {
    if (!out.utm_source) out.utm_source = "facebook";
    if (!out.utm_medium) out.utm_medium = "cpc";
  }

  if (out.utm_source === "yadirect") out.utm_source = "yandex";

  return out;
}

/**
 * @param {string} [sourceUrl]
 * @returns {Record<string, string>}
 */
export function parseUtmFromSourceUrl(sourceUrl) {
  if (!sourceUrl) return {};
  try {
    return inferUtmFromSearchParams(new URL(sourceUrl).searchParams);
  } catch {
    return {};
  }
}

/**
 * @param {Array<Record<string, string> | null | undefined>} parts
 * @returns {Record<string, string>}
 */
export function mergeUtmParts(...parts) {
  const merged = {};
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    for (const param of UTM_PARAMS) {
      const v = pickUtmScalar(part[param]);
      if (v) merged[param] = v;
    }
  }
  return merged;
}

/**
 * @param {Record<string, string>} utm
 * @returns {Record<string, string>}
 */
export function finalizeLeadUtm(utm) {
  const out = { ...utm };
  if (!out.utm_source) out.utm_source = "direct";
  if (!out.utm_medium) out.utm_medium = "none";
  return out;
}

/**
 * @param {Record<string, unknown>} [data] поля формы
 * @param {string} [sourceUrl] страница отправки
 * @returns {Record<string, string>}
 */
export function normalizeLeadUtm(data, sourceUrl) {
  const fromData = {};
  if (data && typeof data === "object") {
    for (const param of UTM_PARAMS) {
      const v = pickUtmScalar(data[param]);
      if (v) fromData[param] = v;
    }
  }
  return finalizeLeadUtm(mergeUtmParts(parseUtmFromSourceUrl(sourceUrl), fromData));
}
