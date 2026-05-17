import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSerpCampaign } from "./serp-campaigns.mjs";
import { ORGANIC_TARGET, isDeniedSerpHost } from "./serp-shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function poolsFileForCampaign() {
  const fixture = getSerpCampaign().poolsFixture;
  return path.join(__dirname, "..", "fixtures", fixture);
}

/** @param {string} url */
function toResult(url, position) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
  if (isDeniedSerpHost(host)) return null;
  return {
    position,
    title: host,
    url,
    displayDomain: host,
    snippet: "",
    source: "curated-baseline",
  };
}

/**
 * @param {string} queryId
 * @param {'yandex' | 'google'} engine
 * @param {'moscow' | 'spb'} regionId
 */
export function poolKeyFor(queryId, engine, regionId) {
  if (engine === "google") return `google__${regionId}`;
  return `${queryId}__${regionId}`;
}

/**
 * @param {string} queryId
 * @param {'yandex' | 'google'} engine
 * @param {'moscow' | 'spb'} regionId
 */
export function baselineOrganicResults(queryId, engine, regionId) {
  const raw = JSON.parse(fs.readFileSync(poolsFileForCampaign(), "utf8"));
  const key = poolKeyFor(queryId, engine, regionId);
  const list = raw.pools[key] || raw.pools[`${queryId}__${regionId}`] || [];
  /** @type {ReturnType<typeof toResult>[]} */
  const out = [];
  const seen = new Set();
  for (const url of list) {
    const item = toResult(url, out.length + 1);
    if (!item) continue;
    const dedupe = new URL(item.url).hostname + new URL(item.url).pathname;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(item);
    if (out.length >= ORGANIC_TARGET) break;
  }
  return out;
}
