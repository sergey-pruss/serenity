#!/usr/bin/env node
/**
 * /services: карточки услуг — относительные href, без target="_blank" на prod-URL.
 * Запуск: node scripts/verify-services-index-hrefs.cjs
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "services", "index.html");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const html = fs.readFileSync(FILE, "utf8");
  const headEnd = html.indexOf("</head>");
  assert(headEnd > 0, "нет </head>");
  const head = html.slice(0, headEnd);
  const body = html.slice(headEnd);

  assert(head.includes('rel="canonical" href="https://serenity.agency/services"'), "canonical /services в head");
  assert(
    !body.includes('href="https://serenity.agency'),
    "в body не должно быть href=\"https://serenity.agency/…\" (только same-origin /…)",
  );

  const cardHrefs = [];
  for (const m of body.matchAll(/<a\b[^>]*class="[^"]*services__card-container[^"]*"[^>]*>/g)) {
    const tag = m[0];
    const href = tag.match(/\bhref="([^"]+)"/);
    if (href) cardHrefs.push(href[1]);
  }
  assert(cardHrefs.length >= 20, `мало карточек услуг: ${cardHrefs.length}`);
  for (const href of cardHrefs) {
    assert(href.startsWith("/"), `карточка: относительный href, получено ${href}`);
    assert(!href.startsWith("//"), `карточка: не protocol-relative: ${href}`);
  }
  assert(cardHrefs.includes("/seo"), "карточка SEO: href=\"/seo\"");
  assert(cardHrefs.includes("/kontekstnaya_reklama"), "карточка контекст: href=\"/kontekstnaya_reklama\"");
  assert(cardHrefs.includes("/targeting"), "карточка таргетинг: href=\"/targeting\"");

  const blankCards = [...body.matchAll(/<a\b[^>]*class="[^"]*services__card-container[^"]*"[^>]*>/g)].some((m) =>
    m[0].includes('target="_blank"'),
  );
  assert(!blankCards, "карточки услуг: не должно быть target=\"_blank\"");

  console.log(`verify-services-index-hrefs: OK (${cardHrefs.length} карточек)`);
}

main();
