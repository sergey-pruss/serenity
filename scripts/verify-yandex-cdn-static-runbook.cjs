#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const runbookPath = path.join(__dirname, "..", "docs", "yandex-cdn-static-runbook.md");
const vhostPath = path.join(__dirname, "..", "nginx", "static.serenity.agency.live.conf");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const runbook = fs.readFileSync(runbookPath, "utf8");
const vhost = fs.readFileSync(vhostPath, "utf8");

const requiredRunbookSnippets = [
  "Yandex Cloud CDN",
  "static.serenity.agency",
  "168.222.142.141",
  "Origin protocol: HTTPS",
  "Origin `Host`: `static.serenity.agency`",
  "SNI к origin: `static.serenity.agency`",
  "query string не игнорировать",
  "Disallow: /",
  "npm run test:post-deploy-smoke-static",
  "A 168.222.142.141",
];

for (const snippet of requiredRunbookSnippets) {
  assert(runbook.includes(snippet), `yandex-cdn-static-runbook.md: нет обязательного фрагмента "${snippet}"`);
}

assert(
  /server_name\s+static\.serenity\.agency\s*;/.test(vhost),
  "static vhost: server_name должен оставаться static.serenity.agency для CDN Host/SNI",
);
assert(
  /ssl_certificate\s+\/etc\/letsencrypt\/live\/static\.serenity\.agency\/fullchain\.pem\s*;/.test(vhost),
  "static vhost: сертификат должен соответствовать static.serenity.agency",
);
assert(
  /location\s+\^~\s+\/_sa\/[\s\S]*?Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/.test(vhost),
  "static vhost: /_sa/ должен сохранять долгий immutable-кэш",
);
assert(
  /location\s+=\s+\/robots\.txt[\s\S]*?robots\.static-preview\.txt/.test(vhost),
  "static vhost: robots.txt должен оставаться preview-версией",
);

console.log("OK: Yandex CDN static runbook matches current origin contract");
