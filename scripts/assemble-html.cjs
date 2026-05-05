#!/usr/bin/env node
/**
 * Сборка корневого index.html из html/index.layout.html и html/partials/*.html
 * Маркер: <!-- @partial имя-файла-без-html -->
 *
 * extract: жёстко заданные номера строк — только при смене границ блоков в index.html;
 * после правок html/index.layout.html используйте только build.
 *
 * Извлечь partials и шаблон из текущего index.html:
 *   node scripts/assemble-html.cjs extract
 *
 * Собрать:
 *   node scripts/assemble-html.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const layoutPath = path.join(root, "html", "index.layout.html");
const blogLayoutPath = path.join(root, "html", "blog-index.layout.html");
const blogOutPath = path.join(root, "blog", "index.html");
const partialsDir = path.join(root, "html", "partials");
const outPath = path.join(root, "index.html");

/** Только один перевод строки после маркера (не \s* — иначе съедаются отступы следующей строки) */
const MARKER_RE = /<!--\s*@partial\s+([\w-]+)\s*-->(?:\r?\n)?/g;

/** Partials вне extract: один файл — счётчики (GTM + Я.Метрика), подключаются из index.layout.html */
const EXTRA_PARTIALS = [
  "analytics-counters",
  "section-home-awards-slides",
  "section-home-awards-local-template",
];

/** 1-based inclusive line ranges → partial file (без .html) */
const EXTRACT_PARTIALS = {
  header: [132, 260],
  "page-main-top": [261, 836],
  "section-services": [837, 1454],
  "section-blog": [1455, 1811],
  "section-clients": [1812, 2211],
  "section-about": [2213, 2350],
  "footer-modern": [2351, 2407],
  "page-microdata": [2409, 2424],
  "floating-contact-bar": [2426, 2539],
};

/** Куски текущего index.html для layout: [fromLine, toLine] inclusive, 1-based */
const LAYOUT_SLICES = [
  [1, 131],
  "header",
  "page-main-top",
  "section-services",
  "section-blog",
  "section-clients",
  [2212, 2212],
  "section-about",
  "footer-modern",
  [2408, 2408],
  "page-microdata",
  [2425, 2425],
  "floating-contact-bar",
  [2540, 2588],
];

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\n/);
}

function sliceLines(lines, from1, to1) {
  return lines.slice(from1 - 1, to1).join("\n");
}

function extractFromIndex() {
  const indexPath = path.join(root, "index.html");
  const lines = readLines(indexPath);
  fs.mkdirSync(partialsDir, { recursive: true });

  for (const [name, [a, b]] of Object.entries(EXTRACT_PARTIALS)) {
    const body = sliceLines(lines, a, b) + "\n";
    fs.writeFileSync(path.join(partialsDir, `${name}.html`), body, "utf8");
  }

  let layout = "";
  for (const part of LAYOUT_SLICES) {
    if (Array.isArray(part)) {
      layout += sliceLines(lines, part[0], part[1]) + "\n";
    } else {
      layout += `<!-- @partial ${part} -->\n`;
    }
  }
  fs.mkdirSync(path.dirname(layoutPath), { recursive: true });
  fs.writeFileSync(layoutPath, layout, "utf8");
  console.log("Wrote", layoutPath, "and partials in", partialsDir);
}

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

/** Маркеры @partial внутри самих partial (например награды → отдельный файл с текстами). */
function assertNestedPartialMarkersResolvable(partials) {
  const re = /<!--\s*@partial\s+([\w-]+)\s*-->/g;
  const keys = new Set(partials.keys());
  for (const [name, body] of partials) {
    let m;
    while ((m = re.exec(body))) {
      if (!keys.has(m[1])) {
        throw new Error(
          `В partial «${name}» маркер @partial ${m[1]} — нет файла html/partials/${m[1]}.html (добавьте в EXTRACT_PARTIALS или EXTRA_PARTIALS)`,
        );
      }
    }
    re.lastIndex = 0;
  }
}

/** Подставляет @partial внутри значений map, пока маркеры не кончатся (порядок проходов — стабильный порядок ключей Map). */
function expandNestedPartialsInMap(partials) {
  const markerRe = /<!--\s*@partial\s+([\w-]+)\s*-->(?:\r?\n)?/g;
  const order = [...partials.keys()];
  for (let round = 0; round < 30; round += 1) {
    let changed = false;
    for (const name of order) {
      const raw = partials.get(name);
      if (!raw.includes("@partial")) continue;
      const next = raw.replace(markerRe, (_, ref) => {
        if (!partials.has(ref)) {
          throw new Error(`В partial «${name}»: неизвестный @partial «${ref}»`);
        }
        changed = true;
        return partials.get(ref).replace(/\s+$/, "") + "\n";
      });
      markerRe.lastIndex = 0;
      partials.set(name, next);
    }
    if (!changed) break;
  }
  for (const name of order) {
    if (/<!--\s*@partial\s+/.test(partials.get(name))) {
      throw new Error(`Сборка: в partial «${name}» остался несобранный @partial (циклические includes?)`);
    }
  }
}

/** В шаблоне нет ссылок на несуществующие partial — иначе сборка падает с понятной ошибкой. */
function assertLayoutMarkersKnown(layout, partialNames) {
  const markerRe = /<!--\s*@partial\s+([\w-]+)\s*-->/g;
  let m;
  while ((m = markerRe.exec(layout))) {
    if (!partialNames.has(m[1])) {
      throw new Error(
        `В index.layout.html маркер @partial ${m[1]} — нет такого partial (EXTRACT_PARTIALS / EXTRA_PARTIALS / файл на диске)`,
      );
    }
  }
}

function expandLayoutMarkers(layout, partials) {
  assertLayoutMarkersKnown(layout, new Set(partials.keys()));
  const out = layout.replace(MARKER_RE, (_, name) => {
    if (!partials.has(name)) {
      throw new Error(`Layout references unknown partial: ${name}`);
    }
    return partials.get(name).replace(/\s+$/, "") + "\n";
  });
  if (out.includes("<!-- @partial")) {
    throw new Error("Unreplaced @partial markers remain in output");
  }
  return out;
}

function build() {
  if (!fs.existsSync(layoutPath)) {
    throw new Error(`Missing layout ${layoutPath} — run extract first`);
  }
  const partials = loadPartials();
  assertNestedPartialMarkersResolvable(partials);
  expandNestedPartialsInMap(partials);
  const mainLayout = fs.readFileSync(layoutPath, "utf8");
  const mainOut = expandLayoutMarkers(mainLayout, partials);
  fs.writeFileSync(outPath, mainOut.replace(/\n+$/, "\n"), "utf8");
  console.log("Wrote", outPath);

  if (fs.existsSync(blogLayoutPath)) {
    const blogLayout = fs.readFileSync(blogLayoutPath, "utf8");
    fs.mkdirSync(path.dirname(blogOutPath), { recursive: true });
    const blogOut = expandLayoutMarkers(blogLayout, partials);
    fs.writeFileSync(blogOutPath, blogOut.replace(/\n+$/, "\n"), "utf8");
    console.log("Wrote", blogOutPath);
  }
}

const cmd = process.argv[2] || "build";
if (cmd === "extract") {
  extractFromIndex();
} else if (cmd === "build") {
  build();
} else {
  console.error("Usage: node scripts/assemble-html.cjs [extract|build]");
  process.exit(1);
}
