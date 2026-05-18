/**
 * Канон URL статического контура: без завершающего слэша (включая главную).
 */
const SITE_ORIGIN = "https://serenity.agency";

function pathnameNoTrailingSlash(pathname) {
  let p = String(pathname || "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function formatCanonicalUrl(urlLike) {
  const u = new URL(
    String(urlLike).includes("://")
      ? urlLike
      : `${SITE_ORIGIN}${String(urlLike).startsWith("/") ? urlLike : `/${urlLike}`}`,
  );
  const p = pathnameNoTrailingSlash(u.pathname);
  if (p === "/" && !u.search && !u.hash) return u.origin;
  return `${u.origin}${p}${u.search}${u.hash}`;
}

function canonicalUrlFromPath(pathname) {
  return formatCanonicalUrl(pathname);
}

function ensureCanonicalUrlNoSlash(url) {
  const raw = String(url || "").trim();
  if (!raw) return SITE_ORIGIN;
  try {
    return formatCanonicalUrl(raw);
  } catch {
    return canonicalUrlFromPath(raw);
  }
}

module.exports = {
  SITE_ORIGIN,
  pathnameNoTrailingSlash,
  formatCanonicalUrl,
  canonicalUrlFromPath,
  ensureCanonicalUrlNoSlash,
};
