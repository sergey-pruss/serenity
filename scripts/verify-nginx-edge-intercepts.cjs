#!/usr/bin/env node
/**
 * Инварианты edge-перехватов в nginx/serenity-router.live.conf (301 до legacy).
 * Источник правды: json/nginx-edge-intercepts.json (см. план 5xx/301, только новый сервер).
 */
const fs = require("fs");
const path = require("path");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "json", "nginx-edge-intercepts.json");
const vhostPath = path.join(root, "nginx", "serenity-router.live.conf");

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const rows = raw.filter((x) => x && typeof x.path === "string");

assert(rows.length > 0, "nginx-edge-intercepts.json: нет правил");

const paths = rows.map((r) => r.path);
const unique = new Set(paths);
assert(
  unique.size === paths.length,
  `nginx-edge-intercepts.json: дубликаты path — ${paths.filter((p, i) => paths.indexOf(p) !== i).join(", ")}`,
);

const vhost = fs.readFileSync(vhostPath, "utf8");

for (const row of rows) {
  const p = row.path;
  const st = row.expectStatus;
  const locUrl = row.expectLocation;
  assert(p.startsWith("/"), `path must start with /: ${p}`);
  assert(st === 301 || st === 308 || st === 410, `expectStatus: ${st} for ${p}`);

  const locLine = `location = ${p}`;
  assert(vhost.includes(locLine), `serenity-router.live.conf: нет блока ${locLine}`);

  const blockRe = new RegExp(
    `${escapeRe(locLine)}\\s*\\{[^}]*return\\s+${st}\\s+${escapeRe(locUrl)}\\s*;`,
    "s",
  );
  assert(blockRe.test(vhost), `serenity-router.live.conf: для ${p} ожидается return ${st} ${locUrl}`);
}

console.log(`OK: nginx-edge-intercepts (${rows.length} правил).`);
