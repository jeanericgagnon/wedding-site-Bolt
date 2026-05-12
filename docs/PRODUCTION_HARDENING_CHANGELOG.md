# Production Hardening Changelog

_Archived on:_ 2026-05-08 10:56 AM PT
_Source:_ previous `BACKLOG.md` chronological hardening log before control-board rewrite

This file preserves timestamped historical entries, extraction batches, and no-deploy work notes that were removed from the active control board. The operational launch status now lives in [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md).

---

# Production Hardening Backlog

## 2026-05-11 05:50 PM PT - Canonical Client-RLS Matrix Proof Added

- Status: `PROOF EXPANDED`
- What changed:
  - added `scripts/v1-proof-client-rls-matrix.mjs`
  - added `npm run proof:v1:client-rls-matrix`
  - updated the service-role disposition doc so it no longer understates current live client-facing proof
  - added focused tests for the new matrix script and the updated disposition expectations
- Proof result:
  - `npm test -- --run src/lib/clientRlsMatrixProofScript.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts` -> `PASS`
  - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Launch effect:
  - no launch-state change
  - the client-RLS backlog item now has one canonical live baseline command instead of scattered proof references

## 2026-05-11 06:06 PM PT - Guest Direct-Write RLS Coverage Added

- Status: `PROOF EXPANDED`
- What changed:
  - expanded `tests/e2e/collaborator-permission-rls.spec.ts`
  - added `src/lib/collaboratorPermissionRlsProof.test.ts`
  - broadened `scripts/v1-proof-collaborator-runtime.mjs` and `scripts/v1-proof-client-rls-matrix.mjs` coverage wording
  - updated the service-role disposition and launch board/report to reflect the sharper live RLS baseline
- Proof result:
  - `npm test -- --run src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts` -> `PASS`
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Launch effect:
  - no launch-state change
  - the remaining client-RLS expansion gap is now explicitly planning/seating/non-guest direct-write coverage rather than the whole guest dashboard write surface

## 2026-05-11 06:16 PM PT - Guest Dashboard Settings RPC Batch (Local Only)

- Status: `LOCAL PASS / DEPLOY REQUIRED`
- What changed:
  - added migration `20260511200000_guest_dashboard_settings_rpcs.sql`
  - moved guest-dashboard RSVP-config and reminder-settings writes off raw `wedding_sites` updates and behind guest-scoped RPCs
  - expanded the collaborator permission proof to assert direct settings writes fail closed while the new RPC path is the intended write lane
- Proof result:
  - `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run lint -- --quiet` -> `PASS`
- Launch effect:
  - no live-state change yet
  - migration apply, deploy, and fresh live collaborator/client-RLS proof are still required before this batch can be counted as runtime hardening

## 2026-05-11 06:24 PM PT - Planning And Seating Direct-Write RLS Coverage Added

- Status: `PROOF EXPANDED`
- What changed:
  - expanded `tests/e2e/collaborator-permission-rls.spec.ts` so the live collaborator runtime lane now proves planner direct `planning_tasks` writes and coordinator direct `seating_events` / `seating_tables` writes
  - tightened `src/lib/collaboratorPermissionRlsProof.test.ts`, `src/lib/clientRlsMatrixProofScript.test.ts`, `scripts/v1-proof-collaborator-runtime.mjs`, and `scripts/v1-proof-client-rls-matrix.mjs` so that broader role-scoped proof stays canonical
  - split the undeployed guest-dashboard settings RPC assertions behind `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` so live runtime proof stays honest until that migration is actually applied
- Proof result:
  - `npm test -- --run src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts` -> `PASS`
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Launch effect:
  - no launch-state change
  - the remaining RLS expansion gap is now narrowed to the undeployed guest-dashboard settings RPC batch plus broader non-guest surfaces beyond guest/planning/seating

## 2026-05-11 06:35 PM PT - Planning And Seating Core Write RPC Batch (Local Only)

- Status: `LOCAL PASS / DEPLOY REQUIRED`
- What changed:
  - added migration `20260511211500_planning_seating_write_rpcs.sql`
  - moved `planning_tasks` writes in `planningService.ts` behind `planning_task_write` / `planning_task_delete`
  - moved `seating_events` and `seating_tables` writes in `seatingService.ts` behind `seating_event_get_or_create`, `seating_event_update`, `seating_table_write`, `seating_table_delete`, and `seating_table_bulk_create`
  - added focused service proof in `planningService.test.ts` and `seatingService.test.ts`
- Proof result:
  - `npm test -- --run src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/seating/seatingService.test.ts` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run lint -- --quiet` -> `PASS`
  - `npm run build` -> `PASS`
- Launch effect:
  - no live-state change yet
  - migration apply, deploy, and fresh live proof are still required before this batch can be counted as runtime hardening

## 2026-05-11 05:45 PM PT - Internal Tooling Route Production Gating

- Status: `RESOLVED`
- What changed:
  - added shared helper `src/lib/internalToolingRoutes.ts`
  - gated `/builder-v2-lab`, `/variant-preview-capture`, and `/template-scroll-capture` behind local-dev or explicit `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
  - removed public template links that would otherwise point at internal capture surfaces when the gate is off
  - gated builder variant preview links the same way
  - added focused proof for the helper and route/link boundary
- Proof result:
  - `npm test -- --run src/lib/internalToolingRoutes.test.ts src/lib/internalToolingRouteBoundary.test.ts src/lib/launchControlMatrices.test.ts src/lib/proofBoardFreshness.test.ts` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run lint -- --quiet` -> `PASS`
  - `npm run build` -> `PASS`
  - `npm run proof:v1:board:md` -> `PASS`
  - `git diff --check` -> `PASS`
- Launch effect:
  - no launch-state change
  - this closes the exposed internal/lab/capture route finding without reopening the launch baseline

## 2026-05-11 05:33 PM PT - Live Blocker-Fix Deploy And Release Gate Closure

- Status: `RESOLVED`
- What changed:
  - pushed blocker-fix runtime commit `f0cbf841` and promoted Vercel production deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
  - applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`
  - deployed `submit-rsvp --no-verify-jwt`
  - reran live `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, and `guest-lookup-scope`
  - configured GitHub Actions `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets for the release gate
  - proved `Release Launch Gate` green in Actions
  - fixed the Linux shell portability bug in `scripts/v1-proof-guests-rsvp-ops.mjs`
- Result:
  - payment fail-open is closed in live frontend runtime
  - RSVP capacity serialization is closed in live function/database runtime
  - release-gate Supabase RSVP proof is enforced and green
  - launch verdict returned to `GO`; production-ready returned to `YES`

## 2026-05-11 05:06 PM PT - Reopened Billing / RSVP / Release-Gate Fix Batch

- Status: `LOCAL PASS / DEPLOY REQUIRED`
- What changed:
  - fixed the payment gate so billing lookup failures no longer degrade to fake paid access
  - changed `PaymentRequired` to surface a billing-unavailable hold state
  - added focused route proof for the new billing failure behavior
  - added migration `20260511170500_serialize_submit_rsvp_capacity.sql`
  - switched `submit-rsvp` onto `apply_public_rsvp_capacity_decision(...)`
  - added focused proof for the serialized RSVP capacity path
  - added `.github/workflows/release-launch-gate.yml` so release cannot skip strict Supabase-backed RSVP smoke
  - reran focused blocker tests, `npm test`, `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `board:md`, `git diff --check`, and `test:smoke`
- Result:
  - the reopened blockers are fixed in the current working tree and proven locally
  - launch stays `HOLD` because the live runtime is still on exact frontend SHA `23bee092` until this batch is committed, deployed, and rerun through live proof

## 2026-05-11 03:42 PM PT - Exact-SHA Launch Closeout And Vault Lane Downgrade

- Status: `RESOLVED WITH DEFERRED NON-LAUNCH FOLLOW-UP`
- What changed:
  - fixed the remaining local suite drift so `npm test` now passes end to end
  - committed and pushed exact runtime SHA `23bee092` (`Stabilize final proof suite and runtime safety`)
  - promoted Vercel production deploy `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4`
  - redeployed `public-site-access --no-verify-jwt`
  - reran the secure proof bundle with the provided secure key:
    - `npm run proof:v1:service-role-authorization`
    - `npm run proof:v1:email-messaging-authorization`
    - `npm run proof:v1:launch-closeout`
  - reran postdeploy live proof:
    - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
    - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`
    - `npm run proof:v1:guests-rsvp-ops`
    - `npm run proof:v1:guest-lookup-scope`
    - `npm run proof:v1:collaborator-runtime`
- Vault truth discovered in the same sweep:
  - attempted redeploys for `vault-contribution-public --no-verify-jwt` and `vault-entry-submit --no-verify-jwt` reported success
  - direct runtime probe still returned `404 NOT_FOUND` for `vault-contribution-public`
  - `supabase functions list` still did not show `vault-contribution-public`
  - live vault write/read proof still failed closed on the unavailable route
- Launch effect:
  - exact frontend runtime SHA is now known
  - launch remains `GO`
  - production-ready remains `YES`
  - public vault contribution is explicitly downgraded to deferred/non-launch instead of being counted as launch-ready

## 2026-05-11 02:36 PM PT - AI Provider Confidence Sweep

- Status: `PROOF REFRESHED`
- What changed:
  - reran `npm run proof:v1:ai-product-readiness`
  - reran `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`
- Proof result:
  - `ai-product-readiness` passed `25/25`
  - live AI clearance passed with no blockers and confirmed the current AI/photo column exposure state is green
- Launch effect:
  - no launch-state change
  - AI/provider proof is now fresh same-day evidence in the active board

## 2026-05-11 02:27 PM PT - Translation Route Live Proof Closeout

- Status: `RESOLVED`
- What changed:
  - updated `supabase/functions/translate-site-content/index.ts` with a source-hash ready-row fast path so unchanged owner-triggered translations return the saved `site_translations` row immediately instead of redoing the provider round-trip
  - redeployed `translate-site-content` to Supabase project `atuzuobpprjstfmdnwso`
  - reran `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`
- Acceptance/proof result:
  - previous live translation check returned `504` while the row eventually read back as `ready`
  - after the deploy, `site-translation-live-model-success-safe-response` returned `200`
  - the full secure AI proof bundle passed `17/17`
- Launch effect:
  - launch status is unchanged but stronger: `GO`
  - production-ready remains `YES`
  - the translation-route defer is removed from the active control board

## 2026-05-11 02:34 PM PT - Subdomain Route Parsing Hardening

- Status: `LOCAL PROOF ADDED`
- What changed:
  - added `resolveWeddingSubdomainSlugFromHostname(...)` to `src/lib/publicSiteSlug.ts`
  - updated `src/App.tsx` and `src/pages/SiteView.tsx` to use the shared helper for `.dayof.love` host parsing
  - added focused coverage in `src/lib/publicSiteSlug.test.ts`
- Proof result:
  - local tests now pin the shipped subdomain route behavior for apex, `www`, mixed-case, and non-DayOf hosts
- Launch effect:
  - no launch-state change
  - custom-host DNS reruns remain deferred and non-launch

## 2026-05-11 02:33 PM PT - Runtime Inventory Proof Sweep

- Status: `PROOF ADDED`
- What changed:
  - ran `npm run proof:v1:data-integrity`
  - ran `npm run proof:v1:prereqs`
- Proof result:
  - `data-integrity` passed in anon-limited mode without any hard launch corruption
  - `prereqs` passed with required migrations, local functions, live REST tables, and edge deployment reachability all green
- Launch effect:
  - no launch-state change
  - runtime inventory confidence is stronger and now recorded in the active board/report

## 2026-05-11 02:02 PM PT - Final Launch-Control Closeout And Guest Contact Runtime Reopen

- Status: `PARTIAL`
- What changed:
  - closed `P1-04 Public section DTO minimization` after the final explicit per-family public settings/nested DTO review across the remaining guest-rendered section families
  - closed `P1-09 Deployment / proof truth canonicalization` by rewriting the launch board/report/proof log around one canonical branch/SHA/deploy/proof matrix
  - extended `scripts/v1-proof-guest-lookup-scope.mjs` so the live proof now covers both public lookup scope and signed-session contact submit / household update scope
  - redeployed `guest-contact-lookup --no-verify-jwt` and `guest-contact-submit --no-verify-jwt`
  - reran the live guest contact proof and discovered the still-open runtime blocker: production continues returning `401 UNAUTHORIZED_NO_AUTH_HEADER` on `guest-contact-lookup`
- Acceptance/proof target:
  - `npm run proof:v1:public-access-coverage`: PASS
  - `npm run typecheck -- --pretty false`: PASS
  - `npm run lint -- --quiet`: PASS
  - `npm run build`: PASS
  - `npm run test:security`: PASS
  - `npm run test:smoke`: PASS
  - `npm run proof:v1:service-role-authorization`: PASS
  - `npm run proof:v1:email-messaging-authorization`: PASS
  - `npm run proof:v1:launch-closeout`: PASS
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: LIVE PASS
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: LIVE PASS
  - `npm run proof:v1:guests-rsvp-ops`: LIVE PASS
  - `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts`: LIVE PASS
  - `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts`: LIVE PASS
  - `npm run proof:v1:registry-preview-ssrf`: LIVE PASS
  - `npm run proof:v1:guest-lookup-scope`: FAIL, `401 UNAUTHORIZED_NO_AUTH_HEADER`
- Launch status:
  - `HOLD`
  - production-ready remains `NO`
  - only active launch blocker is the live guest contact public-flow auth mismatch

## 2026-05-11 02:16 PM PT - Guest Contact Public Runtime Closeout

- Status: `RESOLVED`
- What changed:
  - confirmed the earlier `guest-contact-lookup` deploy had not actually produced a fresh runtime version
  - forced a real lookup function version bump, redeployed `guest-contact-lookup --no-verify-jwt`, and confirmed the live version advanced
  - redeployed `guest-contact-submit --no-verify-jwt` in the same closeout lane
  - reran `npm run proof:v1:guest-lookup-scope` and got a full live pass:
    - partial-name lookup blocked
    - mismatched-name lookup blocked
    - reversed-name lookup blocked
    - exact-match lookup returns a signed contact session
    - contact-session submit updates the intended household rows only
- Acceptance/proof target:
  - `npm run proof:v1:guest-lookup-scope`: LIVE PASS
  - `npm run proof:v1:public-access-coverage`: PASS
  - `npm run proof:v1:board:md`: PASS
  - `git diff --check`: PASS
- Launch status:
  - `GO`
  - production-ready is now `YES`
  - no active `P0` or `P1` blockers remain

## 2026-05-11 08:36 AM PT - Public Sections Side Door Closeout, Deploy Alignment, And Remote Policy Removal

- Status: `PARTIAL`
- What changed:
  - Removed the public `sections` browser-read fallback from `SiteView`.
  - Moved persisted published-section fallback into the server-side `public-site-access` function.
  - Tightened the public DTO by removing `wedding.meta`, `customCss`, `customClassName`, and `styleRecipeCss` from the browser contract.
  - Added `20260511113000_remove_public_sections_visible_read.sql` and pushed it remotely with `supabase db push`, removing the old anonymous/public `sections` read policy from the linked database.
  - Redeployed `public-site-access`, redeployed the production web app, reran the live public proof lane, and updated launch-control docs to reflect the new finish state.
- Acceptance/proof target:
  - focused public DTO / leak / boundary tests: PASS
  - `npm run proof:v1:public-access-coverage`: PASS
  - `npm run typecheck -- --pretty false`: PASS
  - `npm run lint -- --quiet`: PASS
  - `npm run build`: PASS
  - `supabase functions deploy public-site-access --no-verify-jwt`: PASS
  - `vercel deploy --prod`: PASS, `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`
  - `supabase db push`: PASS, `20260511113000_remove_public_sections_visible_read.sql` applied remotely
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: LIVE PASS
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: LIVE PASS
  - `npm run proof:v1:guests-rsvp-ops`: LIVE PASS
  - `npm run proof:v1:service-role-authorization`: PASS for unauthenticated denial; secure deep proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY`
  - `npm run proof:v1:email-messaging-authorization`: PASS for unauthenticated denial; secure deep proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY`
  - Remaining open blocker is now the secure secret-backed authorization lane only.

## 2026-05-11 08:50 AM PT - Broad Proof Sweep And Static Guard Rebase

- Status: `PARTIAL`
- What changed:
  - Rebased stale `registry` and `comms-center` guard scripts onto the current ownership layout after route/action-hook refactors.
  - Reran `collaborator-access`, `coordinator-dayof`, `seating-continuity`, `registry`, and `comms-center` successfully.
  - Confirmed `prereqs` and `data-integrity` were only failing inside sandboxed fetch conditions; both passed when rerun with network access.
  - Confirmed `ai-product-readiness` remains green and live `ai-clearance` is now green with `launchCleared: true`.
- Acceptance/proof target:
  - `npm run proof:v1:collaborator-access`: PASS
  - `npm run proof:v1:coordinator-dayof`: PASS
  - `npm run proof:v1:seating-continuity`: PASS
  - `npm run proof:v1:registry`: PASS
  - `npm run proof:v1:comms-center`: PASS
  - `npm run proof:v1:prereqs`: PASS
  - `npm run proof:v1:data-integrity`: PASS in anon-limited mode
  - `npm run proof:v1:ai-product-readiness`: PASS
  - `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`: LIVE PASS
  - Remaining hard blocker stays the secure secret-backed service-role/email authorization lane.

## 2026-05-11 08:04 AM PT - Website-Finish Audit Reopened Public Sections Bypass

- Status: `PARTIAL`
- What changed:
  - Re-audited the current launch shape against the actual public route code instead of only the already-green live smoke lane.
  - Reopened the launch backlog around the real website-finish blockers:
    - public `sections` browser-read fallback still exists in `SiteView`
    - the current public `sections` RLS policy only checks `visible = true` and `is_published = true`
    - the server public DTO still sends `wedding.meta` wholesale
    - secure service-role and secure email deep proof are still blocked by missing secure env secrets
  - Rewrote `BACKLOG.md` into an exhaustive finish-the-website board with critical vs non-critical work, exact proofs, and explicit finish order.
  - Updated the production hardening report and public access residual audit so they no longer overstate the current public boundary.
- Acceptance/proof target:
  - Backlog/report/audit truth now matches the code audit.
  - `git diff --check` should stay green after the docs rewrite.
  - No deploy was run.

## 2026-05-11 07:47 AM PT - Allowlist DTO Live Pass And Final Blocker Narrowing

- Status: `PARTIAL`
- What changed:
  - Replaced the shared public render builder's broad section-shaping path with manifest-driven allowlisting for public section settings, bindings, style overrides, wedding payloads, and theme tokens.
  - Tightened published-site precedence so `published_json.weddingDataSnapshot` / `published_json.weddingData` dominate over `row.wedding_data`, with canonical row identity layered after that.
  - Constrained legacy `layout_config` fallback to published legacy payloads and converted it through the same public allowlist builder.
  - Fixed Supabase edge bundling for the stricter DTO lane by swapping the function path away from the heavy section registry import chain and onto manifest-based shaping.
  - Redeployed `public-site-access`, promoted the latest production web deploy, reran the live public proof lane, and narrowed the active ungated launch blocker set back down to the secure service-role queue/storage proof.
- Acceptance/proof target:
  - `npm test -- --run src/lib/publicSiteRenderModel.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS.
  - `npm run proof:v1:public-access-coverage`: PASS.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `supabase functions deploy public-site-access --no-verify-jwt`: PASS.
  - `vercel deploy --prod --yes`: PASS, `dpl_JBor9yy1TBoXwQvRnvTjkijRBLe1`.
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: LIVE PASS.
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: LIVE PASS.
  - `npm run proof:v1:guests-rsvp-ops`: LIVE PASS.
  - `npm run proof:v1:service-role-authorization`: LIVE PASS for unauthenticated denial; secure deep proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY`.
  - `npm run proof:v1:email-messaging-authorization`: LIVE PASS for unauthenticated denial; secure queue-processing deep proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY`.

## 2026-05-11 07:20 AM PT - Launch-Control Recalibration To 8.7 / 10

- Status: `PARTIAL`
- What changed:
  - Reopened the public DTO lane in the launch-control docs as an active hardening blocker instead of treating it as fully closed.
  - Tightened the operational truth: the app is materially safer and live public proof is green, but the current public render path is still not allowlist-only and therefore not yet a true `10 / 10` launch-safe system.
  - Recorded the specific remaining DTO weaknesses called out in the final hardening mandate:
    - blacklist-style sanitization still exists
    - public section `settings` are not yet explicitly allowlisted
    - published-site wedding data precedence is still not strict enough
    - `layout_config` fallback is still not fully removed or tightly constrained
    - deployment/proof truth is better, but final launch-control wording still needs full canonical closeout
- Acceptance/proof target:
  - `BACKLOG.md` and `docs/PRODUCTION_HARDENING_REPORT.md` reflect the stricter `8.7 / 10` posture and the reopened DTO hardening work.
  - `npm run proof:v1:board:md` stays green.
  - `git diff --check` stays green.
  - No deploy was run.

## 2026-05-08 10:16 AM PT - No-Deploy Coordinator Route-Support Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/CoordinatorMode.tsx` no longer owns the inline coordinator capability-gate block for check-in, Q&A, timeline, and alert permissions.
  - Added `src/pages/dashboard/coordinator/buildCoordinatorDashboardRouteSupport.ts` so the new helper now owns the coordinator role/permission gate seam while the route keeps bootstrap, derived state, alert validation, focus/board actions, cue lifecycle, and route-content prop assembly.
  - Coordinator boundary tests now pin `buildCoordinatorDashboardRouteSupport({ ... })`, check that the new helper owns the coordinator capability-gate seam, and reject regaining the old inline permission block in `CoordinatorMode.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 10:11 AM PT - No-Deploy Coordinator Route-Content Props Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/CoordinatorMode.tsx` no longer owns the inline coordinator route-content prop assembly slab for the attention, check-in, summary, alerts, Q&A, timeline, and role-selector prop bundles.
  - Added `src/pages/dashboard/coordinator/buildCoordinatorDashboardRouteContentProps.ts` so the new helper now owns the coordinator route-content prop seam while the page keeps bootstrap, derived state, focus/board actions, cue lifecycle, and async mutation hooks.
  - Coordinator boundary tests now pin `buildCoordinatorDashboardRouteContentProps({ ... })`, check that the new helper owns the route-content prop seam, and reject regaining the old inline route-content prop block in `CoordinatorMode.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 10:09 AM PT - No-Deploy Guest Photo Route-Support Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/GuestPhotoSharing.tsx` no longer owns the inline quick-start continuation read, archive-mode derivation, quick-start overview path, or photo action-audit helper block.
  - Added `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardRouteSupport.ts` so the new hook now owns the continuation/archive/logging seam while the route keeps dashboard UI state, data loading, media shaping, and action families.
  - Guest-photo boundary tests now pin `useGuestPhotoDashboardRouteSupport({ ... })`, check that the new hook owns the continuation/archive/logging seam, and reject regaining the old inline route-support block in `GuestPhotoSharing.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 10:05 AM PT - No-Deploy Settings Route-Support Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` no longer owns the inline safe playlist preview URL, settings view-model memo, or route-level logout/navigation helper block.
  - Added `src/pages/dashboard/settings/useSettingsDashboardRouteSupport.ts` so the new hook now owns the safe-link/view-model/logout seam while the route keeps snapshot hydration, support hooks, and site/account/experience action families.
  - Settings boundary tests now pin `useSettingsDashboardRouteSupport({ ... })`, check that the new hook owns the safe-link/view-model/logout seam, and reject regaining the old inline route-support block in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 10:01 AM PT - No-Deploy Overview Route-Support Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Overview.tsx` no longer owns the inline dismissed-intelligence localStorage bootstrapping, proof-flag detection, setup checklist shaping, couple/venue label shaping, or next-step copy/action block.
  - Added `src/pages/dashboard/useOverviewDashboardRouteSupport.ts` so the new route-support file now owns dismissal/proof state in `useOverviewDashboardRouteSupport()` plus the setup checklist and next-step presentation seam in `buildOverviewDashboardRouteSupport({ ... })` while the route keeps dashboard data loading, intelligence actions, dashboard modeling, and render composition.
  - Overview boundary tests now pin `useOverviewDashboardRouteSupport()` and `buildOverviewDashboardRouteSupport({ ... })`, check that the new file owns the dismissal/proof/setup seam, and reject regaining the old inline localStorage, proof-flag, checklist, and next-step shaping block in `Overview.tsx`.
- Acceptance/proof target:
  - Focused overview/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 09:55 AM PT - No-Deploy Guest Dashboard Route-Support Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Guests.tsx` no longer owns the inline confirm-dialog, planner-role persistence, fallback itinerary-event selection, and RSVP setup planning slab.
  - Added `src/pages/dashboard/guests/useGuestDashboardRouteSupport.ts` so the new hook now owns `confirmDialog` state, `requestConfirmation(...)`, planner access-role read/write sync, fallback `effectiveItineraryEvents`, `rsvpAccessModePlan`, `recommendedRsvpAccessMode`, `rsvpQuestionTemplateCoverage`, and `rsvpSetupChecklist` while the route keeps data loading, UI state, CRUD and ops actions, route actions, overlay actions, and render composition.
  - Guest dashboard boundary tests now pin `useGuestDashboardRouteSupport({ ... })`, check that the new hook owns the confirm-dialog and RSVP setup planning seam, and reject regaining the old inline `requestConfirmation`, planner-role persistence, and RSVP access-mode/setup block in `Guests.tsx`.
- Acceptance/proof target:
  - Focused guest/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 9:33 AM PT - No-Deploy Itinerary Dashboard Route-Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Itinerary.tsx` no longer hand-renders the owner-facing itinerary shell inline.
  - Added `src/pages/dashboard/ItineraryDashboardRouteContent.tsx` so the new route-content component now owns the itinerary hero, event form, smart-template panel, bulk-shift panel, timeline quick-check, empty state, event cards, and guest-manager modal while the route keeps data hooks, UI-state hooks, derived-state helpers, timeline actions, and confirm-dialog orchestration.
  - Itinerary boundary tests now pin `<ItineraryDashboardRouteContent`, check that the new file owns the public itinerary render slab, and reject regaining the old inline `DashboardPageHero` / empty-state / event-card / modal markup in `Itinerary.tsx`.
- Acceptance/proof target:
  - Focused itinerary/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 9:23 AM PT - No-Deploy Itinerary Dashboard UI-State Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Itinerary.tsx` no longer owns the inline itinerary workspace/UI state slab for event-form visibility, edit target, album toggle, selected guest-manager event, template controls, shift controls, timeline busy state, save notices, and local form draft handling.
  - Added `src/pages/dashboard/useItineraryDashboardUiState.ts` so the new hook now owns itinerary dashboard workspace state plus `openEventForm(...)` and empty-form reset behavior while the route keeps data loading, derived-state helpers, timeline actions, and render composition.
  - Itinerary boundary tests now pin `useItineraryDashboardUiState()`, check that the new hook owns the local `useState(...)` and `openEventForm(...)` seam, and reject regaining the old inline workspace state slab in `Itinerary.tsx`.
- Acceptance/proof target:
  - Focused itinerary/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 9:19 AM PT - No-Deploy Itinerary Dashboard Derived-State Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Itinerary.tsx` no longer owns the inline timeline math, time-formatting, map-link, conflict detection, and shift-preview derived-state slab.
  - Added `src/pages/dashboard/buildItineraryDashboardDerivedState.ts` so the new helper now owns `analyzeTimeline(...)`, sorted shift preview shaping, event conflict detection, map URL generation, and itinerary time formatting while the route keeps data loading, action hooks, form state, and render composition.
  - Itinerary boundary tests now pin `buildItineraryDashboardDerivedState({ ... })`, check that the new helper owns the timeline/conflict formatting seam, and reject regaining the old inline `findConflicts(...)`, `formatTime(...)`, `getMapUrl(...)`, and timeline insight derivation block in `Itinerary.tsx`.
- Acceptance/proof target:
  - Focused itinerary/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 9:13 AM PT - No-Deploy Itinerary Dashboard Data-Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Itinerary.tsx` no longer owns the inline itinerary bootstrap and demo-persistence lane for event loading, demo hydration, and event-state bootstrapping.
  - Added `src/pages/dashboard/useItineraryDashboardData.ts` so the new hook now owns demo/live itinerary loading, demo itinerary writeback, and the `events` / `loading` dashboard state while the route keeps form state, timeline orchestration, and render composition.
  - Itinerary boundary tests now pin `useItineraryDashboardData({ isDemoMode, toast })`, check that the new hook owns `loadItineraryDashboardEvents(hasEventRsvpsTable)`, demo storage hydration, and the itinerary load error toast, and reject regaining the old inline load/bootstrap slab in `Itinerary.tsx`.
- Acceptance/proof target:
  - Focused itinerary/dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 9:08 AM PT - No-Deploy Settings UI-State Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` no longer owns the inline settings UI-state slab for tab selection, account/password fields, slug/music/privacy/RSVP state, collaborator invite state, notifications state, template state, billing state, owner-only tab fallback, billing fetch, and planner-invite restore.
  - Added `src/pages/dashboard/settings/useSettingsDashboardUiState.ts` so the new hook now owns the settings dashboard local UI state plus the billing fetch, owner-only tab fallback, and planner-invite hydration seams while the route keeps support hooks, action families, snapshot hydration, and render composition.
  - Settings boundary tests now pin `useSettingsDashboardUiState({ userId: user?.id })`, check that `useSettingsDashboardUiState.ts` owns the `fetchBillingInfo(userId)` and `readPlannerInvite(siteSlug || userId || null)` seams, and reject regaining the old inline `useState(...)` and route-owned hydration helpers in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 8:02 AM PT - No-Deploy Settings Support-Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` no longer owns the inline settings support helper cluster for collaborator invite reloads, site-id resolution, settings audit logging, translation status reloads, and text-file download export.
  - Added `src/pages/dashboard/settings/useSettingsDashboardSupport.ts` so the new hook now owns collaborator invite reloads, site-id resolution through active-site lookup, settings audit logging, translation status reloads, and text-file export plumbing while the route keeps bootstrap, tab composition, and the existing account/site/experience action families.
  - Settings boundary tests now pin `useSettingsDashboardSupport({ ... })`, check that the new hook owns the support helper seams, and reject regaining the old inline `loadCollaboratorInvites`, `resolveSettingsSiteId`, `logSettingsAction`, `loadTranslationStatuses`, and `downloadTextFile` blocks in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:58 AM PT - No-Deploy Settings Account-Actions Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` no longer owns the inline account-profile save and password update handlers.
  - Added `src/pages/dashboard/settings/useSettingsAccountActions.ts` so the new hook now owns couple-name save, password validation, authenticated current-password verification, password update, and success/error reset behavior while the route keeps settings bootstrap, tab composition, and the existing site/experience action families.
  - Settings boundary tests now pin `useSettingsAccountActions({ ... })`, check that the new hook owns the account/password service seams, and reject regaining the old inline `handleSaveAccount` and `handleUpdatePassword` handlers in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:54 AM PT - No-Deploy Vault Dashboard Data Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Vault.tsx` no longer owns the inline vault bootstrap, demo-state hydration, Drive health/connect, OAuth callback, and unlock-notice lifecycle glue.
  - Added `src/pages/dashboard/useVaultDashboardData.ts` so the new hook now owns demo/live vault loading, hosted-storage sync, Google Drive health/connect flows, OAuth completion cleanup, unlock notice state, and the shared vault dashboard state setters while the route keeps action wiring, modal state, and render composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useVaultDashboardData({ ... })`, checks that the new hook owns the demo/live vault load plus Drive/OAuth seams, and rejects regaining the old inline `checkGoogleDriveHealth`, `handleConnectGoogleDrive`, and `loadData` slabs in `Vault.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:49 AM PT - No-Deploy Planning Dashboard Actions Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Planning.tsx` no longer owns the inline task, budget, vendor, milestone, total-budget, and vendor-to-budget prompt mutation lane.
  - Added `src/pages/dashboard/planning/usePlanningDashboardActions.ts` so the new hook now owns task add/update/delete, milestone generation, budget add/update/delete, vendor add/update/delete, total-budget save, and pending vendor-to-budget prompt state while the route keeps dashboard bootstrap, starter-suite orchestration, tab routing, and name-change flows.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `usePlanningDashboardActions({ ... })`, checks that the new hook owns the task/budget/vendor action seams, and rejects regaining the old inline add-task, add-budget-item, add-vendor, and vendor-to-budget handlers in `Planning.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:42 AM PT - No-Deploy Planning Starter-Suite Hook Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Planning.tsx` no longer owns the inline starter-suite memo plus apply and undo orchestration.
  - Added `src/pages/dashboard/planning/usePlanningStarterSuiteActions.ts` so the new hook now owns starter-suite generation, apply/undo busy state, created-id tracking, demo/live record fanout, QA suffixing, and internal action-audit logging while the route keeps page composition, tab routing, and vendor-budget follow-up behavior.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `usePlanningStarterSuiteActions({ ... })`, checks that the new hook owns the starter-suite memo and applied/undone audit seams, and rejects regaining the old inline `handleApplyStarterSuite` and `handleUndoStarterSuite` handlers in `Planning.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:37 AM PT - No-Deploy Planning Vendor-Budget Prompt Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Planning.tsx` no longer owns the inline post-vendor “add this vendor to your budget” overlay.
  - Added `src/pages/dashboard/planning/PendingVendorBudgetPrompt.tsx` so that confirm/cancel modal now owns its own UI shell while the route keeps the actual vendor-to-budget follow-through logic and toast/error handling.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<PendingVendorBudgetPrompt`, checks that the new file owns the vendor-budget prompt copy, and rejects regaining that inline modal copy in `Planning.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:33 AM PT - No-Deploy Vault Card Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Vault.tsx` no longer owns the inline anniversary recap builder, entry form, and vault card rendering slab.
  - Added `src/pages/dashboard/VaultCard.tsx` so the per-vault entry surface now owns entry creation, entry unlock/read state, attachment reveal, recap draft generation/refresh, and share-link affordances while the route keeps dashboard bootstrap, Drive health/auth, list orchestration, and reminder/delete actions.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<VaultCard`, checks that the new file owns `EntryForm`, `buildAnniversaryRecap(...)`, and the vault-entry link resolution seam, and rejects regaining the old inline `VaultCard` / `EntryForm` components in `Vault.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:24 AM PT - No-Deploy Guest Photo Dashboard Props-Helper Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/GuestPhotoSharing.tsx` no longer hand-assembles the full owner-facing live-content prop bundle inline.
  - Added `src/pages/dashboard/guestPhotos/buildGuestPhotoDashboardLiveContentProps.ts` so the route now hands off the album controls, album create/list state, bucket list, follow-up, guestbook, slideshow, review, organizer, and stats prop composition through one dedicated helper while the page keeps the photo data, service calls, AI/photo actions, moderation flows, and route-level state.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `buildGuestPhotoDashboardLiveContentProps({ ... })`, checks that the new helper owns the live-content prop composition seam, and rejects regaining the old inline `albumControlsProps={{`, `bucketListProps={{`, `reviewCardProps={{`, and `slideshowCardProps={{` slabs in `GuestPhotoSharing.tsx`.
- Acceptance/proof target:
  - Focused dashboard boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:13 AM PT - No-Deploy Vault Edit-Modal Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Vault.tsx` no longer owns the vault settings modal inline.
  - Added `src/pages/dashboard/VaultEditModal.tsx` so the modal now owns vault-name edits, anniversary-year selection, custom-duration handling, and the locked-year helper copy while the page keeps vault data, entry flows, and Google Drive/archive orchestration.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<EditVaultModal`, checks that the new file owns the vault-settings modal seam, and rejects regaining the old inline modal plus `defaultVaultLabel(...)` helper in `Vault.tsx`.
- Acceptance/proof target:
  - Focused vault boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:05 AM PT - No-Deploy Planning Dashboard Tab-Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Planning.tsx` now routes its loading state and owner-facing tab switch slab through `src/pages/dashboard/planning/PlanningDashboardTabContent.tsx` instead of hand-rendering every tab surface inline.
  - `PlanningDashboardTabContent.tsx` now owns the loading skeleton plus the overview, tasks, budget, payments, vendors, songs, addresses, and name-change tab handoff while the page keeps data, mutations, role gating, starter-suite flows, and vendor-to-budget follow-up orchestration.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<PlanningDashboardTabContent`, checks that the new file owns the tab-content seam, and rejects regaining the old inline `PlanningOverviewTab` / `TasksTab` / `BudgetTab` / `NameChangePlannerTab` slab in `Planning.tsx`.
- Acceptance/proof target:
  - Focused planning boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 7:00 AM PT - No-Deploy Coordinator Dashboard Route-Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/CoordinatorMode.tsx` now routes the remaining owner-facing coordinator shell through `src/pages/dashboard/coordinator/CoordinatorDashboardRouteContent.tsx` instead of hand-rendering the hero, summary, queue, timeline, alert, and Q&A surfaces inline.
  - `CoordinatorDashboardRouteContent.tsx` now owns the coordinator hero, attention panel, handoff/helper access panels, day-of summary surface, planner/viewer banners, check-in queue shell, timeline shell, alerting shell, and Q&A shell while the route keeps orchestration, hooks, and callback wiring.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<CoordinatorDashboardRouteContent`, checks that the new file owns the hero plus core coordinator panels, and rejects regaining the old inline `DashboardPageHero` / `CoordinatorCheckInQueuePanel` / `CoordinatorDayOfSummaryPanel` slab in `CoordinatorMode.tsx`.
- Acceptance/proof target:
  - Focused coordinator boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 6:56 AM PT - No-Deploy Registry Dashboard Route-Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Registry.tsx` now routes the owner-facing registry shell through `src/pages/dashboard/registry/RegistryDashboardRouteContent.tsx` instead of hand-rendering the full dashboard body inline.
  - `RegistryDashboardRouteContent.tsx` now owns the Registry hero, review/details surfaces, guest-ready and thank-you readiness cards, search/filter toolbar, duplicate/image/review utility surfaces, and the registry item grid/empty states.
  - `Registry.tsx` now stays focused on route orchestration: dashboard data hook, derived-state helper, action hooks, bulk-import modal, item form modal, and toast lane.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<RegistryDashboardRouteContent`, checks that the new file owns the hero shell, and rejects regaining the old inline `DashboardPageHero` slab in `Registry.tsx`.
- Acceptance/proof target:
  - Focused registry boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 6:45 AM PT - No-Deploy Seating Dashboard Route-Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Seating.tsx` now routes the full owner-facing seating shell through `src/pages/dashboard/seating/SeatingDashboardRouteContent.tsx` instead of hand-rendering the full dashboard body inline.
  - `SeatingDashboardRouteContent.tsx` now owns the Seating hero, event switcher, venue/catering packet, insights, versions, table actions, check-in panel, modal shells, seat picker, board layout, and print view.
  - `Seating.tsx` now stays focused on route orchestration: data hooks, action hooks, interaction hooks, drag-drop assignment handoff, and the shared confirm dialog.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<SeatingDashboardRouteContent`, checks that the new file owns the hero plus drag/drop surface, and rejects regaining the old inline `DashboardPageHero` / `DndContext` slab in `Seating.tsx`.
- Acceptance/proof target:
  - Focused seating boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 6:38 AM PT - No-Deploy Seating Dashboard Interaction-State Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Seating.tsx` now routes its local interaction and presentation-state lane through `src/pages/dashboard/seating/useSeatingDashboardInteractionState.ts` instead of hand-owning all of that UI glue inline.
  - `useSeatingDashboardInteractionState.ts` now owns the seating route's check-in UI state, canvas zoom/fullscreen state, seat-picker state, confirmation-dialog state, saved interaction toggles, pointer sensors, and request-confirmation helper seam.
  - `Seating.tsx` keeps only the drag-drop assignment handoff and page composition while the hook now carries the local interaction state that had been bloating the route.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useSeatingDashboardInteractionState({ ... })` and rejects regaining the old inline `useState(...)` / `requestConfirmation(...)` / `useSensors(...)` interaction slab in `Seating.tsx`.
- Acceptance/proof target:
  - Focused seating boundary tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 3:26 AM PT - No-Deploy Settings Dashboard View Model Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` now routes its derived page-support state through `src/pages/dashboard/settings/buildSettingsDashboardViewModel.ts` instead of hand-assembling tabs, public site URL, planner role options, and identity export assets inline.
  - `buildSettingsDashboardViewModel.ts` now owns that derived owner-settings view-model seam, including tab visibility, public site URL derivation, template label lookup, and wedding identity export/print asset assembly.
  - `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin the `buildSettingsDashboardViewModel(...)` seam and reject regaining the old inline derived-view assembly in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 3:22 AM PT - No-Deploy Settings Dashboard Snapshot Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` now routes its bootstrap and hydration fetch path through `src/pages/dashboard/settings/loadSettingsDashboardSnapshot.ts` instead of owning the full settings snapshot load inline.
  - `loadSettingsDashboardSnapshot.ts` now owns the signed-out, demo, and live settings snapshot fetch/normalization seam, including collaborator invite hydration, translation status hydration, RSVP settings normalization, and notification/privacy defaults.
  - `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin the `loadSettingsDashboardSnapshot(...)` seam and reject regaining the old page-owned `loadSettingsSite(...)` snapshot path in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 3:15 AM PT - No-Deploy Settings RSVP Tab Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` now routes the owner-facing RSVP tab body through `src/pages/dashboard/settings/SettingsRsvpTabContent.tsx` instead of composing the meal-choice and advanced-question panels inline.
  - `SettingsRsvpTabContent.tsx` now owns that RSVP settings surface seam while preserving the existing panel composition and action wiring.
  - `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin the `SettingsRsvpTabContent` seam and reject regaining the old inline RSVP tab panel cluster in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 3:12 AM PT - No-Deploy Settings Site Tab Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` now routes the owner-facing site tab body through `src/pages/dashboard/settings/SettingsSiteTabContent.tsx` instead of composing the site-url, identity-export, privacy, and template panels inline.
  - `SettingsSiteTabContent.tsx` now owns that site settings surface seam while preserving the existing panel composition and action wiring.
  - `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin the `SettingsSiteTabContent` seam and reject regaining the old inline site-tab panel cluster in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

## 2026-05-08 3:08 AM PT - No-Deploy Settings Tab Content Extraction

- Status: `PARTIAL`
- What changed:
  - `src/pages/dashboard/Settings.tsx` now routes the owner settings tab body through `src/pages/dashboard/settings/SettingsTabContent.tsx` instead of carrying the tab switch inline.
  - `SettingsTabContent.tsx` now owns the account/team/site/rsvp/notifications/billing tab handoff seam while preserving the existing panel composition.
  - `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin the shared tab-content seam and reject regaining the old inline `activeTab === ...` rendering block in `Settings.tsx`.
- Acceptance/proof target:
  - Focused settings tests stay green.
  - Standard local gate stays green.
  - Proof board updated.
  - No deploy was run.

This backlog is organized by launch priority and is meant to drive focused production hardening work. It is intentionally implementation-oriented: each item includes the problem, risk, likely inspection areas, acceptance criteria, and a suggested approach.

## 2026-05-04 9:20 PM PT - 10/10 Production Readiness Mandate Intake

Mandate source: Eric requested the codebase move from approximately 6/10 to 10/10 production readiness, focused on security, privacy, reliability, maintainability, testability, performance, accessibility, and product quality. This is not a UI polish or aesthetic refactor lane. The operating standard is: real private wedding and guest data must be safe by design.

Core rules for all work under this lane:
- No assumptions. Prove everything.
- No frontend-only security.
- No sensitive data in browser payloads.
- Every fix must have a test or proof.
- If unsure, treat as a vulnerability.
- Do not ignore failing validation.

Required outputs for execution:
- Updated code for each resolved issue.
- `BACKLOG.md` updated after each batch with `DONE`, `PARTIAL`, or `BLOCKED`.
- `docs/PRODUCTION_HARDENING_REPORT.md` created/updated with what changed, what remains, commands run, PASS/FAIL/TIMEOUT, key errors, and final readiness verdict.
- Regression tests for access control, data exposure, and security boundaries.
- Final output must include `Final Production Readiness Score: X/10`; if below 9, list exact blockers.

Current readiness verdict for this intake:
- Status: `PARTIAL`.
- Final Production Readiness Score: 8/10 based on local hardening progress plus green approved postdeploy proof for the current non-SMS launch surface, with remaining P1/P2 work and the secure service-role queue/storage proof still open.
- Do not claim 10/10 or production-ready until every P0/P1 item below is `DONE` with tests/proof and the validation lane is recorded.

### P0 - Must Fix Before Real Users

1. `DONE` - Public site must never fail open.
   Problem: `privacy_mode` must always be available server-side, undefined privacy state must not default to public/open, and hidden sites must not leak indexing state.
   Acceptance: password site returns `password_required`; invite site returns `invite_required`; hidden site exposes no public content/indexing state. Browser payloads never receive private gate internals.
   Current evidence: local resolver selects `privacy_mode` and `hide_from_search` privately and safe payload strips gate fields; `public-site-access` was deployed and `npm run proof:v1:postdeploy` passed 8/8 at 2:15 PM PT.

2. `DONE` - Public subresources must not bypass access.
   Problem: `public-registry-items` and `public-itinerary-by-slug` must enforce the same gate logic as `public-site-access`, not just `is_published`.
   Acceptance: registry/itinerary cannot be fetched for gated sites without valid access.
   Current evidence: `public-registry-items` and `public-itinerary-by-slug` were narrowed to gate-aware access, deployed with the shared public access helper, and full postdeploy proof passed at 2:15 PM PT.

3. `DONE` - Remove unsafe RSVP session issuance.
   Problem: `lookup_guest` and name-only lookup must not create RSVP sessions from guest ID alone or name match alone.
   Acceptance: RSVP sessions require invite token or a verified server-issued flow.
   Current evidence: `lookup_guest` requires an existing short-lived session and broad name lookup no longer mints sessions; `validate-rsvp-token` was redeployed anon-callable with internal session validation and strict live RSVP smoke passed at 2:15 PM PT.

4. `DONE` - Scope RSVP lookup.
   Problem: prevent cross-site lookup and global guest enumeration.
   Acceptance: guests cannot be discovered outside one site and guest lists cannot be enumerated through search.
   Current evidence: invite lookup is now exact-token scoped, guest-facing RSVP copy now points guests to invitation-code lookup instead of name lookup, guest contact lookup is public-gate scoped and full-name exact-match only, and live `proof:v1:guest-lookup-scope` is green on the production proof site: last-name-only, mismatched full-name, and reversed-name lookups all return no matches, while exact full-name lookup returns one scoped `contact_session` plus household size without raw guest or site ids.

5. `DONE` - Rate limit lookup paths.
   Problem: name lookup, token lookup, and password attempts must be rate-limited.
   Acceptance: brute-force lookup and password probing are materially restricted.
   Current evidence: RSVP lookup/event lookup/guest lookup/submit and public-site password attempts use durable scoped rate-limit checks; live prereqs and strict RSVP proof passed after function deploy at 2:15 PM PT.

6. `DONE` - Eliminate sensitive data exposure for public/RSVP launch paths.
   Problem: browser must never receive password hashes, `guest_access_token`, `invite_token`, or internal-only fields.
   Acceptance: public browser payloads and RSVP lookup responses are minimal and regression-tested.
   Current evidence: public-site client sanitizer, launch edge static tests, hardened RSVP response shape, strict RSVP smoke, public quality proof, and full postdeploy proof passed at 2:15 PM PT. Public site invite access tokens are now removed from the browser address bar after being captured into scoped session storage. Broader settings/dashboard exposure audits remain tracked under P1/P2.

### P1 - Required For Launch

7. `PARTIAL` - Centralize access control through `public-site-access`.
   Problem: all public access must flow through the public access resolver; no bypass paths.
   Acceptance: public site, public registry, and public itinerary share the same access-state contract.
   Current evidence: major public route/subresource paths were moved toward the resolver contract, `npm run proof:v1:public-access-coverage` is green across the public subresource function set, the audit explicitly covers the resolver itself plus the signed-session `guest-contact-submit` exception, `photo-upload` no longer carries a stale published-only shortcut after the shared gate check, public interactive hub/music requests now run through `interactive-section-public` instead of direct browser table reads, vault contribution config reads now run through `vault-contribution-public` instead of direct browser access to `vault_configs`, the `PhotoUpload` guest prospect opt-in follow-up now forwards the same invite/password public-access artifacts as the upload request itself, and `src/lib/publicGuestSurfaceBoundary.test.ts` now pins that the main guest-facing pages/helpers stay off direct browser table reads and route through gated Edge Functions or resolver helpers; broader residual public-surface review is narrower but still not fully closed.

8. `PARTIAL` - Audit service-role usage.
   Problem: service-role functions must not trust client-supplied IDs and must validate access server-side.
   Acceptance: every service-role function has authorization disposition plus tests/proof.
   Current evidence: service-role inventory/disposition doc and static guard exist. Messaging and photo/media mutation functions now use shared role-aware collaborator checks that block `viewer` mutations even with stale explicit permission rows. Live unauthenticated denial proof, live limited-collaborator forbidden mutation/export proof, live planner `queue-guest-followups` allow proof, and live coordinator `photo-export-manifest` allow proof are now green; remaining proof is secure service-role storage/cross-table and queue-processing proof.

9. `DONE` - Complete SSRF hardening.
   Problem: registry preview must block IPv6/private ranges, validate DNS strictly, and rate-limit strongly.
   Acceptance: hostile private/metadata/internal/redirect/oversize/timeout targets are rejected with safe errors.
   Current evidence: local IPv6/private AAAA, reserved/special IPv4 range blocking, redirect revalidation, size/type/timeout controls, and durable rate-limit hardening exist. The live hostile-target runtime matrix is now green against `registry-preview` for metadata, localhost/subdomain, reserved host, decimal/hex/short loopback, private IPv4, IPv6 loopback, credentialed URL, and non-HTTP scheme inputs, all blocked before fetch with the safe `Enter a public product URL.` copy.

10. `PARTIAL` - Email safety.
    Problem: email HTML must be escaped, URLs validated, and subjects sanitized.
    Acceptance: all email-producing paths use shared escaping/sanitization and tests cover hostile names/body/URLs/subjects.
    Current evidence: `send-wedding-email`, `process-email-queue`, and `send-bulk-message` now import shared Edge Function email safety helpers for HTML escaping, safe URLs, href escaping, and subject sanitization. Direct wedding emails, bulk/scheduled messages, and queued guest follow-ups now reject `viewer` collaborators even when a malformed explicit `messages`/`guests` permission exists. Focused static proof, planner-access tests, typecheck, quiet lint, build, message smoke, live unauthenticated denial proof, live limited-collaborator forbidden message/follow-up proof, and live planner `queue-guest-followups` allow proof are green; remaining proof is secure queue-processing proof.

11. `PARTIAL` - Validation must pass and be recorded.
   Required commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:smoke`, `npm run smoke:registry`, `npm run smoke:rsvp`, `npm run smoke:site`, `npm run guard:file-size`.
   Acceptance: every command passes or failure is fixed/documented in `docs/PRODUCTION_HARDENING_REPORT.md`.
   Current evidence: `docs/PRODUCTION_HARDENING_REPORT.md` exists and records the latest validation lane. CI hardpass now runs typecheck, quiet lint, file-size guard, asset guard, tests, build, registry smoke, CSV mapper smoke, check-in smoke, messages smoke, and strict RSVP when secrets are present. `proof:v1:canonical-smoke`, `proof:v1:guest-lookup-scope`, `proof:v1:guests-rsvp-ops`, `proof:v1:comms-center`, `proof:v1:coordinator-dayof`, `proof:v1:registry`, `proof:v1:registry-preview-ssrf`, `proof:v1:seating-continuity`, and `proof:v1:prereqs` are green when run against the live target with network access. `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` is green again with `launchCleared: true` and `migration_applied_and_readback_green`. The remaining gaps are now narrower: secure service-role proof env for full queue/storage integrity and already-deferred provider secrets.

### P2 - Required Stability

12. `PARTIAL` - Break oversized files.
   Problem: `Guests.tsx`, `Messages.tsx`, and `Settings.tsx` remain oversized risk centers.
   Acceptance: complexity drops through feature slices without behavior regression; file-size guard baselines are lowered after splits.
   Current evidence: some message selector extraction and guardrails exist; guest-facing `RSVP.tsx` is now below the oversized threshold with a 1993-line baseline. `Guests.tsx` now has pure-helper and type/constant extractions, routes invitation/reminder send choreography through `src/pages/dashboard/guests/useGuestDashboardCampaignActions.ts`, and its baseline is down from 5430 to 2262. `Messages.tsx` now routes its full composer shell through `MessageComposerCard` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`, routes retry/send-now/reschedule/cancel/due-scheduled delivery actions through `src/pages/dashboard/messages/useMessageDeliveryActions.ts`, and its baseline is down from 3936 to 1333. `GuestPhotoSharing.tsx` now routes album creation, itinerary-album generation, moment-album creation, album activation/parenting/link regeneration, and upload-window saves through `src/pages/dashboard/guestPhotos/useGuestPhotoAlbumActions.ts`, and its baseline is down from 3018 to 1750. `Settings.tsx` now routes its planner/collaborator invite card through `src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx`, its full site-url card through `src/pages/dashboard/settings/SettingsSiteUrlPanel.tsx`, its wedding identity exports card through `src/pages/dashboard/settings/SettingsIdentityExportsPanel.tsx`, its privacy/access card through `src/pages/dashboard/settings/SettingsPrivacyPanel.tsx`, its template-switcher card through `src/pages/dashboard/settings/SettingsTemplatePanel.tsx`, its RSVP meal-choice card through `src/pages/dashboard/settings/SettingsRsvpMealPanel.tsx`, and its advanced RSVP custom-questions card through `src/pages/dashboard/settings/SettingsRsvpQuestionsPanel.tsx` instead of carrying those large owner-facing cards inline, on top of its earlier type/constant extraction and 2399-line baseline reduction. `Seating.tsx` now has helper extraction and its baseline is down from 2370 to 2334. Major file split work remains.

- 2026-05-08 04:23 AM PT - No-deploy guest dashboard check-in action extraction:
  - Resolved in this batch: moved the guest dashboard check-in and thank-you utility lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardCheckIns.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes undo-last-check-in, mark-thank-you, bulk thank-you, and clear-all-check-ins through one dedicated hook instead of hand-owning that guest check-in/thank-you choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1301 lines to 1228 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardCheckIns.ts` came in at 173 lines.
  - No feature loss: guest check-in recovery, thank-you toggles, thank-you bulk mark, and clear-all check-ins all preserve the current guest-ops behavior while reducing route-owned utility wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCheckIns({ ... })` plus its `updateGuestForSite(...)`, `updateGuestsForSite(...)`, `clearGuestCheckInsForSite(...)`, and `refreshGuestDashboardSession(...)` contract so the main guest dashboard page keeps routing those check-in utilities through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local guest dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

- 2026-05-08 04:17 AM PT - No-deploy guest dashboard CRUD action extraction:
  - Resolved in this batch: moved the guest dashboard add/edit/delete and guest-form lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardCrudActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes guest creation, edit persistence, delete rollback, form reset, and edit-modal hydration through one dedicated hook instead of hand-owning the guest CRUD choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1521 lines to 1301 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardCrudActions.ts` came in at 319 lines.
  - No feature loss: add guest, edit guest, delete guest, demo-mode guest mutation, event invitation sync, and edit-form prefill all preserve the current guest-list behavior while reducing route-owned mutation wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCrudActions({ ... })` plus its `generateSecureGuestInviteToken(...)`, `createGuest(...)`, `insertEventInvitations(...)`, `replaceGuestEventInvitations(...)`, and `deleteGuestWithDependencies(...)` contract so the main guest dashboard page keeps routing those CRUD actions through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local guest dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

- 2026-05-08 04:10 AM PT - No-deploy guest dashboard follow-up action extraction:
  - Resolved in this batch: moved the guest dashboard saved-segment and follow-up task lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardFollowUpActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes segment-save, manual follow-up capture, and generated checklist task creation through one dedicated hook instead of hand-owning the saved-segment/follow-up task choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1543 lines to 1521 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardFollowUpActions.ts` came in at 63 lines.
  - No feature loss: saved filters, one-off follow-up capture, and generated RSVP/contact blocker tasks all preserve the current guest-ops behavior while reducing route-owned follow-up wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardFollowUpActions({ ... })` plus its `buildSavedSegment(...)`, `buildFollowUpTask(...)`, and `buildGeneratedFollowUpTasks(...)` contract so the main guest dashboard page keeps routing those follow-up actions through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, and `npm run build`.
  - Launch status: unchanged. This continues local guest dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

- 2026-05-08 12:49 AM PT - No-deploy guest photo album action extraction:
  - Resolved in this batch: moved the guest photo album-management lifecycle out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `src/pages/dashboard/guestPhotos/useGuestPhotoAlbumActions.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes itinerary-album creation, moment-album creation, direct album creation, album activation/parenting/link regeneration, and upload-window saves through one hook instead of hand-owning the repeated owner album transport, upload-link persistence, and success/error choreography inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1917 lines to 1750 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoAlbumActions.ts` came in at 273 lines.
  - No feature loss: owner album creation, event-based album suggestions, album sharing toggles, album hierarchy edits, regenerated upload links, and upload window saves all preserve the current guest-photo flow while reducing route-owned album-management wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoAlbumActions({ ... })` plus its `createGuestPhotoAlbum(...)`, `manageGuestPhotoAlbum({ action: 'regenerate_link' ... })`, and `manageGuestPhotoAlbum({ action: 'set_window' ... })` contract so the main guest-photo page keeps routing those album actions through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing collaborator behavior. No deploy was run.

- 2026-05-08 12:42 AM PT - No-deploy message delivery action extraction:
  - Resolved in this batch: moved the message-history delivery lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageDeliveryActions.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes retry sends, send-now from scheduled, reschedule, cancel-schedule, and run-due-scheduled actions through one hook instead of hand-owning the repeated demo/live delivery transport, recipient recount, and history refresh choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 1665 lines to 1333 lines in this continuation batch while `src/pages/dashboard/messages/useMessageDeliveryActions.ts` came in at 423 lines.
  - No feature loss: demo delivery updates, live retry send, scheduled send-now, schedule edits, schedule cancellation, and due-scheduled dispatch all preserve the current messaging flow while reducing route-owned delivery-control wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDeliveryActions({ ... })` plus its `triggerDashboardBulkSend(...)` and `triggerScheduledMessageDispatch(10)` contract so the main messaging page keeps routing those history actions through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing collaborator behavior. No deploy was run.

- 2026-05-08 12:34 AM PT - No-deploy guest dashboard campaign-action extraction:
  - Resolved in this batch: moved the guest invitation/reminder send lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardCampaignActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes single invite sends, selected reminder sends, filtered campaign sends, and due-reminder sends through one hook instead of hand-owning the repeated email-send, sent-timestamp persistence, campaign log, and refresh choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 2523 lines to 2262 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardCampaignActions.ts` came in at 314 lines.
  - No feature loss: owner/coordinator invite sends, selected reminder batches, filtered RSVP reminder campaigns, due-reminder campaigns, demo logging, and guest-safe confirmation/error copy all preserve the current guest ops flow while reducing route-owned email-send wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCampaignActions({ ... })` plus its `sendGuestInvitationEmail(...)`, `markGuestInvitationSentForSite(...)`, `markGuestInvitationAndReminderSentForSite(...)`, and `markGuestReminderSentForSite(...)` contract so the main guest dashboard page keeps routing that send lifecycle through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing collaborator or guest-facing behavior. No deploy was run.

13. `PARTIAL` - Remove direct Supabase calls from pages.
    Problem: page components still own too much data access.
    Acceptance: sensitive reads/writes move into repository/service layers with explicit projections and testable contracts.
   Current evidence: many broad `select("*")` projections were replaced by explicit projections; the last page-level Supabase mutation/RPC calls in `AcceptCollaboratorInvite.tsx` and `Guests.tsx` now run through helper services instead of direct TSX calls; `SiteView.tsx` now routes public itinerary and registry Edge Function reads through `src/pages/siteViewService.ts` instead of owning direct `supabase.functions.invoke(...)` calls inline; `EventHub.tsx` and `EventRecap.tsx` now route guest-hub config/recap config loading, guest-hub telemetry, and guest prospect opt-in transport through `src/pages/guestHubPublicService.ts` instead of owning direct public function fetches inline; `RSVP.tsx` and `EventRSVP.tsx` now route `validate-rsvp-token` lookup and submit transport through `src/pages/rsvpFunctionService.ts` instead of owning duplicate guest-facing RSVP fetch wiring inline; `PhotoUpload.tsx`, `GuestbookSubmit.tsx`, and `GuestContactUpdate.tsx` now route guest-facing photo upload, guestbook submit, and guest contact lookup/submit transport through `src/pages/guestPublicSubmissionService.ts` instead of owning direct guest-facing function fetches inline; `TemplateScrollCapture.tsx` and `VariantPreviewCapture.tsx` now route preview photo manifest loading through `src/pages/previewPhotoManifestService.ts` instead of each owning duplicate manifest fetch wiring inline; `VaultContribute.tsx` now routes public vault config reads plus vault upload/submission Edge Function calls through `src/pages/vaultContributionService.ts` instead of owning direct `supabase.functions.invoke(...)` calls inline; `SetupShell.tsx` now routes setup bootstrap submission through `src/pages/setup/setupService.ts` instead of owning the direct shared function invoke inline; `Overview.tsx` now routes site lookup, guest/count hydration, interactive suggestion/vote reads, builder field edits, and draft-refresh seed reads through `src/pages/dashboard/overviewService.ts` instead of owning those `wedding_sites`, `guests`, `interactive_suggestions`, and `interactive_votes` queries inline; `Itinerary.tsx` now routes dashboard event loading/count hydration, wedding-data/sections mirror sync, repeated active-site auth lookup, timeline shift persistence, event save/delete transport, photo-album best-effort creation, and event guest manager snapshot/add/remove/invite-all/remove-all transport through `src/pages/dashboard/itineraryService.ts` instead of owning those cross-table `wedding_sites`, `itinerary_events`, `event_rsvps`, `guests`, or `event_invitations` reads/writes inline; `Messages.tsx` now routes bulk-send auth token lookup plus live bulk-send and scheduled-dispatch transport through `src/pages/dashboard/messages/messageService.ts` and its full composer shell through `MessageComposerCard` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx` instead of owning that large inline transport/UI seam; `Seating.tsx` now routes auth-session refresh retry through `src/pages/dashboard/seating/seatingService.ts` instead of owning direct session refresh calls inline; `Vault.tsx` now routes entry-link resolution plus Google Drive health/start/callback function invokes through `src/pages/dashboard/vaultService.ts` instead of owning direct `supabase.functions.invoke(...)` calls inline; `GuestPhotoSharing.tsx` now routes dashboard user resolution, session refresh retry, owner snapshot loading, owner actor-id lookup, auth-retrying owner Edge Function invokes, guest follow-up queue requests, the main dashboard data hydration, guest hub settings persistence, guestbook moderation, AI photo ops plan persistence, upload bucket moves, AI bucket-correction writes, upload analysis requests, media manifest export requests, album management requests, upload moderation requests, and album creation requests through `src/pages/dashboard/guestPhotoSharingService.ts`, and no longer owns direct Supabase/auth/owner-function transport inline; `Login.tsx` now routes OAuth prime-session lookup, password sign-in, Google OAuth start, reset-email submission, and auth-state listener subscription through `src/pages/loginService.ts` instead of owning direct auth calls inline; `AcceptCollaboratorInvite.tsx` now routes invite-claim session presence checks through `src/pages/acceptCollaboratorInviteService.ts` instead of owning direct session reads inline; `Guests.tsx` now routes guest check-in auth retry refresh, guest dashboard site-settings/bootstrap and guest-conflict snapshot hydration, guest conflict resolve/resolve-all writes, itinerary-filter bootstrap, RSVP audit feed hydration, itinerary drawer bootstrap, itinerary invite toggle transport, assisted RSVP persistence, RSVP text-link site slug lookup, active-site fallback lookup, check-in/thank-you status writes, household assignment writes, reminder-setting persistence, guest update-link public slug lookup, RSVP config persistence, and invitation/reminder sent timestamp writes through `src/pages/dashboard/guests/guestService.ts` instead of owning those direct auth/session, `wedding_sites`, `itinerary_events`, `event_invitations`, `guest_audit_logs`, `guests`, `rsvps`, or `rsvp_conflicts` calls inline; `Signup.tsx` now routes Google OAuth start and email sign-up/sign-in fallback through `src/pages/signupService.ts` instead of owning those auth calls inline; `AcceptCollaboratorInvite.tsx` now routes invited account sign-in and sign-up fallback through `src/pages/acceptCollaboratorInviteService.ts` instead of owning those auth calls inline; `QuickStart.tsx`, `GuidedSetup.tsx`, and `WeddingStatus.tsx` now route their authenticated onboarding user lookup through `src/pages/onboarding/onboardingService.ts` instead of directly calling `supabase.auth.getUser()` inline; `Settings.tsx` now routes authenticated email lookup, current-password verification, and password update through `src/pages/dashboard/settings/settingsSiteData.ts`, its planner/collaborator invite surface through `src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx`, its site-url card through `src/pages/dashboard/settings/SettingsSiteUrlPanel.tsx`, its wedding identity exports card through `src/pages/dashboard/settings/SettingsIdentityExportsPanel.tsx`, its privacy/access card through `src/pages/dashboard/settings/SettingsPrivacyPanel.tsx`, its template-switcher card through `src/pages/dashboard/settings/SettingsTemplatePanel.tsx`, its RSVP meal-choice card through `src/pages/dashboard/settings/SettingsRsvpMealPanel.tsx`, and its advanced RSVP custom-questions card through `src/pages/dashboard/settings/SettingsRsvpQuestionsPanel.tsx`, instead of carrying those large owner settings seams inline; full service-layer migration still remains.

14. `PARTIAL` - Performance and query safety.
    Problem: overfetching, unscoped queries, and large dataset handling need full audit.
    Acceptance: no unsafe overfetching, queries are scoped, large guest/message/media datasets are paginated or bounded.
    Current evidence: explicit projection work reduced overfetching; dashboard message-delivery history reads now dedupe requested message ids, cap the per-query message-id set at 50, and cap returned delivery rows at 1000 in `messageService`; message dashboard list loads now cap messages at 1000 rows and guests at 5000 rows before hydrating the comms center, and SMS credit preview history now uses an explicit 20-row cap; message itinerary-audience loading now also caps visible-event reads at 200 and invitation fan-out at 10000; public registry reads now use the same 500-item cap across the dashboard service, the public Edge Function path, and the direct anon fallback path, and registry item creation now uses an explicit one-row sort-order lookup cap; RSVP board reads now cap guest rows at 2000, itinerary events at 200, and event-invitation fan-out at 10000 before hydrating live RSVP activity; coordinator bootstrap reads now cap guest rows at 2000, itinerary events at 200, event-invitation fan-out at 10000, and Q&A rows at 30 before hydrating day-of operations; admin log services now use explicit caps for dashboard error-log rows and audit-log fan-out, including the guest-name follow-up query; the shared app-action audit helper now clamps caller-provided row limits to 100 before querying; the shared active-site resolver now uses explicit one-row owned/collaborator fallback caps when selecting the first available site; the shared event-RSVP cleanup helper now caps invitation-id fan-out at 10000 before delete and snapshot reads; itinerary event lists now cap visible events at 200, event invitation hydration at 10000, and guest-picker rows at 5000 before dashboard event-editor fan-out; guest dashboard list hydration now caps guest rows at 5000, itinerary filter events at 200, itinerary filter invitation hydration at 10000, guest drawer events at 200, guest drawer invitation hydration at 10000, and guest drawer audit history at 12 before RSVP and itinerary fan-out, while guest RSVP conflict feeds now cap unresolved rows at 20, history rows at 500, and audit rows at 20 before hydrating the guest ops surfaces; guest bulk helper paths now cap guest-id and RSVP guest-id fan-out at 5000 before bulk invitation, RSVP, household, and guest update/delete operations; guest photo dashboard hydration now caps itinerary events at 200, album rows at 500, upload rows at 200, guestbook rows at 50, prospect rows at 200, AI analysis rows at 250, metadata rows at 250, and bucket-correction rows at 100 before upload, guestbook, prospect, analysis, and recap fan-out; seating itinerary reads now cap visible event rows at 200, seating table reads cap table rows at 500, seating version history caps rows at 12, latest seating-event lookup caps at 1, eligible-guest hydration caps guest rows at 5000, seating assignment reads cap rows at 10000, and event-invitation hydration caps invitation rows at 10000 before event-RSVP lookups; seating lookup fan-out also caps table-id reads at 500 and guest-id reads at 2000 before follow-up table/guest fetches; vault dashboard reads now cap config rows at 25 and entry rows at 1000 before hydrating the owner view; name-change workspace reads now cap document rows at 100, extracted fields at 500, latest snapshot reads at 1, and reminders at 100 before hydrating the planner workspace; planning address collection, song requests, tasks, vendors, and budget reads now use explicit row caps before hydrating the planning workspace, and planning seating-readiness event lookups now cap seating-event ids at 200 before assignment counts; guest RSVP hydration now caps guest-id fan-out at 5000 before follow-up RSVP reads; settings collaborator invite reads now cap invite rows at 200 before hydrating the settings team panel; vendor inquiry history reads now clamp caller-provided limits to 50 rows before hydrating the vendor inbox; overview guest stats now use exact count queries plus a 5-row cap for recent RSVP hydration instead of loading the full guest list into the dashboard overview, overview interactive engagement sidebars now use explicit caps of 8 suggestion rows and 500 vote rows before summarizing owner-facing activity, and the collaborator fallback site lookup now uses an explicit one-row cap; broader pagination/query-efficiency audit remains.

15. `PARTIAL` - Asset footprint.
   Problem: production build must not include unnecessary large assets.
   Acceptance: large proof/demo/template media are excluded from production deploy or moved to safer storage; asset budget checks exist.
   Current evidence: `npm run guard:assets` now budgets production-copied `public/` assets at the current footprint, is wired into `test:launch`, `proof:v1:test-lanes`, and CI hardpass, and fails on growth. Existing template GIFs still need a CDN/object-storage or optimized-thumbnail strategy.

### Deferred Product Data Lanes

16. `DEFERRED` - Google Places vendor profile enrichment.
    Problem: vendor profiles currently support manual external credibility fields, but they do not yet sync business identity, Google rating, review count, photos, address/location, phone, website, hours, categories, or Google profile/place IDs from Google Places.
    Risk: expecting vendors or DayOf users to manually rate and enrich every vendor creates cold-start friction, weaker trust signals, moderation/fraud risk, and inconsistent vendor pages. Pulling this data from the browser would also expose API keys and create policy/compliance risk.
    Likely files/areas to inspect: `src/lib/vendorProfiles.ts`, `src/pages/VendorProfile.tsx`, `src/pages/VendorProfileCreate.tsx`, `supabase/functions/**vendor**`, future `vendor-google-places-sync` Edge Function, vendor profile migrations, vendor import/search UI, `src/sections/publicLinks.ts`, and any vendor template/gallery source helpers.
    Acceptance criteria: Google Places calls run server-side only; no Google API key ships to the browser; vendor profile records store a stable `place_id` plus a normalized public-safe snapshot; external ratings are clearly labeled as Google/public reputation, separate from DayOf fit rating; sync respects Google attribution/field-mask requirements; failures degrade to manual vendor fields; stale data is timestamped; sample/manual vendor profiles keep working without Google; tests prove no key exposure and no feature loss in vendor profile render/create/inquiry flows.
    Suggested implementation approach: add a gated Edge Function or server job that accepts an authenticated owner/vendor action, resolves a Google Place ID through Places search/details with explicit field masks, normalizes only allowed fields into `source_payload.vendor_customization.external_credibility` plus dedicated vendor identity fields if needed, and leaves DayOf `rating` as a wedding-fit score. Start with one-way enrichment and manual override before adding recurring refresh.

### 2026-05-05 2:15 PM PT - Approved Deploy / Postdeploy Proof Update

- DONE: Vercel production deploy completed and is live at `https://dayof.love`; deployment id `dpl_3q71A1vTz9gc9k5tY1yvRrdVAvsm`.
- DONE: Supabase migrations `20260505100000_vendor_rating_and_inquiry_context.sql` and `20260505102000_site_rsvps_public_gate_rls.sql` were applied to project `atuzuobpprjstfmdnwso`.
- DONE: Public/guest Edge Functions `public-site-rsvp-submit`, `public-site-access`, `public-registry-items`, `public-itinerary-by-slug`, and `validate-rsvp-token` were deployed.
- DONE: Live `validate-rsvp-token` boot error was fixed by removing the redeclared `rsvpSession` binding and redeploying with API bundling plus `--no-verify-jwt`.
- DONE: Strict RSVP smoke now proves the hardened short-lived RSVP session model instead of submitting durable invite tokens.
- DONE: Check-in guard now follows the extracted utility implementation and its unit proof.
- Validation passed: `npm run proof:v1:postdeploy` passed 8/8 against `https://dayof.love`, including canonical smoke, prereqs, AI rollout/static exposure, runtime wording truth, public quality, guests/RSVP ops, and anon-limited data integrity.
- Remaining: full service-role cross-table/storage integrity proof, remaining P1/P2 architecture/asset/test-lane cleanup, and GitHub push/commit synchronization.
- Launch status changed: approved production deploy is live and current non-SMS postdeploy proof is green. Overall 10/10 production readiness is still `PARTIAL`, not final.

### 2026-05-05 2:28 PM PT - No-Deploy Messaging Viewer Mutation Hardening

- Resolved locally in this batch: direct wedding-email sends, bulk/scheduled message sends, and queued guest follow-ups now require an owner or a `planner`/`coordinator` collaborator with the relevant permission. `viewer` collaborators are denied even if a stale or malformed permission row includes `messages` or `guests`.
- Resolved locally in this batch: frontend planner permission helpers now treat `viewer` as read-only before considering explicit permission arrays, so UI affordances match the hardened server-side expectation.
- No feature loss: owner, planner, and coordinator messaging/guest-management flows remain supported through the same permission names; only viewer mutation is blocked.
- Proof added/updated: `src/lib/plannerAccess.test.ts` now proves viewer explicit permissions do not unlock compose/guest mutation; `src/lib/launchEdgeFunctions.test.ts` now statically guards the three Edge Functions for role-aware mutation checks and scheduled-message filtering.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts` (37/37), `npm run smoke:messages`, `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run proof:v1:board:md`, `git diff --check`, `npm run lint -- --quiet`, and `npm run build`.
- Launch status: unchanged. This narrows local email/messaging authorization risk, but no deploy was run and live messaging authorization proof remains open.

### 2026-05-05 2:35 PM PT - No-Deploy Photo/Media Viewer Mutation Hardening

- Resolved locally in this batch: `photo-album-create`, `photo-export-manifest`, `photo-album-manage`, `photo-upload-moderate`, and `photo-analyze-batch` now require owner access or a `planner`/`coordinator` collaborator role before creating albums, exporting manifests, changing album windows/links, moderating uploads, or triggering photo AI analysis.
- Resolved locally in this batch: explicit `photos`/`media` permissions are still honored for planner/coordinator collaborators, and missing permission arrays preserve the existing planner/coordinator role-preset behavior. `viewer` collaborators remain read-only.
- No feature loss: owner, planner, and coordinator photo-management paths remain supported, including album creation; the hardened boundary only removes viewer mutation/export/analyze access.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires role-aware photo mutation helpers and blocks the prior permission-only collaborator checks.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
- Launch status: unchanged. This narrows local photo/media service-role authorization risk; no deploy was run and live service-role/RLS proof remains open.

### 2026-05-07 11:27 AM PT - No-Deploy Photo Owner Helper Copy Tightening

- Resolved locally in this batch: `photo-album-create/index.ts` now uses customer-safe sign-in, site-selection, album-name, site-availability, and access-denied copy instead of raw `Unauthorized` and `siteId and name are required` wording on the owner photo-album creation path.
- Resolved locally in this batch: `photo-album-manage/index.ts` now uses customer-safe copy for missing album selection, missing album availability, access denial, invalid activation state, invalid update action, and parent-album validation instead of raw `albumId is required`, `Album not found`, `Forbidden`, `isActive is required for set_active`, and similar helper-internal wording.
- Resolved locally in this batch: `photo-upload-moderate/index.ts` now uses customer-safe sign-in, batch-selection, batch-size, unavailable-selection, access-denied, and patch-required copy instead of raw `uploadIds required`, `Too many uploadIds`, and mixed not-found moderation wording.
- Resolved locally in this batch: `google-drive-auth-callback/index.ts` now treats owner/site mismatch as a storage-connection readiness problem instead of returning `Site not found or unauthorized`.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the tightened photo owner-helper and storage-callback copy and rejects reintroduction of the older raw auth, field-name, and not-found wording for those routes.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:30 AM PT - No-Deploy Public Submission Copy Tightening

- Resolved locally in this batch: `vendor-profile-inquiry-submit/index.ts` now uses customer-safe vendor-selection and vendor-availability copy instead of `Missing vendor profile` and `Vendor page not found.`
- Resolved locally in this batch: `log-client-error/index.ts` now asks for a short report summary instead of returning `message is required`.
- Resolved locally in this batch: `photo-upload/index.ts` now uses customer-safe link-refresh and file-selection copy instead of raw `token or siteSlug is required` and `At least one file is required` wording.
- Resolved locally in this batch: `guestbook-submit/index.ts`, `guest-contact-submit/index.ts`, and `vault-entry-submit/index.ts` now use customer-safe message/request-unavailable copy instead of `Message is required` and `Guest not found`.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the tightened public submission/helper copy and rejects reintroduction of the older field-name and not-found wording for those routes.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:36 AM PT - No-Deploy Guest Link Contract Tightening

- Resolved locally in this batch: `submit-rsvp/index.ts` now asks guests to reopen their invitation link instead of returning `A valid invitation token is required to submit your RSVP.`
- Resolved locally in this batch: `guest-hub-config/index.ts`, `guest-hub-track/index.ts`, `guest-recap-config/index.ts`, `guest-prospect-submit/index.ts`, and `guestbook-submit/index.ts` now collapse malformed or unavailable public slug cases to consistent wedding-link wording instead of `Invalid site` and `Site not available`.
- Resolved locally in this batch: `photo-upload/index.ts` now uses consistent photo-upload-link wording instead of `Invalid site link.` and `Site not available for uploads.`
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the new invitation-link, wedding-link, guest-hub, recap, guestbook, prospect, and photo-upload copy and rejects reintroduction of the older raw site/token wording.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:39 AM PT - No-Deploy Vault Contribution Copy Tightening

- Resolved locally in this batch: `vault-upload-google-drive/index.ts` now uses customer-safe site-selection, vault-selection, file-selection, contribution-link, storage-readiness, vault-availability, and reconnect-needed copy instead of raw `siteId, vaultYear, fileName, and base64 are required.`, `Site not available for public contributions.`, and Google Drive/config wording.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now statically guards the tightened vault contribution copy and rejects reintroduction of the old field-name, availability, and reconnect strings on that route.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status did not change. This keeps guest-facing vault contribution failures less implementation-shaped, but live service-role/RLS proof and live messaging authorization proof remain open. No deploy was run.

### 2026-05-07 11:41 AM PT - No-Deploy Public RSVP Submit Contract Tightening

- Resolved locally in this batch: `public-site-rsvp-submit/index.ts` now uses named customer-safe constants for missing-name, invalid-email, send-unavailable, rate-limit, and link-unavailable copy instead of ad hoc inline strings on the public RSVP submission path.
- Resolved locally in this batch: public RSVP unavailable wording now consistently refers to the RSVP link, which better matches the guest-facing flow and the existing public-access contract.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now statically guards the tightened public RSVP submit copy and rejects reintroduction of the older inline name-required and RSVP-unavailable strings.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status did not change. This keeps the public RSVP submit contract calmer and more explicit without changing behavior; live service-role/RLS proof and live messaging authorization proof remain open. No deploy was run.

### 2026-05-07 11:45 AM PT - No-Deploy Service-Role Disposition Truth Tightening

- Resolved locally in this batch: `docs/service-role-authorization-disposition-2026-05-05.md` now correctly separates owner/collaborator routes from public submission routes and public or optional-auth rate-limited helpers.
- Resolved locally in this batch: `vault-upload-google-drive` is now documented in the public submission scoped group, while `log-client-error`, `onboarding-ai-orchestrate`, and `vendor-profile-preview` are documented in the public or optional-auth rate-limited helper group instead of the owner-only group.
- Proof added/updated: `src/lib/serviceRoleAuthorizationDisposition.test.ts` now passes again against the real disposition categories, so service-role inventory drift in the launch docs is caught instead of silently tolerated.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts` (29/29), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status did not change. This fixes a real proof-truth mismatch in the service-role launch lane, but live service-role/RLS proof and live messaging authorization proof remain open. No deploy was run.

### 2026-05-07 11:46 AM PT - No-Deploy Live Authorization Proof Narrowing

- Resolved locally in this batch: `npm run proof:v1:service-role-authorization` passed live unauthenticated denial proof for `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch`, all returning safe `401` denial responses from the live Supabase project.
- Resolved locally in this batch: `npm run proof:v1:email-messaging-authorization` passed live unauthenticated denial proof for `process-email-queue`, `queue-guest-followups`, `send-bulk-message`, and `send-wedding-email`, all returning safe `401/403` denial responses from the live Supabase project.
- Resolved locally in this batch: backlog and proof wording now distinguish the green live unauthenticated denial proofs from the still-open authenticated role-mutation proof and secure service-role queue/storage proof.
- Validation passed: `npm run proof:v1:service-role-authorization`, `npm run proof:v1:email-messaging-authorization`, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
- Launch status did not change. The remaining strict blockers are now the authenticated role proof and secure service-role queue/storage proof, not the previously broader unauthenticated denial checks. No deploy was run.

### 2026-05-07 11:56 AM PT - No-Deploy Collaborator Runtime Proof Expansion

- Resolved locally in this batch: `scripts/v1-proof-collaborator-runtime.mjs` now reads owner credentials from standard env files, defaults its proof target to `https://dayof.love`, and generates disposable collaborator credentials automatically instead of incorrectly blocking on pre-seeded collaborator env vars.
- Resolved locally in this batch: `scripts/playwright-owner-create-invite-and-claim.mjs` no longer hardcodes a single proof-site slug or a single invite-button label, so the live invite/claim proof now follows the actual owner account and current settings UI.
- Resolved locally in this batch: `tests/e2e/collaborator-permission-rls.spec.ts` now proves a limited collaborator with only `guests` permission can still write an allowed guest row while being denied on direct message writes, `queue-guest-followups`, `photo-album-create`, and `photo-export-manifest`.
- Validation passed: `npm run proof:v1:collaborator-runtime`, `npm run proof:v1:collaborator-access`, and the live collaborator runtime bundle now passes 2/2 with real invite creation, invite claim, role-aware landing, allowed guest write, and forbidden messaging/photo helper actions.
- Launch status did not change. This closes the live limited-collaborator forbidden-action proof gap and narrows the remaining strict blockers to planner/coordinator allowed-action live proof plus secure service-role queue/storage proof. No deploy was run.

### 2026-05-05 2:43 PM PT - No-Deploy Shared Collaborator Permission Helper

- Resolved locally in this batch: added `supabase/functions/_shared/collaboratorPermissions.ts` as the single Edge Function helper for collaborator mutation checks.
- Maintainability/security hardening: messaging and photo/media functions now import shared `canMutateMessages`, `canMutateGuestsOrMessages`, and `canMutatePhotos` instead of each carrying local copies of role/permission logic.
- No feature loss: this preserves the same owner, planner, coordinator, and viewer behavior from the prior hardening batches while reducing future drift risk.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now validates the shared helper contract and requires affected functions to import it.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts` (38/38), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status: unchanged. This is local-only hardening; no deploy was run.

### 2026-05-05 2:46 PM PT - No-Deploy Public Site Invite URL Cleanup

- Resolved locally in this batch: public site invite-only `?token=` URLs are stripped from the browser address bar after the token is captured into the existing slug-scoped `sessionStorage` access artifact.
- Privacy hardening: this reduces accidental token leakage through screenshots, copy/paste, referrers, browser history, and shared device visibility while preserving the existing valid invite session behavior.
- No feature loss: other query params and hash fragments are preserved, and the existing `dayof_invite_token_{slug}` storage key still supports gated subresource access for the same tab.
- Proof added/updated: `src/pages/SiteView.test.ts` now proves only the `token` query parameter is removed and token-free URLs stay unchanged.
- Validation passed: `npm test -- --run src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts` (44/44), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status: unchanged. This is local-only hardening; no deploy was run.

### 2026-05-05 2:53 PM PT - No-Deploy Guest Route Invite URL Cleanup

- Resolved locally in this batch: centralized public invite/password access artifact handling in `src/lib/publicAccessArtifacts.ts`.
- Resolved locally in this batch: `SiteView`, Event Hub, Event Recap, and site-slug Photo Upload now share the same invite-token read/capture behavior and remove `?token=` from the visible URL after capture.
- Privacy hardening: invite-only links still work, but guest-facing pages no longer leave raw site access tokens visible in copied URLs, screenshots, shared-device address bars, or browser history after first load.
- No feature loss: current-link tokens still take precedence, existing slug-scoped session storage remains the fallback for gated subresource calls, and non-token query params plus hash fragments are preserved.
- Proof added/updated: `src/lib/publicAccessArtifacts.test.ts` proves token stripping, artifact packaging, stored fallback behavior, and address-bar cleanup; focused Event Hub, Event Recap, Photo Upload, and SiteView tests stayed green.
- Validation passed: `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/pages/SiteView.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/PhotoUpload.test.ts` (36/36), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status: unchanged. This is local-only hardening; no deploy was run.

### 2026-05-05 2:57 PM PT - No-Deploy Public Contribution Access Artifact Consolidation

- Resolved locally in this batch: Vault Contribution, Guest Contact Update, Guestbook Submit, public RSVP section submit, and multi-event RSVP section submit now use `src/lib/publicAccessArtifacts.ts` for invite/password access artifact packaging.
- Resolved locally in this batch: Vault Contribution, Guest Contact Update, and Guestbook Submit now capture valid URL invite tokens into slug-scoped session storage and remove the visible `token` query parameter on first load.
- Privacy hardening: fewer guest/public surfaces duplicate raw token reads, and contribution links now follow the same cleanup path as the public site and guest hub/recap/photo upload routes.
- No feature loss: current invite tokens remain preferred for first-load access; stored tokens and password sessions still support gated subresource calls; public RSVP widget and multi-event RSVP submissions still package the same access artifacts.
- Proof added/updated: focused tests for public access artifacts, guest contact, guestbook, vault contribution, public RSVP section, multi-event RSVP, SiteView, Event Hub, Event Recap, and Photo Upload all passed together.
- Validation passed: `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/pages/GuestContactUpdate.test.ts src/pages/GuestbookSubmit.test.ts src/pages/VaultContribute.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx src/pages/SiteView.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/PhotoUpload.test.ts` (68/68), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- Launch status: unchanged. This is local-only hardening; no deploy was run.

17. `DEFERRED` - Texting/SMS provider launch lane.
    Problem: owner-facing text-message UI exists, but live SMS/Telnyx sending remains outside the current launch scope until provider credentials, consent/opt-out, compliance copy, rate limits, delivery logs, and billing/credit behavior are fully proven.
    Risk: enabling texting before compliance and abuse controls are complete can create legal/compliance exposure, unexpected provider spend, guest trust issues, and delivery confusion.
    Likely files/areas to inspect: messaging dashboard, `supabase/functions/send-bulk-message`, scheduled message processing, SMS credit checkout/webhook functions, guest consent fields, delivery logs, unsubscribe/opt-out handling, and Telnyx environment configuration.
    Acceptance criteria: SMS consent is required and respected; opt-out handling is clear; recipient caps/rate limits are durable; provider errors are customer-safe; credits/billing cannot be spoofed; scheduled sends cannot duplicate unexpectedly; live provider proof passes in a secure environment.
    Suggested implementation approach: keep SMS sending locked/deferred while email and in-app planning flows continue; later run a dedicated SMS compliance/provider proof lane with real provider secrets and small allowlisted test recipients.

### New Findings Added With This Intake

- `BLOCKED` - Live RSVP function redeploy approval: local RSVP boot fix is committed, but redeploying `validate-rsvp-token` with `--no-verify-jwt` was blocked by approval review and still needs explicit approval before live strict RSVP proof can pass.
- `PARTIAL` - Public proof stale identity: live postdeploy proof found stale January 17 template data on the proof site after Supabase function deploy. Local canonical public hydration now rebases stale same-day schedule/venue snapshots, with focused tests passing, but production needs redeploy and postdeploy proof rerun.
- `PARTIAL` - GitHub branch freshness: local branch `codex/v1-finish-hard-gates` is ahead of origin by commit `eb36d500` until pushed.
- `DONE` - `docs/PRODUCTION_HARDENING_REPORT.md` now exists for this mandate and is being updated after each batch.
- `PARTIAL` - Full validation lane for this exact mandate has been rerun locally; aggregate smoke remains blocked by live RSVP 503 responses.

Final acceptance criteria for this lane:
- Security: private sites cannot be accessed without proper gating; RSVP cannot be abused or enumerated.
- Data safety: no sensitive fields are exposed anywhere public.
- Tests: regression coverage exists for security-critical paths.
- Validation: all required commands pass or are documented with exact failures.
- Documentation: `BACKLOG.md` and `docs/PRODUCTION_HARDENING_REPORT.md` accurately reflect current state.

### 2026-05-07 11:11 AM PT - No-Deploy RSVP Invitation-Code Contract Alignment

- Resolved locally in this batch: `supabase/functions/validate-rsvp-token/index.ts` now uses invitation-code-only validation copy for both manual RSVP lookup and event RSVP lookup, removing the remaining raw `inviteToken is required` wording and aligning server guidance with the hardened exact-token contract.
- Product hardening: the RSVP guest experience no longer tells guests to search by name when the production lookup flow only honors the private invitation link or invitation code. Updated RSVP copy now consistently points guests toward their invitation code or email link across English, Spanish, French, German, Italian, and Portuguese.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards exact `invite_token` lookup for both RSVP lookup branches and rejects future reintroduction of `name`/`first_name`/`last_name` lookup on the production RSVP Edge Function.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx` (142/142), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:17 AM PT - No-Deploy Owner Helper Access-Copy Tightening

- Resolved locally in this batch: `supabase/functions/photo-export-manifest/index.ts`, `supabase/functions/queue-guest-followups/index.ts`, `supabase/functions/vault-resolve-entry-link/index.ts`, and `supabase/functions/send-wedding-email/index.ts` now use customer-safe sign-in, access, site-selection, and request-shape copy instead of raw `Unauthorized`, `Forbidden`, `siteId is required`, `entryId is required`, `Entry not found`, `Missing required fields: type, to, data`, and similar helper-internal wording.
- Security hardening: these owner/service-role helper routes still fail closed, but they no longer leak internal auth or lookup semantics into guest-facing or owner-facing error copy.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the new safe copy constants and rejects reintroduction of the old raw auth/field-name strings for photo manifest export, guest follow-up queueing, vault attachment resolution, and direct wedding email sending.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:19 AM PT - No-Deploy Preview Helper Copy Tightening

- Resolved locally in this batch: `supabase/functions/registry-preview/index.ts` now uses customer-safe sign-in and missing-URL copy instead of raw `Unauthorized` and `url is required` wording.
- Resolved locally in this batch: `supabase/functions/vendor-profile-preview/index.ts` now asks for the vendor name in plain customer language instead of returning `vendorName is required`.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the new registry preview and vendor preview copy so those helper routes do not drift back to raw auth or field-name wording.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 11:08 AM PT - No-Deploy Guest Lookup Exact-Match Tightening

- Resolved locally in this batch: `supabase/functions/guest-contact-lookup/index.ts` no longer widens public guest-contact search through a last-name candidate sweep before filtering in memory.
- Security hardening: guest-contact lookup now only combines exact full-name matches from the stored `name` field with exact split first-name/last-name matches for the same site after the shared public access gate passes, reducing residual public enumeration surface while preserving valid invitation-name lookups.
- Guest-flow hardening: `src/pages/GuestContactUpdate.tsx` now guides guests to enter their full invitation name up front and disables the lookup button until that request shape is valid, so the page no longer nudges guests toward partial-name searches the server will not honor.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards exact split-name lookup and the full-name guest-contact UI copy/placeholder contract, and `src/pages/GuestContactUpdate.test.ts` now verifies the updated guest guidance.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestContactUpdate.test.ts` (31/31), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-07 10:36 AM PT - No-Deploy Request-Copy And Storage Safety Continuation

- Resolved locally in this batch: hardened request/auth/validation copy in `supabase/functions/setup-bootstrap/index.ts`, `supabase/functions/translate-site-content/index.ts`, `supabase/functions/send-bulk-message/index.ts`, `supabase/functions/photo-analyze-batch/index.ts`, `supabase/functions/generate-token/index.ts`, `supabase/functions/submit-rsvp/index.ts`, and `supabase/functions/validate-rsvp-token/index.ts` so those owner/guest flows no longer return raw JSON/auth/field-name wording.
- Resolved locally in this batch: `src/lib/launchEdgeFunctions.test.ts` now statically guards the new customer-safe setup, translation, RSVP, token, photo-analysis, and bulk-message copy.
- Resolved locally in this batch: `src/lib/plannerAccess.ts` now includes `PLANNER_INVITE_EMAIL_PATTERN`, invite normalization, age-based invite cleanup, and invalid invite eviction from local storage.
- Resolved locally in this batch: `src/pages/dashboard/messages/messageDashboardUtils.ts` now uses retention-bounded storage envelopes for saved composer templates and stored photo album links, with migration/cleanup behavior guarded by tests.
- Resolved locally in this batch: `src/pages/dashboard/Itinerary.tsx` and `src/pages/dashboard/Vault.tsx` now use the hardened demo-storage/local-E2E helper modules instead of raw localStorage reads/writes, and `src/lib/publicAccessArtifacts.ts` now exports the shared public password-session write/clear helpers consumed by `SiteView`.
- Resolved locally in this batch: restored missing guest/messages service exports in `src/pages/dashboard/guests/guestService.ts`, `src/pages/dashboard/guests/guestDashboardUtils.ts`, and `src/pages/dashboard/messages/messageService.ts` so the branch is back to a green typecheck/build baseline after the ongoing file-splitting work.
- Proof added/updated: `src/lib/superNiceLaunchBacklogSafety.test.ts`, `src/lib/launchEdgeFunctions.test.ts`, `src/pages/dashboard/messages/messageDashboardUtils.test.ts`, and `src/pages/dashboard/itineraryDemoStorage.test.ts`.
- Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/customerSafeError.test.ts src/lib/superNiceLaunchBacklogSafety.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/itineraryDemoStorage.test.ts` (59/59), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
- No deploy was run. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk during build.

### 2026-05-04 9:25 PM PT P0 public access fail-closed continuation

- Resolved locally in this batch: public access decisions now share `supabase/functions/_shared/publicAccessGate.ts` across `public-site-access`, `public-registry-items`, and `public-itinerary-by-slug`.
- Resolved locally in this batch: missing/unknown `privacy_mode` no longer defaults to `public`; it fails closed as unavailable.
- Resolved locally in this batch: `hidden` privacy mode no longer opens public site content or public registry/itinerary subresources.
- Resolved locally in this batch: password unlock no longer opens invite-only or hidden sites as a side effect of posting to the password endpoint.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the shared public access helper, hidden fail-closed behavior, unknown privacy fail-closed behavior, and subresource removal of `privacy_mode ?? "public"`.
- Launch status: unchanged. No deploy was run, and live public-site/subresource proof remains required before marking these P0 items `DONE`.

### 2026-05-04 9:30 PM PT P0 RSVP session contract continuation

- Resolved locally in this batch: RSVP picked-guest follow-up lookup now sends the current short-lived `rsvpSession` to `lookup_guest`, preserving the manual/picked guest flow after the server-side no-guestId-alone hardening.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards that `lookup_guest` rejects missing `rsvpSession` and that `RSVP.tsx` sends `rsvpSession: rsvpSessionToken`.
- Launch status: unchanged. No deploy was run, and live strict RSVP proof remains blocked until the approved function redeploy/proof path is completed.

### 2026-05-04 9:31 PM PT P1 registry preview SSRF continuation

- Resolved locally in this batch: `registry-preview` now blocks additional reserved and special IPv4 ranges in both request normalization and runtime fetch validation: carrier-grade NAT, documentation/example networks, benchmarking networks, multicast, reserved, and broadcast ranges.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards these blocked ranges in both `supabase/functions/registry-preview/index.ts` and `supabase/functions/registry-preview/urlNormalizer.ts`.
- Validation: focused registry preview static guard passed after sandbox escalation, 23/23.
- Launch status: unchanged. This reduces SSRF risk locally, but full hostile-target runtime proof and live deployment proof remain required.

### 2026-05-04 9:32 PM PT validation update

- `DONE` locally: `npm run typecheck` passed.
- `DONE` locally: `npm run lint` passed with warnings only, 0 errors.
- `DONE` locally after sandbox escalation: `npm run build` passed. The first sandboxed attempt failed with `EPERM` writing Vite temp config under `node_modules/.vite-temp`.
- `DONE` locally after sandbox escalation: `npm test` passed, 461 files and 2753 tests.
- `DONE` locally: `npm run guard:file-size` passed; oversized files remain within current baseline but still need P2 splitting.
- `DONE` locally: `npm run smoke:registry`, `npm run smoke:csvmapper`, `npm run smoke:checkin`, `npm run smoke:messages`, and `npm run smoke:site` passed. `smoke:site` needed network escalation after sandbox DNS was blocked.
- `BLOCKED`: `npm run smoke:rsvp` failed after network escalation because the deployed RSVP function returned 503 for every checked path. This also makes `npm run test:smoke` fail after `smoke:registry` passes.
- Launch status: still not production-ready. No deploy was run.

### 2026-05-04 9:39 PM PT P1 email safety centralization continuation

- Resolved locally in this batch: added `supabase/functions/_shared/emailSafety.ts` for shared `escapeHtml`, `safeEmailUrl`, `safeEmailHref`, and `sanitizeEmailSubject` behavior.
- Resolved locally in this batch: `send-wedding-email`, `process-email-queue`, and `send-bulk-message` now import the shared email safety helpers instead of carrying separate duplicate helper implementations.
- Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the shared helper implementation and requires the three email-producing functions to import it.
- Validation: focused launch Edge Function guard passed 23/23 after updating the static expectation; `npm run typecheck`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`, `npm run smoke:messages`, and `npm run guard:file-size` passed.
- Launch status: unchanged. No deploy was run; live messaging authorization/send proof and the live RSVP 503 blocker remain.

### 2026-05-04 9:40 PM PT P1 guest import/export safety continuation

- Resolved locally in this batch: guest import now rejects unsupported file extensions instead of treating every non-`.xlsx` file as CSV.
- Resolved locally in this batch: guest import now enforces the 80-column limit across all rows, not just the header row.
- Re-proven locally in this batch: CSV export formula neutralization still protects exported cells that begin with formula/control prefixes.
- Validation: `npm test -- --run src/lib/guestImportParser.test.ts src/lib/csvExport.test.ts` passed 12/12; `npm run smoke:csvmapper`, `npm run typecheck`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build` passed.
- Launch status: unchanged. No deploy was run; broader guest export authorization/audit proof remains open, and live RSVP 503 remains the main blocker.

### 2026-05-04 9:43 PM PT P2 Guests split and guardrail continuation

- Resolved locally in this batch: extracted pure guest audit/custom-answer display helpers from `src/pages/dashboard/Guests.tsx` into `src/pages/dashboard/guests/guestDisplayUtils.ts`.
- Proof added/updated: added `src/pages/dashboard/guests/guestDisplayUtils.test.ts` to lock audit summaries, labels, RSVP event-note parsing, and custom-answer formatting.
- Guardrail tightened: `Guests.tsx` dropped from 5430 to 5338 lines, and `scripts/check-file-size-guard.mjs` now uses the lower 5338-line baseline.
- Validation: focused helper/import tests passed 18/18; `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build` passed.
- Launch status: unchanged. No deploy was run; this reduces maintainability risk but does not clear the live RSVP blocker.

### 2026-05-04 9:47 PM PT P2 asset budget continuation

- Resolved locally in this batch: added `scripts/check-asset-budget.mjs` and `npm run guard:assets`.
- Guardrail added: production-copied `public/` assets are capped at the current baseline of 215000 KiB total and 6000 KiB per file.
- Current evidence: `public/` is 209433 KiB across 334 files; largest assets are template preview GIFs under `public/template-previews-gif/`.
- Validation: `npm run guard:assets`, `npm run typecheck`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build` passed.
- Launch status: unchanged. No deploy was run; existing asset shrink/CDN migration remains open.

### 2026-05-04 9:50 PM PT P2 asset guard CI/test-lane continuation

- Resolved locally in this batch: wired `npm run guard:assets` into `test:launch`, `scripts/v1-proof-test-lanes.mjs`, and `.github/workflows/ci-hardpass.yml`.
- Proof tightened: `proof:v1:test-lanes` now verifies the asset guard script and the launch lane that runs both file-size and asset budgets before build/proof-board generation.
- Guardrail kept strict: `npm run guard:file-size` initially caught `Guests.tsx` at 5339 lines against the lowered 5338-line baseline; the extra blank line was removed and the guard reran green without loosening the baseline.
- Validation: `npm run guard:assets`, `npm run guard:file-size`, `npm run proof:v1:test-lanes`, `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check` passed. The first sandboxed build failed with the known Vite `node_modules/.vite-temp` `EPERM` issue and passed after sandbox escalation.
- Launch status: unchanged. No deploy was run; existing template-preview asset shrink/CDN migration and the live RSVP 503 blocker remain open.

### 2026-05-04 9:53 PM PT P1 CI hardpass reliability continuation

- Resolved locally in this batch: split the CI hardpass core from one chained command into named steps for tests, build, registry smoke, CSV mapper smoke, check-in smoke, and messages smoke.
- Resolved locally in this batch: added quiet lint to CI hardpass, keeping typecheck/lint/guards/tests/build/smoke as explicit release gates instead of a vague aggregate.
- Proof added: `scripts/v1-proof-test-lanes.mjs` now statically checks that CI hardpass includes quiet lint, both guardrails, tests, build, registry smoke, CSV mapper smoke, check-in smoke, and messages smoke, and rejects reintroducing an opaque `npm test && ...` hardpass command.
- Validation: `npm run proof:v1:test-lanes`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run guard:assets` passed.
- Launch status: unchanged. No deploy was run; live RSVP 503 still blocks the aggregate smoke/production-readiness verdict.

### 2026-05-04 9:55 PM PT P1 security regression lane continuation

- Resolved locally in this batch: added `npm run test:security` as an explicit security regression lane for public access, public payload/project safety, service worker cache safety, AI/provider key exposure, AI proof-script exposure, settings error safety, service-role authorization disposition, RSVP, and event RSVP behavior.
- Resolved locally in this batch: wired `test:security` into `test:launch` and CI hardpass so security-sensitive tests run before build/proof-board generation and during CI.
- Proof tightened: `scripts/v1-proof-test-lanes.mjs` now verifies the `test:security` script and CI security-regression step.
- Validation: `npm run proof:v1:test-lanes` passed; first sandboxed `npm run test:security` failed with the known Vite `node_modules/.vite-temp` `EPERM` issue, then passed after sandbox escalation with 10 files and 191 tests.
- Launch status: unchanged. No deploy was run; this improves release-gate clarity but live RSVP 503 remains the active blocker.

### 2026-05-04 9:56 PM PT P1 launch lane composition proof

- Validation: `npm run test:launch` passed after sandbox escalation. It ran typecheck, quiet lint, `test:security`, file-size guard, asset guard, production build, and proof-board generation.
- Launch status: unchanged. No deploy was run; the local launch lane is green, but production readiness remains blocked by live RSVP 503 and required postdeploy/live authorization proof.

### 2026-05-04 10:00 PM PT P2 dashboard file split continuation

- Resolved locally in this batch: extracted Guests dashboard shared types and storage-key constants into `src/pages/dashboard/guests/guestDashboardTypes.ts`.
- Resolved locally in this batch: extracted Messages dashboard shared types, status constants, and saved-template storage key into `src/pages/dashboard/messages/messageDashboardTypes.ts`.
- Guardrail tightened: `Guests.tsx` dropped from 5338 to 5250 lines and `Messages.tsx` dropped from 4043 to 3936 lines; `scripts/check-file-size-guard.mjs` now enforces both lower baselines.
- Validation: focused Guests helper/time tests passed 6/6 after sandbox escalation; `npm run smoke:messages`, `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build` passed. An intermediate typecheck run caught a missing `MessageTemplateKey` import after extraction; it was fixed before the final green run. The first focused Vitest run failed with the known sandbox Vite `node_modules/.vite-temp` `EPERM` issue and passed after sandbox escalation.
- Launch status: unchanged. No deploy was run; this reduces maintainability risk but does not clear the live RSVP 503 blocker.

### 2026-05-04 10:03 PM PT P2 Settings split and public storage regression continuation

- Resolved locally in this batch: extracted Settings dashboard RSVP/language types and local demo storage constants into `src/pages/dashboard/settings/settingsDashboardTypes.ts`.
- Guardrail tightened: `Settings.tsx` dropped from 2422 to 2399 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2399-line baseline.
- Proof added: `src/lib/publicSiteAccess.test.ts` now guards that public-site invite-token and password-session artifacts stay in `sessionStorage`, not `localStorage`.
- Validation: focused settings/public-site tests passed 26/26 after sandbox escalation; `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run proof:v1:test-lanes`, `git diff --check`, and `npm run build` passed. The first focused Vitest run failed with the known sandbox Vite `node_modules/.vite-temp` `EPERM` issue and passed after sandbox escalation.
- Launch status: unchanged. No deploy was run; this improves maintainability and browser-storage regression proof, but live RSVP 503 and postdeploy/live authorization proof remain blockers.

### 2026-05-04 10:10 PM PT P2 guest-facing RSVP split continuation

- Resolved locally in this batch: extracted RSVP constants, response types, meal/question types, and RSVP customer-safe error normalization into `src/pages/rsvpTypes.ts`.
- Guardrail tightened: `RSVP.tsx` dropped from 2060 to 1993 lines, below the 2000-line oversized threshold, and `scripts/check-file-size-guard.mjs` now enforces the lower 1993-line baseline.
- Behavior preserved: `RSVP.tsx` re-exports `normalizeRsvpGuestError` and `normalizeRsvpSubmitError` so existing tests/importers keep working.
- Bug caught and fixed during proof: the first post-extraction RSVP test run showed three token/manual lookup cases falling back to “Couldn’t load that invitation” instead of the canonical invitation-not-recognized copy. The moved fallback constants were imported and the catch path was restored to `RSVP_LOOKUP_ERROR_COPY`; the full RSVP focused suite then passed.
- Validation: focused RSVP/Event RSVP tests passed 115/115 after sandbox escalation; `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run test:security`, `git diff --check`, and `npm run build` passed.
- Launch status: unchanged. No deploy was run; this reduces guest-facing RSVP maintainability risk but does not clear the live RSVP 503 blocker.

### 2026-05-04 10:13 PM PT P2 Seating split continuation

- Resolved locally in this batch: extracted seating dashboard pure helpers and constants into `src/pages/dashboard/seating/seatingDashboardUtils.ts`.
- Proof added: `src/pages/dashboard/seating/seatingDashboardUtils.test.ts` now covers HTML escaping, export slug normalization, and table shape labels/palettes.
- Guardrail tightened: `Seating.tsx` dropped from 2370 to 2334 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2334-line baseline.
- Validation: focused seating utility/service tests passed 9/9 after sandbox escalation; `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:checkin`, `git diff --check`, and `npm run build` passed.
- Launch status: unchanged. No deploy was run; this reduces seating maintainability risk but does not clear live RSVP/postdeploy proof blockers.

## Current Production-Hardening Status - 2026-05-04 5:43 PM PT

Canonical proof document for this pass: `docs/PRODUCTION_HARDENING_REVIEW_2026-05-05.md`.

Launch claim is intentionally conservative: the first P0 execution batch improved the highest-risk public access, RSVP, cache, AI exposure, settings, registry, and public subresource boundaries, but the product is not being marked production-ready until the remaining P0/P1 audits are completed and live/deployed proof is rerun.

### P0 batch fixed/proven locally in this pass

- Public site privacy gate now selects `privacy_mode` and `hide_from_search` inside the server resolver, while keeping those fields out of `SAFE_PUBLIC_SITE_COLUMNS` and the browser-safe payload.
- Public site slug lookup no longer uses fuzzy `site_url` matching that could resolve the wrong site.
- Public site password unlock attempts now use the durable `rsvp_rate_limit` table for scoped rate limiting before password verification.
- Public registry and itinerary Edge Functions now select privacy gate fields server-side and require public, valid password-session, or valid invite-token access before returning subresource data.
- Public registry subresource output no longer uses `select("*")`; it returns an explicit public item projection.
- Public SiteView now passes the earned invite/password access state to itinerary and registry subresource calls and no longer falls back to direct anonymous itinerary/registry selects when the gated function returns empty.
- RSVP lookup no longer issues sessions from broad name search, no longer returns ambiguous guest lists for enumeration, and `lookup_guest` now requires a valid short-lived RSVP session instead of guest ID alone.
- RSVP lookup, event lookup, guest lookup, submit, and public-site password attempts now have scoped durable rate-limit checks.
- Focused static proof remains green for frontend OpenAI/provider-key exposure, service worker cache safety, settings field selection, and launch Edge Function contracts.

### P0 still open or requiring later proof

- Static service-role authorization disposition is now documented and test-guarded; live RLS/service-role proof remains open.
- Email/messaging authorization is improved with service-role gating on queue processing; live send/scheduled-message authorization proof remains open.
- Public-site, RSVP, public registry, and public itinerary changes are local only in this pass. They need deploy approval, Supabase Edge Function deploys, and live postdeploy proof before production status changes.
- Registry preview SSRF remains covered by existing static tests, but the full hostile-target matrix should still be expanded before paid launch.
- Settings privacy controls have local static proof, but owner/collaborator live permission proof remains open.
- SMS/Telnyx remains out of launch scope until provider/compliance readiness.

### Validation run in this pass

- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/serviceWorkerSafety.test.ts src/lib/aiProviderKeySecurity.test.ts src/lib/aiExposureProofScript.test.ts src/lib/settingsErrorSafety.test.ts`: PASS, 5 files, 33 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- `npm run smoke:registry`: PASS, `ok: true`.
- `npm run smoke:rsvp`: PASS after network escalation, `ok: true`, 0 failures.
- `npm run proof:v1:ai-exposure`: PASS static-only, 53/53; live mode not run.
- `npm run guard:file-size`: PASS.
- `npm run proof:v1:board:md`: PASS; proof board now lists the strict P0 blockers instead of claiming none.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS, 1/1.
- `git diff --check`: PASS.

### 2026-05-04 5:48 PM PT continuation

- `process-email-queue` is now service-role bearer gated before it creates the service-role client or reads pending queue rows.
- `registry-preview` now validates AAAA records, blocks private IPv6 targets, and uses a durable `rsvp_rate_limit`-backed rate limit in addition to the existing in-memory limiter.
- Added `docs/service-role-authorization-disposition-2026-05-05.md` so every current service-role Edge Function is classified and no new service-role function can appear undocumented.
- Added `src/lib/serviceRoleAuthorizationDisposition.test.ts` to enforce that service-role inventory.
- `npm test -- --run src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 18/18.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- Remaining strict P0 blockers are narrowed to deploy/function-deploy/live proof for local access-control changes, live RLS/service-role proof after static disposition, and live messaging authorization proof after local queue lockdown.

### 2026-05-04 5:56 PM PT P1 guest import/export safety continuation

- Added shared CSV export escaping in `src/lib/csvExport.ts` so guest and seating exports neutralize spreadsheet formula payloads while still escaping quotes.
- Guest exports and seating/place-card exports now use the shared safe CSV renderer.
- Guest import no longer auto-maps broad `token` / `invite code` headers as invitation tokens; imported tokens must come from deliberate invitation-link/token columns and must parse as a safe RSVP URL token or bounded token string.
- Added regression coverage for CSV formula neutralization, quote escaping, safer invite-token import mapping, and seating CSV export safety.
- `npm test -- --run src/lib/csvExport.test.ts src/lib/guestImportParser.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS, 18/18.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- `npm run smoke:csvmapper`: PASS, `ok: true`.
- Launch status did not change. This closes a focused P1 import/export hardening slice locally, but live/deploy proof and the remaining P0/P1 security, role, messaging, payment, data retention, backup, asset, and architecture work remain open.

### 2026-05-04 6:00 PM PT P1/P2 CI guardrail and payment-bypass continuation

- CI hardpass now runs `npm run guard:file-size` before the core test/build/smoke lane.
- File-size guard baselines were lowered to the current oversized-file counts, so legacy dashboard/page files cannot grow past today's line counts while the split work remains open.
- Production builds now ignore `VITE_ALLOW_PAYMENT_BYPASS`, preventing `?bypassPayment=1` from becoming a paid-feature bypass in production. Local/preview bypass remains explicit and opt-in.
- Added `src/lib/paymentGate.test.ts` to prove production payment bypass is blocked while local preview bypass remains opt-in.
- `npm test -- --run src/lib/paymentGate.test.ts`: PASS, 2/2.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/csvExport.test.ts src/lib/guestImportParser.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/paymentGate.test.ts`: PASS, 39/39.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with current baselines.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This improves paid-launch guardrails locally; full billing/webhook/subscription proof remains open before paid launch.

### 2026-05-04 6:06 PM PT P0/P1 data-boundary continuation

- `Messages.tsx` no longer loads dashboard message rows with `select('*')`; it uses a named explicit projection from `src/pages/dashboard/messages/messageSelect.ts`.
- Legacy `siteRepository.fetchPublicSiteBySlug` no longer selects `privacy_mode` / `hide_from_search` and no longer uses fuzzy `.ilike('site_url', %slug%)` fallback matching.
- `registry-preview` cache reads now use a named explicit cache projection instead of `select("*")`.
- Added `src/lib/dashboardDataBoundary.test.ts` to prevent the broad message select and legacy public-site private-gate/fuzzy fallback from returning.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/publicSiteProject.test.ts`: PASS, 35/35.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/csvExport.test.ts src/lib/guestImportParser.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/paymentGate.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/publicSiteProject.test.ts`: PASS, 74/74.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 17/17 after the registry-preview cache projection guard was added.
- `npm run typecheck -- --pretty false`: PASS after fixing the narrowed message projection typing.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS; the guard correctly caught an intermediate `Messages.tsx` growth and the projection was moved to a small module instead of raising the baseline.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This closes another local data-boundary slice, but live/deploy proof and broader direct-Supabase/service-layer cleanup remain open.

### 2026-05-04 6:12 PM PT P1 guest dashboard projection continuation

- Guest dashboard no longer loads guest rows with `select('*')`; the read now uses an explicit projection for the guest fields that the page actually renders/exports/updates.
- Guest dashboard RSVP attachment no longer loads RSVP rows with `select('*')`; it selects the scoped RSVP fields needed for status, meals, plus-ones, event RSVP, notes, and custom answers.
- Extended `src/lib/dashboardDataBoundary.test.ts` so future changes fail if the broad guest or RSVP selects return.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 3/3.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This closes one more local direct-Supabase projection slice; broader dashboard service extraction remains open.

### 2026-05-04 6:18 PM PT P1 itinerary dashboard projection continuation

- Itinerary dashboard event reads no longer load event rows with `select('*')`; they now use an explicit projection for the timeline fields the page renders and syncs.
- Event guest picker reads no longer load full guest rows with `select('*')`; they now select only guest identity/contact fields needed to invite/remove guests for a specific event.
- Supabase generated types now include the migration-backed itinerary `dress_code` and `notes` columns so the typed projection matches the runtime schema instead of relying on broad reads.
- Extended `src/lib/dashboardDataBoundary.test.ts` so future changes fail if itinerary event or event guest-picker broad selects return.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 4/4 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This closes another local direct-Supabase projection slice; broad dashboard service extraction, role proof, live deploy/function proof, and paid-launch P1 work remain open.

### 2026-05-04 6:20 PM PT P0/P1 public section projection continuation

- Builder/public section reads in `siteRepository.fetchSections` and `siteRepository.fetchPublishedSections` no longer use `select('*')`; they now select the exact persisted section contract parsed by `PersistedSectionSchema`.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard section reads against returning to broad table projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/publicSiteProject.test.ts`: PASS, 38/38 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows another local public/builder data boundary; strict P0 live deploy/function proof and broader service extraction remain open.

### 2026-05-04 6:23 PM PT P1 registry service projection continuation

- Dashboard registry item reads and public direct-fallback registry reads no longer use `select('*')`; they now use a named registry item projection.
- Registry create/update readbacks now use the same explicit registry item projection instead of default full-row readback.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard registry service reads against returning to broad table projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/registry/registryService.test.ts`: PASS, 26/26 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows registry data access locally; full live registry/public gate proof and broader repository/service extraction remain open.

### 2026-05-04 6:26 PM PT P1 planning service projection continuation

- Planning service task, vendor, and budget item reads no longer use `select('*')`; they now use explicit projections matching the service contracts.
- Planning service create readbacks now use the relevant explicit projection instead of default full-row readback.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard planning service reads and insert readbacks against broad projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts`: PASS, 11/11 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows planning data access locally; broader dashboard service extraction, collaborator role proof, and live deploy proof remain open.

### 2026-05-04 6:30 PM PT P1 builder/media projection continuation

- Builder project service wedding-site reads no longer use `select('*')`; project and wedding-data loaders now use explicit site projections for the exact builder fields they need.
- Builder page entry lookup now uses an explicit site identity/name projection instead of loading the full site row.
- Builder media list and save readbacks now use an explicit media asset projection instead of broad/default full-row projections.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard builder editor and media reads against broad projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/publicSiteProject.test.ts`: PASS, 41/41 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows builder/media data access locally; broader service extraction and live deploy proof remain open.

### 2026-05-04 6:33 PM PT P1 vendor profile projection continuation

- Vendor profile create readback and public slug lookup no longer use `select('*')`; they now use an explicit public vendor profile projection.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard vendor profile reads against broad projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 9/9 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows vendor profile data access locally; live deploy proof and broader service extraction remain open.

### 2026-05-04 6:37 PM PT P1 seating service projection continuation

- Seating service event, table, assignment, eligible guest, and layout-version reads no longer use `select('*')`; they now use explicit projections.
- Seating create/update readbacks now use matching explicit projections instead of default full-row readbacks.
- Eligible guest loading no longer pulls full guest rows, which avoids loading invite tokens into the seating surface.
- Extended `src/lib/dashboardDataBoundary.test.ts` to guard seating service reads against broad projections.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS, 16/16 after sandbox escalation for Vite temp-file writes.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS after sandbox escalation for Vite temp-file writes.
- Launch status did not change. This narrows seating data access locally; live deploy proof, collaborator role proof, and broader service extraction remain open.

## P0 - Must fix before real users

### Public site access leaks private gate data

Problem:
The public site frontend appears to select sensitive fields like `site_password_hash`, `guest_access_token`, `privacy_mode`, and `hide_from_search`. Password hashes and invite tokens must never be sent to the browser.

Risk:
Private access controls can be reverse-engineered from client payloads, exposing password-gated or private wedding sites and undermining trust immediately.

Likely files/areas to inspect:
- `src/pages/SiteView.tsx`
- `src/lib/publicSiteProject.ts`
- `src/data/siteRepository.ts`
- `src/lib/activeSite.ts`
- Supabase queries touching `wedding_sites`
- Public site edge-function/RPC access paths

Acceptance criteria:
- Public site browser payloads never include password hashes, guest access tokens, or private gate configuration fields beyond the minimum needed for a safe public access decision.
- Public site UI still correctly handles public, password-protected, invite-only, and hidden/search-disabled modes.
- Regression tests prove sensitive fields are absent from public responses.

Suggested implementation approach:
Move public site reads behind a server-controlled safe projection, then update the frontend to consume only a public-safe shape instead of direct broad table reads.

### Public site privacy/password/invite gating must move server-side

Problem:
Privacy enforcement appears to be happening too much in the frontend instead of through a server-controlled access boundary.

Risk:
A malicious or curious user can bypass client logic, inspect hidden data, or hit data paths the UI was relying on for gating.

Likely files/areas to inspect:
- Public site route loaders/components
- Supabase client reads for wedding-site visibility
- Existing edge functions or RPCs related to access checks
- Password/invite entry flows

Acceptance criteria:
- Privacy/password/invite checks happen server-side through an edge function or RPC.
- The browser receives only the safe site payload for the access state it has earned.
- Failed access attempts return calm generic responses without leaking hidden fields or gate mechanics.

Suggested implementation approach:
Create a single server-side public-site resolver that validates password/invite access, returns a minimal safe view model, and centralizes all privacy-mode branching.

### RSVP lookup is too permissive

Problem:
The RSVP validation edge function appears to use service-role access and may allow guest lookup by name/token in ways that expose guest email, invite token, or other sensitive fields.

Risk:
Guest data could be enumerated or exposed through the RSVP flow, especially for common names or repeated probing.

Likely files/areas to inspect:
- `supabase/functions/validate-rsvp-token/`
- `supabase/functions/submit-rsvp/`
- RSVP lookup/frontend helper code
- Guest and invite-token query helpers

Acceptance criteria:
- RSVP lookup only returns the minimum guest/session state required for RSVP completion.
- Guest email, invite tokens, and unrelated guest records are never returned to the browser.
- Enumeration resistance is improved with stricter lookup semantics and rate limiting.

Suggested implementation approach:
Narrow the edge-function response shape, remove broad service-role projection patterns, and require server-issued scoped session state before exposing RSVP details.

### RSVP flow should not return invite tokens to the browser

Problem:
Current RSVP behavior appears to return invite tokens to the browser.

Risk:
Tokens can be copied, replayed, leaked via client logs/state, or reused outside intended scope.

Likely files/areas to inspect:
- RSVP validation and submit edge functions
- RSVP page/client state handling
- Token persistence or URL handling code

Acceptance criteria:
- Invite tokens are not returned to browser state after lookup.
- The browser uses a short-lived server-generated RSVP session or similarly scoped access artifact instead.
- Replay and cross-guest misuse are materially reduced.

Suggested implementation approach:
Replace raw invite-token return behavior with a short-lived RSVP session minted server-side and validated on subsequent RSVP actions.

### OpenAI API key exposure

Problem:
Any frontend use of `VITE_OPENAI_API_KEY` or direct browser OpenAI calls must be removed.

Risk:
The provider key can be extracted, abused, and used to run up cost or access AI capabilities outside intended controls.

Likely files/areas to inspect:
- Frontend env usage
- `src/lib/openai.ts`
- AI onboarding/generation/photo flows
- Edge functions handling AI requests

Acceptance criteria:
- No browser bundle path reads `VITE_OPENAI_API_KEY` or calls OpenAI directly.
- All model-backed calls run through Supabase edge functions or equivalent backend routes.
- Regression proof confirms no provider key is bundled or exposed.

Suggested implementation approach:
Delete browser-side provider usage entirely, route all AI work through server functions, and keep frontend AI code limited to calling internal endpoints.

### Service worker caches too broadly

Problem:
The service worker appears to cache responses too broadly, including Supabase/API/authenticated/dynamic JSON candidates.

Risk:
Sensitive or stale authenticated data can persist in caches and be served incorrectly across sessions or users.

Likely files/areas to inspect:
- Service worker registration and implementation
- `public/manifest.webmanifest`
- Any cache allowlist/denylist logic
- Build-time PWA config

Acceptance criteria:
- Only safe static same-origin assets are cached.
- Supabase, API, auth, dynamic JSON, and user-specific responses are explicitly excluded.
- Offline/static behavior still works for approved public assets.

Suggested implementation approach:
Tighten cache matching rules to an explicit allowlist for hashed static assets and same-origin shell resources, with hard excludes for API/auth/data paths.

### Email HTML interpolation needs centralized escaping

Problem:
Edge functions that compose email HTML may interpolate user-controlled values without centralized escaping/sanitization.

Risk:
Email HTML injection can break layout, create phishing-looking output, or expose downstream renderer quirks.

Likely files/areas to inspect:
- `supabase/functions/send-wedding-email/`
- `supabase/functions/send-bulk-message/`
- `supabase/functions/process-email-queue/`
- Shared email template helpers

Acceptance criteria:
- Every user-controlled string inserted into email HTML is escaped or sanitized centrally.
- Email templates render correctly with hostile input.
- Tests cover escaping behavior for representative fields.

Suggested implementation approach:
Create one shared escape/sanitize helper for HTML email composition and route all template interpolation through it.

### Registry preview fetcher needs SSRF hardening

Problem:
The registry preview edge function fetches user-provided URLs without sufficient SSRF protections.

Risk:
Attackers may target internal networks, metadata endpoints, oversized responses, redirect chains, or unsafe content types.

Likely files/areas to inspect:
- `supabase/functions/registry-preview/`
- `supabase/functions/registry-preview/urlNormalizer.ts`
- Any shared fetch helpers used by preview/import logic

Acceptance criteria:
- Only allowed protocols are fetched.
- Private IPs, localhost, and metadata endpoints are blocked.
- Redirect count, timeout, size, and content-type limits are enforced.
- Logging captures denied cases without exposing raw internal details to users.

Suggested implementation approach:
Add a hardened fetch wrapper for registry preview with protocol/host validation, DNS/IP rejection rules, strict budgets, and response validation before parse.

### Dashboard settings privacy fields may be read without being selected

Problem:
Dashboard settings code appears to use fields like `privacy_mode`, `hide_from_search`, `guest_access_token`, `default_language`, and `notification_prefs` without always selecting them explicitly.

Risk:
This causes inconsistent runtime behavior, accidental `undefined` logic, and may tempt broad over-selection later.

Likely files/areas to inspect:
- `src/pages/dashboard/Settings.tsx`
- Settings service/repository code
- Supabase selects for wedding-site settings state

Acceptance criteria:
- Every settings consumer only reads fields it explicitly selects.
- Sensitive settings fields are handled intentionally and minimally.
- Tests cover the settings payload contract.

Suggested implementation approach:
Move settings reads into a typed repository/service layer with a canonical selected field list and contract tests.

## P1 - Must fix before paid launch

### Replace or isolate xlsx dependency

Problem:
`npm audit` reports a production-relevant vulnerability around `xlsx`.

Risk:
A vulnerable spreadsheet parser increases attack surface for guest imports or document processing.

Likely files/areas to inspect:
- `package.json`
- Import/upload parsing flows
- Guest import utilities
- Any server-side spreadsheet handling

Acceptance criteria:
- `xlsx` is replaced, upgraded to a safe path, or isolated behind a safer server-side boundary with strict file constraints.
- Import behavior still works for approved formats.
- Security posture is improved and documented in the backlog/proof trail.

Suggested implementation approach:
Prefer replacing the dependency; if not feasible quickly, move parsing to a constrained server path and restrict accepted uploads until replacement is done.

### Fix failed smoke test

Problem:
`npm run smoke:registry` failed.

Risk:
A broken smoke path undermines confidence in registry launch readiness and weakens our regression gate.

Likely files/areas to inspect:
- `package.json` smoke scripts
- Registry smoke test files
- Registry page/service logic

Acceptance criteria:
- `npm run smoke:registry` passes reliably.
- The failure root cause is understood and covered by the correct test layer.

Suggested implementation approach:
Reproduce the failing assertion, decide whether the issue is product logic or test drift, fix the source of truth, then keep the smoke test lean and deterministic.

### Make typecheck, lint, and tests complete reliably

Problem:
`npm run typecheck`, `npm run lint`, and `npm test` timed out in review.

Risk:
Core release gates become too slow or flaky to trust, so regressions slip or team velocity collapses.

Likely files/areas to inspect:
- `package.json` scripts
- Vitest/ESLint/TypeScript config
- CI workflow config
- Oversized test suites or unbounded test discovery

Acceptance criteria:
- Typecheck, lint, and test commands complete in a reasonable and repeatable time locally and in CI.
- Test classes are split clearly enough that we can run focused gates without brute-force full-suite churn every time.

Suggested implementation approach:
Split gates by scope, reduce redundant work, and create a predictable default CI pipeline plus focused local commands.

### Split large dashboard files

Problem:
Large files such as `src/pages/dashboard/Guests.tsx` exceed healthy size and mix unrelated concerns.

Risk:
Changes become fragile, review quality drops, and bugs are easier to introduce in highly coupled files.

Likely files/areas to inspect:
- `src/pages/dashboard/Guests.tsx`
- Other oversized dashboard page files
- Adjacent components/hooks/services that could be extracted

Acceptance criteria:
- The largest dashboard pages are decomposed into feature modules with clearer ownership boundaries.
- Behavior remains unchanged except for intentionally fixed bugs.
- Tests continue to pass with more targeted coverage around extracted units.

Suggested implementation approach:
Extract feature slices incrementally by concern: UI panels, import logic, RSVP config, audit views, local state helpers, and Supabase access.

### Move direct Supabase calls out of page components

Problem:
Too many page components appear to call Supabase directly.

Risk:
Data access becomes inconsistent, hard to secure, and hard to test.

Likely files/areas to inspect:
- Dashboard pages
- Public site pages
- Existing service/repository modules

Acceptance criteria:
- Site, guest, RSVP, registry, messaging, and settings data access is routed through repository/service layers.
- Page components consume typed methods instead of ad hoc queries.

Suggested implementation approach:
Introduce domain repositories gradually and move the highest-risk or most-reused reads/writes first.

### Improve test structure

Problem:
Unit, integration, smoke, and e2e tests are not cleanly separated enough.

Risk:
Running the right proof for the right change is harder than it should be, increasing both missed regressions and wasted time.

Likely files/areas to inspect:
- `tests/`
- `src/**/*.test.*`
- `package.json`
- Playwright/Vitest config

Acceptance criteria:
- Test classes are clearly separated.
- Commands for each test class are documented and easy to run.
- CI can choose the right gate by change risk.

Suggested implementation approach:
Create explicit naming/folder conventions plus script aliases for unit, integration, smoke, and e2e layers.

## P2 - Important cleanup

### Shrink public asset footprint

Problem:
The build output appears very large because public preview GIFs/assets are copied into `dist`.

Risk:
Slower deploys, heavier downloads, and wasted asset shipping hurt product feel and ops efficiency.

Likely files/areas to inspect:
- `public/`
- Template/media preview assets
- Build output strategy
- Preview generation scripts

Acceptance criteria:
- Large preview/demo media is moved to CDN/object storage or replaced with optimized thumbnails.
- App bundle and deploy output size drop materially.

Suggested implementation approach:
Keep only minimal launch-critical preview assets in-app and move bulky demo/media artifacts to an external serving path.

### Add file-size/complexity guardrails

Problem:
There is no strong automated guard against new 2,000+ line page files.

Risk:
The codebase drifts back into the same maintainability trap even after we split the worst offenders.

Likely files/areas to inspect:
- ESLint config
- CI scripts
- Repo conventions docs

Acceptance criteria:
- Guardrails fail or warn when new files exceed agreed complexity/size thresholds.
- Exceptions are explicit rather than accidental.

Suggested implementation approach:
Add lint or CI checks for file length and optionally complexity, tuned to warn first and then enforce once the biggest files are reduced.

### Update stale audit/release docs

Problem:
Some docs appear more confident than actual local checks support.

Risk:
The team may make launch decisions from stale evidence instead of current proof.

Likely files/areas to inspect:
- Release docs
- Audit docs
- Launch backlog/proof files

Acceptance criteria:
- Launch/release docs only claim what current proof supports.
- Stale or superseded documents are marked clearly.

Suggested implementation approach:
Treat proof logs and generated proof boards as canonical, then refresh or demote older docs that overclaim certainty.

### Add security regression tests

Problem:
There are not enough explicit tests proving sensitive fields stay out of public site, RSVP lookup, registry preview, and settings flows.

Risk:
Security regressions can slip back in silently during fast product iteration.

Likely files/areas to inspect:
- Public site tests
- RSVP tests
- Registry preview tests
- Settings payload tests

Acceptance criteria:
- Tests fail if sensitive fields are returned where they should not be.
- Public-site, RSVP, registry-preview, and settings hardening each have regression coverage.

Suggested implementation approach:
Add targeted contract tests at the repository/edge-function boundary plus one browser-level proof where it matters.

### Add rate limiting/audit logging where missing

Problem:
Some risky endpoints still need stronger rate limiting and audit trails.

Risk:
Abuse, brute force, scraping, or expensive endpoint misuse becomes harder to detect and control.

Likely files/areas to inspect:
- RSVP lookup
- Password attempt flows
- Registry preview fetch
- AI generation routes
- Messaging endpoints

Acceptance criteria:
- High-risk endpoints have appropriate rate limiting and useful audit logging.
- Logging is safe and does not leak secrets or sensitive payloads.

Suggested implementation approach:
Standardize a shared rate-limit and audit helper for edge functions, then roll it out by risk priority.

## P3 - Nice to have

### Consider React Query or equivalent query/cache layer

Problem:
Repeated Supabase fetch logic creates inconsistent loading/error/cache behavior.

Risk:
The UI remains harder to reason about than necessary, especially as the app grows.

Likely files/areas to inspect:
- Data-heavy dashboard pages
- Existing local loading/error state patterns
- Service/repository access points

Acceptance criteria:
- Repeated client-fetch patterns are reduced behind a consistent query/cache layer.
- Loading and error states become more uniform.

Suggested implementation approach:
Evaluate introducing React Query or an equivalent layer only after the service/repository boundary is cleaner.

### Improve deployment asset strategy

Problem:
Heavy demo/template media is still shipped too directly in the app bundle/deploy output.

Risk:
This keeps build and deploy weight higher than necessary.

Likely files/areas to inspect:
- `public/`
- Build pipeline
- Preview media generation/storage

Acceptance criteria:
- Deployment strategy avoids bundling unnecessary heavy demo media.
- Preview media is served from a more appropriate asset path.

Suggested implementation approach:
Move media-heavy artifacts to object storage/CDN and keep the app bundle focused on runtime assets.

### Add architecture notes

Problem:
The intended boundaries between frontend, Supabase client, edge functions, service-role functions, and public data access are not documented clearly enough.

Risk:
Future changes can easily reintroduce unsafe patterns because the target architecture is implicit instead of explicit.

Likely files/areas to inspect:
- Root docs
- Security docs
- Data access/service layers

Acceptance criteria:
- There is a concise architecture note documenting which layers may access which data and where privileged logic belongs.
- New contributors can follow the intended boundaries without reverse-engineering them from code.

Suggested implementation approach:
Write a short architecture note after the highest-risk hardening lanes are implemented so it reflects the real target boundary.

## Execution Notes

- 2026-05-04 6:47 PM PT - No-deploy data-boundary hardening batch:
  - Resolved in this batch: name-change planner case/document/extracted-field/snapshot/reminder reads and readbacks now use explicit projections; reminder persistence now writes only schema-backed reminder fields; section repository insert/upsert readbacks now use the persisted-section projection; seating auto-table/auto-seat readbacks now use table/assignment projections; vault dashboard config/entry reads and readbacks now use explicit projections; photo AI analysis service-role upsert readback now uses an explicit analysis projection.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now guards name-change, seating, vault, and section readback projections; `src/lib/launchEdgeFunctions.test.ts` now guards the photo AI analysis explicit readback projection.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/launchEdgeFunctions.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/planning/nameChangeService.test.ts src/pages/dashboard/vaultDate.test.ts src/pages/dashboard/vaultEntryTime.test.ts` (83/83), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This reduces accidental payload drift and broad data reads locally, but production status still requires deploy/function-deploy approval and live P0 proof where applicable.
  - Remaining from this lane: broader dashboard service extraction, live service-role/RLS proof, live email/messaging authorization proof, and paid-launch architecture cleanup remain open.
- 2026-05-04 6:52 PM PT - No-deploy email/messaging authorization hardening batch:
  - Resolved in this batch: direct RSVP notification/confirmation emails are now service-role-only; direct signup welcome sends require the authenticated user's own email; anniversary reminder sends require authenticated site access plus a `weddingSiteId`; Vault now passes that site id into the reminder payload; direct wedding email, queued email, and bulk-message provider failures no longer read/store/log raw provider response bodies.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards direct email authorization boundaries, anniversary site scoping, service-role-only RSVP email types, safe queue error persistence, and status-only provider diagnostics.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (18/18), targeted provider-body scan for the touched email functions, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local messaging relay/provider-error risk, but live email/messaging authorization proof after deploy/function deploy remains open.
- 2026-05-04 6:56 PM PT - No-deploy email runtime hardening continuation:
  - Resolved in this batch: `send-wedding-email`, `send-bulk-message`, and `process-email-queue` now reject non-POST runtime requests with `METHOD_NOT_ALLOWED`; all three email-provider paths sanitize subject strings to strip control characters, collapse whitespace, cap length, and provide a safe fallback before calling Resend.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards POST-only method enforcement and subject sanitization across direct, bulk, and queued email functions.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (18/18), targeted method/subject source scan, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This closes another local email runtime safety slice, but live email/messaging authorization proof after deploy/function deploy remains open.
- 2026-05-04 7:05 PM PT - No-deploy guest contact access hardening batch:
  - Resolved in this batch: public guest contact lookup is now POST-only and rate-limited; lookup requires a full-name match instead of partial name enumeration; lookup returns short-lived signed `contact_session` values instead of guest ids or household ids; guest contact submit now verifies that signed session, expiry, site scope, and guest scope before any service-role write. `submit-rsvp`, `validate-rsvp-token`, and `submit-contact-request` now also reject non-POST runtime requests after CORS preflight.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards guest contact lookup/session scoping, removal of browser-trusted guest id submit, full-name lookup behavior, POST-only method gates, and the frontend `contact_session` contract.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (19/19 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
  - Launch status: unchanged. This removes a local service-role/public guest-contact trust gap, but production status still depends on approved deploy/function deploy and live P0 proof.
- 2026-05-04 7:09 PM PT - No-deploy service-role method-boundary hardening batch:
  - Resolved in this batch: all current service-role Edge Functions now have an explicit runtime method gate before privileged work. The batch added POST-only gates to token generation, Google Drive auth/health, photo album create/moderate, public itinerary/registry subresources, setup bootstrap, Stripe checkout/subscription/SMS-credit/verify/webhook paths, and vault resolve/upload paths. Stripe checkout/SMS/subscription CORS method allowlists were narrowed to `POST, OPTIONS`.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the service-role POST-only inventory and Stripe CORS method allowlists.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (20/20 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, targeted service-role method inventory scan, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
  - Launch status: unchanged. This narrows local privileged-function runtime exposure, but production status still depends on approved deploy/function deploy and live P0 proof.
- 2026-05-04 7:14 PM PT - No-deploy provider/webhook diagnostic hardening batch:
  - Resolved in this batch: Google Drive OAuth callback failures no longer return raw OAuth query errors or server-env wording; Google Drive token-exchange failures, vault Google Drive upload failures, and vault Google Drive file-resolve failures now log status-only diagnostics instead of raw provider JSON; Stripe webhook signature failures now return fixed safe copy instead of provider/library exception text.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards status-only Google Drive/vault diagnostics, fixed OAuth callback copy, and fixed Stripe webhook signature failure copy.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (20/20 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
  - Launch status: unchanged. This narrows local provider diagnostic leakage risk, but production status still depends on approved deploy/function deploy and live P0 proof.
- 2026-05-04 7:17 PM PT - No-deploy public Edge Function error-safety hardening batch:
  - Resolved in this batch: public guest hub config/track, guest recap config, public itinerary, public registry, queue guest followups, and client-error logging paths no longer return raw `Supabase not configured`, `server misconfigured`, or raw exception-message responses to callers. Public itinerary/registry misconfiguration now fails closed with empty public subresource payloads.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards fixed public config/recap copy, empty public itinerary/registry fail-closed responses, queue followup safe config copy, and fixed client-error logger unexpected-failure copy.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (20/20 after known Vite temp-file sandbox escalation), targeted raw config/error string scan, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public/internal error wording leakage risk, but production status still depends on approved deploy/function deploy and live P0 proof.
- 2026-05-04 7:23 PM PT - No-deploy messaging permission and public vault upload abuse hardening batch:
  - Resolved in this batch: `queue-guest-followups` now requires collaborator `messages` permission instead of accepting `photos` permission for an email-queue action. `vault-upload-google-drive` now rate-limits public Drive upload attempts, restricts uploads to image/video/audio MIME types excluding SVG, caps base64 payload size to the existing 35MB vault video ceiling, validates base64 shape before provider work, and sanitizes Drive file names before upload metadata is sent.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the queue followup messages-only permission boundary and the Vault Drive upload rate limit, MIME, SVG, size, and filename validation controls.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (20/20 after known Vite temp-file sandbox escalation), targeted source scan for the queue permission and Vault upload controls, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts`, and `git diff --check`.
  - Launch status: unchanged. This closes two local P0/P1 authorization/abuse gaps, but production status still depends on approved deploy/function deploy and live P0 proof.
- 2026-05-04 7:27 PM PT - No-deploy provider-missing copy cleanup:
  - Resolved in this batch: direct email, queued email, and SMS-provider-missing branches no longer return implementation wording such as `Email service not configured` or SMS credential configuration text to callers.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now blocks those provider/config wording regressions.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (20/20 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local provider/config wording exposure, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:30 PM PT - No-deploy AI/preview diagnostic log hardening:
  - Resolved in this batch: photo AI analysis, onboarding AI orchestration, and registry preview unexpected-failure paths no longer log raw exception messages that could include provider, token, storage, parser, or fetch internals. Photo AI usage-event insert failures now log a fixed reason instead of database error text.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards fixed diagnostic reasons for photo AI, onboarding AI, and registry preview failure logs.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (21/21 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local internal diagnostic retention risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:35 PM PT - No-deploy service-role diagnostic log sweep:
  - Resolved in this batch: setup bootstrap, site translation, bulk messaging, email queue, direct wedding email, guest contact lookup/submit, Vault attachment resolve/upload, and Google Drive auth/health unexpected/error paths no longer log raw caught error objects or database/provider error objects in the hardened branches. They now log fixed reason codes.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the hardened function set against `console.error(..., err/error/DB error object)` regressions and checks the fixed reason codes.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (22/22 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local internal diagnostic retention risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:39 PM PT - No-deploy Stripe/payment diagnostic hardening:
  - Resolved in this batch: Stripe checkout, subscription checkout, SMS-credit checkout, checkout verification, and webhook update/unexpected paths no longer log raw Stripe/library or database error objects in the hardened branches. They now log fixed reason codes.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards fixed Stripe diagnostic reasons and blocks raw Stripe/payment update error-object logging regressions.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (23/23 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local billing/provider diagnostic retention risk, but production status still depends on approved deploy/function deploy and live billing proof before paid launch.
- 2026-05-04 7:43 PM PT - No-deploy photo album/moderation diagnostic hardening:
  - Resolved in this batch: photo album create/manage and photo upload moderation save/unexpected paths no longer log raw database or caught error objects in the hardened branches. They now log fixed reason codes.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards fixed photo album/moderation diagnostic reasons and blocks raw error-object logging regressions.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (23/23 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, and `npm run build` after the known Vite temp-file sandbox escalation.
  - Launch status: unchanged. This narrows local media/service-role diagnostic retention risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:48 PM PT - No-deploy guest/public diagnostic hardening:
  - Resolved in this batch: client error logging, contact request submit, guest followup queue marking/unexpected failures, public-site access, RSVP validate/submit, guest recap config, and token generation hardened branches no longer log raw caught error objects or database error objects. They now log fixed reason codes.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now includes those public/guest functions in the fixed diagnostic guard set and checks the new reason codes.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (23/23 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This narrows local guest/public diagnostic retention risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:54 PM PT - No-deploy residual Edge Function diagnostic sweep:
  - Resolved in this batch: remaining concrete raw database/provider diagnostic logs in bulk messaging SMS credit/scheduled-message loads, photo moderation collaborator load, site translation load, photo album parent/collaborator loads, Stripe SMS-credit webhook writes, queue guest followup inserts, and Stripe webhook signature handling now use fixed reason codes instead of raw error objects or exception-derived branches.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now blocks those raw diagnostic-object regressions and checks the new fixed reason codes.
  - Validation passed: focused raw diagnostic scan across `supabase/functions`, `src/lib`, and `src/pages`; `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (23/23 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local internal diagnostic retention risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 7:59 PM PT - No-deploy public-safe client contract hardening:
  - Resolved in this batch: the browser-side public-site access client now sanitizes the resolver `site` payload into an explicit public-safe shape instead of casting the Edge Function response through unchanged. Unexpected fields such as password hashes, guest access tokens, owner ids, notification settings, billing ids, privacy mode, and hidden/search internals are dropped before `SiteView` can consume the row.
  - Proof added/updated: `src/lib/publicSiteAccess.test.ts` now proves the client sanitizer keeps only the public-safe fields and rejects malformed site payloads.
  - Validation passed: `npm test -- --run src/lib/publicSiteAccess.test.ts src/lib/launchEdgeFunctions.test.ts` (25/25 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local client-side payload leak blast radius, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 8:02 PM PT - No-deploy production demo-mode safety hardening:
  - Resolved in this batch: production builds now ignore `VITE_DEMO_MODE`, preventing an accidentally enabled production env flag from activating local demo auth behavior. Local and preview proof builds still support explicit demo mode.
  - Proof added/updated: `src/config/env.test.ts` now proves demo mode is blocked in production builds and remains opt-in outside production.
  - Validation passed: `npm test -- --run src/config/env.test.ts src/lib/paymentGate.test.ts src/lib/publicSiteAccess.test.ts` (6/6 after known Vite temp-file sandbox escalation), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build` after the known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local demo/bypass production risk, but production status still depends on approved deploy/function deploy and live proof.
- 2026-05-04 10:19 PM PT - No-deploy coordinator dashboard split continuation:
  - Resolved in this batch: extracted Coordinator Mode local dashboard types into `src/pages/dashboard/coordinator/coordinatorDashboardTypes.ts` and lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2839 to 2813 lines.
  - Proof added/updated: focused coordinator tests and the coordinator day-of proof cover role boundaries, queue filtering, timeline truth, check-in guard behavior, and build integrity after the split.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts` (6/6 after known Vite temp-file sandbox escalation), `npm run proof:v1:coordinator-dayof` after known Vite/build temp-file sandbox escalation, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 dashboard maintainability risk with no runtime behavior change, but live RSVP/public proof blockers and broader dashboard splitting remain.
- 2026-05-04 10:25 PM PT - No-deploy guest photo sharing split continuation:
  - Resolved in this batch: extracted Guest Photo Sharing row types, hub defaults, bucket-link storage helpers, tag formatting, AI analysis label helpers, and event-moment tag generation into `src/pages/dashboard/guestPhotoSharingUtils.ts`; added focused utility tests; lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3609 to 3404 lines.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingUtils.test.ts` covers tag labels, event album tag derivation, customer-safe AI labels, defensive local storage reads/writes, and unavailable-storage behavior.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts` (20/20 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:ai-rollout`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 photo dashboard maintainability risk and keeps local AI/photo rollout proof green, but production/live proof remains approval-gated.
- 2026-05-04 10:31 PM PT - No-deploy name-change planner split continuation:
  - Resolved in this batch: extracted Name Change planner UI types, local storage keys, status priority ordering, status-label helpers, chip/tone helpers, action-feed labels, and account-update template copy helpers into `src/pages/dashboard/planning/nameChangePlannerUi.ts`; added focused UI helper tests; lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2754 to 2526 lines.
  - Proof added/updated: `src/pages/dashboard/planning/nameChangePlannerUi.test.ts` covers owner-facing status labels, document/activity labels, planner chip/tone mappings, action-feed copy, and target status vault priority ordering.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts` (49/49 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 planning maintainability risk with no feature removal, but live proof blockers and remaining oversized dashboard pages remain.
- 2026-05-04 10:34 PM PT - No-deploy settings helper split continuation:
  - Resolved in this batch: extracted Settings RSVP question factory, language labels, translation status date labels, customer-safe settings error helper, site-missing copy, and planner permission label helper into `src/pages/dashboard/settings/settingsDashboardUtils.ts`; added focused helper tests; lowered the file-size guard baseline for `Settings.tsx` from 2399 to 2378 lines.
  - Proof added/updated: `src/pages/dashboard/settings/settingsDashboardUtils.test.ts` covers blank RSVP question shape, language/translation labels, customer-safe error fallback behavior, and planner permission labels. The test initially caught a label expectation mismatch (`Guests` vs `Guest list`) and was corrected to the product’s actual label.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts` (9/9 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 settings maintainability risk without changing privacy/settings behavior, but live proof blockers and broader dashboard extraction remain.
- 2026-05-04 10:41 PM PT - No-deploy messages helper split continuation:
  - Resolved in this batch: extracted Messages dashboard delivery status helpers, saved composer template storage/normalization, composer template registry, channel reachability helpers, schedule formatting, audience/count helpers, campaign labels, customer-safe delivery reason copy, and recipient review copy into `src/pages/dashboard/messages/messageDashboardUtils.ts`; added focused helper tests; lowered the file-size guard baseline for `Messages.tsx` from 3936 to 3678 lines.
  - Proof added/updated: `src/pages/dashboard/messages/messageDashboardUtils.test.ts` covers delivery status classes, delivery row scoping, saved template normalization/storage limits, schedule/channel reachability, audience/count/template labels, safe delivery copy, and composer template registry coverage. Initial assertions caught two contract mismatches and were corrected to the current product behavior.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts` (26/26 after known Vite temp-file sandbox escalation), `npm run smoke:messages`, `npm run build` after known Vite temp-file sandbox escalation, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 messaging maintainability risk and keeps the permission smoke green, but live messaging authorization proof after deploy remains open.
- 2026-05-04 10:43 PM PT - No-deploy guests helper split continuation:
  - Resolved in this batch: extracted Guests dashboard customer-safe error helpers, guest import read-error allowlist, RSVP question factory, and title-case helper into `src/pages/dashboard/guests/guestDashboardUtils.ts`; added focused helper tests; lowered the file-size guard baseline for `Guests.tsx` from 5250 to 5223 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` covers safe fallback behavior, allowed import validation copy, blank RSVP question shape, and title-case behavior.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (12/12 after known Vite temp-file sandbox escalation), `npm run smoke:csvmapper`, `npm run build` after known Vite temp-file sandbox escalation, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 guest dashboard maintainability risk and keeps CSV mapper/import smoke green, but live RSVP/public proof blockers remain.
- 2026-05-04 10:49 PM PT - No-deploy seating demo-storage split continuation:
  - Resolved in this batch: extracted Seating demo itinerary storage, demo seating state storage, and seating layout version storage helpers into `src/pages/dashboard/seating/seatingDemoStorage.ts`; added focused storage tests; lowered the file-size guard baseline for `Seating.tsx` from 2334 to 2271 lines.
  - Proof added/updated: `src/pages/dashboard/seating/seatingDemoStorage.test.ts` covers bundled demo itinerary fallback, invalid storage recovery, incomplete itinerary row filtering, per-event seating state isolation, and the 40-version storage cap.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/seating/seatingDemoStorage.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts` (14/14 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 seating dashboard maintainability risk without changing seating behavior, but live RSVP/public proof blockers remain.
- 2026-05-04 10:53 PM PT - No-deploy messages demo-storage split continuation:
  - Resolved in this batch: extracted Messages demo message seed, demo message localStorage read/write, and RSVP continuity storage/event constants into `src/pages/dashboard/messages/messageDemoStorage.ts`; added focused storage tests; lowered the file-size guard baseline for `Messages.tsx` from 3678 to 3601 lines.
  - Proof added/updated: `src/pages/dashboard/messages/messageDemoStorage.test.ts` covers deterministic demo seed timing, invalid/empty storage fallback, and stored demo history read/write.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts` (29/29 after known Vite temp-file sandbox escalation), `npm run smoke:messages`, `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 messaging maintainability risk and keeps the message permission smoke green, but live messaging/public proof blockers remain.
- 2026-05-04 10:58 PM PT - No-deploy guests local-state storage split continuation:
  - Resolved in this batch: extracted Guests campaign preset, follow-up task, saved segment, and campaign log localStorage helpers into `src/pages/dashboard/guests/guestDashboardStorage.ts`; added focused storage tests; lowered the file-size guard baseline for `Guests.tsx` from 5223 to 5192 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardStorage.test.ts` covers valid preset persistence, invalid preset rejection, invalid array-storage fallback, and 12-item caps for follow-up tasks, saved segments, and campaign logs.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/guests/guestDashboardStorage.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (15/15 after known Vite temp-file sandbox escalation), `npm run smoke:csvmapper`, `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 guest dashboard maintainability and stale browser-state risk without changing guest import/export behavior, but live RSVP/public proof blockers remain.
- 2026-05-04 11:03 PM PT - No-deploy settings RSVP demo-storage split continuation:
  - Resolved in this batch: extracted Settings demo RSVP settings storage into `src/pages/dashboard/settings/settingsDemoStorage.ts`; centralized RSVP question and meal-option normalization in `settingsDashboardUtils.ts`; added focused storage/normalization tests; lowered the file-size guard baseline for `Settings.tsx` from 2378 to 2339 lines.
  - Proof added/updated: `src/pages/dashboard/settings/settingsDemoStorage.test.ts` covers normalized demo RSVP storage reads, invalid storage fallback, and demo writes. `settingsDashboardUtils.test.ts` now covers reusable RSVP question and meal-option normalization used by both demo and live settings hydration.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/settings/settingsDemoStorage.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts` (13/13 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 settings maintainability and duplicated parser risk without changing privacy/settings behavior, but live public/settings proof remains deploy-gated.
- 2026-05-04 11:06 PM PT - No-deploy name-change planner preference split continuation:
  - Resolved in this batch: moved Name Change planner admin-toggle and collapsed-section localStorage helpers into `src/pages/dashboard/planning/nameChangePlannerUi.ts`; added defensive preference tests; lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2526 to 2499 lines.
  - Proof added/updated: `src/pages/dashboard/planning/nameChangePlannerUi.test.ts` now covers admin preference persistence, collapsed-section persistence, invalid/non-boolean collapsed-section filtering, and invalid JSON fallback.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts` (50/50 after known Vite temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 planner maintainability and stale preference risk without changing the name-change planner feature surface, but broader dashboard extraction and live proof blockers remain.
- 2026-05-04 11:13 PM PT - No-deploy coordinator storage adapter split continuation:
  - Resolved in this batch: extracted Coordinator Mode timeline, alert log, Q&A, session, draft, active-work, guest-work, timeline-work, command, and alert-intent storage into `src/pages/dashboard/coordinator/coordinatorStorage.ts`; added focused storage tests; lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2813 to 2794 lines.
  - Proof added/updated: `src/pages/dashboard/coordinator/coordinatorStorage.test.ts` covers legacy key stability, normalized timeline/Q&A storage, invalid JSON fallback, session/draft/command/alert-intent round trips, and active work id cleanup. The adapter now drops unusable cached Q&A rows with blank ids/questions before they can rehydrate coordinator state.
  - Validation passed: `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm test -- --run src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts` (10/10 after known Vite temp-file sandbox escalation and one stale-Q&A assertion caught/fixed), `npm run proof:v1:coordinator-dayof` (5/5 after known Vite/build temp-file sandbox escalation), `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 coordinator maintainability and stale local cache risk while keeping coordinator proof green, but live public/RSVP proof blockers remain.
- 2026-05-04 11:16 PM PT - No-deploy messages storage utility split continuation:
  - Resolved in this batch: moved saved composer-template storage migration and photo album link parsing/counting out of `Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`; lowered the file-size guard baseline for `Messages.tsx` from 3601 to 3572 lines.
  - Proof added/updated: `src/pages/dashboard/messages/messageDashboardUtils.test.ts` now covers saved template migration with invalid row filtering, defensive photo album link parsing, preferred photo link fallback behavior, and malformed array-storage rejection.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts` (16/16 after known Vite temp-file sandbox escalation), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:messages`, `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1 after known Vite temp-file sandbox escalation), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 messaging maintainability and stale browser-state risk while keeping message permission smoke green, but live messaging/public proof remains deploy-gated.
- 2026-05-05 7:01 AM PT - No-deploy guests demo RSVP storage split continuation:
  - Resolved in this batch: moved demo RSVP custom-question and meal-option localStorage reads/writes out of `Guests.tsx` into `src/pages/dashboard/guests/guestDashboardStorage.ts`; lowered the file-size guard baseline for `Guests.tsx` from 5192 to 5186 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardStorage.test.ts` now covers normalized demo RSVP config reads, invalid question filtering, non-string meal option filtering, demo config writes, and invalid JSON fallback to safe defaults.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardStorage.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (17/17 after known Vite temp-file sandbox escalation), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:csvmapper`, `npm run build` after known Vite temp-file sandbox escalation, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1), and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 guest dashboard maintainability and stale demo RSVP config risk while keeping CSV mapper/import smoke green, but live RSVP/public proof blockers remain.
- 2026-05-05 7:42 AM PT - No-deploy guest-facing RSVP demo storage split continuation:
  - Resolved in this batch: moved guest-facing demo RSVP meal config, custom questions, and stored response parsing/writing out of `RSVP.tsx` into `src/pages/rsvpDemoStorage.ts`; lowered the file-size guard baseline for `RSVP.tsx` from 1993 to 1962 lines.
  - Proof added/updated: `src/pages/rsvpDemoStorage.test.ts` covers defensive demo meal config reads, malformed question filtering, invalid storage fallback, and demo RSVP response persistence.
  - Validation passed: `npm test -- --run src/pages/rsvpDemoStorage.test.ts src/pages/RSVP.test.tsx src/pages/rsvpDeadline.test.ts` (117/117), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1), and `git diff --check`.
  - Validation still blocked live: `npm run smoke:rsvp` failed in sandbox with DNS `ENOTFOUND`, then after network escalation reached Supabase and failed with the existing deployed 503 responses for all RSVP paths.
  - Launch status: unchanged. This reduces local RSVP page maintainability and stale demo-storage risk while preserving guest-facing RSVP tests, but live RSVP proof remains blocked by deployed function behavior.
- 2026-05-05 7:45 AM PT - No-deploy name-change snapshot parser hardening continuation:
  - Resolved in this batch: moved Name Change planner document snapshot draft parsing into `parseDocumentSnapshotDraft` in `src/pages/dashboard/planning/nameChangePlannerUi.ts`; invalid JSON and array-shaped drafts now stay local until corrected instead of being committed to document metadata.
  - Proof added/updated: `src/pages/dashboard/planning/nameChangePlannerUi.test.ts` now covers blank snapshot clearing, valid object parsing, malformed JSON rejection, and array rejection.
  - Guardrail tightened: lowered `NameChangePlannerTab.tsx` file-size baseline from 2499 to 2493 lines.
  - Validation passed: `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts` (51/51), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `npm run proof:v1:board:md`, `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1), and `git diff --check`.
  - Launch status: unchanged. This reduces local planner metadata corruption risk while preserving the advanced snapshot editor, but broader dashboard extraction and live proof blockers remain.
- 2026-05-05 7:51 AM PT - No-deploy guest photo export helper split continuation:
  - Resolved in this batch: moved bucket upload, guestbook, prospect, and curation CSV builders out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotoSharingUtils.ts`; lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3404 to 3340 lines.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingUtils.test.ts` now covers CSV escaping, bucket export filenames, guestbook/prospect export rows, curation export labels, low-confidence review reasons, and GPS flag export behavior.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts` (22/22 after one filename cleanup assertion caught/fixed), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run proof:v1:ai-rollout`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local photo dashboard/export maintainability risk while keeping AI/photo rollout proof green, but production/live proof remains approval-gated.
- 2026-05-05 8:00 AM PT - No-deploy guest photo recap export split continuation:
  - Resolved in this batch: moved memory-chapter and curated-recap JSON payload builders out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotoSharingUtils.ts`; lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3340 to 3299 lines.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingUtils.test.ts` now pins the memory chapter export shape and curated recap summary/highlight/duplicate/slideshow export shape with deterministic timestamps.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts` (9/9), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run proof:v1:ai-rollout`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local photo dashboard/recap export maintainability risk while keeping AI/photo rollout proof green, but production/live proof remains approval-gated.
- 2026-05-05 8:04 AM PT - No-deploy guest photo share-link export split continuation:
  - Resolved in this batch: moved photo share message, active share-message list, known-link list, share-pack CSV, and album-link CSV builders out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotoSharingUtils.ts`; lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3299 to 3236 lines.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingUtils.test.ts` now covers active-only sharing messages, known-link extraction, CSV escaping for quoted album names/messages, backup folder URL export, and empty-export fallbacks.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts` (10/10), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run proof:v1:ai-rollout`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local photo dashboard/share-link export maintainability risk while preserving existing download/copy behavior; production/live proof remains approval-gated.
- 2026-05-05 8:09 AM PT - No-deploy seating table-summary export hardening:
  - Resolved in this batch: moved table-summary CSV construction out of `Seating.tsx` into `src/pages/dashboard/seating/seatingDashboardUtils.ts`; lowered the file-size guard baseline for `Seating.tsx` from 2271 to 2259 lines.
  - Security hardening: the new focused test caught that risky meal labels inside the joined meal-count cell were not neutralized when the cell began with a safe meal label. The helper now neutralizes each meal label before joining the table-summary export.
  - Proof added/updated: `src/pages/dashboard/seating/seatingDashboardUtils.test.ts` now covers table-summary CSV escaping, quoted table names, and embedded spreadsheet-formula meal labels.
  - Validation passed: `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts` (10/10 after the formula-label assertion caught/fixed the issue), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local seating export maintainability and spreadsheet-injection risk without changing seating export features; live RSVP/public proof blockers remain.
- 2026-05-05 8:15 AM PT - No-deploy guest export builder split continuation:
  - Resolved in this batch: moved main guest export, thank-you due, checked-in, address collection, household labels, and event-attendance CSV builders out of `Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`; lowered the file-size guard baseline for `Guests.tsx` from 5186 to 5060 lines.
  - Security hardening: focused tests now pin spreadsheet-safe formula neutralization for guest names and meal choices, invite-token URL encoding in owner-only exports, grouped household labels, address export fields, event invitation scoping, and custom-answer export rows.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers six guest export contracts, including event attendance and household label behavior.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (16/16), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:csvmapper`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local guest export maintainability and spreadsheet-injection regression risk without removing export features; live RSVP/public proof blockers remain.
- 2026-05-05 8:19 AM PT - No-deploy guest queue scoring split continuation:
  - Resolved in this batch: moved guest issue counting, priority scoring, name sorting, and checked-in display ordering out of `Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`; lowered the file-size guard baseline for `Guests.tsx` from 5060 to 5015 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers unresolved RSVP issue counts, priority scoring near the wedding date, deterministic last-name sorting, priority sorting, and check-in mode ordering.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (18/18), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local guest dashboard maintainability risk and pins follow-up queue ordering without changing guest operations behavior; live RSVP/public proof blockers remain.
- 2026-05-05 8:27 AM PT - No-deploy guest RSVP operations summary split continuation:
  - Resolved in this batch: moved guest contact coverage, RSVP operations counters, recommended action selection, RSVP completeness, campaign readiness, and operations queue construction out of `Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`; lowered the file-size guard baseline for `Guests.tsx` from 5015 to 4932 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers contact coverage, pending/no-contact RSVP counters, missing meal and plus-one counters, ceremony/reception decline parsing, recommended-action priority, bounded readiness/completeness math, and stable bounded operations queue construction.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (22/22 after one expected weighted-readiness assertion was corrected), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local guest dashboard maintainability risk and pins owner-facing RSVP follow-up math without changing guest operations behavior; live RSVP/public proof blockers remain.
- 2026-05-05 8:34 AM PT - No-deploy guest household and RSVP insight rollup split continuation:
  - Resolved in this batch: moved household grouping, meal-choice rollups, custom-answer rollups, song-request extraction, and filtered meal summary counts out of `Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`; lowered the file-size guard baseline for `Guests.tsx` from 4932 to 4860 lines.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers deterministic household sorting/grouping, meal rollup fallbacks, custom-answer aggregation, song request extraction, and dietary-note/meal summary counts.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (24/24), `npm run typecheck` (after one fixture type annotation fix), `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local guest dashboard maintainability risk and pins household/RSVP insight behavior without changing dashboard UI, exports, or guest operations; live RSVP/public proof blockers remain.
- 2026-05-05 11:18 AM PT - No-deploy public-site RSVP widget access gate hardening:
  - Resolved in this batch: public RSVP section submissions no longer insert directly into `site_rsvps` from browser code. `src/sections/components/RsvpSection.tsx` now uses the existing `public-site-access` gate state and submits through the new `public-site-rsvp-submit` Edge Function. The builder-backed multi-event RSVP variant in `src/sections/variants/rsvp/multiEvent.tsx` now uses the same gated function instead of resolving a site id and inserting directly.
  - Security hardening: `supabase/functions/public-site-rsvp-submit/index.ts` reuses `canReadPublicSubresource`, validates password/invite access server-side, rate-limits public widget submits through `rsvp_rate_limit`, and writes `site_rsvps` with service-role only after the same public access gate is satisfied.
  - Defense in depth: `supabase/migrations/20260505102000_site_rsvps_public_gate_rls.sql` adds `guest_email` for the multi-event template path and narrows direct anon/authenticated `site_rsvps` inserts to published `privacy_mode = 'public'` sites, so password/invite pages cannot be bypassed with only a known site id.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the new function, method gate, shared public gate usage, no direct public RSVP table insert, no direct browser wedding-site id lookup in the RSVP section or multi-event variant, and the RLS public-only policy. `src/sections/components/RsvpSection.test.tsx` now proves the public RSVP widget sends slug, invite token, password session, guest name, count, and notes through `public-site-rsvp-submit`. `src/sections/variants/rsvp/multiEvent.test.tsx` now proves the multi-event path preserves name, email, access state, status, count, and notes through the same function.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx src/lib/publicSiteAccess.test.ts` (37/37 after one Vitest mock-hoist harness fix in the first focused run), `npm run typecheck`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This closes a local public-widget bypass risk without removing the public RSVP widget, but production status still requires applying the migration, deploying the new function, and rerunning live public/RSVP proof. No deploy was run.
- 2026-05-05 11:23 AM PT - No-deploy bulk messaging service-role projection hardening:
  - Resolved in this batch: `supabase/functions/send-bulk-message/index.ts` no longer loads message delivery rows through `select("*, wedding_sites(...)")`; it now uses an explicit `MESSAGE_DELIVERY_SELECT` projection limited to the fields needed for authorization, audience selection, send content, and status updates.
  - Security hardening: the email-send cap load branch no longer logs the raw database error object; it logs a fixed reason code while returning the existing customer-safe error.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the explicit projection, blocks reintroducing the broad `select("*, wedding_sites` pattern, and blocks the raw `sentErr` log branch.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local service-role overfetching and raw diagnostic leakage in bulk messaging while preserving the email/SMS-deferred messaging behavior; live messaging authorization proof remains required. No deploy was run.
- 2026-05-05 11:26 AM PT - No-deploy Edge Function raw diagnostic cleanup:
  - Resolved in this batch: removed raw error-object logging from focused Edge Function branches in `submit-contact-request`, `setup-bootstrap`, `photo-upload-moderate`, and `vault-resolve-entry-link`.
  - Security hardening: these branches now log stable reason codes instead of database/storage error objects, while keeping the existing customer-safe fallback messages and behavior.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now guards the fixed reason-code logs and blocks reintroducing the raw `guestErr`, `siteErr`, `uploadsErr`, and `signedErr` log paths.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local backend diagnostic leakage risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:28 AM PT - No-deploy photo album lookup diagnostic cleanup:
  - Resolved in this batch: `supabase/functions/photo-album-manage/index.ts` no longer logs the raw `albumErr` object on album lookup failures.
  - Security hardening: the lookup branch now logs the fixed `ALBUM_LOOKUP_FAILED` reason code and keeps the existing customer-safe album-load fallback message.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the fixed lookup reason code and blocks reintroducing `PHOTO_ALBUM_MANAGE_LOOKUP_FAILED", albumErr`; the generic hardened Edge Function diagnostic regex now catches `albumErr` raw logs.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This further narrows local photo-management diagnostic leakage risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:31 AM PT - No-deploy RSVP guest payload minimization:
  - Resolved in this batch: `supabase/functions/validate-rsvp-token/index.ts` no longer includes `wedding_site_id` in the sanitized guest object returned to RSVP browser flows.
  - Security hardening: the RSVP page did not use the site id, so the internal site identifier was removed from the public guest-safe contract without removing invite-link RSVP, manual session lookup, household RSVP, event RSVP, or submit behavior.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now extracts the `sanitizeGuest` body and blocks reintroducing `wedding_site_id: guest.wedding_site_id`; `src/pages/rsvpTypes.ts` and the demo mapping were updated to match the minimized browser contract.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx` (134/134), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows the local RSVP browser payload; live RSVP function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:32 AM PT - No-deploy service worker cache safety hardening:
  - Resolved in this batch: `public/sw.js` now refuses to cache any request carrying an `Authorization` header and no longer falls back to cached `/` when a static fetch fails.
  - Security hardening: service worker runtime caching remains limited to same-origin static assets, while authenticated/API/dynamic JSON/data requests and stale HTML fallback paths stay outside the cache response path.
  - Proof added/updated: `src/lib/serviceWorkerSafety.test.ts` now guards the authorization-header exclusion, query-string exclusion, no HTML root fallback, and same-origin Supabase/auth/function/storage exclusions.
  - Validation passed: `npm test -- --run src/lib/serviceWorkerSafety.test.ts` (1/1), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This closes a local browser-cache safety gap; live browser cache proof remains postdeploy/QA-gated. No deploy was run.
- 2026-05-05 11:35 AM PT - No-deploy public RSVP widget diagnostic guard hardening:
  - Resolved in this batch: `supabase/functions/public-site-rsvp-submit/index.ts` now uses explicit fixed reason codes for insert and unexpected failure branches.
  - Security hardening: the new public RSVP widget function is now included in the hardened Edge Function diagnostic sweep, so raw caught-error logs and weak diagnostic regressions are blocked alongside the other launch-sensitive functions.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `PUBLIC_SITE_RSVP_INSERT_FAILED` and `UNEXPECTED_PUBLIC_SITE_RSVP_FAILURE` reason codes and includes `public-site-rsvp-submit` in the raw-log diagnostic guard list.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This improves local diagnostic proof for the new widget submit function; production still needs function deploy/live proof. No deploy was run.
- 2026-05-05 11:37 AM PT - No-deploy RSVP rate-limit token marker hardening:
  - Resolved in this batch: `supabase/functions/submit-rsvp/index.ts` and `supabase/functions/validate-rsvp-token/index.ts` no longer write raw invite-token prefixes into `rsvp_rate_limit.guest_token`.
  - Security hardening: rate-limit rows now keep hashed subject markers for invite-token lookup/submit paths, preserving durable throttling while avoiding raw secret fragments in diagnostic/rate-limit storage.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now blocks `guest_token: inviteToken.slice(0, 16)` and `guest_token: (subject ?? scope).slice(0, 16)`, and requires the hashed subject marker paths.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx` (134/134), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local RSVP secret-retention risk; live RSVP function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:39 AM PT - No-deploy registry preview rate-limit identifier hardening:
  - Resolved in this batch: `supabase/functions/registry-preview/index.ts` no longer writes a raw `userId` prefix into `rsvp_rate_limit.guest_token` for registry preview throttling.
  - Security hardening: registry preview now stores a hashed user subject marker, preserving per-user/IP throttling without retaining direct user-id fragments in the shared rate-limit table.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now blocks `guest_token: userId.slice(0, 16)` and requires the `safeSubjectMarker` path for registry preview.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local registry preview identifier-retention risk; live registry preview proof remains deploy/QA-gated. No deploy was run.
- 2026-05-05 11:41 AM PT - No-deploy public gate rate-limit identifier hardening:
  - Resolved in this batch: `supabase/functions/public-site-access/index.ts` and `supabase/functions/public-site-rsvp-submit/index.ts` no longer write raw site slug prefixes into `rsvp_rate_limit.guest_token`.
  - Security hardening: public password attempts and public RSVP widget submits now store hashed subject markers in the shared rate-limit table, preserving throttling without readable site identifiers.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now blocks `guest_token: slug.slice(0, 16)` in both public gate functions and requires the hashed `safeSubjectMarker` paths.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx` (37/37), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public-gate identifier-retention risk; live public access/widget proof remains deploy-gated. No deploy was run.
- 2026-05-05 11:45 AM PT - No-deploy guest photo upload backend error hardening:
  - Resolved in this batch: `supabase/functions/photo-upload/index.ts` no longer throws the raw Supabase insert error message after `photo_uploads` row creation fails.
  - Security hardening: the row-insert failure now uses the fixed `PHOTO_UPLOAD_ROW_INSERT_FAILED` sentinel while preserving the existing guest-safe upload failure message and upload loop behavior.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the sentinel and blocks reintroducing `if (error) throw new Error(error.message);` in the guest photo upload function.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (24/24), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local backend diagnostic leakage risk in guest photo uploads; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:46 AM PT - No-deploy shared public rate-limit error hardening:
  - Resolved in this batch: `supabase/functions/_shared/rateLimit.ts` no longer throws raw Supabase error messages when public submission rate-limit count or record writes fail.
  - Security hardening: the shared helper now uses fixed `PUBLIC_SUBMISSION_RATE_LIMIT_COUNT_FAILED` and `PUBLIC_SUBMISSION_RATE_LIMIT_RECORD_FAILED` sentinels, preserving rate-limit behavior without propagating backend text through callers.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now covers the shared helper and blocks reintroducing `throw new Error(error.message)` there.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (25/25), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local shared public-submission diagnostic leakage risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:48 AM PT - No-deploy SMS RSVP inbound diagnostic hardening:
  - Resolved in this batch: `supabase/functions/sms-rsvp-inbound/index.ts` no longer stores raw RSVP update error text or unexpected caught error text in `sms_inbound_rsvp_events.process_error`.
  - Security hardening: failed update and unexpected failure paths now store fixed `SMS_RSVP_UPDATE_FAILED` and `SMS_RSVP_INBOUND_UNEXPECTED_FAILURE` codes while preserving the existing TwiML guest responses.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires those fixed codes and blocks the old `updateErr?.message`, `err.message`, and `process_error: message` patterns.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`, `npm run proof:v1:board:md`, and `npm test -- --run src/lib/proofBoardFreshness.test.ts` (1/1).
  - Launch status: unchanged. SMS/Telnyx remains outside launch scope, but this narrows local diagnostic leakage risk without removing the inbound RSVP flow. No deploy was run.
- 2026-05-05 11:51 AM PT - No-deploy planning data-boundary proof maintenance:
  - Resolved in this batch: `src/lib/dashboardDataBoundary.test.ts` was updated for the current planning vendor repository shape, where `loadVendors` uses a shared query helper with `PLANNING_VENDOR_SELECT` and a `PLANNING_VENDOR_LEGACY_SELECT` fallback for environments before vendor-rating columns exist.
  - Security hardening: the guard now proves the explicit primary projection and explicit legacy fallback instead of failing on an outdated `.select(PLANNING_VENDOR_SELECT)` call-shape assumption.
  - Proof added/updated: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/settingsErrorSafety.test.ts` now passes and continues blocking `select('*')` regressions on planning/dashboard-sensitive paths.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/settingsErrorSafety.test.ts` (15/15), `npm run typecheck`, `npm run lint -- --quiet`, and `git diff --check`.
  - Launch status: unchanged. This keeps the data-boundary proof lane credible without changing product behavior. No deploy was run.
- 2026-05-05 11:53 AM PT - No-deploy shared public submission subject hashing:
  - Resolved in this batch: `supabase/functions/_shared/rateLimit.ts` now hashes public submission rate-limit subjects before count and insert operations.
  - Security hardening: public submission events no longer retain readable subject values such as guest contact lookup names, guest/contact identifiers, vendor inquiry identifiers, or vault config identifiers, while preserving per-subject throttling.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the shared `subjectMarker` path, the hashed `safeSubject` count/insert path, and blocks the old raw-subject count/insert patterns.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public-submission PII/identifier retention risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 11:56 AM PT - No-deploy public guestbook/photo IP retention hardening:
  - Resolved in this batch: `supabase/functions/guestbook-submit/index.ts` and `supabase/functions/photo-upload/index.ts` no longer count or store raw requester IPs for public guestbook and photo upload rate-limit rows.
  - Security hardening: guestbook uses a site-scoped requester IP marker, photo upload uses an album-scoped requester IP marker, and photo upload now hashes the site-slug fallback marker before storing it in `photo_upload_attempts.token_hash`.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the guestbook/photo hashed marker paths and blocks the old raw `requester_ip` and raw `site:${siteSlug}` attempt marker patterns.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public guestbook/photo identifier retention risk while preserving rate limits and upload/guestbook behavior. No deploy was run.
- 2026-05-05 11:59 AM PT - No-deploy shared public submission requester-IP hashing:
  - Resolved in this batch: `supabase/functions/_shared/rateLimit.ts` now hashes requester IPs before public submission rate-limit count and insert operations.
  - Security hardening: shared public submission events no longer retain readable requester IP values while preserving per-IP throttling for vendor inquiry/preview, guest contact, prospect/contact, and vault submission flows that use the shared helper.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the shared `requesterIpMarker` path, the hashed `safeRequesterIp` count/insert path, and blocks the old raw requester-IP count/insert patterns.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public-submission requester-IP retention risk while preserving rate-limit behavior. No deploy was run.
- 2026-05-05 12:01 PM PT - No-deploy shared public rate-limit marker contract cleanup:
  - Resolved in this batch: `supabase/functions/_shared/rateLimit.ts` now returns `requesterIpMarker` instead of `requesterIp` from the shared public submission rate-limit helper.
  - Security hardening: the return contract now describes the value accurately as a hashed marker, reducing the chance that a future caller treats it as a raw requester IP.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `requesterIpMarker: safeRequesterIp` and blocks reintroducing `requesterIp: safeRequesterIp`.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This is a no-feature-loss contract cleanup for the newly hardened public rate-limit helper. No deploy was run.
- 2026-05-05 12:03 PM PT - No-deploy shared public submission referrer sanitization:
  - Resolved in this batch: `supabase/functions/_shared/rateLimit.ts` now sanitizes stored referrers for shared public submission events.
  - Security hardening: the helper strips username, password, query string, and hash fragment from `Referer` before writing `public_submission_events.referrer`, reducing the risk of retaining invite tokens, password/session artifacts, or other URL secrets.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the `safeReferrer` path, query/hash stripping, and blocks reintroducing the raw `referer` header slice.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public-submission URL-secret retention risk while preserving diagnostic referrer origin/path context. No deploy was run.
- 2026-05-05 12:05 PM PT - No-deploy public guest telemetry/prospect referrer sanitization:
  - Resolved in this batch: `supabase/functions/guest-hub-track/index.ts` and `supabase/functions/guest-prospect-submit/index.ts` now sanitize stored referrers before writing guest telemetry/prospect rows.
  - Security hardening: these functions strip username, password, query string, and hash fragment from `Referer`, reducing risk of retaining invite tokens, access artifacts, or other URL secrets in `guest_hub_events` or prospect metadata.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the `safeReferrer` path in both functions and blocks reintroducing the raw `referer` header slice.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public guest telemetry/prospect URL-secret retention risk while preserving tracking and opt-in behavior. No deploy was run.
- 2026-05-05 12:09 PM PT - No-deploy public guest hub tracking rate-limit hardening:
  - Resolved in this batch: `supabase/functions/guest-hub-track/index.ts` now uses the shared public submission rate-limit helper before inserting `guest_hub_events`.
  - Security hardening: guest hub telemetry is now durable-throttled by site/scope, hashed requester marker, and hashed event subject marker instead of being an unbounded public write path.
  - No feature loss: throttled or rate-limit-unavailable tracking still returns the existing soft `{ ok: true, tracked: false }` response so guest-facing pages do not show telemetry errors.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the `guest_hub_track` rate-limit scope and the soft throttled response path.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public telemetry abuse risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 12:11 PM PT - No-deploy registry preview memory rate-limit key hardening:
  - Resolved in this batch: `supabase/functions/registry-preview/index.ts` now hashes the in-memory burst-limit key instead of retaining the raw requester IP as the `rateLimitMap` key.
  - Security hardening: registry preview already hashed durable rate-limit identifiers; this closes the remaining process-memory raw-IP retention path while preserving the same per-IP burst throttling.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the `registry-preview-memory` hash marker path and blocks raw `rateLimitMap.get(ip)` / `rateLimitMap.set(ip, ...)` regressions.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local registry preview identifier-retention risk; live function deployment/proof remains required. No deploy was run.
- 2026-05-05 12:14 PM PT - No-deploy guest hub telemetry public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guest-hub-track/index.ts` now checks the shared public access gate before inserting telemetry, using `privacy_mode`, `guest_access_token`, invite token, and password session just like public subresources.
  - Security hardening: password/invite/hidden event hubs no longer create a telemetry write side channel for inaccessible published slugs.
  - No feature loss: `src/pages/EventHub.tsx` and `src/pages/EventRecap.tsx` now package existing invite-token/password-session access artifacts into telemetry calls, so valid guest access can still be tracked.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `canReadPublicSubresource`, the explicit gated site projection, and stored invite-token gating for `guest-hub-track`.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm test -- --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx` (13/13), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public telemetry access-bypass risk; live function/frontend deployment proof remains required. No deploy was run.
- 2026-05-05 12:16 PM PT - No-deploy guest hub access-artifact characterization:
  - Resolved in this batch: `src/pages/EventHub.tsx` and `src/pages/EventRecap.tsx` now expose their guest hub telemetry access-payload builders for focused tests.
  - No feature loss proof: `src/pages/EventHub.test.tsx` and `src/pages/EventRecap.test.tsx` now prove current URL invite tokens take precedence, stored invite tokens are preserved for follow-up clicks, and password sessions are packaged for gated telemetry.
  - Security hardening: this locks the frontend side of the shared public access gate handoff so future changes cannot silently drop invite/password context and force gated telemetry to fail closed for valid guests.
  - Validation passed: `npm test -- --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx` (17/17), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This improves local no-feature-loss proof around the newly gated guest hub telemetry path. No deploy was run.
- 2026-05-05 12:19 PM PT - No-deploy guest recap config public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guest-recap-config/index.ts` now uses the shared public access gate before returning recap/photo data, instead of relying on `is_published` alone.
  - Security hardening: password-protected, invite-only, hidden, or otherwise inaccessible sites can no longer expose recap summaries, couple details, upload metadata, captions, guest names, or signed image URLs through the recap config endpoint.
  - No feature loss: `src/pages/EventRecap.tsx` now sends existing invite/password access artifacts through dedicated request headers for valid gated recap views without putting them in the query string.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `guest-recap-config` to use `canReadPublicSubresource`, explicit privacy/token projection, and the access headers.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventRecap.test.tsx` (36/36), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public recap subresource access-bypass risk; live function/frontend deployment proof remains required. No deploy was run.
- 2026-05-05 12:21 PM PT - No-deploy guest hub config public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guest-hub-config/index.ts` now uses the shared public access gate before returning guest hub settings and couple summary data, instead of relying on `is_published` alone.
  - Security hardening: password-protected, invite-only, hidden, or otherwise inaccessible sites can no longer expose guest hub feature toggles, custom message, language default, couple names, or wedding date through the hub config endpoint.
  - No feature loss: `src/pages/EventHub.tsx` now sends existing invite/password access artifacts through dedicated request headers for valid gated hub views without putting them in the query string.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `guest-hub-config` to use `canReadPublicSubresource`, explicit privacy/token projection, and the access headers; `src/pages/EventHub.test.tsx` proves the header packaging.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventHub.test.tsx` (37/37), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public guest hub subresource access-bypass risk; live function/frontend deployment proof remains required. No deploy was run.
- 2026-05-05 12:24 PM PT - No-deploy guest prospect opt-in public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guest-prospect-submit/index.ts` now verifies shared public site access before writing prospect opt-ins and hub events.
  - Security hardening: direct slug-only requests can no longer create opt-in/contact rows for password-protected, invite-only, hidden, or inaccessible sites.
  - No feature loss: Event Hub and Recap opt-ins now send existing invite/password access artifacts; Photo Upload follow-up opt-ins can still proceed with a valid active album upload token.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `guest-prospect-submit` to use `canReadPublicSubresource`, explicit privacy/token projection, upload-token hash validation, and active upload-window checks.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx` (47/47), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public prospect opt-in access-bypass risk while preserving guest hub, recap, and photo upload opt-in behavior. No deploy was run.
- 2026-05-05 12:26 PM PT - No-deploy guestbook submit public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guestbook-submit/index.ts` now verifies shared public site access before inserting guestbook entries.
  - Security hardening: direct slug-only requests can no longer write guestbook entries for password-protected, invite-only, hidden, or inaccessible sites.
  - No feature loss: `src/pages/GuestbookSubmit.tsx` now packages existing URL/stored invite tokens and password sessions into guestbook submissions for valid gated guestbook links.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `guestbook-submit` to use `canReadPublicSubresource`, explicit privacy/token projection, and stored invite-token gating; `src/pages/GuestbookSubmit.test.ts` proves the frontend access payload.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestbookSubmit.test.ts` (31/31), `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local public guestbook write access-bypass risk while preserving gated guestbook submissions. No deploy was run.
- 2026-05-05 12:34 PM PT - No-deploy vault/photo public contribution gate hardening:
  - Resolved in this batch: `supabase/functions/vault-entry-submit/index.ts`, `supabase/functions/vault-upload-google-drive/index.ts`, and the site-slug path in `supabase/functions/photo-upload/index.ts` now require shared public access gate approval before service-role writes, storage uploads, or provider upload work.
  - Security hardening: direct slug/site-id-only requests can no longer submit vault memories, vault attachments, Google Drive vault uploads, or site-slug photo uploads for password-protected, invite-only, hidden, or inaccessible sites by relying on `is_published` alone.
  - No feature loss: `src/pages/VaultContribute.tsx` now resolves the site through `public-site-access` and packages invite/password artifacts into vault submissions; `src/pages/PhotoUpload.tsx` packages invite/password artifacts for site-slug uploads; existing active album-token photo upload links remain token-scoped and supported.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires vault/photo public contribution functions to use `canReadPublicSubresource` and explicit privacy/token projections; `src/pages/VaultContribute.test.ts` and `src/pages/PhotoUpload.test.ts` prove frontend access payload packaging.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/PhotoUpload.test.ts src/pages/VaultContribute.test.ts` (44/44), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local vault/photo contribution access-bypass risk while preserving valid gated guest flows. Live function/frontend deployment proof remains required. No deploy was run.
- 2026-05-05 12:38 PM PT - No-deploy guest contact lookup public-access gate hardening:
  - Resolved in this batch: `supabase/functions/guest-contact-lookup/index.ts` now requires shared public access gate approval before full-name lookup can issue a short-lived contact update session.
  - Security hardening: direct site-ref-only requests can no longer use the guest contact update page as a full-name enumeration side channel for password-protected, invite-only, hidden, unpublished, or otherwise inaccessible sites.
  - No feature loss: public sites still allow the existing full-name contact lookup; `src/pages/GuestContactUpdate.tsx` now packages existing invite/password artifacts so valid gated guests can still search and update contact details.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires guest-contact lookup to use `canReadPublicSubresource` and explicit privacy/token projection; `src/pages/GuestContactUpdate.test.ts` proves frontend access payload packaging.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestContactUpdate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local guest-contact lookup access-bypass risk while preserving valid public and gated contact-update flows. Live function/frontend deployment proof remains required. No deploy was run.
- 2026-05-05 12:41 PM PT - No-deploy client error log ingestion hardening:
  - Resolved in this batch: `supabase/functions/log-client-error/index.ts` now rate-limits public diagnostic ingestion, sanitizes nested metadata, strips route query/hash fragments, and no longer trusts client-supplied `userId` or `weddingSiteId` without an auth bearer token.
  - Security hardening: browser-controlled diagnostic payloads can no longer directly assign logs to arbitrary users/sites or persist obvious token/secret/password/auth/API-key/cookie metadata.
  - No feature loss: dashboard client-error logging remains available; authenticated logs can still associate with the bearer-token user and owned site.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the client-error rate-limit scope, route/metadata sanitizers, and no client-supplied identity trust.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local diagnostic-ingestion abuse and data-retention risk. Live function deployment/proof remains required. No deploy was run.
- 2026-05-05 12:45 PM PT - No-deploy site translation AI rate-limit hardening:
  - Resolved in this batch: `supabase/functions/translate-site-content/index.ts` now uses the shared durable public submission rate limiter after authenticated owner/site validation and before any OpenAI provider call.
  - Security hardening: the owner-only AI translation path now has per-user/site/language and requester throttling, reducing provider-spend abuse risk without exposing provider details or changing the translation response contract.
  - No feature loss: site translation remains owner-gated, preserves the same supported languages and saved translation payload shape, and keeps provider failures customer-safe.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires the `translate_site_content` rate-limit scope, owner gate, auth gate, OpenAI server-side key usage, and safe translation error copies.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local provider-backed AI abuse risk. Live function deployment/proof remains required. No deploy was run.
- 2026-05-05 12:49 PM PT - No-deploy AI provider and vendor inquiry email hardening:
  - Resolved in this batch: `supabase/functions/photo-analyze-batch/index.ts` now rate-limits authenticated photo AI analysis after owner/collaborator permission checks and before any OpenAI/Gemini provider analysis work.
  - Resolved in this batch: `supabase/functions/onboarding-ai-orchestrate/index.ts` now rate-limits model-backed onboarding orchestration when server credentials are available and falls back to the deterministic onboarding decision instead of making an unbounded provider call.
  - Resolved in this batch: `supabase/functions/vendor-profile-inquiry-submit/index.ts` now imports the shared Edge Function email safety helper for HTML escaping and subject sanitization instead of maintaining a local duplicate.
  - Security hardening: provider-backed AI entry points now have durable abuse/spend controls, and the newest vendor inquiry email path is aligned with centralized email escaping/sanitization proof.
  - No feature loss: photo analysis permissions and result shape are unchanged; onboarding still returns useful deterministic setup output when throttled; vendor inquiry submission, persistence, reply-to, and packaged wedding context remain intact.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires `photo_analyze_batch`, `onboarding_ai_orchestrate`, deterministic fallback-on-throttle, and shared email-safety imports for vendor inquiry emails.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (26/26), `npm test -- --run src/pages/VendorProfile.test.tsx src/pages/VendorProfileCreate.test.tsx` (6/6), `npm run smoke:messages`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local provider-abuse and email-template drift risk. Live function deployment/proof remains required. No deploy was run.
- 2026-05-05 12:55 PM PT - No-deploy media export/moderation and vendor preview SSRF hardening:
  - Resolved in this batch: `supabase/functions/photo-export-manifest/index.ts` now neutralizes spreadsheet-formula prefixes in exported manifest text fields and protocol-cleans manifest URLs before returning them.
  - Resolved in this batch: `supabase/functions/photo-upload-moderate/index.ts` now deduplicates requested upload IDs and refuses mixed valid/missing moderation batches instead of reporting success for IDs that were not found.
  - Resolved in this batch: `supabase/functions/vendor-profile-preview/index.ts` now applies registry-style public fetch hardening: metadata/internal hostname blocking, private IPv4/IPv6 and DNS A/AAAA validation, manual redirect revalidation, timeout, HTML content-type checks, and response-size limits.
  - Security hardening: media exports are safer for spreadsheet handling, photo moderation is stricter about exact targets, and vendor preview scraping is less useful as an SSRF/internal-network probe.
  - No feature loss: authorized photo manifest exports still include the same rows and signed URLs; valid photo moderation batches still work; vendor profile preview still falls back to manual/source-derived data when a website cannot be fetched safely.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires formula neutralization, manifest URL cleaning, exact photo moderation target checks, and vendor preview DNS/redirect/size/timeout SSRF controls.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/VendorProfile.test.tsx src/pages/VendorProfileCreate.test.tsx` (32/32), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run guard:file-size`, `npm run guard:assets`, and `git diff --check`.
  - Launch status: unchanged. This narrows local media export/moderation and vendor preview public-fetch risk. Live function deployment/proof remains required. No deploy was run.
- 2026-05-05 1:01 PM PT - No-deploy RSVP submit payload and service-role inventory hardening:
  - Resolved in this batch: `supabase/functions/submit-rsvp/index.ts` no longer selects the raw `invite_token` after token lookup and now clamps guest-controlled meal, plus-one, and notes fields before RSVP/email queue writes.
  - Resolved in this batch: `supabase/functions/public-site-rsvp-submit/index.ts` now validates optional guest email shape before writing site RSVP rows.
  - Resolved in this batch: `docs/service-role-authorization-disposition-2026-05-05.md` now includes `public-site-rsvp-submit`, keeping the service-role inventory complete as the function surface evolves.
  - Security hardening: RSVP submit paths expose less raw token data internally, bound guest-provided text more tightly, and reject malformed public-site RSVP email values before persistence.
  - No feature loss: invite-link RSVP submit, site RSVP widget submit, stored access artifacts, and email queue behavior are preserved.
  - Proof added/updated: `src/lib/launchEdgeFunctions.test.ts` now requires bounded RSVP submit fields, removal of raw invite-token selection in `submit-rsvp`, public-site RSVP email validation, and the complete service-role disposition inventory.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx` (36/36), `npm run test:security` after the known Vite temp-file permission rerun (195/195), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This narrows local RSVP payload/data-boundary risk. Live RSVP function deployment/proof remains required, and the existing live RSVP 503 blocker is still not cleared. No deploy was run.
- 2026-05-05 1:08 PM PT - No-deploy Guests RSVP state utility split continuation:
  - Resolved in this batch: moved CSV mapper column labeling, guest fallback-state map building, household-state map building, exception-state map building, and segment-label resolution out of `src/pages/dashboard/Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Guests.tsx` from 4860 to 4799 lines, keeping the page on the steady shrinking path instead of loosening the guard.
  - No feature loss: the guest dashboard still uses the same RSVP fallback, household, exception, CSV mapper, and segment label behavior; the extraction is pure utility movement with focused proof.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers CSV column labels beyond `Z`, owner-facing RSVP fallback/household/exception state maps, and static/event segment labels.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (27/27), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `npm run build`, `npm run smoke:csvmapper`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 guest dashboard maintainability risk without changing guest import/export, RSVP, or dashboard behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:12 PM PT - No-deploy Messages summary utility split continuation:
  - Resolved in this batch: moved campaign-status summary, delivery-stat summary, and channel-breakdown calculations out of `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Messages.tsx` from 3572 to 3531 lines while preserving the existing message dashboard rendering and permission gates.
  - No feature loss: message history counts, delivery metrics, and channel breakdowns still use the same source messages and delivery status semantics; the extraction is pure utility movement with focused proof.
  - Proof added/updated: `src/pages/dashboard/messages/messageDashboardUtils.test.ts` now covers campaign status counts, delivery rates, active/scheduled totals, and email/SMS channel targeted counts.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts` (17/17), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run smoke:messages`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 messaging maintainability risk without changing messaging behavior. Live messaging/public proof blockers remain. No deploy was run.
- 2026-05-05 1:18 PM PT - No-deploy Messages history analytics split continuation:
  - Resolved in this batch: moved history status counts, delivery health, campaign thread rollups, active campaign thread selection, active campaign message sorting, and provider telemetry rollups out of `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Messages.tsx` again, from 3531 to 3427 lines, without weakening the message permission smoke guard.
  - No feature loss: the extracted helpers preserve the existing skipped-count fallback plus delivery-row counting behavior, scheduled overdue detection, campaign-thread sorting, and customer-safe delivery error grouping.
  - Proof added/updated: `src/pages/dashboard/messages/messageDashboardUtils.test.ts` now covers campaign threads, active campaign message ordering, delivery health percentages, overdue scheduled counts, and provider telemetry grouping with customer-safe provider wording.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run smoke:messages`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This further reduces local P2 messaging maintainability risk without changing message send/schedule/history behavior. Live messaging/public proof blockers remain. No deploy was run.
- 2026-05-05 1:22 PM PT - No-deploy Guests follow-up payload utility split continuation:
  - Resolved in this batch: moved RSVP follow-up summary, exception checklist, missing-meal checklist, no-contact checklist, filtered-email list, saved-segment draft, single follow-up task draft, and generated follow-up task construction out of `src/pages/dashboard/Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Guests.tsx` from 4799 to 4790 lines while keeping the RSVP follow-up/export behavior unchanged.
  - No feature loss: the extracted helpers preserve existing checklist copy, segment labeling, email collection, follow-up task text, storage caps in page state, and owner copy/download behavior.
  - Proof added/updated: `src/pages/dashboard/guests/guestDashboardUtils.test.ts` now covers the RSVP follow-up summary, exception checklist rows, missing meal/no-contact checklist rows, filtered email list, saved segment payloads, manual follow-up task payloads, and generated follow-up tasks.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts` (28/28), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run smoke:csvmapper`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 guest dashboard maintainability risk without changing guest RSVP follow-up/export behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:27 PM PT - No-deploy Settings payload utility split continuation:
  - Resolved in this batch: moved partner-name splitting, settings slug normalization, privacy update payload construction, and RSVP question/meal cleanup out of `src/pages/dashboard/Settings.tsx` into `src/pages/dashboard/settings/settingsDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Settings.tsx` from 2339 to 2328 lines while keeping settings save behavior unchanged.
  - No feature loss: the extracted helpers preserve the existing slug cleanup behavior, password/invite privacy payload rules, RSVP choice validation, and demo/live RSVP settings persistence paths.
  - Proof added/updated: `src/pages/dashboard/settings/settingsDashboardUtils.test.ts` now covers account/slug normalization, privacy payload omission of irrelevant sensitive fields, and RSVP settings cleanup/validation.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settings/settingsDemoStorage.test.ts src/lib/settingsErrorSafety.test.ts` (14/14 after correcting the test to match current slug behavior), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 settings maintainability risk without changing privacy, notification, RSVP, billing, or template settings behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:32 PM PT - No-deploy Name Change planner document-intake utility split continuation:
  - Resolved in this batch: moved name-change document option metadata, extraction field labels/placeholders, contract document matching, extracted-field lookup, document creation, and document update helpers out of `src/pages/dashboard/planning/NameChangePlannerTab.tsx` into `src/pages/dashboard/planning/nameChangePlannerUi.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2493 to 2414 lines while keeping the planner tab UI and document intake behavior unchanged.
  - No feature loss: the extracted helpers preserve court-order alias matching, duplicate-document prevention, linked-field-first lookup, and document update semantics used by the planner workflow.
  - Proof added/updated: `src/pages/dashboard/planning/nameChangePlannerUi.test.ts` now covers document option metadata, extraction labels/placeholders, contract matching, document ensure/update behavior, and linked-vs-fallback extracted field lookup.
  - Validation passed: `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts src/pages/dashboard/nameChangeOverviewCard.test.ts` (15/15), `npm run typecheck -- --pretty false` after restoring the still-needed local normalized document-id import, `npm run guard:file-size`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 planning maintainability risk without changing name-change planner behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:42 PM PT - No-deploy Guest Photo Sharing and Coordinator utility split continuation:
  - Resolved in this batch: moved photo dashboard counts, memory chapter derivation, highlight/review queues, duplicate grouping, coordinator guest stats, coordinator guest sorting, event audience options, alert audience counts, and alert-log filtering out of oversized dashboard pages into tested helper modules.
  - Maintainability hardening: lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3236 to 3188 lines and `CoordinatorMode.tsx` from 2794 to 2773 lines.
  - No feature loss: guest photo recap/curation semantics, duplicate ranking, coordinator queue ordering, alert audience counts, and alert log filters keep the same behavior through pure helper extraction.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingUtils.test.ts` now covers dashboard counts and memory/curation collections; `src/pages/dashboard/coordinator/coordinatorDashboardUtils.test.ts` now covers coordinator stats, queue sort order, event audience counts, and alert-log filters.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/photoAnalysisCustomerCopy.test.ts src/lib/memoryFlowReadiness.test.ts` (18/18), `npm test -- --run src/pages/dashboard/coordinator/coordinatorDashboardUtils.test.ts src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/lib/coordinatorCheckInQueue.test.ts src/lib/coordinatorAlertLogView.test.ts` (12/12), `npm run typecheck -- --pretty false` after tightening test fixture types, `npm run guard:file-size`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 photo/coordinator maintainability risk without changing guest photo, recap, check-in, Q&A, timeline, or alert behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:48 PM PT - No-deploy Seating export and check-in utility split continuation:
  - Resolved in this batch: moved seating assigned/arrived/unassigned derivations, seat-picker filtering, check-in candidate filtering, table guest lookup, demo auto-table generation, demo auto-seat assignment generation, print report HTML, and seating-layout SVG construction out of `src/pages/dashboard/Seating.tsx` into `src/pages/dashboard/seating/seatingDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Seating.tsx` from 2259 to 2169 lines.
  - No feature loss: drag/drop seating, direct seat selection, demo auto-table/auto-seat behavior, table print/PDF export, SVG layout export, check-in filtering, and table rendering now use the same extracted derivations with the same output semantics.
  - Proof added/updated: `src/pages/dashboard/seating/seatingDashboardUtils.test.ts` now covers assigned/arrived/unassigned sets, table guest lookup, seat-picker scoping, check-in candidate filtering, demo auto tables, demo auto-seat assignments, escaped print HTML, and escaped SVG export output.
  - Validation passed: `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/seating/seatingDemoStorage.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 seating maintainability risk without changing seating, catering handoff, check-in, auto-seat, auto-table, or export behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 1:57 PM PT - No-deploy Messages history and reachability utility split continuation:
  - Resolved in this batch: moved message history filtering, audience reachability counts, audience breakdown rollups, and itinerary-segment performance rollups out of `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
  - Maintainability hardening: lowered the file-size guard baseline for `Messages.tsx` from 3427 to 3386 lines.
  - No feature loss: status/channel/audience/delivery/campaign/search filtering, recipient reachability, audience summary cards, and event segment performance preserve current semantics; the characterization test intentionally preserves the existing generic `Itinerary segment` audience-breakdown label.
  - Proof added/updated: `src/pages/dashboard/messages/messageDashboardUtils.test.ts` now covers history filters, audience reachability, audience breakdown, and event segment performance.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts` (20/20 after correcting one fixture to match the current audience-label behavior), `npm run typecheck -- --pretty false` after narrowing one test fixture to the helper contract, `npm run guard:file-size`, `npm run smoke:messages`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P2 messaging maintainability risk without changing compose, send, schedule, retry, permission, or history behavior. Live messaging/public proof blockers remain. No deploy was run.
- 2026-05-05 3:08 PM PT - No-deploy Planning data-boundary service extraction:
  - Resolved in this batch: moved planning site metadata, guest-count lookup, seating-readiness lookup, and total-budget read/write behavior out of `src/pages/dashboard/Planning.tsx` into `src/pages/dashboard/planning/planningService.ts`.
  - Data-boundary hardening: planning dashboard reads now use explicit service projections for `wedding_sites`, `guests`, `guest_event_rsvps`, and `itinerary_items` instead of page-owned Supabase calls.
  - No feature loss: planning overview, starter-suite readiness, guest count, seating readiness, destination/venue context, and total-budget save behavior preserve the current fallback semantics through the service layer.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now requires the new explicit planning projections and guards against reintroducing direct planning page reads for site/guest data.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts` (16/16), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing planning behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 3:12 PM PT - No-deploy Planning sub-tab service extraction:
  - Resolved in this batch: moved address-collection site/guest reads, song-request site/RSVP reads, playlist save, and song-question enablement out of `AddressCollectionTab.tsx` and `SongRequestsTab.tsx` into `planningService`.
  - Data-boundary hardening: planning address/song flows now use explicit service projections for `wedding_sites`, `guests`, and RSVP custom-answer reads.
  - No feature loss: address collection links/follow-up exports, playlist links, DJ song extraction, and RSVP song-question enablement preserve current behavior, including demo-mode paths and dirty playlist editing state.
  - Proof added/updated: `planningService.test.ts` covers song-answer extraction and song-question detection; `dashboardDataBoundary.test.ts` now guards these sub-tabs against reintroducing direct Supabase page imports/calls.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing planning sub-tab behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 3:18 PM PT - No-deploy Seating lookup service extraction:
  - Resolved in this batch: moved the seating lookup page's active-site resolution, latest seating event lookup, valid assignment reads, table reads, guest reads, and lookup-row mapping into `src/pages/dashboard/seating/seatingService.ts`.
  - Data-boundary hardening: the quick seating lookup route no longer imports Supabase or active-site helpers directly, and now uses explicit seating lookup projections.
  - No feature loss: demo lookup rows, table/seat answers, check-in exception badges, empty-state behavior, seating/coordinator links, and search filtering are preserved.
  - Proof added/updated: `seatingService.test.ts` now covers seating lookup row mapping, and `dashboardDataBoundary.test.ts` guards against reintroducing direct Supabase/active-site imports on the lookup page.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingDemoStorage.test.ts` (34/34), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing seating lookup behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 3:25 PM PT - No-deploy Coordinator mode service extraction:
  - Resolved in this batch: moved Coordinator Mode bootstrap reads, event-invitation mapping, Q&A reads, guest check-in updates, day-of alert inserts, manual Q&A inserts, and Q&A answer updates into `src/pages/dashboard/coordinator/coordinatorService.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` no longer imports Supabase or active-site resolution directly, and the service uses explicit projections for guests, itinerary events, event invitations, and Q&A rows.
  - Maintainability hardening: lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2773 to 2736 lines.
  - No feature loss: demo coordinator state, live guest/event bootstrap, event audiences, check-in, immediate/scheduled alerts, manual Q&A, answer save/reopen, role gates, and local cached Q&A fallback are preserved.
  - Proof added/updated: `coordinatorService.test.ts` covers event guest map construction, and `dashboardDataBoundary.test.ts` guards against reintroducing page-owned Supabase/active-site calls.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts src/pages/dashboard/coordinator/coordinatorDashboardUtils.test.ts src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/lib/coordinatorCheckInQueue.test.ts src/lib/coordinatorAlertLogView.test.ts src/lib/coordinatorQnaFlow.test.ts` (29/29), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing coordinator behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 3:31 PM PT - No-deploy Messages scheduled campaign service boundary:
  - Resolved in this batch: moved the dashboard save-the-date scheduled campaign insert behind `src/pages/dashboard/messages/messageService.ts`.
  - Data-boundary hardening: the message insert now has an explicit `MessageInsertPayload` contract instead of an untyped page-owned insert.
  - No feature loss: demo save-the-date campaign creation, live scheduled campaign insert, message refresh, recipient counts, reachable/skipped counts, and owner toast behavior are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards that the save-the-date insert path uses `createDashboardMessage(payload)` instead of direct page-owned `supabase.from('messages').insert(payload)`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts` (33/33), `npm run typecheck -- --pretty false` after tightening the payload type, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing messaging behavior. Live messaging authorization proof remains required. No deploy was run.
- 2026-05-05 3:49 PM PT - No-deploy Itinerary template insert service boundary:
  - Resolved in this batch: moved the itinerary timeline-template event insert behind `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: template event inserts now use a pure insert-row builder plus `createItineraryTemplateEvents` instead of page-owned insert mapping.
  - No feature loss: demo template insertion, duplicate-template prevention, owner active-site lookup, event reload, public visibility, event title mirroring, schedule timing, and owner notices/errors are preserved.
  - Proof added/updated: `itineraryService.test.ts` covers site-scoped template insert row construction, and `dashboardDataBoundary.test.ts` guards the template path against reintroducing direct page-owned `supabase.from('itinerary_events').insert(newEvents.map(...))`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryDateTime.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (23/23), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing itinerary behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 3:57 PM PT - No-deploy Vault dashboard service boundary:
  - Resolved in this batch: moved Vault dashboard site/config/entry reads, hosted-storage provider persistence, config create/upsert/update/delete, entry create/delete, and anniversary recap draft update behind `src/pages/dashboard/vaultService.ts`.
  - Data-boundary hardening: `Vault.tsx` no longer owns direct `wedding_sites`, `vault_configs`, or `vault_entries` table access for these dashboard flows; the service uses explicit site/config/entry projections.
  - No feature loss: demo vaults, live vault loading, hosted dayof storage enforcement, starter vault seeding, add/edit/toggle/delete config flows, entry create/delete, rollback-on-config-delete-failure, and recap regeneration are preserved.
  - Proof added/updated: `vaultService.test.ts` covers explicit projections and rollback-row preservation; `dashboardDataBoundary.test.ts` now guards the vault page against reintroducing direct vault/site table calls.
  - Validation passed: `npm test -- src/pages/dashboard/vaultService.test.ts src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck`, `npm run lint`, `npm run guard:file-size`, and `npm run build`. `npm run lint` passed with the existing warning backlog (553 warnings, 0 errors).
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing vault behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 4:00 PM PT - No-deploy Overview intelligence service boundary:
  - Resolved in this batch: moved overview intelligence-dismissal persistence and interactive-suggestion hide writes behind `src/pages/dashboard/overviewService.ts`.
  - Data-boundary hardening: the dismissal writer now uses an explicit `wedding_data` projection plus a pure merge helper, and the suggestion hide write is centralized instead of being page-owned.
  - No feature loss: local dismissal state, demo-mode behavior, persisted intelligence dismissals, interactive suggestion hiding, and owner toasts are preserved.
  - Proof added/updated: `overviewService.test.ts` covers preservation of existing wedding data/meta while replacing intelligence dismissals; `dashboardDataBoundary.test.ts` guards these Overview paths against reintroducing page-owned writes.
  - Validation passed: `npm test -- src/pages/dashboard/overviewService.test.ts src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck`, `npm run lint`, `npm run guard:file-size`, and `npm run build`. `npm run lint` passed with the existing warning backlog (553 warnings, 0 errors).
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing Overview behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-07 4:13 PM PT - No-deploy Guest dashboard snapshot service extraction:
  - Resolved in this batch: moved guest dashboard site-settings bootstrap plus guest, RSVP, and RSVP-conflict snapshot hydration out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes active-site guest dashboard bootstrap through `loadGuestDashboardSiteSettings(userId)` and main dashboard hydration through `loadGuestDashboardSnapshot(weddingSiteId)` instead of owning direct `wedding_sites`, `guests`, `rsvps`, and `rsvp_conflicts` table access inline.
  - Query-safety hardening: the moved service layer now owns the explicit site-settings/conflict projections plus the bounded guest dashboard row cap, unresolved conflict row cap, and conflict-history row cap.
  - No feature loss: guest dashboard role/permission bootstrap, RSVP question/meal settings, reminder settings, guest list hydration, RSVP merge behavior, unresolved conflict review, and conflict-history surfaces preserve the current live/demo behavior through the service boundary.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` now pin the guest dashboard bootstrap/snapshot service boundary and the moved query caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (44/44), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 4:22 PM PT - No-deploy Guest dashboard itinerary and RSVP audit service extraction:
  - Resolved in this batch: moved guest dashboard itinerary-filter bootstrap and RSVP audit-feed hydration out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes itinerary-filter/event-invite bootstrap through `loadGuestDashboardItineraryFilters(weddingSiteId)` and RSVP audit history through `loadGuestDashboardRsvpAuditFeed(weddingSiteId)` instead of owning direct `itinerary_events`, `wedding_sites`, `event_invitations`, and `guest_audit_logs` reads inline.
  - Query-safety hardening: the guest service now owns the explicit itinerary-event, site seed, invite-map, and guest-audit projections plus the bounded itinerary-filter event/invitation caps and RSVP audit row cap.
  - No feature loss: fallback RSVP event seeding, event invite guest-map hydration, guest filter behavior, demo RSVP audit behavior, and owner RSVP history review preserve the current live/demo semantics through the service boundary.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` now pin the moved itinerary-filter and RSVP audit service boundary plus the migrated query caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in the guest dashboard without changing guest ops, event filtering, or RSVP history behavior. No deploy was run.
- 2026-05-07 4:28 PM PT - No-deploy Guest itinerary drawer service extraction:
  - Resolved in this batch: moved guest itinerary drawer bootstrap and itinerary invite toggle transport out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes drawer event/audit bootstrap through `loadGuestItineraryDrawerSnapshot(weddingSiteId, guestId)` and invite add/remove through `addGuestEventInvitation(...)` and `removeGuestEventInvitation(...)` instead of owning direct `itinerary_events`, `event_invitations`, and `guest_audit_logs` reads/writes inline.
  - Query-safety hardening: the guest service now owns the explicit drawer event and audit projections plus the bounded drawer event, invitation, and audit row caps.
  - No feature loss: live itinerary drawer event hydration, invited-event state, audit history review, and RSVP-snapshot rollback on invite removal preserve the current behavior through the service boundary.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` now pin the moved drawer service boundary and the migrated query caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (49/49), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in the guest drawer flow without changing itinerary invite behavior. No deploy was run.
- 2026-05-07 4:33 PM PT - No-deploy Assisted RSVP persistence service extraction:
  - Resolved in this batch: moved assisted RSVP guest/RSVP persistence and rollback logic out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes live assisted RSVP persistence through `saveAssistedGuestRsvp(...)` instead of owning direct `guests` updates, RSVP lookup/upsert, and guest-row rollback inline.
  - No feature loss: demo assisted RSVP behavior stays local, while live assisted RSVP persistence still records the manual source tag, updates guest RSVP state, upserts the RSVP row, and restores the previous guest row if the RSVP write fails.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the assisted RSVP service boundary, including the rollback path.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (51/51), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in guest RSVP ops without changing assisted RSVP behavior. No deploy was run.
- 2026-05-07 4:37 PM PT - No-deploy Guest site slug and active-site helper extraction:
  - Resolved in this batch: moved guest RSVP text-link site slug lookup and repeated active-site fallback lookup out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes those reads through `loadGuestDashboardSiteSlug(weddingSiteId)` and `resolveGuestDashboardSiteId(userId)` instead of directly querying `wedding_sites` for `site_slug` or calling `resolveActiveSiteForUser(user.id)` inline.
  - No feature loss: RSVP text-link export still uses the same site slug and invite tokens, and guest CSV preview/import still restores the active site id when page state starts empty.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the new site-slug and active-site helper boundary.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (53/53), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in guest export/import flows without changing behavior. No deploy was run.
- 2026-05-07 5:00 PM PT - No-deploy Itinerary event guest manager service extraction:
  - Resolved in this batch: moved itinerary event guest manager snapshot loading plus invite add/remove/invite-all/remove-all transport out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: `Itinerary.tsx` now routes guest manager work through `loadItineraryEventGuestManagerSnapshot(eventId)`, `addItineraryEventGuestInvitation(...)`, `removeItineraryEventGuestInvitation(...)`, `inviteAllGuestsToItineraryEvent(...)`, and `removeAllGuestsFromItineraryEvent(...)` instead of owning direct `wedding_sites`, `guests`, and `event_invitations` reads/writes inline.
  - Query-safety hardening: the service now owns the explicit guest-picker projection plus the bounded event invitation and guest row caps for the event guest manager flow.
  - No feature loss: event guest search, invited-state toggles, invite-all/remove-all behavior, and RSVP snapshot rollback on invite removal preserve the current live/demo behavior through the service boundary.
  - Proof added/updated: `src/pages/dashboard/itineraryService.test.ts`, `src/pages/dashboard/itineraryQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` now pin the moved event guest manager service boundary and query caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (32/32), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in itinerary guest management without changing itinerary invitation behavior. No deploy was run.
- 2026-05-07 5:03 PM PT - No-deploy Itinerary event mutation service extraction:
  - Resolved in this batch: moved itinerary event save/delete transport plus best-effort photo album creation out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: `Itinerary.tsx` now routes live event persistence through `saveItineraryEvent(...)` and `deleteItineraryEvent(...)` instead of owning direct `wedding_sites`, `itinerary_events`, and `photo-album-create` transport inline.
  - No feature loss: the service preserves the existing field-drift fallback loop, site lookup, and best-effort album creation behavior while keeping event validation, demo writes, and owner-facing notices in the page.
  - Proof added/updated: `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the moved event mutation service boundary.
  - Validation passed: `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (35/35), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in itinerary event CRUD without changing itinerary save/delete behavior. No deploy was run.
- 2026-05-07 5:06 PM PT - No-deploy Itinerary dashboard loader service extraction:
  - Resolved in this batch: moved itinerary dashboard event loading, invitation-count hydration, RSVP-count hydration, and schedule mirror refresh trigger out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: `Itinerary.tsx` now routes live event loading through `loadItineraryDashboardEvents(hasEventRsvpsTable)` instead of owning direct `wedding_sites`, `itinerary_events`, `event_invitations`, and `event_rsvps` reads inline.
  - Query-safety hardening: the service now owns the explicit itinerary-event projection plus the bounded event list, invitation, and guest row caps for the dashboard loader and guest manager paths.
  - No feature loss: the service preserves current event normalization, invitation counts, RSVP counts, optional `event_rsvps` table detection, and schedule mirror refresh behavior while keeping demo loading and error toasts in the page.
  - Proof added/updated: `src/pages/dashboard/itineraryService.test.ts`, `src/pages/dashboard/itineraryQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` now pin the moved loader service boundary and row caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (36/36), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in itinerary dashboard hydration without changing owner-facing schedule behavior. No deploy was run.
- 2026-05-07 5:09 PM PT - No-deploy Itinerary timeline persistence service extraction:
  - Resolved in this batch: moved itinerary timeline shift persistence and mirror refresh out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: `Itinerary.tsx` now routes live timeline updates through `persistItineraryTimeline(nextEvents)` instead of owning the direct `itinerary_events` bulk update fan-out inline.
  - No feature loss: the service preserves the current active-site resolution, per-event date/time/display-order updates, and schedule mirror refresh behavior while keeping demo shifts, undo state, and save notices in the page.
  - Proof added/updated: `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the moved timeline persistence boundary.
  - Validation passed: `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in timeline shifting without changing owner-facing timeline behavior. No deploy was run.
- 2026-05-07 5:16 PM PT - No-deploy Guest photo dashboard snapshot service extraction:
  - Resolved in this batch: moved guest photo dashboard snapshot loading out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes live owner hydration through `loadGuestPhotoDashboardSnapshot(userId)` instead of owning direct `wedding_sites`, `itinerary_events`, `photo_albums`, `photo_uploads`, `guestbook_entries`, `guest_prospect_optins`, `photo_upload_ai_analysis`, `photo_upload_metadata`, `photo_ai_bucket_corrections`, and `guest_hub_settings` reads inline.
  - Query-safety hardening: the service now owns the explicit dashboard snapshot projections plus the bounded event, album, upload, guestbook, prospect, analysis, metadata, and bucket-correction row caps.
  - No feature loss: the service preserves current active-site lookup, wedding meta hydration, guest hub settings defaults, and all owner photo dashboard snapshot behavior while the page keeps demo loading, state wiring, and auth-retry handling.
  - Proof added/updated: `src/pages/dashboard/guestPhotoSharingService.test.ts`, `src/pages/dashboard/guestPhotoQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` now pin the moved guest-photo dashboard snapshot boundary and row caps.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts` (35/35), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in the owner photo dashboard without changing owner-facing photo management behavior. No deploy was run.
- 2026-05-07 5:45 PM PT - No-deploy Guest conflict service boundary cleanup:
  - Resolved in this batch: moved guest RSVP conflict resolve/resolve-all writes out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes conflict resolution through `resolveGuestDashboardConflict(...)` and `resolveGuestDashboardConflicts(...)` instead of owning direct `rsvp_conflicts` updates inline.
  - No feature loss: guest conflict resolution and bulk conflict resolution preserve the existing live/demo semantics while shrinking page-owned transport.
  - Proof added/updated: `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the moved conflict-write boundary.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk in guest operations without changing owner-facing guest conflict or check-in behavior. No deploy was run.
- 2026-05-07 5:53 PM PT - No-deploy Message bulk send transport extraction:
  - Resolved in this batch: moved live bulk-send and scheduled-dispatch HTTP transport out of `src/pages/dashboard/Messages.tsx` and into `src/pages/dashboard/messages/messageService.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes live send transport through `triggerDashboardBulkSend(...)` and `triggerScheduledMessageDispatch(...)` instead of owning direct `send-bulk-message` fetch requests inline.
  - No feature loss: immediate send, scheduled dispatch, and customer-safe delivery error copy preserve the current behavior while shrinking page-owned transport.
  - Proof added/updated: `src/pages/dashboard/messages/messageService.boundary.test.ts` and `src/lib/dashboardDataBoundary.test.ts` now pin the moved message transport boundary.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/lib/dashboardDataBoundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 direct transport coupling in the owner messaging surface without changing send behavior. No deploy was run.
- 2026-05-07 5:57 PM PT - No-deploy Guest hub public service extraction:
  - Resolved in this batch: moved public guest hub config/recap config loading, guest-hub telemetry, and guest prospect opt-in transport out of `src/pages/EventHub.tsx` and `src/pages/EventRecap.tsx` and into `src/pages/guestHubPublicService.ts`.
  - Data-boundary hardening: `EventHub.tsx` and `EventRecap.tsx` now route public guest transport through `fetchGuestHubConfig(...)`, `fetchGuestRecapConfig(...)`, `trackGuestHubEvent(...)`, and `submitGuestHubProspect(...)` instead of owning direct function fetch requests inline.
  - No feature loss: guest hub load, recap load, telemetry pings, and opt-in submission preserve the current guest-facing behavior while shrinking page-owned transport.
  - Proof added/updated: `src/pages/guestHubPublicService.test.ts` and `src/lib/publicGuestSurfaceBoundary.test.ts` now pin the moved guest-hub transport boundary, while `src/pages/EventHub.test.tsx` and `src/pages/EventRecap.test.tsx` stay green on guest-facing behavior.
  - Validation passed: `npm test -- --run src/pages/guestHubPublicService.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (28/28), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public guest transport coupling without changing guest hub or recap behavior. No deploy was run.
- 2026-05-07 6:01 PM PT - No-deploy Guest public submission service extraction:
  - Resolved in this batch: moved guest-facing photo upload, guestbook submit, and guest contact lookup/submit transport out of `src/pages/PhotoUpload.tsx`, `src/pages/GuestbookSubmit.tsx`, and `src/pages/GuestContactUpdate.tsx` and into `src/pages/guestPublicSubmissionService.ts`.
  - Data-boundary hardening: `PhotoUpload.tsx`, `GuestbookSubmit.tsx`, and `GuestContactUpdate.tsx` now route public guest submission transport through `uploadGuestPhotos(...)`, `submitGuestbookEntry(...)`, and `callGuestContactFunction(...)` instead of owning direct function fetch requests inline.
  - No feature loss: photo uploads, guestbook submission, guest contact lookup, and guest contact updates preserve the current guest-facing behavior while shrinking page-owned transport.
  - Proof added/updated: `src/pages/guestPublicSubmissionService.test.ts` and `src/lib/publicGuestSurfaceBoundary.test.ts` now pin the moved guest submission transport boundary, while `src/pages/PhotoUpload.test.ts`, `src/pages/GuestbookSubmit.test.ts`, and `src/pages/GuestContactUpdate.test.ts` stay green on guest-facing behavior.
  - Validation passed: `npm test -- --run src/pages/guestPublicSubmissionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/PhotoUpload.test.ts src/pages/GuestbookSubmit.test.ts src/pages/GuestContactUpdate.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 guest-facing submission transport coupling without changing guest upload, guestbook, or contact-update behavior. No deploy was run.
- 2026-05-07 6:12 PM PT - No-deploy Shared RSVP function transport extraction:
  - Resolved in this batch: moved guest-facing `validate-rsvp-token` lookup and submit transport out of `src/pages/RSVP.tsx` and `src/pages/EventRSVP.tsx` and into `src/pages/rsvpFunctionService.ts`.
  - Data-boundary hardening: `RSVP.tsx` and `EventRSVP.tsx` now route guest RSVP lookup and submit transport through `callValidateRsvpToken(...)` instead of each owning duplicate `fetch(...)` wiring inline.
  - No feature loss: RSVP lookup, token-linked guest reload, manual RSVP submit, event RSVP lookup, and event RSVP submit preserve the current guest-facing behavior while shrinking duplicated page-owned transport.
  - Proof added/updated: `src/pages/rsvpFunctionService.test.ts` and `src/lib/publicGuestSurfaceBoundary.test.ts` now pin the shared RSVP transport seam, while `src/pages/RSVP.test.tsx` and `src/pages/EventRSVP.test.tsx` stay green on guest-facing behavior.
  - Validation passed: `npm test -- --run src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx` (119/119), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 RSVP transport coupling without changing RSVP guest or event behavior. No deploy was run.
- 2026-05-07 6:18 PM PT - No-deploy Preview photo manifest service extraction:
  - Resolved in this batch: moved preview photo manifest loading out of `src/pages/TemplateScrollCapture.tsx` and `src/pages/VariantPreviewCapture.tsx` and into `src/pages/previewPhotoManifestService.ts`.
  - Data-boundary hardening: the preview capture pages now route manifest loading through `loadPreviewPhotoManifest()` instead of each owning duplicate `/preview-photos/manifest.json` fetch wiring inline.
  - No feature loss: template scroll capture and variant preview capture preserve the current preview-photo behavior while shrinking duplicate page-owned manifest transport.
  - Proof added/updated: `src/pages/previewPhotoManifestService.test.ts` and `src/pages/previewPhotoManifestService.boundary.test.ts` now pin the shared preview-manifest seam.
  - Validation passed: `npm test -- --run src/pages/previewPhotoManifestService.test.ts src/pages/previewPhotoManifestService.boundary.test.ts` (2/2), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local duplicate preview transport without changing runtime launch behavior. No deploy was run.
- 2026-05-07 7:07 PM PT - No-deploy Guest dashboard overlay boundary extraction:
  - Resolved in this batch: moved the remaining guest dashboard overlay stack behind `src/pages/dashboard/guests/GuestDashboardOverlays.tsx`.
  - Data-boundary hardening: `src/pages/dashboard/Guests.tsx` no longer owns the assisted RSVP modal, add/edit guest modal wiring, itinerary drawer shell, delete-all modal, CSV import modal stack, or inline confirm dialog rendering.
  - No feature loss: guest add/edit, assisted RSVP capture, itinerary invitation toggles, delete-all confirmation, CSV import review, and confirm-dialog flows preserve the current behavior while shrinking page-owned UI transport.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins the higher-level `GuestDashboardOverlays` seam and rejects regaining the older inline overlay copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 7:16 PM PT - No-deploy Guest dashboard header and list-display boundary extraction:
  - Resolved in this batch: moved the guest dashboard hero/header shell, import/actions toolbar shell, and list-vs-households display composition out of `src/pages/dashboard/Guests.tsx` and behind existing guest dashboard components.
  - Data-boundary hardening: `Guests.tsx` now routes those seams through `src/pages/dashboard/guests/GuestDashboardHeader.tsx`, `src/pages/dashboard/guests/GuestOpsToolbar.tsx`, and `src/pages/dashboard/guests/GuestListDisplaySwitcher.tsx` instead of carrying the large inline JSX blocks.
  - No feature loss: guest insights toggles, import CTA, bulk action menu, check-in mode, household grouping, and guest list actions preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins the higher-level header, toolbar, and list-display seams and rejects regaining the old inline search/empty-state composition.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 7:27 PM PT - No-deploy Guest dashboard panel extraction continuation:
  - Resolved in this batch: moved the guest RSVP settings screen, snapshot/insights panel, RSVP conflict review panels, and campaign reminder modal shell out of `src/pages/dashboard/Guests.tsx` and behind existing guest dashboard components.
  - Data-boundary hardening: `Guests.tsx` now routes those seams through `src/pages/dashboard/guests/GuestRsvpSettingsView.tsx`, `src/pages/dashboard/guests/GuestSnapshotInsightsPanel.tsx`, `src/pages/dashboard/guests/GuestRsvpConflictPanels.tsx`, and `src/pages/dashboard/guests/GuestCampaignReminderPanel.tsx` instead of carrying the large inline JSX blocks.
  - File-size movement: `Guests.tsx` dropped from 3371 lines to 2806 lines in this continuation batch.
  - No feature loss: RSVP settings editing, audit history review, RSVP conflict triage, and campaign reminder planning preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins the higher-level RSVP settings, insights, conflict, and campaign seams and rejects regaining the old inline hero/panel copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 7:39 PM PT - No-deploy Guest dashboard ops-summary extraction:
  - Resolved in this batch: moved the guest dashboard recommended-action card, RSVP follow-up list, planner handoff card, and quickstart photo skip card out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestOpsSummaryPanel.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes that ops-summary stack through `GuestOpsSummaryPanel` instead of carrying the inline recommended-action and follow-up queue composition.
  - File-size movement: `Guests.tsx` dropped from 2806 lines to 2763 lines in this continuation batch.
  - No feature loss: recommended action focus, follow-up task creation, guest queue filtering, planner handoff guidance, and quickstart photo continuation preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins the higher-level `GuestOpsSummaryPanel` seam and rejects regaining the old inline `Recommended next action` and `RSVP follow-up list` copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 7:46 PM PT - No-deploy Guest photo card-boundary extraction:
  - Resolved in this batch: moved the guest photo hero, guest follow-up card, guestbook card, couple albums card, stats cards, slideshow draft card, and photo moments card out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind existing `src/pages/dashboard/guestPhotos/*` components.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes those display seams through `GuestPhotoHeroCard`, `GuestPhotoFollowupCard`, `GuestPhotoGuestbookCard`, `GuestPhotoCoupleAlbumsCard`, `GuestPhotoStatsCards`, `GuestPhotoSlideshowDraftCard`, and `GuestPhotoMomentsCard` instead of carrying those inline JSX sections.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 3018 lines to 2846 lines in this continuation batch.
  - No feature loss: hero stats, prospect follow-up actions, guestbook moderation, couple album uploads, summary counts, slideshow planning, and photo-moment review preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins those higher-level guest photo seams and rejects regaining the old inline copy for the extracted cards.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo behavior. No deploy was run.
- 2026-05-07 7:52 PM PT - No-deploy Guest photo dashboard card extraction continuation:
  - Resolved in this batch: moved the guest photo memory-and-vaults card, no-app memory flow checklist, guest hub QR card, recap sharing card, guest hub controls card, and moment albums card out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind existing `src/pages/dashboard/guestPhotos/*` components.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes those display seams through `GuestPhotoMemoryVaultsCard`, `GuestPhotoMemoryFlowCard`, `GuestPhotoHubQrCard`, `GuestPhotoRecapSharingCard`, `GuestPhotoHubControlsCard`, and `GuestPhotoMomentAlbumsCard` instead of carrying those inline JSX sections.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 2846 lines to 2625 lines in this continuation batch.
  - No feature loss: vault handoff, QR readiness review, guest hub sharing, recap status control, guest hub toggles, and moment-album suggestions preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins those additional guest photo seams and rejects regaining the old inline copy for the extracted cards.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo behavior. No deploy was run.
- 2026-05-07 7:59 PM PT - No-deploy Guest photo review and slideshow extraction:
  - Resolved in this batch: moved the guest photo review card out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `GuestPhotoReviewCard`, while keeping the earlier slideshow and organizer routing intact and pinned in the same guest-photo seam lane.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now pins `GuestPhotoOrganizerCard`, `GuestPhotoSlideshowCard`, and `GuestPhotoReviewCard` as page-owned composition seams instead of carrying the old inline review block.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 2625 lines to 2389 lines in this continuation batch.
  - No feature loss: highlight review, duplicate triage, hidden-photo recovery, memory chapter export, organizer notes, and slideshow preview/export preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins those additional guest photo seams and rejects regaining the old inline review/slideshow copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo behavior. No deploy was run.
- 2026-05-07 8:04 PM PT - No-deploy Guest photo album-management extraction:
  - Resolved in this batch: moved the guest photo album creation shell, album controls shell, bucket header shell, and recent uploads list out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind existing `src/pages/dashboard/guestPhotos/*` components.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes those seams through `GuestPhotoAlbumCreateCard`, `GuestPhotoAlbumControls`, `GuestPhotoBucketCard`, and `GuestPhotoRecentUploadsList` instead of carrying the old inline album-management composition.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 2389 lines to 2038 lines in this continuation batch.
  - No feature loss: album creation, event-album bootstrap, sharing-link/QR actions, bucket status toggles, upload-window editing, and per-upload moderation preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins those additional guest photo seams and rejects regaining the old inline album-management copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo behavior. No deploy was run.
- 2026-05-07 8:09 PM PT - No-deploy Guest photo duplicate review cleanup:
  - Resolved in this batch: removed a duplicate `GuestPhotoReviewCard` mount from `src/pages/dashboard/GuestPhotoSharing.tsx`, so the owner review surface now renders once instead of twice.
  - Data-boundary hardening: `src/lib/dashboardDataBoundary.test.ts` now counts `GuestPhotoReviewCard` occurrences and requires a single mount, preventing quiet regression back to a duplicated review panel.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 2038 lines to 2012 lines in this continuation batch.
  - No feature loss: highlight review, duplicate triage, recap moderation, organizer notes, and slideshow planning preserve the current behavior while removing redundant dashboard UI.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This removes a local owner-dashboard duplication bug without changing guest photo data or transport behavior. No deploy was run.
- 2026-05-07 8:13 PM PT - No-deploy Guest photo state-shell extraction:
  - Resolved in this batch: moved the quick-start continuation banner and album-list loading/blank/filter-empty state shells out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `GuestPhotoQuickStartBanner` plus `GuestPhotoAlbumListState`.
  - Data-boundary hardening: `src/lib/dashboardDataBoundary.test.ts` now pins those extra guest photo seams and rejects regaining the old inline quick-start and album-state copy in the page.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 2012 lines to 1986 lines in this continuation batch.
  - No feature loss: quick-start review handoff, empty-album starter suggestions, loading feedback, and filtered-empty messaging preserve the current behavior while shrinking page-owned composition.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo data or transport behavior. No deploy was run.
- 2026-05-07 8:16 PM PT - No-deploy Guest photo window-editor extraction:
  - Resolved in this batch: moved the per-bucket parent-album and upload-window editor out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `GuestPhotoBucketWindowEditor`.
  - Data-boundary hardening: the guest photo dashboard page now routes another bucket-management seam through a dedicated component instead of carrying the old inline parent/window editor block inside the bucket map.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 1986 lines to 1949 lines in this continuation batch.
  - No feature loss: parent-album reassignment, suggested window defaults, and upload-window open/close edits preserve the current behavior while shrinking page-owned composition.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo data or transport behavior. No deploy was run.
- 2026-05-07 8:20 PM PT - No-deploy Guest photo bucket-list extraction:
  - Resolved in this batch: moved the guest photo bucket render loop out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `GuestPhotoBucketList`.
  - Data-boundary hardening: `src/lib/dashboardDataBoundary.test.ts` now pins the higher-level bucket-list seam instead of the old page-owned `GuestPhotoBucketCard`, `GuestPhotoBucketWindowEditor`, and `GuestPhotoRecentUploadsList` loop.
  - File-size movement: `GuestPhotoSharing.tsx` dropped from 1949 lines to 1917 lines in this continuation batch.
  - No feature loss: album card rendering, upload-window editing, recent-upload moderation, and bucket-level sharing controls preserve the current behavior while shrinking page-owned composition.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local oversized-file and page-boundary risk in the guest photo dashboard without changing guest photo data or transport behavior. No deploy was run.
- Do not start broad refactors from this file alone.
- Execute this backlog top-down by risk, beginning with the P0 public data, gating, RSVP, AI key, service worker, email escaping, SSRF, and settings contract issues.
- Update proof logs and launch docs only after concrete verification passes.
- 2026-05-07 8:24 PM PT - No-deploy Guest dashboard export-service extraction:
  - Resolved in this batch: moved the guest dashboard CSV/download and guest-contact/RSVP-link export transport out of `src/pages/dashboard/Guests.tsx` and behind the existing `src/pages/dashboard/guests/useGuestDashboardExports.ts` hook.
  - Data-boundary hardening: `Guests.tsx` now routes guest CSV exports, event attendance export, thank-you/check-in exports, address/household exports, guest update link copy, and text RSVP link copy through `useGuestDashboardExports(...)` instead of carrying the old inline browser blob/download block.
  - No feature loss: filtered guest exports, event attendance exports, guest update link copy, and SMS RSVP link copy preserve the current behavior, including the service-backed public/site slug lookup path.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin the export-hook seam and reject regaining the old inline export helpers.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts` (66/66), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:31 PM PT - No-deploy Guest dashboard segment-controls extraction:
  - Resolved in this batch: moved the guest dashboard segment summary, RSVP follow-up alerts, filter-chip row, check-in status banners, and selected-guest status bar out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestSegmentControlsPanel.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes that filter-and-banners slab through `GuestSegmentControlsPanel` instead of carrying the old inline `Active segment`, exception banner, missing-meal banner, no-contact banner, check-in mode banner, and selected-guest summary composition.
  - File-size movement: `Guests.tsx` dropped from 2644 lines to 2560 lines in this continuation batch.
  - No feature loss: filter reset, RSVP exception review, meal follow-up, missing-contact handoff, households/check-in toggles, checked-in drill-down, undo last check-in, and selection visibility controls preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestSegmentControlsPanel` and rejects regaining the old inline segment/banner copy.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:37 PM PT - No-deploy Guest dashboard engagement-shell extraction:
  - Resolved in this batch: moved the guest dashboard engagement controls stack out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestEngagementControlsPanel.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes `GuestOpsToolbar`, `GuestCampaignReminderPanel`, and `GuestSegmentControlsPanel` through one higher-level guest shell instead of composing those three sections inline.
  - File-size movement: `Guests.tsx` dropped from 2560 lines to 2545 lines in this continuation batch.
  - No feature loss: guest exports/imports, reminder campaign controls, auto-reminder toggles, segment focus actions, filter banners, and check-in/selection controls preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestEngagementControlsPanel` and rejects regaining the old inline engagement stack.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:43 PM PT - No-deploy Guest dashboard workspace-shell extraction:
  - Resolved in this batch: moved the bordered guest dashboard workspace card out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestDashboardWorkspace.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes `GuestEngagementControlsPanel` and `GuestListDisplaySwitcher` through one higher-level workspace shell instead of owning that `Card` composition inline.
  - File-size movement: `Guests.tsx` dropped from 2545 lines to 2542 lines in this continuation batch.
  - No feature loss: guest engagement controls, list-vs-households switching, and filtered empty-state handling preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardWorkspace` and rejects regaining the old inline `GuestEngagementControlsPanel` / `GuestListDisplaySwitcher` seam in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:47 PM PT - No-deploy Guest dashboard content-shell extraction:
  - Resolved in this batch: moved the middle guest dashboard content stack out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestDashboardContent.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes `GuestSnapshotInsightsPanel`, `GuestRsvpConflictPanels`, `GuestOpsSummaryPanel`, and `GuestDashboardWorkspace` through one higher-level content shell instead of composing those dashboard slabs inline.
  - File-size movement: `Guests.tsx` held at 2542 lines in this continuation batch, but the page owns one less top-level layout seam.
  - No feature loss: insights drill-down, RSVP conflict handling, ops summary actions, and the guest workspace preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardContent` and rejects regaining the old inline insight/conflict/ops/workspace seam in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:50 PM PT - No-deploy Guest dashboard ops-view extraction:
  - Resolved in this batch: moved the guest dashboard ops-mode page shell out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestDashboardOpsView.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes the ops-mode layout branch through one higher-level shell instead of directly composing `DashboardLayout`, `GuestDashboardHeader`, and `GuestDashboardContent` inline.
  - File-size movement: `Guests.tsx` held at 2542 lines in this continuation batch, but the page owns one less top-level route/layout seam.
  - No feature loss: ops-mode header controls, insight toggles, guest dashboard content, and overlays preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardOpsView` and rejects regaining the old inline guest ops-page shell in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:55 PM PT - No-deploy Guest dashboard route-view extraction:
  - Resolved in this batch: moved the guest dashboard route/branch shell out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/GuestDashboardRouteView.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes the loading view, RSVP-settings branch, and ops-mode branch through one higher-level route shell instead of directly switching among `DashboardLayout`, `DashboardStateBlock`, `GuestRsvpSettingsView`, and `GuestDashboardOpsView`.
  - File-size movement: `Guests.tsx` dropped from 2542 lines to 2524 lines in this continuation batch.
  - No feature loss: guest loading state, RSVP settings editing, ops-mode dashboard content, and overlays preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardRouteView` and rejects regaining the old inline loading/RSVP/ops branch seam in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 8:59 PM PT - No-deploy Guest dashboard overlay-route consolidation:
  - Resolved in this batch: moved the guest dashboard overlay stack behind the existing `src/pages/dashboard/guests/GuestDashboardRouteView.tsx` so `src/pages/dashboard/Guests.tsx` no longer owns the direct `GuestDashboardOverlays` mount or its long prop handoff inline.
  - Data-boundary hardening: `Guests.tsx` now routes loading, RSVP settings, ops mode, and overlays through one higher-level route shell instead of explicitly mounting the overlay branch itself.
  - File-size movement: `Guests.tsx` dropped from 2524 lines to 2522 lines in this continuation batch.
  - No feature loss: assisted RSVP, add/edit guest, itinerary drawer, CSV import review, delete-all confirmation, and shared confirm-dialog behavior preserve the current flow while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now keeps `GuestDashboardRouteView` as the pinned seam and rejects regaining the old inline overlay mount in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 9:03 PM PT - No-deploy Guest dashboard overlay-props helper extraction:
  - Resolved in this batch: moved the guest dashboard overlay prop assembly out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/buildGuestDashboardOverlayProps.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes the overlay prop bundle through a dedicated helper instead of carrying the old long inline `GuestDashboardOverlays` prop object assembly in the page body.
  - File-size movement: `Guests.tsx` nudged from 2522 lines to 2523 lines in this continuation batch; the value here is ownership cleanup rather than size reduction.
  - No feature loss: assisted RSVP, add/edit guest, itinerary drawer, CSV import review, delete-all confirmation, and confirm-dialog prop wiring preserve the current flow while reducing page-owned assembly noise.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins the `buildGuestDashboardOverlayProps({` helper seam so the page does not quietly regrow the old inline overlay prop block.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the guest dashboard without changing guest operations behavior. No deploy was run.
- 2026-05-07 9:09 PM PT - No-deploy Message dashboard-view extraction:
  - Resolved in this batch: moved the non-loading message dashboard body out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/MessageDashboardView.tsx`.
  - Data-boundary hardening: `Messages.tsx` now routes the hero, planner banner, sending-details toggle, composer/saved-template grid, reach snapshot, starting points, history panel, detail modal, and toast stack through one higher-level messages shell instead of owning that large JSX slab inline.
  - File-size movement: `Messages.tsx` dropped from 1755 lines to 1689 lines in this continuation batch.
  - No feature loss: scheduled-send controls, role switching, composer actions, history filters, retry/reschedule actions, detail modal behavior, and toast rendering preserve the current behavior while shrinking page-owned composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `MessageDashboardView` and rejects regaining the old inline message dashboard card/modal/toast composition in `Messages.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the messages dashboard without changing message delivery behavior. No deploy was run.
- 2026-05-07 9:14 PM PT - No-deploy Message dashboard route-view extraction:
  - Resolved in this batch: moved the message dashboard loading-vs-live branch out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/MessageDashboardRouteView.tsx`.
  - Data-boundary hardening: `Messages.tsx` now routes both the loading state and the live `MessageDashboardView` branch through one higher-level route shell instead of directly switching between `DashboardLayout`, `DashboardStateBlock`, and the dashboard body.
  - File-size movement: `Messages.tsx` dropped from 1689 lines to 1665 lines in this continuation batch; the new route shell is 26 lines.
  - No feature loss: loading copy, role switching, composer actions, history filters, scheduled-send controls, detail modal behavior, and toast rendering preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `MessageDashboardRouteView` and rejects regaining the old inline loading shell, dashboard cards, modal, and toast composition in `Messages.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the messages dashboard without changing message delivery behavior. No deploy was run.
- 2026-05-07 8:59 PM PT - No-deploy Vault dashboard route-view extraction:
  - Resolved in this batch: moved the vault dashboard loading-vs-live shell out of `src/pages/dashboard/Vault.tsx` and behind `src/pages/dashboard/VaultDashboardRouteView.tsx`.
  - Data-boundary hardening: `Vault.tsx` now routes both the loading state and the live anniversary-vault workspace through one higher-level route shell instead of directly switching between `DashboardLayout`, `DashboardStateBlock`, and the dashboard body.
  - File-size movement: `Vault.tsx` dropped from 1629 lines to 1618 lines in this continuation batch; the new route shell is 22 lines.
  - No feature loss: vault hero actions, Google Drive health controls, archive-mode guidance, vault cards, edit modal, and toast rendering preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `VaultDashboardRouteView` and rejects regaining the old inline loading shell in `Vault.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts` (22/22), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the vault dashboard without changing vault behavior. No deploy was run.
- 2026-05-07 9:02 PM PT - No-deploy Overview dashboard route-view extraction:
  - Resolved in this batch: moved the overview dashboard layout/error/loading shell out of `src/pages/dashboard/Overview.tsx` and behind `src/pages/dashboard/OverviewDashboardRouteView.tsx`.
  - Data-boundary hardening: `Overview.tsx` now routes the overview layout, recoverable error state, and loading skeleton through one higher-level route shell instead of directly composing `DashboardLayout`, `DashboardStateBlock`, and the page skeleton inline.
  - File-size movement: `Overview.tsx` dropped from 1661 lines to 1644 lines in this continuation batch; the new route shell is 36 lines.
  - No feature loss: overview hero, setup progress, calm digest, guest pulse, interactive suggestions, and voting summary rendering preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `OverviewDashboardRouteView` and rejects regaining the old inline overview layout and state shell in `Overview.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the overview dashboard without changing overview behavior. No deploy was run.
- 2026-05-07 9:05 PM PT - No-deploy Settings dashboard-shell extraction:
  - Resolved in this batch: moved the settings page chrome out of `src/pages/dashboard/Settings.tsx` and behind `src/pages/dashboard/settings/SettingsDashboardShell.tsx`.
  - Data-boundary hardening: `Settings.tsx` now routes the outer layout, hero stats, and settings navigation through one higher-level shell instead of directly composing `DashboardLayout`, `DashboardPageHero`, and `SettingsNavigation` inline.
  - File-size movement: `Settings.tsx` dropped from 1313 lines to 1298 lines in this continuation batch; the new dashboard shell is 49 lines.
  - No feature loss: account settings, team access, site settings, RSVP controls, notifications, and billing preserve the current behavior while shrinking page-owned chrome composition.
  - Proof added/updated: `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins `SettingsDashboardShell` and rejects regaining the old inline settings layout, hero, and nav shell in `Settings.tsx`.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts` (17/17), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the settings dashboard without changing settings behavior. No deploy was run.
- 2026-05-07 9:07 PM PT - No-deploy Itinerary dashboard route-view extraction:
  - Resolved in this batch: moved the itinerary dashboard loading-vs-live shell out of `src/pages/dashboard/Itinerary.tsx` and behind `src/pages/dashboard/ItineraryDashboardRouteView.tsx`.
  - Data-boundary hardening: `Itinerary.tsx` now routes the loading skeleton and live schedule workspace through one higher-level route shell instead of directly composing `DashboardLayout` and the loading branch inline.
  - File-size movement: `Itinerary.tsx` dropped from 1122 lines to 1109 lines in this continuation batch; the new route shell is 27 lines.
  - No feature loss: schedule hero, event form, smart template builder, bulk shift tools, timeline insights, event cards, guest manager, and confirm dialog preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `ItineraryDashboardRouteView` and rejects regaining the old inline itinerary layout shell in `Itinerary.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the itinerary dashboard without changing itinerary behavior. No deploy was run.
- 2026-05-07 9:10 PM PT - No-deploy Planning dashboard-shell extraction:
  - Resolved in this batch: moved the planning page chrome out of `src/pages/dashboard/Planning.tsx` and behind `src/pages/dashboard/planning/PlanningDashboardShell.tsx`.
  - Data-boundary hardening: `Planning.tsx` now routes the outer layout, hero stats, section selector, role selector, and planner/coordinator mode banners through one higher-level shell instead of directly composing `DashboardLayout` and `DashboardPageHero` inline.
  - File-size movement: `Planning.tsx` dropped from 992 lines to 930 lines in this continuation batch; the new dashboard shell is 120 lines.
  - No feature loss: planning overview, tasks, budget, payments, vendors, songs, address collection, name-change planner, and vendor-to-budget prompt preserve the current behavior while shrinking page-owned chrome composition.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `PlanningDashboardShell` and rejects regaining the old inline planning layout and hero shell in `Planning.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and page-boundary risk in the planning dashboard without changing planning behavior. No deploy was run.
- 2026-05-07 9:13 PM PT - No-deploy Site view route-shell extraction:
  - Resolved in this batch: moved the public site view loading/privacy/error/readiness branch selection out of `src/pages/SiteView.tsx` and behind `src/pages/SiteViewRouteView.tsx`.
  - Data-boundary hardening: `SiteView.tsx` now routes the loading spinner, coming-soon view, password gate, invite-only gate, error state, fallback-not-ready state, and final live content handoff through one higher-level route shell instead of owning that branch ladder inline.
  - File-size movement: `SiteView.tsx` dropped from 1055 lines to 1028 lines in this continuation batch; the new route shell is 57 lines.
  - No feature loss: builder renderer, DB page renderer, owner preview banner, privacy unlock flow, and guest-facing fallback states preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` now pins `SiteViewRouteView` and rejects regaining the old inline loading/error copy in `SiteView.tsx`.
  - Validation passed: `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/pages/siteViewService.test.ts src/pages/SiteView.test.ts src/lib/publicSiteAccess.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and public-surface route risk in `SiteView` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:17 PM PT - No-deploy Vault contribution route-shell extraction:
  - Resolved in this batch: moved the public vault contribution loading/invalid/hub/success/error branch selection out of `src/pages/VaultContribute.tsx` and behind `src/pages/VaultContributeRouteView.tsx`.
  - Data-boundary hardening: `VaultContribute.tsx` now routes its guest-facing state ladder through one higher-level route shell instead of owning the `step` branch ladder inline.
  - File-size movement: `VaultContribute.tsx` dropped from 1053 lines to 1023 lines in this continuation batch; the new route shell is 30 lines.
  - No feature loss: vault picker, gated loading flow, success return-to-list handoff, error retry path, and the main guest contribution form preserve the current behavior while shrinking page-owned route composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/VaultContribute.test.ts` now pin `VaultContributeRouteView` and reject regaining the old inline `step` branch ladder in `VaultContribute.tsx`.
  - Validation passed: `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/pages/VaultContribute.test.ts` (16/16), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and public-surface route risk in `VaultContribute` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:22 PM PT - No-deploy Event hub shell extraction:
  - Resolved in this batch: moved the guest hub missing-slug branch and config-status notice slab out of `src/pages/EventHub.tsx` and behind `src/pages/EventHubRouteView.tsx` plus `src/pages/EventHubConfigStatusCard.tsx`.
  - Data-boundary hardening: `EventHub.tsx` now routes its top-level missing-slug vs live-content split through one higher-level route shell and routes the loading/offline/fallback retry notice through a dedicated status card instead of owning both seams inline.
  - File-size movement: `EventHub.tsx` dropped from 545 lines to 524 lines in this continuation batch; the new route shell is 12 lines and the new status card is 47 lines.
  - No feature loss: guest hub actions, QR target, config fallback behavior, retry handling, opt-in flow, day-of readiness summary, and travel guest path preserve the current behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventHub.test.tsx` now pin `EventHubRouteView` plus `EventHubConfigStatusCard` and reject regaining the old inline missing-slug branch in `EventHub.tsx`.
  - Validation passed: `npm test -- --run src/pages/EventHub.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 oversized-file and public-surface route risk in `EventHub` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:26 PM PT - No-deploy Event recap route-shell extraction:
  - Resolved in this batch: moved the guest recap loading/error/content branch selection out of `src/pages/EventRecap.tsx` and behind `src/pages/EventRecapRouteView.tsx`.
  - Data-boundary hardening: `EventRecap.tsx` now routes its recap loading state plus no-data error fallback through one higher-level route shell instead of owning that branch ladder inline.
  - File-size movement: `EventRecap.tsx` grew from 538 lines to 558 lines in this continuation batch while `src/pages/EventRecapRouteView.tsx` came in at 21 lines; the line count rose because the recap body was made explicitly route-safe instead of relying on eager `data!` assumptions.
  - No feature loss: recap stats, top moments, chapter summary, story export, share actions, and guest opt-in form preserve the current behavior while shrinking page-owned route branching.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRecap.test.tsx` now pin `EventRecapRouteView` and reject regaining the old inline loading/error blocks in `EventRecap.tsx`.
  - Validation passed: `npm test -- --run src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface route risk in `EventRecap` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:30 PM PT - No-deploy Event RSVP route-shell extraction:
  - Resolved in this batch: moved the guest event RSVP loading/invalid-link/live branch selection out of `src/pages/EventRSVP.tsx` and behind `src/pages/EventRsvpRouteView.tsx`.
  - Data-boundary hardening: `EventRSVP.tsx` now routes its loading spinner plus invalid-link error shell through one higher-level route view while keeping the modal RSVP editor explicit and local.
  - File-size movement: `EventRSVP.tsx` grew from 837 lines to 845 lines in this continuation batch while `src/pages/EventRsvpRouteView.tsx` came in at 21 lines; the page got slightly longer because the live page shell is now named explicitly before the route handoff.
  - No feature loss: invitation lookup, map links, existing RSVP badges, modal RSVP editing, short-lived RSVP session submit flow, and continuity refresh behavior preserve the current guest behavior while shrinking page-owned route branching.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRSVP.test.tsx` now pin `EventRsvpRouteView` so the event RSVP page keeps routing through the shared route shell instead of hand-owning the loading/error split.
  - Validation passed: `npm test -- --run src/pages/EventRSVP.test.tsx src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts` (10/10), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface route risk in `EventRSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:35 PM PT - No-deploy RSVP route-shell extraction:
  - Resolved in this batch: moved the guest RSVP token-auto-loading invitation shell out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpRouteView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now routes its token-linked loading spinner plus fallback “Enter invitation code instead” affordance through one higher-level route view while keeping the main RSVP search and form flow explicit and local.
  - File-size movement: `RSVP.tsx` stayed effectively flat in this continuation batch while `src/pages/RsvpRouteView.tsx` came in at 13 lines; this was an ownership cleanup more than a size win.
  - No feature loss: invitation lookup, picked-guest follow-up lookup, household RSVP editing, continuity refresh behavior, and submit flow preserve the current guest behavior while shrinking page-owned route branching.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpRouteView` so the RSVP page keeps routing through the shared route shell instead of hand-owning the token-loading split.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface route risk in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:39 PM PT - No-deploy photo upload status-panel extraction:
  - Resolved in this batch: moved the guest photo upload feedback slab out of `src/pages/PhotoUpload.tsx` and behind `src/pages/PhotoUploadStatusPanel.tsx`.
  - Data-boundary hardening: `PhotoUpload.tsx` now routes its upload error state, success message, hub recap/back CTA pair, create-your-own CTA, and uploaded/failed filename lists through one higher-level status panel instead of owning that guest-facing state stack inline.
  - File-size movement: `PhotoUpload.tsx` dropped from 392 lines to 342 lines in this continuation batch while `src/pages/PhotoUploadStatusPanel.tsx` came in at 55 lines.
  - No feature loss: upload runtime gating, guest prospect follow-up opt-in, file chooser status, upload submit flow, and post-upload recap/hub links preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/PhotoUpload.test.ts` now pin `PhotoUploadStatusPanel` so the photo upload page keeps routing through the shared guest feedback shell.
  - Validation passed: `npm test -- --run src/pages/PhotoUpload.test.ts src/lib/publicGuestSurfaceBoundary.test.ts` (9/9), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `PhotoUpload` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:42 PM PT - No-deploy guest contact lookup-panel extraction:
  - Resolved in this batch: moved the guest contact search-and-match picker slab out of `src/pages/GuestContactUpdate.tsx` and behind `src/pages/GuestContactLookupPanel.tsx`.
  - Data-boundary hardening: `GuestContactUpdate.tsx` now routes its guest-record search input, lookup CTA, match selector, and apply-to-household toggle through one higher-level lookup panel instead of owning that guest-facing discovery stack inline.
  - File-size movement: `GuestContactUpdate.tsx` dropped from 271 lines to 225 lines in this continuation batch while `src/pages/GuestContactLookupPanel.tsx` came in at 72 lines.
  - No feature loss: gated guest-contact lookup, demo fallback lookup, selected household sizing, mailing/contact update form, and submit flow preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/GuestContactUpdate.test.ts` now pin `GuestContactLookupPanel` so the guest contact page keeps routing through the shared lookup shell.
  - Validation passed: `npm test -- --run src/pages/GuestContactUpdate.test.ts src/lib/publicGuestSurfaceBoundary.test.ts` (7/7), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `GuestContactUpdate` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:45 PM PT - No-deploy guestbook form-panel extraction:
  - Resolved in this batch: moved the guestbook form shell out of `src/pages/GuestbookSubmit.tsx` and behind `src/pages/GuestbookSubmitFormPanel.tsx`.
  - Data-boundary hardening: `GuestbookSubmit.tsx` now routes its name/email/note inputs, honeypot field, guest-safe status copy, submit CTA, and return-to-hub link through one higher-level form panel instead of owning that guest-facing form slab inline.
  - File-size movement: `GuestbookSubmit.tsx` dropped from 144 lines to 97 lines in this continuation batch while `src/pages/GuestbookSubmitFormPanel.tsx` came in at 74 lines.
  - No feature loss: gated guestbook submit runtime, invite-token capture, safe validation copy, note character count, and return-to-hub behavior preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/GuestbookSubmit.test.ts` now pin `GuestbookSubmitFormPanel` so the guestbook page keeps routing through the shared form shell.
  - Validation passed: `npm test -- --run src/pages/GuestbookSubmit.test.ts src/lib/publicGuestSurfaceBoundary.test.ts` (8/8), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `GuestbookSubmit` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:50 PM PT - No-deploy event hub live-content extraction:
  - Resolved in this batch: moved the guest hub’s full live-content shell out of `src/pages/EventHub.tsx` and behind `src/pages/EventHubLiveContent.tsx`.
  - Data-boundary hardening: `EventHub.tsx` now hands off the hero, enabled action list, travel guest path, save-link notice, hub-details board, and recap opt-in form through one higher-level live-content component instead of owning that guest-facing shell inline.
  - File-size movement: `EventHub.tsx` dropped from 524 lines to 269 lines in this continuation batch while `src/pages/EventHubLiveContent.tsx` came in at 280 lines.
  - No feature loss: gated guest-hub config loading, view/click tracking, action routing, travel guest path, day-of readiness copy, and recap opt-in behavior preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventHub.test.tsx` now pin `EventHubLiveContent` so the event hub page keeps routing through the shared live-content shell.
  - Validation passed: `npm test -- --run src/pages/EventHub.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `EventHub` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 9:54 PM PT - No-deploy event recap live-content extraction:
  - Resolved in this batch: moved the event recap’s full live-content shell out of `src/pages/EventRecap.tsx` and behind `src/pages/EventRecapLiveContent.tsx`.
  - Data-boundary hardening: `EventRecap.tsx` now hands off the recap header, share CTA, stats strip, and nested route-view shell through one higher-level live-content component instead of owning that guest-facing recap frame inline.
  - File-size movement: `EventRecap.tsx` dropped from 558 lines to 468 lines in this continuation batch while `src/pages/EventRecapLiveContent.tsx` came in at 94 lines.
  - No feature loss: gated recap config loading, invite-token capture, share/download/caption helpers, opt-in form behavior, and top-moments / chapter / story rendering preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRecap.test.tsx` now pin `EventRecapLiveContent` so the recap page keeps routing through the shared live-content shell.
  - Validation passed: `npm test -- --run src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `EventRecap` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:03 PM PT - No-deploy event RSVP live-content extraction:
  - Resolved in this batch: moved the event RSVP page’s full guest-facing live-content shell out of `src/pages/EventRSVP.tsx` and behind `src/pages/EventRsvpLiveContent.tsx`.
  - Data-boundary hardening: `EventRSVP.tsx` now hands off the invitation list shell, event metadata rows, RSVP badge state, empty-state card, and event RSVP CTA stack through one higher-level live-content component instead of owning that guest-facing surface inline.
  - File-size movement: `EventRSVP.tsx` dropped from 845 lines to 730 lines in this continuation batch while `src/pages/EventRsvpLiveContent.tsx` came in at 172 lines.
  - No feature loss: token lookup, continuity refresh behavior, modal RSVP editor, session-backed submit flow, and guest-safe invalid-link handling preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRSVP.test.tsx` now pin `EventRsvpLiveContent` so the event RSVP page keeps routing through the shared live-content shell.
  - Validation passed: `npm test -- --run src/pages/EventRSVP.test.tsx src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts` (10/10), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `EventRSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:05 PM PT - No-deploy RSVP search-view extraction:
  - Resolved in this batch: moved the main RSVP page’s large guest-facing search/hero entry slab out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpSearchView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the public hero image shell, invitation search form, prediction list, helper guidance, and guest-safe search error slab through one higher-level search view instead of owning that entry surface inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1954 lines to 1831 lines in this continuation batch while `src/pages/RsvpSearchView.tsx` came in at 182 lines.
  - No feature loss: token auto-load handling, lookup cancellation, guest prediction keyboard flow, private RSVP lookup, and downstream pick/form/success behavior preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpSearchView` so the main RSVP page keeps routing through the shared search shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:08 PM PT - No-deploy RSVP success-view extraction:
  - Resolved in this batch: moved the main RSVP page’s guest-facing confirmation/success slab out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpSuccessView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the confirmation badge shell, RSVP summary drawer, inherited-household recap, confirmation copy, and done / submit-another CTA stack through one higher-level success view instead of owning that completion surface inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1831 lines to 1734 lines in this continuation batch while `src/pages/RsvpSuccessView.tsx` came in at 158 lines.
  - No feature loss: post-submit state, return-to-loaded RSVP behavior, submit-another reset flow, household recap, and event / meal / plus-one / notes summary preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpSuccessView` so the main RSVP page keeps routing through the shared success shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:11 PM PT - No-deploy RSVP guest-picker extraction:
  - Resolved in this batch: moved the main RSVP page’s ambiguous-guest picker slab out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpGuestPickerView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the multiple-match explanation copy, guest choice list, invite-access hint rows, and search-again CTA through one higher-level picker view instead of owning that guest-selection surface inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1734 lines to 1695 lines in this continuation batch while `src/pages/RsvpGuestPickerView.tsx` came in at 79 lines.
  - No feature loss: ambiguous-name lookup flow, guest pick handling, loading-safe selection buttons, and reset-to-search behavior preserve the current guest behavior while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpGuestPickerView` so the main RSVP page keeps routing through the shared picker shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This reduces local P1/P2 public-surface oversized-file risk in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:14 PM PT - No-deploy RSVP flow-shell extraction:
  - Resolved in this batch: moved the main RSVP page’s remaining non-search route/content branch shell out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpFlowView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the pick/form/success route composition through one higher-level flow view instead of owning that top-level guest branch ladder inline.
  - File-size movement: `src/pages/RSVP.tsx` stayed flat at 1695 lines in this continuation batch while `src/pages/RsvpFlowView.tsx` came in at 23 lines, so this was primarily an ownership cleanup rather than a size win.
  - No feature loss: ambiguous guest selection, RSVP form rendering, and success-view handoff preserve the current guest behavior while reducing page-owned route composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpFlowView` so the main RSVP page keeps routing through the shared flow shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:25 PM PT - No-deploy RSVP form-view extraction:
  - Resolved in this batch: moved the main RSVP page’s giant live form/review card out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpFormView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the deadline/status notices, progress rail, attendance/details/review steps, household inheritance controls, meal and custom-question inputs, error slab, and back/continue/submit CTA stack through one higher-level form view instead of owning that guest-facing form shell inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1695 lines to 1283 lines in this continuation batch while `src/pages/RsvpFormView.tsx` came in at 529 lines.
  - No feature loss: token-backed submit gating, household inheritance selection, event attendance choices, meal and plus-one capture, child-count selection, Spotify playlist handoff, custom question handling, and final review behavior preserve the current guest RSVP flow while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpFormView` so the main RSVP page keeps routing through the shared form shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This materially reduces local P1/P2 oversized-file risk in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:30 PM PT - No-deploy RSVP live-content extraction:
  - Resolved in this batch: moved the main RSVP page’s live search-vs-flow guest surface out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpLiveContentView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the main guest-facing live body through one higher-level content view instead of directly composing `RsvpSearchView`, `RsvpFlowView`, `RsvpFormView`, `RsvpGuestPickerView`, and `RsvpSuccessView` inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1283 lines to 1250 lines in this continuation batch while `src/pages/RsvpLiveContentView.tsx` came in at 208 lines.
  - No feature loss: invitation search, guest prediction keyboard flow, ambiguous guest selection, RSVP form progression, success handoff, and token-backed reset/return behavior preserve the current guest RSVP flow while shrinking page-owned public-surface composition.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpLiveContentView` so the main RSVP page keeps routing through the shared live-content shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:34 PM PT - No-deploy RSVP token-loading extraction:
  - Resolved in this batch: moved the main RSVP page’s token-loading shell out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpTokenLoadingView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the loading spinner and “Enter invitation code instead” fallback through one dedicated token-loading view instead of owning that guest-facing autoload shell inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1250 lines to 1237 lines in this continuation batch while `src/pages/RsvpTokenLoadingView.tsx` came in at 21 lines.
  - No feature loss: token autoload state, fallback-to-manual-search behavior, and the route-level loading handoff preserve the current guest RSVP behavior while trimming one more page-owned shell.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpTokenLoadingView` so the main RSVP page keeps routing through the shared token-loading shell.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:37 PM PT - No-deploy RSVP live-content prop-helper extraction:
  - Resolved in this batch: moved the main RSVP page’s large live-content prop assembly block out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpLiveContentViewProps.ts`.
  - Data-boundary hardening: `RSVP.tsx` now hands off the live-content prop bundle through one helper instead of hand-wiring the whole `RsvpLiveContentView` contract inline.
  - File-size movement: `src/pages/RSVP.tsx` ticked from 1237 lines to 1240 lines in this continuation batch while `src/pages/buildRsvpLiveContentViewProps.ts` came in at 7 lines, so this was an ownership cleanup rather than a size win.
  - No feature loss: invitation search, ambiguous guest selection, form progression, success handoff, and token-backed reset/return behavior preserve the current guest RSVP flow while reducing page-owned prop wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpLiveContentViewProps(...)` so the main RSVP page keeps routing through the shared prop-assembly helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:40 PM PT - No-deploy RSVP derived-view-state extraction:
  - Resolved in this batch: moved the main RSVP page’s derived guest-facing view state out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpDerivedViewState.ts`.
  - Data-boundary hardening: `RSVP.tsx` now hands off guest prediction suggestions, active prediction id, invited event labels, allowed-children stepper options, and inherited household member derivation through one helper instead of recalculating that presentation state inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1240 lines to 1229 lines in this continuation batch while `src/pages/buildRsvpDerivedViewState.ts` came in at 72 lines.
  - No feature loss: demo RSVP search suggestions, keyboard-activedescendant wiring, event-label summaries, children option sizing, and inherited-household recap preserve the current guest RSVP behavior while shrinking page-owned presentation derivation.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpDerivedViewState(...)` so the main RSVP page keeps routing through the shared derived-state helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:43 PM PT - No-deploy RSVP step-validation extraction:
  - Resolved in this batch: moved the main RSVP page’s step-advance validation logic out of `src/pages/RSVP.tsx` and behind `src/pages/validateRsvpFormAdvance.ts`.
  - Data-boundary hardening: `RSVP.tsx` now hands off attendance/event-selection, meal-choice, and required-question advance checks through one pure helper instead of keeping those guest-facing validation rules inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1229 lines to 1211 lines in this continuation batch while `src/pages/validateRsvpFormAdvance.ts` came in at 69 lines.
  - No feature loss: attendance sanity checks, event-selection guardrails, meal requirement gating, and required custom-question validation preserve the current guest RSVP step flow while shrinking page-owned rule logic.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `validateRsvpFormAdvance(...)` so the main RSVP page keeps routing through the shared step-validation helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:50 PM PT - No-deploy RSVP page-view-model extraction:
  - Resolved in this batch: moved another layer of guest-facing RSVP page view state out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpPageViewModel.ts`.
  - Data-boundary hardening: `RSVP.tsx` now hands off guest display name, deadline state, submit availability, meal-option membership, and the shared search/prediction ids through one helper instead of deriving those scalars inline.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1211 lines to 1212 lines in this continuation batch while `src/pages/buildRsvpPageViewModel.ts` came in at 46 lines.
  - No feature loss: deadline gating, token-backed submit eligibility, meal-choice normalization guardrails, and ARIA-linked RSVP search ids preserve the current guest RSVP flow while reducing page-owned view-model wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpPageViewModel(...)` so the main RSVP page keeps routing through the shared page-view-model helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:53 PM PT - No-deploy RSVP live-content action extraction:
  - Resolved in this batch: moved the guest-facing RSVP live-content action bundle out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpLiveContentActions.ts`.
  - Data-boundary hardening: `RSVP.tsx` now hands off back-navigation, loading cancellation, done routing, search-again reset, and submit-another reset through one helper instead of hand-wiring those route actions inline inside the live-content prop bundle.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1212 lines to 1204 lines in this continuation batch while `src/pages/buildRsvpLiveContentActions.ts` came in at 70 lines.
  - No feature loss: form-step back behavior, token lookup cancellation, loaded-RSVP return flow, and search reset paths preserve the current guest RSVP route behavior while reducing page-owned action wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpLiveContentActions(...)` so the main RSVP page keeps routing through the shared live-content action helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 10:57 PM PT - No-deploy RSVP page route-view extraction:
  - Resolved in this batch: moved the top-level RSVP route/content composition out of `src/pages/RSVP.tsx` and behind `src/pages/RsvpPageRouteView.tsx`.
  - Data-boundary hardening: `RSVP.tsx` no longer mounts `RsvpRouteView`, `RsvpTokenLoadingView`, and `RsvpLiveContentView` directly; it now hands off token-loading shell and live-content composition through one small route wrapper while still owning the underlying state and prop assembly.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1204 lines to 1194 lines in this continuation batch while `src/pages/RsvpPageRouteView.tsx` came in at 25 lines.
  - No feature loss: token auto-loading, invitation-code fallback, and live RSVP route handoff preserve the current guest RSVP entry flow while reducing page-owned top-level rendering seams.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpPageRouteView` and the named `liveContentProps` handoff so the main RSVP page keeps routing through the shared route wrapper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:00 PM PT - No-deploy RSVP lookup-reset extraction:
  - Resolved in this batch: moved the shared manual lookup reset path out of `src/pages/RSVP.tsx` and behind `src/pages/resetRsvpLookupFlow.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes the repeated pre-search and pre-guest-pick reset bundle through one helper instead of hand-resetting loading state, guest selection, RSVP state, form state, meal config, household state, and step state in two separate branches.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1194 lines to 1200 lines in this continuation batch while `src/pages/resetRsvpLookupFlow.ts` came in at 93 lines.
  - No feature loss: manual RSVP search, ambiguous guest selection, and guest-pick lookup retries preserve the current reset behavior while reducing page-owned lookup choreography duplication.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `resetRsvpLookupFlow(...)` so the main RSVP page keeps routing repeated lookup resets through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:04 PM PT - No-deploy RSVP guest-selection extraction:
  - Resolved in this batch: moved the RSVP guest-selection state application block out of `src/pages/RSVP.tsx` and behind `src/pages/applyRsvpGuestSelection.ts`.
  - Data-boundary hardening: `RSVP.tsx` no longer directly owns the full “guest selected, hydrate route state” setter choreography; it now hands off guest/session assignment, RSVP hydration, household selection state, meal/question state, and form/success path setup through one helper while still owning the lookup and submit decisions.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1200 lines to 1197 lines in this continuation batch while `src/pages/applyRsvpGuestSelection.ts` came in at 113 lines.
  - No feature loss: token-linked guest loads, manual guest lookup success, ambiguous guest selection, and submit-success rehydration preserve the current RSVP flow while reducing page-owned selection/hydration wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyRsvpGuestSelection(...)` so the main RSVP page keeps routing guest-selection hydration through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:07 PM PT - No-deploy RSVP ambiguous-lookup extraction:
  - Resolved in this batch: moved the ambiguous guest-picker hydration branch out of `src/pages/RSVP.tsx` and behind `src/pages/applyAmbiguousRsvpLookupState.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes the repeated “multiple guests matched” UI-state setup through one helper instead of duplicating guest list, deadline, question, meal config, playlist, household, and selected-household hydration across token lookup and manual search branches.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1197 lines to 1212 lines in this continuation batch while `src/pages/applyAmbiguousRsvpLookupState.ts` came in at 49 lines.
  - No feature loss: manual guest search and token-linked lookup still land on the same ambiguous guest-picker state with the same household defaults and event/meal context.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyAmbiguousRsvpLookupState(...)` so the main RSVP page keeps routing repeated ambiguous-match hydration through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:12 PM PT - No-deploy RSVP lookup-response classification extraction:
  - Resolved in this batch: moved the shared RSVP lookup outcome classification out of `src/pages/RSVP.tsx` and behind `src/pages/classifyRsvpLookupResponse.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes token lookup, manual guest search, and guest-pick lookup follow-up through one shared helper for guest, ambiguous, and not-found outcomes instead of repeating the same guest/guest-list branching and default meal, household, playlist, question, and session hydration logic inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1212 lines to 1208 lines in this continuation batch while `src/pages/classifyRsvpLookupResponse.ts` came in at 54 lines.
  - No feature loss: token-linked guest loads, manual RSVP search, ambiguous guest selection, and fallback invalid-code handling preserve the current guest RSVP flow while reducing repeated lookup-response choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `classifyRsvpLookupResponse(...)` and its explicit `guest` / `ambiguous` / `not_found` outcomes so the main RSVP page keeps routing lookup-result branching through the shared classifier.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:16 PM PT - No-deploy RSVP page-reset extraction:
  - Resolved in this batch: moved the shared RSVP page reset bundle out of `src/pages/RSVP.tsx` and behind `src/pages/resetRsvpPageState.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes both the top-level `resetToSearch(...)` path and the empty-token reset path in `loadInvitationForToken(...)` through one helper instead of hand-resetting loading, guest, RSVP, household, form, and search state inline in multiple places.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1208 lines to 1205 lines in this continuation batch while `src/pages/resetRsvpPageState.ts` came in at 95 lines.
  - No feature loss: token-autoload fallback, invitation-code reset, and back-to-search behavior preserve the current guest RSVP flow while reducing repeated full-page reset choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `resetRsvpPageState(...)` and its search-step/token-loading reset behavior so the main RSVP page keeps routing full-page resets through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:20 PM PT - No-deploy RSVP submit-readiness extraction:
  - Resolved in this batch: moved the shared pre-submit RSVP guardrails out of `src/pages/RSVP.tsx` and behind `src/pages/validateRsvpSubmitReadiness.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes deadline, invitation-session, event-selection, and household-sharing readiness checks through one helper instead of hand-owning those guest-facing submit prerequisites inline in `handleSubmit(...)`.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1205 lines to 1201 lines in this continuation batch while `src/pages/validateRsvpSubmitReadiness.ts` came in at 58 lines.
  - No feature loss: deadline enforcement, invitation-link enforcement, event attendance guardrails, and household-share selection rules preserve the current RSVP submit behavior while reducing repeated guest-surface validation copy inside the submit path.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `validateRsvpSubmitReadiness(...)` and its exact guest-facing error copy so the main RSVP page keeps routing pre-submit checks through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:23 PM PT - No-deploy RSVP submit-success extraction:
  - Resolved in this batch: moved the shared post-submit RSVP success choreography out of `src/pages/RSVP.tsx` and behind `src/pages/applyRsvpSubmitSuccess.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes both the demo submit success path and the live submit success path through one helper instead of repeating guest rehydration, household-selection normalization, continuity ping, and success-step routing inline.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1201 lines to 1232 lines in this continuation batch while `src/pages/applyRsvpSubmitSuccess.ts` came in at 72 lines, so this was an ownership cleanup more than a shrink pass.
  - No feature loss: demo RSVP submit, live RSVP submit, household-share normalization, token-linked continuity refresh, and success-screen routing preserve the current guest RSVP flow while reducing duplicated post-submit state choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyRsvpSubmitSuccess(...)` and its continuity/success handoff so the main RSVP page keeps routing post-submit success state through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:25 PM PT - No-deploy RSVP submit-payload extraction:
  - Resolved in this batch: moved the shared RSVP submit payload assembly out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpSubmitPayload.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes target guest-id selection, notes/meal/plus-one normalization, child-count normalization, custom-answer normalization, and normalized existing-RSVP assembly through one helper instead of hand-building those submit ingredients inline.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1232 lines to 1238 lines in this continuation batch while `src/pages/buildRsvpSubmitPayload.ts` came in at 66 lines, so this was another ownership cleanup rather than a size-reduction pass.
  - No feature loss: demo submit, live submit, household-share targeting, plus-one normalization, and follow-up success hydration preserve the current RSVP submit behavior while reducing duplicated submit-payload preparation logic.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpSubmitPayload(...)` and its target-guest / normalized-RSVP / plus-one-count assembly so the main RSVP page keeps routing submit-payload prep through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:28 PM PT - No-deploy RSVP demo-submit extraction:
  - Resolved in this batch: moved the shared demo RSVP response write out of `src/pages/RSVP.tsx` and behind `src/pages/applyDemoRsvpSubmit.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes demo stored-response persistence through one helper instead of directly reading demo storage, mutating rows, and writing them back inline inside the submit path.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1238 lines to 1236 lines in this continuation batch while `src/pages/applyDemoRsvpSubmit.ts` came in at 15 lines.
  - No feature loss: demo RSVP submit still writes one normalized RSVP row per selected guest id and still hands off to the shared post-submit success helper immediately after persistence.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyDemoRsvpSubmit(...)` plus its demo storage read/write contract so the main RSVP page keeps routing demo submit persistence through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:32 PM PT - No-deploy RSVP live-submit transport extraction:
  - Resolved in this batch: moved the shared live RSVP submit transport out of `src/pages/RSVP.tsx` and behind `src/pages/submitRsvpResponse.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes the Edge Function `submit` request and `success` response check through one helper instead of hand-building the transport call and `submitSucceeded` branch inline in the live submit path.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1236 lines to 1234 lines in this continuation batch while `src/pages/submitRsvpResponse.ts` came in at 62 lines.
  - No feature loss: live RSVP submit still sends the same payload shape to `validate-rsvp-token`, still treats only `{ success: true }` as success, and still preserves the existing guest-facing submit error handling and success flow.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `submitRsvpResponse(...)` and its `action: 'submit'` / `submitSucceeded` transport contract so the main RSVP page keeps routing live submit transport through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:35 PM PT - No-deploy RSVP loaded-state restore extraction:
  - Resolved in this batch: moved the shared “return to loaded RSVP” rehydrate path out of `src/pages/RSVP.tsx` and behind `src/pages/restoreLoadedRsvpState.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes the loaded-form restore flow through one helper instead of hand-owning selected guest-id assembly, normalized RSVP rebuilding, household-selection normalization, token-linked-session restoration, and form-step reset inline.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1234 lines to 1242 lines in this continuation batch while `src/pages/restoreLoadedRsvpState.ts` came in at 95 lines, so this was an ownership cleanup rather than a shrink pass.
  - No feature loss: backing out of review or other local edits still restores the same loaded RSVP values, household-share selection, and token-linked form state while reducing page-owned restore choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `restoreLoadedRsvpState(...)` and its form-step / loaded-RSVP / token-linked-session handoff so the main RSVP page keeps routing loaded-state restore through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:39 PM PT - No-deploy RSVP submit-success-args extraction:
  - Resolved in this batch: moved the shared post-submit RSVP success arg bundling out of `src/pages/RSVP.tsx` and behind `src/pages/buildRsvpSubmitSuccessArgs.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes both the demo submit-success path and the live submit-success path through one helper for continuity ping wiring and `submitSource` derivation instead of hand-building those `applyRsvpSubmitSuccess(...)` args inline twice.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1242 lines to 1237 lines in this continuation batch while `src/pages/buildRsvpSubmitSuccessArgs.ts` came in at 63 lines.
  - No feature loss: demo RSVP submit and live RSVP submit still trigger the same continuity update behavior, still guard the next local continuity event, and still preserve the same token-vs-manual submit-source handoff.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpSubmitSuccessArgs(...)` plus its continuity-update and submit-source contract so the main RSVP page keeps routing submit-success arg assembly through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:49 PM PT - No-deploy RSVP token-lookup preflight extraction:
  - Resolved in this batch: moved the shared token-lookup preflight and reset choreography out of `src/pages/RSVP.tsx` and behind `src/pages/prepareRsvpTokenLookupState.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes both the empty-token reset branch and the active token-lookup request preflight through one helper instead of hand-owning request-id increments, continuity flags, token-session resets, search-state resets, and fresh lookup shell preparation inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1237 lines to 1210 lines in this continuation batch while `src/pages/prepareRsvpTokenLookupState.ts` came in at 182 lines.
  - No feature loss: empty-token fallback, token-loading shell behavior, preserved visible state during continuity refreshes, and fresh manual token lookup resets all preserve the current guest RSVP flow while reducing route-owned preflight choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `prepareRsvpTokenLookupState(...)` plus its explicit `empty` / `lookup` outcomes and `searchValue: token` reset contract so the main RSVP page keeps routing token-lookup prep through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:53 PM PT - No-deploy RSVP token-lookup result extraction:
  - Resolved in this batch: moved the shared token-lookup guest/ambiguous/not-found resolution branch out of `src/pages/RSVP.tsx` and behind `src/pages/applyTokenRsvpLookupResult.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes token lookup result handling through one helper instead of hand-owning the repeated preserve-visible-state branch, token session toggles, guest handoff, ambiguous handoff, and not-found guest error path inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1210 lines to 1185 lines in this continuation batch while `src/pages/applyTokenRsvpLookupResult.ts` came in at 113 lines.
  - No feature loss: token-linked guest loads, preserved visible state during continuity refreshes, ambiguous token handling, and guest-safe not-found behavior all preserve the current RSVP flow while reducing route-owned token resolution choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyTokenRsvpLookupResult(...)` plus its token/manual source contract, preserve-visible-state branch, and guest-safe not-found handling so the main RSVP page keeps routing token result handling through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-07 11:58 PM PT - No-deploy RSVP manual-lookup result extraction:
  - Resolved in this batch: moved the shared manual-search and picked-guest follow-up lookup resolution branch out of `src/pages/RSVP.tsx` and behind `src/pages/applyManualRsvpLookupResult.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes manual search result handling and picked-guest follow-up result handling through one helper instead of hand-owning duplicated guest/ambiguous/not-found branching, guest-safe error copy, and picked-guest fallback behavior inline in both flows.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1185 lines to 1159 lines in this continuation batch while `src/pages/applyManualRsvpLookupResult.ts` came in at 109 lines.
  - No feature loss: manual invitation search, ambiguous guest selection, picked-guest follow-up fallback, and guest-safe not-found handling all preserve the current RSVP flow while reducing route-owned lookup resolution choreography.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyManualRsvpLookupResult(...)` plus its fallback guest path, classifier handoff, ambiguous handoff, and guest-safe error contracts so the main RSVP page keeps routing manual result handling through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:02 AM PT - No-deploy RSVP resolved-guest extraction:
  - Resolved in this batch: moved the shared “turn a lookup result into loaded RSVP guest state” bridge out of `src/pages/RSVP.tsx` and behind `src/pages/applyResolvedRsvpGuest.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes resolved guest handoff through one helper instead of hand-owning token-session updates, normalized RSVP prep, selected household guest derivation, household-selection defaults, and `applyRsvpGuestSelection(...)` arg assembly inline.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1159 lines to 1154 lines in this continuation batch while `src/pages/applyResolvedRsvpGuest.ts` came in at 131 lines, so this was a boundary cleanup more than a big shrink pass.
  - No feature loss: token-linked guest loads, manual guest loads, existing RSVP hydration, household-selection defaults, and legacy session-token fallback all preserve the current RSVP flow while reducing route-owned guest-selection prep.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyResolvedRsvpGuest(...)` plus its token-session branch, selected-household derivation, and `applyRsvpGuestSelection(...)` handoff so the main RSVP page keeps routing resolved guest prep through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:05 AM PT - No-deploy RSVP guest-lookup transport extraction:
  - Resolved in this batch: moved the shared manual-search and picked-guest lookup transport out of `src/pages/RSVP.tsx` and behind `src/pages/lookupRsvpGuest.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes both guest-facing `lookup` and `lookup_guest` fetch paths through one helper instead of hand-owning the demo-vs-function transport split inline.
  - File-size movement: `src/pages/RSVP.tsx` moved from 1154 lines to 1162 lines in this continuation batch while `src/pages/lookupRsvpGuest.ts` came in at 36 lines, so this was a boundary cleanup more than a shrink pass.
  - No feature loss: manual invitation search, picked-guest follow-up lookup, demo RSVP mode, and live `validate-rsvp-token` lookup behavior all preserve the current RSVP flow while reducing route-owned transport wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `lookupRsvpGuest(...)` plus its `lookup`, `lookup_guest`, and demo lookup contract so the main RSVP page keeps routing guest lookup transport through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:09 AM PT - No-deploy RSVP token-lookup transport extraction:
  - Resolved in this batch: moved the token-based invitation lookup transport out of `src/pages/RSVP.tsx` and behind `src/pages/lookupRsvpToken.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes the guest-facing token invitation lookup through one helper instead of hand-owning the demo-vs-function transport split inline inside `loadInvitationForToken(...)`.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1162 lines to 1161 lines in this continuation batch while `src/pages/lookupRsvpToken.ts` came in at 23 lines, so this was a small ownership win rather than a big shrink pass.
  - No feature loss: token auto-load, demo RSVP token lookup, live `validate-rsvp-token` invitation lookup, preserve-visible-state refreshes, and downstream token result handling all preserve the current RSVP flow while reducing route-owned transport wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `lookupRsvpToken(...)` plus its demo lookup and live `lookup` transport contract so the main RSVP page keeps routing token lookup transport through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:15 AM PT - No-deploy RSVP token-lookup lifecycle extraction:
  - Resolved in this batch: moved the token invitation lookup execution path out of `src/pages/RSVP.tsx` and behind `src/pages/runRsvpTokenLookup.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes token lookup execution through one helper instead of hand-owning the token transport call, token result application, preserve-visible-state fallback, and token lookup finalization inline inside `loadInvitationForToken(...)`.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1161 lines to 1146 lines in this continuation batch while `src/pages/runRsvpTokenLookup.ts` came in at 113 lines.
  - No feature loss: token auto-load, continuity refresh token lookup, preserve-visible-state retries, guest-safe lookup failure copy, and downstream token RSVP hydration all preserve the current RSVP flow while reducing route-owned token lifecycle wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpTokenLookup(...)` plus its `lookupRsvpToken(...)`, `applyTokenRsvpLookupResult(...)`, and guest-safe error contract so the main RSVP page keeps routing token lookup execution through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:20 AM PT - No-deploy RSVP guest-lookup lifecycle extraction:
  - Resolved in this batch: moved the shared manual-search and picked-guest follow-up lookup execution path out of `src/pages/RSVP.tsx` and behind `src/pages/runRsvpGuestLookup.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes guest lookup execution through one helper instead of hand-owning the guest lookup transport call, manual result application, picked-guest fallback handling, and loading finalization inline in both `handleSearch(...)` and `handlePickGuest(...)`.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1146 lines to 1128 lines in this continuation batch while `src/pages/runRsvpGuestLookup.ts` came in at 140 lines.
  - No feature loss: manual invitation search, ambiguous guest resolution, picked-guest follow-up lookup, picked-guest fallback behavior, and guest-safe interrupted-search handling all preserve the current RSVP flow while reducing route-owned lookup lifecycle wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpGuestLookup(...)` plus its `lookupRsvpGuest(...)`, `applyManualRsvpLookupResult(...)`, and picked-guest fallback contract so the main RSVP page keeps routing guest lookup execution through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:26 AM PT - No-deploy RSVP submit lifecycle extraction:
  - Resolved in this batch: moved the RSVP submit execution path out of `src/pages/RSVP.tsx` and behind `src/pages/runRsvpSubmit.ts`.
  - Data-boundary hardening: `RSVP.tsx` now routes submit execution through one helper instead of hand-owning readiness validation, payload assembly handoff, demo submit persistence, live submit transport, submit-success routing, and final loading teardown inline inside `handleSubmit(...)`.
  - File-size movement: `src/pages/RSVP.tsx` dropped from 1128 lines to 1048 lines in this continuation batch while `src/pages/runRsvpSubmit.ts` came in at 262 lines.
  - No feature loss: guest submit readiness checks, demo RSVP persistence, live RSVP transport, success continuity updates, and guest-safe submit failure copy all preserve the current RSVP flow while reducing route-owned submit lifecycle wiring.
  - Proof added/updated: `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpSubmit(...)` plus its `validateRsvpSubmitReadiness(...)`, `buildRsvpSubmitPayload(...)`, `submitRsvpResponse(...)`, and success-handoff contract so the main RSVP page keeps routing submit execution through the shared helper.
  - Validation passed: `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts` (113/113), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local public-surface ownership cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- 2026-05-08 12:55 AM PT - No-deploy vault dashboard action extraction:
  - Resolved in this batch: moved the owner vault action lifecycle out of `src/pages/dashboard/Vault.tsx` and behind `src/pages/dashboard/useVaultDashboardActions.ts`.
  - Data-boundary hardening: `Vault.tsx` now routes anniversary reminder sends, vault creation, starter vault seeding, enable/disable toggles, vault edits, entry saves, entry deletes, and vault deletes through one hook instead of hand-owning those transport and demo/live persistence branches inline.
  - File-size movement: `src/pages/dashboard/Vault.tsx` dropped from 1618 lines to 1387 lines in this continuation batch while `src/pages/dashboard/useVaultDashboardActions.ts` came in at 322 lines.
  - No feature loss: demo vault state, live vault mutations, reminder sends, duplicate-year guardrails, submission-year lockouts, and guest-safe owner error copy all preserve the current anniversary vault workflow while reducing page-owned action wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useVaultDashboardActions({ ... })` plus its `sendAnniversaryReminder(...)`, `createVaultConfig(...)`, `seedStarterVaultConfigs(...)`, `updateVaultEnabled(...)`, `updateVaultConfig(...)`, `createVaultEntry(...)`, `deleteVaultEntry(...)`, and `deleteVaultConfigWithEntryRollback(...)` contract.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts` (22/22), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Vault` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:00 AM PT - No-deploy overview intelligence action extraction:
  - Resolved in this batch: moved the overview intelligence and draft-refresh action lifecycle out of `src/pages/dashboard/Overview.tsx` and behind `src/pages/dashboard/useOverviewIntelligenceActions.ts`.
  - Data-boundary hardening: `Overview.tsx` now routes builder-field dirty marking, AI draft refresh from the saved brief, invisible-intelligence dismissal persistence, and interactive-suggestion hiding through one hook instead of hand-owning that service and local-storage choreography inline.
  - File-size movement: `src/pages/dashboard/Overview.tsx` dropped from 1644 lines to 1577 lines in this continuation batch while `src/pages/dashboard/useOverviewIntelligenceActions.ts` came in at 129 lines.
  - No feature loss: saved-brief draft regeneration, builder dirty-marking, hidden suggestion persistence, guest-safe failure copy, and local intelligence-dismissal continuity all preserve the current overview workflow while reducing page-owned action wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useOverviewIntelligenceActions({ ... })` plus its `markOverviewBuilderFieldAsUserEdited(...)`, `loadOverviewDraftRefreshSeed(...)`, `updateOverviewDraftRefresh(...)`, `persistOverviewIntelligenceDismissals(...)`, and `hideInteractiveSuggestion(...)` contract.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Overview` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:07 AM PT - No-deploy itinerary timeline action extraction:
  - Resolved in this batch: moved the itinerary event and timeline mutation lifecycle out of `src/pages/dashboard/Itinerary.tsx` and behind `src/pages/dashboard/useItineraryTimelineActions.ts`.
  - Data-boundary hardening: `Itinerary.tsx` now routes event save/delete, bulk timeline shifts, undo, and smart-template creation through one hook instead of hand-owning that demo/live transport and mutation choreography inline.
  - File-size movement: `src/pages/dashboard/Itinerary.tsx` dropped from 1109 lines to 928 lines in this continuation batch while `src/pages/dashboard/useItineraryTimelineActions.ts` came in at 294 lines.
  - No feature loss: event date validation, end-time guardrails, demo itinerary persistence, live timeline writes, delete confirmations, and guest-safe timeline failure copy all preserve the current itinerary workflow while reducing page-owned action wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useItineraryTimelineActions({ ... })` plus its `saveItineraryEvent(...)`, `deleteItineraryEvent(...)`, `persistItineraryTimeline(...)`, `resolveItinerarySiteId(...)`, and `createItineraryTemplateEvents(...)` contract.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Itinerary` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:15 AM PT - No-deploy settings site/team action extraction:
  - Resolved in this batch: moved the settings site-access, identity-export, translation, and collaborator-invite action lifecycle out of `src/pages/dashboard/Settings.tsx` and behind `src/pages/dashboard/settings/useSettingsSiteAccessActions.ts`.
  - Data-boundary hardening: `Settings.tsx` now routes planner invite save/remove, collaborator invite create/revoke/resend/copy, site slug updates, privacy saves, guest-link regeneration, identity export actions, default-language updates, translation generation, and music-playlist saves through one hook instead of hand-owning that transport and customer-safe error choreography inline.
  - File-size movement: `src/pages/dashboard/Settings.tsx` dropped from 1298 lines to 1004 lines in this continuation batch while `src/pages/dashboard/settings/useSettingsSiteAccessActions.ts` came in at 577 lines.
  - No feature loss: owner team invite flows, guest access link management, privacy/password/invite-only handling, language/translation updates, wedding identity exports, and song-request playlist saves all preserve the current settings workflow while reducing page-owned action wiring.
  - Proof added/updated: `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `useSettingsSiteAccessActions({ ... })` plus its collaborator invite, slug/privacy, translation, and identity-export contract so the main settings page keeps routing those behaviors through the dedicated hook.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts` (17/17), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Settings` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:22 AM PT - No-deploy settings experience action extraction:
  - Resolved in this batch: moved the settings RSVP, notification, billing checkout, and template-switch execution path out of `src/pages/dashboard/Settings.tsx` and behind `src/pages/dashboard/settings/useSettingsExperienceActions.ts`.
  - Data-boundary hardening: `Settings.tsx` now routes RSVP settings saves, notification preference saves, checkout-session launch, and template regeneration/switching through one hook instead of hand-owning that validation, persistence, redirect, and customer-safe error choreography inline.
  - File-size movement: `src/pages/dashboard/Settings.tsx` dropped from 1004 lines to 883 lines in this continuation batch while `src/pages/dashboard/settings/useSettingsExperienceActions.ts` came in at 256 lines.
  - No feature loss: demo RSVP settings persistence, live RSVP and notification writes, billing checkout redirect, template regeneration with AI draft remap preservation, and customer-safe settings errors all preserve the current owner workflow while reducing page-owned action wiring.
  - Proof added/updated: `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `useSettingsExperienceActions({ ... })` plus its RSVP, notification, billing, and template-change contract so the main settings page keeps routing those behaviors through the dedicated hook.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts` (17/17), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Settings` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:28 AM PT - No-deploy message compose action extraction:
  - Resolved in this batch: moved the message composer send/edit/schedule execution path out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageComposeActions.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes draft saves, scheduled sends, immediate sends, demo delivery state updates, and bulk-send follow-through through one hook instead of hand-owning that recipient validation, message persistence, send transport, and customer-safe toast choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 1333 lines to 1171 lines in this continuation batch while `src/pages/dashboard/messages/useMessageComposeActions.ts` came in at 268 lines.
  - No feature loss: editable drafts, scheduled campaigns, demo-message behavior, live send-now delivery behavior, SMS provider and credit guardrails, and recipient review messaging all preserve the current owner workflow while reducing page-owned compose lifecycle wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposeActions({ ... })` plus its `insertDashboardMessageMinimal(...)`, `updateDashboardMessage(...)`, and `triggerDashboardBulkSend(...)` contract so the main messaging page keeps routing compose execution through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:34 AM PT - No-deploy message composer draft action extraction:
  - Resolved in this batch: moved the message composer template, preset, reusable-template, and quick-draft lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageComposerDraftActions.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes composer template application, saved-template load/delete, reusable-template saves, save-the-date quick-create, and event/day-of presets through one hook instead of hand-owning that draft assembly, local template persistence, demo/live campaign creation, and customer-safe toast choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 1171 lines to 983 lines in this continuation batch while `src/pages/dashboard/messages/useMessageComposerDraftActions.ts` came in at 288 lines.
  - No feature loss: reusable message templates, save-the-date quick scheduling, event reminder presets, day-of update presets, demo-message draft creation, and guest-safe saved-template messaging all preserve the current owner workflow while reducing page-owned draft wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposerDraftActions({ ... })` plus its `createDashboardMessage(payload)`, `writeSavedComposerTemplates(updated)`, and save-the-date draft contract so the main messaging page keeps routing draft-template execution through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:39 AM PT - No-deploy message composer history action extraction:
  - Resolved in this batch: moved the message-history-to-composer and campaign follow-up lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageComposerHistoryActions.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes “edit or duplicate this message,” “start a follow-up from this campaign thread,” and “schedule a follow-up from this campaign thread” through one hook instead of hand-owning that permission gating, schedule hydration, preset selection, and customer-safe toast choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 983 lines to 844 lines in this continuation batch while `src/pages/dashboard/messages/useMessageComposerHistoryActions.ts` came in at 215 lines.
  - No feature loss: draft reload for edit/duplicate, follow-up reminders, day-of updates, thank-you campaigns, scheduled follow-up timing defaults, and scroll-to-composer behavior all preserve the current owner workflow while reducing page-owned history wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposerHistoryActions({ ... })` plus its `toScheduleInputValue(message.scheduled_for)`, `applyComposerTemplate('rsvp-reminder', ...)`, and `formatScheduledMessageDateTime(scheduledIso)` contract so the main messaging page keeps routing history-to-composer execution through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:43 AM PT - No-deploy message dashboard prefill sync extraction:
  - Resolved in this batch: moved the route-prefill and post-checkout query-sync lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageDashboardPrefillSync.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes URL template prefills, composer subject/body/audience/channel prefills, text-credit checkout refresh handling, and query cleanup through one hook instead of hand-owning that route/session choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 844 lines to 796 lines in this continuation batch while `src/pages/dashboard/messages/useMessageDashboardPrefillSync.ts` came in at 118 lines.
  - No feature loss: template deep links, pending-guest template audience overrides, composer prefill links, successful text-credit refresh behavior, canceled checkout notices, and URL cleanup all preserve the current owner workflow while reducing page-owned route sync wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardPrefillSync({ ... })` plus its requested-template detection, success toast, and `cleanedParams.delete('smsCredits')` contract so the main messaging page keeps routing URL/session prefill execution through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:45 AM PT - No-deploy message dashboard continuity sync extraction:
  - Resolved in this batch: moved the RSVP continuity listener lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageDashboardContinuitySync.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes focus-based refresh, RSVP continuity event refresh, storage-based refresh, and visibility-based refresh through one hook instead of hand-owning that event listener choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 796 lines to 765 lines in this continuation batch while `src/pages/dashboard/messages/useMessageDashboardContinuitySync.ts` came in at 52 lines.
  - No feature loss: guest/message refresh on RSVP changes, cross-tab sync, focus recovery, and visibility recovery all preserve the current owner workflow while reducing page-owned lifecycle wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardContinuitySync({ ... })` plus its focus listener, RSVP continuity event listener, and visibility-change contract so the main messaging page keeps routing continuity refresh execution through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:50 AM PT - No-deploy message dashboard data hook extraction:
  - Resolved in this batch: moved the message dashboard data-loading and refresh lifecycle out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageDashboardData.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes active-site resolution, message history loading, guest loading, delivery loading, itinerary-audience loading, and SMS credit preview loading through one hook instead of hand-owning that async fetch choreography inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 765 lines to 565 lines in this continuation batch while `src/pages/dashboard/messages/useMessageDashboardData.ts` came in at 305 lines.
  - No feature loss: demo-mode hydration, owner/collaborator role state, missing delivery table fallback, itinerary audience segment loading, SMS credit preview refresh, and customer-safe loading errors all preserve the current owner workflow while reducing page-owned data lifecycle wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardData({ ... })` plus its `loadMessagesActiveSite(userId)`, `loadDashboardMessages(weddingSite.id)`, `loadMessageDeliveries(messageIds)`, `loadMessageItineraryAudience(weddingSite.id)`, and `loadSmsCreditPreview(weddingSite.id, cutoff)` contract so the main messaging page keeps routing data loading through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 01:56 AM PT - No-deploy message dashboard view-props helper extraction:
  - Resolved in this batch: moved the remaining message dashboard route-view prop assembly out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/buildMessageDashboardViewProps.ts`.
  - Data-boundary hardening: `Messages.tsx` now hands a named prop bundle to `MessageDashboardRouteView` instead of hand-owning the composer, history, reach snapshot, sending details, saved templates, starting points, and detail modal prop composition inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 565 lines to 530 lines in this continuation batch while `src/pages/dashboard/messages/buildMessageDashboardViewProps.ts` came in at 256 lines.
  - No feature loss: composer send/draft actions, history retry/reschedule/send-now flows, saved-template actions, SMS pack purchase wiring, photo follow-through, toast rendering, and detail-modal management all preserve the current owner workflow while reducing page-owned prop choreography.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildMessageDashboardViewProps({ ... })` plus the helper-owned `detailModalProps`, `composerProps`, `historyProps`, and `reachSnapshotProps` seams so the main messaging page keeps routing dashboard view composition through the dedicated helper.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:01 AM PT - No-deploy message dashboard derived-state helper extraction:
  - Resolved in this batch: moved the remaining message dashboard reachability, delivery, filter, and campaign analytics derivation out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/buildMessageDashboardDerivedState.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes recipient reachability counts, SMS credit math, email-cap math, filtered history, campaign thread selection, delivery health, provider telemetry, and retry/review candidate derivation through one helper instead of hand-owning that pure dashboard math inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 530 lines to 501 lines in this continuation batch while `src/pages/dashboard/messages/buildMessageDashboardDerivedState.ts` came in at 148 lines.
  - No feature loss: message audience filtering, schedule-in-the-past warnings, SMS segment/credit checks, history filter behavior, campaign-thread follow-through, and owner-facing delivery summaries all preserve the current workflow while reducing page-owned derivation logic.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildMessageDashboardDerivedState({ ... })` plus its `filterMessageHistory(...)`, `buildCampaignThreads(...)`, `getActiveCampaignThread(...)`, and `buildProviderTelemetry(...)` seams so the main messaging page keeps routing dashboard math through the dedicated helper.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:05 AM PT - No-deploy message dashboard UI-state hook extraction:
  - Resolved in this batch: moved the remaining message dashboard local state, persistence, and small lifecycle glue out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageDashboardUiState.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes saved-template bootstrapping, persisted role restore/save, toast state, composer/delivery modal state, history filter state, and route-detail toggle state through one hook instead of hand-owning that UI-state scaffolding inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 501 lines to 478 lines in this continuation batch while `src/pages/dashboard/messages/useMessageDashboardUiState.ts` came in at 147 lines.
  - No feature loss: collaborator role persistence, sending-details URL bootstrap, toast dismissal timing, saved-template hydration, message-detail modal state, and message-history filter state all preserve the current workflow while reducing page-owned state wiring.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardUiState()` plus the hook-owned saved-template state, sending-details URL bootstrap, and persisted `readPlannerAccessRole(...)` / `writePlannerAccessRole(...)` seams so the main messaging page keeps routing UI-state glue through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:08 AM PT - No-deploy message billing action extraction:
  - Resolved in this batch: moved the text-credit checkout action flow out of `src/pages/dashboard/Messages.tsx` and behind `src/pages/dashboard/messages/useMessageBillingActions.ts`.
  - Data-boundary hardening: `Messages.tsx` now routes SMS credit checkout gating, checkout session launch, billing audit logging, and customer-safe checkout failure handling through one hook instead of hand-owning that action flow inline.
  - File-size movement: `src/pages/dashboard/Messages.tsx` dropped from 478 lines to 449 lines in this continuation batch while `src/pages/dashboard/messages/useMessageBillingActions.ts` came in at 56 lines.
  - No feature loss: provider-enabled gating, success/cancel return URLs, checkout-start audit logging, current-credit metadata logging, and customer-safe billing error copy all preserve the current workflow while reducing page-owned billing transport logic.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageBillingActions({ ... })` plus its `createSmsCreditsSession(...)`, `sms_credits_checkout_started`, and `safeMessagesError(...)` seams so the main messaging page keeps routing billing actions through the dedicated hook.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Messages` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:13 AM PT - No-deploy overview dashboard model extraction:
  - Resolved in this batch: moved the overview readiness, digest, visibility, and analytics derivation out of `src/pages/dashboard/Overview.tsx` and behind `src/pages/dashboard/buildOverviewDashboardModel.ts`.
  - Data-boundary hardening: `Overview.tsx` now routes publish-readiness modeling, launch-readiness scoring, invite analytics, invisible-intelligence filtering, calm-digest generation, and publish-state badge derivation through one helper instead of hand-owning that pure dashboard model logic inline.
  - File-size movement: `src/pages/dashboard/Overview.tsx` dropped from 1577 lines to 1500 lines in this continuation batch while `src/pages/dashboard/buildOverviewDashboardModel.ts` came in at 192 lines.
  - No feature loss: ready-check scoring, digest preview content, publish blocker detection, site visibility/archive descriptors, analytics funnel summaries, and next-step labeling all preserve the current owner workflow while reducing page-owned derived-state logic.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildOverviewDashboardModel({ ... })` plus its `buildWebsiteInviteAnalyticsReadiness(...)`, `buildPublishReadinessItems(...)`, and `buildCalmOwnerDigest(...)` seams so the main overview page keeps routing dashboard modeling through the dedicated helper.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Overview` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:18 AM PT - No-deploy overview snapshot-state extraction:
  - Resolved in this batch: moved the remaining overview snapshot mapping, demo stats assembly, site draft fallback shaping, and name-change workspace snapshot wiring out of `src/pages/dashboard/Overview.tsx` and behind `src/pages/dashboard/buildOverviewSnapshotState.ts`.
  - Data-boundary hardening: `Overview.tsx` now routes demo overview state, persisted intelligence-dismissal hydration, draft brief/refine-target fallback shaping, name-change workspace snapshot assembly, and final overview stats snapshot modeling through one helper instead of hand-owning that mixed snapshot/state mapping inline.
  - File-size movement: `src/pages/dashboard/Overview.tsx` dropped from 1500 lines to 1372 lines in this continuation batch while `src/pages/dashboard/buildOverviewSnapshotState.ts` came in at 325 lines.
  - No feature loss: demo overview counts, wedding-date fallback resolution, draft-brief fallback summaries, persisted intelligence dismissals, name-change lifecycle snapshot copy, and final owner overview stat composition all preserve the current owner workflow while reducing page-owned snapshot choreography.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildOverviewSiteDraftState(site)`, `buildNameChangeOverviewSnapshotState(workspace)`, and `buildOverviewStatsFromSnapshot({ ... })`, while `src/pages/dashboard/buildOverviewSnapshotState.ts` is pinned for `buildDemoOverviewSnapshotState()`, `buildOverviewSiteDraftState(site: { ... })`, `buildNameChangeOverviewSnapshotState(workspace: ...)`, and `buildOverviewStatsFromSnapshot({ ... })` so the main overview page keeps routing snapshot shaping through the dedicated helper.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Overview` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:34 AM PT - No-deploy overview live-content extraction:
  - Resolved in this batch: moved the remaining overview dashboard live render surface out of `src/pages/dashboard/Overview.tsx` and behind `src/pages/dashboard/OverviewDashboardLiveContent.tsx`.
  - Data-boundary hardening: `Overview.tsx` now routes the hero, setup progress, digest cards, archive/name-change panels, site status card, analytics cards, proof panels, and interactive suggestion rendering through one live-content component instead of hand-owning that full owner-facing dashboard body inline.
  - File-size movement: `src/pages/dashboard/Overview.tsx` dropped from 1372 lines to 319 lines in this continuation batch while `src/pages/dashboard/OverviewDashboardLiveContent.tsx` came in at 1168 lines.
  - No feature loss: overview hero actions, setup-progress recovery, calm digest preview, quiet suggestions, wedding brief refresh, archive keepsake panels, name-change assistant, site-status actions, analytics funnel review, proof-only cards, and interactive suggestion moderation all preserve the current owner workflow while reducing page-owned render weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `<OverviewDashboardLiveContent`, checks that `OverviewDashboardLiveContent.tsx` owns the calm hero and site card surface, and rejects regaining the old inline `A calmer place to plan {coupleLabel}.` slab in `Overview.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts` (30/30), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Overview` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:40 AM PT - No-deploy vault live-content extraction:
  - Resolved in this batch: moved the owner-facing vault summary shell and list wrapper out of `src/pages/dashboard/Vault.tsx` and behind `src/pages/dashboard/VaultDashboardLiveContent.tsx`.
  - Data-boundary hardening: `Vault.tsx` now routes the anniversary-vault hero, media backup status panel, no-date warning, archive-mode note ideas, empty state, add-another/maxed-out shell, and vault guidance footer through one live-content component instead of hand-owning that dashboard body inline.
  - File-size movement: `src/pages/dashboard/Vault.tsx` dropped from 1393 lines to 1262 lines in this continuation batch while `src/pages/dashboard/VaultDashboardLiveContent.tsx` came in at 196 lines.
  - No feature loss: Drive reconnect prompts, starter vault seeding, archive-mode coaching, empty vault onboarding, add-another vault affordance, max-vault guardrail copy, and the existing vault-card/reminder/delete flow all preserve the current owner workflow while reducing page-owned render weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `<VaultDashboardLiveContent`, checks that the new file owns the `DashboardPageHero`, starter-vault CTA, and `How Vaults work` shell, and rejects regaining the old inline starter-vault slab in `Vault.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts` (22/22), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Vault` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 02:44 AM PT - No-deploy guest photo live-content extraction:
  - Resolved in this batch: moved the owner-facing guest photo dashboard body out of `src/pages/dashboard/GuestPhotoSharing.tsx` and behind `src/pages/dashboard/guestPhotos/GuestPhotoDashboardLiveContent.tsx`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes the quick-start banner, hero, vault/memory cards, QR and recap controls, follow-up and guestbook surfaces, slideshow/review surfaces, and album controls/list composition through one live-content component instead of hand-owning that full dashboard body inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1750 lines to 1699 lines in this continuation batch while `src/pages/dashboard/guestPhotos/GuestPhotoDashboardLiveContent.tsx` came in at 123 lines.
  - No feature loss: guest hub QR sharing, recap publishing controls, follow-up export/send actions, guestbook moderation, couple album uploads, AI moment review, slideshow planning, and album management all preserve the current owner workflow while reducing page-owned render weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `<GuestPhotoDashboardLiveContent`, checks that `GuestPhotoDashboardLiveContent.tsx` owns the photo dashboard card surface, and rejects regaining the old inline hero/quick-start/album-list shell in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 03:01 AM PT - No-deploy itinerary guest-manager modal extraction:
  - Resolved in this batch: moved the itinerary event guest invitation manager out of `src/pages/dashboard/Itinerary.tsx` and behind `src/pages/dashboard/EventGuestManagerModal.tsx`.
  - Data-boundary hardening: `Itinerary.tsx` now routes the per-event guest picker, bulk invite/remove flow, search filter, and confirmation modal through one dedicated component instead of hand-owning that whole modal lifecycle inline.
  - File-size movement: `src/pages/dashboard/Itinerary.tsx` dropped from 928 lines to 699 lines in this continuation batch while `src/pages/dashboard/EventGuestManagerModal.tsx` came in at 235 lines.
  - No feature loss: event guest snapshot loading, invitation toggles, bulk invite-all/remove-all actions, guest search, and customer-safe error handling all preserve the current owner workflow while reducing page-owned modal logic.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `<EventGuestManagerModal`, checks that the new file owns the itinerary guest invitation service calls, and rejects regaining that event-guest transport block in `Itinerary.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Itinerary` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:44 AM PT - No-deploy guest dashboard derived-state extraction:
  - Resolved in this batch: moved the guest dashboard filter/report/reminder/rollup derived-state slab out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/buildGuestDashboardDerivedState.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes guest filtering, RSVP stats, event attendance report math, reminder buckets, thank-you buckets, queue math, recommendation math, rollups, and filtered-state projections through one helper instead of hand-owning that large derived-state block inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1043 lines to 910 lines in this continuation batch while `src/pages/dashboard/guests/buildGuestDashboardDerivedState.ts` came in at 219 lines.
  - No feature loss: guest filtering, RSVP status math, attendance rollups, reminder eligibility, thank-you eligibility, queue priority, missing-meal visibility, custom-answer rollups, and campaign readiness calculations all preserve the current owner workflow while reducing page-owned dashboard analytics weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `buildGuestDashboardDerivedState({ ... })`, check that `buildGuestDashboardDerivedState.ts` owns the filter/report/reminder derived-state seam, and reject regaining the old inline derived-state block in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:38 AM PT - No-deploy guest dashboard ops-actions extraction:
  - Resolved in this batch: moved the guest dashboard preset-switching, reminder-setting persistence, delete-all, and visible-selection lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardOpsActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes campaign preset application, reminder-setting persistence, delete-all guest confirmation flow, filtered selection, visible-selection trimming, and filter-reset controls through one dedicated hook instead of hand-owning that operations-control choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1086 lines to 1043 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardOpsActions.ts` came in at 159 lines.
  - No feature loss: campaign preset switching, delete-all safety confirmation, reminder-setting persistence, filtered guest selection, visible-selection trim, and guest-safe destructive-action toasts all preserve the current owner workflow while reducing page-owned ops control weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardOpsActions({ ... })`, check that `useGuestDashboardOpsActions.ts` owns the reminder/delete-all/selection seam, and reject regaining the old inline ops-action handlers in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:34 AM PT - No-deploy guest dashboard conflict-actions extraction:
  - Resolved in this batch: moved the guest dashboard RSVP conflict filter, metrics, and resolve lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardConflictActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes visible conflict filtering, 24h/72h conflict stats, single conflict resolution, and bulk visible conflict resolution through one dedicated hook instead of hand-owning that operations choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1150 lines to 1086 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardConflictActions.ts` came in at 120 lines.
  - No feature loss: RSVP conflict severity filtering, demo-mode resolution, live conflict resolution transport, history updates, bulk “mark done” flow, and guest-safe conflict toasts all preserve the current owner workflow while reducing page-owned conflict-management weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardConflictActions({ ... })`, check that `useGuestDashboardConflictActions.ts` owns the conflict stats/resolve seam, and reject regaining the old inline conflict handlers in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:29 AM PT - No-deploy guest dashboard RSVP-config actions extraction:
  - Resolved in this batch: moved the guest dashboard RSVP question-template, save, and autosave lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardRsvpConfigActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes RSVP template insertion, cleaned RSVP-config save, demo/live persistence, dirty-state tracking, and autosave timing through one dedicated hook instead of hand-owning that settings choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1228 lines to 1150 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardRsvpConfigActions.ts` came in at 156 lines.
  - No feature loss: RSVP question templates, meal-question cleanup, demo-mode RSVP config writes, live RSVP config persistence, autosave timing, and guest-safe settings toasts all preserve the current owner workflow while reducing page-owned RSVP settings weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardRsvpConfigActions({ ... })`, check that `useGuestDashboardRsvpConfigActions.ts` owns the RSVP template/save/autosave seam, and reject regaining the old inline RSVP config handlers in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 03:36 AM PT - No-deploy guest dashboard data-hook extraction:
  - Resolved in this batch: moved the guest dashboard bootstrap and refresh lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardData.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes site-settings hydration, guest snapshot loading, itinerary filter hydration, RSVP audit feed hydration, and demo-mode bootstrap through one dedicated hook instead of hand-owning that service choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 2262 lines to 2103 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardData.ts` came in at 258 lines.
  - No feature loss: guest dashboard role hydration, RSVP meal/question bootstrap, reminder preference restore, itinerary filter state, RSVP audit feed state, demo guest snapshot loading, and guest refresh behavior all preserve the current owner workflow while reducing page-owned data lifecycle weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardData({ ... })`, check that `useGuestDashboardData.ts` owns the guest dashboard site-settings/snapshot/itinerary/audit service calls, and reject regaining those direct load paths in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 03:44 AM PT - No-deploy guest dashboard detail-actions extraction:
  - Resolved in this batch: moved the guest dashboard household/detail/drawer mutation lane out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes household merge/split/reassign flows, itinerary drawer load state, event-invite toggle actions, assisted RSVP save flow, and check-in toggle recovery through one dedicated hook instead of hand-owning that guest-detail choreography inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 2103 lines to 1924 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts` came in at 289 lines.
  - No feature loss: assisted RSVP recording, itinerary drawer audit visibility, guest event invite toggles, household maintenance actions, check-in retry behavior, and related modal/drawer state all preserve the current owner workflow while reducing page-owned mutation weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardGuestDetailActions({ ... })`, check that `useGuestDashboardGuestDetailActions.ts` owns the guest itinerary drawer, invite-toggle, assisted-RSVP, refresh-session, and household service calls, and reject regaining those direct paths in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 03:52 AM PT - No-deploy guest dashboard CSV-import hook extraction:
  - Resolved in this batch: moved the guest dashboard CSV import parse/map/preview/import lifecycle out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardCsvImport.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes CSV parser state, mapper modal state, preview/review state, import summary state, demo/live import transport, and safer review reset behavior through one dedicated hook instead of hand-owning that full import lane inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1924 lines to 1685 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardCsvImport.ts` came in at 429 lines.
  - No feature loss: file parsing, column mapping, event-name review, duplicate-name warnings, household grouping guardrails, demo imports, live guest inserts, event invite inserts, RSVP import hydration, quick-start photos continuation, and import-summary feedback all preserve the current owner workflow while reducing page-owned import orchestration.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCsvImport({ ... })`, check that `useGuestDashboardCsvImport.ts` owns the guest import parser/service choreography, and reject regaining direct import parsing or inserted-guest transport in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:00 AM PT - No-deploy guest dashboard view-props extraction:
  - Resolved in this batch: moved the owner-facing guest dashboard ops/settings prop-bundle assembly out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/buildGuestDashboardViewProps.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes the engagement, household/list, insight, conflict, ops-summary, workspace, header, ops-view, and RSVP-settings view prop assembly through one helper instead of hand-owning that full render wiring block inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1685 lines to 1618 lines in this continuation batch while `src/pages/dashboard/guests/buildGuestDashboardViewProps.ts` came in at 248 lines.
  - No feature loss: guest ops controls, follow-up dry runs, bulk invite/reminder actions, conflict review, insight focus actions, household merge entrypoints, and RSVP settings routing all preserve the current owner workflow while reducing page-owned render composition weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `buildGuestDashboardViewProps({ ... })`, check that `buildGuestDashboardViewProps.ts` owns the guest dashboard prop assembly seam, and reject regaining the old inline `guestEngagementProps` / `guestDashboardOpsViewProps` / `guestRsvpConfigViewProps` slabs in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:05 AM PT - No-deploy guest dashboard clipboard-actions extraction:
  - Resolved in this batch: moved the guest dashboard copy/download follow-up artifact actions out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes RSVP follow-up summary copy, exception checklist copy, meal follow-up copy, missing-contact copy, filtered-email copy, checklist markdown copy, and campaign dry-run export through one dedicated hook instead of hand-owning those copy/download handlers inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 1618 lines to 1543 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts` came in at 145 lines.
  - No feature loss: operator copy, guest follow-up exports, clipboard fallback downloads, and customer-safe “nothing to copy” guardrails all preserve the current owner workflow while reducing page-owned ops utility weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardClipboardActions({ ... })`, check that `useGuestDashboardClipboardActions.ts` owns the guest dashboard copy/download seam, and reject regaining the old inline copy handlers in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:51 AM PT - No-deploy guest dashboard route-actions extraction:
  - Resolved in this batch: moved the remaining guest dashboard route-level callback and interaction wiring out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/buildGuestDashboardRouteActions.tsx`.
  - Data-boundary hardening: `Guests.tsx` now routes unresolved-guest selection, status-badge rendering, focus/filter pivots, add/delete-all modal opens, due-reminder toggle persistence, selection utilities, and view-mode toggles through one dedicated helper instead of hand-owning that callback switchboard inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 910 lines to 845 lines in this continuation batch while `src/pages/dashboard/guests/buildGuestDashboardRouteActions.tsx` came in at 168 lines.
  - No feature loss: guest ops focus jumps, auto-reminder pause/enable flow, unresolved guest selection, thank-you/check-in utility entrypoints, bulk send entrypoints, and household merge entry routing all preserve the current owner workflow while reducing page-owned route glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildGuestDashboardRouteActions({ ... })`, checks that `buildGuestDashboardRouteActions.tsx` owns the unresolved/status-badge/reminder-toggle route seam, and rejects regaining the old inline route handlers in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 04:54 AM PT - No-deploy guest dashboard overlay-actions extraction:
  - Resolved in this batch: moved the guest dashboard overlay/modal close-reset-submit callback wiring out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/buildGuestDashboardOverlayActions.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes add/edit modal close resets, assisted-RSVP close, itinerary drawer close cleanup, delete-all modal close, CSV review reset, and add/edit submit callback wiring through one dedicated helper instead of hand-owning those overlay callbacks inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 845 lines to 844 lines in this continuation batch while `src/pages/dashboard/guests/buildGuestDashboardOverlayActions.ts` came in at 25 lines.
  - No feature loss: add/edit guest modal resets, itinerary drawer cleanup, CSV review guardrails, assisted RSVP modal close behavior, and overlay submit handoff all preserve the current owner workflow while reducing page-owned overlay glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildGuestDashboardOverlayActions({ ... })`, checks that `buildGuestDashboardOverlayActions.ts` owns the overlay close/reset/submit seam, and rejects regaining the old inline overlay callbacks in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:01 AM PT - No-deploy guest dashboard UI-state extraction:
  - Resolved in this batch: moved the guest dashboard persisted UI/storage state lane out of `src/pages/dashboard/Guests.tsx` and behind `src/pages/dashboard/guests/useGuestDashboardUiState.ts`.
  - Data-boundary hardening: `Guests.tsx` now routes campaign preset/log state, follow-up task state, saved-segment state, filter/search state, modal/view toggles, selection state, reminder cadence state, and guest-form state through one dedicated hook instead of hand-owning that state-and-storage slab inline.
  - File-size movement: `src/pages/dashboard/Guests.tsx` dropped from 844 lines to 814 lines in this continuation batch while `src/pages/dashboard/guests/useGuestDashboardUiState.ts` came in at 171 lines.
  - No feature loss: stored campaign preset restore, campaign log persistence, saved follow-up segment/task restore, list/household/check-in/insight view toggles, guest-form resets, and reminder cadence state all preserve the current owner workflow while reducing page-owned UI persistence glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestDashboardUiState()`, checks that `useGuestDashboardUiState.ts` owns the guest dashboard campaign preset/log persistence seam, and rejects regaining the old inline storage-backed state slab in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Guests` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:07 AM PT - No-deploy seating dashboard data-hook extraction:
  - Resolved in this batch: moved the Seating dashboard bootstrap, event hydration, demo/live seating snapshot load, and demo seating persistence lane out of `src/pages/dashboard/Seating.tsx` and behind `src/pages/dashboard/seating/useSeatingDashboardData.ts`.
  - Data-boundary hardening: `Seating.tsx` now routes site/event selection, itinerary hydration, seating event load, tables/assignments/eligible guest load, counters load, invalid-assignment counting, versions load, and demo writeback through one dedicated hook instead of hand-owning the whole initial data lifecycle inline.
  - File-size movement: `src/pages/dashboard/Seating.tsx` dropped from 1609 lines to 1453 lines in this continuation batch while `src/pages/dashboard/seating/useSeatingDashboardData.ts` came in at 221 lines.
  - No feature loss: demo itinerary sync, reception/dinner/ceremony fallback event selection, counters refresh, versions hydration, and customer-safe seating load errors all preserve the current owner workflow while reducing page-owned data/bootstrap weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useSeatingDashboardData({ isDemoMode, toast })`, checks that `useSeatingDashboardData.ts` owns the seating dashboard bootstrap/load seam, and rejects regaining the old inline `loadInitial()` / `loadSeatingData()` path in `Seating.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Seating` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:10 AM PT - No-deploy seating dashboard derived-state extraction:
  - Resolved in this batch: moved the Seating dashboard counts, check-in candidate filtering, selected-event support state, and catering packet math out of `src/pages/dashboard/Seating.tsx` and behind `src/pages/dashboard/seating/buildSeatingDashboardDerivedState.ts`.
  - Data-boundary hardening: `Seating.tsx` now routes unassigned guests, arrived guest IDs, assigned guest IDs, arrived count, check-in candidates, catering packet, catering handoff review, meal headcount rows, packet tone, and selected event labeling through one dedicated helper instead of hand-owning that derived-state slab inline.
  - File-size movement: `src/pages/dashboard/Seating.tsx` dropped from 1453 lines to 1446 lines in this continuation batch while `src/pages/dashboard/seating/buildSeatingDashboardDerivedState.ts` came in at 59 lines.
  - No feature loss: check-in search/filter behavior, event-specific counters, catering export readiness, meal headcount review, and unassigned guest tracking all preserve the current owner workflow while reducing page-owned analytics math.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildSeatingDashboardDerivedState({ ... })`, checks that `buildSeatingDashboardDerivedState.ts` owns the Seating derived-state seam, and rejects regaining the old inline arrival and catering packet assembly in `Seating.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Seating` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:14 AM PT - No-deploy seating dashboard artifact-actions extraction:
  - Resolved in this batch: moved the Seating dashboard export and version artifact lane out of `src/pages/dashboard/Seating.tsx` and behind `src/pages/dashboard/seating/useSeatingDashboardArtifacts.ts`.
  - Data-boundary hardening: `Seating.tsx` now routes seating CSV, place cards, table summary CSV, catering CSV, PDF export, image export, print, version save, and version restore through one dedicated hook instead of hand-owning that full artifact action slab inline.
  - File-size movement: `src/pages/dashboard/Seating.tsx` dropped from 1446 lines to 1343 lines in this continuation batch while `src/pages/dashboard/seating/useSeatingDashboardArtifacts.ts` came in at 169 lines.
  - No feature loss: customer-safe popup failure handling, local/demo version persistence, live version persistence, restore confirmation flow, and all existing seating exports preserve the current owner workflow while reducing page-owned artifact action weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useSeatingDashboardArtifacts({ ... })`, checks that `useSeatingDashboardArtifacts.ts` owns the Seating export/version seam, and rejects regaining the old inline artifact handlers in `Seating.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Seating` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:20 AM PT - No-deploy seating dashboard actions extraction:
  - Resolved in this batch: moved the Seating dashboard mutation and interaction lane out of `src/pages/dashboard/Seating.tsx` and behind `src/pages/dashboard/seating/useSeatingDashboardActions.ts`.
  - Data-boundary hardening: `Seating.tsx` now routes seat clearing, seat assignment, guest unassignment, add/update/resize/rotate/delete table actions, table drag positioning, reset, auto-create tables, auto-seat, drift checks, and check-in toggles/bulk check-in through one dedicated hook instead of hand-owning that full interaction slab inline.
  - File-size movement: `src/pages/dashboard/Seating.tsx` dropped from 1343 lines to 987 lines in this continuation batch while `src/pages/dashboard/seating/useSeatingDashboardActions.ts` came in at 450 lines.
  - No feature loss: demo/live seat mapping, customer-safe table overflow warnings, auth-retry check-in recovery, drag-position save behavior, and all existing seating board mutations preserve the current owner workflow while reducing page-owned action weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useSeatingDashboardActions({ ... })`, checks that `useSeatingDashboardActions.ts` owns the Seating mutation seam, and rejects regaining the old inline reset/auto-seat/check-in/action handlers in `Seating.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Seating` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:25 AM PT - No-deploy coordinator dashboard data-hook extraction:
  - Resolved in this batch: moved the Coordinator dashboard bootstrap, storage hydration, and persistence lane out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/useCoordinatorDashboardData.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes guests, events, site role, coordinator permissions, timeline state, alert log, Q&A state, active work selections, command/session state, alert intent state, and persisted coordinator draft/session hydration through one dedicated hook instead of hand-owning that full bootstrap-and-storage slab inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1867 lines to 1688 lines in this continuation batch while `src/pages/dashboard/coordinator/useCoordinatorDashboardData.ts` came in at 303 lines.
  - No feature loss: demo bootstrap, live bootstrap via `loadCoordinatorBootstrapData(...)`, coordinator role restore, timeline/Q&A persistence, alert-form restore, and active guest/event continuity all preserve the current day-of workflow while reducing page-owned bootstrap weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useCoordinatorDashboardData({ ... })`, checks that `useCoordinatorDashboardData.ts` owns the coordinator dashboard bootstrap/storage seam, and rejects regaining the old inline `loadCoordinatorBootstrapData(...)` plus coordinator storage hydration path in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:53 AM PT - No-deploy coordinator dashboard derived-state extraction:
  - Resolved in this batch: moved the Coordinator dashboard derived-state, board math, and alert-log view shaping out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/buildCoordinatorDashboardDerivedState.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes stats, sorted guests, event audience options, alert audience math, Q&A board state, role capabilities, live/up-next event targeting, alert suggestions and summaries, alert stats, filtered alert log view items, check-in queue targeting, command deck state, stable prompt state, summary feedback presentation, escalation rollups, and navigation/timeline board derivation through one dedicated helper instead of hand-owning that full read-model slab inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1365 lines to 1028 lines in this continuation batch while `src/pages/dashboard/coordinator/buildCoordinatorDashboardDerivedState.ts` came in at 512 lines.
  - No feature loss: coordinator role gating, alert validation, day-of command prioritization, manual override labels, Q&A targeting, alert-log filtering, and board-level prompt state all preserve the current day-of workflow while reducing page-owned derivation weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildCoordinatorDashboardDerivedState({ ... })`, checks that `buildCoordinatorDashboardDerivedState.ts` owns the coordinator derived-state seam, and rejects regaining the old inline sorted-guest, alert-stats, and standing-prompt derivation blocks in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:27 AM PT - No-deploy registry refresh-policy actions extraction:
  - Resolved in this batch: moved the registry refresh-policy save, preset, wedding-date window fill, and monthly counter reset lane out of `src/pages/dashboard/Registry.tsx` and into `src/pages/dashboard/registry/useRegistryRefreshPolicyActions.ts`.
  - Data-boundary hardening: `Registry.tsx` now routes refresh-policy persistence, preset application, wedding-date refresh-window suggestion, and monthly budget counter reset through one dedicated hook instead of hand-owning that policy/action slab inline.
  - File-size movement: `src/pages/dashboard/Registry.tsx` dropped from 823 lines to 782 lines in this continuation batch while `src/pages/dashboard/registry/useRegistryRefreshPolicyActions.ts` came in at 130 lines.
  - No feature loss: refresh-cap validation, refresh-window parsing, refresh-policy audit logging, preset cap selection, wedding-date window autofill, and monthly counter reset all preserve the current registry workflow while reducing route-level policy glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useRegistryRefreshPolicyActions({ ... })`, checks that `useRegistryRefreshPolicyActions.ts` owns the registry refresh-policy seam, and rejects regaining the old inline save/preset/reset handlers in `Registry.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Registry` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:24 AM PT - No-deploy registry item-actions extraction:
  - Resolved in this batch: moved the registry item save, delete, and purchase-update lane out of `src/pages/dashboard/Registry.tsx` and into `src/pages/dashboard/registry/useRegistryItemActions.ts`.
  - Data-boundary hardening: `Registry.tsx` now routes item create/edit save flow, direct-image validation and fallback preview hydration, demo/live item persistence, item delete, and owner purchase-status updates through one dedicated hook instead of hand-owning that CRUD/action slab inline.
  - File-size movement: `src/pages/dashboard/Registry.tsx` dropped from 1021 lines to 823 lines in this continuation batch while `src/pages/dashboard/registry/useRegistryItemActions.ts` came in at 248 lines.
  - No feature loss: product vs cash-fund save behavior, image-link validation, quantity normalization, demo item creation/editing, live create/update/delete transport, and owner purchase increments all preserve the current registry workflow while reducing route-level action glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useRegistryItemActions({ ... })`, checks that `useRegistryItemActions.ts` owns the registry save/delete/purchase seam, and rejects regaining the old inline `handleSave`, `handleDelete`, and `handleMarkPurchased` handlers in `Registry.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Registry` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:18 AM PT - No-deploy registry maintenance-actions extraction:
  - Resolved in this batch: moved the registry metadata refresh, image issue cleanup, duplicate review copy, stale auto-refresh, and bulk URL import lane out of `src/pages/dashboard/Registry.tsx` and into `src/pages/dashboard/registry/useRegistryMaintenanceActions.ts`.
  - Data-boundary hardening: `Registry.tsx` now routes metadata reimport, image repair refresh, bad-import cleanup, bulk stale refresh with budget tracking, duplicate review export, and bulk-link import through one dedicated hook instead of hand-owning that maintenance/action slab inline.
  - File-size movement: `src/pages/dashboard/Registry.tsx` dropped from 1302 lines to 1021 lines in this continuation batch while `src/pages/dashboard/registry/useRegistryMaintenanceActions.ts` came in at 380 lines.
  - No feature loss: demo/live metadata refresh, price/image/store detail updates, stale refresh backoff handling, monthly budget increments, duplicate review export, and bulk import review messaging all preserve the current registry workflow while reducing route-level action glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useRegistryMaintenanceActions({ ... })`, checks that `useRegistryMaintenanceActions.ts` owns the registry maintenance seam, and rejects regaining the old inline `handleRefetchMetadata`, `handleRefreshImageIssues`, `handleRepairBadImports`, `handleAutoRefreshStale`, and `handleBulkImport` blocks in `Registry.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Registry` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:13 AM PT - No-deploy registry dashboard derived-state extraction:
  - Resolved in this batch: moved the registry dashboard filter, analytics, review counters, readiness, and thank-you derived-state slab out of `src/pages/dashboard/Registry.tsx` and into `src/pages/dashboard/registry/buildRegistryDashboardDerivedState.ts`.
  - Data-boundary hardening: `Registry.tsx` now routes duplicate grouping, filtered item selection, alert counters, budget telemetry, summary counts, recent/top item projections, registry insight generation, launch-readiness state, and thank-you preview shaping through one dedicated helper instead of hand-owning that math inline.
  - File-size movement: `src/pages/dashboard/Registry.tsx` dropped from 1358 lines to 1302 lines in this continuation batch while `src/pages/dashboard/registry/buildRegistryDashboardDerivedState.ts` came in at 146 lines.
  - No feature loss: search/filter behavior, review/image-issue gates, refresh budget messaging, recent activity ordering, top-progress cards, registry quick-check copy, guest-ready launch status, and thank-you preview counts all preserve the current registry workflow while reducing route-level derived-state weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildRegistryDashboardDerivedState({ ... })`, checks that `buildRegistryDashboardDerivedState.ts` owns the registry counts/filter/insight seam, and rejects regaining the old inline `const counts = { ... }`, `const filtered = normalizedItems.filter(...)`, and related derived-state slabs in `Registry.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Registry` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:10 AM PT - No-deploy registry dashboard data-hook extraction:
  - Resolved in this batch: moved the registry dashboard bootstrap, item hydration, and refresh-policy snapshot lane out of `src/pages/dashboard/Registry.tsx` and into `src/pages/dashboard/registry/useRegistryDashboardData.ts`.
  - Data-boundary hardening: `Registry.tsx` now routes demo/live registry bootstrap, item loading, wedding-site refresh-policy hydration, and budget-state initialization through one dedicated hook instead of hand-owning that lifecycle inline.
  - File-size movement: `src/pages/dashboard/Registry.tsx` dropped from 1443 lines to 1358 lines in this continuation batch while `src/pages/dashboard/registry/useRegistryDashboardData.ts` came in at 178 lines.
  - No feature loss: demo registry bootstrap, live site lookup, item normalization, refresh-cap preset derivation, refresh window hydration, and monthly budget-state restore all preserve the current registry workflow while reducing route-level bootstrap glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useRegistryDashboardData({ ... })`, checks that `useRegistryDashboardData.ts` owns the registry bootstrap seam, and rejects regaining the old inline `loadRegistryDashboardSite(...)` plus `loadItems(...)` path in `Registry.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Registry` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:24 AM PT - No-deploy guest photo AI-actions hook extraction:
  - Resolved in this batch: moved the guest photo AI organization and vision-review action lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoAiActions.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes AI ops plan generation, AI-assisted album moves, vision analysis, high-confidence vision moves, and correction persistence through one dedicated hook instead of hand-owning that async photo-intelligence lane inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1426 lines to 1248 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoAiActions.ts` came in at 283 lines.
  - No feature loss: AI ops plan persistence, vision suggestion accept/reject flows, batch vision analysis, high-confidence move application, and customer-safe organization/review error handling all preserve the current photo dashboard workflow while reducing route-level AI glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoAiActions({ ... })`, checks that the new hook owns the `persistGuestPhotoAiOpsPlan(...)`, `moveGuestPhotoUploadToBucket(...)`, `createGuestPhotoBucketCorrection(...)`, and `analyzeGuestPhotoUploads(...)` seam, and rejects regaining the old inline AI action handlers in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in the guest photo route without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:19 AM PT - No-deploy guest photo dashboard data-hook extraction:
  - Resolved in this batch: moved the guest photo dashboard bootstrap and hydration lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes demo/live dashboard bootstrap, auth-refresh retry, snapshot hydration, wedding-data photo bucket restore, AI ops plan restore, link cleanup, and album window draft hydration through one dedicated hook instead of hand-owning the full `load()` lifecycle inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1556 lines to 1426 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts` came in at 255 lines.
  - No feature loss: demo fallback, session refresh retry, dashboard snapshot hydration, album-link pruning, and customer-safe load failure handling all preserve the current photo dashboard workflow while reducing route-level bootstrap glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoDashboardData({ ... })`, checks that the new hook owns the `resolveGuestPhotoDashboardUserId()` / `loadGuestPhotoDashboardSnapshot(userId)` / `refreshGuestPhotoSession()` seam, and rejects regaining the old inline `loadDemoPhotoSpace` and `load(retried = false)` blocks in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in the guest photo route without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:15 AM PT - No-deploy guest photo bucket-workspace hook extraction:
  - Resolved in this batch: moved the couple-photo bucket workspace lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoBucketWorkspace.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes local bucket state, upload-input refs, upload/remove flows, wedding-data persistence, and placement-summary success/error handling through one dedicated hook instead of hand-owning that bucket workspace inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1623 lines to 1556 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoBucketWorkspace.ts` came in at 109 lines.
  - No feature loss: couple-photo bucket uploads, removal rollback, persisted wedding-data storage, and placement-summary feedback all preserve the current dashboard workflow while reducing route-level local media glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoBucketWorkspace({ ... })`, checks that the new hook owns the `persistGuestPhotoBuckets(...)` plus `mediaRepository.upload(...)` seam, and rejects regaining the old inline bucket workspace handlers in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in the guest photo route without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:11 AM PT - No-deploy planning name-change workspace hook extraction:
  - Resolved in this batch: moved the remaining name-change planner workspace state and mutation lane out of `src/pages/dashboard/Planning.tsx` and into `src/pages/dashboard/planning/usePlanningNameChangeWorkspace.ts`.
  - Data-boundary hardening: `Planning.tsx` now routes name-change draft/document/extracted-field state, reminder and step-execution mutations, save flow, and workspace hydration through one dedicated hook instead of hand-owning that workflow state machine inline.
  - File-size movement: `src/pages/dashboard/Planning.tsx` dropped from 468 lines to 352 lines in this continuation batch while `src/pages/dashboard/planning/usePlanningNameChangeWorkspace.ts` came in at 217 lines.
  - No feature loss: demo/live workspace hydration, plan recomputation, reminder sync, execution-note/activity updates, workflow-status updates, and customer-safe save failure handling all preserve the current planner workflow while reducing route-level state glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `usePlanningNameChangeWorkspace({ ... })`, checks that the new hook owns the draft/save seam, and rejects regaining the old inline `handleNameChangeDraft` and `handleSaveNameChange` slabs in `Planning.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in Planning without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:06 AM PT - No-deploy settings snapshot-hydration hook extraction:
  - Resolved in this batch: moved the remaining settings bootstrap and hydration lane out of `src/pages/dashboard/Settings.tsx` and into `src/pages/dashboard/settings/useSettingsDashboardSnapshotHydration.ts`.
  - Data-boundary hardening: `Settings.tsx` now routes snapshot bootstrap, role/site/email/name/template/slug/playlist hydration, collaborator + translation snapshot restore, and visibility / notifications / RSVP guarded hydration through one dedicated hook instead of hand-owning `loadSiteData()` plus its route effect inline.
  - File-size movement: `src/pages/dashboard/Settings.tsx` dropped from 662 lines to 646 lines in this continuation batch while `src/pages/dashboard/settings/useSettingsDashboardSnapshotHydration.ts` came in at 156 lines.
  - No feature loss: demo/live settings bootstrap, dirty-draft hydration guards, collaborator invite snapshot restore, translation status restore, and customer-safe load failure copy all preserve the current owner settings workflow while reducing route-level lifecycle glue.
  - Proof added/updated: `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin `useSettingsDashboardSnapshotHydration({ ... })`, check that the new hook owns the guarded `loadSettingsDashboardSnapshot({ ... })` seam, and reject regaining the old inline `loadSiteData` slab in `Settings.tsx`.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in Settings without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:00 AM PT - No-deploy coordinator Q&A panel extraction:
  - Resolved in this batch: moved the remaining inline guest-question/Q&A render slab out of `src/pages/dashboard/CoordinatorMode.tsx` and into `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` behind `CoordinatorQnaPanel`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now hands off the focused-question card, triage controls, input lane, filtered question list, draft-answer controls, and suggested-question affordances to one dedicated panel component instead of hand-rendering that whole Q&A surface inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1028 lines to 876 lines in this continuation batch while `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` absorbed the extracted Q&A surface and now owns that render seam.
  - No feature loss: focused-question save/reopen actions, suggested-question jumps, triage filters, keyboard add-question behavior, draft-answer edits, and filtered-question list actions all preserve the current coordinator workflow while reducing route-level render weight.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `<CoordinatorQnaPanel`, checks that `CoordinatorModePanels.tsx` owns the guest-question placeholder and empty-state copy, and rejects regaining the old inline Q&A markup in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 06:04 AM PT - No-deploy coordinator dashboard actions-hook extraction:
  - Resolved in this batch: moved the remaining coordinator transport handlers out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/useCoordinatorDashboardActions.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes guest check-in updates, coordinator day-of alert sends, and add-question persistence through one dedicated hook instead of hand-owning those three async action lanes inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 876 lines to 771 lines in this continuation batch while `src/pages/dashboard/coordinator/useCoordinatorDashboardActions.ts` came in at 179 lines.
  - No feature loss: demo/live check-in flow, next-guest focus advancement, alert validation and queue/schedule send flow, alert draft reset with preferred suggestion restore, and demo/live question creation all preserve the current coordinator workflow while reducing route-level action glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useCoordinatorDashboardActions({ ... })`, checks that `useCoordinatorDashboardActions.ts` owns the check-in / alert-send / add-question seam, and rejects regaining the old inline `toggleCheckIn`, `sendDayOfAlert`, and `addQnaItem` handlers in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:32 AM PT - No-deploy coordinator dashboard focus-actions extraction:
  - Resolved in this batch: moved the Coordinator dashboard focus, lane-jump, command-summary jump, stable-prompt jump, door-escalation, and board-return choreography out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/buildCoordinatorDashboardFocusActions.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes transient-state clearing, check-in/timeline/Q&A lane focus, ops snapshot lane jumps, door-review escalation to Q&A, neutral-focus revisit, stable prompt jump, command-summary jump, and board-target return through one dedicated helper instead of hand-owning that interaction slab inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1688 lines to 1558 lines in this continuation batch while `src/pages/dashboard/coordinator/buildCoordinatorDashboardFocusActions.ts` came in at 289 lines.
  - No feature loss: alert suggestion apply behavior, review-only check-in pivots, stable prompt routing, command jump feedback, neutral-focus fallback, and board-return targeting all preserve the current day-of workflow while reducing page-owned interaction glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildCoordinatorDashboardFocusActions({ ... })`, checks that `buildCoordinatorDashboardFocusActions.ts` owns the coordinator focus/jump seam, and rejects regaining the old inline `jumpToOpsSnapshotLane(...)` plus transient-state clearing block in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:38 AM PT - No-deploy coordinator dashboard board-actions extraction:
  - Resolved in this batch: moved the Coordinator dashboard board-return, primary-action, timeline-transition, correction, escalation, arrival-focus, and Q&A-save action lane out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/buildCoordinatorDashboardBoardActions.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes return-to-board state, primary-action dispatch, timeline state transitions with alert-draft sync, correction cue actions, escalation routing, arrival guest focus, and Q&A answer save/reopen behavior through one dedicated helper instead of hand-owning that board-action slab inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1558 lines to 1510 lines in this continuation batch while `src/pages/dashboard/coordinator/buildCoordinatorDashboardBoardActions.ts` came in at 235 lines.
  - No feature loss: timeline alert intent syncing, transition summary feedback, queue/escalation routing, undo-check-in correction, reopen-event targeting, and guest-question save/reopen behavior all preserve the current day-of workflow while reducing page-owned action glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildCoordinatorDashboardBoardActions({ ... })`, checks that `buildCoordinatorDashboardBoardActions.ts` owns the coordinator board-action seam, and rejects regaining the old inline `runPrimaryAction(...)`, `runTimelineAction(...)`, and `runEscalationIssue(...)` blocks in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 05:43 AM PT - No-deploy coordinator dashboard cue-lifecycle extraction:
  - Resolved in this batch: moved the Coordinator dashboard cue, override, command-jump, summary-feedback, and expiry lifecycle out of `src/pages/dashboard/CoordinatorMode.tsx` and behind `src/pages/dashboard/coordinator/useCoordinatorDashboardCueLifecycle.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes command-jump reset, target-change reset, manual-override reset/set, summary-feedback reset, override expiry, and summary-feedback expiry through one dedicated hook instead of hand-owning that cue-maintenance effect slab inline.
  - File-size movement: `src/pages/dashboard/CoordinatorMode.tsx` dropped from 1510 lines to 1365 lines in this continuation batch while `src/pages/dashboard/coordinator/useCoordinatorDashboardCueLifecycle.ts` came in at 183 lines.
  - No feature loss: realignment feedback, manual override cue timing, summary feedback expiry, command-jump cleanup, and alert override cleanup all preserve the current day-of workflow while reducing page-owned effect glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useCoordinatorDashboardCueLifecycle({ ... })`, checks that `useCoordinatorDashboardCueLifecycle.ts` owns the coordinator cue-lifecycle seam, and rejects regaining the old inline command-jump reset and timer blocks in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:29 AM PT - No-deploy guest photo moderation-actions hook extraction:
  - Resolved in this batch: moved the guest photo moderation and guestbook action lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoModerationActions.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes guestbook moderation, bulk hide/unhide, bulk flag/unflag, duplicate/review cleanup, bucket active-state bulk updates, and single-upload moderation through one dedicated hook instead of hand-owning that service lane inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1248 lines to 1106 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoModerationActions.ts` came in at 238 lines.
  - No feature loss: guestbook moderation, review-photo cleanup, duplicate cleanup, hidden-photo restore, filtered moderation, and album sharing-state bulk updates all preserve the current owner workflow while reducing route-level action glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoModerationActions({ ... })`, checks that `useGuestPhotoModerationActions.ts` owns the guestbook and moderation service seam, and rejects regaining the old inline moderation handlers in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:35 AM PT - No-deploy guest photo export-actions hook extraction:
  - Resolved in this batch: moved the guest photo copy, export, and share utility lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes clipboard copy fallback, slideshow/export payload generation, guest hub print-pack download, media manifest export, guestbook/prospect/curation export, memory/recap JSON export, share-message copy, link copy, and bulk link regeneration through one dedicated hook instead of hand-owning that utility lane inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1106 lines to 873 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts` came in at 393 lines.
  - No feature loss: guest hub print assets, slideshow-plan export, handoff-sheet fallback behavior, share-pack export, bucket CSV export, clipboard fallback messaging, and bulk upload-link refresh all preserve the current owner workflow while reducing route-level utility glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoExportActions({ ... })`, checks that `useGuestPhotoExportActions.ts` owns the manifest export, link regeneration, and clipboard fallback seam, and rejects regaining the old inline export/share handlers in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:41 AM PT - No-deploy guest photo derived-state helper extraction:
  - Resolved in this batch: moved the guest photo dashboard counts, memory collections, guest-hub shaping, readiness, filter, and suggestion math out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/buildGuestPhotoDashboardDerivedState.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes the owner-facing photo derived-state slab through one dedicated helper instead of hand-owning the inline `buildPhotoDashboardCounts(...)`, `buildPhotoMemoryCollections(...)`, guest hub QR/action shaping, readiness warnings, filtered album sorting, missing itinerary detection, and moment-bucket suggestion math.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 873 lines to 806 lines in this continuation batch while `src/pages/dashboard/guestPhotos/buildGuestPhotoDashboardDerivedState.ts` came in at 194 lines.
  - No feature loss: guest hub QR assets, recap readiness warnings, memory-flow readiness, album filtering, recent-upload grouping, moment suggestions, and dashboard KPI rollups all preserve the current owner workflow while reducing route-level derived-state glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildGuestPhotoDashboardDerivedState({ ... })`, checks that `buildGuestPhotoDashboardDerivedState.ts` owns the dashboard count/memory/guest-hub seam, and rejects regaining the old inline derived-state block in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:44 AM PT - No-deploy guest photo hub-actions hook extraction:
  - Resolved in this batch: moved the guest hub settings save flow and follow-up queueing lane out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoHubActions.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes guest hub settings persistence and recap/future-event follow-up queue prep through one dedicated hook instead of hand-owning those owner-side transport handlers inline.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 806 lines to 783 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoHubActions.ts` came in at 85 lines.
  - No feature loss: guest hub settings save, action-audit logging, queue status UI, success/error handling, and snapshot refresh after follow-up generation all preserve the current owner workflow while reducing route-level transport glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoHubActions({ ... })`, checks that `useGuestPhotoHubActions.ts` owns the guest hub settings and follow-up queue seam, and rejects regaining the old inline save/queue handlers in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:50 AM PT - No-deploy guest photo media-state helper extraction:
  - Resolved in this batch: moved the guest photo dashboard bucket-tree, counts, tag-rollup, and slideshow-frame shaping slab out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/buildGuestPhotoDashboardMediaState.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes the owner-facing media-state view model through one dedicated helper instead of hand-owning inline bucket hierarchy math, hidden/flagged rollups, AI tag counts, and slideshow frame derivation.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 783 lines to 675 lines in this continuation batch while `src/pages/dashboard/guestPhotos/buildGuestPhotoDashboardMediaState.ts` came in at 172 lines.
  - No feature loss: nested album counts, AI tag filtering, slideshow-ready album detection, slideshow ordering modes, and frame caption shaping all preserve the current owner workflow while reducing route-level derived-state glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `buildGuestPhotoDashboardMediaState({ ... })`, checks that `buildGuestPhotoDashboardMediaState.ts` owns the bucket-tree/count/slideshow seam, and rejects regaining the old inline media-state block in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 08:58 AM PT - No-deploy guest photo UI-state and presentation extraction:
  - Resolved in this batch: moved the guest photo dashboard local state slab out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts`, and moved the remaining presentation helpers into `src/pages/dashboard/guestPhotos/guestPhotoDashboardPresentation.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` now routes search-seeded dashboard state through one dedicated hook and no longer hand-owns the inline bucket-link initializer, slideshow theme default, bucket tone helper, QR helper, or URL-opening helper cluster.
  - File-size movement: `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 675 lines to 631 lines in this continuation batch while `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts` came in at 132 lines, `src/pages/dashboard/guestPhotos/guestPhotoDashboardPresentation.ts` came in at 48 lines, and `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts` tightened its setter seam around the shared dashboard UI state.
  - No feature loss: search-parameter hydration, album filters, slideshow defaults, bucket-link persistence, guest hub navigation, and QR/share affordances all preserve the current owner workflow while reducing route-level state and helper clutter.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoDashboardUiState({ search })`, checks that `useGuestPhotoDashboardUiState.ts` owns the dashboard local-state seam, checks that `guestPhotoDashboardPresentation.ts` owns the bucket tone / QR / public-link helper seam, and rejects regaining the old inline `useState(...)` slab and helper block in `GuestPhotoSharing.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `GuestPhotoSharing` without changing guest-facing or owner-facing behavior. No deploy was run.
- 2026-05-08 09:38 AM PT - No-deploy coordinator UI-state extraction:
  - Resolved in this batch: moved the remaining coordinator jump/override/summary local state lane out of `src/pages/dashboard/CoordinatorMode.tsx` and into `src/pages/dashboard/coordinator/useCoordinatorDashboardUiState.ts`.
  - Data-boundary hardening: `CoordinatorMode.tsx` now routes its owner-facing local cue state through a dedicated hook and no longer hand-owns the inline `useState(...)` cluster for neutral focus, command jumps, override badges, and summary feedback.
  - Lifecycle ownership: `useCoordinatorDashboardUiState.ts` now also owns the coordinator reset/sync effects for all-clear, cleared escalation, and cleared correction states through `useCoordinatorDashboardUiStateSync(...)`, so the route no longer carries those inline `useEffect(...)` resets either.
  - File-size movement: this batch prioritized route ownership more than raw shrinkage. `src/pages/dashboard/CoordinatorMode.tsx` moved from 736 lines to 738 lines while `src/pages/dashboard/coordinator/useCoordinatorDashboardUiState.ts` came in at 88 lines.
  - No feature loss: command jump labels, neutral focus recovery, alert override badges, summary feedback cues, and coordinator transient reset behavior all preserve the current day-of workflow while reducing route-level local state ownership.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useCoordinatorDashboardUiState()` and `useCoordinatorDashboardUiStateSync({ ... })`, checks that `useCoordinatorDashboardUiState.ts` owns the coordinator local-state and reset-effect seam, and rejects regaining the old inline `useState(...)` cluster and command-source reset effects in `CoordinatorMode.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `CoordinatorMode` without changing planner-facing or coordinator-facing behavior. No deploy was run.
- 2026-05-08 09:46 AM PT - No-deploy settings route-content extraction:
  - Resolved in this batch: moved the owner-facing settings page composition slab out of `src/pages/dashboard/Settings.tsx` and into `src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx`.
  - Data-boundary hardening: `Settings.tsx` now stays focused on auth, dashboard hooks, support hooks, action hooks, and the settings view model instead of hand-rendering the account, team, site, RSVP, notifications, and billing tab surfaces inline.
  - Route-content ownership: `SettingsDashboardRouteContent.tsx` now owns the `SettingsDashboardShell` wrapper plus the `SettingsTabContent` handoff into `SettingsAccountPanel`, `SettingsTeamAccessPanel`, `SettingsSiteTabContent`, `SettingsRsvpTabContent`, `SettingsNotificationsPanel`, and `SettingsBillingPanel`, including the local dirty-marking callbacks that belong with that render lane.
  - File-size movement: `src/pages/dashboard/Settings.tsx` dropped from 661 lines to 516 lines in this continuation batch, while `src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx` came in at 431 lines.
  - No feature loss: planner invite setup, site privacy and translation controls, identity export actions, RSVP builder interactions, notification preferences, account/password flows, and billing subscribe entry all preserve the current owner workflow while reducing route-level render glue.
  - Proof added/updated: `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `<SettingsDashboardRouteContent`, check that `SettingsDashboardRouteContent.tsx` owns the tab-shell composition seam, and reject regaining the old inline `SettingsTabContent` / `SettingsSiteTabContent` / `SettingsRsvpTabContent` render slab in `Settings.tsx`.
  - Validation passed: `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Settings` without changing couple-facing or planner-facing behavior. No deploy was run.
- 2026-05-08 09:50 AM PT - No-deploy overview dashboard data-hook extraction:
  - Resolved in this batch: moved the overview dashboard bootstrap, interactive suggestion hydration, setup-draft progress refresh, and local overview snapshot state out of `src/pages/dashboard/Overview.tsx` and into `src/pages/dashboard/useOverviewDashboardData.ts`.
  - Data-boundary hardening: `Overview.tsx` now stays focused on intelligence actions, dashboard modeling, checklist shaping, and route-level navigation instead of hand-owning the inline `loadStats()` bootstrap, interactive suggestion fetch effect, setup-progress focus listener, and large local state slab.
  - Hook ownership: `useOverviewDashboardData.ts` now owns demo/live overview snapshot loading, persisted intelligence dismissal merge from stored site metadata, draft brief hydration, name-change overview snapshot restore, recent builder revision loading, interactive suggestion hydration, and the setup-draft focus refresh lane.
  - File-size movement: `src/pages/dashboard/Overview.tsx` dropped from 319 lines to 195 lines in this continuation batch, while `src/pages/dashboard/useOverviewDashboardData.ts` came in at 205 lines.
  - No feature loss: calm digest inputs, publish-readiness signals, setup checklist state, interactive suggestion hydration, name-change overview badges, and recent activity cards all preserve the current owner workflow while reducing route-level bootstrap glue.
  - Proof added/updated: `src/lib/dashboardDataBoundary.test.ts` now pins `useOverviewDashboardData({ ... })`, checks that `useOverviewDashboardData.ts` owns the overview snapshot and interactive hydration seam, and rejects regaining the old inline `loadOverviewDashboardSnapshot(...)`, `loadOverviewInteractiveData(...)`, and overview state slab in `Overview.tsx`.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `npm run proof:v1:board:md`, and `git diff --check`.
  - Launch status: unchanged. This continues local dashboard ownership cleanup in `Overview` without changing couple-facing or planner-facing behavior. No deploy was run.
## 2026-05-08 10:21 AM PT No-Deploy Settings Route-Content Props Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Settings.tsx` now routes the owner-facing `SettingsDashboardRouteContent` prop assembly through `src/pages/dashboard/settings/buildSettingsDashboardRouteContentProps.ts`.
  - That helper now owns the route-content prop handoff seam for account, team access, site/privacy, RSVP, notifications, billing, planner invite, translation, and identity-export actions while the page keeps auth, snapshot hydration, UI state, support hooks, route support, and action hooks.
  - `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `buildSettingsDashboardRouteContentProps({ ... })`, check that `buildSettingsDashboardRouteContentProps.ts` owns the route-content prop seam, and reject regaining the old inline prop slab in `Settings.tsx`.
  - This batch prioritized route ownership more than raw shrinkage. `src/pages/dashboard/Settings.tsx` moved from 513 lines to 516 lines while `src/pages/dashboard/settings/buildSettingsDashboardRouteContentProps.ts` came in at 8 lines.
- Proof passed:
  - `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS, 18/18.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
# 2026-05-11 09:00 AM PT - Secure Launch Closeout Bundle Added

- Added `scripts/v1-proof-launch-closeout.mjs` and package script `npm run proof:v1:launch-closeout` to run the final secure service-role proof, secure email proof, board refresh, and `git diff --check` as one closeout bundle.
- Updated `scripts/v1-proof-service-role-authorization.mjs` so it now reports the missing `SUPABASE_SERVICE_ROLE_KEY` blocker explicitly, matching the queue/email proof lane.
- Updated `docs/v1-final-gated-unblock-runbook.md`, `BACKLOG.md`, `docs/PRODUCTION_HARDENING_REPORT.md`, and `docs/v1-smoke-proof-log.md` so the last-mile launch steps point to the exact secure closeout command instead of an implicit checklist.
- Verified locally that `npm run proof:v1:launch-closeout` exits blocked only on the expected `missing_service_role_key` blockers while still keeping the board and diff checks green.
- Added `docs/v1-runtime-operator-notes-checklist.md` plus `npm run proof:v1:runtime-note-checklist` so the remaining human runtime-note passes are centralized and testable instead of scattered across proof script output.

# 2026-05-11 06:46 PM PT - Guest Core Write RPC Batch (Local Only)

- Added `supabase/migrations/20260511220000_guest_core_write_rpcs.sql`.
- Moved guest core create/update/delete and bulk patch paths off raw client guest-table writes in `src/pages/dashboard/guests/guestService.ts`.
- Added focused proof for the new guest-core path:
  - `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/seating/seatingService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
  - `npm run proof:v1:board:md`
  - `git diff --check`
- Launch status did not change. This is local-only hardening and no deploy was run.

# 2026-05-11 07:12 PM PT - ProtectedRoute Role-Timing Hardening (Local Only)

- Fixed a collaborator payment-gate timing race in `src/components/auth/ProtectedRoute.tsx`.
- Planner/coordinator/viewer users now wait for active-site role resolution before any payment redirect path is chosen.
- Added focused proof in `src/components/auth/ProtectedRoute.test.tsx`.
- Validation passed:
  - `npm test -- --run src/components/auth/ProtectedRoute.test.tsx`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-11 07:33 PM PDT - Registry Owner Write RPC Batch (Local Only)

- Added migration `20260511234500_registry_write_rpcs.sql`.
- Moved registry owner-side item CRUD, reorder, and refresh-policy writes behind RPCs in the working tree.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/registry/registryService.test.ts`
  - `npm run typecheck -- --pretty false`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch changes runtime truth

## 2026-05-11 07:40 PM PDT - Message And Coordinator Write RPC Batch (Local Only)

- Added migration `20260512001000_message_coordinator_write_rpcs.sql`.
- Moved dashboard message create/update behind `dashboard_message_write`.
- Moved coordinator alert-message, guest check-in, and Q&A writes behind `coordinator_alert_message_write`, `coordinator_guest_checkin_write`, and `coordinator_qna_write`.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch changes runtime truth

## 2026-05-11 07:49 PM PDT - Settings And Overview Write RPC Batch (Local Only)

- Added migration `20260512012000_settings_overview_write_rpcs.sql`.
- Moved owner settings site patch writes behind `wedding_site_settings_patch`.
- Moved collaborator invite create/revoke behind `settings_collaborator_invite_write` and `settings_collaborator_invite_revoke`.
- Moved overview wedding-data/site-json patch writes and interactive suggestion hide behind RPCs in the working tree.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/overviewService.test.ts src/pages/dashboard/settings/settingsSiteData.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch changes runtime truth

## 2026-05-11 07:27 PM PDT - Itinerary Invitation RPC Reuse (Local Only)

- Reused the guest invitation RPCs in `src/pages/dashboard/itineraryService.ts`.
- Moved itinerary dashboard invite/uninvite flows off raw client `event_invitations` upsert/delete paths in the working tree.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts`
  - `npm run typecheck -- --pretty false`
- Result:
  - no live-state change yet
  - the already-pending RPC deploy/proof sweep still gates runtime truth

## 2026-05-11 07:21 PM PDT - Guest Invitation / Import / RSVP RPC Batch (Local Only)

- Added migration `20260511233000_guest_invitation_rsvp_rpcs.sql`.
- Moved the remaining guest dashboard invitation/import/assisted-RSVP direct write paths behind RPCs in the working tree:
  - `event_invitations` insert/delete
  - imported guest inserts
  - imported RSVP replace/delete flows
  - assisted RSVP guest/rsvp persistence
  - guest dependency cleanup RSVP/event-invitation deletes
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/guests/guestService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
  - `npm run proof:v1:board:md`
  - `git diff --check`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live collaborator/client-RLS proof are still required before this batch changes runtime truth
