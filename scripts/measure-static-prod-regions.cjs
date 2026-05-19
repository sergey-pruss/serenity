#!/usr/bin/env node
/**
 * Замер static/prod из текущей сетевой точки.
 *
 * Запускайте этот скрипт на VPS/машинах в нужных регионах России: регион в отчете
 * описывает место запуска, а не настройку браузера или поисковика.
 *
 * REGION_LABEL="Москва" MEASURE_POINT="ru-msk-1" npm run measure:static-prod
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_URLS = [
  "https://static.serenity.agency/",
  "https://serenity.agency/",
  "https://static.serenity.agency/targeting",
  "https://serenity.agency/targeting",
  "https://static.serenity.agency/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424",
  "https://serenity.agency/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424",
];

const CURL_FMT_KEYS = [
  "http_code",
  "time_namelookup",
  "time_connect",
  "time_appconnect",
  "time_starttransfer",
  "time_total",
  "size_download",
  "num_redirects",
  "remote_ip",
  "url_effective",
];

const CURL_FMT = CURL_FMT_KEYS.map((key) => `%{${key}}`).join("|MEASURE|");

function envInt(name, fallback, min = 0) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`${name} должен быть целым числом >= ${min}`);
  }
  return value;
}

function splitCsvEnv(name, fallback) {
  const raw = process.env[name];
  return (raw ? raw.split(",") : fallback)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifySurface(url) {
  const host = new URL(url).hostname;
  if (host === "static.serenity.agency") return "static";
  if (host === "serenity.agency") return "prod";
  if (host === "serenity.sergeyprus.workers.dev") return "worker";
  return host;
}

function classifyKind(url) {
  const u = new URL(url);
  if (u.pathname.startsWith("/_sa/")) return "asset";
  if (u.pathname === "/" || u.pathname.endsWith("/")) return "html";
  return "html";
}

function ms(secString) {
  const n = Number(secString);
  return Number.isFinite(n) ? Math.round(n * 1000) : null;
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const headers = [
    "timestamp",
    "point",
    "region",
    "round",
    "surface",
    "kind",
    "url",
    "final_url",
    "http_code",
    "dns_ms",
    "connect_ms",
    "tls_ms",
    "ttfb_ms",
    "total_ms",
    "size_bytes",
    "redirects",
    "remote_ip",
    "cache_status",
    "cache_host",
    "age",
    "cache_control",
    "error",
  ];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\n") + "\n";
}

function parseHeaders(raw) {
  const blocks = raw
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const last = blocks[blocks.length - 1] || "";
  const headers = {};
  for (const line of last.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (headers[name]) headers[name] += `, ${value}`;
    else headers[name] = value;
  }
  return headers;
}

function fixtureMeasure(url, round, startedAt) {
  const surface = classifySurface(url);
  const kind = classifyKind(url);
  const base = surface === "static" ? 120 : 180;
  const assetBonus = kind === "asset" ? -30 : 0;
  return {
    timestamp: startedAt,
    round,
    surface,
    kind,
    url,
    final_url: url,
    http_code: 200,
    dns_ms: 3,
    connect_ms: base + assetBonus,
    tls_ms: base + 80 + assetBonus,
    ttfb_ms: base + 160 + assetBonus + round,
    total_ms: base + 420 + assetBonus + round,
    size_bytes: kind === "asset" ? 994556 : 188522,
    redirects: 0,
    remote_ip: surface === "static" ? "203.0.113.10" : "203.0.113.20",
    cache_status: surface === "static" ? (round === 1 ? "MISS" : "HIT") : "",
    cache_host: surface === "static" ? "fixture-yccdn.example" : "",
    age: surface === "static" && round > 1 ? "10" : "",
    cache_control: kind === "asset" ? "public, max-age=31536000, immutable" : "no-cache",
    error: "",
  };
}

function curlMeasure(url, round, startedAt, maxTimeSec, userAgent) {
  const headerDir = fs.mkdtempSync(path.join(os.tmpdir(), "serenity-measure-"));
  const headerPath = path.join(headerDir, "headers.txt");
  try {
    const args = [
      "-sS",
      "-L",
      "--max-time",
      String(maxTimeSec),
      "-A",
      userAgent,
      "-D",
      headerPath,
      "-o",
      "/dev/null",
      "-w",
      CURL_FMT,
      url,
    ];
    const res = spawnSync("curl", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      throw new Error((res.stderr || res.stdout || `curl exited ${res.status}`).trim());
    }

    const parts = res.stdout.trim().split("|MEASURE|");
    const data = Object.fromEntries(CURL_FMT_KEYS.map((key, i) => [key, parts[i] || ""]));
    const headers = parseHeaders(fs.readFileSync(headerPath, "utf8"));
    return {
      timestamp: startedAt,
      round,
      surface: classifySurface(url),
      kind: classifyKind(url),
      url,
      final_url: data.url_effective || url,
      http_code: Number(data.http_code) || 0,
      dns_ms: ms(data.time_namelookup),
      connect_ms: ms(data.time_connect),
      tls_ms: ms(data.time_appconnect),
      ttfb_ms: ms(data.time_starttransfer),
      total_ms: ms(data.time_total),
      size_bytes: Number(data.size_download) || 0,
      redirects: Number(data.num_redirects) || 0,
      remote_ip: data.remote_ip || "",
      cache_status: headers["cache-status"] || headers["x-cache"] || headers["cf-cache-status"] || "",
      cache_host: headers["cache-host"] || "",
      age: headers.age || "",
      cache_control: headers["cache-control"] || "",
      error: "",
    };
  } finally {
    fs.rmSync(headerDir, { recursive: true, force: true });
  }
}

function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.surface}|${row.kind}|${row.url}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map((items) => {
    const okItems = items.filter((row) => !row.error && row.total_ms !== null);
    const totals = okItems.map((row) => row.total_ms).sort((a, b) => a - b);
    const ttfbs = okItems.map((row) => row.ttfb_ms).filter((n) => n !== null).sort((a, b) => a - b);
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((sum, n) => sum + n, 0) / arr.length) : null);
    const pct = (arr, p) => {
      if (!arr.length) return null;
      const idx = Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1);
      return arr[idx];
    };
    return {
      surface: items[0].surface,
      kind: items[0].kind,
      url: items[0].url,
      samples: items.length,
      ok_samples: okItems.length,
      http_codes: [...new Set(items.map((row) => row.http_code).filter(Boolean))].join("|"),
      avg_ttfb_ms: avg(ttfbs),
      p50_ttfb_ms: pct(ttfbs, 50),
      p95_ttfb_ms: pct(ttfbs, 95),
      avg_total_ms: avg(totals),
      p50_total_ms: pct(totals, 50),
      p95_total_ms: pct(totals, 95),
      cache_statuses: [...new Set(items.map((row) => row.cache_status).filter(Boolean))].join("|"),
      cache_hosts: [...new Set(items.map((row) => row.cache_host).filter(Boolean))].join("|"),
      errors: items.filter((row) => row.error).length,
    };
  });
}

function summaryCsv(rows) {
  const headers = [
    "surface",
    "kind",
    "url",
    "samples",
    "ok_samples",
    "http_codes",
    "avg_ttfb_ms",
    "p50_ttfb_ms",
    "p95_ttfb_ms",
    "avg_total_ms",
    "p50_total_ms",
    "p95_total_ms",
    "cache_statuses",
    "cache_hosts",
    "errors",
  ];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\n") + "\n";
}

function sleep(msValue) {
  return new Promise((resolve) => setTimeout(resolve, msValue));
}

async function main() {
  const urls = splitCsvEnv("MEASURE_URLS", DEFAULT_URLS);
  const rounds = envInt("MEASURE_ROUNDS", 10, 1);
  const gapSec = envInt("MEASURE_GAP_SEC", 30, 0);
  const maxTimeSec = envInt("MEASURE_MAX_TIME_SEC", 60, 1);
  const point = process.env.MEASURE_POINT || os.hostname();
  const region = process.env.REGION_LABEL || process.env.MEASURE_REGION || "unknown";
  const outDir = process.env.MEASURE_OUT_DIR || path.join("artifacts", "perf", "static-prod");
  const userAgent = process.env.MEASURE_USER_AGENT || "SerenityStaticProdMeasure/1.0";
  const useFixture = process.env.MEASURE_FIXTURE === "1";
  const startedSlug = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${startedSlug}-${point.replace(/[^a-z0-9._-]+/gi, "_")}`;
  const rows = [];

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Точка: ${point}; регион: ${region}`);
  console.log(`Раундов: ${rounds}; пауза: ${gapSec} с; URL: ${urls.length}`);
  console.log(`Вывод: ${outDir}`);

  for (let round = 1; round <= rounds; round += 1) {
    console.log(`\n--- Раунд ${round}/${rounds} ---`);
    for (const url of urls) {
      const startedAt = new Date().toISOString();
      let row;
      try {
        row = useFixture
          ? fixtureMeasure(url, round, startedAt)
          : curlMeasure(url, round, startedAt, maxTimeSec, userAgent);
      } catch (err) {
        row = {
          timestamp: startedAt,
          round,
          surface: classifySurface(url),
          kind: classifyKind(url),
          url,
          final_url: "",
          http_code: 0,
          dns_ms: null,
          connect_ms: null,
          tls_ms: null,
          ttfb_ms: null,
          total_ms: null,
          size_bytes: 0,
          redirects: 0,
          remote_ip: "",
          cache_status: "",
          cache_host: "",
          age: "",
          cache_control: "",
          error: err instanceof Error ? err.message : String(err),
        };
      }
      row.point = point;
      row.region = region;
      rows.push(row);
      const status = row.error ? `FAIL ${row.error}` : `HTTP ${row.http_code}`;
      const cache = row.cache_status ? ` | cache ${row.cache_status}` : "";
      console.log(`${row.surface.padEnd(6)} ${row.kind.padEnd(5)} ${status} | TTFB ${row.ttfb_ms ?? "-"} ms | total ${row.total_ms ?? "-"} ms${cache}`);
    }
    if (round < rounds && gapSec > 0) await sleep(gapSec * 1000);
  }

  const summary = summarize(rows);
  const jsonPath = path.join(outDir, `${baseName}.json`);
  const csvPath = path.join(outDir, `${baseName}.csv`);
  const summaryPath = path.join(outDir, `${baseName}.summary.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify({ point, region, urls, rounds, gapSec, rows, summary }, null, 2));
  fs.writeFileSync(csvPath, toCsv(rows));
  fs.writeFileSync(summaryPath, summaryCsv(summary));

  console.log("\n========== Сводка ==========");
  for (const item of summary) {
    console.log(
      `${item.surface.padEnd(6)} ${item.kind.padEnd(5)} avg TTFB ${item.avg_ttfb_ms ?? "-"} ms | avg total ${item.avg_total_ms ?? "-"} ms | cache ${item.cache_statuses || "-"}`,
    );
  }
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Summary CSV: ${summaryPath}`);

  if (rows.some((row) => row.error)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
