# Production Hardening Report

_Created:_ 2026-05-04 9:20 PM PT
_Branch:_ `codex/v1-finish-hard-gates`
_Scope:_ 10/10 production-hardening execution. No deploy unless Eric explicitly requests it.

## Current Verdict

Final Production Readiness Score: 8/10

The approved production deploy and current non-SMS postdeploy proof are green, and additional local hardening continues. The app is still not 10/10 production-ready until remaining P1/P2 security and secure service-role queue/storage integrity proof are complete. The active standard is real private wedding and guest data must be safe by design.

## No Feature Loss Checklist

- Public site renders public/password/invite/hidden states: PARTIAL, local static gate proof and `smoke:site` pass; live gate/subresource proof still required after deploy/function deploy.
- RSVP lookup, invite-link RSVP, household RSVP, event RSVP, and submit still work: BLOCKED live, local tests pass but `smoke:rsvp` returns 503 from the deployed function for every case.
- Registry, itinerary, guest contact update, vault upload, photo upload, builder publish, messaging, and dashboard reads still work: PARTIAL, focused local tests plus registry/site/csv/check-in/messages smoke lanes pass; live RSVP remains blocked.
- Existing smoke lanes for registry, RSVP, site, CSV mapper, check-in, messages: PARTIAL, all listed lanes pass except live `smoke:rsvp`; aggregate `test:smoke` fails because it stops at RSVP.

## Batch Log

### 2026-05-07 3:41 PM PT - No-Deploy Auth Session Straggler Extraction

What changed:
- `src/pages/loginService.ts` now owns `getLoginSession()`, and `src/pages/Login.tsx` now uses that helper for OAuth prime-session lookup instead of directly calling `supabase.auth.getSession()` inline.
- `src/pages/acceptCollaboratorInviteService.ts` now owns `hasCollaboratorInviteSession()`, and `src/pages/AcceptCollaboratorInvite.tsx` now uses that helper for invite-claim session presence tracing instead of directly calling `supabase.auth.getSession()` inline.
- `src/pages/dashboard/guests/guestService.ts` now owns `refreshGuestDashboardSession()`, and `src/pages/dashboard/Guests.tsx` now uses that helper for the guest check-in retry path instead of directly calling `supabase.auth.refreshSession()` inline.
- Expanded `src/pages/loginService.test.ts`, `src/pages/acceptCollaboratorInviteService.test.ts`, and `src/pages/dashboard/guests/guestService.test.ts` so those page-to-service auth/session boundaries are pinned.

Commands run:
- `npm test -- --run src/pages/loginService.test.ts src/pages/Login.test.tsx src/pages/acceptCollaboratorInviteService.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 4 files and 23 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This clears another small cluster of page-owned auth/session responsibilities without changing invite acceptance, login redirect, or guest check-in behavior. No deploy was run.

### 2026-05-07 3:36 PM PT - No-Deploy Guest Photo Auth Service Extraction

What changed:
- `src/pages/dashboard/guestPhotoSharingService.ts` now owns the repeated guest-photo auth/session helpers:
  - `refreshGuestPhotoSession()`
  - `getGuestPhotoCurrentUserId()`
  - `resolveGuestPhotoDashboardUserId()`
- `src/pages/dashboard/GuestPhotoSharing.tsx` now uses those helpers instead of directly calling `supabase.auth.getSession()`, `supabase.auth.getUser()`, and `supabase.auth.refreshSession()` inline.
- This moves the guest photo dashboard’s auth retry and owner actor-id lookup behind the service seam without changing album, upload, guestbook, prospect, or hub-setting behavior.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the page-to-service boundary is now pinned for this auth/session cluster.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 4 files and 32 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another owner-dashboard page-owned Supabase auth cluster and makes `GuestPhotoSharing.tsx` more UI-focused without changing product behavior. No deploy was run.

### 2026-05-07 1:18 PM PT - No-Deploy Registry Public Contract Repair

What changed:
- Repaired `supabase/functions/public-registry-items/index.ts` so the public registry Edge Function now selects the current `RegistryItem` field shape instead of a stale legacy payload.
- The function now returns the fields the guest registry UI actually consumes, including `item_type`, `item_url`, `canonical_url`, `price_amount`, `notes`, `purchaser_name`, fund fields, and `updated_at`.
- Expanded `src/lib/launchEdgeFunctions.test.ts` so the public registry function is now pinned against regression back to the legacy `registry_url` / `price` payload shape.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RegistrySection.test.tsx src/pages/dashboard/registry/registryService.test.ts`: PASS, 3 files and 55 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts`: still FAILS live on the current deployed target because no deploy was run, so `dayof.love` cannot yet pick up the repaired local function contract.

Status:
- IMPROVED. The local public registry contract is now correct and guarded, but live registry write/read proof remains deploy-gated because the production function has not been updated. No deploy was run.

### 2026-05-07 1:23 PM PT - No-Deploy Service Worker Cache Tightening

What changed:
- Tightened `public/sw.js` further so it no longer precaches `/` and no longer caches navigation/document requests at runtime.
- Added response-level cacheability checks before writing to cache: static responses with `private`, `no-store`, `no-cache`, `text/html`, or `application/json` are now excluded even if the request path itself looked static.
- Expanded `src/lib/serviceWorkerSafety.test.ts` so the stricter request and response cache rules are pinned in regression coverage.

Commands run:
- `npm test -- --run src/lib/serviceWorkerSafety.test.ts src/lib/aiProviderKeySecurity.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 3 files and 37 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. Local service-worker cache safety is tighter than before: approved same-origin static assets still cache, while cached HTML shell, document navigations, JSON, and private/no-store responses stay out of the cache path. Live browser cache proof remains postdeploy/QA-gated. No deploy was run.

### 2026-05-07 1:29 PM PT - No-Deploy Page-Level Supabase Boundary Cleanup

What changed:
- Moved collaborator invite claiming in `AcceptCollaboratorInvite.tsx` behind `claimCollaboratorInviteByToken(...)` in `src/pages/acceptCollaboratorInviteService.ts`.
- Moved guest invite-token RPC generation in `Guests.tsx` behind `generateSecureGuestInviteToken()` in `src/pages/dashboard/guests/guestService.ts`, preserving the existing crypto fallback there instead of in the page component.
- Added focused regression coverage so those two TSX pages no longer own direct Supabase mutation/RPC calls.

Commands run:
- `npm test -- --run src/pages/acceptCollaboratorInviteService.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 2 files and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This advances the direct-page-access backlog lane by shrinking the remaining TSX-owned Supabase surface. No deploy was run.

### 2026-05-07 1:12 PM PT - No-Deploy Local AI Env Exposure Cleanup

What changed:
- Removed the remaining browser-prefixed local AI env entries from `.vercel/.env.production.local`, so the ignored local Vercel env file no longer carries `VITE_OPENAI_*` values.
- Expanded `src/lib/aiProviderKeySecurity.test.ts` so local env files (`.env*` and `.vercel/.env.production.local`) are now audited for browser-readable AI provider env names, not just source files.
- Expanded `scripts/v1-proof-ai-product-readiness.mjs` with the same local-env check and corrected its copy-guard assertion so the proof now reflects the current AI wording guards accurately.
- Re-ran the focused AI security/readiness lane and confirmed the local browser-exposure portion is green again.

Commands run:
- `npm test -- --run src/lib/aiProviderKeySecurity.test.ts src/lib/aiExposureProofScript.test.ts`: PASS, 2 files and 13 tests.
- `node scripts/v1-proof-ai-product-readiness.mjs`: PASS, 25/25 checks.
- `npm run typecheck -- --pretty false`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This closes the remaining local browser-readable AI env leak path and keeps it pinned in proof. Remaining AI launch gates are still secure server-side provider proof and the already-separate external key rotation task. No deploy was run.

### 2026-05-07 1:00 PM PT - No-Deploy Guest Lookup Scope Runtime Closure

What changed:
- Added `scripts/v1-proof-guest-lookup-scope.mjs` as a live runtime proof for the hardened guest-contact lookup contract.
- The new proof signs in with the standard owner proof account, creates disposable QA guests on the proof site, then verifies on the live `guest-contact-lookup` function that last-name-only, mismatched full-name, and reversed-name searches return no matches while exact full-name lookup returns exactly one scoped `contact_session` and household size without leaking raw guest/site ids.
- Added `src/lib/guestLookupScopeProofScript.test.ts` so the live proof keeps the partial-name, mismatched-name, reversed-name, and scoped exact-match assertions pinned locally.

Commands run:
- `npm test -- --run src/lib/guestLookupScopeProofScript.test.ts src/pages/GuestContactUpdate.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 3 files and 32 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run proof:v1:guest-lookup-scope`: PASS, 4/4 on the live proof site with partial/mismatched/reversed lookups empty and exact full-name lookup returning one scoped session.

Status:
- IMPROVED. The remaining RSVP/guest lookup scoping claim is now backed by live abuse proof instead of only local reasoning, so this launch item can be treated as closed. No deploy was run.

### 2026-05-07 12:56 PM PT - No-Deploy Registry SSRF Runtime Closure

What changed:
- Updated `scripts/v1-proof-registry-preview-ssrf.mjs` so the live SSRF proof can authenticate with the standard owner proof credentials (`V1_OWNER_EMAIL` / `V1_OWNER_PASSWORD`) when a dedicated registry-preview bearer token is not present.
- Kept the hostile-case matrix pinned in `src/lib/registryPreviewProofScript.test.ts`, and added assertions for the owner-password sign-in fallback so this proof does not drift back to custom-token-only mode.
- Re-ran the live registry preview SSRF matrix and confirmed it is green end to end against the current `registry-preview` Edge Function.

Commands run:
- `npm test -- --run src/lib/registryPreviewProofScript.test.ts src/lib/registryPreviewUrlNormalizer.test.ts`: PASS, 2 files and 39 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run proof:v1:registry-preview-ssrf`: PASS, `authMode: "owner_password_signin"`, 26/26 hostile cases blocked before fetch with safe copy.

Status:
- IMPROVED. The live registry preview SSRF lane is no longer blocked on custom auth token plumbing and is now green on the current runtime. No deploy was run.

### 2026-05-07 12:52 PM PT - No-Deploy Live AI Clearance Recheck

What changed:
- Re-ran live AI clearance with real network access after the sandbox-only attempt failed on Supabase DNS, so the AI lane is back on actual runtime truth instead of local-network noise.
- Confirmed `proof:v1:ai-clearance` is green in full live mode again: local rollout, static exposure, deployed frontend rollout, and live column exposure all passed with `launchCleared: true` and `state: migration_applied_and_readback_green`.
- Rechecked the remaining strict P0 proof lane immediately after that with `proof:v1:data-integrity`; it is still limited to `anon_limited` mode in this environment because `SUPABASE_SERVICE_ROLE_KEY` is not available locally, so the queue/storage integrity blocker remains real and narrowly scoped.

Commands run:
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`: PASS, 4/4 with `launchCleared: true`, `migrationAlreadyApplied: true`, and `state: migration_applied_and_readback_green`.
- `npm run proof:v1:data-integrity`: PASS in `anon_limited` mode; no hard failures, but still explicitly requires `SUPABASE_SERVICE_ROLE_KEY` for full cross-table/storage proof.

Status:
- IMPROVED. The live AI clearance lane is green again on the current production target, and the remaining strict P0 truth is cleaner: secure service-role queue/storage proof is still the real blocker in this environment. No deploy was run.

### 2026-05-07 12:47 PM PT - No-Deploy AI Rollout Proof Truth Tightening

What changed:
- Updated `scripts/v1-proof-ai-rollout.mjs` so the browser-source rollout proof now checks the real current guest-photo browser path in `src/pages/dashboard/GuestPhotoSharing.tsx` instead of treating the older `guestPhotoSharingService.ts` helper as the required product-read path.
- Kept `guestPhotoSharingService.ts` in the audit as a browser/client source, but no longer required it to own the safe AI/photo product reads now that those reads live elsewhere.
- Re-ran `proof:v1:ai-clearance` and confirmed the local AI clearance lane is back to the expected local-only non-launch-clearing state: local frontend rollout green, static column exposure green, live/deployed clearance still gated on `V1_AI_CLEARANCE_LIVE`, production frontend state, and server-side secrets.

Commands run:
- `npm run proof:v1:ai-clearance`: PASS for local checks, exits nonzero only because live clearance was intentionally not enabled.
- `npm test -- --run src/lib/aiExposureProofScript.test.ts`: PASS, 1 file and 4 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes a stale local AI rollout blocker and sharpens the remaining AI lane to the real live/env gates (`OPENAI_API_KEY`, `V1_AI_CLEARANCE_LIVE`, approved deploy/migration order), but it does not clear launch on its own. No deploy was run.

### 2026-05-07 12:44 PM PT - No-Deploy Prereq Truth Narrowing

What changed:
- Re-ran `proof:v1:prereqs` with live network access after the sandbox-only run falsely reported blanket `fetch failed` results for every live table and function.
- Confirmed the prereq lane is actually green for current runtime readiness: required migrations exist, required local functions and proof scripts are present, required function source guards are intact, live REST tables are reachable or correctly protected, and required Edge Functions are deployed/reachable.
- The remaining prereq gaps are now explicitly narrowed to missing server-side `OPENAI_API_KEY` for AI proof plus the already-deferred Telnyx/SMS-credit provider secrets. Direct private bucket inspection remains intentionally skipped without `SUPABASE_SERVICE_ROLE_KEY`.

Commands run:
- `npm run proof:v1:prereqs`: initial sandbox run falsely red with blanket live `fetch failed` results.
- `npm run proof:v1:prereqs`: PASS after network-enabled rerun.

Status:
- PARTIAL. This removes a false-red prereq result and sharpens the remaining environment truth, but the strict P0 secure service-role queue/storage proof and other env/manual runtime truth lanes are still open. No deploy was run.

### 2026-05-07 12:40 PM PT - No-Deploy Public Guest Surface Boundary Audit

What changed:
- Added `src/lib/publicGuestSurfaceBoundary.test.ts` to statically audit the main guest-facing pages and helper services: `SiteView`, Event Hub, Event Recap, Photo Upload, Vault Contribute, Guestbook Submit, Guest Contact Update, the embedded RSVP surfaces, `interactiveSectionService`, and `vaultContributionService`.
- The new audit proves those guest/browser surfaces do not call `supabase.from(...)` directly and instead route through `public-site-access`, `public-site-rsvp-submit`, `guest-*` Edge Functions, `interactive-section-public`, `vault-contribution-public`, `vault-entry-submit`, `vault-upload-google-drive`, or the existing public access helper builders.
- Re-ran the shared public-access proof alongside the new guest-surface audit so the route/helper layer and the browser-surface layer are both pinned together.

Commands run:
- `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts src/sections/publicLinks.test.ts src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 7 files and 83 tests.
- `npm run proof:v1:public-access-coverage`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This turns the remaining direct-public-read audit into an explicit regression guard across the main guest/browser surface and makes the public-access centralization claim materially stronger, but a narrower residual public-surface review is still open. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:44 PM PT - No-Deploy Vault Contribution Public Access Hardening

What changed:
- Added `supabase/functions/vault-contribution-public/index.ts` so enabled vault configuration reads now happen behind a server-side public gate instead of directly from the browser.
- Updated `src/pages/vaultContributionService.ts` to call `supabase.functions.invoke('vault-contribution-public', ...)` and pass the same invite/password public-access artifacts already used by the vault page.
- Updated `src/pages/VaultContribute.tsx` so vault option loading still behaves the same for guests, but the browser no longer reads `vault_configs` directly after resolving site access.
- Expanded `src/pages/VaultContribute.test.ts` so the page/service contract now pins the new function path and the new function itself is checked for shared public gate usage.

Commands run:
- `npm test -- --run src/pages/VaultContribute.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 3 files and 42 tests.
- `npm run proof:v1:public-access-coverage`: PASS, with `vault-contribution-public` now included in the shared public subresource gate set.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes another browser-side public read from the vault contribution flow and strengthens the public-access centralization claim, but the broader remaining-direct-public-read audit is still not fully closed. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:39 PM PT - No-Deploy Photo Upload Prospect Access Alignment

What changed:
- Updated `src/pages/PhotoUpload.tsx` so the guest prospect opt-in follow-up now reuses the same `buildPhotoUploadAccessPayload(siteSlug)` access artifacts as the main `photo-upload` request instead of only forwarding `uploadToken`.
- This closes a real gated-flow mismatch where invite/password-based photo uploads could succeed, but the follow-up recap/prospect opt-in call could still fail because it dropped the shared public access artifacts.
- Added a source-contract guard in `src/pages/PhotoUpload.test.ts` so the page keeps forwarding the same access payload into both the upload request and the `guest-prospect-submit` follow-up.

Commands run:
- `npm test -- --run src/pages/PhotoUpload.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 3 files and 34 tests.
- `npm run proof:v1:public-access-coverage`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This makes the public upload and guest prospect opt-in flow internally consistent for gated sites and strengthens the public-access centralization claim, but the broader remaining-direct-public-read audit is still not fully closed. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:31 PM PT - No-Deploy Interactive Public Access Hardening

What changed:
- Added `supabase/functions/interactive-section-public/index.ts` as the guarded public lane for interactive hub sync, suggestion submit, and vote submit.
- The new function now checks `canReadPublicSubresource(...)` against the site slug, accepts invite/password access artifacts, and rate-limits interactive suggestion/vote writes before touching `interactive_suggestions` or `interactive_votes`.
- Replaced direct browser table reads/writes in `src/sections/interactiveSectionService.ts` with `supabase.functions.invoke('interactive-section-public', ...)`, while keeping the component-facing service API unchanged for `interactiveHub` and the music request form.
- Expanded static proof so the new public function is covered by the public-access coverage lane and the Edge Function hardening assertions.

Commands run:
- `npm run proof:v1:public-access-coverage`: PASS, with `interactive-section-public` now included in the shared public subresource gate set.
- `npm test -- --run src/sections/interactiveSectionService.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 3 files and 34 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This removes a direct browser public read/write path from the interactive hub/music request surface and makes the public-access claim truer, but the broader remaining-direct-public-read audit is still not fully closed. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:27 PM PT - No-Deploy Public Access Audit Coverage Expansion

What changed:
- Expanded `scripts/v1-proof-public-access-coverage.mjs` so it now audits three categories instead of only the shared public subresource-gate group:
  - shared `canReadPublicSubresource(...)` public functions
  - the `public-site-access` resolver itself
  - the signed-session `guest-contact-submit` exception path
- Added `src/lib/publicAccessCoverageProofScript.test.ts` so the proof script keeps those explicit audit categories pinned instead of silently drifting back to a narrower scan.
- Re-ran the public-access audit lane and confirmed the resolver, signed-session exception, and shared public subresource set are all green together.

Commands run:
- `npm run proof:v1:public-access-coverage`: PASS.
- `npm test -- --run src/lib/publicAccessCoverageProofScript.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts src/sections/publicLinks.test.ts src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 6 files and 81 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.

Status:
- PARTIAL. This makes the public-access audit claim stronger by covering the resolver and the intended signed-session exception explicitly, but the broader remaining-direct-public-read audit is still not fully closed. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:20 PM PT - No-Deploy Public Access Gate Coverage Tightening

What changed:
- Removed a stale published-only shortcut from `supabase/functions/photo-upload/index.ts` so the slug-based public upload path now fully relies on the shared `canReadPublicSubresource(...)` gate instead of re-checking `is_published` afterward.
- Updated `src/lib/publicSiteAccess.test.ts` to match the current session-storage-only artifact helpers and keep the public invite/password artifact contract pinned to the current implementation.
- Re-ran the dedicated public-access coverage proof so the current public subresource set is now green without `photo-upload` being a special-case holdout.

Commands run:
- `npm run proof:v1:public-access-coverage`: initially FAIL on `photo-upload` carrying a published-only shortcut, then PASS after removing it.
- `npm test -- --run src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts src/sections/publicLinks.test.ts src/pages/SiteView.test.ts`: PASS, 4 files and 53 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This makes the public-access centralization claim truer and keeps the dedicated proof lane green, but the broader audit for any remaining direct public reads is still open. No deploy was run, and the strict P0 blocker list is unchanged.

### 2026-05-07 12:08 PM PT - No-Deploy Planner And Coordinator Live Allow-Proof Closure

What changed:
- Expanded `tests/e2e/collaborator-permission-rls.spec.ts` beyond the existing viewer deny proof so the live collaborator runtime lane now also proves planner `queue-guest-followups` access with `messages` permission and coordinator `photo-export-manifest` access with `photos` permission.
- Kept the same owner-invite and collaborator-claim runtime path rather than adding a second proof harness, so the allowed-action proof now rides the exact live route/helper flow already used for the viewer forbidden checks.
- Updated the blocker docs and proof board so planner/coordinator allowed-action live proof is no longer listed as an active strict P0 blocker.

Commands run:
- `npm run proof:v1:collaborator-runtime`: PASS. Live runtime collaborator proof bundle passed 2/2 against `https://dayof.love`, including viewer deny, planner messaging-helper allow, and coordinator photo-helper allow coverage.
- `npm run proof:v1:collaborator-access`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.

Status:
- IMPROVED. Planner/coordinator allowed-action live proof is now green. The remaining active strict P0 blocker in this lane is secure service-role queue/storage integrity proof.

### 2026-05-07 11:46 AM PT - No-Deploy Live Authorization Proof Narrowing

What changed:
- Ran `npm run proof:v1:service-role-authorization` against the live Supabase project and proved that `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch` all deny unauthenticated callers with safe `401` responses before privileged media/service-role work.
- Ran `npm run proof:v1:email-messaging-authorization` against the live Supabase project and proved that `process-email-queue`, `queue-guest-followups`, `send-bulk-message`, and `send-wedding-email` all deny unauthenticated or non-service-role callers with safe `401/403` responses before privileged messaging/queue work.
- Updated backlog/proof wording so the open blockers are now recorded as authenticated role-mutation proof plus secure service-role queue/storage proof, instead of the older broader “live service-role proof” and “live messaging authorization proof” wording that no longer matched the green live denial results.

Commands run:
- `npm run proof:v1:service-role-authorization`: PASS. Live unauthenticated denial proof returned safe `401` copy for all five service-role photo/media cases.
- `npm run proof:v1:email-messaging-authorization`: PASS. Live unauthenticated denial proof returned safe `401/403` copy for all four messaging/queue cases.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Live unauthenticated denial proof is now green for both service-role photo/media and messaging/queue lanes, but authenticated role-mutation proof and secure service-role queue/storage integrity proof still remain before these launch blockers are fully closed.

### 2026-05-07 11:56 AM PT - No-Deploy Collaborator Runtime Proof Expansion

What changed:
- Updated `scripts/v1-proof-collaborator-runtime.mjs` so the live collaborator runtime proof reads owner credentials from standard env files, targets `https://dayof.love` by default, and generates disposable collaborator credentials automatically instead of blocking on pre-seeded collaborator env vars.
- Updated `scripts/playwright-owner-create-invite-and-claim.mjs` so the live invite/claim proof no longer depends on a hardcoded proof-site slug, a missing `.env.local`, or an outdated invite button label.
- Expanded `tests/e2e/collaborator-permission-rls.spec.ts` so the limited collaborator runtime proof now covers direct message-row denial, `queue-guest-followups` denial, `photo-album-create` denial, and `photo-export-manifest` denial while still proving an allowed guest write.
- Proved the full live collaborator runtime bundle end to end: owner invite creation, collaborator accept flow, role-aware dashboard landing, allowed guest write, and forbidden messaging/photo helper actions.

Commands run:
- `npm run proof:v1:collaborator-runtime`: PASS. Live runtime collaborator proof bundle passed 2/2 against `https://dayof.love`.
- `npm run proof:v1:collaborator-access`: PASS. Local collaborator-access bundle stayed green.

Status:
- PARTIAL. This closes the live limited-collaborator forbidden-action proof gap for messaging and photo helper lanes, but planner/coordinator allowed-action live proof and secure service-role queue/storage integrity proof still remain before those launch blockers are fully closed.

### 2026-05-07 11:27 AM PT - No-Deploy Photo Owner Helper Copy Tightening

What changed:
- Updated `photo-album-create` so the owner photo-album creation path now returns customer-safe sign-in, site-selection, album-name, site-availability, and access-denied copy instead of raw `Unauthorized` and `siteId and name are required` wording.
- Updated `photo-album-manage` so album selection, album availability, access denial, activation-state validation, action validation, and parent-album validation now use customer-safe copy instead of raw `albumId is required`, `Album not found`, `Forbidden`, `isActive is required for set_active`, and similar helper-internal wording.
- Updated `photo-upload-moderate` so photo moderation now returns customer-safe batch-selection, batch-size, unavailable-selection, access-denied, and patch-required copy instead of raw upload-ID validation wording.
- Updated `google-drive-auth-callback` so owner/site mismatch now returns storage-connection readiness copy instead of `Site not found or unauthorized`.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the tightened photo owner-helper and storage-callback copy and reject reintroduction of the old raw auth, field-name, and not-found strings on those routes.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows more owner/service-role helper contract leakage in the photo-management lane, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:30 AM PT - No-Deploy Public Submission Copy Tightening

What changed:
- Updated `vendor-profile-inquiry-submit` so it now uses customer-safe vendor-selection and vendor-availability copy instead of `Missing vendor profile` and `Vendor page not found.`
- Updated `log-client-error` so it now asks for a short report summary instead of returning `message is required`.
- Updated `photo-upload` so the guest upload entry path now uses customer-safe link-refresh and file-selection copy instead of raw `token or siteSlug is required` and `At least one file is required` wording.
- Updated `guestbook-submit`, `guest-contact-submit`, and `vault-entry-submit` so they now use customer-safe message/request-unavailable copy instead of `Message is required` and `Guest not found`.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the tightened public submission/helper copy and reject reintroduction of the old field-name and not-found strings on those routes.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows more guest/public helper contract leakage, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:36 AM PT - No-Deploy Guest Link Contract Tightening

What changed:
- Updated `submit-rsvp` so guests are now asked to reopen their invitation link instead of seeing `A valid invitation token is required to submit your RSVP.`
- Updated `guest-hub-config`, `guest-hub-track`, `guest-recap-config`, `guest-prospect-submit`, and `guestbook-submit` so malformed or unavailable public slug cases now collapse to consistent wedding-link wording instead of `Invalid site` and `Site not available`.
- Updated `photo-upload` so upload-link failures now use consistent photo-upload-link wording instead of `Invalid site link.` and `Site not available for uploads.`
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the new invitation-link, wedding-link, guest-hub, recap, guestbook, prospect, and photo-upload copy and reject reintroduction of the old site/token wording on those routes.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps the guest-facing public-link contract more consistent and less implementation-shaped, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:39 AM PT - No-Deploy Vault Contribution Copy Tightening

What changed:
- Updated `vault-upload-google-drive` so guest/public vault uploads now use customer-safe site-selection, vault-selection, file-selection, contribution-link, storage-readiness, vault-availability, and reconnect-needed copy instead of raw field-name, availability, and Google Drive/config wording.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the tightened vault contribution copy and reject reintroduction of the old field-name, availability, and reconnect strings on that route.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps guest-facing vault contribution failures less implementation-shaped, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:41 AM PT - No-Deploy Public RSVP Submit Contract Tightening

What changed:
- Updated `public-site-rsvp-submit` so the public RSVP widget submit path now uses named customer-safe constants for missing-name, invalid-email, send-unavailable, rate-limit, and link-unavailable copy instead of ad hoc inline strings.
- Kept the same fail-closed validation and rate-limit behavior while making the guest-facing RSVP submit contract more explicit and consistent with the broader public-link wording pass.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the tightened public RSVP submit copy and reject reintroduction of the older inline name-required and RSVP-unavailable strings on that route.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps the public RSVP submit contract calmer and less implementation-shaped, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:45 AM PT - No-Deploy Service-Role Disposition Truth Tightening

What changed:
- Updated `docs/service-role-authorization-disposition-2026-05-05.md` so the static service-role inventory now correctly distinguishes owner/collaborator auth routes from public submission routes and public or optional-auth rate-limited helpers.
- Moved `vault-upload-google-drive` into the public submission scoped group, and documented `log-client-error`, `onboarding-ai-orchestrate`, and `vendor-profile-preview` under a new public or optional-auth rate-limited helper section instead of the owner-only group.
- Reconciled the disposition document with `src/lib/serviceRoleAuthorizationDisposition.test.ts`, removing a real proof drift where the inventory doc and the test disagreed about the current launch-critical service-role surface.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts`: PASS, 2 files and 29 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This fixes a real proof-truth mismatch in the service-role launch lane, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:19 AM PT - No-Deploy Preview Helper Copy Tightening

What changed:
- Updated `registry-preview` so it now returns customer-safe sign-in and missing-product-URL copy instead of raw `Unauthorized` and `url is required` wording.
- Updated `vendor-profile-preview` so it now asks for the vendor name in plain customer language instead of returning `vendorName is required`.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the new registry preview and vendor preview copy and reject reintroduction of raw auth or field-name wording there.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This removes more helper-contract leakage from preview routes, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:17 AM PT - No-Deploy Owner Helper Access-Copy Tightening

What changed:
- Updated `photo-export-manifest`, `queue-guest-followups`, `vault-resolve-entry-link`, and `send-wedding-email` so those owner/service-role helper paths now return customer-safe sign-in, access, site-selection, vault-selection, and request-shape copy instead of raw `Unauthorized`, `Forbidden`, `siteId is required`, `entryId is required`, `Entry not found`, `Missing required fields: type, to, data`, and similar internal wording.
- Kept the same fail-closed authorization and validation behavior while making those helper contracts less revealing and more consistent with the rest of the hardening pass.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the new safe-copy constants and reject reintroduction of the old raw auth and field-name strings on those helper routes.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This removes more launch-grade auth/access copy leakage from owner helper routes, but live service-role/RLS proof and live messaging authorization proof are still deploy-gated blockers.

### 2026-05-07 11:11 AM PT - No-Deploy RSVP Invitation-Code Contract Alignment

What changed:
- Updated `supabase/functions/validate-rsvp-token/index.ts` so the manual RSVP lookup and event RSVP lookup paths both use invitation-code-only validation copy instead of guest-name wording or raw `inviteToken is required` text.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the exact `invite_token` lookup contract on both RSVP lookup branches and fail if production RSVP lookup drifts back toward name-based queries.
- Updated `src/i18n/en.json`, `src/i18n/es.json`, `src/i18n/fr.json`, `src/i18n/de.json`, `src/i18n/it.json`, and `src/i18n/pt.json` so the RSVP search UI now consistently asks for an invitation code instead of a name-or-code mix that no longer matches the hardened production backend.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx`: PASS, 3 files and 142 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This removes a guest-facing RSVP contract mismatch and makes the local strict lookup story more honest, but live abuse proof and the remaining deploy-gated RSVP/service-role blockers are still open.

### 2026-05-07 11:08 AM PT - No-Deploy Guest Lookup Exact-Match Tightening

What changed:
- Tightened `supabase/functions/guest-contact-lookup/index.ts` so public guest-contact lookup no longer widens through a last-name candidate sweep before exact-name filtering.
- Kept site scoping and the shared public access gate intact while narrowing the allowed guest lookup shape to exact full-name matches from either the stored `name` field or an exact `first_name` plus `last_name` split for that site.
- Updated `src/pages/GuestContactUpdate.tsx` so the guest flow now asks for the full invitation name up front, disables lookup until the request shape is valid, and shows guest-safe guidance instead of silently sending partial-name searches the server will reject.
- Expanded `src/lib/launchEdgeFunctions.test.ts` and `src/pages/GuestContactUpdate.test.ts` to statically guard the exact split-name lookup and the full-name guest guidance contract.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestContactUpdate.test.ts`: PASS, 2 files and 31 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This further reduces local public guest enumeration surface and aligns the guest flow with the hardened server contract, but live abuse proof and the remaining deploy-gated RSVP/service-role blockers are still open.

### 2026-05-07 10:36 AM PT - No-Deploy Request-Copy And Storage Safety Continuation

What changed:
- Hardened customer-facing request/auth/validation copy in `setup-bootstrap`, `translate-site-content`, `send-bulk-message`, `photo-analyze-batch`, `generate-token`, `submit-rsvp`, and `validate-rsvp-token` so those flows no longer leak raw field names, auth jargon, or JSON/body wording.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to statically guard the new setup/translation/RSVP/token/photo-analysis/bulk-message safety copy.
- Added invite-email validation and stale invite cleanup to `src/lib/plannerAccess.ts` with `PLANNER_INVITE_EMAIL_PATTERN`, normalized invite parsing, and invalid-entry removal from local storage.
- Hardened `src/pages/dashboard/messages/messageDashboardUtils.ts` so saved composer templates and stored photo album links now use timestamped retention envelopes, bounded normalization, and migration cleanup.
- Updated `src/pages/dashboard/Itinerary.tsx` and `src/pages/dashboard/Vault.tsx` to consume their hardened demo-storage and local E2E bypass helpers instead of raw localStorage writes/reads.
- Restored missing shared exports in `src/lib/publicAccessArtifacts.ts`, `src/pages/dashboard/guests/guestService.ts`, `src/pages/dashboard/guests/guestDashboardUtils.ts`, and `src/pages/dashboard/messages/messageService.ts` so the ongoing split work returns to a green typecheck/build baseline.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/customerSafeError.test.ts src/lib/superNiceLaunchBacklogSafety.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/itineraryDemoStorage.test.ts`: PASS, 5 files and 59 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known non-blocking warnings remain the existing Browserslist `caniuse-lite` notice and the empty `vendor-react` chunk.

Status:
- PARTIAL. This batch keeps the no-deploy hardening lane green locally and restores the split-files branch baseline without changing live production state.

### 2026-05-04 9:20 PM PT - Safety Harness

What changed:
- Created this production-hardening report as the canonical report for the 10/10 mandate.
- Recorded current known blockers and the no-feature-loss checklist before additional hardening changes.

Commands run:
- Not yet run for this report batch.

Status:
- PARTIAL. Report exists, but validation has not been rerun.

### 2026-05-04 9:25 PM PT - P0 Public Access Fail-Closed Gate

What changed:
- Added shared public access gate helper for public site, registry, and itinerary Edge Functions.
- Removed duplicated subresource gate logic that defaulted missing `privacy_mode` to `public`.
- Public access now treats unknown/missing privacy mode as unavailable, and `hidden` as not publicly readable.
- Password unlock no longer opens invite-only or hidden sites.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts`: PASS, 59/59 after public gate hardening.

Status:
- PARTIAL. Focused public gate tests passed locally; full validation and live proof remain.

### 2026-05-04 9:30 PM PT - P0 RSVP Session Contract Preservation

What changed:
- Updated the RSVP picked-guest follow-up lookup call to send the current short-lived `rsvpSession`.
- Added static guard coverage so future RSVP frontend changes cannot call `lookup_guest` with guest id alone.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts`: PASS, 59/59 after public gate hardening.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts src/pages/RSVP.test.tsx`: PASS, 169/169 after updating RSVP copy expectations for the hardened no-name-enumeration flow.

Status:
- PARTIAL. Local RSVP tests pass, but live `smoke:rsvp` fails with deployed 503 responses.

### 2026-05-04 9:31 PM PT - P1 Registry Preview SSRF Range Closure

What changed:
- Expanded registry preview IPv4 blocking in both the URL normalizer and runtime fetch gate.
- Added carrier-grade NAT, documentation/example networks, benchmarking networks, multicast, reserved, and broadcast-range coverage in addition to existing private, link-local, loopback, metadata, IPv6 private, DNS A/AAAA, redirect, timeout, content-type, and size controls.
- Updated static regression coverage so both the product URL normalizer and runtime fetcher must keep those ranges blocked.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS after sandbox escalation, 23/23.

Status:
- PARTIAL. Local SSRF guard proof improved; full hostile-target runtime matrix remains a paid-launch hardening item.

### 2026-05-04 9:32 PM PT - Local Validation Lane

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint`: PASS with 547 warnings and 0 errors.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm test`: PASS after sandbox escalation, 461 files and 2753 tests.
- `npm run guard:file-size`: PASS. Legacy oversized page files remain within current baseline.
- `npm run smoke:registry`: PASS.
- `npm run smoke:rsvp`: FAIL in sandbox first with DNS `ENOTFOUND` for the configured Supabase host.
- `npm run smoke:rsvp`: FAIL after network escalation; live function returned 503 for valid submit, invalid token, plus-one limit, children limit, ceremony scope, and reception scope checks.
- `npm run smoke:site`: FAIL in sandbox first with DNS `ENOTFOUND` for the configured Supabase host.
- `npm run smoke:site`: PASS after network escalation.
- `npm run test:smoke`: FAIL after network escalation because `smoke:rsvp` failed; `smoke:registry` passed before the aggregate stopped.
- `npm run smoke:csvmapper`: PASS.
- `npm run smoke:checkin`: PASS.
- `npm run smoke:messages`: PASS.

Status:
- BLOCKED for launch readiness. Local typecheck/lint/build/test/guard and non-RSVP smoke lanes are green, but live RSVP remains a launch blocker.

### 2026-05-04 9:39 PM PT - P1 Email Safety Centralization

What changed:
- Added `supabase/functions/_shared/emailSafety.ts` as the single shared helper for Edge Function email HTML escaping, URL validation, email href escaping, and subject sanitization.
- Updated `send-wedding-email`, `process-email-queue`, and `send-bulk-message` to import the shared helper instead of maintaining duplicate local escape/sanitize implementations.
- Kept existing transactional, queued, and bulk email behavior while reducing the chance that a future email path drifts into raw interpolation.
- Removed a touched unused public-site type alias so quiet lint stays clean for this batch.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: FAIL after first helper refactor because a second static assertion still expected a local `function escapeHtml` inside `send-bulk-message`.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS after updating the static guard to require the shared helper import, 23/23.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.
- `npm run smoke:messages`: PASS.
- `npm run guard:file-size`: PASS.

Status:
- PARTIAL for launch readiness. Local email safety centralization and proof are green; live messaging authorization/send proof remains required before marking email/messaging P1 fully done.

### 2026-05-04 9:40 PM PT - P1 Guest Import/Export Safety Tightening

What changed:
- Guest import now rejects unsupported file extensions instead of parsing any non-`.xlsx` file as CSV.
- Guest import now enforces the 80-column limit across every row, not only the header row.
- Existing CSV export formula-neutralization behavior was re-proven so spreadsheet exports continue to defend against `=`, `+`, `-`, `@`, tab, and newline formula payloads.

Commands run:
- `npm test -- --run src/lib/guestImportParser.test.ts src/lib/csvExport.test.ts`: PASS after sandbox escalation, 12/12.
- `npm run smoke:csvmapper`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. Import/export parser hardening is locally green; broader guest export authorization/audit proof remains in the paid-launch P1 queue.

### 2026-05-04 9:43 PM PT - P2 Guests File Split And Guard Tightening

What changed:
- Extracted pure Guests dashboard audit/custom-answer display helpers into `src/pages/dashboard/guests/guestDisplayUtils.ts`.
- Added characterization tests for audit summaries, audit labels/tones, RSVP event note parsing, and custom-answer formatting.
- Reduced `src/pages/dashboard/Guests.tsx` from 5430 to 5338 lines without changing dashboard behavior.
- Lowered the file-size guard baseline for `Guests.tsx` from 5430 to 5338 lines so the split cannot quietly regress.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestImportParser.test.ts src/lib/csvExport.test.ts`: PASS after sandbox escalation, 18/18.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. This is the first incremental split of the largest dashboard page; more domain slices remain for Guests, Messages, and Settings.

### 2026-05-04 9:47 PM PT - P2 Asset Budget Guard

What changed:
- Added `scripts/check-asset-budget.mjs` and `npm run guard:assets`.
- The guard budgets production-copied `public/` assets to the current baseline instead of deleting product preview assets during a security batch.
- Current public footprint is 209433 KiB across 334 files, with the largest files being template preview GIFs under 6000 KiB each.

Commands run:
- `npm run guard:assets`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. The guard prevents accidental growth, but shrinking/moving existing template GIFs to CDN/object storage remains open.

### 2026-05-04 9:50 PM PT - P2 Asset Guard CI/Test-Lane Wiring

What changed:
- Wired `npm run guard:assets` into `test:launch`, `proof:v1:test-lanes`, and CI hardpass.
- `test:launch` now runs typecheck, quiet lint, file-size guard, asset guard, build, and proof-board generation in order.
- CI hardpass now runs the asset budget guard next to the file-size guard before the core test/build/smoke lane.
- Kept the newly lowered `Guests.tsx` file-size baseline strict; the guard caught a one-line increase and the extra blank line was removed rather than raising the baseline.

Commands run:
- `npm run guard:assets`: PASS, 209433 KiB total public assets, 334 files, largest file 4788 KiB.
- `npm run guard:file-size`: FAIL first, `src/pages/dashboard/Guests.tsx` had 5339 lines against the lowered 5338 baseline.
- `npm run guard:file-size`: PASS after removing the extra blank line; `Guests.tsx` is back to 5338 lines.
- `npm run proof:v1:test-lanes`: PASS, 8/8 required script contracts including `guard:assets`.
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.

Status:
- PARTIAL. CI and launch proof now prevent asset-footprint growth, but the existing template-preview GIF footprint still needs an optimized-thumbnail/CDN/object-storage path before this asset item can be marked done.

### 2026-05-04 9:53 PM PT - P1 CI Hardpass Reliability

What changed:
- Split CI hardpass from one chained core command into named steps for unit/regression tests, build, registry smoke, CSV mapper smoke, check-in smoke, and messages smoke.
- Added quiet lint to CI hardpass.
- Extended `scripts/v1-proof-test-lanes.mjs` so it guards the CI hardpass shape and rejects reintroducing an opaque `npm test && ...` hardpass chain.

Commands run:
- `npm run proof:v1:test-lanes`: PASS, including CI hardpass script/step checks.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS, 209433 KiB total public assets.

Status:
- PARTIAL. CI failure reporting is more trustworthy and broader, but the live RSVP 503 blocker still prevents aggregate smoke from being green.

### 2026-05-04 9:55 PM PT - P1 Security Regression Lane

What changed:
- Added `npm run test:security` as a named lane for security-sensitive regression coverage.
- The lane currently covers launch Edge Function contract guards, public site access, public site project safety, service worker cache safety, browser AI/provider key exposure, AI proof-script exposure, settings error safety, service-role authorization disposition, RSVP behavior, and event RSVP behavior.
- Wired `test:security` into `test:launch` and CI hardpass.
- Extended `scripts/v1-proof-test-lanes.mjs` to verify the security lane and CI security step.

Commands run:
- `npm run proof:v1:test-lanes`: PASS, 9/9 script contracts plus CI hardpass checks.
- `npm run test:security`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run test:security`: PASS after sandbox escalation, 10 files and 191 tests.

Status:
- PARTIAL. Security-sensitive tests are now easier to run and harder to skip, but live RSVP remains blocked and broader live authorization proof is still required.

### 2026-05-04 9:56 PM PT - Launch Lane Composition Proof

Commands run:
- `npm run test:launch`: PASS after sandbox escalation. This ran `typecheck --pretty false`, quiet lint, `test:security`, file-size guard, asset guard, production build, and proof-board markdown generation.

Status:
- PARTIAL. The local launch lane is now credible and green, but it intentionally does not clear the live RSVP 503 blocker or replace postdeploy proof.

### 2026-05-04 10:00 PM PT - P2 Dashboard File Split Continuation

What changed:
- Extracted Guests dashboard shared types and storage-key constants into `src/pages/dashboard/guests/guestDashboardTypes.ts`.
- Extracted Messages dashboard shared types, delivery status constants, template types, and saved-template storage key into `src/pages/dashboard/messages/messageDashboardTypes.ts`.
- Lowered the file-size guard baseline for `Guests.tsx` from 5338 to 5250 lines.
- Lowered the file-size guard baseline for `Messages.tsx` from 4043 to 3936 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts`: PASS after sandbox escalation, 2 files and 6 tests.
- `npm run smoke:messages`: PASS.
- `npm run typecheck`: FAIL once after the Messages extraction because `MessageTemplateKey` was not imported from the new type module.
- `npm run typecheck`: PASS after fixing the missing import.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5250-line Guests baseline and 3936-line Messages baseline.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. The oversized dashboard pages are shrinking under stricter guardrails, but more Guests, Messages, and Settings feature-module extraction remains.

### 2026-05-04 10:03 PM PT - P2 Settings Split And Public Storage Regression

What changed:
- Extracted Settings dashboard RSVP/language types and local demo storage constants into `src/pages/dashboard/settings/settingsDashboardTypes.ts`.
- Lowered the file-size guard baseline for `Settings.tsx` from 2422 to 2399 lines.
- Added a public-site storage regression proving invite-token/password-session gate artifacts use `sessionStorage`, not `localStorage`.

Commands run:
- `npm test -- --run src/lib/settingsErrorSafety.test.ts src/lib/launchEdgeFunctions.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/settingsErrorSafety.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS after sandbox escalation, 2 files and 26 tests.
- `npm test -- --run src/lib/publicSiteAccess.test.ts src/lib/launchEdgeFunctions.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/publicSiteAccess.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS after sandbox escalation, 2 files and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2399-line Settings baseline.
- `npm run proof:v1:test-lanes`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. Settings is smaller and public gate storage has explicit regression proof, but more dashboard extraction and live authorization proof remain.

### 2026-05-04 10:10 PM PT - P2 Guest-Facing RSVP Split

What changed:
- Extracted RSVP constants, response types, meal/question types, and customer-safe RSVP error normalization into `src/pages/rsvpTypes.ts`.
- Kept `normalizeRsvpGuestError` and `normalizeRsvpSubmitError` re-exported from `RSVP.tsx` so existing imports remain stable.
- Lowered the file-size guard baseline for `RSVP.tsx` from 2060 to 1993 lines, bringing it below the 2000-line oversized threshold.
- Fixed a fallback-copy regression caught by the focused RSVP suite: failed token/manual lookup paths now keep the canonical invitation-not-recognized copy.

Commands run:
- `npm test -- --run src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx`: FAIL once after extraction because three lookup cases showed “Couldn’t load that invitation” instead of the canonical invitation-not-recognized copy.
- `npm test -- --run src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx`: PASS after fixing moved fallback imports/catch behavior, 2 files and 115 tests.
- `npm run typecheck`: FAIL during the intermediate extraction state because moved fallback constants were not imported.
- `npm run typecheck`: PASS after fixing the imports.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 1993-line RSVP baseline.
- `npm run test:security`: PASS after sandbox escalation, 10 files and 192 tests.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. The public RSVP file is now below the oversized threshold with behavior proof, but live RSVP deployment/proof remains blocked.

### 2026-05-04 10:13 PM PT - P2 Seating Split

What changed:
- Extracted seating dashboard pure helpers and constants into `src/pages/dashboard/seating/seatingDashboardUtils.ts`.
- Added `src/pages/dashboard/seating/seatingDashboardUtils.test.ts` for HTML escaping, export slug normalization, and table shape label/palette behavior.
- Lowered the file-size guard baseline for `Seating.tsx` from 2370 to 2334 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS after sandbox escalation, 2 files and 9 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2334-line Seating baseline.
- `npm run smoke:checkin`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS after sandbox escalation.

Status:
- PARTIAL. Seating is smaller with helper proof, but broader dashboard extraction and live proof blockers remain.

### 2026-05-04 10:19 PM PT - P2 Coordinator Split

What changed:
- Extracted Coordinator Mode dashboard-only types into `src/pages/dashboard/coordinator/coordinatorDashboardTypes.ts`.
- Lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2839 to 2813 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts`: PASS after sandbox escalation, 3 files and 6 tests.
- `npm run proof:v1:coordinator-dayof`: FAIL in sandbox only, internal Vitest/build commands could not write `node_modules/.vite-temp/...` due `EPERM`; check-in guard substep passed.
- `npm run proof:v1:coordinator-dayof`: PASS after sandbox escalation, 5/5 required coordinator proof checks.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2813-line Coordinator Mode baseline.
- `git diff --check`: PASS.

Status:
- PARTIAL. Coordinator Mode is smaller under a stricter guardrail with role/queue/timeline/build proof, but manual runtime coordinator proof and broader dashboard extraction remain.

### 2026-05-04 10:25 PM PT - P2 Guest Photo Sharing Split

What changed:
- Extracted Guest Photo Sharing row types, hub defaults, local bucket-link storage helpers, tag formatting, AI analysis labels, and event album tag derivation into `src/pages/dashboard/guestPhotoSharingUtils.ts`.
- Added `src/pages/dashboard/guestPhotoSharingUtils.test.ts`.
- Lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3609 to 3404 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts`: PASS after sandbox escalation, 6 files and 20 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3404-line Guest Photo Sharing baseline.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:ai-rollout`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guest Photo Sharing is smaller with utility proof and local AI/photo rollout proof remains green, but live AI/photo/public proof still needs approved deploy/postdeploy validation.

### 2026-05-04 10:31 PM PT - P2 Name-Change Planner Split

What changed:
- Extracted Name Change planner UI types, storage keys, status priority ordering, status labels, chip/tone helpers, action-feed labels, and account-update template copy helpers into `src/pages/dashboard/planning/nameChangePlannerUi.ts`.
- Added `src/pages/dashboard/planning/nameChangePlannerUi.test.ts`.
- Lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2754 to 2526 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: PASS after sandbox escalation, 5 files and 49 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2526-line Name Change planner baseline.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Name Change planner is smaller with focused UI helper proof, but broader dashboard extraction and live proof blockers remain.

### 2026-05-04 10:34 PM PT - P2 Settings Helper Split

What changed:
- Extracted Settings RSVP question factory, language labels, translation status labels, customer-safe settings error helper, site-missing copy, and planner permission label helper into `src/pages/dashboard/settings/settingsDashboardUtils.ts`.
- Added `src/pages/dashboard/settings/settingsDashboardUtils.test.ts`.
- Lowered the file-size guard baseline for `Settings.tsx` from 2399 to 2378 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts`: FAIL once because the new test expected `Guest list`; the product’s actual permission label is `Guests`.
- `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts`: PASS after correcting the assertion, 3 files and 9 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2378-line Settings baseline.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Settings is smaller with focused helper proof, but privacy/settings live proof still depends on approved deploy/postdeploy validation.

### 2026-05-04 10:41 PM PT - P2 Messages Helper Split

What changed:
- Extracted Messages dashboard delivery status helpers, saved composer template storage/normalization, composer template registry, reachability checks, schedule formatting, audience/count helpers, campaign labels, customer-safe delivery reason copy, and recipient review copy into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Added `src/pages/dashboard/messages/messageDashboardUtils.test.ts`.
- Lowered the file-size guard baseline for `Messages.tsx` from 3936 to 3678 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts`: FAIL once because two new assertions expected scheduled email cap consumption and recipient-filter count precedence; corrected to current behavior.
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS after correction, 8 files and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3678-line Messages baseline.
- `npm run smoke:messages`: PASS.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Messages is smaller with focused helper proof and permission smoke remains green, but live messaging authorization proof still needs approved deploy/postdeploy validation.

### 2026-05-04 10:43 PM PT - P2 Guests Helper Split

What changed:
- Extracted Guests dashboard customer-safe error helpers, guest import read-error allowlist, RSVP question factory, and title-case helper into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added `src/pages/dashboard/guests/guestDashboardUtils.test.ts`.
- Lowered the file-size guard baseline for `Guests.tsx` from 5250 to 5223 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS after sandbox escalation, 4 files and 12 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5223-line Guests baseline.
- `npm run smoke:csvmapper`: PASS.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests is smaller with focused helper proof and CSV mapper smoke remains green, but live RSVP/public proof blockers remain.

### 2026-05-04 10:49 PM PT - P2 Seating Demo-Storage Split

What changed:
- Extracted Seating demo itinerary storage, demo seating state storage, and seating layout version storage helpers into `src/pages/dashboard/seating/seatingDemoStorage.ts`.
- Added `src/pages/dashboard/seating/seatingDemoStorage.test.ts`.
- Lowered the file-size guard baseline for `Seating.tsx` from 2334 to 2271 lines.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2271-line Seating baseline.
- `npm test -- --run src/pages/dashboard/seating/seatingDemoStorage.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/seating/seatingDemoStorage.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS after sandbox escalation, 3 files and 14 tests.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Seating is smaller with focused demo-storage proof and no behavior removal, but live RSVP/public proof blockers and broader dashboard extraction remain.

### 2026-05-04 10:53 PM PT - P2 Messages Demo-Storage Split

What changed:
- Extracted Messages demo message seed, demo message localStorage read/write, and RSVP continuity storage/event constants into `src/pages/dashboard/messages/messageDemoStorage.ts`.
- Added `src/pages/dashboard/messages/messageDemoStorage.test.ts`.
- Lowered the file-size guard baseline for `Messages.tsx` from 3678 to 3601 lines.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3601-line Messages baseline.
- `npm test -- --run src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messageScheduleTime.test.ts src/pages/dashboard/messageHistoryTime.test.ts src/pages/dashboard/messageEventDate.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/messageAudienceSegments.test.ts src/lib/messageDeliveryState.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS after sandbox escalation, 9 files and 29 tests.
- `npm run smoke:messages`: PASS.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `git diff --check`: PASS.

Status:
- PARTIAL. Messages is smaller with focused demo-storage proof and message permission smoke remains green, but live messaging/public proof still needs approved deploy/postdeploy validation.

### 2026-05-04 10:58 PM PT - P2 Guests Local-State Storage Split

What changed:
- Extracted Guests campaign preset, follow-up task, saved segment, and campaign log localStorage helpers into `src/pages/dashboard/guests/guestDashboardStorage.ts`.
- Added `src/pages/dashboard/guests/guestDashboardStorage.test.ts`.
- Lowered the file-size guard baseline for `Guests.tsx` from 5223 to 5192 lines.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5192-line Guests baseline.
- `npm test -- --run src/pages/dashboard/guests/guestDashboardStorage.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/guests/guestDashboardStorage.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS after sandbox escalation, 5 files and 15 tests.
- `npm run smoke:csvmapper`: PASS.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests is smaller with focused local-state storage proof and stale browser-state handling is stricter, but live RSVP/public proof blockers and broader dashboard extraction remain.

### 2026-05-04 11:03 PM PT - P2 Settings RSVP Demo-Storage Split

What changed:
- Extracted Settings demo RSVP settings storage into `src/pages/dashboard/settings/settingsDemoStorage.ts`.
- Centralized RSVP question and meal-option normalization in `src/pages/dashboard/settings/settingsDashboardUtils.ts`.
- Added `src/pages/dashboard/settings/settingsDemoStorage.test.ts` and expanded `settingsDashboardUtils.test.ts`.
- Lowered the file-size guard baseline for `Settings.tsx` from 2378 to 2339 lines.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2339-line Settings baseline.
- `npm test -- --run src/pages/dashboard/settings/settingsDemoStorage.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/settings/settingsDemoStorage.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settingsDate.test.ts src/lib/settingsErrorSafety.test.ts`: PASS after sandbox escalation, 4 files and 13 tests.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `git diff --check`: PASS.

Status:
- PARTIAL. Settings is smaller with focused demo-storage/normalization proof and less duplicated parser logic, but privacy/settings live proof remains deploy-gated.

### 2026-05-04 11:06 PM PT - P2 Name-Change Planner Preference Split

What changed:
- Moved Name Change planner admin-toggle and collapsed-section localStorage helpers into `src/pages/dashboard/planning/nameChangePlannerUi.ts`.
- Expanded `src/pages/dashboard/planning/nameChangePlannerUi.test.ts` for defensive preference parsing.
- Lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2526 to 2499 lines.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2499-line Name Change planner baseline.
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: PASS after sandbox escalation, 5 files and 50 tests.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `git diff --check`: PASS.

Status:
- PARTIAL. Name Change planner is smaller with focused preference-storage proof and stricter stale preference handling, but broader dashboard extraction and live proof blockers remain.

### 2026-05-04 11:13 PM PT - P2 Coordinator Storage Adapter Split

What changed:
- Extracted Coordinator Mode timeline, alert log, Q&A, session, draft, active-work, guest-work, timeline-work, command, and alert-intent storage into `src/pages/dashboard/coordinator/coordinatorStorage.ts`.
- Added `src/pages/dashboard/coordinator/coordinatorStorage.test.ts`.
- Lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2813 to 2794 lines.
- Cached Q&A rows with blank ids/questions are now dropped before rehydrating coordinator state.

Commands run:
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2794-line Coordinator Mode baseline.
- `npm test -- --run src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm test -- --run src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts`: FAIL once after escalation because the new stale Q&A assertion caught blank-id cached rows.
- `npm test -- --run src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/pages/dashboard/coordinatorEventTime.test.ts src/lib/coordinatorModePersistence.test.ts src/lib/coordinatorCommandDeck.test.ts`: PASS after correcting the adapter, 4 files and 10 tests.
- `npm run proof:v1:coordinator-dayof`: FAIL in sandbox only, Vite/Vitest could not write `node_modules/.vite-temp/...` due `EPERM`; the check-in guard inside the proof passed.
- `npm run proof:v1:coordinator-dayof`: PASS after sandbox escalation, 5/5.
- `npm run build`: FAIL in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Coordinator Mode is smaller with focused storage proof and stale local Q&A cache cleanup, but broader dashboard extraction and live proof blockers remain.

### 2026-05-04 11:16 PM PT - P2 Messages Storage Utility Split

What changed:
- Moved saved composer-template storage migration into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Moved photo album link parsing/counting/preferred-link selection into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Hardened stored photo album link reads so malformed array/non-object storage falls back safely instead of feeding unexpected values into message template copy.
- Lowered the file-size guard baseline for `Messages.tsx` from 3601 to 3572 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS after sandbox escalation, 4 files and 16 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3572-line Messages baseline.
- `npm run smoke:messages`: PASS.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after sandbox escalation, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Messages is smaller with focused storage utility proof and message permission smoke remains green, but live messaging/public proof still needs approved deploy/postdeploy validation.

### 2026-05-05 7:01 AM PT - P2 Guests Demo RSVP Storage Split

What changed:
- Moved demo RSVP custom-question and meal-option storage reads/writes into `src/pages/dashboard/guests/guestDashboardStorage.ts`.
- Hardened demo RSVP config storage reads so invalid JSON, malformed questions, and non-string meal options fall back safely.
- Lowered the file-size guard baseline for `Guests.tsx` from 5192 to 5186 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardStorage.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS after sandbox escalation, 5 files and 17 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5186-line Guests baseline.
- `npm run smoke:csvmapper`: PASS.
- `npm run build`: PASS after sandbox escalation.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests is smaller with focused demo RSVP storage proof and CSV mapper smoke remains green, but live RSVP/public proof still needs approved deploy/postdeploy validation.

### 2026-05-05 7:42 AM PT - P2 Guest-Facing RSVP Demo Storage Split

What changed:
- Moved guest-facing demo RSVP meal config, custom question, and stored response parsing/writing into `src/pages/rsvpDemoStorage.ts`.
- Hardened demo RSVP local storage reads so invalid JSON, malformed questions, empty meal options, and array-shaped response storage fall back safely.
- Lowered the file-size guard baseline for `RSVP.tsx` from 1993 to 1962 lines.

Commands run:
- `npm test -- --run src/pages/rsvpDemoStorage.test.ts src/pages/RSVP.test.tsx src/pages/rsvpDeadline.test.ts`: PASS, 3 files and 117 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 1962-line RSVP baseline.
- `npm run smoke:rsvp`: FAIL in sandbox only with DNS `ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`.
- `npm run smoke:rsvp`: FAIL after network escalation with the existing deployed RSVP 503 responses for all checked paths.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. RSVP is smaller with focused demo-storage proof and local guest-facing tests remain green, but live RSVP proof still needs approved function deploy/postdeploy validation.

### 2026-05-05 7:45 AM PT - P2 Name-Change Snapshot Parser Hardening

What changed:
- Added `parseDocumentSnapshotDraft` to `src/pages/dashboard/planning/nameChangePlannerUi.ts`.
- Updated `NameChangePlannerTab.tsx` to use the parser before committing saved detail notes to document metadata.
- Invalid JSON and array-shaped drafts now remain as local draft text until corrected; blank drafts still clear the saved snapshot.
- Lowered the file-size guard baseline for `NameChangePlannerTab.tsx` from 2499 to 2493 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: PASS, 5 files and 51 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2493-line Name Change planner baseline.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS, 1 file and 1 test.
- `git diff --check`: PASS.

Status:
- PARTIAL. Name Change planner has stronger document metadata parsing proof, but broader dashboard extraction and live proof blockers remain.

### 2026-05-05 7:51 AM PT - P2 Guest Photo Export Helper Split

What changed:
- Moved bucket upload, guestbook, prospect, and curation CSV builders into `src/pages/dashboard/guestPhotoSharingUtils.ts`.
- Added export helper tests for CSV escaping, export filenames, customer-safe curation labels, low-confidence review reasons, and GPS flag export behavior.
- Lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3404 to 3340 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts`: FAIL once because the new export filename test caught a doubled trailing dash.
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoDateTime.test.ts src/pages/dashboard/guestPhotoUploadTime.test.ts src/pages/dashboard/guestPhotoEventDate.test.ts src/lib/aiPhotoOps.test.ts src/lib/aiPhotoPlacement.test.ts`: PASS after tightening filename normalization, 6 files and 22 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3340-line Guest Photo Sharing baseline.
- `npm run proof:v1:ai-rollout`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guest Photo Sharing has stronger export-helper proof and lower file-size risk, but production/live photo proof remains approval-gated.

### 2026-05-05 8:00 AM PT - P2 Guest Photo Recap Export Split

What changed:
- Moved memory-chapter and curated-recap JSON payload builders into `src/pages/dashboard/guestPhotoSharingUtils.ts`.
- Added deterministic export payload tests so recap exports keep summary, highlight, duplicate, chapter, and slideshow fields while the dashboard page gets smaller.
- Lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3340 to 3299 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 1 file and 9 tests.
- `npm run typecheck`: PASS after one type guard fix for nullable bucket names.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3299-line Guest Photo Sharing baseline.
- `npm run proof:v1:ai-rollout`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guest Photo Sharing has stronger recap-export proof and lower file-size risk while AI/photo rollout proof remains green, but production/live photo proof remains approval-gated.

### 2026-05-05 8:04 AM PT - P2 Guest Photo Share-Link Export Split

What changed:
- Moved photo share message, active share-message list, known-link list, share-pack CSV, and album-link CSV builders into `src/pages/dashboard/guestPhotoSharingUtils.ts`.
- Added tests for active-only share messages, known-link extraction, CSV escaping, backup-folder export rows, and empty-export fallbacks.
- Lowered the file-size guard baseline for `GuestPhotoSharing.tsx` from 3299 to 3236 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 1 file and 10 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 3236-line Guest Photo Sharing baseline.
- `npm run proof:v1:ai-rollout`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guest Photo Sharing has stronger share/export proof and lower file-size risk while preserving copy/download behavior, but production/live photo proof remains approval-gated.

### 2026-05-05 8:09 AM PT - P2 Seating Table-Summary Export Hardening

What changed:
- Moved table-summary CSV construction from `Seating.tsx` into `src/pages/dashboard/seating/seatingDashboardUtils.ts`.
- Hardened table-summary meal-count export so each meal label is neutralized before labels are joined into one CSV cell.
- Lowered the file-size guard baseline for `Seating.tsx` from 2271 to 2259 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: FAIL once because the new test exposed formula labels inside joined meal-count cells were not individually neutralized.
- `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS after the meal-label neutralization fix, 2 files and 10 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 2259-line Seating baseline.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Seating has stronger table-summary export proof and reduced spreadsheet-injection risk, but broader dashboard extraction and live RSVP/public proof blockers remain.

### 2026-05-05 8:15 AM PT - P2 Guest Export Builder Split

What changed:
- Moved main guest export, thank-you due, checked-in, address collection, household labels, and event-attendance CSV builders into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused tests for spreadsheet-safe formula neutralization, invite-token URL encoding in owner-only exports, address fields, grouped household labels, event invitation scoping, and custom answers.
- Lowered the file-size guard baseline for `Guests.tsx` from 5186 to 5060 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS, 4 files and 16 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5060-line Guests baseline.
- `npm run smoke:csvmapper`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests has stronger export proof and lower file-size risk while preserving existing owner export features, but live RSVP/public proof blockers remain.

### 2026-05-05 8:19 AM PT - P2 Guest Queue Scoring Split

What changed:
- Moved guest issue counting, priority scoring, last-name sorting, and checked-in display ordering into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused tests for unresolved RSVP issue counts, priority scoring near the wedding date, deterministic last-name sorting, priority ordering, and check-in mode ordering.
- Lowered the file-size guard baseline for `Guests.tsx` from 5060 to 5015 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS, 4 files and 18 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 5015-line Guests baseline.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests has stronger queue/sorting proof and lower file-size risk while preserving guest operations behavior, but live RSVP/public proof blockers remain.

### 2026-05-05 8:27 AM PT - P2 Guest RSVP Operations Summary Split

What changed:
- Moved guest contact coverage, RSVP operations counters, recommended action selection, RSVP completeness, campaign readiness, and operations queue construction into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused tests for pending/no-contact counters, missing meal and plus-one counters, ceremony/reception decline parsing, recommended-action priority, bounded readiness/completeness math, and stable operations queue construction.
- Lowered the file-size guard baseline for `Guests.tsx` from 5015 to 4932 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: FAIL once because a new weighted-readiness expected value was incorrect.
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS after correcting the expectation, 4 files and 22 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 4932-line Guests baseline.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests has stronger owner-facing RSVP operations proof and lower file-size risk while preserving existing guest operations behavior, but live RSVP/public proof blockers remain.

### 2026-05-05 8:34 AM PT - P2 Guest Household And RSVP Insight Rollup Split

What changed:
- Moved household grouping, meal-choice rollups, custom-answer rollups, song-request extraction, and filtered meal summary counts into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused tests for deterministic household sorting/grouping, meal rollup fallbacks, custom-answer aggregation, song request extraction, and dietary-note/meal summary counts.
- Lowered the file-size guard baseline for `Guests.tsx` from 4932 to 4860 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS, 4 files and 24 tests.
- `npm run typecheck`: FAIL once because a heterogeneous custom-answer test fixture needed an explicit `GuestWithRSVP[]` annotation.
- `npm run typecheck`: PASS after the fixture type annotation fix.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS with the new 4860-line Guests baseline.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Guests has stronger household and RSVP insight proof and lower file-size risk while preserving dashboard UI, exports, and guest operations behavior, but live RSVP/public proof blockers remain.

### 2026-05-05 11:18 AM PT - P0 Public-Site RSVP Widget Access Gate Hardening

What changed:
- Added `supabase/functions/public-site-rsvp-submit/index.ts` so the rendered public RSVP widget submits through a server-side gate instead of inserting into `site_rsvps` directly from the browser.
- The new Edge Function reuses `canReadPublicSubresource`, validates public/password/invite access, applies durable `rsvp_rate_limit` submit limiting, and writes only after the shared public access gate is satisfied.
- Updated `src/sections/components/RsvpSection.tsx` to carry the existing invite token/password session into the gated submit path.
- Updated `src/sections/variants/rsvp/multiEvent.tsx` so the builder-backed multi-event RSVP variant uses the same gated function instead of resolving a site id and inserting directly.
- Added `supabase/migrations/20260505102000_site_rsvps_public_gate_rls.sql` so direct anon/authenticated `site_rsvps` inserts are defense-in-depth limited to open public sites. The migration also adds `guest_email` so the multi-event template preserves the email field it already collected.
- Added the new function to prereq proof tracking.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/lib/publicSiteAccess.test.ts`: FAIL once because the RSVP section test mock used a non-hoisted Vitest variable.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/lib/publicSiteAccess.test.ts`: PASS after the test harness fix, 3 files and 32 tests.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx src/lib/publicSiteAccess.test.ts`: PASS after adding the multi-event coverage, 4 files and 37 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. The public RSVP widget bypass is closed locally without removing the widget feature. Production still needs the migration applied, the new function deployed, and live public/RSVP proof rerun. No deploy was run.

### 2026-05-05 11:23 AM PT - P1 Bulk Messaging Service-Role Projection Hardening

What changed:
- Replaced `select("*, wedding_sites(...)")` in `supabase/functions/send-bulk-message/index.ts` with explicit `MESSAGE_DELIVERY_SELECT`.
- Kept the fields needed for message authorization, audience selection, scheduled-send checks, body/subject delivery, and recipient-filter refresh.
- Replaced a raw `sentErr` console log in the email-send cap branch with a fixed reason-code log.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local service-role messaging overfetching is reduced and raw diagnostic leakage is narrowed without removing messaging behavior. Live messaging authorization proof remains required. No deploy was run.

### 2026-05-05 11:26 AM PT - P1 Edge Function Raw Diagnostic Cleanup

What changed:
- Replaced raw error-object logs with fixed reason-code logs in:
  - `supabase/functions/submit-contact-request/index.ts`
  - `supabase/functions/setup-bootstrap/index.ts`
  - `supabase/functions/photo-upload-moderate/index.ts`
  - `supabase/functions/vault-resolve-entry-link/index.ts`
- Kept existing customer-facing fallback messages and request behavior unchanged.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local raw diagnostic leakage is narrowed for four Edge Function branches. Live function deploy/proof remains required. No deploy was run.

### 2026-05-05 11:28 AM PT - P1 Photo Album Lookup Diagnostic Cleanup

What changed:
- Replaced the raw `albumErr` log in `supabase/functions/photo-album-manage/index.ts` with the fixed `ALBUM_LOOKUP_FAILED` reason code.
- Kept the existing customer-safe album-load fallback message and photo album management behavior unchanged.
- Expanded `src/lib/launchEdgeFunctions.test.ts` so the photo album guard requires the fixed lookup reason code and the generic hardened diagnostic guard catches future `albumErr` raw logs.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local photo-management diagnostic leakage is narrowed. Live function deploy/proof remains required. No deploy was run.

### 2026-05-05 11:31 AM PT - P0 RSVP Guest Payload Minimization

What changed:
- Removed `wedding_site_id` from the sanitized RSVP guest payload returned by `supabase/functions/validate-rsvp-token/index.ts`.
- Updated the frontend RSVP `Guest` type and demo guest mapping so browser code no longer expects that internal site identifier.
- Preserved existing RSVP behavior: invite-link lookup, manual session lookup, household RSVP, event RSVP, and submit flows remain covered by the existing RSVP test suite.
- Added a static guard in `src/lib/launchEdgeFunctions.test.ts` that blocks reintroducing `wedding_site_id: guest.wedding_site_id` inside `sanitizeGuest`.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx`: PASS, 2 files and 134 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local RSVP browser payload exposure is reduced. Live RSVP function deploy/proof remains required. No deploy was run.

### 2026-05-05 11:32 AM PT - P0 Service Worker Cache Safety Hardening

What changed:
- Updated `public/sw.js` so the service worker refuses to cache any request with an `Authorization` header.
- Removed the cached `/` fallback from failed static fetches. The service worker now returns only a matching cached request for the original static asset, avoiding stale HTML fallback behavior.
- Kept same-origin static asset caching intact and left Supabase function/auth/rest/storage paths excluded.
- Expanded `src/lib/serviceWorkerSafety.test.ts` to guard the auth-header exclusion, query-string exclusion, no root fallback, and API/storage/function exclusions.

Commands run:
- `npm test -- --run src/lib/serviceWorkerSafety.test.ts`: PASS, 1 file and 1 test.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local service-worker cache safety is tighter. Live browser cache proof remains postdeploy/QA-gated. No deploy was run.

### 2026-05-05 11:35 AM PT - P0 Public RSVP Widget Diagnostic Guard Hardening

What changed:
- Updated `supabase/functions/public-site-rsvp-submit/index.ts` to use explicit fixed reason codes for insert and unexpected failure branches.
- Added the new public RSVP submit function to the hardened Edge Function diagnostic sweep in `src/lib/launchEdgeFunctions.test.ts`.
- Added guards requiring `PUBLIC_SITE_RSVP_INSERT_FAILED` and `UNEXPECTED_PUBLIC_SITE_RSVP_FAILURE` so the new function follows the same non-raw diagnostic standard as other launch-sensitive functions.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local diagnostics for the new public RSVP widget submit function are stronger. Production still requires function deploy/live proof. No deploy was run.

### 2026-05-05 11:37 AM PT - P0 RSVP Rate-Limit Token Marker Hardening

What changed:
- Updated `supabase/functions/submit-rsvp/index.ts` so `rsvp_rate_limit.guest_token` stores a hashed subject marker instead of the first 16 characters of the invite token.
- Updated `supabase/functions/validate-rsvp-token/index.ts` so lookup/event/session rate-limit rows also use hashed subject markers instead of raw subject prefixes.
- Preserved durable lookup/submit throttling and the existing RSVP behavior.
- Added static guards in `src/lib/launchEdgeFunctions.test.ts` blocking the old raw-token-prefix writes and requiring the hashed marker paths.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/RSVP.test.tsx`: PASS, 2 files and 134 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local RSVP secret-retention risk is reduced. Live RSVP function deploy/proof remains required. No deploy was run.

### 2026-05-05 11:39 AM PT - P1 Registry Preview Rate-Limit Identifier Hardening

What changed:
- Updated `supabase/functions/registry-preview/index.ts` so registry preview throttling stores a hashed user subject marker instead of `userId.slice(0, 16)` in `rsvp_rate_limit.guest_token`.
- Preserved durable per-user/IP throttling for registry preview requests.
- Added static guards in `src/lib/launchEdgeFunctions.test.ts` blocking the old raw user-id-prefix write and requiring the `safeSubjectMarker` path.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local registry preview identifier-retention risk is reduced. Live registry preview proof remains deploy/QA-gated. No deploy was run.

### 2026-05-05 11:41 AM PT - P0 Public Gate Rate-Limit Identifier Hardening

What changed:
- Updated `supabase/functions/public-site-access/index.ts` so password-attempt rate-limit rows store a hashed subject marker instead of a raw site-slug prefix.
- Updated `supabase/functions/public-site-rsvp-submit/index.ts` so public RSVP widget submit rate-limit rows store a hashed subject marker instead of a raw site-slug prefix.
- Preserved public password gate throttling and public RSVP widget throttling behavior.
- Added static guards in `src/lib/launchEdgeFunctions.test.ts` blocking `guest_token: slug.slice(0, 16)` in both public gate functions and requiring the `safeSubjectMarker` paths.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx`: PASS, 4 files and 37 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public-gate identifier-retention risk is reduced. Live public access/widget proof remains deploy-gated. No deploy was run.

### 2026-05-05 11:45 AM PT - P0 Guest Photo Upload Backend Error Hardening

What changed:
- Updated `supabase/functions/photo-upload/index.ts` so `photo_uploads` row insert failures throw the fixed `PHOTO_UPLOAD_ROW_INSERT_FAILED` sentinel instead of the raw database error message.
- Preserved existing guest behavior: failed files still return the calm upload failure copy and the upload loop continues collecting per-file failures.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the sentinel and block the raw `throw new Error(error.message)` pattern in guest photo upload.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 24 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local guest photo upload diagnostic leakage risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 11:46 AM PT - P0 Shared Public Rate-Limit Error Hardening

What changed:
- Updated `supabase/functions/_shared/rateLimit.ts` so public submission rate-limit count and record failures use fixed sentinels instead of raw Supabase error messages.
- Preserved existing public rate-limit behavior for vendor inquiries, guest contact updates, prospect submissions, and vault/contact-style public submission flows that use the helper.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to cover the shared helper and block `throw new Error(error.message)` there.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 25 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local shared public-submission diagnostic leakage risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 11:48 AM PT - P0 SMS RSVP Inbound Diagnostic Hardening

What changed:
- Updated `supabase/functions/sms-rsvp-inbound/index.ts` so RSVP update failures store `SMS_RSVP_UPDATE_FAILED` instead of raw database error text.
- Updated the unexpected failure path to store `SMS_RSVP_INBOUND_UNEXPECTED_FAILURE` instead of caught exception text.
- Preserved existing TwiML guest responses and inbound RSVP flow behavior.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require fixed SMS diagnostic codes and block the old raw-message patterns.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `npm run proof:v1:board:md`: PASS. Regenerated the proof board at 2026-05-05 11:49 AM PT.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS, 1 file and 1 test.

Status:
- PARTIAL. SMS/Telnyx remains out of launch scope, but local inbound RSVP diagnostic leakage risk is reduced without removing the flow. No deploy was run.

### 2026-05-05 11:51 AM PT - P1 Planning Data-Boundary Proof Maintenance

What changed:
- Updated `src/lib/dashboardDataBoundary.test.ts` for the current planning vendor service shape.
- The guard now proves `loadVendors` calls the shared query helper with `PLANNING_VENDOR_SELECT` and falls back only to `PLANNING_VENDOR_LEGACY_SELECT` for pre-rating-column environments.
- No product behavior changed; this keeps the data-boundary regression lane aligned with the current no-feature-loss vendor-rating fallback.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/settingsErrorSafety.test.ts`: PASS, 2 files and 15 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local data-boundary proof is current and green. Full validation remains governed by the known live RSVP smoke blocker and deploy-gated proof items. No deploy was run.

### 2026-05-05 11:53 AM PT - P0 Shared Public Submission Subject Hashing

What changed:
- Updated `supabase/functions/_shared/rateLimit.ts` so `public_submission_events.subject` stores a SHA-256 marker instead of the raw subject passed by callers.
- Preserved public submission throttling by using the same marker for subject counts and inserts.
- This protects readable names/identifiers in public rate-limit rows for guest contact lookup, guest contact submit, vendor inquiries/previews, prospect/contact submissions, and vault public submissions that use the shared helper.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the marker path and block the old raw-subject count/insert patterns.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public-submission PII/identifier retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 11:56 AM PT - P0 Public Guestbook/Photo IP Retention Hardening

What changed:
- Updated `supabase/functions/guestbook-submit/index.ts` so public guestbook IP rate-limit checks and inserts use a site-scoped hash marker instead of the raw requester IP.
- Updated `supabase/functions/photo-upload/index.ts` so photo upload IP rate-limit checks and inserts use an album-scoped hash marker instead of the raw requester IP.
- Updated the photo upload site-slug fallback attempt marker to hash the slug before storing it in `photo_upload_attempts.token_hash`.
- Preserved guestbook submit, photo upload, per-network throttling, and per-site/per-album scoping.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require hashed marker paths and block raw requester IP/site-slug storage regressions.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public guestbook/photo identifier retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 11:59 AM PT - P0 Shared Public Submission Requester-IP Hashing

What changed:
- Updated `supabase/functions/_shared/rateLimit.ts` so `public_submission_events.requester_ip` stores a site/scope-scoped SHA-256 marker instead of the raw requester IP.
- Preserved per-IP throttling by using the same marker for IP counts and inserts.
- This protects requester IP retention across vendor inquiry/preview, guest contact lookup/submit, prospect/contact submissions, and vault public submissions that use the shared helper.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the requester-IP marker path and block old raw requester-IP count/insert patterns.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local shared public-submission requester-IP retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:01 PM PT - P0 Shared Public Rate-Limit Marker Contract Cleanup

What changed:
- Updated `supabase/functions/_shared/rateLimit.ts` so the shared public submission rate-limit helper returns `requesterIpMarker` instead of `requesterIp`.
- Preserved existing caller behavior; no current caller uses the return value.
- Made the contract explicit so future callers do not accidentally treat the hashed marker as a raw requester IP.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the marker field and block the misleading old return field.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local helper contract clarity is improved. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:03 PM PT - P0 Shared Public Submission Referrer Sanitization

What changed:
- Updated `supabase/functions/_shared/rateLimit.ts` so shared public submission events store a sanitized referrer.
- The sanitizer removes URL username, password, query string, and hash fragment before writing `public_submission_events.referrer`.
- Preserved diagnostic origin/path context while reducing risk of retaining invite tokens, access artifacts, or other URL secrets from the `Referer` header.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require `safeReferrer`, query/hash stripping, and to block the old raw `referer` header slice.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public-submission URL-secret retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:05 PM PT - P0 Public Guest Telemetry/Prospect Referrer Sanitization

What changed:
- Updated `supabase/functions/guest-hub-track/index.ts` and `supabase/functions/guest-prospect-submit/index.ts` so guest telemetry/prospect referrers are sanitized before storage.
- The sanitizer removes URL username, password, query string, and hash fragment before writing `guest_hub_events.referrer` or prospect metadata.
- Preserved guest hub tracking and guest prospect opt-in behavior.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the safe referrer path in both functions and block the old raw `referer` header slice.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local guest telemetry/prospect URL-secret retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:09 PM PT - P0 Public Guest Hub Tracking Rate-Limit Hardening

What changed:
- Updated `supabase/functions/guest-hub-track/index.ts` to call the shared public submission rate-limit helper before inserting guest hub telemetry rows.
- The rate limit is scoped to `guest_hub_track`, site identity, requester marker, and event subject marker.
- Preserved the existing best-effort telemetry behavior by returning `{ ok: true, tracked: false }` when the request is throttled instead of surfacing a guest-visible error.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the rate-limit scope and soft throttled response path.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public guest hub telemetry abuse risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:11 PM PT - P1 Registry Preview Memory Rate-Limit Key Hardening

What changed:
- Updated `supabase/functions/registry-preview/index.ts` so the in-memory burst limiter uses a hashed requester marker instead of the raw requester IP as the `rateLimitMap` key.
- Preserved the same per-IP burst throttling behavior.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the `registry-preview-memory` marker path and block raw `rateLimitMap.get(ip)` / `rateLimitMap.set(ip, ...)` regressions.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local registry preview identifier-retention risk is reduced. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:14 PM PT - P0 Guest Hub Telemetry Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guest-hub-track/index.ts` to check the shared public access gate before inserting guest hub telemetry.
- The function now reads the explicit gated site projection and evaluates `privacy_mode`, `guest_access_token`, invite token, and password session before writing `guest_hub_events`.
- Updated `src/pages/EventHub.tsx` and `src/pages/EventRecap.tsx` so telemetry calls include the same existing invite-token/password-session access artifacts used by other public subresources.
- Preserved best-effort tracking behavior and guest-facing soft failures.
- Expanded `src/lib/launchEdgeFunctions.test.ts` to require the shared public access gate in `guest-hub-track`.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm test -- --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx`: PASS, 2 files and 13 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public telemetry access-bypass risk is reduced. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:16 PM PT - P0 Guest Hub Access-Artifact Characterization

What changed:
- Exported the guest hub telemetry access-payload builders from `src/pages/EventHub.tsx` and `src/pages/EventRecap.tsx`.
- Added focused tests proving current URL invite tokens take precedence, stored invite tokens are preserved, and password sessions are included for gated telemetry calls.
- This protects the frontend side of the new `guest-hub-track` public access gate without changing guest-facing UI.

Commands run:
- `npm test -- --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx`: PASS, 2 files and 17 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local no-feature-loss proof for gated guest hub telemetry is stronger. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:19 PM PT - P0 Guest Recap Config Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guest-recap-config/index.ts` to call the shared public access gate before returning recap/photo data.
- The function now uses an explicit gated site projection with `privacy_mode` and `guest_access_token`.
- Updated `src/pages/EventRecap.tsx` to send existing invite/password access artifacts as dedicated request headers for valid gated recap views.
- Added tests/static guards proving the recap config endpoint uses `canReadPublicSubresource` and that recap access headers are packaged without query-string token transport.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventRecap.test.tsx`: PASS, 2 files and 36 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public recap subresource access-bypass risk is reduced. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:21 PM PT - P0 Guest Hub Config Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guest-hub-config/index.ts` to call the shared public access gate before returning guest hub settings and couple summary data.
- The function now uses an explicit gated site projection with `privacy_mode` and `guest_access_token`.
- Updated `src/pages/EventHub.tsx` to send existing invite/password access artifacts as dedicated request headers for valid gated hub views.
- Added tests/static guards proving the hub config endpoint uses `canReadPublicSubresource` and that Event Hub access headers are packaged without query-string token transport.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventHub.test.tsx`: PASS, 2 files and 37 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public guest hub subresource access-bypass risk is reduced. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:24 PM PT - P0 Guest Prospect Opt-In Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guest-prospect-submit/index.ts` to verify shared public site access before writing prospect opt-ins and guest hub events.
- The function now uses an explicit gated site projection with `privacy_mode` and `guest_access_token`.
- Event Hub and Recap opt-ins include existing invite/password access artifacts.
- Photo Upload follow-up opt-ins remain supported through a valid active album upload token.
- Added static guards requiring public access gating, upload-token hash validation, and active upload-window checks.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx`: PASS, 3 files and 47 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public prospect opt-in access-bypass risk is reduced while preserving guest hub, recap, and photo upload opt-in behavior. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:26 PM PT - P0 Guestbook Submit Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guestbook-submit/index.ts` to verify shared public site access before inserting guestbook entries.
- The function now uses an explicit gated site projection with `privacy_mode` and `guest_access_token`.
- Updated `src/pages/GuestbookSubmit.tsx` to package existing URL/stored invite tokens and password sessions into guestbook submissions for valid gated links.
- Added focused tests/static guards for guestbook public access gating and frontend access payloads.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestbookSubmit.test.ts`: PASS, 2 files and 31 tests.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local public guestbook write access-bypass risk is reduced while preserving gated guestbook submissions. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:34 PM PT - P0 Vault And Photo Public Contribution Gate Hardening

What changed:
- Updated `supabase/functions/vault-entry-submit/index.ts` so vault text submissions and attachment uploads use the shared public access gate before service-role writes or storage uploads.
- Updated `src/pages/VaultContribute.tsx` to resolve the site through `public-site-access` and package existing invite/password access artifacts into vault attachment and entry submissions.
- Updated `supabase/functions/vault-upload-google-drive/index.ts` so the dormant Google Drive vault upload path also requires shared public access before provider work.
- Updated `supabase/functions/photo-upload/index.ts` so site-slug photo uploads require shared public access; existing album-token upload links remain supported as token-scoped access.
- Updated `src/pages/PhotoUpload.tsx` to package existing invite/password access artifacts into site-slug upload requests.
- Added focused tests/static guards for vault/photo access artifact packaging and for the Edge Functions using `canReadPublicSubresource` instead of `is_published` alone.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/PhotoUpload.test.ts src/pages/VaultContribute.test.ts`: PASS, 3 files and 44 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local vault contribution, vault Drive upload, and site-slug photo upload access-bypass risks are reduced while preserving valid gated guest flows and album-token photo upload links. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:38 PM PT - P0 Guest Contact Lookup Public-Access Gate Hardening

What changed:
- Updated `supabase/functions/guest-contact-lookup/index.ts` so full-name guest-contact lookup uses the shared public access gate before issuing short-lived contact update sessions.
- The lookup function now selects `privacy_mode` and `guest_access_token` server-side and fails closed with an empty match list when the site is password-protected, invite-only, hidden, unpublished, or otherwise inaccessible.
- Updated `src/pages/GuestContactUpdate.tsx` to package existing invite/password artifacts into lookup calls for valid gated guest-contact pages.
- Added focused tests/static guards for guest-contact access artifact packaging and for the lookup function using `canReadPublicSubresource` instead of allowing site-ref-only search.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/GuestContactUpdate.test.ts`: PASS, 2 files and 30 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local guest-contact lookup enumeration/access-bypass risk is reduced while preserving public-site contact lookup and valid gated contact-update flows. Live function/frontend deployment proof remains required. No deploy was run.

### 2026-05-05 12:41 PM PT - P0 Client Error Log Ingestion Hardening

What changed:
- Updated `supabase/functions/log-client-error/index.ts` to use the shared public submission rate limiter before writing diagnostic rows.
- Added metadata sanitization for nested client-controlled metadata, including redaction of token, secret, password, authorization, API key, service-role, and cookie-like keys.
- Sanitized logged routes by stripping query strings and hash fragments before storage.
- Stopped trusting client-supplied `userId` and `weddingSiteId`; the function now infers the user from the auth bearer token and only accepts a site id that belongs to that authenticated user.
- Added static guards proving the rate-limit, metadata sanitization, route sanitization, and no client-supplied identity trust contract.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local diagnostic ingestion abuse and data-retention risk is reduced without removing dashboard client-error logging. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:45 PM PT - P1 Site Translation AI Rate-Limit Hardening

What changed:
- Updated `supabase/functions/translate-site-content/index.ts` so the owner-authenticated site translation route uses the shared durable public submission rate limiter before any OpenAI provider call.
- The limiter is scoped by user, site, and target language, with per-requester and per-subject limits.
- Preserved the existing owner gate, supported-language contract, saved translation shape, and customer-safe provider failure messages.
- Added static regression coverage requiring the translation route to keep auth, owner validation, server-side OpenAI key usage, safe errors, and the new `translate_site_content` rate-limit scope.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local provider-backed AI abuse risk is reduced without removing translation functionality. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:49 PM PT - P1 AI Provider And Vendor Inquiry Email Hardening

What changed:
- Updated `supabase/functions/photo-analyze-batch/index.ts` so authenticated photo AI analysis is rate-limited after owner/collaborator permission checks and before any OpenAI/Gemini provider analysis work.
- Updated `supabase/functions/onboarding-ai-orchestrate/index.ts` so model-backed onboarding orchestration is rate-limited when server credentials are configured, and throttled requests return the deterministic fallback decision instead of making an unbounded provider call.
- Updated `supabase/functions/vendor-profile-inquiry-submit/index.ts` to import shared `escapeHtml` and `sanitizeEmailSubject` helpers from `supabase/functions/_shared/emailSafety.ts`.
- Preserved photo analysis permissions/result shape, onboarding deterministic fallback behavior, and vendor inquiry persistence/email packaging behavior.
- Added static regression coverage for the new AI rate-limit scopes, deterministic fallback-on-throttle behavior, and vendor inquiry shared email-safety helper usage.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm test -- --run src/pages/VendorProfile.test.tsx src/pages/VendorProfileCreate.test.tsx`: PASS, 2 files and 6 tests.
- `npm run smoke:messages`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local provider-abuse and email-template drift risk is reduced without removing AI, vendor inquiry, or messaging behavior. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 12:55 PM PT - P1/P2 Media Export, Moderation, And Vendor Preview Fetch Hardening

What changed:
- Updated `supabase/functions/photo-export-manifest/index.ts` so manifest text fields are spreadsheet-formula neutralized and manifest URLs are protocol-cleaned before export.
- Updated `supabase/functions/photo-upload-moderate/index.ts` so moderation batches dedupe upload IDs and fail when any requested upload ID is missing.
- Updated `supabase/functions/vendor-profile-preview/index.ts` with public fetch hardening: metadata/internal hostname blocking, private IPv4/IPv6 handling, DNS A/AAAA validation, manual redirect revalidation, timeout, HTML content-type checks, and response-size limits.
- Preserved authorized photo manifest exports, valid photo moderation behavior, and vendor profile preview/manual fallback behavior.
- Added static regression coverage for the media export, moderation target, and vendor preview SSRF controls.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 1 file and 26 tests.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/pages/VendorProfile.test.tsx src/pages/VendorProfileCreate.test.tsx`: PASS, 3 files and 32 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local media export/moderation and vendor preview public-fetch risk is reduced without removing the current feature paths. Live function deployment/proof remains required. No deploy was run.

### 2026-05-05 1:01 PM PT - P0/P1 RSVP Submit Payload And Service-Role Inventory Hardening

What changed:
- Updated `supabase/functions/submit-rsvp/index.ts` so the invite-token lookup no longer selects the raw `invite_token` column after the `.eq("invite_token", ...)` match.
- Added bounded text normalization for `mealChoice`, `plusOneName`, and `notes` before RSVP and email queue writes.
- Updated `supabase/functions/public-site-rsvp-submit/index.ts` so optional guest email values must be valid email-shaped strings before `site_rsvps` writes.
- Updated `docs/service-role-authorization-disposition-2026-05-05.md` to include `public-site-rsvp-submit` in the public submission scoped service-role function inventory.
- Added static regression coverage for raw-token selection removal, bounded guest RSVP fields, public-site RSVP email validation, and the complete service-role disposition inventory.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx`: PASS, 3 files and 36 tests.
- `npm run test:security`: FAIL first in sandbox only, Vite could not write `node_modules/.vite-temp/...` due `EPERM`.
- `npm run test:security`: FAIL after escalation because it caught the new photo-analysis rate-limit response using helper `.message` and the missing `public-site-rsvp-submit` service-role disposition entry.
- `npm run test:security`: PASS after fixes, 10 files and 195 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local RSVP payload/data-boundary risk is reduced without removing invite-link or site-widget RSVP behavior. Live RSVP function deployment/proof remains required, and the existing live RSVP 503 blocker is still not cleared. No deploy was run.

### 2026-05-05 1:08 PM PT - P2 Guests RSVP State Utility Split

What changed:
- Moved CSV mapper column-label calculation, guest fallback-state map construction, household-state map construction, exception-state map construction, and segment-label resolution from `src/pages/dashboard/Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Lowered the `Guests.tsx` file-size guard baseline from 4860 to 4799 lines.
- Added focused tests for CSV column labels past `Z`, owner-facing RSVP fallback/household/exception state maps, and static/event-based guest segment labels.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS, 4 files and 27 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run smoke:csvmapper`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local guest dashboard maintainability risk is reduced without removing guest import/export, RSVP, or dashboard behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:12 PM PT - P2 Messages Summary Utility Split

What changed:
- Moved campaign-status summary, delivery-stat summary, and channel-breakdown calculations from `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Lowered the `Messages.tsx` file-size guard baseline from 3572 to 3531 lines.
- Added focused tests for campaign status counts, delivery rates, active/scheduled totals, and email/SMS channel targeted counts.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS, 4 files and 17 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run smoke:messages`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local messaging maintainability risk is reduced without removing messaging behavior. Broader dashboard extraction and live messaging/public proof blockers remain. No deploy was run.

### 2026-05-05 1:18 PM PT - P2 Messages History Analytics Split

What changed:
- Moved history status counts, delivery health, campaign thread rollups, active campaign thread selection, active campaign message sorting, and provider telemetry rollups from `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Lowered the `Messages.tsx` file-size guard baseline again, from 3531 to 3427 lines.
- Added focused tests for campaign threads, active campaign message ordering, delivery health percentages, overdue scheduled counts, and provider telemetry grouping with customer-safe provider wording.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS, 4 files and 18 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run smoke:messages`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local messaging maintainability risk is reduced further without changing message send, schedule, or history behavior. Broader dashboard extraction and live messaging/public proof blockers remain. No deploy was run.

### 2026-05-05 1:22 PM PT - P2 Guests Follow-Up Payload Utility Split

What changed:
- Moved RSVP follow-up summary, exception checklist, missing-meal checklist, no-contact checklist, filtered-email list, saved-segment draft, single follow-up task draft, and generated follow-up task construction from `src/pages/dashboard/Guests.tsx` into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Lowered the `Guests.tsx` file-size guard baseline from 4799 to 4790 lines.
- Added focused tests for the summary/checklist/email/task payloads so owner-facing follow-up copy does not drift silently.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestDisplayUtils.test.ts src/pages/dashboard/guestOpsTime.test.ts src/lib/guestDashboardErrorSafety.test.ts`: PASS, 4 files and 28 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run smoke:csvmapper`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local guest dashboard maintainability risk is reduced without changing guest RSVP follow-up/export behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:27 PM PT - P2 Settings Payload Utility Split

What changed:
- Moved partner-name splitting, settings slug normalization, privacy update payload construction, and RSVP question/meal cleanup from `src/pages/dashboard/Settings.tsx` into `src/pages/dashboard/settings/settingsDashboardUtils.ts`.
- Lowered the `Settings.tsx` file-size guard baseline from 2339 to 2328 lines.
- Added focused tests for account/slug normalization, privacy payload construction, and RSVP settings cleanup/validation.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsDashboardUtils.test.ts src/pages/dashboard/settings/settingsDemoStorage.test.ts src/lib/settingsErrorSafety.test.ts`: FAIL first because the new slug test expected spaces to become hyphens; PASS after correcting the characterization test to preserve current slug behavior, 3 files and 14 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local settings maintainability risk is reduced without changing privacy, notification, RSVP, billing, or template settings behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:32 PM PT - P2 Name Change Planner Document-Intake Utility Split

What changed:
- Moved name-change document option metadata, extraction field labels/placeholders, contract document matching, extracted-field lookup, document creation, and document update helpers from `src/pages/dashboard/planning/NameChangePlannerTab.tsx` into `src/pages/dashboard/planning/nameChangePlannerUi.ts`.
- Lowered the `NameChangePlannerTab.tsx` file-size guard baseline from 2493 to 2414 lines.
- Added focused tests for document metadata, court-order contract matching, duplicate-document prevention, document update semantics, and linked-vs-fallback extracted field lookup.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts src/pages/dashboard/nameChangeOverviewCard.test.ts`: PASS, 3 files and 15 tests.
- `npm run typecheck -- --pretty false`: FAIL once because `NameChangePlannerTab.tsx` still used `normalizeDraftNameChangeDocumentId`; PASS after restoring that import.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local planning maintainability risk is reduced without changing name-change planner document-intake behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:42 PM PT - P2 Guest Photo Sharing And Coordinator Utility Split

What changed:
- Moved photo dashboard counts, memory chapter derivation, highlight/review queues, and duplicate grouping from `src/pages/dashboard/GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotoSharingUtils.ts`.
- Moved coordinator guest stats, coordinator guest sorting, event audience option construction, alert audience counts, and alert-log filtering from `src/pages/dashboard/CoordinatorMode.tsx` into `src/pages/dashboard/coordinator/coordinatorDashboardUtils.ts`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 3236 to 3188 lines.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2794 to 2773 lines.
- Added focused tests for photo recap/curation derivations and coordinator queue/audience/filter derivations.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/photoAnalysisCustomerCopy.test.ts src/lib/memoryFlowReadiness.test.ts`: PASS, 3 files and 18 tests.
- `npm test -- --run src/pages/dashboard/coordinator/coordinatorDashboardUtils.test.ts src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/lib/coordinatorCheckInQueue.test.ts src/lib/coordinatorAlertLogView.test.ts`: PASS, 4 files and 12 tests.
- `npm run typecheck -- --pretty false`: FAIL once because extracted/tested types needed explicit `SimilarPhotoGroup.key` and narrower test fixture maps; PASS after tightening those types.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local photo/coordinator maintainability risk is reduced without changing guest photo, recap, check-in, Q&A, timeline, or alert behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:48 PM PT - P2 Seating Export And Check-In Utility Split

What changed:
- Moved seating assigned/arrived/unassigned derivations, table guest lookup, seat-picker option filtering, check-in candidate filtering, demo auto-table generation, demo auto-seat assignment generation, print report HTML generation, and seating-layout SVG generation from `src/pages/dashboard/Seating.tsx` into `src/pages/dashboard/seating/seatingDashboardUtils.ts`.
- Lowered the `Seating.tsx` file-size guard baseline from 2259 to 2169 lines.
- Added focused tests for the extracted seating derivations, demo seating builders, and escaped export builders.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/seating/seatingDemoStorage.test.ts`: PASS, 3 files and 21 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local seating maintainability risk is reduced without changing seating, catering handoff, check-in, demo auto-seat/auto-table, print/PDF, or SVG export behavior. Broader dashboard extraction and live RSVP/public proof blockers remain. No deploy was run.

### 2026-05-05 1:57 PM PT - P2 Messages History And Reachability Utility Split

What changed:
- Moved message history filtering, audience reachability counts, audience breakdown rollups, and itinerary-segment performance rollups from `src/pages/dashboard/Messages.tsx` into `src/pages/dashboard/messages/messageDashboardUtils.ts`.
- Lowered the `Messages.tsx` file-size guard baseline from 3427 to 3386 lines.
- Added focused tests for history filters, audience reachability, audience breakdown, and event segment performance.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts`: FAIL once because the characterization expected an itinerary option label in the generic audience breakdown; PASS after preserving the current `Itinerary segment` label behavior, 4 files and 20 tests.
- `npm run typecheck -- --pretty false`: FAIL once because the new test fixture included `count` outside the helper contract; PASS after narrowing the fixture to `value` and `label`.
- `npm run guard:file-size`: PASS.
- `npm run smoke:messages`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. Local messaging maintainability risk is reduced without changing compose, send, schedule, retry, permission, or history behavior. Broader dashboard extraction and live messaging/public proof blockers remain. No deploy was run.

## Known Blockers

- Full local validation lane should be rerun after the latest deploy repair commits are finalized, although the guarded deploy preflight passed typecheck/build and full postdeploy proof passed.
- Local branch is ahead of GitHub until pushed.
- Full cross-table/storage data-integrity proof still needs a secure service-role proof environment; current postdeploy integrity proof is anon-limited.
- Server-side `OPENAI_API_KEY` remains absent from the prereq environment used by the proof script, so live model-backed AI proof remains gated/deferred even though static/browser AI exposure proof passed.
- SMS/Telnyx remains out of launch scope.

### 2026-05-05 2:15 PM PT - Approved Production Deploy And Live Proof Repair

What changed:
- Ran the approved guarded production deploy. Vercel deployed the current frontend to `https://dayof.love` with production deployment `dpl_3q71A1vTz9gc9k5tY1yvRrdVAvsm`.
- Applied approved Supabase migrations `20260505100000_vendor_rating_and_inquiry_context.sql` and `20260505102000_site_rsvps_public_gate_rls.sql`.
- Deployed public/guest Edge Functions to project `atuzuobpprjstfmdnwso`: `public-site-rsvp-submit`, `public-site-access`, `public-registry-items`, `public-itinerary-by-slug`, and `validate-rsvp-token`.
- Fixed the live `validate-rsvp-token` boot error by removing a redeclared `rsvpSession` binding and making the shared signed-session helper accept interface payloads cleanly during Supabase bundling.
- Updated `scripts/rsvp_smoke.js` so strict RSVP proof uses the hardened invite-token-to-short-lived-session flow instead of submitting durable invite tokens.
- Updated `scripts/smoke_checkin_guard.js` to verify the extracted check-in sorting helper and its test coverage instead of an obsolete inline `Guests.tsx` pattern.

Commands run:
- `npm run deploy:prod`: initial run stopped on stale lock; forced rerun deployed Vercel successfully but failed postdeploy before backend repair.
- `supabase db push --linked --yes`: PASS, applied two pending migrations.
- `supabase functions deploy public-site-rsvp-submit --project-ref atuzuobpprjstfmdnwso --no-verify-jwt`: PASS.
- `supabase functions deploy validate-rsvp-token --project-ref atuzuobpprjstfmdnwso --use-api --no-verify-jwt`: PASS after code boot fix.
- `supabase functions deploy public-site-access --project-ref atuzuobpprjstfmdnwso --no-verify-jwt`: PASS.
- `supabase functions deploy public-registry-items --project-ref atuzuobpprjstfmdnwso --no-verify-jwt`: PASS.
- `supabase functions deploy public-itinerary-by-slug --project-ref atuzuobpprjstfmdnwso --no-verify-jwt`: PASS.
- `npm run smoke:checkin`: PASS.
- `npm run smoke:rsvp:strict`: PASS.
- `npm run proof:v1:prereqs`: PASS, live edge runtime warnings 0.
- `npm run proof:v1:guests-rsvp-ops`: PASS, 3/3.
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: PASS, 4/4.
- `npm run proof:v1:postdeploy`: PASS, 8/8.

Live proof status:
- PASS: canonical route smoke, 35/35.
- PASS: prereqs, including live Edge Function readiness for `validate-rsvp-token` and `public-site-rsvp-submit`.
- PASS: AI rollout/static exposure checks, with live model key still deferred/gated.
- PASS: runtime wording truth, 18 checked routes.
- PASS: public quality, including canonical proof-site identity/date check.
- PASS: guests/RSVP ops, including strict short-lived-session RSVP smoke, CSV mapper guard, and check-in guard.
- PASS: anon-limited data integrity proof.

Status:
- PARTIAL overall production hardening. The approved production deploy is live and postdeploy proof is green for the current non-SMS launch surface, but full 10/10 readiness still depends on finishing remaining P1/P2 hardening, service-role integrity proof, live model-key proof when secrets are configured, and pushing/committing the local branch.

### 2026-05-05 2:28 PM PT - P1 Messaging Viewer Mutation Hardening

What changed:
- Hardened `send-bulk-message`, `send-wedding-email`, and `queue-guest-followups` so collaborators must be `planner` or `coordinator` with the relevant permission before mutating messaging or guest follow-up state.
- Scheduled bulk-message processing now filters manageable site ids through the same role-aware mutation helper, so queued sends cannot be processed under a viewer-only collaborator grant.
- Updated frontend planner permission helpers so `viewer` remains read-only even if a stale explicit permission array includes `messages` or `guests`.
- Preserved owner, planner, and coordinator flows; this batch only closes the viewer mutation gap.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 2 files and 37 tests.
- `npm run smoke:messages`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. Local email/messaging authorization risk is narrowed with focused proof. No deploy was run, so live messaging authorization proof remains open before marking this P1 item fully done.

### 2026-05-05 2:35 PM PT - P1 Photo/Media Viewer Mutation Hardening

What changed:
- Hardened `photo-album-create`, `photo-export-manifest`, `photo-album-manage`, `photo-upload-moderate`, and `photo-analyze-batch` so photo/media mutations, album creation, exports, and AI analysis require owner access or a `planner`/`coordinator` collaborator role.
- Preserved current planner/coordinator role-preset behavior when older collaborator rows do not include a permissions array, while still enforcing explicit `photos`/`media` permissions when that array is present.
- Blocked viewer collaborators from creating albums, exporting photo manifests, changing album links/windows, moderating photos, or triggering photo analysis even if a stale explicit permission array contains `photos` or `media`.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 2 files and 37 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. Local photo/media service-role authorization risk is narrowed with static proof. No deploy was run, so live service-role/RLS proof remains open.

### 2026-05-05 2:43 PM PT - Shared Collaborator Permission Helper

What changed:
- Added `supabase/functions/_shared/collaboratorPermissions.ts` for shared collaborator mutation authorization helpers.
- Replaced local duplicate helper implementations in messaging and photo/media Edge Functions with imports from the shared helper.
- Kept the already-proven behavior: owners retain access, planner/coordinator roles can mutate when the relevant permission rules allow it, and viewers remain read-only even with stale explicit permission arrays.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 2 files and 38 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This improves maintainability and lowers future permission-drift risk. No deploy was run, so live service-role/RLS and live messaging authorization proof remain open.

### 2026-05-05 2:46 PM PT - Public Site Invite URL Cleanup

What changed:
- Added `getUrlWithoutPublicAccessToken` in `SiteView` and use it after a valid invite token is captured.
- Public invite-only site URLs now remove `?token=` from the address bar after storing the access artifact in slug-scoped `sessionStorage`.
- Preserved other query params and hash fragments, so language/deep-link state is not lost.

Commands run:
- `npm test -- --run src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 3 files and 44 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. Local browser-token exposure risk is reduced. No deploy was run, so production behavior is unchanged until an approved deploy.

### 2026-05-05 2:53 PM PT - Guest Route Invite URL Cleanup

What changed:
- Added `src/lib/publicAccessArtifacts.ts` to centralize slug-scoped public invite token and password-session storage keys, access-artifact packaging, and visible `token` query cleanup.
- Updated `SiteView`, Event Hub, Event Recap, and site-slug Photo Upload to use the shared helper.
- Guest invite links still work, current URL tokens still take precedence, and stored access artifacts still support gated subresource calls after the visible token is removed.

Commands run:
- `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/pages/SiteView.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/PhotoUpload.test.ts`: PASS, 5 files and 36 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. Local browser-token exposure risk is further reduced across guest routes. No deploy was run, so production behavior is unchanged until an approved deploy.

### 2026-05-05 2:57 PM PT - Public Contribution Access Artifact Consolidation

What changed:
- Updated Vault Contribution, Guest Contact Update, Guestbook Submit, public RSVP section submit, and multi-event RSVP section submit to use `src/lib/publicAccessArtifacts.ts`.
- Vault Contribution, Guest Contact Update, and Guestbook Submit now capture valid invite tokens into slug-scoped session storage and remove the visible `token` query parameter on first load.
- Preserved valid gated contribution flows by keeping current-link tokens preferred and using stored invite/password artifacts for later subresource calls.

Commands run:
- `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/pages/GuestContactUpdate.test.ts src/pages/GuestbookSubmit.test.ts src/pages/VaultContribute.test.ts src/sections/components/RsvpSection.test.tsx src/sections/variants/rsvp/multiEvent.test.tsx src/pages/SiteView.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/PhotoUpload.test.ts`: PASS, 10 files and 68 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. Local browser-token exposure and access-artifact drift risk are reduced across public contribution surfaces. No deploy was run, so production behavior is unchanged until an approved deploy.

### 2026-05-05 3:08 PM PT - Planning Data-Boundary Service Extraction

What changed:
- Moved planning site metadata, guest-count lookup, seating-readiness lookup, and total-budget persistence out of `src/pages/dashboard/Planning.tsx` into `src/pages/dashboard/planning/planningService.ts`.
- Added explicit planning service projections for the site metadata, total-budget, and seating-readiness reads.
- Updated the dashboard data-boundary regression test so Planning cannot quietly reintroduce direct page-level site/guest reads for these flows.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts`: PASS, 3 files and 16 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This reduces direct Supabase/page-coupling risk in the planning dashboard without changing planning behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:12 PM PT - Planning Sub-Tab Service Extraction

What changed:
- Moved address-collection site/guest reads, song-request site/RSVP reads, playlist save, and song-question enablement from planning sub-tabs into `src/pages/dashboard/planning/planningService.ts`.
- Added explicit service projections for address collection and song request flows.
- Extended static data-boundary proof so `AddressCollectionTab.tsx` and `SongRequestsTab.tsx` cannot quietly reintroduce direct Supabase page imports/calls for these paths.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts`: PASS, 3 files and 18 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows planning direct-data-access drift while preserving address collection and song request behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:18 PM PT - Seating Lookup Service Extraction

What changed:
- Moved the seating lookup page's active-site resolution, latest seating event lookup, valid assignment reads, table reads, guest reads, and lookup-row mapping into `src/pages/dashboard/seating/seatingService.ts`.
- Added explicit seating lookup projections for events, assignments, tables, and guests.
- Extended static data-boundary proof so the seating lookup page cannot quietly reintroduce direct Supabase or active-site imports.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingDemoStorage.test.ts`: PASS, 4 files and 34 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows seating lookup direct-data-access drift while preserving the quick lookup feature. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:25 PM PT - Coordinator Mode Service Extraction

What changed:
- Moved Coordinator Mode bootstrap reads, event-invitation mapping, Q&A reads, guest check-in updates, day-of alert inserts, manual Q&A inserts, and Q&A answer updates into `src/pages/dashboard/coordinator/coordinatorService.ts`.
- Removed direct Supabase and active-site imports from `CoordinatorMode.tsx`.
- Added explicit Coordinator service projections for guests, itinerary events, event invitations, and Q&A rows.
- Lowered the file-size guard baseline for `CoordinatorMode.tsx` from 2773 to 2736 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts src/pages/dashboard/coordinator/coordinatorDashboardUtils.test.ts src/pages/dashboard/coordinator/coordinatorStorage.test.ts src/lib/coordinatorCheckInQueue.test.ts src/lib/coordinatorAlertLogView.test.ts src/lib/coordinatorQnaFlow.test.ts`: PASS, 7 files and 29 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows coordinator direct-data-access drift while preserving day-of coordinator behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:31 PM PT - Messages Scheduled Campaign Service Boundary

What changed:
- Moved the dashboard save-the-date scheduled campaign insert behind `src/pages/dashboard/messages/messageService.ts`.
- Added an explicit `MessageInsertPayload` contract for that message insert.
- Extended static data-boundary proof so the save-the-date path cannot quietly reintroduce direct page-owned `supabase.from('messages').insert(payload)`.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageDemoStorage.test.ts src/pages/dashboard/messageTemplateVariables.test.ts src/lib/guestMessageLanguagePreview.test.ts`: PASS, 5 files and 33 tests.
- `npm run typecheck -- --pretty false`: initially FAIL on broad inferred payload type, then PASS after annotating `payload: MessageInsertPayload`.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows messaging direct-data-access drift while preserving scheduled save-the-date behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:49 PM PT - Itinerary Template Insert Service Boundary

What changed:
- Moved the itinerary timeline-template event insert behind `src/pages/dashboard/itineraryService.ts`.
- Added a pure insert-row builder for site-scoped template events.
- Extended static data-boundary proof so the template path cannot quietly reintroduce direct page-owned `supabase.from('itinerary_events').insert(newEvents.map(...))`.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryDateTime.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 5 files and 23 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows itinerary direct-data-access drift while preserving timeline-template behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 3:57 PM PT - Vault Dashboard Service Boundary

What changed:
- Moved Vault dashboard site/config/entry reads, hosted-storage provider persistence, config create/upsert/update/delete, entry create/delete, and anniversary recap draft update into `src/pages/dashboard/vaultService.ts`.
- Added explicit Vault service projections for `wedding_sites`, `vault_configs`, and `vault_entries`.
- Updated the static dashboard data-boundary guard so `Vault.tsx` cannot quietly reintroduce direct `wedding_sites`, `vault_configs`, or `vault_entries` table calls.

Commands run:
- `npm test -- src/pages/dashboard/vaultService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 2 files and 15 tests.
- `npm run typecheck`: initial FAIL on two service typing errors, then PASS after narrowing service row types before using `site.id`.
- `npm run lint`: PASS with existing warning backlog, 553 warnings and 0 errors.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows Vault direct-data-access drift while preserving vault loading, config management, entry management, rollback, and recap behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 4:00 PM PT - Overview Intelligence Service Boundary

What changed:
- Moved Overview intelligence-dismissal persistence and interactive-suggestion hide writes into `src/pages/dashboard/overviewService.ts`.
- Added a pure merge helper so persisted intelligence dismissals preserve existing `wedding_data` and `meta` fields.
- Updated the static dashboard data-boundary guard so these Overview paths cannot quietly reintroduce page-owned writes.

Commands run:
- `npm test -- src/pages/dashboard/overviewService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 2 files and 15 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS with existing warning backlog, 553 warnings and 0 errors.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows Overview direct-data-access drift while preserving dismissal, demo-mode, suggestion hide, and toast behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-07 1:26 PM PT - No-Deploy Messages Delivery Query Bounds

What changed:
- Added explicit query caps to `src/pages/dashboard/messages/messageService.ts` for dashboard delivery-history reads.
- `loadMessageDeliveries(messageIds)` now deduplicates requested ids, caps the message-id filter set at 50, and caps returned rows at 1000 while preserving newest-first ordering.
- `loadMessageItineraryAudience(weddingSiteId)` now caps visible itinerary-event reads at 200 and invitation fan-out at 10000 while preserving the current event-ordering and audience-option behavior.
- Added `src/pages/dashboard/messages/messageService.boundary.test.ts` to pin the stable caps and prevent quiet removal of the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 4/4.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run proof:v1:comms-center`: PASS, 3/3.

Status:
- PARTIAL. This narrows one high-volume dashboard query surface without changing the current Messages workflow. No deploy was run, so live proof status is unchanged.

### 2026-05-07 1:31 PM PT - No-Deploy Public Registry Query Cap Alignment

What changed:
- Exported a stable `MAX_REGISTRY_ITEMS` cap from `src/pages/dashboard/registry/registryService.ts`.
- `publicFetchRegistryItems(...)` now sends that cap through the `public-registry-items` Edge Function call and applies the same cap to the direct anon fallback query.
- `supabase/functions/public-registry-items/index.ts` now aligns its request clamp/default to 500 items instead of the older 100-item default.
- Extended `src/pages/dashboard/registry/registryService.test.ts` to pin the bounded public-read contract across the browser service and the Edge Function source.

Commands run:
- `npm test -- --run src/pages/dashboard/registry/registryService.test.ts src/sections/components/RegistrySection.test.tsx src/lib/launchEdgeFunctions.test.ts`: PASS, 57/57.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run proof:v1:registry`: PASS, 4/4 automated checks green; manual runtime registry proof still pending.

Status:
- PARTIAL. This keeps public registry reads bounded and consistent across local service and function paths without changing the existing public registry layout behavior. No deploy was run, so production runtime registry truth is still deploy-gated/manual-proof-pending.

### 2026-05-07 1:35 PM PT - No-Deploy Coordinator Bootstrap Query Bounds

What changed:
- Added explicit coordinator bootstrap caps in `src/pages/dashboard/coordinator/coordinatorService.ts`.
- Guest bootstrap reads now cap at 2000 rows, itinerary-event reads cap at 200 rows, and coordinator event-invitation fan-out caps at 10000 rows.
- Extended `src/pages/dashboard/coordinator/coordinatorService.test.ts` to pin the stable caps and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 3/3.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run proof:v1:coordinator-dayof`: PASS, 5/5 automated checks green.

Status:
- PARTIAL. This keeps coordinator bootstrap fan-out bounded without changing the current coordinator/day-of workflow shape. No deploy was run, so live runtime/manual coordinator proof expectations are unchanged.

### 2026-05-07 1:39 PM PT - No-Deploy Admin Log Query Bounds

What changed:
- Added explicit `MAX_ERROR_LOG_ROWS` and `MAX_AUDIT_LOG_ROWS` caps in the dashboard admin-log services.
- `loadDashboardErrorLogs()` now uses a named cap instead of a literal row limit.
- `loadDashboardAuditLogs()` now uses the shared audit cap for guest-audit rows and action-audit rows, and the guest-name follow-up query now slices the guest-id fan-out to the same cap.
- Added `src/pages/dashboard/adminLogServices.test.ts` to pin the stable cap exports and bounded query shape; refreshed `src/pages/dashboard/AuditLogs.query.test.ts` so it checks the current service boundary instead of stale page-owned query text.
- `src/lib/actionAudit.ts` now clamps caller-provided app-action audit list limits to `MAX_APP_ACTION_AUDIT_ROWS = 100`, and `src/lib/actionAudit.test.ts` now pins that bounded helper contract.

Commands run:
- `npm test -- --run src/lib/actionAudit.test.ts src/pages/dashboard/adminLogServices.test.ts src/pages/dashboard/AuditLogs.query.test.ts`: PASS, 8/8.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps admin log/dashboard history reads bounded without changing the current audit or error-log UI flow. No deploy was run.

### 2026-05-07 1:41 PM PT - No-Deploy Seating Lookup Query Bounds

What changed:
- Added explicit `MAX_SEATING_LOOKUP_TABLE_IDS = 500` and `MAX_SEATING_LOOKUP_GUEST_IDS = 2000` caps in `src/pages/dashboard/seating/seatingService.ts`.
- Seating lookup now slices distinct assignment-derived table ids and guest ids to those caps before the follow-up `seating_tables` and `guests` reads.
- Extended `src/pages/dashboard/seating/seatingService.test.ts` to pin the stable cap exports and the bounded lookup fan-out shape.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingService.test.ts`: PASS, 9/9.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `npm run proof:v1:seating-continuity`: PASS, 3/3 automated checks green.

Status:
- PARTIAL. This keeps seating lookup fan-out bounded without changing the current quick lookup, seating assignment, or check-in workflow shape. No deploy was run.

### 2026-05-07 1:44 PM PT - No-Deploy Vault Dashboard Query Bounds

What changed:
- Added explicit `MAX_VAULT_CONFIG_ROWS = 25` and `MAX_VAULT_ENTRY_ROWS = 1000` caps in `src/pages/dashboard/vaultService.ts`.
- Vault dashboard config reads now cap ordered `vault_configs` rows before hydrating the owner view.
- Vault entry reads now cap ordered `vault_entries` rows after the config-id filter.
- Extended `src/pages/dashboard/vaultService.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/vaultService.test.ts`: PASS, 4/4.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps vault dashboard reads bounded without changing current vault creation, recap, reminder, or contribution behavior. No deploy was run.

### 2026-05-07 1:46 PM PT - No-Deploy Name-Change Workspace Query Bounds

What changed:
- Added explicit `MAX_NAME_CHANGE_DOCUMENT_ROWS = 100`, `MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS = 500`, and `MAX_NAME_CHANGE_REMINDER_ROWS = 100` caps in `src/pages/dashboard/planning/nameChangeService.ts`.
- Name-change workspace hydration now caps ordered document, extracted-field, and reminder reads before building the planner workspace bundle.
- Extended `src/pages/dashboard/planning/nameChangeService.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangeService.test.ts`: PASS, 42/42.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps name-change workspace hydration bounded without changing current planner, intake, document, reminder, or snapshot behavior. No deploy was run.

### 2026-05-07 1:49 PM PT - No-Deploy Planning Workspace Query Bounds

What changed:
- Added explicit planning read caps in `src/pages/dashboard/planning/planningService.ts`:
  - `MAX_PLANNING_ADDRESS_GUEST_ROWS = 5000`
  - `MAX_PLANNING_SONG_REQUEST_ROWS = 2000`
  - `MAX_PLANNING_TASK_ROWS = 500`
  - `MAX_PLANNING_VENDOR_ROWS = 500`
  - `MAX_PLANNING_BUDGET_ITEM_ROWS = 1000`
- Address collection, song-request hydration, tasks, vendors, and budget-item reads now cap ordered result sets before hydrating the planning workspace.
- Extended `src/pages/dashboard/planning/planningService.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/planningService.test.ts`: PASS, 6/6.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps the planning workspace read-side fan-out bounded without changing current planning task, vendor, budget, address-collection, or song-request behavior. No deploy was run.

### 2026-05-07 1:51 PM PT - No-Deploy Guest RSVP Lookup Bounds

What changed:
- Added `MAX_GUEST_RSVP_LOOKUP_IDS = 5000` in `src/pages/dashboard/guests/guestService.ts`.
- Guest RSVP hydration now slices inbound guest-id batches to that cap before the follow-up `rsvps` read.
- Extended `src/pages/dashboard/guests/guestService.test.ts` to pin the stable cap export and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts`: PASS, 4/4.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps guest RSVP hydration bounded without changing current guest create/update/import/delete behavior. No deploy was run.

### 2026-05-07 1:53 PM PT - No-Deploy Event RSVP Cleanup Bounds

What changed:
- Added `MAX_EVENT_RSVP_INVITATION_IDS = 10000` in `src/lib/eventRsvpCleanup.ts`.
- Shared event-RSVP cleanup now slices invitation-id batches to that cap before delete fan-out and snapshot reads.
- Extended `src/lib/eventRsvpCleanup.test.ts` to pin the stable cap export and the bounded helper shape.

Commands run:
- `npm test -- --run src/lib/eventRsvpCleanup.test.ts`: PASS, 4/4.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps shared event-RSVP cleanup fan-out bounded without changing current event RSVP restore or guest invitation rollback behavior. No deploy was run.

### 2026-05-07 1:57 PM PT - No-Deploy Message Dashboard List Bounds

What changed:
- Added `MAX_DASHBOARD_MESSAGES = 1000` and `MAX_MESSAGE_GUESTS = 5000` in `src/pages/dashboard/messages/messageService.ts`.
- Message dashboard hydration now caps ordered message-list reads and guest-list reads before hydrating the comms center.
- Extended `src/pages/dashboard/messages/messageService.boundary.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 6/6.
- `npm run proof:v1:comms-center`: PASS, 3/3 automated checks green.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps message dashboard list hydration bounded without changing current compose, schedule, send, retry, or delivery-history behavior. No deploy was run.

### 2026-05-07 2:00 PM PT - No-Deploy Planning Seating-Readiness Bounds

What changed:
- Added `MAX_PLANNING_SEATING_EVENTS = 200` in `src/pages/dashboard/planning/planningService.ts`.
- Planning seating-readiness now caps seating-event id reads before the follow-up assignment count query.
- Extended `src/pages/dashboard/planning/planningService.test.ts` to pin the stable cap export and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/planningService.test.ts`: PASS, 6/6.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps planning seating-readiness hydration bounded without changing current planning overview or seating-readiness behavior. No deploy was run.

### 2026-05-07 2:02 PM PT - No-Deploy Seating Service Read Bounds

What changed:
- Added explicit seating read caps in `src/pages/dashboard/seating/seatingService.ts`:
  - `MAX_SEATING_ITINERARY_EVENTS = 200`
  - `MAX_SEATING_ELIGIBLE_GUESTS = 5000`
  - `MAX_SEATING_EVENT_INVITATIONS = 10000`
- Seating itinerary reads now cap event rows before hydrating the dashboard selector.
- Eligible-guest hydration now caps guest rows and invitation rows before the event-RSVP lookup.
- Extended `src/pages/dashboard/seating/seatingService.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingService.test.ts`: PASS, 9/9.
- `npm run proof:v1:seating-continuity`: PASS, 3/3 automated checks green.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps seating service hydration bounded without changing current seating assignment, check-in, export, or continuity behavior. No deploy was run.

### 2026-05-07 2:04 PM PT - No-Deploy Seating Table and Assignment Bounds

What changed:
- Added `MAX_SEATING_TABLE_ROWS = 500` and `MAX_SEATING_ASSIGNMENT_ROWS = 10000` in `src/pages/dashboard/seating/seatingService.ts`.
- Seating table reads now cap ordered table rows before hydrating the seating canvas.
- Seating assignment reads now cap assignment rows before hydrating the seating layout state.
- Extended `src/pages/dashboard/seating/seatingService.test.ts` to pin the stable cap exports and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingService.test.ts`: PASS, 9/9.
- `npm run proof:v1:seating-continuity`: PASS, 3/3 automated checks green.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps seating table and assignment hydration bounded without changing current seating assignment, check-in, export, or continuity behavior. No deploy was run.

### 2026-05-07 2:06 PM PT - No-Deploy Settings Collaborator Invite Bounds

What changed:
- Added `MAX_SETTINGS_COLLABORATOR_INVITES = 200` in `src/pages/dashboard/settings/settingsSiteData.ts`.
- Settings collaborator invite hydration now caps ordered invite reads before hydrating the team panel.
- Extended `src/pages/dashboard/settings/settingsSiteData.test.ts` to pin the stable cap export and the bounded query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 3/3.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps settings collaborator invite hydration bounded without changing current invite create, revoke, or claim behavior. No deploy was run.

### 2026-05-07 2:12 PM PT - No-Deploy Vendor Inquiry History Bounds

What changed:
- Added `MAX_VENDOR_PROFILE_INQUIRIES = 50` in `src/lib/vendorProfiles.ts`.
- Vendor inquiry history now clamps caller-provided limits into the `1..50` range before hydrating the vendor inbox.
- Added `src/lib/vendorProfiles.boundary.test.ts` to pin the stable cap export and bounded query behavior in isolation from older vendor draft fallback assertions.

Commands run:
- `npm test -- --run src/lib/vendorProfiles.boundary.test.ts`: PASS, 2/2.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps vendor inquiry history hydration bounded without changing current vendor inquiry submission or inbox behavior. No deploy was run.

### 2026-05-07 2:15 PM PT - No-Deploy Overview Guest Stats Bounds

What changed:
- Added `MAX_OVERVIEW_RECENT_RSVPS = 5` and `OVERVIEW_GUEST_SELECT` in `src/pages/dashboard/Overview.tsx`.
- Dashboard overview guest stats now use exact count queries for total, confirmed, declined, pending, and contactable guests instead of loading the full guest list into memory.
- Recent RSVP hydration now uses an explicit responded-guest projection and a 5-row cap before populating the overview activity cards.
- Added `src/pages/dashboard/overviewQueryBounds.test.ts` to pin the exact-count query shape and bounded recent-RSVP read.

Commands run:
- `npm test -- --run src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 14/14.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps overview guest stats accurate while removing the worst full-list read from the dashboard overview path. No deploy was run.

### 2026-05-07 2:18 PM PT - No-Deploy Itinerary Dashboard Bounds

What changed:
- Added `MAX_ITINERARY_EVENTS = 200`, `MAX_ITINERARY_EVENT_INVITATIONS = 10000`, and `MAX_ITINERARY_EVENT_GUESTS = 5000` in `src/pages/dashboard/Itinerary.tsx`.
- Dashboard itinerary event hydration now caps ordered event rows before syncing schedule state.
- Per-event invitation lookups and the event guest-picker invitation hydration now cap invitation fan-out at `10000`.
- Event guest-picker guest hydration now caps guest rows at `5000`.
- Added `src/pages/dashboard/itineraryQueryBounds.test.ts` to pin the bounded event-list, invitation, and guest-picker query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryService.test.ts`: PASS, 8/8.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps itinerary dashboard hydration bounded without changing current event creation, edit, invitation, or RSVP-count behavior. No deploy was run.

### 2026-05-07 2:22 PM PT - No-Deploy Guest Dashboard Bounds

What changed:
- Added `MAX_GUEST_DASHBOARD_ROWS = 5000`, `MAX_GUEST_ITINERARY_FILTER_EVENTS = 200`, `MAX_GUEST_ITINERARY_FILTER_INVITATIONS = 10000`, `MAX_GUEST_DRAWER_EVENTS = 200`, and `MAX_GUEST_DRAWER_INVITATIONS = 10000` in `src/pages/dashboard/Guests.tsx`.
- Main guest list hydration now caps ordered guest rows before RSVP/conflict fan-out.
- Guest itinerary filter hydration now caps visible itinerary events and invitation fan-out before deriving per-event guest maps.
- Guest itinerary drawer hydration now caps itinerary event rows and invitation fan-out before building the event-invite picker.
- Added `src/pages/dashboard/guestQueryBounds.test.ts` to pin the bounded guest dashboard, itinerary-filter, and drawer query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`: PASS, 25/25.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps guest dashboard hydration bounded without changing current guest CRUD, RSVP conflict review, or itinerary invite management behavior. No deploy was run.

### 2026-05-07 2:26 PM PT - No-Deploy Guest Photo Dashboard Bounds

What changed:
- Added `MAX_GUEST_PHOTO_EVENTS = 200` and `MAX_GUEST_PHOTO_ALBUMS = 500` in `src/pages/dashboard/GuestPhotoSharing.tsx`.
- Guest photo dashboard hydration now caps itinerary event rows before memory-flow/event-window planning.
- The same dashboard now caps photo album rows before upload, guestbook, prospect, analysis, and recap fan-out consume the album set.
- Added `src/pages/dashboard/guestPhotoQueryBounds.test.ts` to pin the bounded event and album query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 14/14.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps guest photo dashboard hydration bounded without changing current album creation, upload review, guestbook moderation, or recap behavior. No deploy was run.

### 2026-05-07 2:30 PM PT - No-Deploy Guest Bulk Helper Bounds

What changed:
- Added `MAX_GUEST_BULK_OPERATION_IDS = 5000` in `src/pages/dashboard/guests/guestService.ts`.
- Added `MAX_GUEST_BULK_INVITATION_ROWS = 10000` in `src/pages/dashboard/guests/guestService.ts`.
- Bulk guest helper paths now slice guest-id fan-out before event invitation lookup/deletes, RSVP deletes, household updates, and multi-guest updates.
- Imported RSVP replacement now also clamps the deduped guest-id set to the same shared maximum before bulk delete/reinsert behavior.
- Event invitation rollback reads in `replaceGuestEventInvitations(...)` and invitation-id reads in `deleteAllGuestsForSite(...)` now cap invitation-row hydration at `10000` before rollback and delete work.
- Extended `src/pages/dashboard/guests/guestService.test.ts` to pin the new bounded bulk-helper query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`: PASS, 26/26.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps bulk guest helper fan-out bounded without changing current guest import, household, bulk update, or bulk delete behavior. No deploy was run.

### 2026-05-07 2:41 PM PT - No-Deploy RSVP and Coordinator Query Bounds

What changed:
- Exported explicit RSVP board query caps in `src/pages/dashboard/rsvpBoardService.ts`: guest rows now cap at `2000`, itinerary event rows at `200`, and event invitation hydration at `10000`.
- Added `src/pages/dashboard/rsvpBoardService.test.ts` to pin the RSVP board projections plus bounded guest/event/invitation query shape.
- Added `MAX_COORDINATOR_QNA_ROWS = 30` in `src/pages/dashboard/coordinator/coordinatorService.ts` so coordinator bootstrap hydration uses a named bound for Q&A rows instead of a magic inline limit.
- Extended `src/pages/dashboard/coordinator/coordinatorService.test.ts` to pin the Q&A row cap alongside the existing coordinator guest/event/invitation bounds.

Commands run:
- `npm test -- --run src/pages/dashboard/rsvpBoardService.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`
- `npm run proof:v1:guests-rsvp-ops`
- `npm run proof:v1:coordinator-dayof`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`
- `npm run build`

Status:
- PARTIAL. This keeps live RSVP activity and coordinator/day-of dashboard hydration bounded without changing RSVP workflows, guest check-in, or coordinator messaging behavior. No deploy was run.

### 2026-05-07 2:36 PM PT - No-Deploy Guest Ops and Message Preview Bounds

What changed:
- Added `MAX_SMS_CREDIT_TRANSACTIONS = 20` in `src/pages/dashboard/messages/messageService.ts` so SMS credit preview history uses a named bounded read instead of an inline limit.
- Added explicit guest ops caps in `src/pages/dashboard/Guests.tsx`:
  - `MAX_GUEST_RSVP_CONFLICT_ROWS = 20`
  - `MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS = 500`
  - `MAX_GUEST_AUDIT_ROWS = 20`
- Extended `src/pages/dashboard/messages/messageService.boundary.test.ts` and `src/pages/dashboard/guestQueryBounds.test.ts` to pin those bounded query shapes.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run proof:v1:comms-center`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`
- `npm run build`

Notes:
- One direct `npm run build` attempt hit a transient local `dist/` cleanup `scandir` error on `dist/photos/engagement 4`. The serial build embedded in `proof:v1:comms-center` passed immediately afterward, so launch truth did not change and this was treated as a local cleanup race rather than a product regression.

Status:
- PARTIAL. This keeps guest ops conflict/audit hydration and message credit preview reads bounded without changing guest workflows or messaging behavior. No deploy was run.

### 2026-05-07 2:39 PM PT - No-Deploy Overview Engagement Bounds

What changed:
- Added `MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS = 8` and `MAX_OVERVIEW_INTERACTIVE_VOTES = 500` in `src/pages/dashboard/Overview.tsx`.
- Overview interactive engagement reads now use named caps instead of inline limits before summarizing owner-facing guest suggestions and vote activity.
- Extended `src/pages/dashboard/overviewQueryBounds.test.ts` to pin the bounded suggestion and vote query shape alongside the existing exact-count guest stats and recent RSVP cap.

Commands run:
- `npm test -- --run src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`

Status:
- PARTIAL. This keeps overview engagement hydration bounded without changing overview metrics, publishing status, or owner-facing dashboard behavior. No deploy was run.

### 2026-05-07 2:40 PM PT - No-Deploy Guest Photo Hydration Bounds

What changed:
- Added explicit guest photo dashboard caps in `src/pages/dashboard/GuestPhotoSharing.tsx` for:
  - uploads `200`
  - guestbook entries `50`
  - prospect opt-ins `200`
  - AI analyses `250`
  - metadata rows `250`
  - bucket corrections `100`
- The guest photo dashboard now uses named bounds across the whole owner hydration path instead of mixing named and inline limits.
- Extended `src/pages/dashboard/guestPhotoQueryBounds.test.ts` to pin the bounded upload, guestbook, prospect, analysis, metadata, and correction query shape.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`

Status:
- PARTIAL. This keeps guest photo owner hydration bounded without changing album management, upload review, AI ops planning, or guest-facing photo behavior. No deploy was run.

### 2026-05-07 2:42 PM PT - No-Deploy Seating and Guest History Bounds

What changed:
- Added `MAX_SEATING_VERSION_ROWS = 12` in `src/pages/dashboard/seating/seatingService.ts` so seating layout version history uses a named bound instead of an inline limit.
- Added `MAX_GUEST_DRAWER_AUDIT_ROWS = 12` in `src/pages/dashboard/Guests.tsx` so guest itinerary drawer audit hydration uses a named bound instead of an inline limit.
- Extended `src/pages/dashboard/seating/seatingService.test.ts` and `src/pages/dashboard/guestQueryBounds.test.ts` to pin those bounded history/query shapes.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`

Status:
- PARTIAL. This keeps seating version history and guest drawer audit hydration bounded without changing seating workflows, guest visibility, or RSVP behavior. No deploy was run.

### 2026-05-07 2:46 PM PT - No-Deploy Singleton Lookup Bounds

What changed:
- Added explicit singleton lookup caps across shared/dashboard helpers:
  - `MAX_ACTIVE_SITE_OWNED_LOOKUP_ROWS = 1`
  - `MAX_ACTIVE_SITE_COLLABORATOR_LOOKUP_ROWS = 1`
  - `MAX_REGISTRY_SORT_LOOKUP_ROWS = 1`
  - `MAX_SEATING_LOOKUP_EVENT_ROWS = 1`
  - `MAX_NAME_CHANGE_SNAPSHOT_ROWS = 1`
- `src/lib/activeSite.ts`, `src/pages/dashboard/registry/registryService.ts`, `src/pages/dashboard/seating/seatingService.ts`, and `src/pages/dashboard/planning/nameChangeService.ts` now use named caps instead of inline `.limit(1)` calls for those latest-row / first-row lookups.
- Added `src/lib/activeSite.test.ts` and extended the existing registry, seating, and name-change service tests to pin those singleton query bounds.

Commands run:
- `npm test -- --run src/lib/activeSite.test.ts src/pages/dashboard/registry/registryService.test.ts src/pages/dashboard/seating/seatingService.test.ts src/pages/dashboard/planning/nameChangeService.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`

Status:
- PARTIAL. This keeps shared singleton lookups explicit and stable without changing active-site resolution, registry ordering, seating lookup behavior, or name-change planner workflows. No deploy was run.

### 2026-05-07 2:48 PM PT - No-Deploy Overview Collaborator Lookup Bound

What changed:
- Added `MAX_OVERVIEW_COLLABORATOR_LINK_ROWS = 1` in `src/pages/dashboard/Overview.tsx`.
- The overview dashboard now uses a named one-row cap for the collaborator fallback site lookup instead of an inline `.limit(1)`.
- Extended `src/pages/dashboard/overviewQueryBounds.test.ts` to pin that collaborator fallback lookup bound alongside the existing overview guest, suggestion, and vote query bounds.

Commands run:
- `npm test -- --run src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`

Status:
- PARTIAL. This keeps the overview collaborator fallback path explicit without changing overview metrics or site resolution behavior. No deploy was run.

### 2026-05-07 3:00 PM PT - No-Deploy Overview Service Snapshot Extraction

What changed:
- Moved the remaining high-traffic Overview data access behind `src/pages/dashboard/overviewService.ts` instead of keeping it inline in `src/pages/dashboard/Overview.tsx`.
- `overviewService.ts` now owns:
  - active-site and collaborator-fallback site lookup for the overview
  - exact-count guest metrics and recent-RSVP hydration
  - registry, photo album, and vault count hydration
  - interactive suggestion and vote reads
  - builder field edit persistence
  - draft-refresh seed reads and wedding-site patch writes
- `Overview.tsx` now consumes `loadOverviewDashboardSnapshot(...)`, `loadOverviewInteractiveData(...)`, `markOverviewBuilderFieldAsUserEdited(...)`, and draft refresh helpers instead of directly querying `wedding_sites`, `guests`, `interactive_suggestions`, or `interactive_votes`.
- Updated `src/pages/dashboard/overviewQueryBounds.test.ts`, `src/pages/dashboard/overviewService.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` so the service-layer boundary and explicit projection/bound contract stay pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts src/lib/dashboardDataBoundary.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the page-to-service migration for the owner dashboard overview without changing overview metrics, draft refresh behavior, publish state, or guest-facing output. No deploy was run.

### 2026-05-07 3:05 PM PT - No-Deploy Itinerary Mirror Sync Extraction

What changed:
- Moved the itinerary schedule mirror write path out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
- `itineraryService.ts` now owns:
  - the `wedding_sites.wedding_data` schedule mirror read/write
  - the `sections` schedule mirror read/write
  - pure helper builders for section-event mirror rows and wedding schedule rows
- `Itinerary.tsx` now calls `syncItineraryScheduleMirror(siteId, eventList)` instead of directly updating `wedding_sites` and `sections` after itinerary event hydration or edits.
- Updated `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the cross-table mirror boundary stays pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the page-to-service migration for itinerary sync behavior without changing itinerary event CRUD, RSVP counts, or guest-facing schedule output. No deploy was run.

### 2026-05-07 3:09 PM PT - No-Deploy Signup Auth Service Extraction

What changed:
- Moved the signup auth flow out of `src/pages/Signup.tsx` and into `src/pages/signupService.ts`.
- `signupService.ts` now owns:
  - Google OAuth start via `startSignupWithGoogle(...)`
  - email sign-up plus password-sign-in fallback via `createSignupAccount(...)`
  - the existing minimal wedding-site bootstrap helper
- `Signup.tsx` now orchestrates UI state and navigation while calling those service helpers instead of directly invoking `supabase.auth.signInWithOAuth`, `supabase.auth.signUp`, and `supabase.auth.signInWithPassword`.
- Added `src/pages/signupService.test.ts` and updated `src/pages/onboarding/onboardingService.test.ts` so the auth/service boundary for signup stays pinned.

Commands run:
- `npm test -- --run src/pages/Signup.test.tsx src/pages/signupService.test.ts src/pages/onboarding/onboardingService.test.ts src/lib/authErrorCopy.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the auth-entry page-to-service migration without changing signup copy, invite handoff behavior, quick-start handoff, or owner checkout routing. No deploy was run.

### 2026-05-07 3:12 PM PT - No-Deploy Login Auth Service Extraction

What changed:
- Moved the login auth flow out of `src/pages/Login.tsx` and into `src/pages/loginService.ts`.
- `loginService.ts` now owns:
  - password sign-in via `loginWithPassword(...)`
  - Google OAuth start via `startLoginWithGoogle(...)`
  - password reset submission via `sendLoginPasswordReset(...)`
- `Login.tsx` now keeps the session-listener and redirect orchestration locally, but calls those service helpers instead of directly invoking `supabase.auth.signInWithPassword`, `supabase.auth.signInWithOAuth`, and `supabase.auth.resetPasswordForEmail`.
- Added `src/pages/loginService.test.ts` to pin that auth-entry service contract.

Commands run:
- `npm test -- --run src/pages/Login.test.tsx src/pages/loginService.test.ts src/lib/authErrorCopy.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the auth-entry page-to-service migration without changing login copy, invite handoff behavior, quick-start handoff, or password reset routing. No deploy was run.

### 2026-05-07 3:15 PM PT - No-Deploy Collaborator Invite Auth Service Extraction

What changed:
- Moved the invited-account auth flow out of `src/pages/AcceptCollaboratorInvite.tsx` and further into `src/pages/acceptCollaboratorInviteService.ts`.
- `acceptCollaboratorInviteService.ts` now owns:
  - invited account password sign-in via `signInCollaboratorInviteAccount(...)`
  - invited account sign-up plus sign-in fallback via `createCollaboratorInviteAccount(...)`
  - invite-specific fallback messaging for confirmation-required and incomplete account creation states
- `AcceptCollaboratorInvite.tsx` still owns invite/session orchestration and the final claim flow, but no longer directly invokes `supabase.auth.signInWithPassword` or `supabase.auth.signUp`.
- Expanded `src/pages/acceptCollaboratorInviteService.test.ts` to pin that auth-entry service contract.

Commands run:
- `npm test -- --run src/pages/acceptCollaboratorInviteService.test.ts src/lib/authErrorCopy.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the collaborator-invite page-to-service migration without changing invite validation, session-claim orchestration, or collaborator redirect behavior. No deploy was run.

### 2026-05-07 3:18 PM PT - No-Deploy Onboarding Auth Lookup Service Extraction

What changed:
- Moved the shared onboarding auth lookup into `src/pages/onboarding/onboardingService.ts` via `requireAuthenticatedOnboardingUser()`.
- `src/pages/onboarding/QuickStart.tsx`, `src/pages/onboarding/GuidedSetup.tsx`, and `src/pages/onboarding/WeddingStatus.tsx` now call that helper instead of directly invoking `supabase.auth.getUser()` inline.
- This keeps session/user lookup behavior the same, but removes more page-owned auth access from the onboarding surface.
- Updated `src/pages/onboarding/onboardingService.test.ts` so the onboarding boundary now pins the shared auth helper and ensures those onboarding pages no longer own direct `supabase.auth.getUser()` calls.

Commands run:
- `npm test -- --run src/pages/onboarding/onboardingService.test.ts src/pages/onboarding/GuidedSetup.test.tsx src/pages/onboarding/QuickStart.test.tsx`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the onboarding page-to-service migration without changing onboarding copy, draft hydration, guest CSV import behavior, or quick-start continuation routing. No deploy was run.

### 2026-05-07 3:21 PM PT - No-Deploy Settings Password Auth Service Extraction

What changed:
- Moved the settings password-update auth flow into `src/pages/dashboard/settings/settingsSiteData.ts`.
- That service now owns:
  - authenticated account email lookup via `requireSettingsAuthenticatedUser()`
  - current password verification via `verifySettingsCurrentPassword(...)`
  - password update via `updateSettingsAccountPassword(...)`
- `src/pages/dashboard/Settings.tsx` now calls those helpers instead of directly invoking `supabase.auth.getUser`, `supabase.auth.signInWithPassword`, and `supabase.auth.updateUser`.
- Expanded `src/pages/dashboard/settings/settingsSiteData.test.ts` so the settings boundary now pins that auth/service split.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the settings page-to-service migration without changing password policy copy, billing flows, planner invite flows, or site settings persistence. No deploy was run.

### 2026-05-07 3:25 PM PT - No-Deploy Itinerary Auth Lookup Service Extraction

What changed:
- Moved the repeated active-site auth lookup out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts` via `resolveItinerarySiteId()`.
- `Itinerary.tsx` now calls that helper in the event loader, event save flow, timeline update flow, smart-template creation flow, and event guest manager instead of directly repeating `supabase.auth.getUser()` plus `resolveActiveSiteForUser(...)`.
- Expanded `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the itinerary boundary now pins that auth/service split.

Commands run:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the itinerary page-to-service migration without changing itinerary projections, guest-invite counts, schedule mirror behavior, or template event creation behavior. No deploy was run.

### 2026-05-07 3:28 PM PT - No-Deploy Message Session Token Service Extraction

What changed:
- Moved the bulk-send/session token lookup out of `src/pages/dashboard/Messages.tsx` and into `src/pages/dashboard/messages/messageService.ts` via `getMessageAccessToken()`.
- `Messages.tsx` now calls that helper for both direct bulk send and scheduled dispatch instead of directly invoking `supabase.auth.getSession()`.
- This removes the last direct Supabase dependency from the messages dashboard page without changing delivery error handling or request payloads.
- Expanded `src/pages/dashboard/messages/messageService.boundary.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the messages boundary now pins that service-owned auth/session lookup.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/lib/dashboardDataBoundary.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the messages page-to-service migration without changing delivery request bodies, scheduling behavior, or message query bounds. No deploy was run.

### 2026-05-07 3:31 PM PT - No-Deploy Seating Session Refresh Service Extraction

What changed:
- Moved the seating auth-session refresh retry out of `src/pages/dashboard/Seating.tsx` and into `src/pages/dashboard/seating/seatingService.ts` via `refreshSeatingSession()`.
- `Seating.tsx` now calls that helper in both check-in retry paths instead of directly invoking `supabase.auth.refreshSession()`.
- This removes the last direct Supabase dependency from the seating dashboard page without changing check-in retry behavior or seating data mutations.
- Expanded `src/pages/dashboard/seating/seatingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the seating boundary now pins that service-owned session refresh.

Commands run:
- `npm test -- --run src/pages/dashboard/seating/seatingService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingDemoStorage.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the seating page-to-service migration without changing seating query bounds, assignment logic, or check-in retry outcomes. No deploy was run.
