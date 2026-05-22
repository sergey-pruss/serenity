#!/usr/bin/env node
/**
 * Копирует OAuth Desktop JSON для GSC → secrets/mcp/gsc-oauth-desktop.json
 * Ищет путь в mcp.json (несколько типовых мест) или принимает файл аргументом.
 *
 * npm run mcp:gsc-sync-oauth
 * npm run mcp:gsc-sync-oauth -- /путь/к/client_secret_….json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const home = process.env.HOME || "";
const dest = path.join(root, "secrets", "mcp", "gsc-oauth-desktop.json");

/** @returns {string[]} */
function mcpJsonCandidates() {
  const extra = process.env.GSC_SYNC_MCP_JSON?.trim();
  return [
    ...(extra ? [extra] : []),
    path.join(home, "Documents", "GitHub", "sergey-pruss.github.io", ".cursor", "mcp.json"),
    path.join(home, "GitHub", "sergey-pruss.github.io", ".cursor", "mcp.json"),
    path.join(home, ".cursor", "mcp.json"),
    path.join(root, ".cursor", "mcp.json"),
  ].filter((p, i, a) => p && a.indexOf(p) === i);
}

/**
 * @param {string} mcpPath
 * @returns {string | null}
 */
function oauthPathFromMcpJson(mcpPath) {
  try {
    const j = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
    const env = j?.mcpServers?.["google-search-console"]?.env;
    const src = env?.GSC_OAUTH_CLIENT_FILE;
    return typeof src === "string" && src.trim() ? src.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} src
 */
function copyOAuthClient(src) {
  if (!fs.existsSync(src)) {
    throw new Error(`Файл не найден: ${src}`);
  }
  const data = JSON.parse(fs.readFileSync(src, "utf8"));
  if (!data.installed && !data.web) {
    throw new Error("Ожидается OAuth JSON с полем installed (Desktop) или web");
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  const st = fs.statSync(dest);
  console.log("Скопировано:", dest, `(${st.size} bytes)`);
  console.log("Далее: npm run seo:gsc-oauth-token:install  (вход sergeyprus@gmail.com)");
  console.log("       npm run seo:rank-dashboard:panels");
}

function printHelp() {
  console.error("Не найден OAuth-клиент GSC (sergeypruss).\n");
  console.error("Вариант A — указать JSON Desktop-клиента из Google Cloud (проект sergeypruss):");
  console.error('  npm run mcp:gsc-install-oauth -- "$HOME/Downloads/client_secret_….json"\n');
  console.error("Вариант B — положить путь в любой из mcp.json и повторить sync:");
  for (const p of mcpJsonCandidates()) {
    console.error("  ", p);
  }
  console.error(
    '\n  google-search-console.env.GSC_OAUTH_CLIENT_FILE = "/полный/путь/client_secret….json"',
  );
  console.error("\nНе используйте клиент Serenity SEO (prus@) — только GSC-клиент sergeypruss.");
  if (process.platform === "darwin") {
    try {
      execSync("open 'https://console.cloud.google.com/apis/credentials'", {
        stdio: "inherit",
      });
    } catch {
      /* ignore */
    }
  }
}

function main() {
  const arg = process.argv[2]?.trim();
  if (arg) {
    try {
      copyOAuthClient(path.resolve(arg));
      return;
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }

  for (const mcpPath of mcpJsonCandidates()) {
    if (!fs.existsSync(mcpPath)) continue;
    const src = oauthPathFromMcpJson(mcpPath);
    if (!src) {
      console.error("В", mcpPath, "нет google-search-console → GSC_OAUTH_CLIENT_FILE");
      continue;
    }
    try {
      console.log("Источник:", mcpPath);
      copyOAuthClient(src);
      return;
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      if (fs.existsSync(src)) process.exit(1);
    }
  }

  printHelp();
  process.exit(1);
}

main();
