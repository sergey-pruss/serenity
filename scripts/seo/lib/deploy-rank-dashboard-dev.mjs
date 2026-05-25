/**
 * Сборка HTML дашборда и выкладка на static-dev (после SERP или finish).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const DEV_DASHBOARD_URL =
  "https://static.serenity.agency/docs/seo-rank-dashboard.html";

/**
 * @param {{ skipBuild?: boolean, skipTest?: boolean }} [opts]
 * @returns {{ ok: boolean, skipped?: boolean, step?: string }}
 */
export function deployRankDashboardToDev(opts = {}) {
  if (process.env.RANK_DASHBOARD_SKIP_DEV_DEPLOY === "1") {
    return { ok: true, skipped: true };
  }

  console.log("\n→ Dev: дашборд позиций (build + deploy-dev-rank-dashboard.sh)…");

  if (!opts.skipBuild) {
    const build = spawnSync("npm", ["run", "seo:rank-dashboard:build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (build.status !== 0) {
      console.warn("⚠️  seo:rank-dashboard:build не удалась — dev-deploy пропущен");
      return { ok: false, step: "build" };
    }
  }

  if (!opts.skipTest && process.env.RANK_DASHBOARD_SKIP_DEV_DEPLOY_TEST !== "1") {
    const test = spawnSync("npm", ["run", "test:rank-dashboard"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (test.status !== 0) {
      console.warn("⚠️  test:rank-dashboard не прошёл — dev-deploy пропущен");
      return { ok: false, step: "test" };
    }
  }

  const deploy = spawnSync("bash", ["scripts/deploy-dev-rank-dashboard.sh"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (deploy.status !== 0) {
    console.warn("⚠️  deploy-dev-rank-dashboard.sh завершился с ошибкой");
    return { ok: false, step: "deploy" };
  }

  console.log(`✅ Дашборд на dev: ${DEV_DASHBOARD_URL}`);
  return { ok: true };
}
