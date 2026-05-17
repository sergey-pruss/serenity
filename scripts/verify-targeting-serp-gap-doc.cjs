#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "docs", "targeting-serp-content-gap.html");
if (!fs.existsSync(file)) {
  console.error("verify-targeting-serp-gap-doc: missing", file);
  process.exit(1);
}
const html = fs.readFileSync(file, "utf8");
if (!html.includes("Gap-анализ: таргетинговая реклама (SERP)")) {
  console.error("verify-targeting-serp-gap-doc: unexpected title");
  process.exit(1);
}
if (
  !html.includes('id="executive"') ||
  !html.includes('class="executive-box"') ||
  !html.includes("Общий вывод: что добавить") ||
  !html.includes("таргетинговая реклама") ||
  !html.includes("/targeting/")
) {
  console.error("verify-targeting-serp-gap-doc: missing expected sections");
  process.exit(1);
}
if (/yabs\.yandex\.ru\/count/i.test(html)) {
  console.error("verify-targeting-serp-gap-doc: yabs tracking URL in report");
  process.exit(1);
}
console.log("OK: docs/targeting-serp-content-gap.html");
