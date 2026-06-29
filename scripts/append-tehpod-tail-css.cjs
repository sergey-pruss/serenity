#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const uks = fs.readFileSync(path.join(root, "css/uvelichenie-konversii-saita-static-stack.css"), "utf8");
const start = uks.indexOf(".page-constructor.uvelichenie-konversii-saita-page .uks-team-section");
let tail = uks.slice(start);
tail = tail
  .replace(/uvelichenie-konversii-saita-page/g, "tehnicheskaya-podderzhka-saita-page")
  .replace(/\.uks-team-section/g, ".tehpod-team-section")
  .replace(/\.uks-clients-section/g, ".tehpod-clients-section")
  .replace(/\.uks-blog-section/g, ".tehpod-blog-section")
  .replace(/\.uks-cases-section/g, ".tehpod-cases-section")
  .replace(/\.uks-awards-section/g, ".tehpod-awards-section")
  .replace(/\.uks-synergy-section/g, ".tehpod-synergy-section");

const extra = `
/* Хвост: форма обратной связи */
.page-constructor.tehnicheskaya-podderzhka-saita-page > .page-constructor__section.tehpod-inline-lead-section.sa-service-lead-section {
  margin-top: var(--home-between, 112px) !important;
}

.page-constructor.tehnicheskaya-podderzhka-saita-page .tehpod-inline-lead-section .sa-service-lead-section__container {
  padding-bottom: 0 !important;
}

.page-constructor.tehnicheskaya-podderzhka-saita-page .tehpod-inline-lead-section #sa-inline-lead-root .order-popup__meta h2,
.page-constructor.tehnicheskaya-podderzhka-saita-page .tehpod-inline-lead-section #sa-inline-lead-root .order-popup__meta .lead {
  text-align: center !important;
}

.page-constructor.tehnicheskaya-podderzhka-saita-page .tehpod-team-section .team-block .team__head {
  margin-bottom: var(--kontekst-heading-gap, 80px) !important;
}
`;

const file = path.join(root, "css/tehnicheskaya-podderzhka-saita-static-stack.css");
let css = fs.readFileSync(file, "utf8");
if (css.includes("tehpod-team-section {")) {
  console.log("append-tehpod-tail-css: already present");
  process.exit(0);
}
if (!css.includes("service-clients-section.css")) {
  css = css.replace(
    '@import url("sections/uvelichenie-konversii-saita-case-slider.css");',
    '@import url("sections/uvelichenie-konversii-saita-case-slider.css");\n@import url("sections/service-clients-section.css");',
  );
}
fs.writeFileSync(
  file,
  `${css.trimEnd()}\n\n/* === Tail blocks (форма, команда, клиенты, FAQ, блог, кейсы, награды, синергия) === */\n${tail}${extra}\n`,
  "utf8",
);
console.log("append-tehpod-tail-css: ok");
