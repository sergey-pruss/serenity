#!/usr/bin/env node
/**
 * Единая точка сборки страницы услуги из prod-среза + json/services/<slug>/.
 *
 *   node scripts/assemble-service-from-prod-layout.cjs kontekstnaya_reklama
 *   node scripts/assemble-service-from-prod-layout.cjs targeting
 *   SERVICE_SLUG=targeting node scripts/assemble-service-from-prod-layout.cjs
 *
 * Контракт: json/services/<slug>/service.config.json
 * Пайплайны пока в assemble-kontekstnaya-from-prod-layout.cjs / assemble-targeting-from-prod-layout.cjs.
 */
const { loadServiceConfig, listServiceSlugs } = require("./lib/load-service-config.cjs");

const PIPELINES = {
  kontekstnaya_reklama: () => require("./assemble-kontekstnaya-from-prod-layout.cjs").run(),
  targeting: () => require("./assemble-targeting-from-prod-layout.cjs").run(),
  marketing: () => require("./assemble-marketing-from-prod-layout.cjs").run(),
  korporativnyj_sajt: () => require("./assemble-korporativnyj-from-prod-layout.cjs").run(),
};

function runAssemble(slug) {
  const config = loadServiceConfig(slug);
  const run = PIPELINES[slug];
  if (!run) {
    throw new Error(
      `Нет пайплайна assemble для «${slug}». Зарегистрируйте в scripts/assemble-service-from-prod-layout.cjs`,
    );
  }
  console.log("assemble-service:", slug, "→", config.urlPath);
  run();
}

function main() {
  const slug = (process.argv[2] || process.env.SERVICE_SLUG || "").trim();
  if (!slug) {
    console.error("Укажите slug услуги:");
    console.error("  node scripts/assemble-service-from-prod-layout.cjs <slug>");
    console.error("  SERVICE_SLUG=<slug> node scripts/assemble-service-from-prod-layout.cjs");
    console.error("");
    console.error("Доступно:", listServiceSlugs().join(", ") || "(нет service.config.json)");
    process.exit(1);
  }
  try {
    runAssemble(slug);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runAssemble, PIPELINES, main };
