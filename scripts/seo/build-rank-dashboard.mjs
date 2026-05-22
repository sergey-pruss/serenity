#!/usr/bin/env node
/**
 * Сборка docs/seo-rank-dashboard.html из json/seo/rank-dashboard.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  saveRankDashboard,
  validateRankDashboard,
  DEFAULT_RANK_DASHBOARD_PATH,
  DASHBOARD_YANDEX_REGIONS,
  DASHBOARD_GOOGLE_REGIONS,
  migrateGoogleEntriesToRf,
  sortRankDashboardByResults,
} from "./lib/rank-dashboard-utils.mjs";
import { ORGANIC_TARGET, REGIONS as SERP_REGIONS } from "./lib/serp-shared.mjs";

/** Регионы для URL выдачи (lr Яндекс; Google — gl/hl) */
const serpRegionIds = [...DASHBOARD_YANDEX_REGIONS, ...DASHBOARD_GOOGLE_REGIONS];
const serpRegionsJson = JSON.stringify(
  Object.fromEntries(
    serpRegionIds.map((id) => [
      id,
      { yandexLr: SERP_REGIONS[id].yandexLr, googleCanon: SERP_REGIONS[id].googleCanon },
    ]),
  ),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "docs", "seo-rank-dashboard.html");

const dashPath = process.env.RANK_DASHBOARD_PATH || DEFAULT_RANK_DASHBOARD_PATH;
const dashAbs = path.resolve(dashPath);
let dashRaw;
try {
  dashRaw = JSON.parse(fs.readFileSync(dashAbs, "utf8"));
} catch (e) {
  throw new Error(`JSON parse ${dashAbs}: ${/** @type {Error} */ (e).message}`);
}
const migrated = migrateGoogleEntriesToRf(dashRaw);
const dashValidated = validateRankDashboard(dashRaw);
if (!dashValidated.ok) {
  throw new Error(`${dashAbs}:\n${dashValidated.errors.join("\n")}`);
}
const dash = dashValidated.data;
if (migrated > 0) {
  console.log(`Google → колонка РФ: объединено/удалено записей: ${migrated}`);
}
const sortChanged = sortRankDashboardByResults(dash);
if (migrated > 0 || sortChanged) {
  saveRankDashboard(dash, dashPath);
  if (sortChanged) console.log("Порядок страниц/запросов: по лучшим позициям (контекстная и таргетинг — в конце)");
}
const builtAt = new Date().toISOString();
const organicDepth = dash.site.organicDepth ?? ORGANIC_TARGET;
const dataJson = JSON.stringify({ ...dash, builtAt }).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Serenity — SEO-дашборд позиций</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --card: #fff;
      --text: #1a1d21;
      --muted: #5c6570;
      --border: #d8dee6;
      --accent: #1e5a8c;
      --code: #f0f3f7;
      --pos-1-3: #0d6b4f;
      --pos-1-3-bg: #e6f4ee;
      --pos-4-10: #1e5a8c;
      --pos-4-10-bg: #e8f2fa;
      --pos-11-20: #b54708;
      --pos-11-20-bg: #fff4e5;
      --pos-21-50: #6b4c9a;
      --pos-21-50-bg: #f3effa;
      --pos-out: #5c6570;
      --pos-out-bg: #eef1f4;
      --delta-up: #0d6b4f;
      --delta-down: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      color: var(--text);
      background: var(--bg);
    }
    .wrap {
      max-width: 1480px;
      margin: 0 auto;
      padding: 24px 20px 48px;
    }
    h1 { font-size: 1.6rem; margin: 0 0 6px; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); font-size: 0.95rem; max-width: 720px; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      align-items: center;
      margin: 20px 0;
      padding: 14px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .toolbar label { font-size: 0.85rem; color: var(--muted); display: flex; flex-direction: column; gap: 4px; }
    .toolbar select, .toolbar button {
      font: inherit;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--card);
    }
    .toolbar button { cursor: pointer; color: var(--accent); }
    .toolbar button[aria-pressed="true"] { background: var(--accent); color: #fff; border-color: var(--accent); }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .summary .stat {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .summary .stat strong { display: block; font-size: 1.35rem; }
    .summary .stat span { font-size: 0.8rem; color: var(--muted); }
    #rank-table-head-sentinel {
      height: 1px;
      margin: 0;
      pointer-events: none;
    }
    .rank-table-sticky-clone {
      position: fixed;
      top: 0;
      z-index: 100;
      overflow: hidden;
      background: var(--code);
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
      border-bottom: 1px solid var(--border);
    }
    .rank-table-sticky-clone[hidden] { display: none !important; }
    .rank-table-sticky-clone table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.88rem;
      table-layout: fixed;
    }
    .rank-table-sticky-clone th {
      background: var(--code);
      font-weight: 600;
      white-space: nowrap;
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: middle;
    }
    .rank-table-sticky-clone th.engine-group { text-align: center; font-size: 0.8rem; color: var(--accent); }
    .rank-table-sticky-clone th.region-col { text-align: center; font-size: 0.78rem; }
    .table-scroll { margin-bottom: 24px; }
    #main-table { width: 100%; min-width: 960px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.88rem; background: var(--card); }
    th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: middle; }
    th { background: var(--code); font-weight: 600; white-space: nowrap; }
    #main-table thead th {
      position: -webkit-sticky;
      position: sticky;
      top: var(--rank-thead-top, 0);
      background: var(--code);
      box-shadow: 0 1px 0 var(--border);
    }
    #main-table thead tr:last-child th {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    #main-table thead.is-stuck tr:last-child th {
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
    }
    th.engine-group { text-align: center; font-size: 0.8rem; color: var(--accent); }
    th.region-col { text-align: center; font-size: 0.78rem; min-width: 64px; }
    th.sticky-col, td.sticky-col {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--card);
      min-width: 200px;
      max-width: 280px;
    }
    #main-table thead th.sticky-col {
      background: var(--code);
      z-index: 30;
      box-shadow: 2px 1px 0 var(--border), 2px 4px 8px rgba(0, 0, 0, 0.06);
    }
    tr.page-row td.sticky-col { background: #fafbfc; }
    #main-table tbody td.sticky-col { z-index: 2; }
    tr.page-row td { background: #fafbfc; font-weight: 600; }
    tr.page-row a { color: var(--accent); text-decoration: none; }
    tr.page-row a:hover { text-decoration: underline; }
    .query-text { color: var(--muted); font-size: 0.86rem; }
    .cell-pos {
      text-align: center;
      min-width: 56px;
      font-weight: 700;
      font-size: 0.95rem;
      position: relative;
    }
    .cell-pos a.serp-link {
      color: inherit;
      text-decoration: none;
    }
    .cell-pos a.serp-link:hover { text-decoration: underline; }
    .cell-pos a.serp-link:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: 2px;
    }
    .cell-pos .delta {
      display: block;
      font-size: 0.68rem;
      font-weight: 600;
      margin-top: 2px;
    }
    .delta.up { color: var(--delta-up); }
    .delta.down { color: var(--delta-down); }
    .delta.flat { color: var(--muted); }
    .p-1-3 { background: var(--pos-1-3-bg); color: var(--pos-1-3); }
    .p-4-10 { background: var(--pos-4-10-bg); color: var(--pos-4-10); }
    .p-11-20 { background: var(--pos-11-20-bg); color: var(--pos-11-20); }
    .p-21-50 { background: var(--pos-21-50-bg); color: var(--pos-21-50); }
    .p-out { background: var(--pos-out-bg); color: var(--pos-out); }
    .cell-missing { background: #fafbfc; }
    .empty { color: var(--muted); font-style: italic; }
    th.panel-group { text-align: center; font-size: 0.8rem; color: var(--muted); border-left: 2px solid var(--border); }
    .cell-panel {
      text-align: center;
      min-width: 52px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--muted);
      background: #f8f9fb;
      border-left: 2px solid var(--border);
    }
    .cell-panel.has-data { color: var(--accent); background: #eef3f8; }
    .cell-panel.panel-warn { color: #b54708; background: #fff4e5; }
    .cell-panel .sub { display: block; font-size: 0.62rem; font-weight: 500; color: var(--muted); }
    .hist-wrap { margin-top: 8px; }
    .hist-wrap h2 { font-size: 1.05rem; margin: 0 0 10px; }
    .badge {
      display: inline-block;
      font-size: 0.72rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--code);
      color: var(--muted);
      margin-left: 8px;
    }
    footer { font-size: 0.82rem; color: var(--muted); margin-top: 24px; }
    footer a { color: var(--accent); }
    .stale { color: #b54708; font-weight: 600; }
    .popular-block { margin: 28px 0 0; }
    .popular-block h2 { font-size: 1.15rem; margin: 0 0 6px; }
    .popular-block .popular-note { font-size: 0.85rem; color: var(--muted); margin: 0 0 12px; max-width: 900px; }
    .popular-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 960px) { .popular-grid { grid-template-columns: 1fr; } }
    .popular-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .popular-card h3 {
      margin: 0;
      padding: 10px 12px;
      font-size: 0.9rem;
      background: var(--code);
      border-bottom: 1px solid var(--border);
    }
    .popular-card table { font-size: 0.8rem; border: none; }
    .popular-card th, .popular-card td { padding: 6px 8px; }
    .popular-card th.num, .popular-card td.num { text-align: right; white-space: nowrap; }
    .popular-card th.abbr { cursor: help; border-bottom: 1px dotted var(--muted); }
    .popular-card tr.tracked td { background: #f0f7fc; }
    .popular-card tr.tracked td:first-child { font-weight: 600; }
    .popular-card a { color: var(--accent); text-decoration: none; word-break: break-all; }
    .popular-card a:hover { text-decoration: underline; }
    .popular-empty { padding: 12px; color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>SEO-дашборд позиций</h1>
      <p class="subtitle">Органическая выдача топ-${organicDepth}: основные страницы и запросы. Обновление — вручную / интерактивная SERP-съёмка. Только dev-static.</p>
      <p class="subtitle" id="meta-last-check"></p>
    </header>

    <div class="toolbar" role="group" aria-label="Режим">
      <button type="button" id="btn-view-latest" aria-pressed="true">Последний снимок</button>
      <button type="button" id="btn-view-history" aria-pressed="false">История (даты)</button>
      <span style="font-size:0.85rem;color:var(--muted)">Яндекс и Google: только Москва и СПб</span>
    </div>

    <div class="summary" id="summary"></div>

    <div id="rank-table-head-sentinel" aria-hidden="true"></div>
    <div id="rank-table-sticky-clone" class="rank-table-sticky-clone" hidden aria-hidden="true">
      <table id="rank-table-sticky-clone-table" aria-hidden="true"></table>
    </div>
    <div class="table-scroll">
      <table id="main-table">
        <thead id="table-head"></thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>

    <section class="popular-block" id="popular-queries-block" aria-labelledby="popular-queries-title">
      <h2 id="popular-queries-title">Популярные запросы из поиска <span class="badge">GSC / Я.ВМ</span></h2>
      <p class="popular-note" id="popular-queries-note"></p>
      <div class="popular-grid" id="popular-queries-grid"></div>
    </section>

    <section class="popular-block" id="popular-pages-block" aria-labelledby="popular-pages-title">
      <h2 id="popular-pages-title">Страницы из поиска <span class="badge">GSC / Я.ВМ</span></h2>
      <p class="popular-note" id="popular-pages-note"></p>
      <div class="popular-grid" id="popular-pages-grid"></div>
    </section>

    <footer>
      <p>Сборка: <span id="built-at"></span>. Источник: <code>json/seo/rank-dashboard.json</code>.
        <a href="seo-positions-mcp-workflows.md">Как обновлять позиции</a> ·
        <a href="team-handbook.html">Team handbook</a></p>
    </footer>
  </div>

  <script type="application/json" id="rank-dashboard-data">${dataJson}</script>
  <script>
(function () {
  const DATA = JSON.parse(document.getElementById("rank-dashboard-data").textContent);
  const REGION_LABELS = { moscow: "Москва", spb: "СПб", rf: "РФ" };
  const ENGINE_LABELS = { yandex: "Яндекс", google: "Google" };
  const YANDEX_REGIONS = ${JSON.stringify(DASHBOARD_YANDEX_REGIONS)};
  const GOOGLE_REGIONS = ${JSON.stringify(DASHBOARD_GOOGLE_REGIONS)};
  const SLICES = [];
  for (const region of YANDEX_REGIONS) {
    SLICES.push({ engine: "yandex", region, key: "yandex|" + region });
  }
  for (const region of GOOGLE_REGIONS) {
    SLICES.push({ engine: "google", region, key: "google|" + region });
  }
  const MAX_HISTORY = 12;
  const PANEL_COLS = 2;
  const SERP_COLS = SLICES.length;
  const SERP_REGIONS = ${serpRegionsJson};
  const ORGANIC_DEPTH = (DATA.site && DATA.site.organicDepth) || ${organicDepth};

  function buildSerpUrl(engine, regionId, query) {
    const r = SERP_REGIONS[regionId];
    if (!r) return "#";
    if (engine === "yandex") {
      const params = new URLSearchParams({
        text: query,
        lr: String(r.yandexLr),
        lang: "ru",
      });
      return "https://yandex.ru/search/?" + params.toString();
    }
    const params = new URLSearchParams({
      q: query,
      hl: "ru",
      gl: "ru",
    });
    return "https://www.google.ru/search?" + params.toString();
  }

  let viewMode = "latest";

  function getPanelRow(pageId, queryId) {
    const panels = DATA.panels;
    if (!panels || !panels.byQuery) return null;
    return panels.byQuery[pageId + "|" + queryId] || null;
  }

  function formatPanelAvg(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const r = Math.round(n * 10) / 10;
    return String(r);
  }

  function panelGscHint() {
    const src = DATA.panels && DATA.panels.sources;
    if (!DATA.panels) return "Запустите: npm run seo:rank-dashboard:panels";
    if (src && src.gscError) {
      let msg = "GSC не загружен: " + src.gscError.slice(0, 280);
      if (/has not been used in project|is disabled/i.test(src.gscError)) {
        msg += " — восстановите gsc-oauth-desktop.json (sergeypruss), npm run mcp:gsc-help";
      } else if (/permission|insufficient|403/i.test(src.gscError)) {
        msg += " — OAuth sergeyprus@gmail.com: npm run seo:gsc-oauth-token:install";
      }
      return msg;
    }
    if (src && src.gscSkipped) return "GSC пропущен (SEO_SKIP_GSC=1)";
    if (src && src.gscAuthMethod === "oauth") return "GSC (OAuth), нет показов по фразе за период";
    return "Нет показов по фразе в GSC за период (или фраза не в отчёте)";
  }

  function panelYwmHint() {
    if (!DATA.panels) return "Запустите: npm run seo:rank-dashboard:panels";
    return "Нет в топе популярных запросов Вебмастера за период (мало показов)";
  }

  function renderPanelCells(pageId, queryId) {
    const row = getPanelRow(pageId, queryId);
    const g = row && row.google;
    const y = row && row.yandex;
    const gPos = g && g.avgPosition != null ? g.avgPosition : null;
    const yPos = y && y.avgShowPosition != null ? y.avgShowPosition : null;
    const gscGlobalEmpty =
      DATA.panels &&
      !DATA.panels.sources?.gscSkipped &&
      !DATA.panels.sources?.gscRowCount &&
      DATA.panels.sources?.gscError;
    let gTitle = panelGscHint();
    if (g) {
      gTitle =
        "GSC ср. поз. " +
        g.avgPosition +
        ", клики " +
        g.clicks +
        ", показы " +
        g.impressions;
    }
    let yTitle = panelYwmHint();
    if (y) {
      yTitle = "Я.ВМ ср. поз. " + y.avgShowPosition + ", показы " + y.shows + ", клики " + y.clicks;
    }
    const gText = gPos != null ? formatPanelAvg(gPos) : gscGlobalEmpty ? "!" : "—";
    const yText = yPos != null ? formatPanelAvg(yPos) : "—";
    return (
      '<td class="cell-panel' +
      (gPos != null ? " has-data" : gscGlobalEmpty ? " panel-warn" : "") +
      '" title="' +
      escapeAttr(gTitle) +
      '">' +
      escapeHtml(gText) +
      (g && g.clicks != null
        ? '<span class="sub">' + escapeHtml(String(g.clicks)) + " кл</span>"
        : gscGlobalEmpty
          ? '<span class="sub">GSC</span>'
          : gPos == null
            ? '<span class="sub">нет</span>'
            : "") +
      "</td>" +
      '<td class="cell-panel' +
      (yPos != null ? " has-data" : "") +
      '" title="' +
      escapeAttr(yTitle) +
      '">' +
      escapeHtml(yText) +
      (y && y.shows != null
        ? '<span class="sub">' + escapeHtml(String(y.shows)) + " пок</span>"
        : yPos == null
          ? '<span class="sub">нет</span>'
          : "") +
      "</td>"
    );
  }

  const sortedChecks = [...(DATA.checks || [])].sort((a, b) => a.date.localeCompare(b.date));
  const dates = sortedChecks.map((c) => c.date);
  const latestDate = dates.length ? dates[dates.length - 1] : null;
  /** В истории слева — самая новая дата */
  const historyDates = dates.slice(-MAX_HISTORY).reverse();

  /** Сводка снимков до даты включительно (Google Москва/СПб → РФ) */
  function mergeChecksUpTo(upToDate) {
    if (!upToDate) return null;
    /** @type {Map<string, object>} */
    const map = new Map();
    for (const ch of sortedChecks) {
      if (ch.date > upToDate) continue;
      for (const e of ch.entries) {
        if (e.engine === "yandex" && e.region === "rf") continue;
        let region = e.region;
        if (e.engine === "google" && region !== "rf") region = "rf";
        const k = e.pageId + "|" + e.queryId + "|" + e.engine + "|" + region;
        map.set(k, Object.assign({}, e, { region, snapshotDate: ch.date }));
      }
    }
    return { date: upToDate, label: upToDate, entries: [...map.values()] };
  }

  function checkForDate(date) {
    const ch = sortedChecks.find((c) => c.date === date);
    if (!ch) return null;
    return {
      date: ch.date,
      label: ch.label,
      entries: ch.entries.filter((e) => !(e.engine === "yandex" && e.region === "rf")),
    };
  }

  function posClass(n, out) {
    if (out || n == null) return "p-out";
    if (n <= 3) return "p-1-3";
    if (n <= 10) return "p-4-10";
    if (n <= 20) return "p-11-20";
    return "p-21-50";
  }

  /** Съёмка SERP выполнена (есть результат в топ-N или «>N») */
  function entryHasSerpResult(entry) {
    if (!entry) return false;
    if (entry.source === "manual") return true;
    const src = String(entry.source || "");
    if (!src || /blocked|error:/i.test(src)) return false;
    return true;
  }

  function formatPos(entry) {
    if (!entryHasSerpResult(entry)) {
      return { text: "", cls: "cell-missing", title: "Съёмка не выполнена", delta: null };
    }
    if (entry.outOfTop20 || entry.position == null) {
      return {
        text: ">" + ORGANIC_DEPTH,
        cls: "p-out",
        title: "Serenity не в топ-" + ORGANIC_DEPTH + " органики (съёмка выполнена)",
        delta: null,
      };
    }
    const snap = entry.snapshotDate ? " (снимок " + entry.snapshotDate + ")" : "";
    return {
      text: String(entry.position),
      cls: posClass(entry.position, false),
      title: "Позиция в органике" + snap,
      delta: null,
    };
  }

  function findEntry(check, pageId, queryId, engine, region) {
    if (!check) return null;
    const lookupRegion = engine === "google" ? "rf" : region;
    let entry = check.entries.find(
      (e) =>
        e.pageId === pageId &&
        e.queryId === queryId &&
        e.engine === engine &&
        e.region === lookupRegion,
    );
    if (!entry && engine === "google") {
      entry = check.entries.find(
        (e) =>
          e.pageId === pageId &&
          e.queryId === queryId &&
          e.engine === "google" &&
          (e.region === "moscow" || e.region === "spb"),
      );
    }
    return entry;
  }

  function renderPosCell(entry, prevEntry, queryText, engine, region) {
    const f = formatPos(entry);
    if (!entryHasSerpResult(entry)) {
      return (
        '<td class="cell-pos cell-missing" title="' +
        escapeAttr(f.title) +
        '"></td>'
      );
    }
    const d = delta(prevEntry, entry);
    let deltaHtml = "";
    if (d && prevEntry) {
      deltaHtml = '<span class="delta ' + d.cls + '">' + escapeHtml(d.text) + "</span>";
    }
    const serpHref = buildSerpUrl(engine, region, queryText);
    const serpLinkTitle =
      "Открыть выдачу: " + ENGINE_LABELS[engine] + ", " + REGION_LABELS[region] + " — " + queryText;
    const title =
      serpLinkTitle +
      (entry && entry.matchedUrl ? " · " + entry.matchedUrl : f.title ? " · " + f.title : "");
    const posLink =
      '<a class="serp-link" href="' +
      escapeAttr(serpHref) +
      '" target="_blank" rel="noopener noreferrer" title="' +
      escapeAttr(serpLinkTitle) +
      '">' +
      escapeHtml(f.text) +
      "</a>";
    return (
      '<td class="cell-pos ' +
      f.cls +
      '" title="' +
      escapeAttr(title) +
      '">' +
      posLink +
      deltaHtml +
      "</td>"
    );
  }

  function serpRegionHeaders(engine) {
    const regs = engine === "yandex" ? YANDEX_REGIONS : GOOGLE_REGIONS;
    return regs
      .filter((r) => SERP_REGIONS[r])
      .map(
        (r) =>
          '<th class="region-col" title="' +
          escapeAttr(ENGINE_LABELS[engine] + ", " + REGION_LABELS[r]) +
          '">' +
          escapeHtml(REGION_LABELS[r]) +
          "</th>",
      )
      .join("");
  }

  function latestTableHead() {
    return (
      '<tr class="head-row head-row-1"><th class="sticky-col" rowspan="3">Страница / запрос</th>' +
      '<th class="engine-group" colspan="' +
      SERP_COLS +
      '">SERP (наша съёмка)</th>' +
      '<th class="panel-group" colspan="' +
      PANEL_COLS +
      '">Панели</th></tr>' +
      '<tr class="head-row head-row-2">' +
      '<th class="engine-group" colspan="' +
      YANDEX_REGIONS.length +
      '">Яндекс</th>' +
      '<th class="engine-group" colspan="' +
      GOOGLE_REGIONS.length +
      '">Google</th>' +
      '<th class="region-col" rowspan="2" title="Google Search Console, средняя позиция">GSC</th>' +
      '<th class="region-col" rowspan="2" title="Яндекс Вебмастер, AVG_SHOW_POSITION">Я.ВМ</th>' +
      "</tr>" +
      '<tr class="head-row head-row-3">' +
      serpRegionHeaders("yandex") +
      serpRegionHeaders("google") +
      "</tr>"
    );
  }

  /** Три строки шапки — разный top, чтобы все ряды липли под верх экрана */
  function syncRankTableStickyHead() {
    const thead = document.querySelector("#main-table thead");
    if (!thead) return;
    const rows = [...thead.querySelectorAll("tr")];
    let offset = 0;
    rows.forEach((row, rowIdx) => {
      const rowH = row.getBoundingClientRect().height;
      for (const th of row.querySelectorAll(":scope > th")) {
        th.style.top = offset + "px";
        const z = th.classList.contains("sticky-col") ? 30 + rowIdx : 20 - rowIdx;
        th.style.zIndex = String(z);
      }
      offset += rowH;
    });
  }

  function refreshRankStickyClone() {
    const main = document.getElementById("main-table");
    const cloneTable = document.getElementById("rank-table-sticky-clone-table");
    const bar = document.getElementById("rank-table-sticky-clone");
    if (!main || !cloneTable || !bar) return;
    const thead = main.querySelector("thead");
    if (!thead) return;
    cloneTable.innerHTML = "";
    const cloneThead = document.createElement("thead");
    cloneThead.innerHTML = thead.innerHTML;
    cloneTable.appendChild(cloneThead);
    const mainRows = [...thead.querySelectorAll("tr")];
    const cloneRows = [...cloneThead.querySelectorAll("tr")];
    mainRows.forEach((row, ri) => {
      const cloneRow = cloneRows[ri];
      if (!cloneRow) return;
      const mainCells = [...row.querySelectorAll("th")];
      const cloneCells = [...cloneRow.querySelectorAll("th")];
      mainCells.forEach((th, ci) => {
        const w = th.getBoundingClientRect().width;
        if (cloneCells[ci]) {
          cloneCells[ci].style.width = w + "px";
          cloneCells[ci].style.minWidth = w + "px";
          cloneCells[ci].style.maxWidth = w + "px";
        }
      });
    });
    cloneTable.style.width = main.offsetWidth + "px";
    updateRankStickyCloneLayout();
  }

  function updateRankStickyCloneLayout() {
    const main = document.getElementById("main-table");
    const bar = document.getElementById("rank-table-sticky-clone");
    if (!main || !bar || bar.hidden) return;
    const rect = main.getBoundingClientRect();
    bar.style.left = Math.max(0, rect.left) + "px";
    bar.style.width = rect.width + "px";
  }

  function setRankStickyCloneVisible(show) {
    const bar = document.getElementById("rank-table-sticky-clone");
    if (!bar) return;
    if (show) {
      refreshRankStickyClone();
      bar.hidden = false;
      bar.setAttribute("aria-hidden", "false");
    } else {
      bar.hidden = true;
      bar.setAttribute("aria-hidden", "true");
    }
  }

  function checkRankStickyClone() {
    const main = document.getElementById("main-table");
    const bar = document.getElementById("rank-table-sticky-clone");
    if (!main || !bar) return;

    const tableRect = main.getBoundingClientRect();
    const thead = main.querySelector("thead");
    const theadRect = thead?.getBoundingClientRect();
    const barH = bar.offsetHeight || 0;

    // Пока прокручиваем тело таблицы; выше — шапка оригинала видна, ниже — ушли к блокам GSC/популярным
    const inTableViewport =
      tableRect.top < 2 && tableRect.bottom > barH + 8;
    const theadOffscreen = !theadRect || theadRect.bottom <= 2;

    const show = inTableViewport && theadOffscreen;

    if (show !== !bar.hidden) setRankStickyCloneVisible(show);
    else if (show) updateRankStickyCloneLayout();
  }

  function initRankTableStickyHead() {
    const main = document.getElementById("main-table");
    const thead = main?.querySelector("thead");
    if (!thead) return;
    syncRankTableStickyHead();
    refreshRankStickyClone();
    checkRankStickyClone();
    if (!window.__rankStickyCloneScroll) {
      window.__rankStickyCloneScroll = true;
      window.addEventListener("scroll", checkRankStickyClone, { passive: true });
      window.addEventListener("resize", () => {
        syncRankTableStickyHead();
        refreshRankStickyClone();
        checkRankStickyClone();
      });
    }
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        syncRankTableStickyHead();
        refreshRankStickyClone();
        checkRankStickyClone();
      });
      ro.observe(thead);
      ro.observe(main);
    }
  }

  function delta(prev, curr) {
    if (!entryHasSerpResult(prev) || !entryHasSerpResult(curr)) return null;
    const a = prev.outOfTop20 || prev.position == null ? ORGANIC_DEPTH + 1 : prev.position;
    const b = curr.outOfTop20 || curr.position == null ? ORGANIC_DEPTH + 1 : curr.position;
    const d = a - b;
    if (d === 0) return { text: "0", cls: "flat" };
    if (d > 0) return { text: "+" + d, cls: "up" };
    return { text: String(d), cls: "down" };
  }

  function renderSummary() {
    const el = document.getElementById("summary");
    if (!latestDate) {
      el.innerHTML = '<div class="stat"><strong>—</strong><span>Нет снимков</span></div>';
      return;
    }
    const check = sortedChecks.find((c) => c.date === latestDate);
    let total = 0;
    let top10 = 0;
    let top20 = 0;
    let top50 = 0;
    for (const page of DATA.pages) {
      for (const q of page.queries) {
        for (const sl of SLICES) {
          const e = findEntry(check, page.id, q.id, sl.engine, sl.region);
          if (!entryHasSerpResult(e)) continue;
          total++;
          if (!e.outOfTop20 && e.position != null) {
            if (e.position <= 10) top10++;
            if (e.position <= 20) top20++;
            if (e.position <= ORGANIC_DEPTH) top50++;
          }
        }
      }
    }
    const pct10 = total ? Math.round((top10 / total) * 100) : 0;
    const pct50 = total ? Math.round((top50 / total) * 100) : 0;
    el.innerHTML =
      '<div class="stat"><strong>' +
      total +
      '</strong><span>запросов в снимке</span></div>' +
      '<div class="stat"><strong>' +
      pct10 +
      '%</strong><span>в топ-10</span></div>' +
      '<div class="stat"><strong>' +
      pct50 +
      '%</strong><span>в топ-' +
      ORGANIC_DEPTH +
      "</span></div>";
  }

  function renderTable() {
    const head = document.getElementById("table-head");
    const body = document.getElementById("table-body");
    const colSpan = 1 + SERP_COLS + PANEL_COLS;

    if (viewMode === "latest") {
      head.innerHTML = latestTableHead();
      let rows = "";
      const check = mergeChecksUpTo(latestDate);
      const prevIdx = dates.indexOf(latestDate) - 1;
      const prevCheck = prevIdx >= 0 ? mergeChecksUpTo(dates[prevIdx]) : null;
      for (const page of DATA.pages) {
        rows +=
          '<tr class="page-row"><td class="sticky-col" colspan="' +
          colSpan +
          '"><a href="' +
          escapeAttr(page.url) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(page.title) +
          "</a> <span class=\\"badge\\">" +
          escapeHtml(page.path) +
          "</span></td></tr>";
        for (const q of page.queries) {
          rows += '<tr><td class="sticky-col query-text">' + escapeHtml(q.text) + "</td>";
          for (const sl of SLICES) {
            rows += renderPosCell(
              findEntry(check, page.id, q.id, sl.engine, sl.region),
              findEntry(prevCheck, page.id, q.id, sl.engine, sl.region),
              q.text,
              sl.engine,
              sl.region,
            );
          }
          rows += renderPanelCells(page.id, q.id);
          rows += "</tr>";
        }
      }
      body.innerHTML = rows;
      initRankTableStickyHead();
    } else {
      const cols = historyDates.length ? historyDates : ["—"];
      head.innerHTML =
        '<tr class="head-row head-row-1"><th class="sticky-col">Страница / запрос</th>' +
        cols
          .map((d) => '<th colspan="' + (SERP_COLS + PANEL_COLS) + '">' + escapeHtml(d) + "</th>")
          .join("") +
        '</tr><tr class="head-row head-row-2"><th class="sticky-col"></th>' +
        cols
          .map(() =>
            SLICES.map(
              (sl) =>
                '<th class="region-col" title="' +
                escapeAttr(ENGINE_LABELS[sl.engine] + ", " + REGION_LABELS[sl.region]) +
                '">' +
                escapeHtml(ENGINE_LABELS[sl.engine].charAt(0) + " " + REGION_LABELS[sl.region]) +
                "</th>",
            ).join("") +
            '<th class="region-col">GSC</th><th class="region-col">Я.ВМ</th>',
          )
          .join("") +
        "</tr>";
      let rows = "";
      for (const page of DATA.pages) {
        rows +=
          '<tr class="page-row"><td class="sticky-col" colspan="' +
          (1 + cols.length * (SERP_COLS + PANEL_COLS)) +
          '"><a href="' +
          escapeAttr(page.url) +
          '">' +
          escapeHtml(page.title) +
          "</a></td></tr>";
        for (const q of page.queries) {
          rows += '<tr><td class="sticky-col query-text">' + escapeHtml(q.text) + "</td>";
          for (const d of cols) {
            const check = checkForDate(d);
            for (const sl of SLICES) {
              rows += renderPosCell(
                findEntry(check, page.id, q.id, sl.engine, sl.region),
                null,
                q.text,
                sl.engine,
                sl.region,
              );
            }
            rows += renderPanelCells(page.id, q.id);
          }
          rows += "</tr>";
        }
      }
      body.innerHTML = rows;
      initRankTableStickyHead();
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function normalizeKey(s) {
    return String(s)
      .replace(/\\u00a0/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, " ");
  }

  function trackedQueryKeys() {
    const set = new Set();
    for (const page of DATA.pages) {
      for (const q of page.queries) set.add(normalizeKey(q.text));
    }
    return set;
  }

  function trackedPaths() {
    return DATA.pages.map((p) => {
      const path = p.path.replace(/\\/\\$/, "") || "/";
      return path;
    });
  }

  function pathnameFromUrl(url) {
    try {
      const u = new URL(url);
      return u.pathname.replace(/\\/\\$/, "") || "/";
    } catch {
      return "";
    }
  }

  function isTrackedPage(url) {
    const p = pathnameFromUrl(url);
    return trackedPaths().some((tp) => p === tp || (tp !== "/" && p.startsWith(tp + "/")));
  }

  function popularCard(title, thead, tbody) {
    const inner = tbody
      ? '<div class="table-scroll"><table><thead>' +
        thead +
        "</thead><tbody>" +
        tbody +
        "</tbody></table></div>"
      : '<p class="popular-empty">Нет данных за период</p>';
    return '<div class="popular-card"><h3>' + escapeHtml(title) + "</h3>" + inner + "</div>";
  }

  function renderPopularQueries() {
    const note = document.getElementById("popular-queries-note");
    const grid = document.getElementById("popular-queries-grid");
    const pop = DATA.panels && DATA.panels.popular;
    if (!pop || !DATA.panels.period) {
      note.textContent = "Загрузите панели: npm run seo:rank-dashboard:panels";
      grid.innerHTML =
        popularCard("Google Search Console", "", "") + popularCard("Яндекс Вебмастер", "", "");
      return;
    }
    const per = DATA.panels.period;
    note.textContent =
      "Топ-" +
      pop.limit +
      " за " +
      per.startDate +
      " … " +
      per.endDate +
      " (те же API, что MCP). Выделены запросы из таблицы выше.";
    const tracked = trackedQueryKeys();
    const gHead =
      "<tr><th>#</th><th>Запрос</th><th>Клики</th><th>Показы</th><th>Поз.</th></tr>";
    let gBody = "";
    pop.queries.google.forEach((r, i) => {
      const tr = tracked.has(normalizeKey(r.text)) ? ' class="tracked"' : "";
      gBody +=
        "<tr" +
        tr +
        "><td>" +
        (i + 1) +
        "</td><td>" +
        escapeHtml(r.text) +
        "</td><td>" +
        r.clicks +
        "</td><td>" +
        r.impressions +
        "</td><td>" +
        escapeHtml(String(r.position)) +
        "</td></tr>";
    });
    const yHead =
      "<tr><th>#</th><th>Запрос</th><th>Показы</th><th>Клики</th><th>Поз.</th></tr>";
    let yBody = "";
    pop.queries.yandex.forEach((r, i) => {
      const tr = tracked.has(normalizeKey(r.text)) ? ' class="tracked"' : "";
      yBody +=
        "<tr" +
        tr +
        "><td>" +
        (i + 1) +
        "</td><td>" +
        escapeHtml(r.text) +
        "</td><td>" +
        r.shows +
        "</td><td>" +
        r.clicks +
        "</td><td>" +
        (r.avgShowPosition != null ? escapeHtml(String(r.avgShowPosition)) : "—") +
        "</td></tr>";
    });
    grid.innerHTML =
      popularCard("Google Search Console", gHead, gBody) +
      popularCard("Яндекс Вебмастер", yHead, yBody);
  }

  function renderPopularPages() {
    const note = document.getElementById("popular-pages-note");
    const grid = document.getElementById("popular-pages-grid");
    const pop = DATA.panels && DATA.panels.popular;
    if (!pop || !DATA.panels.period) {
      note.textContent = "Загрузите панели: npm run seo:rank-dashboard:panels";
      grid.innerHTML =
        popularCard("Google Search Console", "", "") + popularCard("Яндекс Вебмастер", "", "");
      return;
    }
    const per = DATA.panels.period;
    const pagesLimit = pop.pagesLimit || 10;
    let noteText =
      "Топ-" +
      pagesLimit +
      " страниц за " +
      per.startDate +
      " … " +
      per.endDate +
      ". Выделены URL из списка страниц дашборда.";
    if (pop.notes && pop.notes.pagesYandex) noteText += " " + pop.notes.pagesYandex;
    note.textContent = noteText;
    const gHead =
      "<tr><th>#</th><th>Страница</th><th>Клики</th><th>Показы</th><th>Поз.</th></tr>";
    let gBody = "";
    pop.pages.google.forEach((r, i) => {
      const tr = isTrackedPage(r.url) ? ' class="tracked"' : "";
      gBody +=
        "<tr" +
        tr +
        "><td>" +
        (i + 1) +
        '</td><td><a href="' +
        escapeAttr(r.url) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(r.url) +
        "</a></td><td>" +
        r.clicks +
        "</td><td>" +
        r.impressions +
        "</td><td>" +
        escapeHtml(String(r.position)) +
        "</td></tr>";
    });
    const yHead =
      "<tr><th>#</th><th>Страница</th>" +
      '<th class="num abbr" title="Метрика: визиты, organic, поисковая система Яндекс">Переходы</th>' +
      '<th class="num abbr" title="Яндекс Вебмастер: клики по запросу, если фраза привязана к URL">Клики ВМ</th>' +
      '<th class="num abbr" title="Яндекс Вебмастер: показы по запросу, если фраза привязана к URL">Показы</th>' +
      '<th class="num abbr" title="Яндекс Вебмастер: средняя позиция показа">Поз.</th></tr>';
    let yBody = "";
    pop.pages.yandex.forEach((r, i) => {
      const tr = isTrackedPage(r.url) ? ' class="tracked"' : "";
      const visits = r.visits != null ? r.visits : 0;
      const wmClicks =
        r.wmClicks != null ? r.wmClicks : r.clicks != null && r.clicks !== visits ? r.clicks : 0;
      yBody +=
        "<tr" +
        tr +
        "><td>" +
        (i + 1) +
        '</td><td><a href="' +
        escapeAttr(r.url) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(r.url) +
        '</a></td><td class="num">' +
        (visits > 0 ? visits : "—") +
        '</td><td class="num">' +
        (wmClicks > 0 ? wmClicks : "—") +
        '</td><td class="num">' +
        (r.shows > 0 ? r.shows : "—") +
        '</td><td class="num">' +
        (r.avgShowPosition != null ? escapeHtml(String(r.avgShowPosition)) : "—") +
        "</td></tr>";
    });
    grid.innerHTML =
      popularCard("Google Search Console", gHead, gBody) +
      popularCard("Яндекс Вебмастер", yHead, yBody);
  }

  function refresh() {
    renderSummary();
    renderTable();
    renderPopularQueries();
    renderPopularPages();
  }

  document.getElementById("btn-view-latest").addEventListener("click", () => {
    viewMode = "latest";
    document.getElementById("btn-view-latest").setAttribute("aria-pressed", "true");
    document.getElementById("btn-view-history").setAttribute("aria-pressed", "false");
    refresh();
  });
  document.getElementById("btn-view-history").addEventListener("click", () => {
    viewMode = "history";
    document.getElementById("btn-view-latest").setAttribute("aria-pressed", "false");
    document.getElementById("btn-view-history").setAttribute("aria-pressed", "true");
    refresh();
  });

  window.addEventListener("resize", () => {
    requestAnimationFrame(initRankTableStickyHead);
  });

  const meta = document.getElementById("meta-last-check");
  if (latestDate) {
    const days = Math.floor(
      (Date.now() - new Date(latestDate + "T12:00:00").getTime()) / 86400000,
    );
    let stale = "";
    if (days > 7) stale = ' <span class="stale">проверка старше 7 дней</span>';
    meta.innerHTML =
      "Последний снимок: <strong>" + latestDate + "</strong>." + stale;
  } else {
    meta.textContent = "Снимков пока нет — npm run seo:rank-dashboard:serp:interactive";
  }
  document.getElementById("built-at").textContent = DATA.builtAt
    ? new Date(DATA.builtAt).toLocaleString("ru-RU")
    : "—";

  refresh();
  initRankTableStickyHead();
})();
  </script>
</body>
</html>
`;


fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log("OK:", OUT, `(${dash.pages.length} pages, ${dash.checks.length} checks)`);
