#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { buildTargetingPackagesBlockHtml } = require("./lib/build-targeting-packages-html.cjs");

const root = path.resolve(__dirname, "..");
const block = buildTargetingPackagesBlockHtml(root).trim();

for (const rel of ["targeting/index.html", "html/partials/services/targeting-phase2-middle.html"]) {
  const file = path.join(root, rel);
  let html = fs.readFileSync(file, "utf8");
  const start = html.indexOf("<!-- TARGETING-PACKAGES-START -->");
  const end = html.indexOf("<!-- TARGETING-PACKAGES-END -->");
  if (start < 0 || end < 0) throw new Error(`markers missing in ${rel}`);
  html = `${html.slice(0, start)}${block}\n${html.slice(end)}`;
  if (rel.endsWith("index.html")) {
    html = processTypographyHtml(html, { force: true }).html;
  }
  fs.writeFileSync(file, `${html.replace(/\n+$/, "\n")}`, "utf8");
  console.log("patched", rel);
}
