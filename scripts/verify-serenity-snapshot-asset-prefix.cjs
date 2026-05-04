#!/usr/bin/env node
/**
 * Продовый шаблон Nginx: статика нового сайта только под /_sa/, без перехвата /css и т.д. у legacy.
 */
const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const livePath = path.join(__dirname, "..", "nginx", "serenity-router.live.conf");
const content = fs.readFileSync(livePath, "utf8");

assert(content.includes("location ^~ /_sa/"), "Ожидался блок location ^~ /_sa/");
assert(content.includes("location ^~ /blog"), "Ожидался блок location ^~ /blog (статический блог, обход legacy).");
assert(content.includes("alias /var/www/static/"), "Ожидался alias /var/www/static/ для /_sa/");
assert(!content.includes("location ^~ /css/"), "Не должно быть перехвата location ^~ /css/");
assert(!content.includes("location ^~ /js/"), "Не должно быть перехвата location ^~ /js/");
assert(!content.includes("location ^~ /img/"), "Не должно быть перехвата location ^~ /img/");
assert(!content.includes("location ^~ /json/"), "Не должно быть перехвата location ^~ /json/");

console.log("OK: serenity-router.live.conf использует только /_sa/ для статики нового сайта.");
