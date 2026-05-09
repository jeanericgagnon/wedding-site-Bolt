# Production Hardening Report

_Updated:_ 2026-05-08 11:28 AM PT
_Branch carrying latest pushed work:_ `codex/v1-finish-hard-gates-2`
_Latest commit:_ `71cd556c` `Land launch hardening worktree`

## Current Verdict

- **Readiness score:** `8.2 / 10`
- **Launch verdict:** `HOLD`
- **Production-ready:** `NO`

This pass moved the launch program forward in a real way: the highest-risk public payload lane is now minimized in code, covered by leak-focused tests, and deployed for `public-site-access`; the live guests/RSVP lane is green again; the remaining public/runtime functions touched in this wave are now deployed; and the asset budget proof passes. We still cannot call production ready because the secure service-role proof and secure email queue proof remain open, and the secure proof secret is not present in the connected Vercel production env.

## What Changed In This Hardening Wave

### Wave 1: public payload minimization

- `public-site-access` was refactored to return a minimal server-built public render model instead of raw `site_json`, `published_json`, `wedding_data`, and `layout_config` blobs.
- `SiteView` was moved to consume that server-built render model directly.
- Browser-side public translation fetch fallback was removed from the public site path.
- Nested fake sensitive-field leak tests were added for the main public render lane.
- Public-access static proof was updated to enforce the safer contract.

### Wave 2: service-role and email authorization proof

- `npm run proof:v1:service-role-authorization` is green for the unauthenticated denial lane.
- `npm run proof:v1:email-messaging-authorization` is green for the unauthenticated denial lane.
- The remaining open work is the secure-env sub-proof for queue/storage and queue-processing integrity, which still requires `SUPABASE_SERVICE_ROLE_KEY`.
- Vercel production env inventory confirms that no secure proof secret is available there.
- Supabase secret inventory remains blocked from this workspace because `SUPABASE_ACCESS_TOKEN` or an authenticated Supabase CLI session is not available.

### Wave 3: deploy/proof alignment

- `public-site-access` was deployed to Supabase on `2026-05-08`.
- `interactive-section-public`, `vault-contribution-public`, `process-email-queue`, `public-itinerary-by-slug`, and `photo-upload` were also deployed on `2026-05-08`.
- Canonical production smoke was rerun after that deploy and stayed green.
- Guests / RSVP ops proof was rerun after refreshing the guard scripts and is green on the live runtime.
- Email authorization and service-role authorization live unauthenticated-denial lanes are green after the deploys.

## Current Blocking Risks

1. Secure service-role queue/storage proof remains open because the secure proof environment has not yet been run.
2. Email queue-processing proof remains open for the same secure-env reason.

## Proof And Deployment Summary

### Local proof status

- `npm run typecheck -- --pretty false`: `PASS`
- `npm run lint -- --quiet`: `PASS`
- `npm run build`: `PASS`
- `npm run proof:v1:public-access-coverage`: `PASS`
- Public render-model / leak / SiteView regression tests: `PASS`
- `npm run proof:v1:service-role-authorization`: `PASS` with secure-env sub-proof still pending
- `npm run proof:v1:email-messaging-authorization`: `PASS` with secure-env sub-proof still pending
- `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts`: `PASS`

### Live proof status

- Preview web deploy for `71cd556c`: `LIVE PASS`
- `public-site-access` deploy: `LIVE PASS`
- `interactive-section-public` deploy: `LIVE PASS`
- `vault-contribution-public` deploy: `LIVE PASS`
- `process-email-queue` deploy: `LIVE PASS`
- `public-itinerary-by-slug` deploy: `LIVE PASS`
- `photo-upload` deploy: `LIVE PASS`
- `npm run proof:v1:canonical-smoke`: `LIVE PASS` after `public-site-access` deploy
- `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`
- `npm run proof:v1:email-messaging-authorization`: `LIVE PASS` for unauthenticated denial, with secure-env blocker still open
- `npm run proof:v1:service-role-authorization`: `LIVE PASS` for unauthenticated denial, with secure-env blocker still open
- `vercel env ls production --format json`: `PASS` for env-name inventory; confirmed no `SUPABASE_SERVICE_ROLE_KEY`-style secret is present in connected Vercel production env
- `supabase secrets list --project-ref atuzuobpprjstfmdnwso`: `FAIL` from this workspace because `SUPABASE_ACCESS_TOKEN` / authenticated CLI access is unavailable

### Still not complete

- Secure service-role queue/storage deep proof in a secure proof environment
- Secure email queue-processing deep proof in a secure proof environment
- The remaining final launch decision depends on the two secure-env proof lanes only

## Active Control Position

The hardening mandate is still:

1. Finish secure service-role queue/storage proof.
2. Finish secure email queue-processing proof.
3. Keep the current validation matrix fresh as code changes.
4. Keep the asset budget green as code changes.

Additional dashboard extraction work stays de-prioritized unless it directly removes one of those blockers.

## Document Map

- Active control board: [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- Historical hardening diary / extraction log archive: [docs/PRODUCTION_HARDENING_CHANGELOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md)
- Smoke and proof history: [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)

## Results Recorded For This Wave

- `npm run proof:v1:public-access-coverage`: `PASS`
- `npm run proof:v1:service-role-authorization`: `PASS` with secure-env blocker still open
- `npm run proof:v1:email-messaging-authorization`: `PASS` with secure-env blocker still open
- `public-site-access` deploy: `PASS`
- `npm run proof:v1:canonical-smoke`: `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`
- `interactive-section-public` deploy: `PASS`
- `vault-contribution-public` deploy: `PASS`
- `process-email-queue` deploy: `PASS`
- `public-itinerary-by-slug` deploy: `PASS`
- `photo-upload` deploy: `PASS`

This report stays focused on launch truth. Historical extraction detail belongs in the changelog, not here.
