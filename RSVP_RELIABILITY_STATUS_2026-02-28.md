# RSVP Reliability Status — 2026-02-28

## Final status
- Hard RSVP reliability pass: **COMPLETE**
- Backend enforcement: **COMPLETE**
- Dashboard conflict visibility + resolution workflow: **COMPLETE**
- Inheritance multi-select + event details UX: **COMPLETE**
- Deterministic strict smoke coverage: **COMPLETE**

## One-command gate
- `npm run hardpass:rsvp`
- Includes: test + build + strict RSVP smoke assertions

## Expected strict smoke outcomes
- valid submit baseline → `200`
- invalid token blocked → `403`
- plus-one limit blocked → `400`
- children limit blocked → `400`
- ceremony scope violation blocked → `400`
- reception scope violation blocked → `400`

## Key implementation artifacts
- Function: `supabase/functions/validate-rsvp-token/index.ts`
- Dashboard: `src/pages/dashboard/Guests.tsx`
- Public RSVP: `src/pages/RSVP.tsx`
- Smoke script: `scripts/rsvp_smoke.js`
- Hard-pass report: `HARD_PASS_RSVP_RELIABILITY_2026-02-28.md`

## Key migrations applied
- `20260228152000_rsvp_reliability_hardening.sql`
- `20260228153000_seed_rsvp_scope_smoke_guests.sql`
- `20260228154000_seed_rsvp_smoke_matrix_guests.sql`
- `20260228154500_insert_rsvp_scope_smoke_guests.sql`
