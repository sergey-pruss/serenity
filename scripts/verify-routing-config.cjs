#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const routingPath = path.join(__dirname, "..", "nginx", "routing.conf");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const content = fs.readFileSync(routingPath, "utf8");

assert(/map\s+\$uri\s+\$is_new_page\s*\{/.test(content), "Missing map $uri $is_new_page block.");
assert(/\bdefault\s+0;/.test(content), "Missing mandatory fallback rule: default 0;");
assert(/~\^\/\$\s+1;/.test(content), "Missing homepage rule: ~^/$ 1;");
assert(/~\^\/robots\\\.txt\$\s+1;/.test(content), "Missing /robots.txt static rule (avoid legacy WordPress robots).");
assert(/~\^\/sitemap\\\.xml\$\s+1;/.test(content), "Missing /sitemap.xml static rule.");
assert(/~\^\/case\/all\/\?\$\s+1;/.test(content), "Missing exact /case/all listing rule.");
assert(/~\^\/case\/all\/index\\\.html\$\s+1;/.test(content), "Missing /case/all/index.html rule.");
assert(/~\^\/case\/all\/\[0-9\]\+\/\?\$\s+1;/.test(content), "Missing /case/all/{page} listing rule.");
assert(/~\^\/case\/all\/\[0-9\]\+\/index\\\.html\$\s+1;/.test(content), "Missing /case/all/{page}/index.html rule.");
assert(/~\^\/case\/all\/category\/\[\^\/\]\+\/\?\$\s+1;/.test(content), "Missing /case/all/category/{code} rule.");
assert(
  /~\^\/case\/all\/category\/\[\^\/\]\+\/index\\\.html\$\s+1;/.test(content),
  "Missing /case/all/category/{code}/index.html rule."
);
assert(
  /~\^\/case\/all\/category\/\[\^\/\]\+\/\[0-9\]\+\/\?\$\s+1;/.test(content),
  "Missing /case/all/category/{code}/{page} rule."
);
assert(
  /~\^\/case\/all\/category\/\[\^\/\]\+\/\[0-9\]\+\/index\\\.html\$\s+1;/.test(content),
  "Missing /case/all/category/{code}/{page}/index.html rule."
);
assert(!/~\^\/docs\(\/\|\$\)\s+1;/.test(content), "/docs/ must not map to new static on prod (dev-only: static.serenity.agency).");
assert(/~\^\/blog\(\/\|\$\)\s+1;/.test(content), "Missing /blog… static rule (статический блог на новом контуре).");
assert(/~\^\/services\/\?\$\s+1;/.test(content), "Missing exact /services listing rule (листинг на новом контуре).");
assert(/~\^\/services\/index\\\.html\$\s+1;/.test(content), "Missing /services/index.html rule.");
assert(/~\^\/services\/marketing\/\?\$\s+1;/.test(content), "Missing /services/marketing listing rule.");
assert(/~\^\/services\/marketing\/index\\\.html\$\s+1;/.test(content), "Missing /services/marketing/index.html rule.");
assert(!/~\^\/services\(\/\|\$\)\s+1;/.test(content), "Forbidden broad rule: /services($|/) catches subpages — только /services и /services/marketing на статике.");
assert(/~\^\/kontekstnaya_reklama\/\?\$\s+1;/.test(content), "Missing /kontekstnaya_reklama listing rule.");
assert(/~\^\/kontekstnaya_reklama\/index\\\.html\$\s+1;/.test(content), "Missing /kontekstnaya_reklama/index.html rule.");
assert(/~\^\/targeting\/\?\$\s+1;/.test(content), "Missing /targeting listing rule.");
assert(/~\^\/targeting\/index\\\.html\$\s+1;/.test(content), "Missing /targeting/index.html rule.");
assert(/~\^\/strategy\/\?\$\s+1;/.test(content), "Missing /strategy listing rule.");
assert(/~\^\/strategy\/index\\\.html\$\s+1;/.test(content), "Missing /strategy/index.html rule.");
assert(!/~\^\/case\/all\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case/all($|/) catches detail pages.");
assert(!/~\^\/case\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case($|/) must stay on legacy.");

const routerVhostPath = path.join(__dirname, "..", "nginx", "serenity-router.live.conf");
const routerVhost = fs.readFileSync(routerVhostPath, "utf8");
assert(
  /\blocation\s*=\s*\/blog\s*\{[\s\S]*?try_files\s+\/blog\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /blog → try_files (канон /blog без слэша)."
);
assert(
  /\blocation\s*=\s*\/blog\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/blog\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /blog/ → 301 /blog."
);
assert(
  /\blocation\s*=\s*\/case\/all\s*\{[\s\S]*?try_files\s+\/case\/all\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /case/all (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/targeting\s*\{[\s\S]*?try_files\s+\/targeting\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /targeting → try_files /targeting/index.html (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/targeting\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/targeting\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /targeting/ → 301 /targeting."
);
assert(
  /\blocation\s*=\s*\/kontekstnaya_reklama\s*\{[\s\S]*?try_files\s+\/kontekstnaya_reklama\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /kontekstnaya_reklama → try_files (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/kontekstnaya_reklama\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/kontekstnaya_reklama\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /kontekstnaya_reklama/ → 301 без слэша."
);
assert(
  /\blocation\s*=\s*\/strategy\s*\{[\s\S]*?try_files\s+\/strategy\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /strategy → try_files /strategy/index.html (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/strategy\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/strategy\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /strategy/ → 301 /strategy."
);
assert(
  /\blocation\s*=\s*\/services\s*\{[\s\S]*?try_files\s+\/services\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /services → try_files (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/services\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/services\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /services/ → 301 /services."
);
assert(
  /\blocation\s*=\s*\/services\/marketing\s*\{[\s\S]*?try_files\s+\/services\/marketing\/index\.html\s+=404\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /services/marketing → try_files (канон без слэша)."
);
assert(
  /\blocation\s*=\s*\/services\/marketing\/\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/services\/marketing\$is_args\$args\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing location = /services/marketing/ → 301 без слэша."
);
assert(
  !/\bsub_filter\s+'<a href="\/blog"'\s+'<a href="\/blog\/"'/.test(routerVhost),
  "serenity-router.live.conf: legacy sub_filter не должен добавлять слэш к /blog."
);
assert(
  /sub_filter\s+'<\/body>'\s+'<script src="\/_sa\/js\/utm-capture\.js/.test(routerVhost),
  "serenity-router.live.conf: legacy sub_filter должен подключать utm-capture.js для органики по referrer."
);
assert(
  !routerVhost.includes('return"/blog/"'),
  "serenity-router.live.conf: legacy click-normalize не должен переписывать /blog → /blog/."
);
assert(
  !/\bserver_name\s+serenity\.agency\s+www\.serenity\.agency\s*;/.test(routerVhost),
  "serenity-router.live.conf: www must not share the canonical production server block."
);
assert(
  /\bserver_name\s+serenity\.agency\s*;/.test(routerVhost),
  "serenity-router.live.conf: missing canonical serenity.agency server block."
);
assert(
  /\bserver_name\s+www\.serenity\.agency\s*;[\s\S]*?\breturn\s+301\s+https:\/\/serenity\.agency\$request_uri\s*;/.test(routerVhost),
  "serenity-router.live.conf: www.serenity.agency must redirect to https://serenity.agency$request_uri."
);
assert(
  /\blocation\s+\^~\s+\/docs\/\s*\{[\s\S]*?\breturn\s+404\s*;/.test(routerVhost),
  "serenity-router.live.conf: /docs/ on prod must return 404 (docs only on dev static)."
);

const robotsProdPath = path.join(__dirname, "..", "robots.production.txt");
const robotsProd = fs.readFileSync(robotsProdPath, "utf8");
assert(
  !/^Disallow:\s*\/docs\/\s*$/m.test(robotsProd),
  "robots.production.txt must not Disallow: /docs/ (каталог docs/ не на проде)."
);
assert(
  !/Disallow:\s*\*services\/\$/m.test(robotsProd),
  "robots.production.txt must not Disallow: *services/$ (листинг /services/ на статическом контуре)."
);
assert(
  /^Allow:\s*\/services\/?\$/m.test(robotsProd),
  "robots.production.txt must Allow /services listing explicitly."
);

const robotsRootPath = path.join(__dirname, "..", "robots.txt");
const robotsRoot = fs.readFileSync(robotsRootPath, "utf8");
assert(
  !/^Disallow:\s*\/docs\/\s*$/m.test(robotsRoot),
  "robots.txt must not Disallow: /docs/ — keep in sync with robots.production.txt."
);
assert(
  !/Disallow:\s*\*services\/\$/m.test(robotsRoot),
  "robots.txt must not Disallow: *services/$ — keep in sync with robots.production.txt."
);

const robotsPreviewPath = path.join(__dirname, "..", "robots.static-preview.txt");
const robotsPreview = fs.readFileSync(robotsPreviewPath, "utf8");
assert(/^\s*Disallow:\s*\/\s*$/m.test(robotsPreview), "robots.static-preview.txt must Disallow: / for static host.");

assert(
  /\blocation\s*=\s*\/seminar\/7\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/blog\s*;/.test(routerVhost),
  "serenity-router.live.conf: edge intercept /seminar/7 → /blog (полный список — json/nginx-edge-intercepts.json, verify-nginx-edge-intercepts.cjs; тот же стиль, что для /blog/article/7-raz-otmer…)."
);

assert(
  /#\s*>>>\s*GEN:serenity-legacy-case-path-redirects/.test(routerVhost) &&
    /#\s*<<<\s*GEN:serenity-legacy-case-path-redirects/.test(routerVhost) &&
    /\blocation\s*=\s*\/case\/prodvizhenie\/toofli\s*\{[\s\S]*?return\s+301\s+https:\/\/serenity\.agency\/case\/toofli\s*;/.test(routerVhost),
  "serenity-router.live.conf: ожидается сгенерированный блок GEN:serenity-legacy-case-path-redirects (node scripts/build-serenity-legacy-redirects.cjs после смены json/cases-all.json).",
);

console.log("OK: routing config baseline rules are present.");
