#!/usr/bin/env node
/**
 * Генерирует html/partials/services/targeting-phase2-middle.html из ТЗ тимлида.
 * Блок facts не меняется (извлекается из текущего partial).
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { buildTargetingKpiSection, buildTargetingSeoStack } = require("./lib/targeting-seo-sections.cjs");
const { buildAllCaseSliders } = require("./lib/targeting-cases-sliders.cjs");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "html", "partials", "services", "targeting-phase2-middle.html");

const factsPath = path.join(root, "html", "partials", "services", "targeting-facts-slice.html");

function extractFactsSection(html) {
  if (fs.existsSync(factsPath)) {
    return fs.readFileSync(factsPath, "utf8").trim();
  }
  const start = html.indexOf('<section class="page-constructor__section"><div class="facts">');
  if (start < 0) return "";
  const end = html.indexOf("</section>", start) + "</section>".length;
  return html.slice(start, end);
}

function run() {
  const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  const facts = extractFactsSection(prev);
  if (!facts) {
    console.warn("build-targeting-seo-middle: facts не найден — middle без facts");
  }

  const cases = buildAllCaseSliders();
  const seo = buildTargetingSeoStack({
    caseDarkrain: cases.darkrain,
    caseToofli: cases.toofli,
    caseEvrostoy: cases.evrostoy,
    caseAwm: cases.awm,
    includeKpi: false,
  });

  const body = [
    "<!-- phase2: KPI, этапы, SEO-блоки (build-targeting-seo-middle.cjs) -->",
    buildTargetingKpiSection(),
    facts ? facts : "",
    seo,
  ]
    .filter(Boolean)
    .join("\n");

  const typo = processTypographyHtml(body, { force: true });
  fs.writeFileSync(outPath, `${typo.html.trim()}\n`, "utf8");
  console.log("build-targeting-seo-middle: ok", path.relative(root, outPath));
}

run();
