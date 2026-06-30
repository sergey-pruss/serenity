#!/usr/bin/env node
/**
 * Подставляет partial между HTML-маркерами в index страницы услуги.
 * node scripts/sync-service-partial-blocks.cjs <pageDir> <startMarker> <endMarker> <partialFile>
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const [pageDir, startMarker, endMarker, partialRel] = process.argv.slice(2);
if (!pageDir || !startMarker || !endMarker || !partialRel) {
  console.error(
    "Usage: node scripts/sync-service-partial-blocks.cjs <pageDir> <!-- START --> <!-- END --> html/partials/...",
  );
  process.exit(1);
}

const indexPath = path.join(root, pageDir, "index.html");
const partialPath = path.join(root, partialRel);
let html = fs.readFileSync(indexPath, "utf8");
const partial = fs.readFileSync(partialPath, "utf8").trim();
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) {
  console.error("Markers not found:", pageDir, startMarker);
  process.exit(1);
}
html = html.slice(0, start) + partial + "\n" + html.slice(end + endMarker.length);
fs.writeFileSync(indexPath, html);
console.log("sync:", pageDir, partialRel);
