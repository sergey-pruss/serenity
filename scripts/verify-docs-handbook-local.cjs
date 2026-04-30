#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "docs", "team-handbook.html");
if (!fs.existsSync(file)) {
  console.error("verify-docs-handbook-local: missing", file);
  process.exit(1);
}
const html = fs.readFileSync(file, "utf8");
if (!html.includes("Serenity — структура проекта, URL и проверки")) {
  console.error("verify-docs-handbook-local: unexpected title / empty handbook");
  process.exit(1);
}
console.log("OK: docs/team-handbook.html present in repo");
