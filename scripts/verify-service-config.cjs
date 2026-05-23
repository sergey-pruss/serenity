#!/usr/bin/env node
/**
 * Проверка service.config.json в каталогах json/services/<slug>/ и связанных partial/JSON.
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig, listServiceSlugs } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const slugs = listServiceSlugs();
  assert(slugs.length >= 2, "Ожидаются service.config.json для kontekstnaya_reklama и targeting");

  for (const slug of slugs) {
    const cfg = loadServiceConfig(slug);
    assert(cfg.urlPath.startsWith("/") && !cfg.urlPath.endsWith("/"), `${slug}: urlPath без завершающего слэша`);
    assert(cfg.seo?.breadcrumbLabel, `${slug}: seo.breadcrumbLabel`);
    assert(fs.existsSync(cfg.indexPath), `${slug}: index ${cfg.indexPath}`);
    assert(fs.existsSync(cfg.manifestPath), `${slug}: manifest ${cfg.manifestPath}`);

    for (const [key, p] of Object.entries(cfg.partialPaths)) {
      assert(fs.existsSync(p), `${slug}: partial ${key} → ${path.relative(root, p)}`);
    }

    for (const [key, p] of Object.entries(cfg.contentPaths)) {
      assert(fs.existsSync(p), `${slug}: content ${key} → ${path.relative(root, p)}`);
    }

    const shells = [
      "_service-faq.shell.html",
      "_service-inline-lead.shell.html",
      "_service-more-cases.shell.html",
      "_service-awards.shell.html",
      "_service-synergy.shell.html",
    ];
    for (const sh of shells) {
      const p = path.join(root, "html", "partials", "services", sh);
      assert(fs.existsSync(p), `общий shell: ${sh}`);
    }
  }

  console.log("verify-service-config: ok (%d услуг)", slugs.length);
}

try {
  main();
} catch (e) {
  console.error("verify-service-config:", e.message || e);
  process.exit(1);
}
