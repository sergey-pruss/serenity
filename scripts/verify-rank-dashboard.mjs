#!/usr/bin/env node
/**
 * Проверка json/seo/rank-dashboard.json и docs/seo-rank-dashboard.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRankDashboard, DEFAULT_RANK_DASHBOARD_PATH } from "./seo/lib/rank-dashboard-utils.mjs";
import { rankingsForMigrationPath } from "./seo/lib/migration-sheet-rankings.mjs";
import {
  googleSearchUrl,
  isPollutedGoogleSearchUrl,
} from "./seo/lib/serp-region-context.mjs";
import { yandexOrganicUrlFromPathText } from "./seo/lib/yandex-organic-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const dash = loadRankDashboard(DEFAULT_RANK_DASHBOARD_PATH);
console.log("OK: json/seo/rank-dashboard.json", `(${dash.pages.length} pages, ${dash.checks.length} checks)`);

const latest = [...(dash.checks || [])].sort((a, b) =>
  String(b.date).localeCompare(String(a.date)),
)[0];
if (latest?.date === "2026-05-21") {
  const mkt = rankingsForMigrationPath("/services/marketing", dash);
  if (mkt.serpYandexMsk !== "5") {
    console.error(
      "migration rankings: marketing Я Москва ожидается 5 (лучший из запросов), получено:",
      mkt.serpYandexMsk,
    );
    process.exit(1);
  }
  const home = rankingsForMigrationPath("/", dash);
  if (home.serpYandexMsk !== "8") {
    console.error(
      "migration rankings: home Я Москва ожидается 8 (лучший из запросов), получено:",
      home.serpYandexMsk,
    );
    process.exit(1);
  }
  console.log("OK: migration-sheet — лучшая позиция среди запросов");
}

const googleUrl = googleSearchUrl("тест", "spb");
if (/uule|countryRU|pws=0|num=30/.test(googleUrl) || isPollutedGoogleSearchUrl(googleUrl)) {
  console.error("googleSearchUrl: ожидается только q, hl, gl — получено:", googleUrl);
  process.exit(1);
}
console.log("OK: googleSearchUrl без uule/cr/pws");

const yandexPathUrl = yandexOrganicUrlFromPathText("serenity.agency › korporativnyj_sajt");
if (yandexPathUrl !== "https://serenity.agency/korporativnyj_sajt") {
  console.error("yandexOrganicUrlFromPathText:", yandexPathUrl);
  process.exit(1);
}
console.log("OK: yandexOrganicUrlFromPathText (serenity.agency › korporativnyj_sajt)");

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
if (!html.includes("popular-queries-block") || !html.includes("popular-pages-block")) {
  console.error("docs/seo-rank-dashboard.html: нет блоков популярных запросов/страниц");
  process.exit(1);
}
if (!html.includes("buildSerpUrl") || !html.includes('class="serp-link"')) {
  console.error("docs/seo-rank-dashboard.html: нет ссылок на выдачу (buildSerpUrl / serp-link)");
  process.exit(1);
}
const jsStart = html.indexOf("<script>\n(function () {");
const jsEnd = html.indexOf("})();\n  </script>", jsStart);
if (jsStart < 0 || jsEnd < 0) {
  console.error("docs/seo-rank-dashboard.html: не найден блок скрипта дашборда");
  process.exit(1);
}
const dashJs = html.slice(jsStart + 8, jsEnd + 4);
try {
  new Function(dashJs);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("docs/seo-rank-dashboard.html: синтаксическая ошибка в inline JS:", msg);
  process.exit(1);
}
if (!/<title>[^<]*SEO[^<]*дашборд/i.test(html)) {
  console.error("docs/seo-rank-dashboard.html: неожиданный <title>");
  process.exit(1);
}
console.log("OK: docs/seo-rank-dashboard.html");
