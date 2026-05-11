#!/usr/bin/env node
/**
 * Классификация URL из экспорта GSC (CSV/TSV: одна колонка URL или первая колонка — URL).
 *
 * node scripts/seo/gsc-url-triage.mjs путь/к/export.csv
 * или: GSC_TRIAGE_CSV=... node scripts/seo/gsc-url-triage.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

function locVariants(loc) {
  const out = new Set([loc.trim()]);
  try {
    const u = new URL(loc.trim());
    const p = u.pathname;
    if (p !== "/" && p.endsWith("/")) {
      u.pathname = p.replace(/\/+$/, "") || "/";
      out.add(u.href);
    } else if (p !== "/" && !p.endsWith("/")) {
      u.pathname = `${p}/`;
      out.add(u.href);
    }
  } catch {
    /* ignore */
  }
  return out;
}

function loadSitemapLocs() {
  const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const re = /<loc>([^<]+)<\/loc>/g;
  const set = new Set();
  let m;
  while ((m = re.exec(xml))) {
    for (const v of locVariants(m[1])) set.add(v);
  }
  return set;
}

/** Упрощённо по nginx/routing.conf map $uri $is_new_page */
function routingGuess(pathname) {
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p === "" || p === "/") return "new";
  if (p === "/robots.txt" || p === "/sitemap.xml") return "new";
  if (p === "/case/all" || /^\/case\/all\/\d+$/.test(p)) return "new";
  if (/^\/case\/all\/category\/[^/]+$/.test(p)) return "new";
  if (/^\/case\/all\/category\/[^/]+\/\d+$/.test(p)) return "new";
  if (p.startsWith("/docs")) return "new";
  if (p.startsWith("/blog")) return "new";
  return "legacy";
}

function robotsLikelyBlock(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return "invalid_url";
  }
  const path = u.pathname;
  const full = u.pathname + u.search;
  if (path.startsWith("/docs") || path.startsWith("/docs/")) return "yes_docs";
  if (u.search && u.search !== "?") return "maybe_query_disallow";
  if (/\/feed\/?$/i.test(path) || /\/rss\/?$/i.test(path) || /\/embed\/?$/i.test(path)) return "maybe_feed_embed";
  if (path.startsWith("/author/") || path.startsWith("/users/") || path.startsWith("/nova/")) return "yes_path_rule";
  if (path.includes("/wp-") || path.startsWith("/wp/")) return "yes_wp";
  return "no_or_unknown";
}

function extractUrlsFromLine(line) {
  const t = line.trim();
  if (!t || t.startsWith("#")) return [];
  if (t.startsWith("http://") || t.startsWith("https://")) {
    const firstField = t.split(/[\t;,]/)[0].trim();
    if (firstField.startsWith("http")) return [firstField];
  }
  const parts = t.split(/[\t,;]/).map((s) => s.trim().replace(/^"+|"+$/g, ""));
  for (const p of parts) {
    if (p.startsWith("http://") || p.startsWith("https://")) return [p];
  }
  return [];
}

function readUrlsFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const urls = [];
  for (const line of raw.split(/\r?\n/)) {
    for (const u of extractUrlsFromLine(line)) urls.push(u);
  }
  return [...new Set(urls)];
}

function main() {
  const csvPath = process.argv[2] || process.env.GSC_TRIAGE_CSV;
  if (!csvPath) {
    console.error("Укажите путь к CSV: node scripts/seo/gsc-url-triage.mjs /path/to.csv");
    process.exit(1);
  }
  const resolved = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);
  if (!fs.existsSync(resolved)) {
    console.error("Файл не найден:", resolved);
    process.exit(1);
  }

  const sitemap = loadSitemapLocs();
  const urls = readUrlsFromFile(resolved);
  if (!urls.length) {
    console.error("В файле не найдено URL (ожидаются строки с https://…).");
    process.exit(1);
  }

  console.log(["url", "pathname", "in_sitemap", "robots_guess", "routing_new_or_legacy"].join("\t"));
  for (const url of urls) {
    let pathname = "";
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = "?";
    }
    const inSm = sitemap.has(url) ? "yes" : "no";
    const rg = robotsLikelyBlock(url);
    const rt = pathname === "?" ? "?" : routingGuess(pathname);
    console.log([url, pathname, inSm, rg, rt].join("\t"));
  }
  console.error(`OK: разбор ${urls.length} URL → stdout (TSV)`);
}

main();
