import { isDeniedSerpHost } from "./serp-shared.mjs";

/** @param {string} url */
export function isSerpJunkUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (isDeniedSerpHost(host)) return true;
    if (/^yabs\.yandex\./i.test(host)) return true;
    if (/^an\.yandex\./i.test(host)) return true;
    if (/yandex\.(ru|com|by|kz|ua)/i.test(host) && /^\/count\//i.test(u.pathname)) {
      return true;
    }
    if (/[?&](yclid|ysclid)=/i.test(u.href)) return true;
    if (u.pathname.length > 120 && /yandex/i.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * @param {{ url: string; title?: string; snippet?: string; displayDomain?: string; source?: string }[]} results
 */
export function sanitizeSerpResults(results) {
  const out = [];
  const seen = new Set();
  for (const r of results || []) {
    if (!r?.url || isSerpJunkUrl(r.url)) continue;
    let host = "";
    try {
      host = new URL(r.url).hostname.replace(/^www\./i, "");
    } catch {
      continue;
    }
    const key = host + new URL(r.url).pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...r,
      displayDomain: host,
      position: out.length + 1,
    });
  }
  return out;
}
