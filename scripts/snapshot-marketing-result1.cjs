#!/usr/bin/env node
/**
 * Снимок «Результат1» → docs/marketing-result1/
 * Запуск: node scripts/snapshot-marketing-result1.cjs
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const snapRoot = path.join(root, "docs", "marketing-result1");

/** Файлы, определяющие собранную страницу (targeting-каркас + ссылки). */
const FILES = [
  "services/marketing/index.html",
  "scripts/assemble-marketing-from-prod-layout.cjs",
  "scripts/lib/marketing-h2-anchors.cjs",
  "scripts/verify-marketing.cjs",
  "scripts/verify-marketing-links.cjs",
  "scripts/compare-marketing-prod-local-text.cjs",
  "css/targeting-static-stack.css",
  "json/services/marketing/service.config.json",
];

const PARTIAL_GLOB_PREFIX = "html/partials/services/marketing-";
const PARTIAL_SKIP = new Set([
  "marketing-kontekst-sections.html",
  "marketing-synergy-diagram.html",
  "marketing-strategy-approach-block.html",
]);

function copyFile(rel) {
  const src = path.join(root, rel);
  const dest = path.join(snapRoot, rel);
  if (!fs.existsSync(src)) {
    console.warn("snapshot: пропуск (нет файла)", rel);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function listPartials() {
  const dir = path.join(root, "html/partials/services");
  return fs
    .readdirSync(dir)
    .filter((n) => n.startsWith("marketing-") && n.endsWith(".html") && !PARTIAL_SKIP.has(n))
    .map((n) => `html/partials/services/${n}`)
    .sort();
}

function gitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "(no git)";
  }
}

function main() {
  const partials = listPartials();
  const manifest = [...FILES, ...partials];
  const copied = [];

  for (const rel of manifest) {
    if (copyFile(rel)) copied.push(rel);
  }

  const date = new Date().toISOString();
  fs.writeFileSync(path.join(snapRoot, "snapshot-date.txt"), `${date}\n`);
  fs.writeFileSync(path.join(snapRoot, "git-commit.txt"), `${gitCommit()}\n`);
  fs.writeFileSync(
    path.join(snapRoot, "manifest.json"),
    JSON.stringify({ version: "result1", date, files: copied }, null, 2) + "\n",
  );

  console.log(`snapshot-marketing-result1: ok (${copied.length} файлов → docs/marketing-result1/)`);
}

main();
