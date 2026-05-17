#!/usr/bin/env node
/**
 * Аудит посадочных из SERP-снимка + страница Serenity.
 * Вход: artifacts/seo/kontekstnaya-serp-snapshots-*.json
 * Выход: artifacts/seo/kontekstnaya-serp-audit-*.json
 */
import fs from "node:fs";
import path from "node:path";
import { getSerpCampaign } from "./lib/serp-campaigns.mjs";
import { ARTIFACTS_DIR } from "./lib/serp-shared.mjs";

const campaign = getSerpCampaign();
const SERENITY_URL = campaign.serenityUrl;
import { fetchAndAudit } from "./lib/landing-content-audit.mjs";
import { isSerpJunkUrl, sanitizeSerpResults } from "./lib/serp-url-filter.mjs";

const CONCURRENCY = Number(process.env.SERP_AUDIT_CONCURRENCY || "4");
const DELAY_MS = Number(process.env.SERP_AUDIT_DELAY_MS || "400");

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<void>} fn
 */
async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
      await sleep(DELAY_MS);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const snapPath = campaign.snapshotsPath();
  if (!fs.existsSync(snapPath)) {
    console.error("Нет SERP-снимка:", snapPath, "\nСначала: node scripts/seo/fetch-regional-serp.mjs");
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  let junkDropped = 0;
  for (const block of Object.values(snapshot.matrix || {})) {
    const before = (block.results || []).length;
    block.results = sanitizeSerpResults(block.results);
    junkDropped += before - block.results.length;
  }
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2), "utf8");
  if (junkDropped) console.log(`SERP: удалено служебных URL (yabs и т.п.): ${junkDropped}`);

  /** @type {Set<string>} */
  const urls = new Set([SERENITY_URL]);
  for (const block of Object.values(snapshot.matrix || {})) {
    for (const r of block.results || []) {
      if (r.url && !isSerpJunkUrl(r.url)) urls.add(r.url);
    }
  }

  console.log(`Аудит: ${urls.size} URL (включая Serenity)`);

  /** @type {Record<string, import('./lib/landing-content-audit.mjs').auditLandingHtml extends (...args: any) => infer R ? R : never>} */
  const auditsByUrl = {};

  const list = [...urls];
  let done = 0;
  await pool(list, CONCURRENCY, async (url) => {
    const audit = await fetchAndAudit(url);
    auditsByUrl[url] = audit;
    done++;
    if (done % 10 === 0 || done === list.length) {
      console.log(`  ${done}/${list.length}`);
    }
  });

  /** @type {Record<string, { serenity: unknown; competitors: unknown[]; comparison: unknown }>} */
  const byMatrix = {};

  for (const [key, block] of Object.entries(snapshot.matrix || {})) {
    const competitors = (block.results || []).map((r) => ({
      ...r,
      audit: auditsByUrl[r.url] || null,
    }));
    const serenity = auditsByUrl[SERENITY_URL];
    byMatrix[key] = {
      ...block,
      serenityAudit: serenity,
      competitors,
    };
  }

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const out = {
    snapshotDate: snapshot.snapshotDate,
    snapshotDateIso: snapshot.snapshotDateIso,
    serpMethod: snapshot.method,
    serenityUrl: SERENITY_URL,
    serenityAudit: auditsByUrl[SERENITY_URL],
    auditsByUrl,
    matrix: byMatrix,
    auditedAt: new Date().toISOString(),
  };

  const outPath = campaign.auditPath();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Аудит: записано", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
