#!/usr/bin/env node
/**
 * В services/production/index.html: одна шапка из html/partials/header.html
 * (как на главной и в блоге). Убирает обрезанный header + «висячий» new-static-menu
 * и обёртку #body вокруг <main>.
 *
 * Идемпотентно: если перед <main> уже нет id="body" у body-application — пропуск.
 */
const fs = require("fs");
const path = require("path");
const { expandPartialsInHtml } = require("./assemble-html-partials.cjs");

const root = path.resolve(__dirname, "..");
const filePath = path.join(root, "services", "production", "index.html");

function patch() {
  let html = fs.readFileSync(filePath, "utf8");
  const mainTag = '<main class="production-page">';
  const mIdx = html.indexOf(mainTag);
  if (mIdx === -1) throw new Error(`${filePath}: не найден <main class="production-page">`);

  /* Легаси: #body оборачивал <main> подряд. В partial #body — только CTA внутри </header> перед main. */
  const needsBodyUnwrap = /<div\s+id="body"\s+class="body-application[^"]*"[^>]*>\s*<main\s+class="production-page"/s.test(
    html
  );
  if (!needsBodyUnwrap) {
    return false;
  }

  const hdr = '<header class="header page-top compressed"';
  const hIdx = html.indexOf(hdr);
  if (hIdx === -1 || hIdx > mIdx) throw new Error(`${filePath}: не найдена внешняя шапка перед main`);

  const headerHtml = expandPartialsInHtml("<!-- @partial header -->\n          ");
  html = html.slice(0, hIdx) + headerHtml + html.slice(mIdx);

  const legacyClose = "</main>\n          </div>\n        </div>";
  if (html.includes(legacyClose)) {
    html = html.replace(legacyClose, "</main>\n        </div>");
  }
  fs.writeFileSync(filePath, html, "utf8");
  return true;
}

if (require.main === module) {
  const ok = patch();
  console.log(ok ? `OK: ${filePath}` : `skip (уже без обёртки #body): ${filePath}`);
}

module.exports = { patch };
