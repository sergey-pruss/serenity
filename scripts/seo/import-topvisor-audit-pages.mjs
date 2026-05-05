#!/usr/bin/env node
/**
 * Импорт «Страницы» / аудита Топвизора (проблемные страницы) → JSON.
 * Файл: **.csv** (переносы в кавычках, кодировка auto utf8/cp1251) или **.xlsx** (первый лист).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTopvisorTabularMatrix } from "./lib/read-topvisor-tabular.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function usage() {
  console.error(`Использование:
  node scripts/seo/import-topvisor-audit-pages.mjs --input PATH/pages.csv|pages.xlsx [опции]

Опции:
  --output PATH     JSON (по умолчанию: artifacts/seo/topvisor-audit-pages-<timestamp>.json)
  --delimiter auto|,|;   только .csv
  --min-problems N  оставить только строки, где число в колонке «!! problems» >= N (0 = все)
  --sort problems   сортировка по убыванию problems, затем errors, затем URL
  --encoding auto|utf8|cp1251   только .csv; по умолчанию auto
  --with-raw-columns  добавить в каждую строку объект byHeader (все колонки — сильно раздувает JSON)

Пример:
  npm run seo:import-topvisor-audit -- --input ~/Downloads/pages.csv
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
    minProblems: 0,
    sort: "",
    encoding: "auto",
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
    else if (a === "--output") o.output = next();
    else if (a === "--delimiter") o.delimiter = next();
    else if (a === "--min-problems") o.minProblems = Number(next());
    else if (a === "--sort") o.sort = next();
    else if (a === "--encoding") o.encoding = next();
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
 * @param {string[]} headers
 * @returns {{ url: number, status: number, warnings: number, errors: number, problems: number, time: number }}
 */
function pickColumnIndices(headers) {
  const n = headers.map(normHeader);
  const find = (pred) => {
    const i = n.findIndex(pred);
    return i;
  };
  const url = find((h) => /^url$/i.test(h));
  const status = find((h) => /код ответа/i.test(h));
  const warnings = find((h) => /\?\s*warnings/i.test(h));
  const errors = find((h) => /\?\s*errors/i.test(h));
  const problems = find((h) => /!!\s*problems/i.test(h) || (/проблем/i.test(h) && /!!/.test(h)));
  const time = find((h) => /^время$/i.test(h));
  if (url < 0) die(`Не найдена колонка URL среди заголовков: ${n.slice(0, 6).join(" | ")}…`);
  return {
    url,
    status: status >= 0 ? status : -1,
    warnings: warnings >= 0 ? warnings : -1,
    errors: errors >= 0 ? errors : -1,
    problems: problems >= 0 ? problems : -1,
    time: time >= 0 ? time : -1,
  };
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) die("Нужен --input PATH.csv или .xlsx");
  const inputAbs = path.resolve(opts.input);
  if (!fs.existsSync(inputAbs)) die(`Файл не найден: ${inputAbs}`);

  if (!["auto", "utf8", "cp1251", "windows-1251"].includes(opts.encoding)) die('--encoding: auto | utf8 | cp1251');

  const { format, matrix, delimiter: delimOut } = await readTopvisorTabularMatrix(
    inputAbs,
    /** @type {"auto"|"utf8"|"cp1251"|"windows-1251"} */ (opts.encoding),
    opts.delimiter,
  );
  if (matrix.length < 2) die("Таблица: ожидается заголовок и хотя бы одна строка данных");

  const headerCells = matrix[0].map(normHeader);
  const idx = pickColumnIndices(matrix[0]);

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every((c) => !String(c).trim())) continue;
    const url = String(cells[idx.url] ?? "").trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;

    const statusRaw = idx.status >= 0 ? String(cells[idx.status] ?? "").trim() : "";
    const warnings = idx.warnings >= 0 ? parseIntSafe(cells[idx.warnings]) : null;
    const errors = idx.errors >= 0 ? parseIntSafe(cells[idx.errors]) : null;
    const problems = idx.problems >= 0 ? parseIntSafe(cells[idx.problems]) : null;
    const auditedAt = idx.time >= 0 ? String(cells[idx.time] ?? "").trim() : "";

    if (opts.minProblems > 0) {
      const p = problems ?? 0;
      if (p < opts.minProblems) continue;
    }

    /** @type {Record<string, unknown>} */
    const row = {
      url,
      statusRaw,
      warnings,
      errors,
      problems,
      auditedAt: auditedAt || null,
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
      return String(a.url).localeCompare(String(b.url), "en");
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "topvisor-audit-pages",
      file: path.relative(ROOT, inputAbs),
      format,
      delimiter: delimOut,
      encoding: format === "csv" ? opts.encoding : null,
      rowCount: rows.length,
    },
    columns: {
      url: headerCells[idx.url],
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      warnings: idx.warnings >= 0 ? headerCells[idx.warnings] : null,
      errors: idx.errors >= 0 ? headerCells[idx.errors] : null,
      problems: idx.problems >= 0 ? headerCells[idx.problems] : null,
      time: idx.time >= 0 ? headerCells[idx.time] : null,
    },
    rows,
  };

  const outPath = opts.output
    ? path.resolve(opts.output)
    : path.join(ROOT, "artifacts", "seo", `topvisor-audit-pages-${ts()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("Аудит страниц Топвизора:", outPath, `(${rows.length} URL)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
