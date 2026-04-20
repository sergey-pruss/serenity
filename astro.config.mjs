import { defineConfig } from "astro/config";

/**
 * Статический сайт с теми же URL, что на проде (без смены путей для SEO).
 * Главная при наличии снимка — полный HTML Nuxt (`publish/index.frozen.html` или `index.html`).
 */
export default defineConfig({
  site: "https://serenity.agency",
  trailingSlash: "never",
  compressHTML: false,
});
