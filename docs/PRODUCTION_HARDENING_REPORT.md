# Production Hardening Report

_Updated:_ 2026-05-09
_Branch carrying latest pushed work:_ `codex/v1-finish-hard-gates-2`
_Latest commit:_ `96abd2e5` `Update live smoke public copy expectations`
_Latest runtime deploy commit:_ `debfed68` `Harden public access and launch control`

## Current Verdict

- **Readiness score:** `8.5 / 10`
- **Launch verdict:** `HOLD`
- **Production-ready:** `NO`

This is a stronger production posture than the repo had before the final hardening push, but it is not a true `10 / 10` launch state yet. The production deploy is live, the public-function alignment work landed, canonical smoke is green, public-quality is green, and guests / RSVP ops is green. The strict public render DTO is now implemented and proven locally, but it has not yet been redeployed or live-validated. Secure deep proof for service-role containment and email queue-processing also remains open because the secure proof environment is unavailable from this workspace.

## What Changed In The Final Hardening Phase

### 1. Public/runtime hardening moved from theory to live runtime

- The production web app is live at [dayof.love](https://dayof.love).
- `public-site-access`, `interactive-section-public`, and `vault-contribution-public` were deployed and aligned with the live web runtime.
- `process-email-queue`, `public-itinerary-by-slug`, and `photo-upload` were also deployed in the same hardening wave.
- Canonical smoke and public-quality were rerun after deploy alignment and both passed.

### 2. Public payload handling improved again and is code-complete locally

- The main public site lane no longer returns raw top-level `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs directly.
- The browser now consumes a stricter server-built public DTO shaped as public `pages`, `wedding`, and `theme`.
- `SiteView` no longer hydrates from `builderProject`, `weddingData`, or `layoutConfig`.
- Legacy client-side public site reads are quarantined to metadata-only columns.
- Existing leak-focused tests, `SiteView` regression tests, and public-access static proof are green locally.
- This is still not fully closed because the stricter DTO is local-only until it is redeployed and rerun through live proof.

### 3. Authorization proof improved, but deep secure proof remains open

- `npm run proof:v1:service-role-authorization` is green for the unauthenticated denial lane, including live runtime proof.
- `npm run proof:v1:email-messaging-authorization` is green for the unauthenticated denial lane, including live runtime proof.
- Historical hardening records indicate earlier secure proof coverage, but the current launch-signoff bar still needs a fresh secure-env rerun for:
  - queue/storage containment
  - cross-site mutation resistance
  - queue-processing integrity
  - recipient scoping and collaborator restrictions

## Current Blocking Risks

1. **Strict public render DTO is not yet live-validated**
   - The stricter render-only DTO is implemented locally, but production still runs the older deployed public contract until the next approved deploy.
   - Remaining work:
     - deploy the stricter public DTO changes
     - rerun live smoke/public-quality
     - only reopen code trimming if live proof exposes remaining broad payload risk

2. **Secure service-role queue/storage proof is not freshly rerun**
   - Runtime deep proof still requires `SUPABASE_SERVICE_ROLE_KEY`.
   - This workspace does not have that secret.

3. **Secure email queue-processing proof is not freshly rerun**
   - Runtime deep proof still requires `SUPABASE_SERVICE_ROLE_KEY`.
   - This workspace does not have that secret.

4. **Deployment / validation / asset closeout is improved but not final**
   - Production deploy state is far clearer than before.
   - The board still needs the remaining launch-critical proof and public-payload closeout before we can claim full launch confidence.

## Current Proof And Deployment Summary

### Local proof status

- `npm run typecheck -- --pretty false`: `PASS`
- `npm run lint -- --quiet`: `PASS`
- `npm run build`: `PASS`
- `npm run proof:v1:public-access-coverage`: `PASS`
- public render-model / leak / SiteView regression tests: `PASS`
- `npm run proof:v1:performance-budget`: `PASS`
- `npm run proof:v1:board:md`: current-board guard, rerun after every board update

### Live proof status

- production web deploy at [dayof.love](https://dayof.love): `LIVE`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`
- `npm run proof:v1:service-role-authorization`: `LIVE PASS` for unauthenticated denial; deep secure proof still open
- `npm run proof:v1:email-messaging-authorization`: `LIVE PASS` for unauthenticated denial; deep secure proof still open

### Secure-env blockers

- `SUPABASE_SERVICE_ROLE_KEY` is not present in the local workspace env.
- Connected Vercel env inventories did not expose a service-role-style secret.
- Supabase control-plane secret inspection remains blocked because `SUPABASE_ACCESS_TOKEN` or an authenticated Supabase CLI session is not available from this workspace.

## Launch-Control Position

The hardening mandate is now intentionally narrower and tougher:

1. Deploy and live-validate strict public payload minimization.
2. Finish secure service-role queue/storage proof.
3. Finish secure email queue-processing proof.
4. Keep deployment state canonical.
5. Keep validation state canonical.
6. Close asset/CDN launch questions.

Broad dashboard extraction, route decomposition, and cosmetic cleanup stay out of the launch lane unless they directly remove one of those blockers.

## Document Map

- Active control board: [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- Historical hardening diary / extraction archive: [docs/PRODUCTION_HARDENING_CHANGELOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md)
- Smoke and proof history: [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)
- Residual public-access inventory: [docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md)

## Bottom Line

We are no longer in the vague middle. The remaining launch work is specific:

- finish the final strict public render-model reduction
- rerun secure service-role deep proof
- rerun secure email deep proof
- close deployment / validation / asset sign-off

Until those are done, this stays a strong `8.3 / 10` system with real production progress, not a `10 / 10` launch-safe finish.
