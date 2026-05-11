# V1 Smoke Proof Log

_Date:_ `2026-05-11`
_Production:_ [dayof.love](https://dayof.love)
_Latest verified deploy:_ `dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7`
_Launch call right now:_ `GO`

## Current Truth

- Public DTO minimization is closed locally and live-proven on the main public site lane.
- Secure service-role, queue, storage/media, and email queue-processing proof lanes are green.
- Deployment/proof truth is now canonical in [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md).
- The guest contact public runtime proof is now green too.

## Latest Runtime Proof Results

- `npm run proof:v1:service-role-authorization` -> `PASS`
- `npm run proof:v1:email-messaging-authorization` -> `PASS`
- `npm run proof:v1:launch-closeout` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run test:smoke` -> `PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` -> `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
- `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` -> `LIVE PASS`
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` -> `LIVE PASS`
- `npm run proof:v1:registry-preview-ssrf` -> `LIVE PASS`
- `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`

## Latest Changes In This Final Closeout

### 2026-05-11 02:27 PM PDT - Translation Route Live Proof Closed

- Redeployed `translate-site-content` with a source-hash ready-row fast path for unchanged site/language pairs.
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` now passes all `17/17` checks, including:
  - safe missing-auth failure on `translate-site-content`
  - live owner-gated translation success with `200`
  - ready-row translation readback
  - photo AI live proof lane still green
- Result:
  - translation route is no longer deferred
  - launch remains `GO`
  - production-ready remains `YES`

### 2026-05-11 02:34 PM PDT - Subdomain Route Parsing Pinned Locally

- Unified `.dayof.love` host parsing behind `resolveWeddingSubdomainSlugFromHostname(...)`.
- Updated both `src/App.tsx` and `src/pages/SiteView.tsx` to use the shared helper instead of duplicating hostname parsing.
- Added local proof in `src/lib/publicSiteSlug.test.ts` for:
  - normal subdomain hosts
  - apex / `www` hosts
  - mixed-case hosts
  - non-DayOf hosts
- Result:
  - subdomain route logic is locally pinned
  - custom-host DNS reruns remain deferred and non-launch

### 2026-05-11 02:33 PM PDT - Data Integrity And Prereqs Runtime Sweep

- `npm run proof:v1:data-integrity` -> `PASS`
  - anon-limited runtime integrity proof found no hard launch corruption
  - no invalid or duplicate site slugs
- `npm run proof:v1:prereqs` -> `PASS`
  - required migrations present
  - required local functions present
  - required live REST tables reachable/protected as expected
  - required edge functions deployed/reachable as expected
- Result:
  - launch status unchanged: `GO`
  - production-ready unchanged: `YES`
  - runtime inventory confidence is stronger

### 2026-05-11 02:16 PM PDT - Guest Contact Runtime Blocker Closed

- Forced a fresh `guest-contact-lookup` runtime version with a real source change, then redeployed:
  - `guest-contact-lookup --no-verify-jwt`
  - `guest-contact-submit --no-verify-jwt`
- `npm run proof:v1:guest-lookup-scope` now passes:
  - exact-match lookup
  - partial-name and mismatched-name fail-closed behavior
  - signed contact-session issuance
  - household-scoped contact submit/update
- Result:
  - no active `P0` or `P1` blockers remain
  - launch is now `GO`
  - production-ready is now `YES`

### 2026-05-11 02:02 PM PDT - Canonical Board Closeout Exposed Guest Contact Runtime Failure

- Closed `P1-04 Public section DTO minimization`.
- Closed `P1-09 Deployment / proof truth canonicalization`.
- Extended `scripts/v1-proof-guest-lookup-scope.mjs` so it now checks both:
  - lookup scope / exact-match session issuance
  - session-scoped contact submit / household update
- Redeployed:
  - `guest-contact-lookup --no-verify-jwt`
  - `guest-contact-submit --no-verify-jwt`
- Reran live guest-contact proof:
  - still failed with `401 UNAUTHORIZED_NO_AUTH_HEADER`
- Result:
  - launch temporarily remained `HOLD`
  - production-ready temporarily remained `NO`

### 2026-05-11 01:55 PM PDT - Final Public DTO Family Pass And Live Proof Sweep

- Final public DTO family review is complete across:
  - `venue`
  - `schedule`
  - `registry`
  - `faq`
  - `menu`
  - `music`
  - `directions`
  - `video`
  - `quotes`
  - `custom`
- Focused public contract/render/access tests stayed green.
- Latest live public proofs stayed green on:
  - canonical smoke
  - public quality
  - RSVP ops
  - guest hub write/read
  - photo upload/readback/analysis/recap
  - registry preview SSRF

## Historical Note

Longer chronological detail now lives in [docs/PRODUCTION_HARDENING_CHANGELOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md). This file now stays focused on the current verified runtime picture.
