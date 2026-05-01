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
assert(/~\^\/docs\(\/\|\$\)\s+1;/.test(content), "Missing /docs static rule (team handbook and other docs).");
assert(/~\^\/services\/\?\$\s+1;/.test(content), "Missing /services/ static rule (services index redirect).");
assert(/~\^\/services\/index\\\.html\$\s+1;/.test(content), "Missing /services/index.html static rule.");
assert(/~\^\/services\/production\/\?\$\s+1;/.test(content), "Missing /services/production/ static rule.");
assert(/~\^\/services\/production\/index\\\.html\$\s+1;/.test(content), "Missing /services/production/index.html static rule.");
assert(!/~\^\/case\/all\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case/all($|/) catches detail pages.");
assert(!/~\^\/case\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case($|/) must stay on legacy.");

const robotsProdPath = path.join(__dirname, "..", "robots.production.txt");
const robotsProd = fs.readFileSync(robotsProdPath, "utf8");
assert(
  /^Disallow:\s*\/docs\/\s*$/m.test(robotsProd),
  "robots.production.txt must include \"Disallow: /docs/\" (prod nginx aliases this file for /robots.txt)."
);

const robotsRootPath = path.join(__dirname, "..", "robots.txt");
const robotsRoot = fs.readFileSync(robotsRootPath, "utf8");
assert(
  /^Disallow:\s*\/docs\/\s*$/m.test(robotsRoot),
  "robots.txt (root, try_files fallback) must include \"Disallow: /docs/\" — keep in sync with robots.production.txt."
);

const robotsPreviewPath = path.join(__dirname, "..", "robots.static-preview.txt");
const robotsPreview = fs.readFileSync(robotsPreviewPath, "utf8");
assert(/^\s*Disallow:\s*\/\s*$/m.test(robotsPreview), "robots.static-preview.txt must Disallow: / for static host.");

console.log("OK: routing config baseline rules are present.");
