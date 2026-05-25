/**
 * FAQPage JSON-LD из разметки spoiler (.block__question / .block__content).
 * Текст ответа — plain text, как в видимом FAQ (без HTML).
 */
function stripHtmlToPlainText(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** @returns {{ question: string, answer: string }[]} */
function extractFaqPairsFromHtml(html) {
  const pairs = [];
  const re =
    /<div class="spoiler block">[\s\S]*?<h3 class="block__question">([^<]*)<\/h3>[\s\S]*?<div class="block__content">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const question = m[1].trim();
    const answer = stripHtmlToPlainText(m[2]);
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

function buildFaqPageJsonLdObject(pairs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function buildFaqPageJsonLdScript(pairs) {
  const json = JSON.stringify(buildFaqPageJsonLdObject(pairs));
  return `<script type="application/ld+json">${json}</script>`;
}

/** Убирает старый FAQPage script и добавляет новый из видимых spoiler. */
function syncFaqBodyHtmlJsonLd(bodyHtml) {
  const without = String(bodyHtml ?? "").replace(
    /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
    "",
  );
  const pairs = extractFaqPairsFromHtml(without);
  if (!pairs.length) {
    throw new Error("syncFaqBodyHtmlJsonLd: не найдены пары вопрос/ответ (.spoiler.block)");
  }
  return `${without.trimEnd()} ${buildFaqPageJsonLdScript(pairs)}`;
}

module.exports = {
  stripHtmlToPlainText,
  extractFaqPairsFromHtml,
  buildFaqPageJsonLdObject,
  buildFaqPageJsonLdScript,
  syncFaqBodyHtmlJsonLd,
};
