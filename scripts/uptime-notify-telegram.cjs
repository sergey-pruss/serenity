#!/usr/bin/env node
/**
 * Мониторинг доступности Serenity → Telegram при смене статуса (up/down).
 * Локально: UPTIME_DRY_RUN=1 node scripts/uptime-notify-telegram.cjs
 * Секреты: DEPLOY_NOTIFY_TELEGRAM_* (как deploy-notify / PR workflow).
 */
const fs = require("fs");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const STATE_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_REMIND_HOURS = 6;

/** @type {{ id: string, label: string, kind: "http" | "tcp", url?: string, host?: string, port?: number }[]} */
const TARGETS = [
  {
    id: "prod",
    label: "serenity.agency (prod)",
    kind: "http",
    url: "https://serenity.agency/",
  },
  {
    id: "static",
    label: "static.serenity.agency (CDN → origin)",
    kind: "http",
    url: "https://static.serenity.agency/",
  },
  {
    id: "origin443",
    label: "origin 168.222.142.141:443",
    kind: "tcp",
    host: "168.222.142.141",
    port: 443,
  },
];

function loadEnvFiles() {
  for (const rel of [
    "secrets/deploy-notify.env",
    "scripts/deploy-notify.env",
    path.join(process.env.HOME || "", ".config/serenity/deploy-notify.env"),
  ]) {
    const p = rel.startsWith("/") || rel.includes(".config/") ? rel : path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] == null) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function statePath() {
  return process.env.UPTIME_STATE_FILE || path.join(root, "tmp", "uptime-state.json");
}

function readState() {
  const file = statePath();
  if (!fs.existsSync(file)) {
    return { version: STATE_VERSION, targets: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data || typeof data !== "object") throw new Error("invalid state");
    data.targets = data.targets && typeof data.targets === "object" ? data.targets : {};
    return data;
  } catch (e) {
    console.warn("uptime-notify: не удалось прочитать state, начинаем заново:", e.message);
    return { version: STATE_VERSION, targets: {} };
  }
}

function writeState(state) {
  const file = statePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function timeoutMs() {
  const n = Number(process.env.UPTIME_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function remindHours() {
  const n = Number(process.env.UPTIME_REMIND_HOURS ?? DEFAULT_REMIND_HOURS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REMIND_HOURS;
}

function checkTcp(host, port, ms) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, detail });
    };
    socket.setTimeout(ms);
    socket.once("connect", () => finish(true, "TCP connect OK"));
    socket.once("timeout", () => finish(false, `TCP timeout ${ms} ms`));
    socket.once("error", (err) => finish(false, err.message || "TCP error"));
    socket.connect(port, host);
  });
}

async function checkHttp(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "SerenityUptime/1.0 (+https://serenity.agency)" },
    });
    if (res.status === 504) {
      return { ok: false, detail: `HTTP ${res.status} (origin недоступен)` };
    }
    if (res.status >= 200 && res.status < 400) {
      return { ok: true, detail: `HTTP ${res.status}` };
    }
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (e) {
    const msg =
      e && e.name === "AbortError"
        ? `timeout ${ms} ms`
        : e && e.cause && e.cause.code
          ? e.cause.code
          : e && e.message
            ? e.message
            : "fetch error";
    return { ok: false, detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function checkTarget(target) {
  const ms = timeoutMs();
  if (target.kind === "http") {
    return checkHttp(target.url, ms);
  }
  return checkTcp(target.host, target.port, ms);
}

function prevStatus(state, id) {
  const entry = state.targets[id];
  return entry && entry.status === "down" ? "down" : "up";
}

function shouldAlert(prev, next, lastAlertAt, now) {
  if (prev !== next) return true;
  if (next !== "down") return false;
  if (!lastAlertAt) return true;
  const last = Date.parse(lastAlertAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= remindHours() * 60 * 60 * 1000;
}

function buildMessage(kind, items, nowIso) {
  const lines = [];
  if (kind === "down") {
    lines.push("🔴 <b>Serenity — сбой мониторинга</b>");
  } else if (kind === "recovery") {
    lines.push("🟢 <b>Serenity — сервис восстановлен</b>");
  } else {
    lines.push("⚠️ <b>Serenity — напоминание: проблема не устранена</b>");
  }
  lines.push("");
  for (const item of items) {
    lines.push(`• <b>${escapeHtml(item.label)}</b>`);
    lines.push(`  ${escapeHtml(item.detail)}`);
  }
  lines.push("");
  lines.push(`Проверка: <code>${escapeHtml(nowIso)}</code> UTC`);
  return lines.join("\n");
}

async function sendTelegram(text) {
  const token = process.env.DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.DEPLOY_NOTIFY_TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("uptime-notify: нет DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN / CHAT_ID — пропуск отправки");
    return false;
  }
  if (process.env.UPTIME_DRY_RUN === "1") {
    console.log("--- UPTIME_DRY_RUN ---\n" + text.replace(/<[^>]+>/g, "") + "\n---");
    return true;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const body = await res.json();
  if (!body.ok) {
    console.error("uptime-notify: Telegram API error:", body);
    process.exit(1);
  }
  console.log("uptime-notify: сообщение отправлено в Telegram");
  return true;
}

async function main() {
  loadEnvFiles();
  const now = new Date();
  const nowIso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const state = readState();
  state.version = STATE_VERSION;

  /** @type {{ target: typeof TARGETS[0], ok: boolean, detail: string, status: "up"|"down" }[]} */
  const results = [];
  for (const target of TARGETS) {
    const result = await checkTarget(target);
    results.push({
      target,
      ok: result.ok,
      detail: result.detail,
      status: result.ok ? "up" : "down",
    });
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${target.label}: ${result.detail}`);
  }

  const downAlerts = [];
  const recoveryAlerts = [];
  const remindAlerts = [];

  for (const row of results) {
    const id = row.target.id;
    const prev = prevStatus(state, id);
    const next = row.status;
    const entry = state.targets[id] || {};
    const lastAlertAt = entry.lastAlertAt || null;

    if (shouldAlert(prev, next, lastAlertAt, now.getTime())) {
      const item = { label: row.target.label, detail: row.detail };
      if (prev === "up" && next === "down") downAlerts.push(item);
      else if (prev === "down" && next === "up") recoveryAlerts.push(item);
      else if (next === "down") remindAlerts.push(item);

      if (prev !== next || next === "down") {
        entry.lastAlertAt = nowIso;
      }
    }

    entry.status = next;
    entry.detail = row.detail;
    entry.checkedAt = nowIso;
    if (next === "down" && !entry.downSince) entry.downSince = nowIso;
    if (next === "up") entry.downSince = null;
    state.targets[id] = entry;
  }

  writeState(state);

  if (downAlerts.length) {
    await sendTelegram(buildMessage("down", downAlerts, nowIso));
  }
  if (recoveryAlerts.length) {
    await sendTelegram(buildMessage("recovery", recoveryAlerts, nowIso));
  }
  if (remindAlerts.length) {
    await sendTelegram(buildMessage("remind", remindAlerts, nowIso));
  }

  if (!downAlerts.length && !recoveryAlerts.length && !remindAlerts.length) {
    console.log("uptime-notify: статус без изменений, уведомление не требуется");
  }

  const anyDown = results.some((r) => !r.ok);
  process.exit(anyDown ? 1 : 0);
}

main().catch((e) => {
  console.error("uptime-notify:", e);
  process.exit(1);
});
