/**
 * Таблица из экспорта Топвизора: .csv (с cp1251 auto) или первый лист .xlsx.
 */
import path from "node:path";
import readXlsxFile from "read-excel-file/node";
import { parseCsvDocument, detectCsvDelimiter } from "./parse-csv.mjs";
import { readTopvisorCsvText } from "./topvisor-csv-text.mjs";

/** @param {unknown} cell */
function cellToString(cell) {
  if (cell == null || cell === "") return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" && Number.isFinite(cell)) return String(cell);
  if (cell instanceof Date) return cell.toISOString();
  return String(cell);
}

/** @param {unknown[][]} raw */
function stringifyMatrix(raw) {
  return raw.map((row) => (Array.isArray(row) ? row : []).map((c) => cellToString(c)));
}

/** @param {string[][]} matrix */
export function normalizeJaggedMatrix(matrix) {
  const maxW = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  return matrix.map((r) => {
    const o = r.slice();
    while (o.length < maxW) o.push("");
    return o;
  });
}

/**
 * @param {string} absPath
 * @param {"auto"|"utf8"|"cp1251"|"windows-1251"} encoding
 * @param {string} delimiter auto | , | ;
 * @returns {Promise<{ format: "csv"|"xlsx", matrix: string[][], delimiter: string | null }>}
 */
export async function readTopvisorTabularMatrix(absPath, encoding, delimiter) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === ".xlsx") {
    const sheets = await readXlsxFile(absPath);
    const first = Array.isArray(sheets) && sheets.length > 0 ? sheets[0] : null;
    const raw = first?.data ?? [];
    const matrix = normalizeJaggedMatrix(stringifyMatrix(/** @type {unknown[][]} */ (raw)));
    return { format: "xlsx", matrix, delimiter: null };
  }
  if (ext === ".csv" || ext === "") {
    const text = readTopvisorCsvText(absPath, encoding);
    const firstLine = (text.split(/\n/).find((l) => l.trim()) || "").trim();
    const delim = delimiter === "auto" ? detectCsvDelimiter(firstLine) : delimiter;
    if (delim !== "," && delim !== ";") throw new Error('CSV delimiter: только "," или ";" или auto');
    const matrix = normalizeJaggedMatrix(parseCsvDocument(text, delim));
    return { format: "csv", matrix, delimiter: delim };
  }
  throw new Error(`Неподдерживаемый файл: ${ext || "(нет расширения)"}. Используйте .csv или .xlsx`);
}
