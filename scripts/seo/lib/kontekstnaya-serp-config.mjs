/** @deprecated Используйте getSerpCampaign() из serp-campaigns.mjs */
export { SNAPSHOT_DATE, getSerpCampaign, ENGINES, REGIONS, serpMatrixKey } from "./serp-campaigns.mjs";
export { ORGANIC_TARGET, isDeniedSerpHost, ARTIFACTS_DIR, ROOT } from "./serp-shared.mjs";

import { getSerpCampaign } from "./serp-campaigns.mjs";

const c = getSerpCampaign("kontekstnaya");

export const SERENITY_URL = c.serenityUrl;
export const QUERIES = c.queries;

export function serpSnapshotsPath(date) {
  return c.snapshotsPath(date);
}

export function serpAuditPath(date) {
  return c.auditPath(date);
}
