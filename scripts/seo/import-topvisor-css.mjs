#!/usr/bin/env node
/**
 * Импорт CSV Топвизора: проблемные стили (вкладка CSS / ресурсы).
 * Колонки: URL файла .css, опционально URL страницы, счётчики как в аудите, TTFB.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvDocument, detectCsvDelimiter } from "./lib/parse-csv.mjs";
import { readTopvisorCsvText } from "./lib/topvisor-csv-text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function usage() {
  console.error(`Использование:
  node scripts/seo/import-topvisor-css.mjs --input PATH/css.csv [опции]

Опции:
  --output PATH              JSON (по умолчанию: artifacts/seo/topvisor-css-<timestamp>.json)
  --delimiter auto|,|;
  --encoding auto|utf8|cp1251
  --css-url-column NAME      заголовок колонки URL файла .css (если авто не угадал)
  --page-url-column NAME     заголовок колонки URL страницы
  --only-css-host HOST       только cssUrl на этом host
  --min-problems N           только строки с !! problems >= N
  --sort problems            сортировка по problems, затем errors
  --dry-run
  --with-raw-columns

Пример:
  npm run seo:import-topvisor-css -- --input ~/Desktop/css.csv --sort problems
`);
}

function die(m) {
  console.error(m);
  process.exit(1);
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const o = {
    input: "",
    output: "",
    delimiter: "auto",
    encoding: "auto",
    cssUrlColumn: "",
    pageUrlColumn: "",
    onlyCssHost: "",
    minProblems: 0,
    sort: "",
    dryRun: false,
    withRawColumns: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
    const next = () => {
      const v = argv[++i];
      if (v == null) die(`Ожидалось значение после ${a}`);
      return v;
    };
    if (a === "--input") o.input = next();
    else if (a === "--output" || a === "-o") o.output = next();
    else if (a === "--delimiter") o.delimiter = next();
    else if (a === "--encoding") o.encoding = next();
    else if (a === "--css-url-column") o.cssUrlColumn = next();
    else if (a === "--page-url-column") o.pageUrlColumn = next();
    else if (a === "--only-css-host") o.onlyCssHost = next();
    else if (a === "--min-problems") o.minProblems = Number(next());
    else if (a === "--sort") o.sort = next();
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--with-raw-columns") o.withRawColumns = true;
    else die(`Неизвестный аргумент: ${a}`);
  }
  return o;
}

/** @param {string} s */
function normHeader(s) {
  return String(s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string[]} rawHeaders
 * @param {{ cssUrlColumn: string, pageUrlColumn: string }} explicit
 */
function pickColumnIndices(rawHeaders, explicit) {
  const n = rawHeaders.map(normHeader);
  const findExact = (name) => (name ? n.findIndex((h) => h === name) : -1);
  const find = (pred) => n.findIndex(pred);

  let style = findExact(explicit.cssUrlColumn);
  let page = findExact(explicit.pageUrlColumn);
  const status = find((h) => /код ответа/i.test(h));
  const warnings = find((h) => /\?\s*warnings/i.test(h));
  const errors = find((h) => /\?\s*errors/i.test(h));
  const problems = find((h) => /!!\s*problems/i.test(h) || (/проблем/i.test(h) && /!!/.test(h)));
  const ttfb = find((h) => /ttfb/i.test(h));

  if (page < 0) {
    page = find((h) => /url.*страниц|страниц.*url|url страницы|страница.*url/i.test(h));
  }
  if (style < 0) {
    style = find((h) =>
      /адрес стил|url стил|стил.*url|url.*стил|stylesheet|ресурс.*css|таблиц.*стил/i.test(h),
    );
  }
  if (style < 0 || page < 0) {
    const plainUrl = n.map((h, i) => (/^url$/i.test(h) ? i : -1)).filter((i) => i >= 0);
    if (plainUrl.length >= 2) {
      if (page < 0 && style < 0) {
        page = plainUrl[0];
        style = plainUrl[1];
      } else if (style < 0) {
        style = plainUrl.find((i) => i !== page) ?? -1;
      } else if (page < 0) {
        page = plainUrl.find((i) => i !== style) ?? -1;
      }
    } else if (plainUrl.length === 1 && style < 0) {
      style = plainUrl[0];
    }
  }
  if (style < 0) {
    const u = find((h) => /^url$/i.test(h));
    if (u >= 0) style = u;
  }

  if (style < 0) {
    die(
      `Не найдена колонка URL CSS.\nЗаголовки: ${n.join(" | ")}\n` +
        `Задайте --css-url-column "…" (и при необходимости --page-url-column "…").`,
    );
  }
  if (page >= 0 && page === style) die("Колонки страницы и CSS совпали — укажите явные имена колонок.");

  return { status, page, style, warnings, errors, problems, ttfb };
}

/** @param {string} raw */
function parseIntSafe(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** @param {string} url */
function hostOk(url, host) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    const needle = host.toLowerCase().replace(/^www\./, "");
    return h === needle || h.endsWith(`.${needle}`);
  } catch {
    return false;
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) die("Нужен --input PATH.csv");
  if (!["auto", "utf8", "cp1251", "windows-1251"].includes(opts.encoding)) die('--encoding: auto | utf8 | cp1251');

  const inputAbs = path.resolve(opts.input);
  if (!fs.existsSync(inputAbs)) die(`Файл не найден: ${inputAbs}`);

  const text = readTopvisorCsvText(
    inputAbs,
    /** @type {"auto"|"utf8"|"cp1251"|"windows-1251"} */ (opts.encoding),
  );
  const firstLine = (text.split("\n").find((l) => l.trim()) || "").trim();
  const delim = opts.delimiter === "auto" ? detectCsvDelimiter(firstLine) : opts.delimiter;
  if (delim !== "," && delim !== ";") die('--delimiter: только "," или ";" или auto');

  const matrix = parseCsvDocument(text, delim);
  if (matrix.length < 2) die("CSV: заголовок и данные");

  const rawHeaders = matrix[0];
  const headerCells = rawHeaders.map(normHeader);
  const idx = pickColumnIndices(rawHeaders, {
    cssUrlColumn: opts.cssUrlColumn,
    pageUrlColumn: opts.pageUrlColumn,
  });

  if (opts.dryRun) {
    console.log("delimiter:", delim);
    console.log("columns:", {
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      page: idx.page >= 0 ? headerCells[idx.page] : null,
      css: headerCells[idx.style],
      warnings: idx.warnings >= 0 ? headerCells[idx.warnings] : null,
      errors: idx.errors >= 0 ? headerCells[idx.errors] : null,
      problems: idx.problems >= 0 ? headerCells[idx.problems] : null,
      ttfb: idx.ttfb >= 0 ? headerCells[idx.ttfb] : null,
    });
    for (let r = 1; r <= Math.min(3, matrix.length - 1); r++) console.log("row", r, matrix[r]);
    return;
  }

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every((c) => !String(c).trim())) continue;
    const cssUrl = String(cells[idx.style] ?? "").trim();
    if (!cssUrl || !/^https?:\/\//i.test(cssUrl)) continue;
    if (opts.onlyCssHost && !hostOk(cssUrl, opts.onlyCssHost)) continue;

    const pageUrl = idx.page >= 0 ? String(cells[idx.page] ?? "").trim() : "";
    if (idx.page >= 0 && pageUrl && !/^https?:\/\//i.test(pageUrl)) continue;

    const problems = idx.problems >= 0 ? parseIntSafe(cells[idx.problems]) : null;
    if (opts.minProblems > 0 && (problems ?? 0) < opts.minProblems) continue;

    const statusRaw = idx.status >= 0 ? String(cells[idx.status] ?? "").trim() : "";
    const warnings = idx.warnings >= 0 ? parseIntSafe(cells[idx.warnings]) : null;
    const errors = idx.errors >= 0 ? parseIntSafe(cells[idx.errors]) : null;
    const ttfbMs = idx.ttfb >= 0 ? parseIntSafe(cells[idx.ttfb]) : null;

    /** @type {Record<string, unknown>} */
    const row = {
      cssUrl,
      pageUrl: pageUrl || null,
      statusRaw,
      warnings,
      errors,
      problems,
      ttfbMs,
    };
    if (opts.withRawColumns) {
      /** @type {Record<string, string>} */
      const byHeader = {};
      for (let c = 0; c < headerCells.length; c++) {
        const key = headerCells[c] || `col_${c}`;
        if (byHeader[key] !== undefined) continue;
        byHeader[key] = String(cells[c] ?? "").trim();
      }
      row.byHeader = byHeader;
    }
    rows.push(row);
  }

  if (opts.sort === "problems") {
    rows.sort((a, b) => {
      const pb = b.problems ?? -1;
      const pa = a.problems ?? -1;
      if (pb !== pa) return pb - pa;
      const eb = b.errors ?? -1;
      const ea = a.errors ?? -1;
      if (eb !== ea) return eb - ea;
      return String(a.cssUrl).localeCompare(String(b.cssUrl), "en");
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "topvisor-css",
      file: path.relative(ROOT, inputAbs),
      delimiter: delim,
      encoding: opts.encoding,
      filters: { onlyCssHost: opts.onlyCssHost || null, minProblems: opts.minProblems || null },
      rowCount: rows.length,
    },
    columns: {
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      page: idx.page >= 0 ? headerCells[idx.page] : null,
      css: headerCells[idx.style],
      warnings: idx.warnings >= 0 ? headerCells[idx.warnings] : null,
      errors: idx.errors >= 0 ? headerCells[idx.errors] : null,
      problems: idx.problems >= 0 ? headerCells[idx.problems] : null,
      ttfb: idx.ttfb >= 0 ? headerCells[idx.ttfb] : null,
    },
    rows,
  };

  const outPath = opts.output
    ? path.resolve(opts.output)
    : path.join(ROOT, "artifacts", "seo", `topvisor-css-${ts()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("CSS Топвизора:", outPath, `(${rows.length} строк)`);
}

main();
