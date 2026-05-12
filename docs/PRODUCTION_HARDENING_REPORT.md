# Production Hardening Report

_Updated:_ `2026-05-11 05:06 PM PDT`

## Current Score

- Readiness score: `9.5 / 10`
- Launch verdict: `HOLD`
- Production-ready: `NO`

## Exact Runtime Identity

- Branch: `codex/v1-finish-hard-gates-3`
- Exact frontend Git SHA: `23bee092`
- Exact frontend commit: `Stabilize final proof suite and runtime safety`
- Exact Vercel production deploy: `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4`
- Production URL: [dayof.love](https://dayof.love)
- Supabase project: `atuzuobpprjstfmdnwso`

## Exact Blockers

- `P0 Payment gate fix is local-only until frontend deploy`
  - [src/components/auth/ProtectedRoute.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/components/auth/ProtectedRoute.tsx:33) now fails closed to `billing_unavailable`, but production is still on frontend SHA `23bee092`
- `P1 RSVP capacity serialization fix is local-only until migration + function deploy`
  - [supabase/functions/submit-rsvp/index.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/functions/submit-rsvp/index.ts:163) now uses `apply_public_rsvp_capacity_decision(...)`, and [20260511170500_serialize_submit_rsvp_capacity.sql](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/migrations/20260511170500_serialize_submit_rsvp_capacity.sql) serializes the capacity decision, but neither is live yet
- `P1 Release launch gate workflow is local-only until push + first Actions pass`
  - [.github/workflows/release-launch-gate.yml](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/.github/workflows/release-launch-gate.yml) now hard-fails on missing Supabase RSVP proof secrets and requires `npm run smoke:rsvp:strict`, but the workflow has not been pushed/exercised yet

## Exact Proof Gaps

The reopened bug-fix batch is now locally proven, but these deployment/live-proof gaps remain:
- frontend deploy of the billing-unavailable payment gate
- migration + `submit-rsvp` deploy of the serialized RSVP capacity path
- first GitHub Actions run of `release-launch-gate.yml`
- live rerun that specifically covers the deployed billing/RSVP fixes, not just the older exact-SHA runtime

Deferred, non-launch gaps:
- public vault contribution / anniversary vault guest route
  - live route still fails closed with `This vault is not available right now`
  - direct function probe for `vault-contribution-public` still returns `404 NOT_FOUND`
  - `supabase functions list` does not show `vault-contribution-public`
  - this lane is not part of the current launch baseline
- custom-host/subdomain live DNS rerun
- registry owner import/repair manual notes
- SMS/provider live-send setup
- AI secret inventory/internal prereq notes

## Exact Proof State

Fresh local proof:
- `npm test` -> `PASS` (`534/534` files, `3316/3316` tests)
- `npm run typecheck -- --pretty false` -> `PASS`
- `npm run lint -- --quiet` -> `PASS`
- `npm run build` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run proof:v1:board:md` -> `PASS`
- `npm run guard:file-size` -> `PASS`
- `npm run guard:assets` -> `PASS`
- `npm run proof:v1:performance-budget` -> `PASS`
- `git diff --check` -> `PASS`

Fresh secure/runtime proof:
- `npm run proof:v1:service-role-authorization` -> `PASS`
- `npm run proof:v1:email-messaging-authorization` -> `PASS`
- `npm run proof:v1:launch-closeout` -> `PASS`
- `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- `npm run test:smoke` -> `PASS`

Fresh production proof after exact-SHA frontend deploy:
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` -> `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
- `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
- `npm run proof:v1:registry-preview-ssrf` -> `LIVE PASS`

Same-day still-valid supporting proof:
- `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` -> `LIVE PASS`
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` -> `LIVE PASS`
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` -> `LIVE PASS`
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` -> `LIVE PASS`
- `npm run proof:v1:ai-product-readiness` -> `PASS`
- `npm run proof:v1:data-integrity` -> `PASS`
- `npm run proof:v1:prereqs` -> `PASS`

Deferred/non-launch failed proof:
- `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` -> `FAIL`
  - route fails closed before write path is reached
  - this does not block launch because public vault contribution is explicitly deferred/hard-disabled in the current baseline

## Exact Deployment State

Exact-SHA closeout deploys:
- frontend: `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4` from `23bee092`
- `public-site-access --no-verify-jwt`: redeployed and live-proven

Same-day already-confirmed live surfaces:
- `guest-contact-lookup --no-verify-jwt`
- `guest-contact-submit --no-verify-jwt`
- `photo-upload --no-verify-jwt`
- `process-email-queue`
- `translate-site-content`

Closeout deploy inconsistency caught and downgraded:
- `vault-contribution-public --no-verify-jwt`
- `vault-entry-submit --no-verify-jwt`

Those two deploy commands reported success, but the live inventory/runtime does not confirm the expected state. The public vault lane therefore stays explicitly deferred/fail-closed instead of being counted as launch-ready.

## What Changed Since Last Report

- Fixed the payment gate so billing lookup failure no longer degrades to fake paid access
- Added focused proof for the `billing_unavailable` redirect path
- Moved RSVP capacity enforcement into a serialized database function and switched `submit-rsvp` onto that RPC
- Added focused regression proof for the serialized RSVP path
- Added `release-launch-gate.yml`, which hard-fails when Supabase RSVP proof secrets are missing and requires `npm run smoke:rsvp:strict`
- Reran focused blocker tests plus the full `npm test` suite and kept them green
- Reran `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `board:md`, `git diff --check`, and `test:smoke`; all are green

## What Remains Before 10 / 10

- commit and push this blocker-fix batch
- deploy the frontend billing-gate fix
- deploy the RSVP capacity serialization migration plus the updated `submit-rsvp` function
- run the first GitHub Actions pass of `release-launch-gate.yml`
- rerun live payment/RSVP proof on the deployed runtime

Why this is `9.5 / 10` instead of `9.9 / 10`:
- the reopened blockers are now fixed in code and proven locally
- but production is still on the older live runtime, so the launch call cannot move back to `GO` yet

## Bottom Line

This repo is still close, but it is not production-ready today.

The strongest current truth is:
- exact frontend SHA is known
- public DTO lane is still closed
- secure queue/storage/message proof is still green
- guest/public critical live proofs are still broadly green
- but the launch verdict must stay `HOLD` until this local fix batch is committed, deployed, and rerun through live proof
