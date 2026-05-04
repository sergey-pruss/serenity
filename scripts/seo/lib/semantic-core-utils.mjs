import fs from "node:fs";
import path from "node:path";
import { normalizeQueryForJoin } from "./normalize-query.mjs";

const REQUIRED_TOP = ["version", "site", "queries"];

/**
 * @param {unknown} data
 * @returns {{ ok: true, data: object } | { ok: false, errors: string[] }}
 */
export function validateSemanticCore(data) {
  const errors = [];
  if (data == null || typeof data !== "object") {
    return { ok: false, errors: ["Корень JSON должен быть объектом"] };
  }
  const o = /** @type {Record<string, unknown>} */ (data);
  for (const k of REQUIRED_TOP) {
    if (!(k in o)) errors.push(`Отсутствует поле: ${k}`);
  }
  if (!Number.isInteger(o.version) || o.version < 1) errors.push("version должен быть целым числом >= 1");
  if (o.site == null || typeof o.site !== "object") errors.push("site должен быть объектом");
  else {
    const site = /** @type {Record<string, unknown>} */ (o.site);
    if (typeof site.primaryDomain !== "string" || !site.primaryDomain.trim()) {
      errors.push("site.primaryDomain обязателен (строка)");
    }
  }
  if (!Array.isArray(o.queries) || o.queries.length === 0) {
    errors.push("queries должен быть непустым массивом");
  } else {
    o.queries.forEach((q, i) => {
      if (q == null || typeof q !== "object") {
        errors.push(`queries[${i}]: ожидается объект`);
        return;
      }
      const row = /** @type {Record<string, unknown>} */ (q);
      if (typeof row.query !== "string" || !row.query.trim()) errors.push(`queries[${i}].query обязателен`);
      if (typeof row.cluster !== "string" || !row.cluster.trim()) errors.push(`queries[${i}].cluster обязателен`);
      if (!Number.isInteger(row.priority) || row.priority < 1 || row.priority > 5) {
        errors.push(`queries[${i}].priority должен быть целым 1..5`);
      }
      const extra = Object.keys(row).filter((k) => !["query", "cluster", "priority", "targetUrl", "notes"].includes(k));
      if (extra.length) errors.push(`queries[${i}]: неизвестные поля: ${extra.join(", ")}`);
    });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, data };
}

/**
 * @param {string} filePath
 */
export function loadSemanticCore(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON parse error in ${abs}: ${/** @type {Error} */ (e).message}`);
  }
  const v = validateSemanticCore(data);
  if (!v.ok) throw new Error(`${abs}:\n${v.errors.join("\n")}`);
  return /** @type {object} */ (v.data);
}

/**
 * @param {{ queries: Array<{ query: string }> }} core
 * @returns {Map<string, { query: string, cluster: string, priority: number }>}
 */
export function coreQueriesByNormalizedKey(core) {
  const map = new Map();
  for (const q of core.queries) {
    const k = normalizeQueryForJoin(q.query);
    if (!k) continue;
    map.set(k, q);
  }
  return map;
}
