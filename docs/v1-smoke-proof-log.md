# V1 Smoke Proof Log

_Date:_ `2026-05-11`
_Production:_ [dayof.love](https://dayof.love)
_Latest verified deploy:_ `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4`
_Exact frontend SHA:_ `23bee092`
_Launch call right now:_ `GO`

## Current Truth

- The main launch baseline is live on exact frontend SHA `23bee092`.
- Public DTO minimization is closed and live-proven.
- Secure service-role, queue, storage/media, and email queue-processing proof lanes are green with the provided secure key.
- Guest contact, RSVP, public site, guest hub, photo, registry preview, collaborator runtime, and AI/provider launch lanes are green.
- Public vault contribution is not part of the current launch baseline:
  - the route fails closed with safe unavailable copy
  - `vault-contribution-public` still does not appear in live function inventory

## Latest Runtime Proof Results

- `npm test` -> `PASS` (`534/534` files, `3316/3316` tests)
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
- `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` -> `LIVE PASS`
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` -> `LIVE PASS`
- `npm run proof:v1:registry-preview-ssrf` -> `LIVE PASS`
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` -> `LIVE PASS`
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` -> `LIVE PASS`
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
  - `npm test` -> `PASS` (`534/534`, `3316/3316`)
- Reran secure closeout with the provided secure key:
  - `npm run proof:v1:service-role-authorization` -> `PASS`
  - `npm run proof:v1:email-messaging-authorization` -> `PASS`
  - `npm run proof:v1:launch-closeout` -> `PASS`
- Reran collaborator runtime:
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- Result:
  - final authorization, queue, and role-scoping truth is same-day evidence

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
