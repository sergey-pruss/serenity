#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "json/services/sozdanie-internet-magazina/integrations.json");
const outPath = path.join(root, "html/partials/services/sozdanie-internet-magazina-integrations-block.html");
const indexPath = path.join(root, "sozdanie-internet-magazina/index.html");
const startMarker = "<!-- INTERNET-MAGAZINA-INTEGRATIONS-START -->";
const endMarker = "<!-- INTERNET-MAGAZINA-INTEGRATIONS-END -->";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCard(item) {
  return (
    `<article class="internet-magazina-integrations-card" role="listitem">` +
    `<div data-v-4ed7dc78="" class="block__name-wrapper">` +
    `<h3 data-v-4ed7dc78="" class="block__name">${item.title}</h3>` +
    `</div>` +
    `<p data-v-4ed7dc78="" class="block__description">${item.text}</p>` +
    `</article>`
  );
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const cards = data.items.map(buildCard).join("");

const html = `${startMarker}
<section class="page-constructor__section internet-magazina-integrations-section">
  <div data-v-4ed7dc78="" class="modern content-block">
    <div data-v-4ed7dc78="" class="page__container">
      <div data-v-490c7534="" data-v-4ed7dc78="" class="numbered-header title-large number-header__empty">
        <div data-v-490c7534="" class="row">
          <div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column">
            <div data-v-490c7534="" class="numbered-header__bullet" aria-hidden="true"></div>
            <div data-v-490c7534="" class="numbered-header__title">
              <h2 data-v-490c7534="" class="kontekstnaya-page__section-heading">${data.title}</h2>
            </div>
          </div>
        </div>
      </div>
      <div class="internet-magazina-integrations-grid" role="list">
        ${cards}
      </div>
    </div>
  </div>
</section>
${endMarker}`;

fs.writeFileSync(outPath, `${html}\n`, "utf8");
console.log("build-internet-magazina-integrations-partials: ok →", path.relative(root, outPath));

let indexHtml = fs.readFileSync(indexPath, "utf8");
const quartaEnd = "<!-- INTERNET-MAGAZINA-QUARTA-CASE-SLIDER-END -->";
if (!indexHtml.includes(startMarker)) {
  const pos = indexHtml.indexOf(quartaEnd);
  if (pos === -1) {
    console.error("build-internet-magazina-integrations-partials: QUARTA end marker not found");
    process.exit(1);
  }
  const insertAt = pos + quartaEnd.length;
  indexHtml =
    indexHtml.slice(0, insertAt) + "\n\n" + html + "\n" + indexHtml.slice(insertAt);
} else {
  const start = indexHtml.indexOf(startMarker);
  const end = indexHtml.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    console.error("build-internet-magazina-integrations-partials: integration markers broken");
    process.exit(1);
  }
  indexHtml = indexHtml.slice(0, start) + html + indexHtml.slice(end + endMarker.length);
}

fs.writeFileSync(indexPath, indexHtml, "utf8");
console.log("build-internet-magazina-integrations-partials: ok →", path.relative(root, indexPath));
