/**
 * ESM-обёртка над canonical-url.cjs (единственный источник логики).
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const cjs = require("./canonical-url.cjs");

export const SITE_ORIGIN = cjs.SITE_ORIGIN;
export const pathnameNoTrailingSlash = cjs.pathnameNoTrailingSlash;
export const formatCanonicalUrl = cjs.formatCanonicalUrl;
export const canonicalUrlFromPath = cjs.canonicalUrlFromPath;
export const ensureCanonicalUrlNoSlash = cjs.ensureCanonicalUrlNoSlash;
