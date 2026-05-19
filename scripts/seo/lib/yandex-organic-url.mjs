/**
 * Извлечение канонического URL органики Яндекса из строки пути (Organic-Path, innerText).
 * Используется в браузере (page.evaluate) и в node-тестах.
 */

/** @param {string} href */
export function isYandexTrackingHref(href) {
  return (
    !href ||
    /yandex\.(ru|com)\/clck|ya\.ru\/clck/i.test(href) ||
    href.includes("/search?") ||
    /yabs\.yandex/i.test(href) ||
    /yandex\.(ru|com)\/count\//i.test(href)
  );
}

/** @param {string} pathText */
export function yandexOrganicUrlFromPathText(pathText) {
  const text = (pathText || "").trim();
  if (!text) return null;

  const chevronPath = text.match(/^([a-z0-9][-a-z0-9.]*\.[a-z]{2,})\s*[›»>]\s*(\S+)/i);
  if (chevronPath) {
    let p = chevronPath[2].replace(/\s+/g, "");
    if (!p.startsWith("/")) p = `/${p}`;
    return `https://${chevronPath[1].replace(/^www\./i, "")}${p}`;
  }

  const slashHost = text.match(/^([a-z0-9][-a-z0-9.]*\.[a-z]{2,})(\/[^\s]*)$/i);
  if (slashHost) {
    return `https://${slashHost[1].replace(/^www\./i, "")}${slashHost[2]}`;
  }

  const lines = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    const hostLine = lines[0].replace(/^www\./i, "");
    if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}$/i.test(hostLine)) {
      let p = lines.slice(1).join("/").replace(/\s+/g, "");
      if (p && !p.startsWith("/")) p = `/${p}`;
      return `https://${hostLine}${p || "/"}`;
    }
  }

  const parts = text.split(/[›»>]/).map((s) => s.trim()).filter(Boolean);
  const host = (parts[0] || "").replace(/^www\./i, "");
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}$/i.test(host)) {
    let p = parts.slice(1).join("/").replace(/\s+/g, "");
    if (p && !p.startsWith("/")) p = `/${p}`;
    return `https://${host}${p || "/"}`;
  }

  return null;
}

/** @param {string} text */
export function yandexOrganicUrlFromNodeText(text) {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  const chevron = normalized.match(
    /\b([a-z0-9][-a-z0-9.]*\.[a-z]{2,})\s*[›»>]\s*([a-z0-9][_\w/-]+)/i,
  );
  if (chevron && !/yandex\.(ru|com)|google\./i.test(chevron[1])) {
    let p = chevron[2].replace(/\s+/g, "");
    if (!p.startsWith("/")) p = `/${p}`;
    return `https://${chevron[1].replace(/^www\./i, "")}${p}`;
  }
  const slash = normalized.match(/\b([a-z0-9][-a-z0-9.]*\.[a-z]{2,})(\/[a-z0-9][_\w/-]*)/i);
  if (slash && !/yandex\.(ru|com)|google\./i.test(slash[1])) {
    return `https://${slash[1].replace(/^www\./i, "")}${slash[2]}`;
  }
  return null;
}
