#!/usr/bin/env node
/**
 * Проверка json/seo/rank-dashboard.json и docs/seo-rank-dashboard.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRankDashboard, DEFAULT_RANK_DASHBOARD_PATH } from "./seo/lib/rank-dashboard-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const dash = loadRankDashboard(DEFAULT_RANK_DASHBOARD_PATH);
console.log("OK: json/seo/rank-dashboard.json", `(${dash.pages.length} pages, ${dash.checks.length} checks)`);

for (const page of dash.pages) {
  for (const q of page.queries) {
    if (!q.text.trim()) {
      console.error("Пустой query.text у страницы", page.id);
      process.exit(1);
    }
  }
}

const htmlPath = path.join(root, "docs", "seo-rank-dashboard.html");
if (!fs.existsSync(htmlPath)) {
  console.error("Нет файла docs/seo-rank-dashboard.html — выполните: npm run seo:rank-dashboard:build");
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, "utf8");
if (!/noindex,\s*nofollow/i.test(html)) {
  console.error("docs/seo-rank-dashboard.html: ожидается meta robots noindex,nofollow");
  process.exit(1);
}
if (!html.includes("rank-dashboard-data")) {
  console.error("docs/seo-rank-dashboard.html: нет встроенных данных rank-dashboard-data");
  process.exit(1);
}
if (!/<title>[^<]*SEO[^<]*дашборд/i.test(html)) {
  console.error("docs/seo-rank-dashboard.html: неожиданный <title>");
  process.exit(1);
}
console.log("OK: docs/seo-rank-dashboard.html");
