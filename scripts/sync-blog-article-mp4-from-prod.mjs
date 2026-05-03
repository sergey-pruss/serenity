#!/usr/bin/env node
/**
 * Скачивает с прода все ссылки на .mp4 из bodyHtml статьи (`json/blog-articles/<slug>.json`)
 * в `img/blog/<slug>/…`, затем для каждого файла — `ffmpeg -c copy -movflags +faststart`
 * (без перекодирования; «moov» в начале — Safari/WebKit и локальный dev-сервер).
 *
 * Запуск: node scripts/sync-blog-article-mp4-from-prod.mjs <slug>
 * ORIGIN=https://serenity.agency (по умолчанию).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();

function usage() {
  console.error("Использование: node scripts/sync-blog-article-mp4-from-prod.mjs <slug>");
  process.exit(1);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Пути вида `/_sa/img/blog/<slug>/file.mp4` */
function extractMp4Paths(bodyHtml, slug) {
  const re = new RegExp(`/_sa/img/blog/${escapeRe(slug)}/[^"'\\s>]+\\.mp4`, "gi");
  const set = new Set();
  let m;
  const html = String(bodyHtml || "");
  while ((m = re.exec(html)) !== null) set.add(m[0]);
  return [...set];
}

function diskPathFromSaUrl(saPath) {
  const rel = saPath.replace(/^\/_sa\//, "");
  return path.join(root, rel);
}

function curlDownload(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const r = spawnSync(
    "curl",
    ["-fsSL", "-H", "Accept-Encoding: identity", url, "-o", dest],
    { stdio: "inherit", encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`curl завершился с кодом ${r.status}: ${url}`);
}

/** Если `moov` идёт после первого `mdat`, без faststart Safari часто не видит длительность при отдаче по Range. */
function mp4NeedsFaststart(file) {
  const buf = fs.readFileSync(file);
  const moov = buf.indexOf(Buffer.from("moov"));
  const mdat = buf.indexOf(Buffer.from("mdat"));
  if (moov === -1 || mdat === -1) return true;
  return moov > mdat;
}

function faststartMp4(file) {
  if (!mp4NeedsFaststart(file)) {
    console.log("  faststart: пропуск (moov уже в начале файла)");
    return;
  }
  const tmp = `${file}.faststart-tmp.mp4`;
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-c", "copy", "-movflags", "+faststart", tmp],
    { stdio: "inherit", encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg faststart завершился с кодом ${r.status}: ${file}`);
  fs.renameSync(tmp, file);
}

const slug = process.argv[2];
if (!slug) usage();

const ORIGIN = (process.env.ORIGIN || "https://serenity.agency").replace(/\/+$/, "");
const jsonPath = path.join(root, "json", "blog-articles", `${slug}.json`);
if (!fs.existsSync(jsonPath)) {
  console.error(`Нет файла: ${jsonPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const paths = extractMp4Paths(data.bodyHtml || "", slug);
if (paths.length === 0) {
  console.log(`В bodyHtml нет ссылок на .mp4 для slug «${slug}».`);
  process.exit(0);
}

console.log(`Скачивание ${paths.length} файлов с ${ORIGIN} …`);
for (const p of paths) {
  const url = `${ORIGIN}${p}`;
  const out = diskPathFromSaUrl(p);
  console.log(out);
  curlDownload(url, out);
  console.log(`  faststart: ${path.basename(out)}`);
  faststartMp4(out);
}
console.log("Готово.");
