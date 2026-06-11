#!/usr/bin/env node
/**
 * /services: внутренние ссылки same-origin (href="/…"), не https://serenity.agency/….
 * На dev (static.serenity.agency) и prod (serenity.agency) карточки ведут на тот же хост.
 * Канон/og в <head> не трогаем.
 *
 * Запуск: node scripts/normalize-services-index-hrefs.cjs
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "services", "index.html");

function normalizeServicesIndexHrefs(html) {
  const headEnd = html.indexOf("</head>");
  if (headEnd < 0) throw new Error("services/index.html: нет </head>");
  const head = html.slice(0, headEnd + "</head>".length);
  let body = html.slice(headEnd + "</head>".length);

  body = body.replace(/href="https:\/\/serenity\.agency([^"]*)"/g, (_m, pathname) => `href="${pathname}"`);

  body = body.replace(/<a\b[^>]*class="[^"]*services__card-container[^"]*"[^>]*>/g, (tag) =>
    tag.replace(/\s*target="_blank"/, ""),
  );
  body = body.replace(/<a\b[^>]*class="[^"]*synergy__card-container[^"]*"[^>]*>/g, (tag) =>
    tag.replace(/\s*target="_blank"/, ""),
  );

  return head + body;
}

function main() {
  const before = fs.readFileSync(FILE, "utf8");
  const after = normalizeServicesIndexHrefs(before);
  if (after === before) {
    console.log("normalize-services-index-hrefs: без изменений");
    return;
  }
  fs.writeFileSync(FILE, after, "utf8");
  const absBefore = (before.match(/href="https:\/\/serenity\.agency/g) || []).length;
  const absAfterHead = (after.slice(0, after.indexOf("</head>")).match(/https:\/\/serenity\.agency/g) || []).length;
  const absAfterBody = (after.slice(after.indexOf("</head>")).match(/href="https:\/\/serenity\.agency/g) || []).length;
  console.log(
    `normalize-services-index-hrefs: ok (href abs в файле: ${absBefore} → head meta ${absAfterHead}, body href ${absAfterBody})`,
  );
}

if (require.main === module) main();

module.exports = { normalizeServicesIndexHrefs };
