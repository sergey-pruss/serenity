#!/usr/bin/env node
/**
 * Внутренние href на статическом контуре — без завершающего слэша (кроме href="/").
 * Запуск: node scripts/strip-static-internal-hrefs.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const GLOBS = [
  "index.html",
  "services/index.html",
  "targeting/index.html",
  "kontekstnaya_reklama/index.html",
  "404.html",
  "html/**/*.html",
  "blog/**/*.html",
  "case/all/**/*.html",
];

function walk(relDir, out = []) {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return out;
  for (const name of fs.readdirSync(abs)) {
    if (name === ".DS_Store") continue;
    const rel = path.join(relDir, name);
    const absPath = path.join(root, rel);
    const st = fs.statSync(absPath);
    if (st.isDirectory()) walk(rel, out);
    else if (name.endsWith(".html")) out.push(rel);
  }
  return out;
}

function collectFiles() {
  const set = new Set();
  for (const p of GLOBS) {
    if (p.includes("**")) {
      const [dir] = p.split("/**");
      for (const f of walk(dir, [])) set.add(f);
    } else if (fs.existsSync(path.join(root, p))) set.add(p);
  }
  return [...set].sort();
}

/** href="/path/" → href="/path" (не трогаем href="/"). */
function stripHrefSlashes(html) {
  return html.replace(/href="(\/[^"]+)\/"/g, (m, p) => (p === "/" || p === "" ? m : `href="${p}"`));
}

let changed = 0;
for (const rel of collectFiles()) {
  const abs = path.join(root, rel);
  const before = fs.readFileSync(abs, "utf8");
  const after = stripHrefSlashes(before);
  if (after !== before) {
    fs.writeFileSync(abs, after, "utf8");
    changed++;
  }
}
console.log(`OK: strip-static-internal-hrefs — обновлено ${changed} HTML-файлов.`);
