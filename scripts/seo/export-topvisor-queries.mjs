#!/usr/bin/env node
/**
 * Экспорт фраз из semantic-core в CSV (импорт в Топвизор / Keys / Excel)
 * и опционально урезанный JSON ядра для SEMANTIC_CORE_PATH в отчёте позиций.
 *
 * Пресеты (текущее ядро ~77 строк):
 *   wave-a     — priority <= 2 (узкий приоритет, ~24 фразы)
 *   tracked-50 — priority <= 3, сортировка по приоритету, первые 50
 *   all        — все фразы без лимита
 *
 * См. docs/seo-positions-mcp-workflows.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSemanticCore, validateSemanticCore } from "./lib/semantic-core-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function usage() {
  console.error(`Использование:
  node scripts/seo/export-topvisor-queries.mjs [опции]

Опции:
  --input PATH          ядро JSON (по умолчанию: \$SEMANTIC_CORE_PATH или json/seo/semantic-core.json)
  --output PATH         CSV (по умолчанию: artifacts/seo/topvisor-queries-<метка>.csv); «-» = stdout
  --preset NAME         wave-a | tracked-50 | all (явные --max-priority / --limit / --cluster перекрывают поля пресета)
  --min-priority N      только priority >= N (1..5)
  --max-priority N      только priority <= N (1..5)
  --cluster TEXT        точное совпадение cluster (можно повторить флаг)
  --limit N             после сортировки взять первые N
  --columns LIST        через запятую: query,priority,cluster,targetUrl,notes (по умолчанию: query)
  --bom                 UTF-8 BOM в начале файла (удобно для Excel)
  --write-core PATH     записать валидный semantic-core JSON с отфильтрованными queries

Примеры:
  npm run seo:export-topvisor-queries -- --preset tracked-50
  npm run seo:export-topvisor-queries -- --preset wave-a --columns query,priority,cluster
  SEMANTIC_CORE_PATH=json/seo/semantic-core-tracked.json npm run seo:positions-report
`);
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const o = {
    input: "",
    output: "",
    preset: "",
    minPriority: 1,
    maxPriority: 5,
    clusters: /** @type {string[]} */ ([]),
    limit: 0,
    columns: ["query"],
    bom: false,
    writeCore: "",
    /** @type {Set<string>} */ explicit: new Set(),
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
    else if (a === "--preset") o.preset = next();
    else if (a === "--min-priority") {
      o.minPriority = Number(next());
      o.explicit.add("minPriority");
    } else if (a === "--max-priority") {
      o.maxPriority = Number(next());
      o.explicit.add("maxPriority");
    } else if (a === "--cluster") {
      o.clusters.push(next());
      o.explicit.add("clusters");
    } else if (a === "--limit") {
      o.limit = Number(next());
      o.explicit.add("limit");
    } else if (a === "--columns") o.columns = next().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--bom") o.bom = true;
    else if (a === "--write-core") o.writeCore = next();
    else die(`Неизвестный аргумент: ${a}`);
  }
  return o;
}

/** @param {string} cell */
function csvCell(cell) {
  const s = String(cell ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {Array<Record<string, string | number>>} rows
 * @param {string[]} headers
 */
function toCsv(rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

/**
 * @param {object} opts
 * @param {{ queries: Array<{ query: string, cluster: string, priority: number, targetUrl?: string, notes?: string }> }} core
 */
function filterQueries(opts, core) {
  let list = core.queries.slice();
  if (opts.clusters.length) {
    const set = new Set(opts.clusters);
    list = list.filter((q) => set.has(q.cluster));
  }
  list = list.filter((q) => q.priority >= opts.minPriority && q.priority <= opts.maxPriority);
  list.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.query.localeCompare(b.query, "ru");
  });
  if (opts.limit > 0 && list.length > opts.limit) list = list.slice(0, opts.limit);
  return list;
}

/**
 * База фильтра после пресета; явные флаги CLI перекрывают соответствующие поля.
 * @param {string} preset
 * @param {ReturnType<typeof parseArgs>} raw
 */
function effectiveFilter(preset, raw) {
  /** @type {{ minPriority: number, maxPriority: number, clusters: string[], limit: number }} */
  let base = { minPriority: 1, maxPriority: 5, clusters: [], limit: 0 };
  if (preset === "wave-a") {
    base = { minPriority: 1, maxPriority: 2, clusters: [], limit: 0 };
  } else if (preset === "tracked-50") {
    base = { minPriority: 1, maxPriority: 3, clusters: [], limit: 50 };
  } else if (preset === "all") {
    base = { minPriority: 1, maxPriority: 5, clusters: [], limit: 0 };
  } else if (preset) {
    die(`Неизвестный --preset: ${preset} (wave-a | tracked-50 | all)`);
  }
  const out = { ...base };
  if (raw.explicit.has("minPriority")) out.minPriority = raw.minPriority;
  if (raw.explicit.has("maxPriority")) out.maxPriority = raw.maxPriority;
  if (raw.explicit.has("limit")) out.limit = raw.limit;
  if (raw.explicit.has("clusters")) out.clusters = raw.clusters.slice();
  return out;
}

function main() {
  const raw = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(
    raw.input || process.env.SEMANTIC_CORE_PATH || path.join(ROOT, "json", "seo", "semantic-core.json"),
  );
  if (!fs.existsSync(inputPath)) die(`Файл не найден: ${inputPath}`);

  const eff = raw.preset
    ? effectiveFilter(raw.preset, raw)
    : {
        minPriority: raw.minPriority,
        maxPriority: raw.maxPriority,
        clusters: raw.clusters.slice(),
        limit: raw.limit,
      };

  if (
    !Number.isInteger(eff.minPriority) ||
    !Number.isInteger(eff.maxPriority) ||
    eff.minPriority < 1 ||
    eff.maxPriority > 5 ||
    eff.minPriority > eff.maxPriority
  ) {
    die("priority: целые числа 1..5, min <= max");
  }
  if (eff.limit < 0 || (eff.limit > 0 && !Number.isInteger(eff.limit))) die("--limit: неотрицательное целое");

  const core = loadSemanticCore(inputPath);
  const queries = filterQueries(eff, core);

  const allowedCols = new Set(["query", "priority", "cluster", "targetUrl", "notes"]);
  const headers = raw.columns.filter((c) => {
    if (!allowedCols.has(c)) die(`Неизвестная колонка: ${c}`);
    return true;
  });
  if (!headers.length) die("Нужна хотя бы одна колонка");

  const rows = queries.map((q) => {
    /** @type {Record<string, string | number>} */
    const row = {};
    for (const h of headers) {
      if (h === "query") row.query = q.query;
      else if (h === "priority") row.priority = q.priority;
      else if (h === "cluster") row.cluster = q.cluster;
      else if (h === "targetUrl") row.targetUrl = q.targetUrl ?? "";
      else if (h === "notes") row.notes = q.notes ?? "";
    }
    return row;
  });

  const csvBody = toCsv(rows, headers);
  const csvOut = (raw.bom ? "\uFEFF" : "") + csvBody;

  const outLabel = raw.preset || "custom";
  const defaultOut = path.join(ROOT, "artifacts", "seo", `topvisor-queries-${outLabel}.csv`);
  const outPath = raw.output === "-" ? null : raw.output ? path.resolve(raw.output) : defaultOut;

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, csvOut, "utf8");
    console.log("CSV:", outPath, `(${rows.length} строк)`);
  } else {
    process.stdout.write(csvOut);
  }

  if (raw.writeCore) {
    const outCore = {
      version: core.version,
      site: core.site,
      queries,
    };
    const v = validateSemanticCore(outCore);
    if (!v.ok) die(`Урезанное ядро не прошло проверку:\n${v.errors.join("\n")}`);
    const wp = path.resolve(raw.writeCore);
    fs.mkdirSync(path.dirname(wp), { recursive: true });
    fs.writeFileSync(wp, `${JSON.stringify(outCore, null, 2)}\n`, "utf8");
    console.log("Core JSON:", wp, `(${queries.length} queries)`);
  }

  console.log("Подсказка Топвизор: импорт часто ждёт один столбец с фразами — по умолчанию только query.");
}

main();
