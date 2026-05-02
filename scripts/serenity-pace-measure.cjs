#!/usr/bin/env node
/**
 * Серии замеров: N раундов с паузой между раундами.
 * Метрики curl (секунды → мс в выводе): DNS, connect, TLS, TTFB, полное время ответа.
 *
 * MEASURE_URLS — через запятую (по умолчанию три URL из задачи)
 * MEASURE_ROUNDS=10  MEASURE_GAP_SEC=300
 */
const { execFileSync } = require("child_process");

const URLS = (process.env.MEASURE_URLS ||
  "https://serenity.agency/,https://static.serenity.agency/,https://serenity.agency/services")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ROUNDS = Math.max(1, parseInt(process.env.MEASURE_ROUNDS || "10", 10) || 10);
const GAP_SEC = Math.max(0, parseInt(process.env.MEASURE_GAP_SEC || String(5 * 60), 10) || 0);
const CURL_MAX = 120;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function curlMeasure(url) {
  const fmt = [
    "%{http_code}",
    "%{time_namelookup}",
    "%{time_connect}",
    "%{time_appconnect}",
    "%{time_pretransfer}",
    "%{time_starttransfer}",
    "%{time_total}",
  ].join("|");
  const out = execFileSync(
    "curl",
    ["-sS", "-o", "/dev/null", "-L", "--max-time", String(CURL_MAX), "-w", fmt, url],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  const p = out.trim().split("|");
  const sec = (x) => Math.round(Number(x) * 1000);
  return {
    http: Number(p[0]),
    dns_ms: sec(p[1]),
    connect_ms: sec(p[2]),
    tls_ms: sec(p[3]),
    ttfb_ms: sec(p[5]),
    total_ms: sec(p[6]),
  };
}

function mean(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

async function main() {
  const started = new Date().toISOString();
  console.log(`Старт: ${started}`);
  console.log(`Раундов: ${ROUNDS}, пауза между раундами: ${GAP_SEC} с`);
  console.log(`URL: ${URLS.join(" | ")}`);
  console.log("Примечание: географию источника смотрите по IP машины, с которой запущен скрипт.\n");

  /** @type {Record<string, { total_ms: number[], ttfb_ms: number[], http: number[] }>} */
  const acc = {};
  for (const u of URLS) acc[u] = { total_ms: [], ttfb_ms: [], http: [] };

  const rows = [];

  for (let r = 1; r <= ROUNDS; r++) {
    const tRound = new Date().toISOString();
    console.log(`--- Раунд ${r}/${ROUNDS} (${tRound}) ---`);
    for (const url of URLS) {
      try {
        const m = curlMeasure(url);
        acc[url].total_ms.push(m.total_ms);
        acc[url].ttfb_ms.push(m.ttfb_ms);
        acc[url].http.push(m.http);
        rows.push({ round: r, url, ...m });
        console.log(
          `  ${url}\n    HTTP ${m.http} | TTFB ${m.ttfb_ms} ms | total ${m.total_ms} ms | DNS ${m.dns_ms} ms | TLS+… ${m.tls_ms} ms`,
        );
      } catch (e) {
        console.error(`  FAIL ${url}: ${e.message}`);
        rows.push({ round: r, url, error: String(e.message) });
      }
    }
    if (r < ROUNDS && GAP_SEC > 0) {
      console.log(`Пауза ${GAP_SEC} с до следующего раунда…\n`);
      await delay(GAP_SEC * 1000);
    }
  }

  console.log("\n========== СВОДКА ==========\n");
  console.log("| URL | Среднее total (ms) | Среднее TTFB (ms) | Мин total | Макс total | HTTP всегда 200 |");
  console.log("|-----|-------------------:|------------------:|----------:|-----------:|-----------------|");
  for (const url of URLS) {
    const a = acc[url];
    const n = a.total_ms.length;
    const minT = n ? Math.min(...a.total_ms) : 0;
    const maxT = n ? Math.max(...a.total_ms) : 0;
    const ok = n && a.http.every((h) => h === 200);
    console.log(
      `| ${url.replace(/\|/g, "\\|")} | ${mean(a.total_ms)} | ${mean(a.ttfb_ms)} | ${minT} | ${maxT} | ${ok ? "да" : "нет"} |`,
    );
  }

  console.log(`\nЗавершено: ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
