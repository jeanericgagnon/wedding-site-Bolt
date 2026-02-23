# Registry Refresh Ops Runbook

## Purpose
Keep registry metadata fresh while controlling compute costs.

## Architecture (current)
- UI policy controls in `Dashboard -> Registry`
- Scheduled worker: `supabase/functions/registry-refresh-due`
- Scheduler: `.github/workflows/registry-refresh-due.yml` (daily)

## Required Secrets
### GitHub Actions
- `SUPABASE_PROJECT_REF`
- `REGISTRY_REFRESH_JOB_TOKEN`

### Supabase Functions env
- `REGISTRY_REFRESH_JOB_TOKEN`

> Values for `REGISTRY_REFRESH_JOB_TOKEN` must match in both places.

## Default Runtime Policy
- Daily schedule, `maxItems=120`, `dryRun=false`
- Site-level default preset: **Balanced** (120 refreshes/month)
- Auto-refresh scope default: **Active only** (exclude purchased/hidden)
- Auto-refresh window: wedding date + 30 days (or explicit `enabled_until`)

## Manual Smoke Test
Use workflow dispatch:
- `maxItems=25`
- `dryRun=false`

Expected:
- workflow success
- processed/updated/failed summary emitted
- no auth errors

## Failure Triage
1. **Unauthorized / 401**
   - token mismatch between GitHub and Supabase env
2. **Function not found / stale behavior**
   - deploy latest function:
     - `supabase functions deploy registry-refresh-due --project-ref <ref>`
3. **High failure rate**
   - reduce `maxItems`
   - keep backoff enabled (already built)
   - inspect merchant blocks and malformed URLs
4. **Budget exhausted too early**
   - switch preset to Lean
   - reduce include scope

## Recommended SLO Guardrails
- Failure rate target: <25%
- Keep remaining monthly budget >20% for most active sites
- If failure >35% for 3 consecutive runs:
  - halve `maxItems`
  - force Lean recommendation in ops policy

## Monthly Maintenance
- Verify month rollover counters are resetting correctly
- Review top sites by refresh failures/backlog
- Confirm post-wedding sites are not auto-refreshing

## Emergency Controls
- Per-site: disable auto refresh toggle in Registry policy
- Global: disable workflow schedule in GitHub Actions
- Force dry run: run workflow manually with `dryRun=true`
