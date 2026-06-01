/**
 * Блок «Стоимость и пакеты» сразу перед инлайн-формой (sa-service-lead-section).
 * Используется в assemble-* для /kontekstnaya_reklama и /korporativnyj_sajt.
 */
const SECTION_OPEN = '<section class="page-constructor__section';

function indexOfPackagesHeading(html) {
  const i = html.indexOf(">Стоимость и пакеты</h2>");
  if (i >= 0) return i;
  return html.indexOf(">Стоимость и&nbsp;пакеты</h2>");
}

function extractMarkedPackagesBlock(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) return null;
  const endIdx = html.indexOf(endMarker, start);
  if (endIdx < 0) return null;
  const end = endIdx + endMarker.length;
  return { start, end, block: html.slice(start, end).trim() };
}

/** Заголовок + .dies с таблицой (kontekst-packages-compare-mounted). */
function extractKontekstPackagesBlock(html) {
  const h = indexOfPackagesHeading(html);
  if (h < 0) return null;
  const compareNeedle = 'id="kontekst-packages-compare-mounted"';
  const ci = html.indexOf(compareNeedle, h);
  if (ci < 0) return null;
  const blockStart = html.lastIndexOf(SECTION_OPEN, h);
  if (blockStart < 0) return null;
  const leadIdx = html.indexOf("sa-service-lead-section", ci);
  const leadSec = leadIdx >= 0 ? html.lastIndexOf(SECTION_OPEN, leadIdx) : -1;
  const end = leadSec > blockStart ? leadSec : html.length;
  return { start: blockStart, end, block: html.slice(blockStart, end).trim() };
}

function extractPackagesBlock(html, opts = {}) {
  if (opts.startMarker && opts.endMarker) {
    return extractMarkedPackagesBlock(html, opts.startMarker, opts.endMarker);
  }
  return extractKontekstPackagesBlock(html);
}

/**
 * @param {string} html
 * @param {{ startMarker?: string, endMarker?: string }} [opts]
 */
function indexOfInlineLeadSection(html) {
  const exact = html.indexOf('class="page-constructor__section sa-service-lead-section"');
  if (exact >= 0) return exact;
  const leadIdx = html.indexOf("sa-service-lead-section");
  if (leadIdx < 0) return -1;
  return html.lastIndexOf(SECTION_OPEN, leadIdx);
}

function movePackagesBeforeInlineLead(html, opts = {}) {
  const leadSec = indexOfInlineLeadSection(html);
  if (leadSec < 0) return html;

  const extracted = extractPackagesBlock(html, opts);
  if (!extracted) return html;

  const { start, end, block } = extracted;
  if (leadSec < 0) return html;

  if (end <= leadSec && leadSec - end < 80) return html;

  const without = html.slice(0, start) + html.slice(end);
  const leadSec2 = indexOfInlineLeadSection(without);
  if (leadSec2 < 0) return html;
  return `${without.slice(0, leadSec2)}\n${block}\n${without.slice(leadSec2)}`;
}

module.exports = {
  movePackagesBeforeInlineLead,
  indexOfPackagesHeading,
  indexOfInlineLeadSection,
};
