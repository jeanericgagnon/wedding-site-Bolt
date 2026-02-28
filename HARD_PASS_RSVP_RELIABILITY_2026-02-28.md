# HARD PASS — RSVP Reliability (2026-02-28)

## Scope completed
- Submit-time invite scope enforcement (server-side)
- Plus-one / children / additional guest limit enforcement (server-side)
- Household apply consistency checks (server-side)
- Conflict visibility in dashboard (filter + resolve actions)
- Focused smoke matrix + repeatable run script

## Evidence
- Core reliability commit: `ea9ea6c`
- Deploy/runtime hotfix: `8b5125d`
- Dashboard conflict actions: `c3b1995`
- Smoke matrix expansion: `30ff971`

## Deployed components
- Migration applied (remote): `20260228152000_rsvp_reliability_hardening.sql`
- Function deployed (remote): `validate-rsvp-token`

## Current smoke outcomes
Command: `npm run smoke:rsvp`

- ✅ valid baseline submit: `200`
- ✅ invalid token blocked: `403`
- ✅ plus-one limit blocked: `400`
- ✅ children limit blocked: `400`
- ℹ️ ceremony/reception scope-violation cases auto-skip when sample lacks excluded guests

## Regression checks
- `npm test` ✅
- `npm run build` ✅

## Remaining gap to close (optional next)
- Seed or select at least one guest with ceremony/reception exclusions in test data so scope-violation smoke can run every pass.
