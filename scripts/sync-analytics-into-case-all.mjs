#!/usr/bin/env node
/**
 * Подставляет html/partials/analytics-counters.html в html/case-all-index.layout.html
 * между маркерами SERENITY:ANALYTICS-BEGIN / END (запуск из npm run build:cases).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const partialPath = path.join(root, "html", "partials", "analytics-counters.html");
const caseAllPath = path.join(root, "html", "case-all-index.layout.html");
const blockRe = /<!-- SERENITY:ANALYTICS-BEGIN -->[\s\S]*?<!-- SERENITY:ANALYTICS-END -->/;

(() => {
  if (!fs.existsSync(caseAllPath)) {
    throw new Error(`Missing ${caseAllPath}`);
  }
  if (!fs.existsSync(partialPath)) {
    throw new Error(`Missing ${partialPath}`);
  }
  const partial = fs.readFileSync(partialPath, "utf8").replace(/\s+$/, "");
  let html = fs.readFileSync(caseAllPath, "utf8");
  if (!blockRe.test(html)) {
    throw new Error(`${caseAllPath}: нет пары маркеров SERENITY:ANALYTICS-BEGIN / SERENITY:ANALYTICS-END`);
  }
  const block = `<!-- SERENITY:ANALYTICS-BEGIN -->\n${partial}\n    <!-- SERENITY:ANALYTICS-END -->`;
  html = html.replace(blockRe, block);
  fs.writeFileSync(caseAllPath, html.replace(/\n+$/, "\n"), "utf8");
  console.log("OK: analytics-counters → html/case-all-index.layout.html");
})();
