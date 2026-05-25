#!/usr/bin/env node
/**
 * BreadcrumbList JSON-LD на страницах услуг (json/services/…/service.config.json).
 */
const fs = require("fs");
const { loadServiceConfig, listServiceSlugs } = require("./lib/load-service-config.cjs");
const {
  ORIGIN,
  canonicalUrl,
  parseServiceBreadcrumbFromHtml,
} = require("./lib/service-breadcrumb-jsonld.cjs");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  for (const slug of listServiceSlugs()) {
    const cfg = loadServiceConfig(slug);
    const html = fs.readFileSync(cfg.indexPath, "utf8");
    const parsed = parseServiceBreadcrumbFromHtml(html);
    assert(parsed, `${slug}: нет data-sa-service-breadcrumb JSON-LD`);

    assert(parsed.breadcrumbLabel === cfg.seo.breadcrumbLabel, `${slug}: breadcrumbLabel`);
    assert(parsed.urlPath === cfg.urlPath, `${slug}: urlPath в schema`);

    const items = parsed.items;
    assert(items.length === 3, `${slug}: три уровня breadcrumb`);
    assert(items[0].item === ORIGIN, `${slug}: Serenity → ${ORIGIN}`);
    assert(items[1].item === canonicalUrl("/services"), `${slug}: Услуги → /services`);
    assert(items[2].item === canonicalUrl(cfg.urlPath), `${slug}: страница услуги`);

    const canonMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (canonMatch) {
      assert(
        canonMatch[1] === canonicalUrl(cfg.urlPath),
        `${slug}: canonical совпадает с breadcrumb последнего уровня`,
      );
    }
  }

  console.log("verify-service-breadcrumb-jsonld: ok (%d услуг)", listServiceSlugs().length);
}

try {
  main();
} catch (e) {
  console.error("verify-service-breadcrumb-jsonld:", e.message || e);
  process.exit(1);
}
