#!/usr/bin/env node
/**
 * Импорт экспорта «Проверка позиций» Топвизора → JSON в artifacts/seo/
 * (слияние по normalizeQueryForJoin с семантическим ядром и опционально с positions-report).
 *
 * Файл: **.csv** или **.xlsx** (первый лист). Шаблон столбцов в Топвизоре настраивается — заголовки могут отличаться.
 * Скрипт ищет колонку запроса по эвристике (Ключ, Фраза, Запрос, query…) или по --query-column.
 * Остальные колонки трактуются как позиции (число, «--», «>100», компактный «6 https://…»).
 *
 * Для **.csv**: `--encoding auto|utf8|cp1251` (как в других импортерах Топвизора).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQueryForJoin } from "./lib/normalize-query.mjs";
import { loadSemanticCore } from "./lib/semantic-core-utils.mjs";
import { readTopvisorTabularMatrix } from "./lib/read-topvisor-tabular.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function usage() {
  console.error(`Использование:
  node scripts/seo/import-topvisor-export.mjs --input PATH/export.csv|export.xlsx [опции]

Опции:
  --output PATH           JSON (по умолчанию: artifacts/seo/topvisor-import-<timestamp>.json)
  --query-column NAME     точное имя столбца из первой строки таблицы (если автоопределение промахнулось)
  --delimiter auto|,|;   только .csv; по умолчанию auto
  --encoding auto|utf8|cp1251   только .csv; по умолчанию auto
  --core PATH             semantic-core для полей cluster/priority/targetUrl (по умолчанию json/seo/semantic-core.json)
  --merge-report PATH     существующий positions-report-*.json → новый файл с теми же rows + блок topvisor
  --merge-output PATH     куда записать merge (по умолчанию: artifacts/seo/positions-report-with-topvisor-<ts>.json)
  --dry-run               только лог: разделитель, колонка запроса, список колонок позиций, первые 5 строк

Примеры:
  npm run seo:import-topvisor -- --input ~/Downloads/topvisor-serenity.csv
  npm run seo:import-topvisor -- --input ./export.csv --merge-report ./artifacts/seo/positions-report-xxx.json
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
    queryColumn: "",
    delimiter: "auto",
    encoding: "auto",
    core: "",
    mergeReport: "",
    mergeOutput: "",
    dryRun: false,
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
    else if (a === "--query-column") o.queryColumn = next();
    else if (a === "--delimiter") o.delimiter = next();
    else if (a === "--encoding") o.encoding = next();
    else if (a === "--core") o.core = next();
    else if (a === "--merge-report") o.mergeReport = next();
    else if (a === "--merge-output") o.mergeOutput = next();
    else if (a === "--dry-run") o.dryRun = true;
    else die(`Неизвестный аргумент: ${a}`);
  }
  return o;
}

/** @param {string[]} headers */
function pickQueryColumnIndex(headers, explicit) {
  const trimmed = headers.map((h) => String(h).replace(/^\uFEFF/, "").trim());
  if (explicit) {
    const i = trimmed.findIndex((h) => h === explicit);
    if (i < 0) die(`--query-column «${explicit}» не найдена среди заголовков: ${trimmed.join(" | ")}`);
    return i;
  }
  const patterns = [
    /^(ключ|фраза|запрос|query|keyword)$/i,
    /поисков(ый|ая|ое)\s+запрос/i,
    /ключев/i,
    /запрос/i,
    /фраз/i,
  ];
  for (const re of patterns) {
    const i = trimmed.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return 0;
}

/**
 * @param {string} raw
 * @returns {{ position: number | null, raw: string, note?: string }}
 */
function parsePositionCell(raw) {
  const rawTrim = String(raw ?? "").trim();
  if (!rawTrim) return { position: null, raw: "" };
  const dash = /^[—\-–−]+$/u.test(rawTrim) || rawTrim === "--" || rawTrim === "—" || rawTrim === "−";
  if (dash) return { position: null, raw: rawTrim, note: "empty_cell" };

  let s = rawTrim.replace(/\u00a0/g, " ");
  const compactUrl = s.match(/^(\d{1,3})\s+https?:\/\//i);
  if (compactUrl) return { position: Number(compactUrl[1]), raw: rawTrim };

  const numOnly = s.match(/^(\d{1,3})$/);
  if (numOnly) return { position: Number(numOnly[1]), raw: rawTrim };

  const gt = s.match(/^>\s*(\d{1,3})\s*$/);
  if (gt) return { position: null, raw: rawTrim, note: `out_of_top_${gt[1]}` };

  const plus = s.match(/^(\d{1,3})\s*\+$/);
  if (plus) return { position: null, raw: rawTrim, note: "out_of_top" };

  const n = parseInt(s.replace(",", "."), 10);
  if (Number.isFinite(n) && n > 0 && n <= 500) return { position: n, raw: rawTrim };

  return { position: null, raw: rawTrim, note: "unparsed" };
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
  if (matrix.length < 2) die("Таблица: нужна строка заголовков и хотя бы одна строка данных");

  const headers = matrix[0].map((h) => String(h).trim());
  const qIdx = pickQueryColumnIndex(headers, opts.queryColumn);
  const positionHeaders = headers.map((h, i) => (i === qIdx ? null : h)).filter(Boolean);

  const byKey = new Map();
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every((c) => !String(c).trim())) continue;
    const query = String(cells[qIdx] ?? "").trim();
    if (!query) continue;
    const k = normalizeQueryForJoin(query);
    if (!k) continue;
    /** @type {Record<string, ReturnType<typeof parsePositionCell>>} */
    const byColumn = {};
    for (let c = 0; c < headers.length; c++) {
      if (c === qIdx) continue;
      const label = headers[c];
      if (!String(label).trim()) continue;
      byColumn[label] = parsePositionCell(cells[c] ?? "");
    }
    byKey.set(k, { query, byColumn });
  }

  if (opts.dryRun) {
    console.log("format:", format, "delimiter:", delimOut);
    console.log("query column:", headers[qIdx], `(index ${qIdx})`);
    console.log("position columns:", positionHeaders.join(" || "));
    console.log("rows (unique normalized keys):", byKey.size);
    let n = 0;
    for (const [, v] of byKey) {
      console.log(" —", v.query, JSON.stringify(v.byColumn).slice(0, 200));
      if (++n >= 5) break;
    }
    return;
  }

  const corePath = path.resolve(
    opts.core || path.join(ROOT, "json", "seo", "semantic-core.json"),
  );
  const core = loadSemanticCore(corePath);
  /** @type {Map<string, { cluster: string, priority: number, targetUrl: string | null }>} */
  const meta = new Map();
  for (const q of core.queries) {
    const k = normalizeQueryForJoin(q.query);
    if (!k) continue;
    meta.set(k, {
      cluster: q.cluster,
      priority: q.priority,
      targetUrl: q.targetUrl ?? null,
    });
  }

  const rows = [];
  for (const [, v] of byKey) {
    const k = normalizeQueryForJoin(v.query);
    const m = meta.get(k);
    rows.push({
      query: v.query,
      cluster: m?.cluster ?? null,
      priority: m?.priority ?? null,
      targetUrl: m?.targetUrl ?? null,
      normalizedKey: k,
      topvisor: {
        byColumn: v.byColumn,
      },
    });
  }
  rows.sort((a, b) => a.query.localeCompare(b.query, "ru"));

  const outBase = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "topvisor",
      file: path.relative(ROOT, inputAbs),
      format,
      delimiter: delimOut,
      encoding: format === "csv" ? opts.encoding : null,
      queryColumn: headers[qIdx],
    },
    corePath: path.relative(ROOT, corePath),
    rows,
  };

  const outPath = opts.output
    ? path.resolve(opts.output)
    : path.join(ROOT, "artifacts", "seo", `topvisor-import-${ts()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(outBase, null, 2)}\n`, "utf8");
  console.log("Импорт Топвизора:", outPath, `(${rows.length} строк)`);

  if (opts.mergeReport) {
    const repAbs = path.resolve(opts.mergeReport);
    if (!fs.existsSync(repAbs)) die(`--merge-report: файл не найден: ${repAbs}`);
    const report = JSON.parse(fs.readFileSync(repAbs, "utf8"));
    if (!Array.isArray(report.rows)) die("positions-report: ожидается объект с массивом rows");
    const mergedPath = opts.mergeOutput
      ? path.resolve(opts.mergeOutput)
      : path.join(ROOT, "artifacts", "seo", `positions-report-with-topvisor-${ts()}.json`);
    let matched = 0;
    const newRows = report.rows.map((row) => {
      const k = row.normalizedKey || normalizeQueryForJoin(row.query);
      const tv = byKey.get(k);
      if (tv) matched++;
      return {
        ...row,
        topvisor: tv
          ? {
              importedAt: outBase.generatedAt,
              sourceFile: path.basename(inputAbs),
              byColumn: tv.byColumn,
            }
          : (row.topvisor ?? null),
      };
    });
    const merged = {
      ...report,
      generatedAt: new Date().toISOString(),
      topvisorImport: {
        file: path.relative(ROOT, inputAbs),
        mergedInto: path.relative(ROOT, repAbs),
        rowsMatched: matched,
        rowsInReport: report.rows.length,
      },
      rows: newRows,
    };
    fs.mkdirSync(path.dirname(mergedPath), { recursive: true });
    fs.writeFileSync(mergedPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log("Сводка с Топвизором:", mergedPath);
    console.log(`Совпало по запросу: ${matched} из ${report.rows.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
