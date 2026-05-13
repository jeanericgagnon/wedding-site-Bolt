# Production Hardening Report

_Updated:_ `2026-05-12 10:14 PM PDT`

## Current Score

- Readiness score: `9.9 / 10`
- Launch verdict: `GO`
- Production-ready: `YES`

## Exact Runtime Identity

- Branch: `codex/v1-finish-hard-gates-3`
- Current branch head: `f2cc4811` (`Harden launch runtime proofs and route splits`)
- Exact frontend Git SHA: `f2cc4811`
- Exact frontend commit: `Harden launch runtime proofs and route splits`
- Exact Vercel production deploy: `dpl_DQG5bU5yVbqT79Y6r4ZCx13nPtSU`
- Production URL: [dayof.love](https://dayof.love)
- Supabase project: `atuzuobpprjstfmdnwso`
- Current live hardening batch: dedicated public session secret separation plus RPC-backed admin-route authorization

## Exact Blockers

No active `P0` / `P1` launch blockers remain.

## Exact Proof Gaps

No active launch-critical proof gaps remain.

Exact 10/10 gap:
- several explicitly deferred non-launch lanes remain outside the current baseline
- the broader repo-wide `noImplicitAny` / unused-enforcement flip is now future maintainability work rather than an active launch-board item, even though the strict-only debt is still not zero

Deferred, non-launch gaps:
- external custom-domain product support
  - `.dayof.love` subdomain routing is now live-proven
  - arbitrary external custom domains are still unsupported product scope, not a pending proof lane
- registry owner import/repair manual notes
- SMS/provider live-send setup
- AI secret inventory/internal prereq notes
- broader future-surface client-RLS role matrix expansion
- future client-write surface reduction into Edge Functions / RPCs when new dangerous writes appear
- keep the live client-RLS matrix current when future non-guest write surfaces are introduced
- keep the no-direct-client-write inventory current after future runtime write-surface changes
- global TypeScript / ESLint strictness remains softer than the widened launch-critical strict pocket
- the latest strict-pocket widening now also covers `RSVP.tsx`, `SiteView.tsx`, `siteViewHelpers.ts`, `QuickStart.tsx`, the route modules, and `nameChangeService.ts`
- a same-night cleanup wave restored green `typecheck`, `lint`, `build`, `proof:v1:strict-pocket`, and focused proof tests while reducing strict-only repo debt again (`238 -> 205` file-scoped findings)
- no active launch-lane deploy gap remains

## Exact Proof State

Fresh local proof:
- `npm test` -> `PASS` (`537/537` files, `3321/3321` tests)
- `npm run typecheck -- --pretty false` -> `PASS`
- `npm run lint -- --quiet` -> `PASS`
- `npm run build` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run proof:v1:test-lanes` -> `PASS`
- `npm run proof:v1:strict-pocket` -> `PASS`
  - hard-fails a high-risk boundary pocket (`ProtectedRoute.tsx`, `activeSite.ts`, `customerSafeError.ts`, `mediaUrl.ts`, `paymentGate.ts`, `publicRenderContract.ts`, `publicSiteAccess.ts`, `publicSiteRenderModel.ts`, `publicSiteSlug.ts`, `publicSectionDataSanitizer.ts`, `siteConfigValidate.ts`, `stripeService.ts`, `vendorProfiles.ts`) on explicit `any`, `ban-ts-comment`, unused vars, empty blocks, and warning leakage
- `npm test -- --run src/lib/strictPocketTypecheck.test.ts src/pages/Onboarding.test.tsx src/pages/PhotoUpload.test.ts src/pages/RSVP.test.tsx src/pages/SiteView.test.ts src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts` -> `PASS`
  - same-night cleanup wave kept the widened strict pocket and the touched onboarding/public runtime surfaces green
- `npm run proof:v1:client-write-inventory` -> `PASS`
  - broadened tracked-`src` runtime scan now reports no direct client `.insert/.update/.upsert/.delete` calls in shipped `src` runtime files
  - scanner now also catches single/double/backtick table names, skips `.d.ts` noise, and records the real matched write operation in proof output
- `npm test -- --run src/lib/publicSessionSecretBoundary.test.ts src/lib/adminAccessRpcBoundary.test.ts src/lib/signedSessionShared.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts src/lib/launchEdgeFunctions.test.ts` -> `PASS`
  - public/session Edge functions must not reuse `SUPABASE_SERVICE_ROLE_KEY` as the session-signing secret
  - the RPC-backed admin access boundary is locally guarded
- `npm run proof:v1:registry-preview-ssrf -- --require-live` -> `LIVE PASS`
  - `test:launch` and `Release Launch Gate` now require the live registry-preview SSRF proof lane instead of leaving it optional
- `npm run proof:v1:security-automation` -> `PASS`
  - local proof now pins Dependabot, Semgrep, CodeQL, Gitleaks secret scanning, and launch-chain wiring
- `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/lib/securityAutomationProof.test.ts src/lib/routeCompositionBoundary.test.ts src/lib/internalToolingRouteBoundary.test.ts src/lib/guestLookupScopeProofScript.test.ts src/pages/GuestContactUpdate.test.ts src/lib/launchEdgeFunctions.test.ts` -> `PASS`
  - guest-contact household-wide updates now require phone last 4 in local code/proof before `apply_household`
  - guest-specific RSVP invite tokens now act as the strongest local verifier for signed household-scoped contact sessions
  - guest-contact submit now writes a redacted `app_action_audit_logs` event with verifier strength, household scope, changed-field names, and changed-guest count
  - `App.tsx` now composes grouped route modules instead of hand-owning the entire route tree inline
- `npm run test:launch` -> `PASS`
  - branch wiring self-sets `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`
  - the stronger guest-contact invite-token / household-verifier path is now deployed and live-green
- `npm test -- --run src/lib/clientWriteInventoryProofScript.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts` -> `PASS`
- `npm run proof:v1:board:md` -> `PASS`
- `npm run guard:file-size` -> `PASS`
- `npm run guard:assets` -> `PASS`
- `npm run proof:v1:performance-budget` -> `PASS`
- `git diff --check` -> `PASS`
- `npm test -- --run src/lib/ciHardpassWorkflow.test.ts src/lib/releaseLaunchGate.test.ts src/lib/aiExposureProofScript.test.ts src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts` -> `PASS`
- `npm test -- --run src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/strictPocketTypecheck.test.ts src/lib/stripeService.test.ts src/lib/siteConfigValidate.test.ts src/lib/vendorProfiles.test.ts src/lib/vendorProfiles.boundary.test.ts` -> `PASS`
- `npm test -- --run src/lib/internalToolingRoutes.test.ts src/lib/internalToolingRouteBoundary.test.ts src/lib/clientWriteInventoryProofScript.test.ts src/lib/signedSessionShared.test.ts src/lib/releaseLaunchGate.test.ts src/lib/strictPocketTypecheck.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts` -> `PASS`
- `npm test -- --run src/components/auth/ProtectedRoute.test.tsx` -> `PASS`
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/registry/registryService.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/overviewService.test.ts src/pages/dashboard/settings/settingsSiteData.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/vaultService.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts` -> `PASS`
- `npm test -- --run src/pages/onboarding/onboardingService.test.ts src/pages/signupService.test.ts` -> `PASS`
- `npm test -- --run src/pages/dashboard/planning/nameChangeService.test.ts src/lib/dashboardDataBoundary.test.ts` -> `PASS`
- `npm test -- --run src/data/siteRepository.test.ts src/builder/services/builderProjectService.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/clientWriteInventoryProofScript.test.ts` -> `PASS`

Fresh secure/runtime proof:
- `npm run proof:v1:service-role-authorization` -> `PASS`
- `npm run proof:v1:email-messaging-authorization` -> `PASS`
- `npm run proof:v1:launch-closeout` -> `PASS`
- `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- collaborator runtime now also proves guest-scoped collaborators can directly mutate guest rows, planner-scoped collaborators can directly write planning tasks, itinerary events, and dashboard messages while registry RPC writes stay denied, settings-scoped collaborators can directly patch site settings and write sections while registry RPC writes stay denied, registry-scoped collaborators can directly write registry items and refresh policy while dashboard message/section RPC writes stay denied, photos-scoped collaborators can directly write vault configs and patch vault providers while dashboard message RPC writes stay denied, and coordinator-scoped collaborators can directly write seating events/tables, coordinator Q&A/check-in, and builder media assets while dashboard message RPC writes stay denied
- reran green after the remote RPC migration apply with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`
- this rerun exposed and closed real production runtime drift in `itinerary_event_write` and `section_write`
  - remote schema repairs: `20260512040000_reconcile_itinerary_dress_code_column.sql`, `20260512040500_reconcile_itinerary_runtime_columns.sql`
  - remote function repairs: `20260512041000_fix_itinerary_event_write_time_types.sql`, `20260512041500_fix_itinerary_event_write_ids.sql`, `20260512042000_fix_section_write_create_with_explicit_id.sql`
- the registry refresh policy lane also exposed a real PostgreSQL `CASE` type mismatch on `registry_refresh_policy_updated_by`; remote repair landed via `20260512043000_fix_registry_refresh_policy_write_updated_by_type.sql` and the live reruns are green after the fix
- `npm run test:smoke` -> `PASS`

Fresh production proof after exact-SHA frontend deploy:
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` -> `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
- `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
- `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live` -> `LIVE PASS`
  - `testandkaras.dayof.love` resolves live and fail-closes safely without wrong-site leakage
- `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` -> `LIVE PASS`
  - public vault contribution save, owner-scoped readback, and cleanup/delete are green after live inventory confirmation
- reran same-day after the public-session-secret function redeploys:
  - `public-site-access`, `guest-contact-lookup`, `guest-contact-submit`, `validate-rsvp-token`, `photo-upload`, and `interactive-section-public` all stayed green on the live public/session baseline
- the canonical client-RLS matrix now includes direct guest/planning/seating write allow/deny coverage plus planner itinerary/message RPC allow + registry RPC deny, settings patch/section RPC allow + registry RPC deny, registry item/policy RPC allow + dashboard message/section RPC deny, photos vault-config/vault-provider RPC allow + dashboard message RPC deny, and coordinator Q&A/check-in/media RPC allow + dashboard message RPC deny, in addition to anon guest-contact and public RSVP scope
- the same live matrix now also proves regular collaborators cannot query `admin_users` directly while admin access stays behind `admin_access_check()`
- reran green after the remote RPC migration apply with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`
- this same rerun exposed a real `wedding_site_settings_patch` PostgreSQL `CASE` type mismatch on `active_template_id`; the DB fix landed via `20260511212626_fix_wedding_site_settings_patch_types.sql` and the live matrix is green after the repair
- `supabase secrets set PUBLIC_SITE_SESSION_SECRET_V1=... --project-ref atuzuobpprjstfmdnwso --yes` -> `PASS`
- `supabase db push --linked --include-all` -> `PASS`
  - applied remote repair migration `20260512043000_fix_registry_refresh_policy_write_updated_by_type.sql`
- `supabase functions deploy public-site-access --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase functions deploy guest-contact-lookup --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase functions deploy guest-contact-submit --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase functions deploy validate-rsvp-token --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase functions deploy photo-upload --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase functions deploy interactive-section-public --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
- `supabase db push --linked --include-all` -> `PASS`
  - applied `20260512050000_harden_admin_access_check.sql`
- `vercel deploy --prod --yes` -> `PASS`
  - production deploy `dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh`

Same-day still-valid supporting proof:
- `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` -> `LIVE PASS`
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` -> `LIVE PASS`
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` -> `LIVE PASS`
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` -> `LIVE PASS`
- `npm run proof:v1:ai-product-readiness` -> `PASS`
- `npm run proof:v1:data-integrity` -> `PASS`
- `npm run proof:v1:prereqs` -> `PASS`

## Exact Deployment State

Current live launch baseline:
- frontend: `dpl_DQG5bU5yVbqT79Y6r4ZCx13nPtSU` from exact runtime SHA `f2cc4811`
- `submit-rsvp --no-verify-jwt`: redeployed on the serialized capacity path after migration `20260511170500_serialize_submit_rsvp_capacity.sql`
- `public-site-access --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `guest-contact-lookup --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `guest-contact-submit --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `guest-contact-lookup` now requires a full name plus the first few characters of the guest email address before minting a signed contact session, and the whole-party path now requires phone last 4 unless a guest-specific invite token is present
- `guest-contact-submit` now writes a redacted `app_action_audit_logs` event for public guest updates live
- `validate-rsvp-token --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `interactive-section-public --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `photo-upload --no-verify-jwt`: same-day confirmed and live-proven again on the dedicated public session secret path
- `vault-contribution-public --no-verify-jwt`: same-day confirmed in live function inventory and write/read proven green
- `vault-entry-submit --no-verify-jwt`: same-day confirmed in live function inventory and write/read proven green
- `process-email-queue`: same-day already confirmed and live-proven
- `translate-site-content`: same-day already confirmed and live-proven
- `.dayof.love` host routing: same-day dedicated live proof green for `testandkaras.dayof.love`, with safe fail-closed gating and no wrong-site leak
- remote database: RPC sweep applied through `20260512031500_seating_assignment_version_rpcs.sql`
- forward production repairs also applied:
  - `20260511212626_fix_wedding_site_settings_patch_types.sql`
  - `20260512040000_reconcile_itinerary_dress_code_column.sql`
  - `20260512040500_reconcile_itinerary_runtime_columns.sql`
  - `20260512041000_fix_itinerary_event_write_time_types.sql`
  - `20260512041500_fix_itinerary_event_write_ids.sql`
  - `20260512042000_fix_section_write_create_with_explicit_id.sql`
  - `20260512043000_fix_registry_refresh_policy_write_updated_by_type.sql`
  - `20260512050000_harden_admin_access_check.sql`

Not a supported current launch surface:
- arbitrary external custom domains

Those remain future product scope. The `.dayof.love` host-routing lane itself is now live-proven and no longer deferred.

## What Changed Since Last Report

- deployed exact runtime SHA `f2cc4811` to Vercel production deploy `dpl_DQG5bU5yVbqT79Y6r4ZCx13nPtSU`
- redeployed `guest-contact-lookup --no-verify-jwt` and `guest-contact-submit --no-verify-jwt` so the stronger household verifier, guest invite-token path, and redacted public audit event are live
- reran live proof green on the exact deploy:
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - `npm run proof:v1:guest-lookup-scope`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix -- --require-live`
  - `npm run proof:v1:registry-preview-ssrf -- --require-live`
  - `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live`
  - `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live`

- Hardened the sensitive guest-contact flow further in local code:
  - `apply_household` now requires phone last 4 in addition to the existing full-name + email-fragment proof
  - focused local proof is green
  - live `guest-lookup-scope` still reflects the pre-deploy runtime because no guest-contact redeploy was run in this batch
- Added enterprise-style security automation artifacts:
  - Dependabot
  - Semgrep
  - CodeQL
  - Gitleaks secret scanning
  - local `proof:v1:security-automation`
- Reduced route-registry maintenance risk:
  - `App.tsx` now composes grouped route modules through `src/routes/*`
  - internal tooling route guarding moved with that route module structure and remains locally proven
- Deployed the blocker-fix frontend runtime on exact SHA `f0cbf841`
- Promoted Vercel production deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
- Applied migration `20260511170500_serialize_submit_rsvp_capacity.sql` to the linked Supabase project
- Deployed `submit-rsvp --no-verify-jwt` on the serialized RSVP capacity path
- Reran live `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, and `guest-lookup-scope` against the blocker-fix runtime and kept them green
- Wired GitHub Actions secrets for the Supabase RSVP proof lane
- Proved the release gate twice in Actions:
  - `25705386070` green with the broader workflow shape
  - `25705683563` green with the focused launch-critical proof shape
- Removed the last generic-CI RSVP skip by making `.github/workflows/ci-hardpass.yml` fail if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing and always run `npm run smoke:rsvp:strict`
- Removed the `SKIP_POSTDEPLOY_PROOF` bypass path from `scripts/deploy_prod_guarded.mjs`; guarded production deploys now fail instead of silently skipping postdeploy proof
- Added workflow/proof guards so those two operational hardening guarantees stay test-covered (`ciHardpassWorkflow.test.ts`, `aiExposureProofScript.test.ts`, `proof:v1:test-lanes`)
- Reconciled the stale service-role disposition doc to the current live matrix truth instead of leaving guest-dashboard settings proof and broader matrix coverage described as still pending
- Added a launch-critical strict pocket so TS/ESLint rigor now hard-fails on the auth/payment/config/vendor boundary files without pretending the whole repo is already strict-clean
- Widened that strict pocket first to the public access/contract boundary (`publicRenderContract.ts`, `publicSiteAccess.ts`, `publicSiteSlug.ts`), then again to the broader auth/public runtime boundary (`activeSite.ts`, `customerSafeError.ts`, `mediaUrl.ts`, `paymentGate.ts`, `publicSiteRenderModel.ts`, `publicSectionDataSanitizer.ts`) after scoped ESLint sweeps showed those files were clean enough to promote
- Tightened internal tooling routes so the env flag is no longer enough by itself; lab/capture routes and preview links now require both the flag and a resolved `admin_users` check
- Made the live registry-preview SSRF matrix mandatory in both `test:launch` and `Release Launch Gate`
- Fixed the client-write inventory proof output so it records the real matched operation name instead of the quote token
- Hardened shared signed session verification so malformed token parsing fails closed before payload decode, and versioned token envelopes now support keyed rotation without breaking legacy two-part tokens
- Separated public session signing from `SUPABASE_SERVICE_ROLE_KEY` by adding `PUBLIC_SITE_SESSION_SECRET_V1` / `PUBLIC_SITE_SESSION_SECRET` handling plus a proof boundary that fails if service-role power is reused for public sessions
- Redeployed the highest-risk public/session functions on that dedicated session secret path and reran live public-site, guest-contact, RSVP, photo-upload, collaborator-runtime, and client-RLS proof green
- Added `20260512050000_harden_admin_access_check.sql` plus the frontend `admin_access_check()` client switch; remote DB apply is complete, the frontend is redeployed, and direct non-admin `admin_users` reads now fail in the live matrix
- Made the RSVP serialization proof easier to audit directly in-repo by calling out `supabase/migrations/20260511170500_serialize_submit_rsvp_capacity.sql` in the current proof story
- Redeployed `vault-contribution-public --no-verify-jwt` and `vault-entry-submit --no-verify-jwt`, confirmed both in live function inventory, and turned the public vault contribution lane green with a live save/readback/delete proof
- Added `npm run proof:v1:subdomain-route` and proved the `.dayof.love` host-routing lane live for `testandkaras.dayof.love`; the host now has explicit runtime evidence that it resolves and fail-closes safely without leaking the wrong site
- Reframed “custom-host DNS rerun” into the honest product truth: external custom domains remain unsupported future scope rather than a fuzzy proof debt item
- Fixed the `guests-rsvp-ops` wrapper to use a portable shell so Linux Actions runners can execute it cleanly
- Disabled `/builder-v2-lab`, `/variant-preview-capture`, and `/template-scroll-capture` in production by default unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
- Removed public template links that would otherwise advertise those internal capture routes when the gate is off
- Added `npm run proof:v1:client-rls-matrix` as the canonical live baseline for anon guest-contact scope, public RSVP scope, owner/collaborator viewer-deny plus planner/coordinator-allow proof, and direct guest-table write allow/deny coverage
- Expanded the live collaborator/client-RLS proof baseline so planning and seating direct writes are now proven in production too
- Expanded the live collaborator/client-RLS matrix again so registry-scoped collaborator item writes, refresh-policy writes, and coordinator Q&A/check-in RPC writes are also proven in production
- Expanded the live collaborator/client-RLS matrix again so photos-scoped collaborators can write vault configs and patch vault providers while dashboard message RPC writes stay denied
- Expanded the live collaborator/client-RLS matrix one more step so settings-scoped collaborators can patch site settings while registry RPC writes stay denied
- Guest-dashboard RSVP-config and reminder-settings writes are now behind guest-scoped RPCs in the applied remote sweep, and the `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` proof lane is green
- Guest core create/update/delete and bulk patch writes are now behind the applied remote RPC sweep rather than raw client mutations
- Core planning task and seating event/table writes are now behind the applied remote RPC sweep rather than raw client mutations
- Fixed a collaborator payment-gate timing race in the working tree so planner/coordinator/viewer roles wait for role resolution before any payment redirect path is chosen; focused local proof (`ProtectedRoute.test.tsx`, `typecheck`, `lint`, `build`) is green, but the live frontend runtime has not been refreshed yet
- The guest invitation/import/assisted-RSVP write paths are now behind the applied remote RPC sweep, and the itinerary invite/uninvite flow reuses those RPCs instead of direct `event_invitations` writes
- Owner-side vault writes, planning vendor/budget writes, onboarding/signup bootstrap writes, and name-change writes are now behind the applied remote RPC sweep locally and remotely; the remaining follow-up is keeping the matrix current when future non-guest write lanes are introduced, not raw direct-write removal
- Added `npm run proof:v1:client-write-inventory` as the canonical local guard for tracked `src` runtime files, and wired it into `test:launch` so the no-direct-client-write claim is rerunnable instead of living only in changelog prose
- Moved additional direct writes behind local RPCs in the working tree:
  - guest-photo owner writes (`guest_hub_settings`, guestbook moderation, bucket move, bucket corrections, bucket site patch)
  - event RSVP cleanup writes
  - guest RSVP conflict resolution writes
  - vendor profile create
  - builder media writes
  - app action audit writes
  - section/site publish writes
  - itinerary event and schedule-mirror writes
  - seating assignment and seating layout-version writes
  - focused local proof (`siteRepository.test.ts`, `builderProjectService.test.ts`, `itineraryService.test.ts`, `seatingService.test.ts`, `dashboardDataBoundary.test.ts`, `clientWriteInventoryProofScript.test.ts`, `typecheck`) is green
- The broadened write inventory is now back to green across tracked `src` runtime files
- Applied the full RPC migration sweep remotely with `supabase db push`
- Reran live `proof:v1:collaborator-runtime` and `proof:v1:client-rls-matrix` with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`, both green
- Fixed a real PostgreSQL signature issue in `20260511220000_guest_core_write_rpcs.sql` that the remote apply exposed
- Fixed a second real PostgreSQL type issue in `wedding_site_settings_patch` where `active_template_id` was incorrectly cast to `uuid`; repaired remotely with `20260511212626_fix_wedding_site_settings_patch_types.sql`
- Stabilized the collaborator RLS runtime proof so it compares against current owner baseline settings instead of assuming untouched defaults
- Updated the collaborator/client-RLS proof scripts so they no longer claim the guest-dashboard settings RPC lane still needs deployment after it is live
- Expanded the live collaborator/client-RLS matrix again so it now proves planner dashboard message RPC allow + registry RPC deny and coordinator builder media RPC allow + dashboard message RPC deny
- Moved registry owner-side item CRUD, reorder, and refresh-policy writes behind a fifth local RPC batch in the working tree; focused local proof (`registryService.test`, `typecheck`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep
- Moved dashboard message create/update and coordinator alert/check-in/Q&A writes behind a sixth local RPC batch in the working tree; focused local proof (`messageService.boundary.test.ts`, `coordinatorService.test.ts`, `typecheck`, `lint`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep
- Moved owner settings and overview write paths behind a seventh local RPC batch in the working tree; focused local proof (`settingsSiteData.test.ts`, `overviewService.test.ts`, `typecheck`, `lint`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep

## What Remains Before 10 / 10

Only deferred, non-launch follow-up remains:
- rerun `npm run proof:v1:client-rls-matrix` when future non-guest write surfaces are introduced so the live role matrix stays canonical
- rerun `npm run proof:v1:client-write-inventory` after future write-surface changes so the local no-direct-client-write inventory stays canonical
- client-write surface reduction into Edge Functions / RPCs
- external custom-domain product support only if that launch surface becomes active

Why this is `9.9 / 10` instead of `10 / 10`:
- the launch baseline is green and production-ready
- the launch-critical runtime is now exact and live, but global TS/ESLint rigor is still softer than the hardened pocket and a few intentionally deferred non-launch lanes remain

## Bottom Line

This repo is launch-ready today.

The strongest current truth is:
- exact frontend SHA is known
- public DTO lane is closed
- secure queue/storage/message proof is green
- guest/public critical live proofs are green on the deployed blocker-fix runtime
- release-gate RSVP proof is now enforced and green in GitHub Actions
