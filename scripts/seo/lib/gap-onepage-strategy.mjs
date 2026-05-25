import {
  BLOCK_IDS,
  BLOCK_LABELS,
  median,
  percentile25,
} from "./landing-content-audit.mjs";
import { buildExecutiveSummary } from "./gap-executive-summary.mjs";
import { RANK_DASHBOARD_DOCS_URL } from "./rank-dashboard-utils.mjs";

/** Блоки, не релевантные onepage «корпоративный сайт» и др. услугам. */
export const ONEPAGE_STRATEGY_BLOCK_DENY = new Set([
  "platforms_direct",
  "platforms_social",
  "focus_nastroyka",
  "focus_vedenie",
  "chat_widget",
  "ecommerce_focus",
]);

/** @param {string} s */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} auditPayload
 * @param {ReturnType<import('./serp-campaigns.mjs').getSerpCampaign>} campaign
 */
export function buildOnepageStrategy(auditPayload, campaign) {
  const summary = buildExecutiveSummary(auditPayload, campaign);
  const serenity = auditPayload.serenityAudit;
  const serpCount = summary.serpCount;
  const cfg = campaign.onepageStrategy || {};

  /** @type {Map<string, { avgPct: number; missing: number; hasUs: boolean }>} */
  const blockAgg = new Map();
  /** @type {import('./landing-content-audit.mjs').BlockId[]} */
  const allCompAudits = [];

  for (const block of Object.values(auditPayload.matrix || {})) {
    const comps = (block.competitors || [])
      .map((c) => c.audit)
      .filter((a) => a && !a.error);
    const n = comps.length || 1;
    allCompAudits.push(...comps);

    for (const id of BLOCK_IDS) {
      if (ONEPAGE_STRATEGY_BLOCK_DENY.has(id)) continue;
      if (!blockAgg.has(id)) {
        blockAgg.set(id, { avgPct: 0, missing: 0, hasUs: Boolean(serenity?.blocks?.[id]) });
      }
      const a = blockAgg.get(id);
      const pct = Math.round(
        (comps.filter((c) => c.blocks?.[id]).length / n) * 100,
      );
      a.avgPct += pct;
      if (pct >= 50 && !serenity?.blocks?.[id]) a.missing += 1;
    }
  }

  const competitorPatterns = [...blockAgg.entries()]
    .map(([id, a]) => ({
      id,
      label: BLOCK_LABELS[id],
      avgPct: Math.round(a.avgPct / serpCount),
      hasUs: a.hasUs,
      missingInSerps: a.missing,
    }))
    .filter((x) => x.avgPct >= 55)
    .sort((a, b) => b.avgPct - a.avgPct);

  const missingBlocks = [...blockAgg.entries()]
    .map(([id, a]) => ({
      id,
      label: BLOCK_LABELS[id],
      avgPct: Math.round(a.avgPct / serpCount),
      hasUs: a.hasUs,
    }))
    .filter((x) => !x.hasUs && x.avgPct >= 35 && !ONEPAGE_STRATEGY_BLOCK_DENY.has(x.id))
    .sort((a, b) => b.avgPct - a.avgPct);
  const weakBlocks = competitorPatterns.filter(
    (x) => x.hasUs && x.avgPct >= 65 && x.id !== "hero_cta",
  );

  const wordVals = allCompAudits
    .map((a) => a.volumes?.word_count_visible ?? 0)
    .filter((v) => v > 400);
  const faqVals = allCompAudits
    .map((a) => a.volumes?.faq_items ?? 0)
    .filter((v) => v >= 0);
  const h2Vals = allCompAudits
    .map((a) => a.volumes?.h2_count ?? 0)
    .filter((v) => v > 0);

  const oursWords = serenity?.volumes?.word_count_visible ?? 0;
  const oursFaq = serenity?.volumes?.faq_items ?? 0;
  const oursH2 = serenity?.volumes?.h2_count ?? 0;
  const medWords = Math.round(median(wordVals));
  const sortedWords = [...wordVals].sort((a, b) => a - b);
  const p75Words =
    sortedWords.length > 0
      ? sortedWords[Math.min(sortedWords.length - 1, Math.floor(sortedWords.length * 0.75))]
      : 0;
  const targetWords = Math.max(medWords, cfg.targetWordCountMin ?? 2800);
  const medFaq = Math.round(median(faqVals));
  const medH2 = Math.round(median(h2Vals));

  const queries = campaign.queries.map((q) => q.text);
  const keywordPlan = cfg.keywordHeadings || [];

  return {
    summary,
    queries,
    competitorPatterns: competitorPatterns.slice(0, 10),
    missingBlocks,
    weakBlocks: weakBlocks.slice(0, 6),
    volumes: {
      oursWords,
      targetWords,
      medWords,
      p75Words,
      oursFaq,
      targetFaq: Math.max(medFaq + 3, cfg.targetFaqMin ?? 7),
      oursH2,
      medH2,
    },
    faqQuestions: cfg.faqQuestions || [],
    actions: cfg.actions || [],
    techChecklist: cfg.techChecklist || [],
    rollout: cfg.rollout || "",
    blockers: cfg.blockers || [],
  };
}

/**
 * @param {ReturnType<typeof buildOnepageStrategy>} strategy
 * @param {ReturnType<import('./serp-campaigns.mjs').getSerpCampaign>} campaign
 */
export function onepageStrategyHtml(strategy, campaign) {
  const qList = strategy.queries.map((q) => `«${q}»`).join(" и ");
  const compList = strategy.competitorPatterns
    .slice(0, 8)
    .map((x) => `<li>${esc(x.label)} — ~${x.avgPct}% страниц в топ-20</li>`)
    .join("\n");

  const missingList = strategy.missingBlocks.length
    ? strategy.missingBlocks
        .map(
          (x) =>
            `<li><strong>${esc(x.label)}</strong> — у ~${x.avgPct}% топ-20, у нас нет</li>`,
        )
        .join("\n")
    : "<li><strong>Структура:</strong> базовые блоки (hero, логотипы клиентов, кейсы, тарифы, FAQ) на месте — главный gap в объёме текста, семантике H2 и глубине FAQ, не в количестве секций.</li>";

  const vol = strategy.volumes;
  const wordGap =
    vol.oursWords < vol.targetWords
      ? `<li><strong>Объём текста:</strong> сейчас ~${vol.oursWords} слов; ориентир топ-20 — ${vol.medWords} (медиана), у сильных — ${vol.p75Words}+. Цель onepage: <strong>${vol.targetWords}+</strong> слов видимого коммерческого текста (этапы, пакеты, FAQ, два коммерческих H2).</li>`
      : `<li><strong>Объём текста:</strong> ${vol.oursWords} слов — на уровне медианы; усилить не количеством ради количества, а FAQ и коммерческими H2.</li>`;

  const faqGap = `<li><strong>FAQ:</strong> сейчас ~${vol.oursFaq} вопросов; у лидеров — до ${vol.targetFaq}. Расширить блок и JSON-LD FAQPage.</li>`;

  const keywordSection =
    (campaign.onepageStrategy?.keywordHeadings || [])
      .map(
        (k) =>
          `<li><strong>${esc(k.title)}</strong> — ${esc(k.hint)}</li>`,
      )
      .join("\n") ||
    strategy.queries
      .map((q) => `<li>Отдельный H2 или подзаголовок под «${esc(q)}»</li>`)
      .join("\n");

  const faqQ = strategy.faqQuestions
    .map((q) => `<li>${esc(q)}</li>`)
    .join("\n");

  const actions =
    strategy.actions.length > 0
      ? strategy.actions.map((a) => `<li>${esc(a)}</li>`).join("\n")
      : `<li>Go-live статики на каноническом URL (без legacy без H2).</li>
<li>Два коммерческих H2: «создание» и «разработка корпоративного сайта».</li>
<li>Таблица сравнения пакетов (не только карточки-слайдер).</li>
<li>FAQ 7+ пунктов + schema.</li>
<li>Блок «статьи блога» — 3–4 ссылки на разработку/CMS.</li>`;

  const tech =
    strategy.techChecklist.length > 0
      ? strategy.techChecklist.map((t) => `<li>${t}</li>`).join("\n")
      : "";

  const blockers = strategy.blockers
    .map((b) => `<li>${esc(b)}</li>`)
    .join("\n");

  return `
    <section id="strategy" class="strategy-box">
      <h2>SEO-стратегия</h2>

      ${blockers ? `<h3>Блокеры</h3><ul class="blockers">${blockers}</ul>` : ""}

      <h3>1. Что есть у конкурентов в топ-20</h3>
      <p class="muted">Повторяющиеся элементы посадочных (≥55% выдач), без «шума» вроде блоков про Директ.</p>
      <ul>${compList}</ul>
      <p class="muted">Просмотрите 5–10 сайтов из приложения вручную — ищите удачные hero, таблицы тарифов, FAQ и кейсы.</p>

      <h3>2. Чего не хватает нам</h3>
      <ul>
        ${wordGap}
        ${faqGap}
        ${missingList}
      </ul>

      <h3>3. Расширить семантику (H2 / подзаголовки)</h3>
      <p class="muted">Развести интенты запросов дашборда — не одним общим текстом.</p>
      <ul>${keywordSection}</ul>

      <h3>4. Новые и усиленные блоки</h3>
      <ul>${actions}</ul>

      <h3>5. FAQ — вопросы для блока</h3>
      <p class="muted">Ответы — в видимом тексте и FAQPage schema.</p>
      <ul>${faqQ}</ul>

      ${tech ? `<h3>6. Техника (кратко)</h3><ol>${tech}</ol>` : ""}

      <h3>${tech ? "7" : "6"}. Порядок внедрения</h3>
      <p>${esc(strategy.rollout || "Go-live → KPI и гео в hero → коммерческие H2 → таблица пакетов → кейсы → FAQ → перелинковка и переобход.")}</p>
    </section>`;
}
