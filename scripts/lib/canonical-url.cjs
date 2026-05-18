/**
 * Канон URL статического контура: без завершающего слэша (кроме корня `/`).
 */
const SITE_ORIGIN = "https://serenity.agency";

function pathnameNoTrailingSlash(pathname) {
  let p = String(pathname || "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function canonicalUrlFromPath(pathname) {
  return `${SITE_ORIGIN}${pathnameNoTrailingSlash(pathname)}`;
}

function ensureCanonicalUrlNoSlash(url) {
  const raw = String(url || "").trim();
  if (!raw) return `${SITE_ORIGIN}/`;
  try {
    const u = new URL(raw.includes("://") ? raw : `${SITE_ORIGIN}${raw.startsWith("/") ? raw : `/${raw}`}`);
    u.pathname = pathnameNoTrailingSlash(u.pathname);
    return `${u.origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return canonicalUrlFromPath(raw);
  }
}

module.exports = {
  SITE_ORIGIN,
  pathnameNoTrailingSlash,
  canonicalUrlFromPath,
  ensureCanonicalUrlNoSlash,
};
