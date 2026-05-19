#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "serenity-static-prod-measure-test-"));

try {
  const res = spawnSync(
    process.execPath,
    ["scripts/measure-static-prod-regions.cjs"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        MEASURE_FIXTURE: "1",
        MEASURE_ROUNDS: "2",
        MEASURE_GAP_SEC: "0",
        MEASURE_POINT: "test-point",
        REGION_LABEL: "Тестовый регион",
        MEASURE_OUT_DIR: outDir,
      },
      maxBuffer: 1024 * 1024,
    },
  );

  assert(res.status === 0, `measure script failed:\n${res.stdout}\n${res.stderr}`);

  const files = fs.readdirSync(outDir);
  const jsonFile = files.find((name) => name.endsWith(".json"));
  const csvFile = files.find((name) => name.endsWith(".csv") && !name.endsWith(".summary.csv"));
  const summaryFile = files.find((name) => name.endsWith(".summary.csv"));
  assert(jsonFile, "JSON output was not created");
  assert(csvFile, "CSV output was not created");
  assert(summaryFile, "summary CSV output was not created");

  const report = JSON.parse(fs.readFileSync(path.join(outDir, jsonFile), "utf8"));
  assert(report.point === "test-point", "point label was not preserved");
  assert(report.region === "Тестовый регион", "region label was not preserved");
  assert(report.rows.length === 12, `expected 12 rows, got ${report.rows.length}`);
  assert(report.summary.length === 6, `expected 6 summary rows, got ${report.summary.length}`);
  assert(report.rows.some((row) => row.surface === "static" && row.cache_status === "HIT"), "static HIT row missing");
  assert(report.rows.some((row) => row.surface === "prod" && row.cache_status === ""), "prod non-CDN row missing");

  const csv = fs.readFileSync(path.join(outDir, csvFile), "utf8");
  assert(csv.includes("cache_status"), "CSV header misses cache_status");
  assert(csv.includes("fixture-yccdn.example"), "CSV misses cache host");

  const summary = fs.readFileSync(path.join(outDir, summaryFile), "utf8");
  assert(summary.includes("avg_ttfb_ms"), "summary CSV header misses avg_ttfb_ms");
  assert(summary.includes("MISS|HIT"), "summary CSV misses cache status aggregation");

  console.log("OK: static/prod measure contract");
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
