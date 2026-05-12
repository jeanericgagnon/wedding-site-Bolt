# V1 Smoke Proof Log

_Date:_ `2026-05-11`
_Production:_ [dayof.love](https://dayof.love)
_Latest verified deploy:_ `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
_Exact frontend SHA:_ `f0cbf841`
_Launch call right now:_ `GO`

## Current Truth

- The main verified live runtime is exact frontend SHA `f0cbf841`.
- Public DTO minimization is closed and live-proven.
- Secure service-role, queue, storage/media, and email queue-processing proof lanes are green with the provided secure key.
- Guest contact, RSVP, public site, guest hub, photo, registry preview, collaborator runtime, and AI/provider launch lanes are green on the blocker-fix runtime.
- Client-facing RLS proof now has one canonical live matrix command: `npm run proof:v1:client-rls-matrix`.
- That matrix now explicitly proves direct guest-table writes stay guest-scoped while direct timeline/settings writes remain denied without permission.
- Payment gate now fails closed on billing lookup failure.
- RSVP capacity enforcement now serializes through the deployed database function path.
- Release launch CI now hard-fails without strict Supabase RSVP proof secrets and passes with the configured repo secrets.
- Internal tooling routes are now disabled in production by default unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`.
- Public vault contribution is not part of the current launch baseline:
  - the route fails closed with safe unavailable copy
  - `vault-contribution-public` still does not appear in live function inventory

## Latest Runtime Proof Results

- `npm test` -> `PASS` (`537/537` files, `3321/3321` tests)
- `npm run typecheck -- --pretty false` -> `PASS`
- `npm run lint -- --quiet` -> `PASS`
- `npm run build` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run test:smoke` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run proof:v1:service-role-authorization` -> `PASS`
- `npm run proof:v1:email-messaging-authorization` -> `PASS`
- `npm run proof:v1:launch-closeout` -> `PASS`
- `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` -> `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
- `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
- `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` -> `LIVE PASS`
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` -> `LIVE PASS`
- `npm run proof:v1:registry-preview-ssrf` -> `LIVE PASS`
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` -> `LIVE PASS`
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` -> `LIVE PASS`

## Current Launch Call

- Launch-critical runtime blockers are closed.
- GitHub Actions `Release Launch Gate` is green on runs `25705386070` and `25705683563`.
- Remaining items are deferred and non-launch.
- `npm run proof:v1:ai-product-readiness` -> `PASS`
- `npm run proof:v1:data-integrity` -> `PASS`
- `npm run proof:v1:prereqs` -> `PASS`

## Latest Changes In This Final Closeout

### 2026-05-11 03:42 PM PDT - Exact-SHA Frontend Deploy And Postdeploy Proof Sweep

- Pushed exact runtime commit `23bee092` (`Stabilize final proof suite and runtime safety`) to `codex/v1-finish-hard-gates-3`.
- Promoted Vercel production deploy `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4`.
- Redeployed `public-site-access --no-verify-jwt`.
- Reran:
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`
  - `npm run proof:v1:guests-rsvp-ops`
  - `npm run proof:v1:guest-lookup-scope`
- Result:
  - exact frontend SHA is now known
  - postdeploy public/guest proof is green
  - launch remains `GO`

### 2026-05-11 03:42 PM PDT - Full Suite And Secure Closeout Refresh

- Reran the full suite:
  - `npm test` -> `PASS` (`537/537`, `3321/3321`)
- Reran secure closeout with the provided secure key:
  - `npm run proof:v1:service-role-authorization` -> `PASS`
  - `npm run proof:v1:email-messaging-authorization` -> `PASS`
  - `npm run proof:v1:launch-closeout` -> `PASS`
- Reran collaborator runtime:
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- Result:
  - final authorization, queue, and role-scoping truth is same-day evidence

### 2026-05-11 05:33 PM PDT - Live Blocker-Fix Deploy And Release Gate Closure

- Pushed blocker-fix runtime commit `f0cbf841` (`Fix payment gate and serialize RSVP capacity`) to `codex/v1-finish-hard-gates-3`.
- Promoted Vercel production deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`.
- Applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`.
- Deployed `submit-rsvp --no-verify-jwt`.
- Reran:
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`
  - `npm run proof:v1:guests-rsvp-ops`
  - `npm run proof:v1:guest-lookup-scope`
- Confirmed GitHub Actions `Release Launch Gate` is green on run `25705683563`.
- Result:
  - exact current live frontend runtime is `f0cbf841`
  - payment fail-open is closed in production
  - RSVP capacity serialization is live and proven
  - release-gate Supabase RSVP proof is enforced and green
  - launch remains `GO`

### 2026-05-11 03:42 PM PDT - Public Vault Contribution Downgraded To Deferred / Hard-Disabled

- Attempted closeout redeploys:
  - `vault-contribution-public --no-verify-jwt`
  - `vault-entry-submit --no-verify-jwt`
- Follow-up runtime checks found:
  - direct probe to `vault-contribution-public` still returns `404 NOT_FOUND`
  - `supabase functions list` still does not show `vault-contribution-public`
  - `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` still fails closed on the unavailable page
- Result:
  - public vault contribution is explicitly outside the current launch baseline
  - the lane is deferred/non-launch, not silently broken

## Historical Note

Longer chronological detail now lives in [docs/PRODUCTION_HARDENING_CHANGELOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md). This file stays focused on the current verified runtime picture.
