#!/usr/bin/env node
/**
 * Фаза 1: удаление файлов img/blog/, не упомянутых в JSON/HTML статей.
 * По умолчанию dry-run; применение: --apply
 */
import fs from "fs";
import path from "path";
import { findOrphanFiles } from "./lib/blog-media-inventory.mjs";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const manifestPath = path.join(root, "tmp", "blog-media-orphans-deleted.tsv");

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

const { orphans } = findOrphanFiles(root);
const totalBytes = orphans.reduce((s, f) => s + f.size, 0);

if (!orphans.length) {
  console.log("OK: orphan-файлов нет.");
  process.exit(0);
}

console.log(
  `${apply ? "APPLY" : "DRY-RUN"}: ${orphans.length} orphan, ${fmtBytes(totalBytes)}`
);

if (!apply) {
  for (const f of orphans.sort((a, b) => b.size - a.size).slice(0, 20)) {
    console.log(`  ${f.rel}  ${fmtBytes(f.size)}`);
  }
  if (orphans.length > 20) console.log(`  … ещё ${orphans.length - 20}`);
  console.log("\nУдаление: node scripts/prune-blog-media-orphans.mjs --apply");
  process.exit(0);
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
const lines = ["rel\tsize_bytes\n"];
let removed = 0;
for (const f of orphans) {
  try {
    fs.unlinkSync(f.fp);
    lines.push(`${f.rel}\t${f.size}\n`);
    removed += 1;
  } catch (err) {
    console.error(`FAIL ${f.rel}: ${err.message}`);
    process.exitCode = 1;
  }
}
fs.writeFileSync(manifestPath, lines.join(""), "utf8");
console.log(`OK: удалено ${removed} файлов, манифест ${manifestPath}`);
console.log(`  освобождено ~${fmtBytes(totalBytes)}`);
