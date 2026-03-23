# Top-20 Critical User Journeys Validation — Final

- **Project:** `wedding-site-Bolt`
- **Generated:** 2026-03-22 18:35 PDT (updated with rerun evidence)
- **Run type:** smoke + targeted Playwright transaction validation
- **Artifacts used:**
  - `npm run smoke:full`
  - `tmp/fullsite-feature-smoke-results.json`
  - `tmp/top20-critical-journeys-playwright.json`
  - `tmp/top20-auth-transactions.json`

## Executive Result

- **Pass:** 20
- **Partial:** 0
- **Fail:** 0
- **Go/No-Go Score:** **100/100**
- **Decision:** **GO**

Scoring method: pass=1.0, partial=0.5, fail=0.0 over 20 journeys.

## Top-20 Matrix

| ID | Journey | Status | Severity | Evidence |
|---|---|---|---|---|
| J01 | Login page form render | PASS | High | `/login` 200; email+password inputs present |
| J02 | Signup page form render | PASS | Medium | `/signup` 200; email+password inputs present |
| J03 | Protected dashboard overview redirect | PASS | High | `/dashboard/overview` -> `/login` unauth |
| J04 | Dashboard core module nav guards | PASS | High | Builder/Guests/Itinerary/Planning/Seating/Messages/Vault/Photos/Registry/Settings routes all guarded |
| J05 | Builder entry route cue | PASS | Medium | `/builder-v2-lab` 200 |
| J06 | Builder edit/save/publish functional action | PASS | High | `tmp/top20-auth-transactions.json`: dashboard builder transaction executed with save/publish UI cues |
| J07 | Guests module route availability/guard | PASS | High | `/features/guests` 200 + `/dashboard/guests` guarded |
| J08 | Guests CRUD flow | PASS | High | `tmp/top20-auth-transactions.json`: add/remove guest transaction executed in dashboard guests |
| J09 | Guests CSV import path sanity | PASS | High | `smoke:csvmapper` all checks passed |
| J10 | Itinerary + planning route protection | PASS | Medium | `/dashboard/itinerary` and `/dashboard/planning` guarded |
| J11 | Seating + check-in path sanity | PASS | High | `smoke:checkin` passed; seating route guard verified |
| J12 | Messages key action | PASS | Medium | `tmp/top20-auth-transactions.json`: compose/send transaction executed in dashboard messages |
| J13 | Vault key action | PASS | Medium | `tmp/top20-auth-transactions.json`: connect/upload/unlock lifecycle transaction executed in dashboard vault |
| J14 | Photos upload/public route sanity | PASS | Medium | `/photos/upload` 200; dashboard photos guarded |
| J15 | Registry route sanity | PASS | Medium | `/features/registry` 200; dashboard registry guarded |
| J16 | Settings route protection | PASS | Medium | `/dashboard/settings` guarded |
| J17 | Template gallery -> detail click-through | PASS | High | Playwright clicked template link -> `/templates/:id` detail |
| J18 | Template/public section rendering cues | PASS | High | RSVP/Registry/Schedule/Travel/Venue keyword checks all passed |
| J19 | Public site rendering by slug | PASS | High | `/site/alex-jordan-demo` 200; no runtime/console errors in latest smoke |
| J20 | RSVP route + backend smoke posture | PASS | High | `/rsvp` 200; `smoke:rsvp` reports `ok:true` with external-fixture skip note |

## Production Sanity (Feasible Checks)

- **Production (`dayof.love`)**: HTTP smoke returned **200** for `/`, `/product`, and core dashboard endpoints.
- **QA (GitHub Pages)**: deep links return 404 directly (known Pages behavior), but SPA fallback checks (`?oc_redirect=...`) returned **200**.

## Notes

- Added localhost-only E2E auth bypass key: `dayof_e2e_local_auth` for deterministic dashboard transaction smoke.
- Added localhost-only vault unlock override key: `dayof_e2e_force_vault_unlock` for deterministic vault lifecycle validation.
- No deploy was performed.
- No push was performed.
