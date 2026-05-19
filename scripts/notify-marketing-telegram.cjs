#!/usr/bin/env node
/**
 * Уведомление в Telegram о готовности /services/marketing (локальная сборка).
 * Секреты: secrets/deploy-notify.env (DEPLOY_NOTIFY_TELEGRAM_*)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");

function loadEnv() {
  for (const rel of ["secrets/deploy-notify.env", "scripts/deploy-notify.env"]) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return;
  }
}

function gitLine() {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: root, encoding: "utf8" }).trim();
    const sha = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
    return `${branch} @ ${sha}`;
  } catch {
    return "";
  }
}

async function main() {
  loadEnv();
  const token = process.env.DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.DEPLOY_NOTIFY_TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("notify-marketing-telegram: нет DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN / CHAT_ID в secrets/deploy-notify.env");
    process.exit(1);
  }
  const git = gitLine();
  const text = [
    "<b>Serenity — /services/marketing</b>",
    "Страница переведена на статичный стиль (parity с kontekst/targeting).",
    "5 визуальных итераций пройдены.",
    "",
    "Локально: <code>npm run dev</code> → /services/marketing",
    git ? `Git: <code>${git}</code>` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
    console.error("notify-marketing-telegram:", body);
    process.exit(1);
  }
  console.log("notify-marketing-telegram: отправлено");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
