#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { buildPackagesBlockHtml } = require("./lib/build-korporativnyj-packages-html.cjs");
const { getInternetMagazinaPackagesRowIcon } = require("./lib/internet-magazina-packages-row-icons.cjs");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "html/partials/services/sozdanie-internet-magazina-packages-block.html");
const indexPath = path.join(root, "sozdanie-internet-magazina/index.html");
const startMarker = "<!-- INTERNET-MAGAZINA-PACKAGES-START -->";
const endMarker = "<!-- INTERNET-MAGAZINA-PACKAGES-END -->";

const html = buildPackagesBlockHtml(root, {
  jsonRelPath: "json/services/sozdanie-internet-magazina/packages.json",
  sectionPrefix: "internet-magazina",
  compareMountId: "internet-magazina-packages-compare-mounted",
  markerTag: "INTERNET-MAGAZINA",
  getRowIcon: getInternetMagazinaPackagesRowIcon,
});

fs.writeFileSync(outPath, `${html}\n`, "utf8");
console.log("build-internet-magazina-packages-partials: ok →", path.relative(root, outPath));

const indexHtml = fs.readFileSync(indexPath, "utf8");
const start = indexHtml.indexOf(startMarker);
const end = indexHtml.indexOf(endMarker);
if (start === -1 || end === -1 || end < start) {
  console.error("build-internet-magazina-packages-partials: markers not found in index.html");
  process.exit(1);
}
const patched =
  indexHtml.slice(0, start) + html + "\n" + indexHtml.slice(end + endMarker.length);
fs.writeFileSync(indexPath, patched, "utf8");
console.log("build-internet-magazina-packages-partials: ok →", path.relative(root, indexPath));
