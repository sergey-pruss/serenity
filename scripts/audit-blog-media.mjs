#!/usr/bin/env node
/**
 * Фаза 0: аудит медиа блога (img/blog) — отчёт в tmp/blog-media-audit.md
 * Запуск: node scripts/audit-blog-media.mjs
 */
import fs from "fs";
import path from "path";
import {
  findOrphanFiles,
  listBlogMediaFiles,
  loadReferencedUrls,
} from "./lib/blog-media-inventory.mjs";

const root = process.cwd();
const imgBlog = path.join(root, "img", "blog");
const outPath = path.join(root, "tmp", "blog-media-audit.md");

function fmtBytes(n) {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function logicalBaseName(fileName) {
  const ext = path.extname(fileName);
  const base = fileName.slice(0, -ext.length);
  return base.replace(/-\d+x\d+$/i, "");
}

function extStats(files) {
  const byExt = new Map();
  for (const { size, name } of files) {
    const ext = path.extname(name).toLowerCase() || "(none)";
    const cur = byExt.get(ext) || { count: 0, bytes: 0 };
    cur.count += 1;
    cur.bytes += size;
    byExt.set(ext, cur);
  }
  return [...byExt.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
}

const referenced = loadReferencedUrls(root);
const allFiles = listBlogMediaFiles(root);
const { orphans } = findOrphanFiles(root);

const slugDirs = [];
const rootListing = [];
if (fs.existsSync(imgBlog)) {
  for (const e of fs.readdirSync(imgBlog, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const files = allFiles.filter((f) => f.slug === e.name);
      slugDirs.push({
        slug: e.name,
        bytes: files.reduce((s, f) => s + f.size, 0),
        count: files.length,
      });
    } else if (e.isFile()) {
      const f = allFiles.find((x) => x.slug === null && path.basename(x.fp) === e.name);
      if (f) rootListing.push({ name: e.name, bytes: f.size });
    }
  }
}

const mp4 = allFiles.filter((f) => f.rel.toLowerCase().endsWith(".mp4"));
const slugByBytes = [...slugDirs].sort((a, b) => b.bytes - a.bytes);
const rootBytes = rootListing.reduce((s, f) => s + f.bytes, 0);
const totalBytes = allFiles.reduce((s, f) => s + f.size, 0);

const variantGroups = new Map();
for (const f of allFiles.filter((x) => x.slug)) {
  const base = logicalBaseName(path.basename(f.fp));
  const key = `${f.slug}/${base}`;
  const g = variantGroups.get(key) || [];
  g.push(f);
  variantGroups.set(key, g);
}
const heavyGroups = [...variantGroups.entries()]
  .filter(([, files]) => files.length >= 4)
  .map(([key, files]) => ({
    key,
    count: files.length,
    bytes: files.reduce((s, x) => s + x.size, 0),
  }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 25);

const lines = [];
const now = new Date().toISOString();
lines.push("# Аудит медиа блога (`img/blog/`)");
lines.push("");
lines.push(`Сгенерировано: ${now}`);
lines.push("");
lines.push("## Сводка");
lines.push("");
lines.push(`| Метрика | Значение |`);
lines.push(`| --- | --- |`);
lines.push(`| Всего файлов | ${allFiles.length} |`);
lines.push(`| Общий размер | ${fmtBytes(totalBytes)} |`);
lines.push(`| Папок статей (\`img/blog/<slug>/\`) | ${slugDirs.length} |`);
lines.push(`| Файлов в корне \`img/blog/\` (превью ленты) | ${rootListing.length} (${fmtBytes(rootBytes)}) |`);
lines.push(`| URL в JSON/HTML (уник.) | ${referenced.size} |`);
lines.push(`| Файлов без ссылки в JSON/HTML | ${orphans.length} (${fmtBytes(orphans.reduce((s, f) => s + f.size, 0))}) |`);
lines.push(`| MP4 в \`img/blog/\` | ${mp4.length} (${fmtBytes(mp4.reduce((s, f) => s + f.size, 0))}) |`);
lines.push(`| Групп «логическое фото» с ≥4 файлами | ${heavyGroups.length} (топ-25 ниже) |`);
lines.push("");

lines.push("## Топ-20 папок статей по размеру");
lines.push("");
lines.push("| Slug | Файлов | Размер |");
lines.push("| --- | ---: | --- |");
for (const row of slugByBytes.slice(0, 20)) {
  lines.push(`| \`${row.slug}\` | ${row.count} | ${fmtBytes(row.bytes)} |`);
}
lines.push("");

lines.push("## Корень `img/blog/` — по расширениям");
lines.push("");
for (const [ext, stat] of extStats(rootListing.map((f) => ({ name: f.name, size: f.bytes })))) {
  lines.push(`- \`${ext}\`: ${stat.count} файлов, ${fmtBytes(stat.bytes)}`);
}
lines.push("");

lines.push("## MP4");
lines.push("");
if (!mp4.length) lines.push("(нет)");
else {
  lines.push("| Файл | Размер | В JSON/HTML |");
  lines.push("| --- | --- | --- |");
  for (const f of mp4.sort((a, b) => b.size - a.size)) {
    const url = `/_sa/${f.rel.replace(/\\/g, "/")}`;
    const inJson = referenced.has(url) ? "да" : "нет";
    lines.push(`| \`${f.rel}\` | ${fmtBytes(f.size)} | ${inJson} |`);
  }
}
lines.push("");

lines.push("## Топ групп вариантов (одно фото → много файлов WP)");
lines.push("");
lines.push("| Группа | Файлов | Суммарно |");
lines.push("| --- | ---: | --- |");
for (const g of heavyGroups) {
  lines.push(`| \`${g.key}\` | ${g.count} | ${fmtBytes(g.bytes)} |`);
}
lines.push("");

lines.push("## Файлы на диске без ссылки (кандидаты на удаление в фазе 1)");
lines.push("");
if (!orphans.length) lines.push("(нет)");
else {
  lines.push(`Всего: **${orphans.length}** файлов, **${fmtBytes(orphans.reduce((s, f) => s + f.size, 0))}**`);
  lines.push("");
  lines.push("| Путь | Размер |");
  lines.push("| --- | --- |");
  for (const f of orphans.sort((a, b) => b.size - a.size).slice(0, 80)) {
    lines.push(`| \`${f.rel}\` | ${fmtBytes(f.size)} |`);
  }
  if (orphans.length > 80) lines.push(`| … ещё ${orphans.length - 80} | |`);
}
lines.push("");

lines.push("## Ручная проверка (фаза 0)");
lines.push("");
lines.push("1. Откройте 2–3 URL из «Топ-20» на `npm run dev` — картинки и видео грузятся.");
lines.push("2. Сверьте: цифры «~753 MB img/blog» в Finder близки к отчёту.");
lines.push("3. Просмотрите список orphan — нет ли там нужных файлов (og, ручные правки).");
lines.push("4. Напишите в чат: **«фаза 0 ок»** — перейдём к фазе 1 (мусор + mp4 из git).");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`OK: ${outPath}`);
console.log(`  files=${allFiles.length} total=${fmtBytes(totalBytes)} orphans=${orphans.length} mp4=${mp4.length}`);
