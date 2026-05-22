#!/usr/bin/env node
/**
 * Onepage SEO-ТЗ → docs/{slug}-onepage-seo-tz.html
 * Данные: fetch HTML (landing-content-audit), json/seo/rank-dashboard.json
 *
 * node scripts/seo/build-onepage-seo-tz.mjs
 * node scripts/seo/build-onepage-seo-tz.mjs marketing home
 *
 * После сборки по умолчанию: bash scripts/deploy-dev-docs.sh (static.serenity.agency/docs/…).
 * Без выкладки: ONEPAGE_TZ_SKIP_DEPLOY=1
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  fetchAndAudit,
  BLOCK_IDS,
  BLOCK_LABELS,
} from "./lib/landing-content-audit.mjs";
import {
  ONEPAGE_TZ_PAGES,
  getOnepageTzPage,
} from "./lib/onepage-seo-tz-pages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const RANK_PATH = path.join(ROOT, "json/seo/rank-dashboard.json");
const DOCS = path.join(ROOT, "docs");
const STATIC_DOCS = "https://static.serenity.agency/docs";
const SNAPSHOT = process.env.ONEPAGE_TZ_DATE || new Date().toISOString().slice(0, 10);

const CSS = `
    :root {
      --bg: #f6f7f9; --card: #fff; --text: #1a1d21; --muted: #5c6570;
      --border: #d8dee6; --accent: #1e5a8c; --gap-high: #b42318;
      --gap-vol: #b54708; --ok: #0d6b4f; --code: #f0f3f7;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 15px; line-height: 1.55; color: var(--text); background: var(--bg); }
    .wrap { max-width: 960px; margin: 0 auto; padding: 28px 20px 48px; }
    h1 { font-size: 1.55rem; margin: 0 0 8px; }
    .subtitle { color: var(--muted); max-width: 720px; }
    section { background: var(--card); border: 1px solid var(--border); border-radius: 10px;
      padding: 22px; margin-bottom: 18px; }
    h2 { font-size: 1.1rem; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    h3 { font-size: 0.98rem; margin: 16px 0 8px; }
    .muted { color: var(--muted); font-size: 0.92rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: var(--code); }
    .table-scroll { overflow-x: auto; }
    code { background: var(--code); padding: 2px 5px; border-radius: 4px; font-size: 0.85em; }
    .badge { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 2px 7px;
      border-radius: 4px; }
    .pri-p1 { background: #fde8e8; color: var(--gap-high); }
    .pri-p2 { background: #fff4e5; color: var(--gap-vol); }
    .pri-p3 { background: var(--code); color: var(--muted); }
    .executive-box { border: 2px solid var(--accent); background: #f0f6fc; }
    .executive-box h2 { border-bottom-color: var(--accent); color: var(--accent); }
    .ok { color: var(--ok); }
    .miss { color: var(--gap-high); }
    ol.checklist { margin: 0; padding-left: 1.25em; }
    ol.checklist li { margin-bottom: 10px; }
    a { color: var(--accent); }
`;

/** @param {string} s */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadRankDashboard() {
  return JSON.parse(fs.readFileSync(RANK_PATH, "utf8"));
}

/**
 * @param {ReturnType<typeof loadRankDashboard>} dash
 * @param {string} pageId
 */
function latestSerpByQuery(dash, pageId) {
  const checks = [...(dash.checks || [])].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  const latest = checks[0];
  if (!latest?.entries) return { date: null, rows: [] };
  const rows = latest.entries.filter((e) => e.pageId === pageId);
  /** @type {Map<string, object>} */
  const byKey = new Map();
  for (const e of rows) {
    const k = `${e.queryId}|${e.engine}|${e.region}`;
    if (!byKey.has(k)) byKey.set(k, e);
  }
  return { date: latest.date, rows: [...byKey.values()] };
}

/**
 * @param {ReturnType<typeof loadRankDashboard>} dash
 * @param {string} pageId
 * @param {string} queryId
 */
function panelRow(dash, pageId, queryId) {
  const key = `${pageId}|${queryId}`;
  return dash.panels?.byQuery?.[key] || null;
}

/** @param {import('./lib/onepage-seo-tz-pages.mjs').OnepageTzPage} page */
function checklistSection(page) {
  const block = (pri, cls, items) => {
    if (!items.length) return "";
    return `<h3><span class="badge ${cls}">${pri}</span> ${pri === "P1" ? "Срочно" : pri === "P2" ? "Важно" : "Дополнительно"}</h3>
      <ol class="checklist">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
  };
  return `
    <section id="onepage" class="executive-box">
      <h2>Onepage: всё для топ-10 (чеклист работ)</h2>
      <p class="muted">Один документ = ТЗ на SEO и контент. Порядок: P1 → P2 → P3. Полный SERP gap (как у контекстной) — отдельным этапом после съёмки выдачи.</p>
      ${block("P1", "pri-p1", page.checklistP1)}
      ${block("P2", "pri-p2", page.checklistP2)}
      ${block("P3", "pri-p3", page.checklistP3)}
      <h3>Порядок внедрения</h3>
      <p>${page.checklistP1.slice(0, 2).map(esc).join(" → ")} → P2 → P3.</p>
    </section>`;
}

/**
 * @param {import('./lib/onepage-seo-tz-pages.mjs').OnepageTzPage} page
 * @param {ReturnType<typeof loadRankDashboard>} dash
 */
function visibilityHtml(page, dash) {
  const serp = latestSerpByQuery(dash, page.rankDashboardPageId);
  const serpRows = page.queries
    .flatMap((q) => {
      const entries = serp.rows.filter((e) => e.queryId === q.id);
      if (!entries.length) {
        return [
          `<tr><td>${esc(q.text)}</td><td colspan="4" class="muted">нет снимка SERP</td></tr>`,
        ];
      }
      return entries.map((e) => {
        const pos = e.outOfTop20 ? ">20" : String(e.position ?? "—");
        return `<tr>
          <td>${esc(q.text)}</td>
          <td>${esc(e.engine)}</td>
          <td>${esc(e.region)}</td>
          <td>${esc(pos)}</td>
          <td class="mono">${esc(e.matchedUrl || "—")}</td>
        </tr>`;
      });
    })
    .join("");

  const panelRows = page.queries
    .map((q) => {
      const p = panelRow(dash, page.rankDashboardPageId, q.id);
      if (!p) {
        return `<tr><td>${esc(q.text)}</td><td colspan="4" class="muted">нет панели</td></tr>`;
      }
      const g = p.google;
      const y = p.yandex;
      return `<tr>
        <td>${esc(q.text)}</td>
        <td>${g ? `${g.avgPosition?.toFixed?.(1) ?? g.avgPosition} (${g.clicks} кл., ${g.impressions} пок.)` : "—"}</td>
        <td>${y ? `${y.avgShowPosition?.toFixed?.(1) ?? y.avgShowPosition} (${y.clicks} кл., ${y.shows} пок.)` : "—"}</td>
      </tr>`;
    })
    .join("");

  const period = dash.panels?.period;
  return `
    <section id="visibility">
      <h2>Видимость сейчас</h2>
      <p class="muted">SERP: снимок дашборда <strong>${esc(serp.date || "—")}</strong>.
        Панели GSC/Я.Вебмастер: ${period ? `${period.startDate} — ${period.endDate}` : "—"}.</p>
      <h3>Органическая выдача (SERP, ручная съёмка)</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>Запрос</th><th>ПС</th><th>Регион</th><th>Поз.</th><th>URL в выдаче</th></tr></thead>
        <tbody>${serpRows}</tbody>
      </table></div>
      <h3>Панели (средняя позиция, не = SERP)</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>Запрос</th><th>Google</th><th>Яндекс</th></tr></thead>
        <tbody>${panelRows}</tbody>
      </table></div>
    </section>`;
}

/** @param {Awaited<ReturnType<typeof fetchAndAudit>>} audit */
function blocksHtml(audit) {
  if (audit.error) {
    return `<section id="blocks"><h2>Блоки на странице</h2><p class="miss">Ошибка загрузки: ${esc(audit.error)}</p></section>`;
  }
  const rows = BLOCK_IDS.map((id) => {
    const has = audit.blocks?.[id];
    return `<tr><td>${esc(BLOCK_LABELS[id])}</td><td>${has ? '<span class="ok">да</span>' : '<span class="miss">нет</span>'}</td></tr>`;
  }).join("");
  const vol = audit.volumes || {};
  return `
    <section id="blocks">
      <h2>Блоки на странице (автоаудит HTML)</h2>
      <p class="muted">URL: <code>${esc(audit.url)}</code>, H1: <strong>${esc(audit.h1 || "—")}</strong></p>
      <div class="table-scroll"><table>
        <thead><tr><th>Блок</th><th>Есть</th></tr></thead><tbody>${rows}</tbody>
      </table></div>
      <p class="muted">Объём: ~${vol.word_count_visible ?? 0} слов, H2: ${vol.h2_count ?? 0}, FAQ пунктов: ${vol.faq_items ?? 0}, форм: ${vol.form_count ?? 0}.</p>
    </section>`;
}

/** @param {import('./lib/onepage-seo-tz-pages.mjs').OnepageTzPage} page */
/** @param {Awaited<ReturnType<typeof fetchAndAudit>>} audit */
function metaHtml(page, audit) {
  const rec = page.metaRecommendations;
  return `
    <section id="meta">
      <h2>Meta и заголовки</h2>
      <table>
        <tr><th></th><th>Сейчас (аудит)</th><th>Рекомендация ТЗ</th></tr>
        <tr><td>H1</td><td>${esc(audit.h1 || "—")}</td><td>${esc(rec.h1 || "—")}</td></tr>
        <tr><td>Title</td><td class="muted">см. исходный HTML / GSC</td><td>${esc(rec.title || "—")}</td></tr>
        <tr><td>Description</td><td class="muted">см. исходный HTML / GSC</td><td>${esc(rec.description || "—")}</td></tr>
      </table>
    </section>`;
}

/** @param {import('./lib/onepage-seo-tz-pages.mjs').OnepageTzPage} page */
async function buildPage(page) {
  const dash = loadRankDashboard();
  const audit = await fetchAndAudit(page.url);
  const docFile = `${page.slug}-onepage-seo-tz.html`;
  const docUrl = `${STATIC_DOCS}/${docFile}`;

  const migrationBlock = page.migrationNotes?.length
    ? `<section id="migration"><h2>Миграция на статику</h2><ol>${page.migrationNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></section>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Serenity — Onepage SEO-ТЗ ${esc(page.path)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Onepage SEO-ТЗ: ${esc(page.title)}</h1>
      <p class="subtitle">
        <a href="${esc(page.url)}">${esc(page.url)}</a> ·
        контур: <strong>${page.isStatic ? "новый (статика)" : "legacy WordPress"}</strong>
        ${page.staticSince ? ` · статика с <strong>${esc(page.staticSince)}</strong>` : ""}
        · снимок <strong>${SNAPSHOT}</strong>
      </p>
    </header>
    ${checklistSection(page)}
    ${visibilityHtml(page, dash)}
    ${metaHtml(page, audit)}
    ${blocksHtml(audit)}
    <section id="notes">
      <h2>Контент и техника</h2>
      <h3>Контент</h3><ul>${page.contentNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      <h3>Техника</h3><ul>${page.technicalNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
    </section>
    ${migrationBlock}
    <section class="muted">
      <p>Превью: <a href="${docUrl}">${docUrl}</a> (выкладка <code>deploy-dev-docs.sh</code> после сборки)</p>
      <p>Расширенный SERP gap (топ-20 конкурентов): <code>npm run seo:kontekstnaya-serp-gap</code> — по аналогии завести кампанию для страницы.</p>
    </section>
  </div>
</body>
</html>`;

  const out = path.join(DOCS, docFile);
  fs.writeFileSync(out, html, "utf8");
  return { out, docUrl, page };
}

function deployDocsToDev() {
  if (process.env.ONEPAGE_TZ_SKIP_DEPLOY === "1") {
    console.log("ONEPAGE_TZ_SKIP_DEPLOY=1 — выкладка docs на dev пропущена");
    return;
  }
  const script = path.join(ROOT, "scripts/deploy-dev-docs.sh");
  console.log("\n→ Выкладка docs/ на dev …");
  const r = spawnSync("bash", [script], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) {
    console.warn(
      `⚠️  deploy-dev-docs.sh завершился с кодом ${r.status ?? "?"} — ссылки в таблице 404 до выкладки`,
    );
    process.exit(r.status || 1);
  }
}

async function main() {
  const ids = process.argv.slice(2);
  const pages = ids.length
    ? ids.map((id) => getOnepageTzPage(id))
    : ONEPAGE_TZ_PAGES;

  for (const page of pages) {
    const { out, docUrl } = await buildPage(page);
    console.log(`OK: ${out}`);
    console.log(`    ${docUrl}`);
  }

  deployDocsToDev();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
