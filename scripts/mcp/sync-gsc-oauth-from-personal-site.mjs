#!/usr/bin/env node
/**
 * Копирует OAuth Desktop JSON для GSC MCP из пути, указанного в
 * ~/Documents/GitHub/sergey-pruss.github.io/.cursor/mcp.json
 * → secrets/mcp/gsc-oauth-desktop.json (лаунчер подхватывает автоматически).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const personalMcp = path.join(
  process.env.HOME || "",
  "Documents",
  "GitHub",
  "sergey-pruss.github.io",
  ".cursor",
  "mcp.json"
);
const dest = path.join(root, "secrets", "mcp", "gsc-oauth-desktop.json");

if (!fs.existsSync(personalMcp)) {
  console.error("Не найден личный конфиг:", personalMcp);
  process.exit(1);
}

let src;
try {
  const j = JSON.parse(fs.readFileSync(personalMcp, "utf8"));
  src = j?.mcpServers?.["google-search-console"]?.env?.GSC_OAUTH_CLIENT_FILE;
} catch (e) {
  console.error("Не удалось прочитать", personalMcp, e.message);
  process.exit(1);
}

if (!src || typeof src !== "string") {
  console.error("В", personalMcp, "нет mcpServers.google-search-console.env.GSC_OAUTH_CLIENT_FILE");
  process.exit(1);
}

if (!fs.existsSync(src)) {
  console.error("Файл OAuth клиента не найден по пути из личного mcp.json:\n  ", src);
  console.error("\nСкачайте JSON для OAuth-клиента «Desktop» в Google Cloud → APIs & Services → Credentials");
  console.error("и либо положите его по этому пути, либо обновите путь в sergey-pruss.github.io/.cursor/mcp.json");
  if (process.platform === "darwin") {
    try {
      execSync("open 'https://console.cloud.google.com/apis/credentials'", { stdio: "inherit" });
      execSync(`open "${path.dirname(src)}"`, { stdio: "inherit" });
    } catch {
      /* ignore */
    }
  }
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
const st = fs.statSync(dest);
console.log("Скопировано:", dest, `(${st.size} bytes)`);
console.log("Перезапустите MCP в Cursor.");
