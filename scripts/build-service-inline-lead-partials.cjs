#!/usr/bin/env node
/**
 * Сборка partial инлайн-заявки из shell + json/services/<slug>/inline-lead.json.
 * Контент свой на услугу; разметка одна.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "html", "partials", "services", "_service-inline-lead.shell.html");
const partialsDir = path.join(root, "html", "partials", "services");

const SERVICES = [
  { slug: "kontekstnaya_reklama", partial: "service-inline-lead-kontekstnaya-reklama.html" },
  { slug: "targeting", partial: "service-inline-lead-targeting.html" },
  { slug: "marketing", partial: "service-inline-lead-marketing.html" },
  { slug: "korporativnyj_sajt", partial: "service-inline-lead-korporativnyj-sajt.html" },
  { slug: "lending_na_tilda", partial: "service-inline-lead-lending-na-tilda.html" },
  { slug: "seo", partial: "service-inline-lead-seo.html" },
  { slug: "strategy", partial: "service-inline-lead-strategy.html" },
  {
    slug: "prodvizhenie-yandex-karty-2gis",
    partial: "service-inline-lead-prodvizhenie-yandex-karty-2gis.html",
  },
];

function buildOne({ slug, partial }) {
  const jsonPath = path.join(root, "json", "services", slug, "inline-lead.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Нет ${jsonPath}`);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!data.titleHtml || !data.leadHtml) {
    throw new Error(`${jsonPath}: нужны titleHtml и leadHtml`);
  }
  const shell = fs.readFileSync(shellPath, "utf8");
  const out = shell
    .replace("__TITLE_HTML__", data.titleHtml)
    .replace("__LEAD_HTML__", data.leadHtml);
  const outPath = path.join(partialsDir, partial);
  fs.writeFileSync(outPath, out, "utf8");
  console.log("Wrote", path.relative(root, outPath));
}

function main() {
  if (!fs.existsSync(shellPath)) {
    throw new Error(`Нет shell: ${shellPath}`);
  }
  for (const svc of SERVICES) buildOne(svc);
}

main();
