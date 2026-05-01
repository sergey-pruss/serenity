#!/usr/bin/env node
/**
 * Проверяет, что в продовом шаблоне Nginx включено сжатие gzip для текстовых типов
 * (без сетевых запросов — только содержимое репозитория).
 */
const fs = require("fs");
const path = require("path");

const sitePath = path.join(__dirname, "..", "nginx", "serenity-router.live.conf");
const snapshotIncPath = path.join(__dirname, "..", "nginx", "serenity-router-snapshot.inc");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const content =
  fs.readFileSync(sitePath, "utf8") +
  "\n" +
  fs.readFileSync(snapshotIncPath, "utf8");

assert(/\bgzip\s+on\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip on;");
assert(/\bgzip_vary\s+on\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip_vary on;");
assert(/\bgzip_comp_level\s+\d+\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip_comp_level …;");
assert(/\bgzip_min_length\s+\d+\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip_min_length …;");
assert(/\bgzip_http_version\s+1\.1\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip_http_version 1.1;");
assert(/\bgzip_proxied\s+\w+\s*;/.test(content), "serenity-router.live.conf: ожидалось gzip_proxied …;");

const gt = content.match(/\bgzip_types\s+([^;]+);/s);
assert(gt, "serenity-router.live.conf: не найден блок gzip_types …;");
const types = gt[1].replace(/\s+/g, " ").trim();
for (const mime of ["text/css", "application/json", "application/javascript", "image/svg+xml"]) {
  assert(types.includes(mime), `serenity-router.live.conf: в gzip_types отсутствует ${mime}`);
}
assert(
  !/\bgzip_types\b[\s\S]*?\btext\/html\b[\s\S]*?;/s.test(content),
  "serenity-router.live.conf: не указывайте text/html внутри gzip_types …; (дубль с дефолтом gzip в http{})"
);

console.log("OK: nginx gzip directives present in serenity-router.live.conf + serenity-router-snapshot.inc");
