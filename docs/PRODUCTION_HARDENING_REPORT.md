# Production Hardening Report

_Updated:_ 2026-05-09
_Branch carrying current local launch-control truth:_ `codex/v1-finish-hard-gates`
_Latest commit:_ `9c976a26` `Tighten public site render boundary`
_Latest runtime deploy:_ Vercel `dpl_68n9YLtWy67VxmqziaVYQAACKHqL` plus `public-site-access` redeploy with `--no-verify-jwt`

## Current Verdict

- **Readiness score:** `8.9 / 10`
- **Launch verdict:** `HOLD`
- **Production-ready:** `NO`

This is a meaningfully stronger production posture than the repo had before the final hardening push, but it is still not a true `10 / 10` launch state. The production deploy is live, the strict public render DTO is now live-validated, canonical smoke is green, public-quality is green, and guests / RSVP ops is green. The repo's proof board now narrows the only active ungated launch blocker to the secure service-role queue/storage lane; the remaining work after that is launch-control closeout, not the main public-site payload path.

## What Changed In The Final Hardening Phase

### 1. Public/runtime hardening moved from theory to live runtime

- The production web app is live at [dayof.love](https://dayof.love).
- `public-site-access`, `interactive-section-public`, and `vault-contribution-public` were deployed and aligned with the live web runtime.
- `process-email-queue`, `public-itinerary-by-slug`, and `photo-upload` were also deployed in the same hardening wave.
- `public-site-access` needed one more runtime policy correction: it was redeployed with `--no-verify-jwt` so the publishable-key browser path would resolve in production instead of failing before the handler.
- Canonical smoke, guests / RSVP ops, and public-quality were rerun after deploy alignment and all passed.

### 2. Public payload handling improved again and is now live-validated

- The main public site lane no longer returns raw top-level `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs directly.
- The browser now consumes a stricter server-built public DTO shaped as public `pages`, `wedding`, and `theme`.
- `SiteView` no longer hydrates from `builderProject`, `weddingData`, or `layoutConfig`.
- Legacy client-side public site reads are quarantined to metadata-only columns.
- Existing leak-focused tests, `SiteView` regression tests, and public-access static proof are green locally.
- The browser-side `publicSiteAccess` helper was switched onto the shared Supabase client path so it no longer relies on a raw `Authorization` header pattern that production rejected.
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` is now green, including:
  - demo site guest-ready desktop/mobile proof
  - owner preview banner continuity
  - proof site canonical row identity over stale embedded snapshots

### 3. Authorization proof improved, but one secure deep-proof lane remains open

- `npm run proof:v1:service-role-authorization` is green for the unauthenticated denial lane, including live runtime proof.
- `npm run proof:v1:email-messaging-authorization` is green for the unauthenticated denial lane, including live runtime proof.
- Historical hardening records indicate earlier secure proof coverage, but the current launch-signoff bar still needs a fresh secure-env rerun for:
  - queue/storage containment
  - cross-site mutation resistance
  - queue-processing integrity
  - recipient scoping and collaborator restrictions

## Current Blocking Risks

1. **Secure service-role queue/storage proof is not freshly rerun**
   - Runtime deep proof still requires `SUPABASE_SERVICE_ROLE_KEY`.
   - This workspace does not have that secret.
   - This is the only active ungated launch blocker left in the repo proof board.

2. **Secure email queue-processing deep proof is still folded into that secure lane**
   - The unauthenticated denial proof is already green live.
   - The remaining queue-processing deep proof still needs the same secure secret-backed rerun, so it is not tracked separately from the open service-role lane in the canonical proof board.

3. **Deployment / validation / asset closeout is improved but not final**
   - Production deploy state is far clearer than before.
   - The board still needs the remaining launch-critical secure proof plus final wording closeout before we can claim full launch confidence.

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
- `public-site-access` production browser resolution: `LIVE PASS` after redeploying with `--no-verify-jwt`
- `npm run proof:v1:service-role-authorization`: `LIVE PASS` for unauthenticated denial; deep secure proof still open
- `npm run proof:v1:email-messaging-authorization`: `LIVE PASS` for unauthenticated denial; deep secure proof still open

### Secure-env blockers

- `SUPABASE_SERVICE_ROLE_KEY` is not present in the local workspace env.
- Connected Vercel env inventories did not expose a service-role-style secret.
- Supabase control-plane secret inspection remains blocked because `SUPABASE_ACCESS_TOKEN` or an authenticated Supabase CLI session is not available from this workspace.

## Launch-Control Position

The hardening mandate is now intentionally narrower and tougher:

1. Finish secure service-role queue/storage proof.
2. Keep deployment state canonical.
3. Keep validation state canonical.
4. Close asset/CDN launch questions.
5. Commit and push the final launch-control truth updates.

Broad dashboard extraction, route decomposition, and cosmetic cleanup stay out of the launch lane unless they directly remove one of those blockers.

## Document Map

- Active control board: [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- Historical hardening diary / extraction archive: [docs/PRODUCTION_HARDENING_CHANGELOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md)
- Smoke and proof history: [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)
- Residual public-access inventory: [docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md)

## Bottom Line

We are no longer in the vague middle. The remaining launch work is specific:

- rerun secure service-role deep proof
- close deployment / validation / asset sign-off

Until those are done, this stays a strong `8.9 / 10` system with real production progress, not a `10 / 10` launch-safe finish.
