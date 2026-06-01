#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { buildPackagesBlockHtml } = require("./lib/build-korporativnyj-packages-html.cjs");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "html/partials/services/korporativnyj-packages-block.html");

const html = buildPackagesBlockHtml(root);
fs.writeFileSync(outPath, `${html}\n`, "utf8");
console.log("build-korporativnyj-packages-partials: ok →", path.relative(root, outPath));
