# DNS cutover runbook (`serenity.agency`)

This runbook is used only after pre-cutover validation is green.

## T-48h to T-24h

1. Reduce DNS TTL for:
   - `serenity.agency` (`A`, `AAAA` if used)
   - `www.serenity.agency` (`A`, `AAAA` if used)
2. Target TTL: `60` to `300` seconds.
3. Confirm old and new server health.

## T-0 cutover window

1. Freeze routing edits for the window.
2. Switch `A` record(s) to `168.222.142.141`.
3. Verify from multiple networks:
   - `dig +short serenity.agency`
   - open `https://serenity.agency/`
   - open `https://serenity.agency/case/all/`
   - open one legacy route not migrated yet (must still work via proxy)

## T+5 to T+30 min stabilization

1. Monitor:
   - Nginx access/error logs
   - upstream timeout / 5xx rate
2. Re-run smoke checks from release checklist.

## Rollback criteria

Rollback DNS immediately if:
- homepage or core funnels are unavailable
- sustained `5xx` or proxy failures
- critical functional regression cannot be mitigated by route-level rollback

## DNS rollback

1. Revert `A` record(s) to previous legacy IP.
2. Keep reduced TTL until service stabilizes.
3. Record incident timeline and root cause.
