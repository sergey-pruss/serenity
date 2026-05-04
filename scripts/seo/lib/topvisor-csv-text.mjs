import fs from "node:fs";
import iconv from "iconv-lite";

/**
 * Чтение экспорта Топвизора: UTF-8 или Windows-1251 (частый дефолт в настройках аккаунта).
 * @param {string} absPath
 * @param {"auto"|"utf8"|"cp1251"|"windows-1251"} enc
 */
export function readTopvisorCsvText(absPath, enc) {
  const buf = fs.readFileSync(absPath);
  if (enc === "cp1251" || enc === "windows-1251") return iconv.decode(buf, "win1251");
  if (enc === "utf8") {
    let t = buf.toString("utf8");
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    return t;
  }
  let utf = buf.toString("utf8");
  if (utf.charCodeAt(0) === 0xfeff) utf = utf.slice(1);
  const head = utf.slice(0, 800);
  if (/Код ответа/i.test(head) && /URL/.test(head)) return utf;
  return iconv.decode(buf, "win1251");
}
