/**
 * План URL = как на https://serenity.agency (без смены путей для SEO).
 * Реализованные в Astro — см. `src/pages/`; остальное добавляем поэтапно.
 */
export const plannedTopRoutes = [
  "/",
  "/case/all",
  "/services",
  "/about",
  "/blog",
  "/career/vacancy",
  "/contacts",
] as const;

/** Позже: /case/{slug}, /case/all/category/{code}, /blog/article/{slug}, услуги-лендинги и т.д. */
