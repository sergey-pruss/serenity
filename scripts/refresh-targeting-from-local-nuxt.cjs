#!/usr/bin/env node
/**
 * Обновление /targeting из локального Nuxt (SerenityAgency). Репозиторий Nuxt не патчится.
 * TARGETING_CAPTURE_URL — default http://127.0.0.1:4333/targeting
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const defaultCapture = "http://127.0.0.1:4333/targeting";
process.env.TARGETING_CAPTURE_URL = process.env.TARGETING_CAPTURE_URL || defaultCapture;

if (!process.env.TARGETING_NUXT_ORIGIN) {
  try {
    process.env.TARGETING_NUXT_ORIGIN = new URL(process.env.TARGETING_CAPTURE_URL).origin;
  } catch {
    process.env.TARGETING_NUXT_ORIGIN = "http://127.0.0.1:4333";
  }
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("TARGETING_CAPTURE_URL=", process.env.TARGETING_CAPTURE_URL);
console.log("TARGETING_NUXT_ORIGIN=", process.env.TARGETING_NUXT_ORIGIN);

run("node scripts/capture-prod-targeting-full-html.cjs");
run("node scripts/extract-targeting-phase2-slices.cjs");
run("node scripts/download-nuxt-css-prod-targeting.cjs");
process.env.TARGETING_INCLUDE_PHASE2 = "1";
run("node scripts/assemble-targeting-from-prod-layout.cjs");
process.env.TARGETING_VERIFY_PHASE2 = "1";
run("npm run test:targeting");

console.log("refresh-targeting-from-local-nuxt: ok");
