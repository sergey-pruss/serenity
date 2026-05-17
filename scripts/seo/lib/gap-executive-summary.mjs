import { BLOCK_LABELS, median, percentile25 } from "./landing-content-audit.mjs";

import { getSerpCampaign } from "./serp-campaigns.mjs";

/**
 * @param {Record<string, unknown>} auditPayload
 * @param {ReturnType<typeof getSerpCampaign>} [campaign]
 */
export function buildExecutiveSummary(auditPayload, campaign = getSerpCampaign()) {
  const serenity = auditPayload.serenityAudit;
  const serpCount = Object.keys(auditPayload.matrix || {}).length || campaign.serpCount;

  /** @type {Map<string, { pctSum: number; missing: number; volumeGaps: number }>} */
  const blockAgg = new Map();

  const volumeKeys = [
    ["word_count_visible", "объём текста"],
    ["h2_count", "число H2"],
    ["faq_items", "блок FAQ"],
  ];

  /** @type {Map<string, { key: string; label: string; ours: number; med: number; p25: number }>} */
  const volumeIssues = new Map();

  for (const block of Object.values(auditPayload.matrix || {})) {
    const comps = (block.competitors || [])
      .map((c) => c.audit)
      .filter((a) => a && !a.error);
    const n = comps.length || 1;

    for (const [id, label] of Object.entries(BLOCK_LABELS)) {
      if (!blockAgg.has(id)) blockAgg.set(id, { pctSum: 0, missing: 0, volumeGaps: 0 });
      const a = blockAgg.get(id);
      const pct = Math.round(
        (comps.filter((c) => c.blocks?.[id]).length / n) * 100,
      );
      a.pctSum += pct;
      if (pct >= 50 && !serenity?.blocks?.[id]) a.missing += 1;
    }

    for (const [key, label] of volumeKeys) {
      const vals = comps.map((c) => c.volumes?.[key] ?? 0).filter((v) => v > 0);
      const ours = serenity?.volumes?.[key] ?? 0;
      const p25 = percentile25(vals);
      if (vals.length >= 5 && ours < p25 && p25 - ours >= 2 && !volumeIssues.has(key)) {
        volumeIssues.set(key, {
          key,
          label,
          ours,
          med: Math.round(median(vals)),
          p25: Math.round(p25),
        });
      }
    }
  }

  const contentGaps = [...blockAgg.entries()]
    .map(([id, a]) => ({
      id,
      label: BLOCK_LABELS[id],
      avgPct: Math.round(a.pctSum / serpCount),
      missingInSerps: a.missing,
      hasUs: Boolean(serenity?.blocks?.[id]),
    }))
    .filter((x) => x.missingInSerps >= 2 && !x.hasUs)
    .sort((a, b) => b.missingInSerps - a.missingInSerps || b.avgPct - a.avgPct);

  const strengths = [...blockAgg.entries()]
    .filter(([id]) => serenity?.blocks?.[id])
    .map(([id]) => BLOCK_LABELS[id]);

  const liveMethod = String(auditPayload.serpMethod || "");
  const isLive = liveMethod.includes("playwright");

  return {
    isLive,
    serpCount,
    contentGaps,
    volumeIssues: [...volumeIssues.values()],
    strengths,
    serenityVolumes: serenity?.volumes || {},
    campaign,
  };
}

/**
 * @param {ReturnType<typeof buildExecutiveSummary>} summary
 */
export function executiveSummaryHtml(summary) {
  const ex = summary.campaign.executive;
  const contentList = summary.contentGaps
    .slice(0, 12)
    .map(
      (g) =>
        `<li><strong>${g.label}</strong> — у ~${g.avgPct}% в топ-20; нет у нас в ${g.missingInSerps}/${summary.serpCount} выдач.</li>`,
    )
    .join("\n");

  const volumeList = summary.volumeIssues
    .map(
      (v) =>
        `<li><strong>${v.label}</strong>: у нас ${v.ours}, медиана топ-20 — ${v.med}, P25 — ${v.p25}.</li>`,
    )
    .join("\n");

  const strengthList = summary.strengths
    .slice(0, 14)
    .map((s) => `<li>${s}</li>`)
    .join("\n");

  return `
    <section id="executive">
      <h2>Общий вывод: что добавить и изменить для топ-10</h2>
      <p class="muted">${ex.intro} ${summary.isLive ? "Снимок: Playwright." : ""}</p>

      <h3>Сильные стороны Serenity (сохранить)</h3>
      <ul>${strengthList}</ul>

      <h3>Контент: приоритетные доработки</h3>
      <ol>
        ${ex.priorities.map((p) => `<li>${p}</li>`).join("\n")}
      </ol>
      ${contentList ? `<h3>Gap по матрице блоков (автодетект)</h3><ul>${contentList}</ul>` : ""}
      ${volumeList ? `<h3>Объём относительно медианы топ-20</h3><ul>${volumeList}</ul>` : ""}

      <h3>Технические и SEO-факторы</h3>
      <ol>
        ${ex.technical.map((t, i) => `<li>${t}</li>`).join("\n")}
      </ol>

      <h3>Что не обязательно для топ-10, но усиливает</h3>
      <ul>
        ${ex.optional.map((o) => `<li>${o}</li>`).join("\n")}
      </ul>

      <h3>Порядок внедрения (рекомендуемый)</h3>
      <p>${ex.rollout}</p>
    </section>`;
}
