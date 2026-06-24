#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function replaceBlock(file, startTag, endTag, partialFile) {
  const page = path.join(ROOT, file);
  let html = fs.readFileSync(page, "utf8");
  const partial = fs.readFileSync(path.join(ROOT, partialFile), "utf8");
  const s = `<!-- ${startTag} -->`;
  const e = `<!-- ${endTag} -->`;
  const i0 = html.indexOf(s);
  const i1 = html.indexOf(e);
  if (i0 < 0 || i1 < 0) throw new Error(`markers not found: ${startTag} in ${file}`);
  html = html.slice(0, i0) + partial.trim() + "\n" + html.slice(i1);
  fs.writeFileSync(page, html);
  console.log("patched", file, startTag);
}

const patches = [
  [
    "kompleksnoye-prodvizheniye/index.html",
    "KOMPLEKSNOYE-CHANNELS-START",
    "KOMPLEKSNOYE-CHANNELS-END",
    "html/partials/services/kompleksnoye-channels-synergy-block.html",
  ],
  [
    "kompleksnoye-prodvizheniye/index.html",
    "KOMPLEKSNOYE-CHANNELS-USED-START",
    "KOMPLEKSNOYE-CHANNELS-USED-END",
    "html/partials/services/kompleksnoye-channels-used-block.html",
  ],
  [
    "kompleksnoye-prodvizheniye/index.html",
    "KOMPLEKSNOYE-APPROACH-START",
    "KOMPLEKSNOYE-APPROACH-END",
    "html/partials/services/kompleksnoye-approach-block.html",
  ],
  [
    "kompleksnoye-prodvizheniye/index.html",
    "KOMPLEKSNOYE-BLOG-START",
    "KOMPLEKSNOYE-BLOG-END",
    "html/partials/services/blog-kompleksnoye-prodvizheniye.html",
  ],
];

for (const [f, a, b, p] of patches) replaceBlock(f, a, b, p);

const mktPath = path.join(ROOT, "services/marketing/index.html");
let mkt = fs.readFileSync(mktPath, "utf8");
  .readFileSync(path.join(ROOT, "html/partials/services/marketing-see-also-kompleksnoye-block.html"), "utf8")
  .trim();
if (!mkt.includes("MARKETING-SEE-ALSO-KOMPLEKSNOYE-START")) {
  const ins = mkt.indexOf("<!-- Частичный блок «Награды» для /kontekstnaya_reklama");
  if (ins < 0) throw new Error("marketing awards anchor not found");
  mkt = mkt.slice(0, ins) + seePartial + "\n\n" + mkt.slice(ins);
  fs.writeFileSync(mktPath, mkt);
  console.log("patched marketing see-also");
}
