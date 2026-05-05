#!/usr/bin/env node
/**
 * Импорт Топвизора: изображения без alt (или полный экспорт вкладки «Изображения» / ресурсы).
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
  node scripts/seo/import-topvisor-images.mjs --input PATH/images.csv|images.xlsx [опции]

Опции:
  --output PATH              JSON (по умолчанию: artifacts/seo/topvisor-images-<timestamp>.json)
  --delimiter auto|,|;      только .csv
  --encoding auto|utf8|cp1251   только .csv
  --page-url-column NAME     заголовок колонки URL страницы (если авто не угадал)
  --image-url-column NAME    заголовок колонки URL файла изображения
  --alt-column NAME          заголовок колонки Alt (для фильтра пустых)
  --only-host HOST           только imageUrl на этом host (например serenity.agency)
  --empty-alt-only           только строки с пустым alt (типично для выгрузки «без alt»)
  --sort size                сортировка по убыванию числового «Размер» (байты), пустые в конце
  --dry-run                  печать распознанных колонок и первых 3 строк без записи JSON
  --with-raw-columns         объект byHeader по всем колонкам

Пример:
  npm run seo:import-topvisor-images -- --input ~/Downloads/images.csv --empty-alt-only --only-host serenity.agency
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
    pageUrlColumn: "",
    imageUrlColumn: "",
    altColumn: "",
    onlyHost: "",
    emptyAltOnly: false,
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
    else if (a === "--output") o.output = next();
    else if (a === "--delimiter") o.delimiter = next();
    else if (a === "--encoding") o.encoding = next();
    else if (a === "--page-url-column") o.pageUrlColumn = next();
    else if (a === "--image-url-column") o.imageUrlColumn = next();
    else if (a === "--alt-column") o.altColumn = next();
    else if (a === "--only-host") o.onlyHost = next();
    else if (a === "--empty-alt-only") o.emptyAltOnly = true;
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
 * @param {{ pageUrlColumn: string, imageUrlColumn: string, altColumn: string }} explicit
 */
function pickColumnIndices(rawHeaders, explicit) {
  const n = rawHeaders.map(normHeader);
  const findExact = (name) => {
    if (!name) return -1;
    return n.findIndex((h) => h === name);
  };
  const find = (pred) => n.findIndex(pred);

  let page = findExact(explicit.pageUrlColumn);
  let image = findExact(explicit.imageUrlColumn);
  let alt = findExact(explicit.altColumn);
  const status = find((h) => /код ответа/i.test(h));
  const size = find((h) => /^размер$/i.test(h) || /размер.*байт|байт/i.test(h));

  if (page < 0 || image < 0) {
    const urlIdx = n.map((h, i) => (/^url$/i.test(h) ? i : -1)).filter((i) => i >= 0);
    if (urlIdx.length >= 2) {
      if (page < 0) page = urlIdx[0];
      if (image < 0) image = urlIdx[1];
    }
  }
  if (page < 0) {
    page = find((h) => /url.*страниц|страниц.*url|url страницы|страница.*url/i.test(h));
  }
  if (page < 0) {
    const u = find((h) => /^url$/i.test(h));
    if (u >= 0) page = u;
  }
  if (image < 0) {
    image = find((h) =>
      /адрес изображения|url изображения|изображен.*url|url.*изображ|src изображ/i.test(h),
    );
  }
  if (image < 0) {
    const urlIdx = n.map((h, i) => (/^url$/i.test(h) ? i : -1)).filter((i) => i >= 0);
    if (urlIdx.length >= 2 && page === urlIdx[0]) image = urlIdx[1];
  }
  if (alt < 0) {
    alt = find((h) => /^alt$/i.test(h) || /текст.*\(alt\)|\(alt\)/i.test(h) || /^alt text$/i.test(h));
  }

  if (page < 0 || image < 0) {
    die(
      `Не удалось определить колонки URL страницы и/или изображения.\nЗаголовки: ${n.join(" | ")}\n` +
        `Укажите явно: --page-url-column "…" --image-url-column "…" (как в первой строке CSV).`,
    );
  }
  if (page === image) die("Колонка страницы и изображения совпали — задайте явные --*-column.");

  return { status, page, image, alt, size };
}

/** @param {string} raw */
function parseIntSafe(raw) {
  const s = String(raw ?? "").replace(/\s/g, "").trim();
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
  const idx = pickColumnIndices(rawHeaders, {
    pageUrlColumn: opts.pageUrlColumn,
    imageUrlColumn: opts.imageUrlColumn,
    altColumn: opts.altColumn,
  });

  if (opts.dryRun) {
    console.log("format:", format, "delimiter:", delimOut);
    console.log("columns:", {
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      page: headerCells[idx.page],
      image: headerCells[idx.image],
      alt: idx.alt >= 0 ? headerCells[idx.alt] : null,
      size: idx.size >= 0 ? headerCells[idx.size] : null,
    });
    for (let r = 1; r <= Math.min(3, matrix.length - 1); r++) {
      console.log("row", r, matrix[r]);
    }
    return;
  }

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every((c) => !String(c).trim())) continue;
    const pageUrl = String(cells[idx.page] ?? "").trim();
    const imageUrl = String(cells[idx.image] ?? "").trim();
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) continue;
    if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) continue;
    if (opts.onlyHost && !hostOk(imageUrl, opts.onlyHost)) continue;

    const altRaw = idx.alt >= 0 ? String(cells[idx.alt] ?? "").trim() : "";
    if (opts.emptyAltOnly && altRaw) continue;

    const statusRaw = idx.status >= 0 ? String(cells[idx.status] ?? "").trim() : "";
    const sizeBytes = idx.size >= 0 ? parseIntSafe(cells[idx.size]) : null;

    /** @type {Record<string, unknown>} */
    const row = {
      pageUrl,
      imageUrl,
      altText: altRaw || null,
      statusRaw,
      sizeBytes,
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

  if (opts.sort === "size") {
    rows.sort((a, b) => {
      const sa = a.sizeBytes;
      const sb = b.sizeBytes;
      if (sa == null && sb == null) return String(a.imageUrl).localeCompare(String(b.imageUrl), "en");
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sb - sa;
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "topvisor-images",
      file: path.relative(ROOT, inputAbs),
      format,
      delimiter: delimOut,
      encoding: format === "csv" ? opts.encoding : null,
      filters: {
        onlyHost: opts.onlyHost || null,
        emptyAltOnly: opts.emptyAltOnly,
      },
      rowCount: rows.length,
    },
    columns: {
      status: idx.status >= 0 ? headerCells[idx.status] : null,
      page: headerCells[idx.page],
      image: headerCells[idx.image],
      alt: idx.alt >= 0 ? headerCells[idx.alt] : null,
      size: idx.size >= 0 ? headerCells[idx.size] : null,
    },
    rows,
  };

  const outPath = opts.output
    ? path.resolve(opts.output)
    : path.join(ROOT, "artifacts", "seo", `topvisor-images-${ts()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("Изображения Топвизора:", outPath, `(${rows.length} строк)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
