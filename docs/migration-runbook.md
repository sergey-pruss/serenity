# serenity.agency migration runbook

This runbook defines the production-safe workflow for progressive migration:
- router lives on the new Nginx server (`168.222.142.141`)
- new static pages are served locally
- non-migrated paths are proxied to legacy (`80.78.246.207`)

## 1) Hybrid switching policy

Use mixed strategy:

1. Prefix switch for complete sections: `^/section($|/)`
2. Point switch for risky single pages first
3. Specific rules must stay above broad prefixes in `nginx/routing.conf`

Current active routes in repository:
- `~^/$ 1;`
- `~^/case/all($|/) 1;`

Everything else stays on legacy via `default 0;`.

## 2) Safe routing deployment

1. Edit `nginx/routing.conf`
2. Apply config safely:
   - `bash scripts/deploy-routing.sh`
3. If command fails, config is not reloaded (guarded by `nginx -t`)

## 3) Pre-DNS validation (mandatory gate)

Before changing production DNS:

1. Validate on technical host (`static.serenity.agency`):
   - `https://static.serenity.agency/`
   - `https://static.serenity.agency/case/all/`
2. Validate legacy fallback:
   - open several paths that are not in `routing.conf`, confirm they render legacy content
3. Validate forms and API flows:
   - send test lead from static host and verify success response
4. Validate redirects:
   - trailing slash behavior has no loops (`/case/all` -> `/case/all/`)
5. Validate logs:
   - no spike in `5xx`, no upstream timeout bursts

## 4) DNS cutover procedure

1. 24-48h before cutover:
   - lower TTL for `A/AAAA` of `serenity.agency` and `www` to `60-300`
2. Cutover window:
   - switch `A` records to `168.222.142.141`
3. Immediate post-check:
   - check from multiple networks/devices that domain resolves to new IP
   - verify homepage, `/case/all/`, and one legacy-fallback page
4. If critical issue:
   - rollback DNS to previous IP
   - keep low TTL until stabilization

## 5) Release checklist for every routing change

- [ ] routing rule order reviewed (specific before broad)
- [ ] `bash scripts/deploy-routing.sh` completed successfully
- [ ] no redirect loops on changed routes
- [ ] forms/CTA and `/api/lead` work
- [ ] changed routes match expected visuals
- [ ] non-migrated routes still served by legacy
- [ ] Nginx logs clean from new 5xx spikes

## 6) Rollback playbook

Fast rollback (route level):

1. In `nginx/routing.conf`, set problematic route back to legacy:
   - remove or comment `... 1;` rule for that path/prefix
2. Re-apply routing:
   - `bash scripts/deploy-routing.sh`
3. Re-check affected URLs

Emergency rollback (global):

1. Set only `default 0;` and disable all `... 1;` rules
2. Re-apply routing
3. If infra-level issue persists, rollback DNS to old IP
