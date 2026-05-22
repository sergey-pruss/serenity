#!/usr/bin/env node
/** Восстановление снимка «Результат1» из docs/marketing-result1/manifest.json */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const snapRoot = path.join(root, "docs", "marketing-result1");
const manifestPath = path.join(snapRoot, "manifest.json");

function main() {
  let files;
  if (fs.existsSync(manifestPath)) {
    files = JSON.parse(fs.readFileSync(manifestPath, "utf8")).files;
  } else {
    files = [
      "services/marketing/index.html",
      "scripts/assemble-marketing-from-prod-layout.cjs",
      "html/partials/services/marketing-phase2-middle.html",
    ];
    console.warn("restore-marketing-result1: нет manifest.json, устаревший список");
  }

  for (const rel of files) {
    const src = path.join(snapRoot, rel);
    const dest = path.join(root, rel);
    if (!fs.existsSync(src)) {
      console.error("restore-marketing-result1: нет", src);
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log("ok", rel);
  }

  console.log("restore-marketing-result1: готово (см. docs/marketing-result1/README.md)");
}

main();
