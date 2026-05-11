#!/usr/bin/env node
/**
 * Подставляет html/partials/analytics-counters.html (Метрика + leave-request-cta.js)
 * между маркерами SERENITY:ANALYTICS-BEGIN / END в лэйаутах (запуск из npm run build:cases).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const partialPath = path.join(root, "html", "partials", "analytics-counters.html");
const layoutPaths = [
  path.join(root, "html", "case-all-index.layout.html"),
  path.join(root, "html", "blog-index.layout.html"),
];
const blockRe = /<!-- SERENITY:ANALYTICS-BEGIN -->[\s\S]*?<!-- SERENITY:ANALYTICS-END -->/;

(() => {
  if (!fs.existsSync(partialPath)) {
    throw new Error(`Missing ${partialPath}`);
  }
  const partial = fs.readFileSync(partialPath, "utf8").replace(/\s+$/, "");
  for (const layoutPath of layoutPaths) {
    if (!fs.existsSync(layoutPath)) {
      throw new Error(`Missing ${layoutPath}`);
    }
    let html = fs.readFileSync(layoutPath, "utf8");
    if (!blockRe.test(html)) {
      throw new Error(`${layoutPath}: нет пары маркеров SERENITY:ANALYTICS-BEGIN / SERENITY:ANALYTICS-END`);
    }
    const block = `<!-- SERENITY:ANALYTICS-BEGIN -->\n${partial}\n    <!-- SERENITY:ANALYTICS-END -->`;
    html = html.replace(blockRe, block);
    fs.writeFileSync(layoutPath, html.replace(/\n+$/, "\n"), "utf8");
    console.log(`OK: analytics-counters → ${path.relative(root, layoutPath)}`);
  }
})();
