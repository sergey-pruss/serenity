#!/usr/bin/env node
/**
 * Общая подстановка <!-- @partial имя --> из html/partials/<имя>.html
 * (используется assemble-html.cjs и сборка блога).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const partialsDir = path.join(root, "html", "partials");

/** Только один перевод строки после маркера (как в assemble-html.cjs) */
const MARKER_RE = /<!--\s*@partial\s+([\w-]+)\s*-->(?:\r?\n)?/g;

const EXTRA_PARTIALS = ["analytics-counters"];

/** 1-based inclusive line ranges → partial file (без .html) — синхрон с assemble-html.cjs extract */
const EXTRACT_PARTIALS = {
  header: [122, 310],
  "page-main-top": [311, 868],
  "section-services": [869, 1491],
  "section-blog": [1492, 1855],
  "section-clients": [1856, 2255],
  "section-about": [2257, 2395],
  "footer-modern": [2396, 2477],
  "page-microdata": [2479, 2494],
  "floating-contact-bar": [2496, 2609],
};

function loadPartials() {
  const map = new Map();
  for (const name of Object.keys(EXTRACT_PARTIALS)) {
    const p = path.join(partialsDir, `${name}.html`);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing partial: ${p} (run: node scripts/assemble-html.cjs extract)`);
    }
    map.set(name, fs.readFileSync(p, "utf8"));
  }
  for (const name of EXTRA_PARTIALS) {
    const p = path.join(partialsDir, `${name}.html`);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing partial: ${p}`);
    }
    map.set(name, fs.readFileSync(p, "utf8"));
  }
  return map;
}

function assertLayoutMarkersKnown(layout, partialNames) {
  const markerRe = /<!--\s*@partial\s+([\w-]+)\s*-->/g;
  let m;
  while ((m = markerRe.exec(layout))) {
    if (!partialNames.has(m[1])) {
      throw new Error(
        `Маркер @partial ${m[1]} — нет такого partial (EXTRACT_PARTIALS / EXTRA_PARTIALS / файл на диске)`,
      );
    }
  }
}

/** Подставляет все маркеры @partial в строке HTML. */
function expandPartialsInHtml(html) {
  const partials = loadPartials();
  assertLayoutMarkersKnown(html, new Set(partials.keys()));
  const out = html.replace(MARKER_RE, (_, name) => {
    if (!partials.has(name)) {
      throw new Error(`Ссылка на неизвестный partial: ${name}`);
    }
    return partials.get(name).replace(/\s+$/, "") + "\n";
  });
  if (out.includes("<!-- @partial")) {
    throw new Error("В HTML остались незаменённые маркеры <!-- @partial -->");
  }
  return out;
}

module.exports = {
  root,
  partialsDir,
  MARKER_RE,
  EXTRACT_PARTIALS,
  EXTRA_PARTIALS,
  loadPartials,
  assertLayoutMarkersKnown,
  expandPartialsInHtml,
};
