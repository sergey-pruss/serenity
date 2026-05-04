#!/usr/bin/env node
/**
 * Проверка: у публичных статических HTML в репозитории есть <meta name="description">.
 * Исключения: services/ (в разработке), docs/ (noindex, служебное).
 *
 * Для сопоставления с Я.Вебмастером: диагностика DOCUMENTS_MISSING_DESCRIPTION
 * часто относится ко всему хосту; статика из этого списка должна проходить проверку.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());

const SKIP_PREFIXES = ["services/", "docs/"];

function* walkHtmlIndex(dirRel) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, name.name);
      if (name.isDirectory()) stack.push(p);
      else if (name.name === "index.html") yield p;
    }
  }
}

function rel(p) {
  return path.relative(root, p).split(path.sep).join("/");
}

function shouldSkip(relPath) {
  return SKIP_PREFIXES.some((pre) => relPath === pre || relPath.startsWith(pre));
}

const missing = [];
const checked = [];

checked.push(path.join(root, "index.html"));
if (!shouldSkip("index.html")) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  if (!/<meta\s+name="description"\s/i.test(html)) missing.push("index.html");
}

for (const base of ["blog", "case"]) {
  for (const file of walkHtmlIndex(base)) {
    const r = rel(file);
    if (shouldSkip(r)) continue;
    checked.push(file);
    const html = fs.readFileSync(file, "utf8");
    if (!/<meta\s+name="description"\s/i.test(html)) missing.push(r);
  }
}

if (missing.length) {
  console.error("Нет meta name=\"description\":\n", missing.join("\n"));
  process.exit(1);
}

console.log(`OK: meta description у ${checked.length} статических index.html (без ${SKIP_PREFIXES.join(", ")})`);
