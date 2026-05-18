#!/usr/bin/env node
/**
 * Цепочка обновления страницы kontekstnaya_reklama из локального Nuxt (репозиторий SerenityAgency).
 *
 * Предусловия: у владельца SerenityAgency запущен dev, страница открывается в браузере (API/данные с его стороны).
 * Репозиторий SerenityAgency из задач по serenity не патчится — только URL для захвата.
 *
 * Переменные:
 *   KONTEKST_CAPTURE_URL — полный URL страницы для Playwright (по умолчанию http://127.0.0.1:4333/kontekstnaya_reklama)
 *   KONTEKST_NUXT_ORIGIN — origin для скачивания /_nuxt/css/*.css; если не задан, берётся из KONTEKST_CAPTURE_URL (удобно при смене порта).
 *
 * Сборка: capture пишет tmp/kontekst-prod-full.html; assemble по умолчанию (auto) берёт срез main из этого файла.
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const defaultCapture = "http://127.0.0.1:4333/kontekstnaya_reklama";
process.env.KONTEKST_CAPTURE_URL = process.env.KONTEKST_CAPTURE_URL || defaultCapture;

if (!process.env.KONTEKST_NUXT_ORIGIN) {
  try {
    process.env.KONTEKST_NUXT_ORIGIN = new URL(process.env.KONTEKST_CAPTURE_URL).origin;
  } catch {
    process.env.KONTEKST_NUXT_ORIGIN = "http://127.0.0.1:4333";
  }
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("KONTEKST_CAPTURE_URL=", process.env.KONTEKST_CAPTURE_URL);
console.log("KONTEKST_NUXT_ORIGIN=", process.env.KONTEKST_NUXT_ORIGIN);

run("node scripts/capture-prod-kontekst-full-html.cjs");
run("node scripts/download-nuxt-css-prod-kontekstnaya.cjs");
run("npm run assemble:service:kontekstnaya");
run("npm run test:kontekstnaya-reklama");

console.log("refresh-kontekstnaya-from-local-nuxt: ok");
