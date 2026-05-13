#!/usr/bin/env node
/**
 * Цепочка обновления страницы kontekstnaya_reklama из локального Nuxt (репозиторий SerenityAgency).
 *
 * Предусловия:
 *   1) В каталоге SerenityAgency: npm install (один раз), затем npm run dev — сервер по nuxt.config / package.json (часто http://0.0.0.0:4333).
 *   2) Страница должна открываться в браузере (данные WP/API должны быть доступны из локалки).
 *
 * Переменные (опционально):
 *   KONTEKST_CAPTURE_URL — URL для Playwright (по умолчанию http://127.0.0.1:4333/kontekstnaya_reklama)
 *   KONTEKST_NUXT_ORIGIN   — откуда качать /_nuxt/css/*.css (по умолчанию http://127.0.0.1:4333)
 *
 * Не обновляет tmp/kontekst-parity-prod-layout.html — срез колонки по-прежнему из своего дампа; для полного переноса DOM с локалки добавьте отдельный шаг захвата в tmp и assemble.
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

process.env.KONTEKST_CAPTURE_URL =
  process.env.KONTEKST_CAPTURE_URL || "http://127.0.0.1:4333/kontekstnaya_reklama";
process.env.KONTEKST_NUXT_ORIGIN = process.env.KONTEKST_NUXT_ORIGIN || "http://127.0.0.1:4333";

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("KONTEKST_CAPTURE_URL=", process.env.KONTEKST_CAPTURE_URL);
console.log("KONTEKST_NUXT_ORIGIN=", process.env.KONTEKST_NUXT_ORIGIN);

run("node scripts/capture-prod-kontekst-full-html.cjs");
run("node scripts/download-nuxt-css-prod-kontekstnaya.cjs");
run("node scripts/assemble-kontekstnaya-from-prod-layout.cjs");
run("npm run test:kontekstnaya-reklama");

console.log("refresh-kontekstnaya-from-local-nuxt: ok");
