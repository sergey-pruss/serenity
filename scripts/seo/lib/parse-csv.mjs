/**
 * Разбор CSV с кавычками RFC4180 и переносами строк внутри полей (экспорты Топвизора).
 * @param {string} text
 * @param {string} delim один символ , или ;
 * @returns {string[][]}
 */
export function parseCsvDocument(text, delim) {
  const norm = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (delim !== "," && delim !== ";") throw new Error('delimiter must be "," or ";"');
  const rows = /** @type {string[][]} */ ([]);
  let row = /** @type {string[]} */ ([]);
  let field = "";
  let inQ = false;
  for (let i = 0; i < norm.length; i++) {
    const c = norm[i];
    if (inQ) {
      if (c === '"') {
        if (norm[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((x) => String(x).trim() !== "") || row.length > 1) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => String(x).trim() !== "") || row.length > 1) rows.push(row);
  return rows;
}

/** @param {string} line */
export function detectCsvDelimiter(line) {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  if (semi === 0 && comma === 0) return ";";
  return semi >= comma ? ";" : ",";
}
