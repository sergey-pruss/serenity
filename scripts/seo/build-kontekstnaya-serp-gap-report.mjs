#!/usr/bin/env node
/**
 * HTML-отчёт gap-анализа → docs/kontekstnaya-serp-content-gap.html
 */
import fs from "node:fs";
import path from "node:path";
import {
  BLOCK_IDS,
  BLOCK_LABELS,
  median,
  percentile25,
} from "./lib/landing-content-audit.mjs";
import { getSerpCampaign } from "./lib/serp-campaigns.mjs";
import { ENGINES, REGIONS } from "./lib/serp-shared.mjs";

const campaign = getSerpCampaign();
const QUERIES = campaign.queries;
const SERENITY_URL = campaign.serenityUrl;
const DOC_OUT = campaign.docOut;
import {
  buildExecutiveSummary,
  executiveSummaryHtml,
} from "./lib/gap-executive-summary.mjs";
import { isSerpJunkUrl } from "./lib/serp-url-filter.mjs";

const RECOMMENDATIONS = {
  platforms_social:
    "Блок площадок: VK, Telegram, при необходимости другие соцсети — иконки и короткие подписи в hero или сразу под ним.",
  trust_logos: "Добавить полосу логотипов клиентов или «нам доверяют» сразу под hero.",
  testimonials: "Выделить блок отзывов с рейтингом или цитатами (отдельно от кейсов).",
  stats_kpi: "Полоса KPI: проекты, лиды, опыт, сертификация Директа.",
  geo_moscow_spb:
    "В hero или подзаголовке — явная привязка к Москве/СПб для региональных запросов.",
  calculator: "Калькулятор или квиз «рассчитать бюджет» перед формой.",
  price_table_compare: "Таблица сравнения пакетов (не только слайдер карточек).",
  video: "Короткое видео: эксперт или разбор кейса.",
  guarantees: "Блок гарантий / SLA / условий ведения.",
  focus_vedenie:
    "Для запроса «ведение»: отдельный H2, отчёность, ежемесячная оптимизация, SLA.",
  focus_nastroyka:
    "Для запроса «настройка»: акцент на запуск, аудит, семантика, первые 30 дней.",
  blog_teaser: "3–4 ссылки на статьи блога по контексту (внутренняя перелинковка).",
  chat_widget: "Онлайн-чат или мессенджер в углу (если есть операторы).",
  seo_footer_text:
    "При нехватке текста — SEO-блок с ответами на смежные вопросы (без переспама).",
};

/** @param {unknown[]} competitors */
function competitorAudits(competitors) {
  return competitors
    .map((c) => /** @type {{ audit?: { blocks?: Record<string, boolean>; volumes?: Record<string, number>; error?: string } }} */ (c).audit)
    .filter((a) => a && !a.error);
}

/**
 * @param {{ blocks?: Record<string, boolean>; volumes?: Record<string, number> } | null | undefined} serenity
 * @param {ReturnType<typeof competitorAudits>} comps
 */
function buildBlockComparison(serenity, comps) {
  const n = comps.length || 1;
  return BLOCK_IDS.map((id) => {
    const withBlock = comps.filter((c) => c.blocks?.[id]).length;
    const pct = Math.round((withBlock / n) * 100);
    const serenityHas = Boolean(serenity?.blocks?.[id]);
    let gap = "—";
    if (pct >= 60 && !serenityHas) gap = "high";
    else if (serenityHas && withBlock >= 3) {
      gap = "ok";
    }
    return {
      id,
      label: BLOCK_LABELS[id],
      serenity: serenityHas ? "да" : "нет",
      pctTop20: pct,
      gap,
    };
  });
}

/**
 * @param {{ volumes?: Record<string, number> } | null | undefined} serenity
 * @param {ReturnType<typeof competitorAudits>} comps
 */
function buildVolumeComparison(serenity, comps) {
  const metrics = [
    ["word_count_visible", "Слов в контенте"],
    ["h2_count", "Заголовков H2"],
    ["h3_count", "Заголовков H3"],
    ["faq_items", "Элементов FAQ (оценка)"],
    ["image_count", "Изображений"],
  ];
  return metrics.map(([key, label]) => {
    const vals = comps.map((c) => c.volumes?.[key] ?? 0).filter((v) => v > 0);
    const med = Math.round(median(vals));
    const p25 = Math.round(percentile25(vals));
    const ours = serenity?.volumes?.[key] ?? 0;
    let gap = "—";
    if (vals.length >= 5 && ours < p25 && p25 - ours >= 2) gap = "volume";
    else if (ours >= med) gap = "ok";
    return { key, label, serenity: ours, median: med, p25, gap };
  });
}

/**
 * @param {Record<string, unknown>} auditPayload
 */
function aggregateGaps(auditPayload) {
  const thresholds = campaign.aggregatePriorityThresholds;
  const exclude = new Set(campaign.excludeBlocksFromPriority || []);
  /** @type {Map<string, { count: number; serpCount: number; missingOnSerenity: number }>} */
  const agg = new Map();
  let serpCount = 0;

  for (const block of Object.values(auditPayload.matrix || {})) {
    serpCount++;
    const comps = competitorAudits(block.competitors || []);
    const serenity = block.serenityAudit || auditPayload.serenityAudit;
    const rows = buildBlockComparison(serenity, comps);
    for (const r of rows) {
      if (!agg.has(r.id)) {
        agg.set(r.id, { count: 0, serpCount: 0, missingOnSerenity: 0 });
      }
      const a = agg.get(r.id);
      if (r.pctTop20 >= 50) a.count++;
      a.serpCount++;
      if (r.gap === "high") a.missingOnSerenity++;
    }
  }

  const scored = [...agg.entries()]
    .map(([id, a]) => ({
      id,
      label: BLOCK_LABELS[id],
      avgPresence: Math.round((a.count / serpCount) * 100),
      missingInSerps: a.missingOnSerenity,
      priority:
        a.missingOnSerenity >= thresholds.p1
          ? "P1"
          : a.missingOnSerenity >= thresholds.p2
            ? "P2"
            : a.missingOnSerenity >= thresholds.p3
              ? "P3"
              : null,
      recommendation: RECOMMENDATIONS[id] || "",
    }))
    .filter((x) => x.missingInSerps > 0 && !exclude.has(x.id))
    .sort((a, b) => b.missingInSerps - a.missingInSerps);

  return { scored, serpCount };
}

/** @param {string} s */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} gap */
function gapBadge(gap) {
  if (gap === "high") return '<span class="badge gap-high">нет у нас</span>';
  if (gap === "volume") return '<span class="badge gap-vol">объём</span>';
  if (gap === "ok") return '<span class="badge gap-ok">ок</span>';
  return '<span class="badge">—</span>';
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} block
 * @param {Record<string, unknown>} auditPayload
 */
function renderSerpSection(key, block, auditPayload) {
  const serenity = block.serenityAudit || auditPayload.serenityAudit;
  const comps = competitorAudits(block.competitors || []);
  const blockRows = buildBlockComparison(serenity, comps);
  const volRows = buildVolumeComparison(serenity, comps);

  const queryNote =
    typeof campaign.querySectionNote === "function"
      ? campaign.querySectionNote(block)
      : "";

  const top20Rows = (block.competitors || [])
    .map(
      (c) => /** @type {{ position: number; displayDomain: string; url: string; audit?: { pageType?: string; error?: string } }} */ (c),
    )
    .map(
      (c) => `<tr>
        <td>${c.position}</td>
        <td class="mono">${esc(c.displayDomain)}</td>
        <td><a href="${esc(c.url)}" rel="noopener">${esc(c.url.slice(0, 72))}${c.url.length > 72 ? "…" : ""}</a></td>
        <td>${esc(c.audit?.pageType || "—")}${c.audit?.error ? ` <span class="muted">(${esc(c.audit.error)})</span>` : ""}</td>
      </tr>`,
    )
    .join("\n");

  const blockTable = blockRows
    .map(
      (r) => `<tr>
        <td>${esc(r.label)}</td>
        <td>${r.serenity === "да" ? "✓" : "—"}</td>
        <td>${r.pctTop20}%</td>
        <td>${gapBadge(r.gap)}</td>
      </tr>`,
    )
    .join("\n");

  const volTable = volRows
    .map(
      (r) => `<tr>
        <td>${esc(r.label)}</td>
        <td>${r.serenity}</td>
        <td>${r.median}</td>
        <td>${r.p25}</td>
        <td>${gapBadge(r.gap)}</td>
      </tr>`,
    )
    .join("\n");

  const warn = block.warning
    ? `<p class="warn">${esc(block.warning)}</p>`
    : "";

  return `<section id="${esc(key)}">
    <h2>${esc(block.query)} — ${block.engine === "yandex" ? "Яндекс" : "Google"} — ${esc(block.regionLabel)}</h2>
    ${warn}
    <p class="muted">${queryNote}</p>
    <h3>Топ-20 органики</h3>
    <div class="table-scroll">
      <table>
        <thead><tr><th>#</th><th>Домен</th><th>URL</th><th>Тип</th></tr></thead>
        <tbody>${top20Rows}</tbody>
      </table>
    </div>
    <h3>Блоки: Serenity vs топ-20</h3>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Блок</th><th>Serenity</th><th>% в топ-20</th><th>Gap</th></tr></thead>
        <tbody>${blockTable}</tbody>
      </table>
    </div>
    <h3>Объёмы контента</h3>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Метрика</th><th>Serenity</th><th>Медиана топ-20</th><th>P25</th><th>Gap</th></tr></thead>
        <tbody>${volTable}</tbody>
      </table>
    </div>
  </section>`;
}

/**
 * @param {Record<string, unknown>} auditPayload
 */
function buildHtml(auditPayload) {
  const { scored, serpCount } = aggregateGaps(auditPayload);
  const executive = buildExecutiveSummary(auditPayload);
  const executiveSection = executiveSummaryHtml(executive);

  /** @type {Map<string, number>} */
  const domainFreq = new Map();
  for (const block of Object.values(auditPayload.matrix || {})) {
    for (const c of block.competitors || []) {
      const d = c.displayDomain || "";
      if (!d || /^yabs\.yandex/i.test(d)) continue;
      if (c.url && isSerpJunkUrl(c.url)) continue;
      domainFreq.set(d, (domainFreq.get(d) || 0) + 1);
    }
  }
  const topDomains = [...domainFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(
      ([d, n]) =>
        `<tr><td class="mono">${esc(d)}</td><td>${n} / ${serpCount}</td></tr>`,
    )
    .join("\n");

  const priorityRows = scored
    .slice(0, 15)
    .map(
      (r) => `<tr>
        <td><span class="badge pri-${r.priority?.toLowerCase() || ""}">${r.priority || "—"}</span></td>
        <td>${esc(r.label)}</td>
        <td>${r.avgPresence}%</td>
        <td>${r.missingInSerps} / ${serpCount}</td>
        <td>${esc(r.recommendation)}</td>
      </tr>`,
    )
    .join("\n");

  const tocLinks = [];
  for (const q of QUERIES) {
    for (const engine of ENGINES) {
      for (const regionId of Object.keys(REGIONS)) {
        const key = `${q.id}__${engine}__${regionId}`;
        const block = auditPayload.matrix?.[key];
        if (!block) continue;
        const eng = engine === "yandex" ? "Яндекс" : "Google";
        tocLinks.push(
          `<a href="#${key}">${esc(q.text)} · ${eng} · ${REGIONS[regionId].label}</a>`,
        );
      }
    }
  }

  const sections = Object.entries(auditPayload.matrix || {})
    .map(([key, block]) => renderSerpSection(key, block, auditPayload))
    .join("\n");

  const serenity = auditPayload.serenityAudit;
  const serenityBlocks = serenity?.blocks
    ? BLOCK_IDS.filter((id) => serenity.blocks[id])
        .map((id) => `<li><code>${id}</code> — ${esc(BLOCK_LABELS[id])}</li>`)
        .join("\n")
    : "";

  const errors = Object.values(auditPayload.auditsByUrl || {})
    .filter((a) => a.error && !isSerpJunkUrl(a.url))
    .map((a) => `<li class="mono">${esc(a.url)} — ${esc(a.error)}</li>`)
    .join("\n");
  const junkNote =
    '<p class="muted">Служебные ссылки Яндекса (<code>yabs.yandex.ru</code>, редиректы <code>/count/</code>) из топ-20 и аудита исключены — это не посадочные конкурентов.</p>';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${esc(campaign.reportTitle)}</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --card: #fff;
      --text: #1a1d21;
      --muted: #5c6570;
      --border: #d8dee6;
      --accent: #1e5a8c;
      --warn: #8b4513;
      --gap-high: #b42318;
      --gap-vol: #b54708;
      --ok: #0d6b4f;
      --code: #f0f3f7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: var(--text);
      background: var(--bg);
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 48px; }
    h1 { font-size: 1.65rem; margin: 0 0 8px; }
    .subtitle { color: var(--muted); max-width: 820px; }
    nav.toc {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    nav.toc a {
      color: var(--accent);
      text-decoration: none;
      display: block;
      padding: 3px 0;
      font-size: 0.88rem;
    }
    section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 22px;
      margin-bottom: 20px;
    }
    h2 { font-size: 1.12rem; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    h3 { font-size: 1rem; margin: 18px 0 8px; }
    .muted { color: var(--muted); font-size: 0.92rem; }
    .warn { color: var(--warn); background: #fef6f0; padding: 10px 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: var(--code); font-weight: 600; }
    .table-scroll { overflow-x: auto; margin: 8px 0 16px; }
    .mono { font-family: ui-monospace, Menlo, monospace; font-size: 0.85em; }
    code { background: var(--code); padding: 2px 5px; border-radius: 4px; font-size: 0.85em; }
    .badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--code);
      color: var(--muted);
    }
    .gap-high { background: #fde8e8; color: var(--gap-high); }
    .gap-vol { background: #fff4e5; color: var(--gap-vol); }
    .gap-ok { background: #e6f4ee; color: var(--ok); }
    .pri-p1 { background: #fde8e8; color: var(--gap-high); }
    .pri-p2 { background: #fff4e5; color: var(--gap-vol); }
    .pri-p3 { background: var(--code); }
    a { color: var(--accent); }
    ul { margin: 8px 0; padding-left: 1.2em; }
    .executive-box {
      border: 2px solid var(--accent);
      background: #f0f6fc;
    }
    .executive-box h2 { border-bottom-color: var(--accent); color: var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${esc(campaign.reportH1)}</h1>
      <p class="subtitle">
        Сравнение <a href="${esc(SERENITY_URL)}">${esc(SERENITY_URL)}</a>
        ${esc(campaign.reportSubtitleQueries)}.
        Снимок: <strong>${esc(auditPayload.snapshotDateIso || auditPayload.snapshotDate || "")}</strong>.
        Метод SERP: ${esc(auditPayload.serpMethod || "playwright + curated-baseline при капче")}; аудит: fetch HTML. Выдача динамична — ориентир для доработки страницы под топ-10.
      </p>
    </header>

    ${executiveSection.replace('id="executive"', 'id="executive" class="executive-box"')}

    <nav class="toc">
      <strong>Содержание</strong>
      <a href="#executive"><strong>Общий вывод (топ-10)</strong></a>
      <a href="#summary">Сводка gap-блоков</a>
      <a href="#serenity-map">Что уже есть у Serenity</a>
      <a href="#domains">Частота доменов</a>
      ${tocLinks.join("\n")}
      <a href="#errors">Ошибки загрузки</a>
    </nav>

    <section id="summary">
      <h2>Сводка для топ-10 (агрегат ${serpCount} выдач)</h2>
      <p class="muted">Приоритет: P1 — блок отсутствует у нас в ≥6 выдачах при ≥50% конкурентов; P2 — ≥4; P3 — ≥2.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Приор.</th><th>Блок</th><th>Ср. % в топ-20</th><th>Нет у нас (выдач)</th><th>Рекомендация</th></tr>
          </thead>
          <tbody>${priorityRows || "<tr><td colspan=\"5\">Критичных gap не найдено</td></tr>"}</tbody>
        </table>
      </div>
    </section>

    <section id="serenity-map">
      <h2>Блоки на странице Serenity (детект)</h2>
      <ul>${serenityBlocks}</ul>
      <p class="muted">Объём: ${serenity?.volumes?.word_count_visible ?? "—"} слов,
        H2: ${serenity?.volumes?.h2_count ?? "—"},
        FAQ (оценка): ${serenity?.volumes?.faq_items ?? "—"}.</p>
    </section>

    <section id="domains">
      <h2>Частота доменов в выдачах</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Домен</th><th>Появлений</th></tr></thead>
          <tbody>${topDomains}</tbody>
        </table>
      </div>
    </section>

    ${sections}

    <section id="errors">
      <h2>Ошибки загрузки URL</h2>
      ${junkNote}
      <ul>${errors || "<li>Нет (после фильтрации служебных ссылок)</li>"}</ul>
    </section>
  </div>
</body>
</html>`;
}

function main() {
  const auditPath = campaign.auditPath();
  if (!fs.existsSync(auditPath)) {
    console.error("Нет аудита:", auditPath);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const html = buildHtml(payload);
  fs.mkdirSync(path.dirname(DOC_OUT), { recursive: true });
  fs.writeFileSync(DOC_OUT, html, "utf8");
  console.log("Отчёт:", DOC_OUT);
}

main();
