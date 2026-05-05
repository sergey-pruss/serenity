#!/usr/bin/env node
/**
 * Импорт «Ссылки без анкоров» / отчёт по ссылкам (колонки URL, анкор, TTFB и т.д.).
 * Файл: **.csv** или **.xlsx** (первый лист).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTopvisorTabularMatrix } from "./lib/read-topvisor-tabular.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function usage() {
  console.error(`Использование:
  node scripts/seo/import-topvisor-links.mjs --input PATH/links.csv|links.xlsx [опции]

Опции:
  --output PATH          JSON (по умолчанию: artifacts/seo/topvisor-links-<timestamp>.json)
  --delimiter auto|,|;   только .csv
  --encoding auto|utf8|cp1251   только .csv
  --only-host HOST       только URL, чей hostname заканчивается на HOST (например serenity.agency)
  --empty-anchor-only    оставить строки с пустым «Текст (анкор)» после trim
  --sort ttfb            сначала с большим TTFB (число мс), пустые в конце
  --with-raw-columns     все колонки в объекте byHeader

Пример:
  npm run seo:import-topvisor-links -- --input ~/Downloads/links.csv --sort ttfb
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
    onlyHost: "",
    emptyAnchorOnly: false,
    sort: "",
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
    else if (a === "--encoding") o.encoding = next();
    else if (a === "--only-host") o.onlyHost = next();
    else if (a === "--empty-anchor-only") o.emptyAnchorOnly = true;
    else if (a === "--sort") o.sort = next();
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
 */
function pickColumnIndices(rawHeaders) {
  const n = rawHeaders.map(normHeader);
  const find = (pred) => n.findIndex(pred);
  const url = find((h) => /^url$/i.test(h));
  const status = find((h) => /код ответа/i.test(h));
  const page = find((h) => /^стр\.?$/i.test(h) || /^стр$/i.test(h));
  const anchor = find((h) => /анкор/i.test(h));
  const title = find((h) => /\(title\)/i.test(h) || (/текст/i.test(h) && /title/i.test(h)));
  const nofollow = find((h) => /nofollow/i.test(h));
  const sponsored = find((h) => /sponsored/i.test(h));
  const ugs = find((h) => /\bugs\b/i.test(h));
  const ttfb = find((h) => /ttfb/i.test(h));
  if (url < 0) die(`Не найдена колонка URL: ${n.slice(0, 8).join(" | ")}…`);
  return { url, status, page, anchor, title, nofollow, sponsored, ugs, ttfb };
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
function hostEndsWith(url, host) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    const needle = host.toLowerCase().replace(/^www\./, "");
    return h === needle || h.endsWith(`.${needle}`);
  } catch {
    return false;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) die("Нужен --input PATH.csv или .xlsx");
  if (!["auto", "utf8", "cp1251", "windows-1251"].includes(opts.encoding)) die('--encoding: auto | utf8 | cp1251');

  const inputAbs = path.resolve(opts.input);
  if (!fs.existsSync(inputAbs)) die(`Файл не найден: ${inputAbs}`);

  const { format, matrix, delimiter: delimOut } = await readTopvisorTabularMatrix(
    inputAbs,
    /** @type {"auto"|"utf8"|"cp1251"|"windows-1251"} */ (opts.encoding),
    opts.delimiter,
  );
  if (matrix.length < 2) die("Таблица: заголовок и данные");

  const rawHeaders = matrix[0];
  const headerCells = rawHeaders.map(normHeader);
  const idx = pickColumnIndices(rawHeaders);

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every((c) => !String(c).trim())) continue;
    const url = String(cells[idx.url] ?? "").trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    if (opts.onlyHost && !hostEndsWith(url, opts.onlyHost)) continue;

    const anchorRaw = idx.anchor >= 0 ? String(cells[idx.anchor] ?? "").trim() : "";
    if (opts.emptyAnchorOnly && anchorRaw) continue;

    const statusRaw = idx.status >= 0 ? String(cells[idx.status] ?? "").trim() : "";
    const pageNum = idx.page >= 0 ? parseIntSafe(cells[idx.page]) : null;
    const titleText = idx.title >= 0 ? String(cells[idx.title] ?? "").trim() : "";
    const nofollow = idx.nofollow >= 0 ? parseIntSafe(cells[idx.nofollow]) : null;
    const sponsored = idx.sponsored >= 0 ? parseIntSafe(cells[idx.sponsored]) : null;
    const ugs = idx.ugs >= 0 ? parseIntSafe(cells[idx.ugs]) : null;
    const ttfbMs = idx.ttfb >= 0 ? parseIntSafe(cells[idx.ttfb]) : null;

    /** @type {Record<string, unknown>} */
    const row = {
      url,
      statusRaw,
      page: pageNum,
      anchorText: anchorRaw || null,
      titleText: titleText || null,
      nofollowRel: nofollow,
      sponsoredRel: sponsored,
      ugsRel: ugs,
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

  if (opts.sort === "ttfb") {
    rows.sort((a, b) => {
      const ta = a.ttfbMs;
      const tb = b.ttfbMs;
      if (ta == null && tb == null) return String(a.url).localeCompare(String(b.url), "en");
      if (ta == null) return 1;
      if (tb == null) return -1;
      return tb - ta;
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "topvisor-links",
      file: path.relative(ROOT, inputAbs),
      format,
      delimiter: delimOut,
      encoding: format === "csv" ? opts.encoding : null,
      filters: {
        onlyHost: opts.onlyHost || null,
        emptyAnchorOnly: opts.emptyAnchorOnly,
      },
      rowCount: rows.length,
    },
    columns: {
      url: headerCells[idx.url],
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      page: idx.page >= 0 ? headerCells[idx.page] : null,
      anchor: idx.anchor >= 0 ? headerCells[idx.anchor] : null,
      title: idx.title >= 0 ? headerCells[idx.title] : null,
      nofollow: idx.nofollow >= 0 ? headerCells[idx.nofollow] : null,
      sponsored: idx.sponsored >= 0 ? headerCells[idx.sponsored] : null,
      ugs: idx.ugs >= 0 ? headerCells[idx.ugs] : null,
      ttfb: idx.ttfb >= 0 ? headerCells[idx.ttfb] : null,
    },
    rows,
  };

  const outPath = opts.output
    ? path.resolve(opts.output)
    : path.join(ROOT, "artifacts", "seo", `topvisor-links-${ts()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("Ссылки Топвизора:", outPath, `(${rows.length} строк)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
