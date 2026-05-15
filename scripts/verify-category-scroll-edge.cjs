#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const CSS_VERSION = "20260515burgerBlurRestore";
const css = read("css/css__home-snapshot__overrides.parity-sync.css");

assert(
  /\.case-all-more-case-wr \.categories\[data-v-682de319\][\s\S]*?margin-right:\s*calc\(-1 \* var\(--page-gutter-x\)\)\s*!important;[\s\S]*?width:\s*calc\(100% \+ var\(--page-gutter-x\)\);/.test(css),
  "mobile categories scrollport должен расширяться до правого края viewport",
);
assert(
  /\.case-all-more-case-wr \.categories\[data-v-682de319\][\s\S]*?padding:\s*12px 0 18px;/.test(css),
  "mobile categories не должны иметь внутренний правый padding, который даёт пустой хвост",
);

const pages = [
  "case/all/index.html",
  "case/all/2/index.html",
  "case/all/3/index.html",
  "case/all/category/brending/index.html",
  "case/all/category/brending/2/index.html",
  "case/all/category/pr/index.html",
  "case/all/category/sites/index.html",
  "case/all/category/sites/2/index.html",
  "case/all/category/strategiya/index.html",
  "blog/index.html",
  "blog/2/index.html",
  "blog/3/index.html",
  "blog/article/index.html",
  "blog/article/2/index.html",
  "blog/article/3/index.html",
  "blog/case/index.html",
  "blog/life/index.html",
  "blog/podcast/index.html",
  "html/case-all-index.layout.html",
  "html/blog-index.layout.html",
];

for (const page of pages) {
  assert(
    read(page).includes(`css__home-snapshot__overrides.parity-sync.css?v=${CSS_VERSION}`),
    `${page}: должен подключать category scroll CSS cache-bust ${CSS_VERSION}`,
  );
}

console.log("OK: category scroll edge contract");
