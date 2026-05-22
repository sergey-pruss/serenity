#!/usr/bin/env node
/** Панели + popular + сборка HTML (+ dev-deploy). После SERP или отдельно. */
import { runPanelsViaShell } from "./lib/refresh-rank-dashboard-panels.mjs";
import { deployRankDashboardToDev } from "./lib/deploy-rank-dashboard-dev.mjs";

const ok = runPanelsViaShell({ skipBuild: process.env.RANK_SKIP_BUILD === "1" });
if (!ok) process.exit(1);

if (process.env.RANK_DASHBOARD_SKIP_DEV_DEPLOY !== "1") {
  const d = deployRankDashboardToDev({ skipBuild: true });
  process.exit(d.ok ? 0 : 1);
}
process.exit(0);
