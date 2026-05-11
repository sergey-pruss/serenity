#!/usr/bin/env node
/**
 * HEAD (или GET при отсутствии HEAD) первых K URL из локального sitemap.xml на прод-ориджине.
 * Включается переменной окружения SITEMAP_HEAD_SAMPLE_K — без неё скрипт выходит 0 без проверок.
 *
 * SITEMAP_HEAD_BASE_URL — по умолчанию https://serenity.agency
 * SITEMAP_HEAD_METHOD — GET (по умолчанию; надёжнее за прокси) или HEAD
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parseLocs(xml) {
  const re = /<loc>([^<]+)<\/loc>/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const u = m[1].trim();
    if (u) out.push(u);
  }
  return out;
}

async function checkUrl(url, method) {
  const init = { method, redirect: "follow" };
  const res = await fetch(url, init);
  const status = res.status;
  assert(status >= 200 && status < 400, `${url}: HTTP ${status} (${method})`);
  if (method === "GET") await res.arrayBuffer();
}

export async function runSitemapHeadSample() {
  const k = Number.parseInt(process.env.SITEMAP_HEAD_SAMPLE_K || "0", 10);
  if (!Number.isFinite(k) || k <= 0) {
    console.log("verify-prod-sitemap-sample-head: пропуск (задайте SITEMAP_HEAD_SAMPLE_K>0)");
    return;
  }

  const base = (process.env.SITEMAP_HEAD_BASE_URL || "https://serenity.agency").replace(/\/$/, "");
  const method = (process.env.SITEMAP_HEAD_METHOD || "GET").toUpperCase() === "HEAD" ? "HEAD" : "GET";

  const sitemapPath = path.join(__dirname, "..", "sitemap.xml");
  const xml = fs.readFileSync(sitemapPath, "utf8");
  const locs = parseLocs(xml);
  assert(locs.length > 0, "sitemap.xml: нет <loc>");

  const sample = locs.slice(0, k);
  for (const loc of sample) {
    const u = new URL(loc);
    assert(
      u.origin === "https://serenity.agency",
      `Ожидался только serenity.agency в sitemap для прод-проверки: ${loc}`,
    );
    const pathQuery = u.pathname + u.search;
    const target = base + pathQuery;
    await checkUrl(target, method);
    console.log(`OK ${method} ${target}`);
  }
  console.log(`verify-prod-sitemap-sample-head: OK (${sample.length} URL)`);
}

const isMain = process.argv[1]?.endsWith("verify-prod-sitemap-sample-head.mjs");
if (isMain) {
  runSitemapHeadSample().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}
