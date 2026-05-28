/**
 * Пересборка порядка блоков page-constructor для /kontekstnaya_reklama.
 * Используем 3 cases-block из prod и SEO content-block из kontekstnaya-seo-sections.
 */
const fs = require("fs");
const path = require("path");
const {
  buildAgencySection,
  buildSetupSection,
  buildManageSection,
  buildVidySection,
  buildKpiSections,
} = require("./kontekstnaya-seo-sections.cjs");

const root = path.resolve(__dirname, "..", "..");

function applyVidyDescByRow(section) {
  const descOpen = section.indexOf(
    '<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc',
  );
  const tabletOpen = section.indexOf(
    '<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--tablet blocks">',
  );
  if (descOpen < 0 || tabletOpen < descOpen) return section;

  const descChunk = section.slice(descOpen, tabletOpen);
  const items = [];
  const re =
    /<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item">[\s\S]*?<\/p> <!----><\/div>/g;
  let m;
  while ((m = re.exec(descChunk))) {
    if (m[0].includes('class="block__name"')) items.push(m[0]);
  }
  if (items.length !== 6) return section;

  const row1 = items
    .slice(0, 3)
    .map((it) => `<div data-v-4ed7dc78="" class="col-4">${it}</div>`)
    .join("");
  const row2 = items
    .slice(3, 6)
    .map((it) => `<div data-v-4ed7dc78="" class="col-4">${it}</div>`)
    .join("");
  const rebuilt =
    `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc content-block__grid--desc-by-row blocks">` +
    `<div data-v-4ed7dc78="" class="content-block__grid-wrapper">${row1}</div>` +
    `<div data-v-4ed7dc78="" class="content-block__grid-wrapper">${row2}</div></div> `;

  return section.slice(0, descOpen) + rebuilt + section.slice(tabletOpen);
}

function extractCasesBlocksFromHtml(html) {
  const re = /<section class="page-constructor__section">[\s\S]*?<\/section>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) {
    if (m[0].includes('class="cases-block"') && m[0].includes("cases-block__slider")) {
      blocks.push(m[0]);
    }
  }
  return blocks;
}

function loadProdCasesBlocksFallback() {
  const candidates = [
    path.join(root, "tmp", "kontekst-prod-full.html"),
    path.join(root, "tmp", "kontekst-parity-prod-layout.html"),
    path.join(root, "tmp", "prod-kontekst.html"),
    path.join(root, "tmp", "prod-kontekst-check.html"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const blocks = extractCasesBlocksFromHtml(fs.readFileSync(p, "utf8"));
    if (blocks.length === 3) return blocks;
  }
  if (process.env.KONTEKST_CAPTURE_URL || process.env.ALLOW_NETWORK_CAPTURE === "1") {
    const { execSync: exec } = require("child_process");
    const html = exec("curl -sL https://serenity.agency/kontekstnaya_reklama", {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const blocks = extractCasesBlocksFromHtml(html);
    if (blocks.length === 3) return blocks;
  }
  throw new Error(
    "kontekstnaya-main-middle: нужны 3 cases-block (tmp/kontekst-prod-full.html или capture prod)",
  );
}

function sectionBounds(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`kontekstnaya-main-middle: marker not found: ${marker}`);
  const start = html.lastIndexOf('<section class="page-constructor__section">', idx);
  if (start < 0) {
    throw new Error(`kontekstnaya-main-middle: section start not found for marker: ${marker}`);
  }
  const OPEN = "<section";
  const CLOSE = "</section>";
  let pos = start;
  let depth = 0;
  while (pos < html.length) {
    const openIdx = html.indexOf(OPEN, pos);
    const closeIdx = html.indexOf(CLOSE, pos);
    if (closeIdx < 0) break;
    if (openIdx >= 0 && openIdx < closeIdx) {
      depth++;
      pos = openIdx + OPEN.length;
      continue;
    }
    depth--;
    if (depth === 0) {
      const end = closeIdx + CLOSE.length;
      return { start, end };
    }
    pos = closeIdx + CLOSE.length;
  }
  throw new Error(`kontekstnaya-main-middle: section end not found for marker: ${marker}`);
}

function diesSectionBounds(html) {
  const marker = 'class="dies modern"';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error("kontekstnaya-main-middle: marker not found: dies");
  const start = html.lastIndexOf('<section class="page-constructor__section">', idx);
  const endMarker = "</section></div></div></section>";
  const endIdx = html.indexOf(endMarker, idx);
  if (start < 0 || endIdx < 0) {
    throw new Error("kontekstnaya-main-middle: dies section boundaries not found");
  }
  return { start, end: endIdx + endMarker.length };
}

function packagesSectionBounds(html) {
  try {
    return sectionBounds(html, ">Стоимость и пакеты</h2>");
  } catch (_) {
    return sectionBounds(html, ">Пакеты</h2>");
  }
}

function buildKontekstnayaMiddle(cases1, cases2, cases3, packagesSec, diesSec, teamSec) {
  const [kpiSec, reportSec, mskSec] = buildKpiSections();
  return (
    "\n" +
    buildAgencySection() +
    "\n" +
    buildSetupSection() +
    "\n" +
    buildManageSection() +
    "\n" +
    cases1 +
    "\n" +
    applyVidyDescByRow(buildVidySection()) +
    "\n" +
    packagesSec +
    "\n" +
    diesSec +
    "\n" +
    cases2 +
    "\n" +
    kpiSec +
    "\n" +
    reportSec +
    "\n" +
    cases3 +
    "\n" +
    mskSec +
    "\n" +
    teamSec +
    "\n"
  );
}

/**
 * Подменяет сегмент от «Агентство» до «Команда» на пользовательский порядок блоков.
 */
function applyKontekstnayaSeoMiddle(mainHtml) {
  let cases = extractCasesBlocksFromHtml(mainHtml);
  if (cases.length !== 3) {
    cases = loadProdCasesBlocksFallback();
  }

  const agency = sectionBounds(mainHtml, ">Агентство контекстной рекламы</h2>");
  const pakety = packagesSectionBounds(mainHtml);
  const dies = diesSectionBounds(mainHtml);
  const team = sectionBounds(mainHtml, ">Команда</h2>");
  const packagesSec = mainHtml
    .slice(pakety.start, pakety.end)
    .replace(/>Пакеты<\/h2>/g, ">Стоимость и пакеты</h2>");
  const diesSec = mainHtml.slice(dies.start, dies.end);
  const teamSec = mainHtml.slice(team.start, team.end);
  const middle = buildKontekstnayaMiddle(
    cases[0],
    cases[1],
    cases[2],
    packagesSec,
    diesSec,
    teamSec,
  );

  const out = mainHtml.slice(0, agency.start) + middle + mainHtml.slice(team.end);
  const count = (out.match(/class="cases-block"/g) || []).length;
  if (count !== 3) {
    throw new Error(`applyKontekstnayaSeoMiddle: cases-block count ${count}, expected 3`);
  }
  const pochmuCount = (out.match(/Почему работать с&nbsp;нами надежно и&nbsp;выгодно/g) || []).length;
  if (pochmuCount !== 0) {
    throw new Error(`applyKontekstnayaSeoMiddle: pochmu count ${pochmuCount}, expected 0`);
  }
  return out;
}

module.exports = {
  applyKontekstnayaSeoMiddle,
  buildKontekstnayaMiddle,
  extractCasesBlocksFromHtml,
  applyVidyDescByRow,
};
