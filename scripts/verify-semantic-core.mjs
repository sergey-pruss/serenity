#!/usr/bin/env node
/**
 * Проверяет json/seo/semantic-core.example.json и при наличии — semantic-core.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSemanticCore } from "./seo/lib/semantic-core-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function checkFile(rel) {
  const abs = path.join(root, ...rel.split("/"));
  const raw = fs.readFileSync(abs, "utf8");
  const data = JSON.parse(raw);
  const v = validateSemanticCore(data);
  if (!v.ok) {
    console.error(`${rel} не прошёл проверку:`);
    for (const e of v.errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("OK:", rel);
}

checkFile("json/seo/semantic-core.example.json");
const live = path.join(root, "json", "seo", "semantic-core.json");
if (fs.existsSync(live)) checkFile("json/seo/semantic-core.json");
