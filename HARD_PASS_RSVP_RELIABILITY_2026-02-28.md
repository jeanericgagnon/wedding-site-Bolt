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
- Inheritance multi-select + event-details UX: `7fc073b`, `cb18b97`, `30eb2f5`
- Deterministic smoke coverage seeding: `2956bc1`

## Deployed components
- Migration applied (remote): `20260228152000_rsvp_reliability_hardening.sql`
- Additional smoke-seed migrations applied (remote):
  - `20260228153000_seed_rsvp_scope_smoke_guests.sql`
  - `20260228154000_seed_rsvp_smoke_matrix_guests.sql`
  - `20260228154500_insert_rsvp_scope_smoke_guests.sql`
- Function deployed (remote): `validate-rsvp-token`

## Current smoke outcomes
Command: `npm run smoke:rsvp`

- ✅ valid baseline submit: `200`
- ✅ invalid token blocked: `403`
- ✅ plus-one limit blocked: `400`
- ✅ children limit blocked: `400`
- ✅ ceremony scope-violation blocked: `400`
- ✅ reception scope-violation blocked: `400`

## Regression checks
- `npm test` ✅
- `npm run build` ✅

## Remaining gap to close (optional next)
- No blocker remaining for reliability hard pass scope.
- Optional cleanup later: remove/rotate seeded smoke guests in non-test environments if desired.
