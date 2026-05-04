#!/usr/bin/env node
/**
 * Добавляет запросы из json/seo/sources/gsc-home-queries.json в json/seo/semantic-core.json
 * (кластер «главная», notes: gsc), без дублей по normalizeQueryForJoin.
 *
 * Формат источника:
 *   { "queries": [ "фраза 1", "фраза 2" ] }
 *   или { "queries": [ { "query": "…", "priority": 2 } ] }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQueryForJoin } from "./lib/normalize-query.mjs";
import { loadSemanticCore, validateSemanticCore } from "./lib/semantic-core-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const CORE_PATH = path.join(ROOT, "json", "seo", "semantic-core.json");
const GSC_PATH = path.join(ROOT, "json", "seo", "sources", "gsc-home-queries.json");
const HOME = "https://serenity.agency/";

function main() {
  const core = loadSemanticCore(CORE_PATH);
  const existing = new Set(core.queries.map((q) => normalizeQueryForJoin(q.query)));

  if (!fs.existsSync(GSC_PATH)) {
    console.error("Нет файла:", GSC_PATH);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(GSC_PATH, "utf8"));
  const list = Array.isArray(raw.queries) ? raw.queries : [];
  let added = 0;
  for (const item of list) {
    const query = typeof item === "string" ? item : item && typeof item.query === "string" ? item.query : "";
    if (!query.trim()) continue;
    const k = normalizeQueryForJoin(query);
    if (!k || existing.has(k)) continue;
    existing.add(k);
    const priority =
      item && typeof item === "object" && Number.isInteger(item.priority) && item.priority >= 1 && item.priority <= 5
        ? item.priority
        : 2;
    core.queries.push({
      query: query.trim(),
      cluster: "главная",
      priority,
      targetUrl: HOME,
      notes: "gsc",
    });
    added++;
  }

  const v = validateSemanticCore(core);
  if (!v.ok) {
    console.error(v.errors.join("\n"));
    process.exit(1);
  }
  fs.writeFileSync(CORE_PATH, JSON.stringify(core, null, 2), "utf8");
  console.log("Добавлено новых запросов:", added);
  console.log("Всего в ядре:", core.queries.length);
}

main();
