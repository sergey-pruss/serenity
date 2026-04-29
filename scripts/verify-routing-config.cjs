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
assert(!/~\^\/case\/all\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case/all($|/) catches detail pages.");
assert(!/~\^\/case\(\$\|\/\)\s+1;/.test(content), "Forbidden broad rule found: /case($|/) must stay on legacy.");

console.log("OK: routing config baseline rules are present.");
