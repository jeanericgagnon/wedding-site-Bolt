# V1 Smoke Proof Log

_Date:_ `2026-05-12`
_Production:_ [dayof.love](https://dayof.love)
_Latest verified deploy:_ `dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh`
_Exact frontend SHA:_ `17c8089f`
_Launch call right now:_ `GO`

## Current Truth

- The main verified live runtime is exact frontend SHA `17c8089f`.
- Public DTO minimization is closed and live-proven.
- Secure service-role, queue, storage/media, and email queue-processing proof lanes are green with the provided secure key.
- Guest contact, RSVP, public site, guest hub, photo, registry preview, collaborator runtime, and AI/provider launch lanes are green on the blocker-fix runtime.
- Client-facing RLS proof now has one canonical live matrix command: `npm run proof:v1:client-rls-matrix`.
- Active runtime pages now also have one canonical local inventory guard: `npm run proof:v1:client-write-inventory`.
- `test:launch`, `ci-hardpass`, and `Release Launch Gate` now all require `npm run proof:v1:ast-security`, `npm run proof:v1:client-rls-matrix -- --require-live`, and live `registry-preview-ssrf`.
- Public vault contribution is now live-proven instead of deferred.
- `.dayof.love` subdomain routing now has a dedicated live proof and is no longer deferred.
- External custom domains remain unsupported product scope, not a pending proof lane.
- 2026-05-12 05:50 PM PDT:
  - `npm test -- --run src/lib/publicAccessArtifacts.test.ts src/pages/GuestContactUpdate.test.ts src/lib/guestLookupScopeProofScript.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/routeCompositionBoundary.test.ts src/lib/securityAutomationProof.test.ts` -> `PASS`
  - `npm run proof:v1:security-automation` -> `PASS`
  - `npm run proof:v1:ast-security` -> `PASS`
  - `npm run proof:v1:test-lanes` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run lint -- --quiet` -> `PASS`
  - `npm run build` -> `PASS`
  - `npm run proof:v1:board:md` -> `PASS`
  - `npm test -- --run src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts src/lib/guestLookupScopeProofScript.test.ts src/lib/securityAutomationProof.test.ts` -> `PASS`
  - local guest-contact hardening now accepts a guest-specific RSVP invite token as the strongest verifier and still requires the phone-last-4 step-up check before whole-party updates when that stronger token is absent
  - no deploy was run, so production still reflects the earlier guest-contact verifier behavior
- 2026-05-12 04:34 PM PDT:
  - `supabase functions list --project-ref atuzuobpprjstfmdnwso` -> `PASS`
    - live inventory now includes `vault-contribution-public` and `vault-entry-submit`
  - `supabase secrets set ALLOW_VAULT_QA_OPEN=true --project-ref atuzuobpprjstfmdnwso --yes` -> `PASS`
  - `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` -> `LIVE PASS`
  - `supabase secrets set ALLOW_VAULT_QA_OPEN=false --project-ref atuzuobpprjstfmdnwso --yes` -> `PASS`
  - `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live` -> `LIVE PASS`
  - public vault contribution now has live save/readback/delete proof
  - `.dayof.love` host routing now has dedicated live fail-closed/no-leak proof
- 2026-05-12 03:46 PM PDT:
  - `supabase secrets set PUBLIC_SITE_SESSION_SECRET_V1=... --project-ref atuzuobpprjstfmdnwso --yes` -> `PASS`
  - `supabase functions deploy guest-contact-submit --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix -- --require-live` -> `LIVE PASS`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
  - guest contact update now requires a full name plus the first few characters of the guest email address before a signed household-scoped contact session is issued
- 2026-05-12 11:37 AM PDT:
  - `supabase db push --linked --include-all` -> `PASS`
  - `vercel deploy --prod --yes` -> `PASS` (`dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh`, aliased to `dayof.love`)
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
  - `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
  - `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
  - `admin_access_check()` is now applied remotely and the frontend/admin route gate is live on the RPC-backed path
- 2026-05-12 11:18 AM PDT:
  - `npm test -- --run src/lib/publicSessionSecretBoundary.test.ts src/lib/adminAccessRpcBoundary.test.ts src/lib/signedSessionShared.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts src/lib/launchEdgeFunctions.test.ts` -> `PASS`
  - `npm run proof:v1:public-access-coverage` -> `PASS`
  - `supabase functions deploy public-site-access --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `supabase functions deploy guest-contact-lookup --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `supabase functions deploy guest-contact-submit --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `supabase functions deploy validate-rsvp-token --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `supabase functions deploy photo-upload --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `supabase functions deploy interactive-section-public --project-ref atuzuobpprjstfmdnwso --no-verify-jwt` -> `PASS`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
  - `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
  - `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
  - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
  - public/session functions now use `PUBLIC_SITE_SESSION_SECRET_V1` / `PUBLIC_SITE_SESSION_SECRET` instead of `SUPABASE_SERVICE_ROLE_KEY`
  - direct regular-user `admin_users` reads now fail or return no rows in the live matrix
  - the remaining admin-route hardening step was the remote apply of `20260512050000_harden_admin_access_check.sql`; that is now complete
- 2026-05-12 08:45 AM PDT:
  - `npm run proof:v1:strict-pocket` -> `PASS`
  - `npm test -- --run src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/strictPocketTypecheck.test.ts src/lib/stripeService.test.ts src/lib/siteConfigValidate.test.ts src/lib/vendorProfiles.test.ts src/lib/vendorProfiles.boundary.test.ts` -> `PASS`
  - `docs/service-role-authorization-disposition-2026-05-05.md` is now aligned with the live-green guest-dashboard settings and broader client-RLS matrix lanes
  - the serialized RSVP capacity function is explicitly called out in the repo proof story
- 2026-05-12 09:10 AM PDT:
  - `./node_modules/.bin/eslint src/lib/publicSiteSlug.ts src/lib/publicSiteAccess.ts src/lib/publicRenderContract.ts src/components/auth/ProtectedRoute.tsx src/lib/siteConfigValidate.ts src/lib/stripeService.ts src/lib/vendorProfiles.ts` -> `PASS`
  - `npm run proof:v1:strict-pocket` -> `PASS`
  - `npm run proof:v1:test-lanes` -> `PASS`
  - the launch-critical strict pocket now also covers the public access / public DTO contract boundary
- 2026-05-12 09:18 AM PDT:
  - `npm run proof:v1:strict-pocket` -> `PASS`
  - `npm run proof:v1:test-lanes` -> `PASS`
  - `npm test -- --run src/lib/strictPocketTypecheck.test.ts src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts src/lib/publicSiteRenderModel.test.ts` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - the launch-critical strict pocket now also covers the broader auth/public runtime boundary: `activeSite.ts`, `customerSafeError.ts`, `mediaUrl.ts`, `paymentGate.ts`, `publicSiteRenderModel.ts`, and `publicSectionDataSanitizer.ts`
- 2026-05-12 09:35 AM PDT:
  - `npm test -- --run src/lib/internalToolingRoutes.test.ts src/lib/internalToolingRouteBoundary.test.ts src/lib/clientWriteInventoryProofScript.test.ts src/lib/signedSessionShared.test.ts src/lib/releaseLaunchGate.test.ts src/lib/strictPocketTypecheck.test.ts` -> `PASS`
  - `npm run proof:v1:strict-pocket` -> `PASS`
  - `npm run proof:v1:test-lanes` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run proof:v1:registry-preview-ssrf -- --require-live` -> `LIVE PASS`
  - internal tooling routes now require admin auth in addition to the env flag
  - `test:launch` and `Release Launch Gate` now require the live registry-preview SSRF proof lane
  - signed session verification now fails closed on malformed parsing and supports versioned token envelopes
- 2026-05-12 07:49 AM PDT:
  - `npm run proof:v1:test-lanes` -> `PASS`
  - `npm test -- --run src/lib/ciHardpassWorkflow.test.ts src/lib/releaseLaunchGate.test.ts src/lib/aiExposureProofScript.test.ts src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts` -> `PASS`
  - generic `ci-hardpass` no longer soft-skips strict Supabase RSVP smoke when secrets are missing
  - `deploy_prod_guarded.mjs` no longer allows `SKIP_POSTDEPLOY_PROOF`; postdeploy proof is mandatory
- 2026-05-11 08:48 PM PDT:
  - broadened `proof:v1:client-write-inventory` from active pages to all tracked `src` runtime files
  - after the builder/section/itinerary/seating RPC sweep, result is now `PASS`
  - no direct client `.insert/.update/.upsert/.delete` calls remain in tracked shipped `src` runtime files
  - final local batches added:
    - `20260512030000_builder_section_itinerary_write_rpcs.sql`
    - `20260512031500_seating_assignment_version_rpcs.sql`
  - same sweep moved section writes, builder project publish, itinerary event/schedule mirror writes, and seating assignment/layout-version writes behind local RPCs
  - focused proof green:
    - `npm test -- --run src/data/siteRepository.test.ts src/builder/services/builderProjectService.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/clientWriteInventoryProofScript.test.ts`
    - `npm run proof:v1:client-write-inventory`
    - `npm run typecheck -- --pretty false`
    - `git diff --check`
- 2026-05-11 09:02 PM PDT:
  - applied the full pending RPC sweep remotely with `supabase db push`
  - the remote apply surfaced one real SQL issue in `20260511220000_guest_core_write_rpcs.sql`, which was fixed by giving `p_guest_ids` a default value and rerunning the push cleanly
  - reran live proof with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`:
    - `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
    - `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
  - refreshed proof scripts so they no longer claim the guest-dashboard settings RPC lane still needs deployment after it is live
- That matrix now explicitly proves guest, planning, settings, registry, seating, coordinator, message, photo, and vault-config permission lanes stay scoped while direct timeline/settings and other ungranted writes remain denied.
- 2026-05-11 10:06 PM PDT:
  - expanded the live collaborator/client-RLS proof again so it now covers planner `itinerary_event_write` allow + registry deny and settings `section_write` allow + registry deny
  - the first live reruns exposed real production drift, not flaky proof:
    - missing `itinerary_events.dress_code`
    - missing `itinerary_events.notes`
    - `itinerary_event_write` create path inserted `NULL` ids
    - `itinerary_event_write` still had text/time coercion drift
    - `section_write` treated explicit-id creates as missing-row updates
  - remote repairs landed via:
    - `20260512040000_reconcile_itinerary_dress_code_column.sql`
    - `20260512040500_reconcile_itinerary_runtime_columns.sql`
    - `20260512041000_fix_itinerary_event_write_time_types.sql`
    - `20260512041500_fix_itinerary_event_write_ids.sql`
    - `20260512042000_fix_section_write_create_with_explicit_id.sql`
  - focused proof green:
    - `npm test -- --run src/lib/sectionRpcSafety.test.ts src/lib/itineraryRpcSafety.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
    - `npm run typecheck -- --pretty false`
    - `git diff --check`
  - live proof green again after the repairs:
    - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
    - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- The matrix now explicitly proves guest, planning, itinerary, settings, sections, registry item/policy, seating, coordinator, message, photo, vault-config, and vault-provider permission lanes stay scoped while direct timeline/settings and other ungranted writes remain denied.
- 2026-05-12 07:14 AM PDT:
  - expanded the live collaborator/client-RLS proof again so registry-scoped collaborators can write `registry_refresh_policy_write` while settings-scoped collaborators stay denied on that lane
  - tightened `proof:v1:client-write-inventory` so the tracked-runtime scan now also guards double-quoted and backtick table names and skips `.d.ts` noise
  - the first live rerun exposed one real production DB defect:
    - `registry_refresh_policy_write` mixed uuid/text in `registry_refresh_policy_updated_by`
  - remote repair landed via:
    - `20260512043000_fix_registry_refresh_policy_write_updated_by_type.sql`
  - focused proof green:
    - `npm test -- --run src/lib/clientWriteInventoryProofScript.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
    - `npm run proof:v1:client-write-inventory`
    - `npm run typecheck -- --pretty false`
    - `git diff --check`
  - live proof green after the repair:
    - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
    - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Payment gate now fails closed on billing lookup failure.
- RSVP capacity enforcement now serializes through the deployed database function path.
- Release launch CI now hard-fails without strict Supabase RSVP proof secrets and passes with the configured repo secrets.
- Internal tooling routes are now disabled in production by default unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`.
## Latest Runtime Proof Results

- `npm test` -> `PASS` (`537/537` files, `3321/3321` tests)
- `npm run typecheck -- --pretty false` -> `PASS`
- `npm run lint -- --quiet` -> `PASS`
- `npm run build` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run test:smoke` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run proof:v1:client-write-inventory` -> `PASS`
- `npm run proof:v1:service-role-authorization` -> `PASS`
- `npm run proof:v1:email-messaging-authorization` -> `PASS`
- `npm run proof:v1:launch-closeout` -> `PASS`
- `npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
- `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` -> `LIVE PASS`
- `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live` -> `LIVE PASS`

## 2026-05-11 07:57 PM PDT - Vault And Planning Vendor/Budget RPC Batch (Local Only)

- Added local migration `20260512013000_vault_planning_write_rpcs.sql`
- Moved owner-side vault writes behind local RPCs:
  - `wedding_site_vault_provider_patch`
  - `vault_config_write`
  - `vault_seed_starter_configs`
  - `vault_entry_write`
  - `vault_entry_delete`
  - `vault_config_delete`
- Moved planning vendor and budget writes behind local RPCs:
  - `planning_vendor_write`
  - `planning_vendor_delete`
  - `planning_budget_item_write`
  - `planning_budget_item_delete`
- Focused proof green:
  - `npm test -- --run src/pages/dashboard/vaultService.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/planningServiceStarterSuite.test.ts`
  - `git diff --check`
- Not live yet: migration apply/deploy is still pending, so runtime proof remains gated until the local RPC batches are deployed.

## 2026-05-11 08:04 PM PDT - Onboarding And Signup Write RPC Batch (Local Only)

- Added local migration `20260512014500_onboarding_signup_write_rpcs.sql`
- Moved onboarding/signup writes behind local RPCs:
  - `wedding_site_bootstrap_write`
  - `onboarding_event_seed_insert_many`
  - existing `wedding_site_settings_patch`
  - existing `guest_dashboard_guest_write`
- Focused proof green:
  - `npm test -- --run src/pages/onboarding/onboardingService.test.ts src/pages/signupService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `git diff --check`
- Not live yet: migration apply/deploy is still pending, so runtime proof remains gated until the local RPC batches are deployed.

## 2026-05-11 08:10 PM PDT - Name Change Write RPC Batch (Local Only)

- Added local migration `20260512020000_name_change_write_rpcs.sql`
- Moved name-change planner writes behind local RPCs:
  - `name_change_case_write`
  - `name_change_documents_replace`
  - `name_change_extracted_fields_replace`
  - `name_change_plan_snapshot_write`
  - `name_change_reminders_replace`
- Focused proof green:
  - `npm test -- --run src/pages/dashboard/planning/nameChangeService.test.ts src/lib/dashboardDataBoundary.test.ts`
  - `npm run typecheck -- --pretty false`
  - `git diff --check`
- Inventory note:
  - `rg -n "\\.from\\('.*'\\)\\.(insert|update|upsert|delete)" src/pages/dashboard src/pages -g '!**/*.test.*'` now returns no matches
- Not live yet: migration apply/deploy is still pending, so runtime proof remains gated until the local RPC batches are deployed.

## 2026-05-11 08:18 PM PDT - Canonical Client Write Inventory Proof Added

- Added `scripts/v1-proof-client-write-inventory.mjs`.
- Added `npm run proof:v1:client-write-inventory`.
- Wired the new guard into `test:launch`.
- Focused proof green:
  - `npm test -- --run src/lib/clientWriteInventoryProofScript.test.ts src/lib/proofBoardFreshness.test.ts src/lib/launchControlMatrices.test.ts`
  - `npm run proof:v1:client-write-inventory`
  - `git diff --check`
- Result:
  - the active `src/pages` / `src/pages/dashboard` no-direct-client-write claim is now a canonical rerunnable proof lane instead of a loose inventory note
  - runtime truth is still unchanged until the local RPC batches are applied and redeployed
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

## 2026-05-11 08:48 PM PDT - Builder / Section / Itinerary / Seating RPC Sweep (Local Only)

- Added local migrations:
  - `20260512030000_builder_section_itinerary_write_rpcs.sql`
  - `20260512031500_seating_assignment_version_rpcs.sql`
- Moved the last known tracked-`src` direct-write clusters behind local RPCs:
  - section create/update/upsert/reorder/delete
  - builder project publish
  - itinerary event insert/update/delete/reorder
  - itinerary schedule mirror sync
  - seating assignment write/delete/upsert/invalidate
  - seating layout version create/restore
- Focused proof green:
  - `npm test -- --run src/data/siteRepository.test.ts src/builder/services/builderProjectService.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/clientWriteInventoryProofScript.test.ts`
  - `npm run proof:v1:client-write-inventory`
  - `npm run typecheck -- --pretty false`
  - `git diff --check`
- Result:
  - the tracked shipped `src` runtime is now locally clear of direct client `.insert/.update/.upsert/.delete` calls
  - the remaining work is remote apply/deploy plus fresh live collaborator/client-RLS proof, not another known local direct-write cluster

## 2026-05-11 09:02 PM PDT - Remote RPC Apply And Live Matrix Refresh

- Ran `supabase db push` successfully against project `atuzuobpprjstfmdnwso`.
- Applied the RPC migration sweep through:
  - `20260511200000_guest_dashboard_settings_rpcs.sql`
  - `20260511211500_planning_seating_write_rpcs.sql`
  - `20260511220000_guest_core_write_rpcs.sql`
  - `20260511233000_guest_invitation_rsvp_rpcs.sql`
  - `20260511234500_registry_write_rpcs.sql`
  - `20260512001000_message_coordinator_write_rpcs.sql`
  - `20260512012000_settings_overview_write_rpcs.sql`
  - `20260512013000_vault_planning_write_rpcs.sql`
  - `20260512014500_onboarding_signup_write_rpcs.sql`
  - `20260512020000_name_change_write_rpcs.sql`
  - `20260512023000_media_audit_write_rpcs.sql`
  - `20260512024500_guest_photo_misc_write_rpcs.sql`
  - `20260512030000_builder_section_itinerary_write_rpcs.sql`
  - `20260512031500_seating_assignment_version_rpcs.sql`
- The first push exposed one real PostgreSQL function-signature issue; the migration was fixed locally and the second push landed cleanly.
- Live reruns after the apply:
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Result:
  - guest-dashboard settings RPC proof is now part of the live role matrix
  - the remaining work is breadth expansion and future guard upkeep, not pending RPC deployment

## 2026-05-11 09:11 PM PDT - Broader Planner / Coordinator RPC Matrix Coverage

- Expanded the live collaborator runtime proof beyond planning/seating:
  - planner can create dashboard messages through `dashboard_message_write`
  - planner is denied ungranted registry writes through `registry_item_write`
  - coordinator can create builder media assets through `builder_media_asset_write`
  - coordinator is denied ungranted dashboard message writes
- Focused proof green:
  - `npm test -- --run src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
  - `npm run typecheck -- --pretty false`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Result:
  - the live role matrix now covers guest, planning, seating, messages, registry, and photos
  - the remaining work is owner-only / future-surface breadth, not the mainstream collaborator runtime

## 2026-05-11 09:20 PM PDT - Registry And Coordinator RPC Matrix Coverage

- Expanded the same live collaborator/client-RLS proof again:
  - registry-scoped collaborator can create registry items through `registry_item_write`
  - registry-scoped collaborator is denied `dashboard_message_write`
  - coordinator-scoped collaborator can use `coordinator_guest_checkin_write`
  - coordinator-scoped collaborator can use `coordinator_qna_write`
- A first live attempt exposed a real fixture bug, not an auth bug:
  - the proof was trying `item_type: 'gift'`
  - live schema only allows `product` or `cash_fund`
  - corrected fixture to `product` and reran green
- Focused proof green:
  - `npm test -- --run src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
  - `npm run typecheck -- --pretty false`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Result:
  - the live collaborator/client-RLS matrix now covers guest, planning, registry, seating, coordinator, messages, and photos
  - the remaining work is owner-only / future-surface breadth, not mainstream collaborator auth

## 2026-05-11 09:32 PM PDT - Settings RPC Type Repair And Settings-Scoped Matrix Coverage

- Expanded the same live collaborator/client-RLS proof again:
  - settings-scoped collaborator can patch site settings through `wedding_site_settings_patch`
  - settings-scoped collaborator is denied `registry_item_write`
- The first live attempt exposed a real PostgreSQL function bug, not an auth bug:
  - `wedding_site_settings_patch` was mixing `text` and `uuid` in a `CASE` expression for `active_template_id`
  - source migration `20260512012000_settings_overview_write_rpcs.sql` was corrected
  - forward remote repair landed as `20260511212626_fix_wedding_site_settings_patch_types.sql`
- Focused proof green:
  - `npm test -- --run src/lib/settingsErrorSafety.test.ts src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
  - `npm run typecheck -- --pretty false`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Result:
  - the live collaborator/client-RLS matrix now covers guest, planning, settings, registry, seating, coordinator, messages, and photos
  - the remaining work is owner-only / future-surface breadth, not mainstream collaborator auth

## 2026-05-11 09:45 PM PDT - Photos / Vault RPC Matrix Coverage

- Expanded the same live collaborator/client-RLS proof again:
  - photos-scoped collaborator can create vault configs through `vault_config_write`
  - photos-scoped collaborator can patch `vault_storage_provider` through `wedding_site_vault_provider_patch`
  - photos-scoped collaborator is denied `dashboard_message_write`
- The first live attempt exposed a real fixture bug, not an auth bug:
  - the proof used an invalid `vault_index`
  - live schema only allows `vault_index` between `1` and `5`
  - corrected fixture to a valid vault slot and reran green
- Focused proof green:
  - `npm test -- --run src/lib/collaboratorPermissionRlsProof.test.ts src/lib/clientRlsMatrixProofScript.test.ts`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:collaborator-runtime` -> `LIVE PASS`
  - `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- Result:
  - the live collaborator/client-RLS matrix now covers guest, planning, settings, registry, seating, coordinator, messages, photos, vault-config writes, and vault-provider writes
  - the remaining work is owner-only / future-surface breadth, not mainstream collaborator auth

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

### 2026-05-11 06:24 PM PDT - Planning And Seating Direct-Write RLS Coverage Added

- Expanded `tests/e2e/collaborator-permission-rls.spec.ts` so live collaborator proof now covers:
  - planner direct `planning_tasks` writes
  - coordinator direct `seating_events` writes
  - coordinator direct `seating_tables` writes
- Reran:
  - `npm run proof:v1:collaborator-runtime`
  - `npm run proof:v1:client-rls-matrix`
- Result:
  - live collaborator runtime proof is green with guest, planning, and seating direct-write coverage
  - the canonical client-RLS matrix now carries that same broader role-scoped proof
  - the remaining local-only gap in this cluster is the undeployed guest-dashboard settings RPC batch

### 2026-05-11 06:35 PM PDT - Planning And Seating Core Write RPC Batch (Local Only)

- Added migration `20260511211500_planning_seating_write_rpcs.sql`.
- Moved these dashboard write paths off raw client table mutations in the working tree:
  - `planning_tasks`
  - `seating_events`
  - `seating_tables`
- Added focused service proof:
  - `npm test -- --run src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/seating/seatingService.test.ts` -> `PASS`
  - `npm run typecheck -- --pretty false` -> `PASS`
  - `npm run lint -- --quiet` -> `PASS`
  - `npm run build` -> `PASS`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch counts as runtime hardening

### 2026-05-11 06:46 PM PDT - Guest Core Write RPC Batch (Local Only)

- Added migration `20260511220000_guest_core_write_rpcs.sql`.
- Moved guest core create/update/delete and bulk patch paths off raw client guest-table writes in the working tree.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/seating/seatingService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch counts as runtime hardening

### 2026-05-11 07:12 PM PDT - ProtectedRoute Role-Timing Hardening (Local Only)

- Fixed a collaborator payment-gate timing race in `ProtectedRoute`.
- Focused local proof is green:
  - `npm test -- --run src/components/auth/ProtectedRoute.test.tsx`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
- Result:
  - no live-state change yet
  - a frontend deploy is still required before this batch changes runtime truth

### 2026-05-11 07:21 PM PDT - Guest Invitation / Import / RSVP RPC Batch (Local Only)

- Added migration `20260511233000_guest_invitation_rsvp_rpcs.sql`.
- Moved these guest dashboard write paths off raw client table mutations in the working tree:
  - event invitation insert/delete flows
  - imported guest insert flow
  - imported RSVP replace flow
  - assisted RSVP save flow
  - guest dependency cleanup RSVP/event-invitation deletes
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/guests/guestService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live collaborator/client-RLS proof are still required before this batch counts as runtime hardening

### 2026-05-11 07:27 PM PDT - Itinerary Invitation RPC Reuse (Local Only)

- Reused the new guest invitation RPCs from the itinerary dashboard service.
- Event-level guest invite/uninvite flows no longer depend on direct client `event_invitations` upsert/delete paths in the working tree.
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts`
  - `npm run typecheck -- --pretty false`
- Result:
  - no live-state change yet
  - runtime truth still depends on the already-pending RPC migration apply/deploy and fresh live proof

### 2026-05-11 07:33 PM PDT - Registry Owner Write RPC Batch (Local Only)

- Added migration `20260511234500_registry_write_rpcs.sql`.
- Moved these registry dashboard owner-side write paths off raw client table mutations in the working tree:
  - registry refresh budget writes
  - registry refresh policy writes
  - registry item create/update/delete
  - registry item reorder
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/registry/registryService.test.ts`
  - `npm run typecheck -- --pretty false`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch counts as runtime hardening

### 2026-05-11 07:40 PM PDT - Message And Coordinator Write RPC Batch (Local Only)

- Added migration `20260512001000_message_coordinator_write_rpcs.sql`.
- Moved these working-tree write paths off raw client table mutations:
  - dashboard message create/update
  - coordinator alert-message insert
  - coordinator guest check-in update
  - coordinator Q&A create/update
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch counts as runtime hardening

### 2026-05-11 07:49 PM PDT - Settings And Overview Write RPC Batch (Local Only)

- Added migration `20260512012000_settings_overview_write_rpcs.sql`.
- Moved these working-tree write paths off raw client table mutations:
  - owner settings site patch writes
  - collaborator invite create/revoke
  - overview wedding-data/site-json draft patch writes
  - interactive suggestion hide
- Focused local proof is green:
  - `npm test -- --run src/pages/dashboard/overviewService.test.ts src/pages/dashboard/settings/settingsSiteData.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
- Result:
  - no live-state change yet
  - apply/deploy plus fresh live proof are still required before this batch counts as runtime hardening

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

### 2026-05-12 05:36 PM PDT - Guest Contact Step-Up + Security Automation (Local Only)

- Local hardening is green:
  - `npm run proof:v1:security-automation`
  - `npm run proof:v1:test-lanes`
  - `npm test -- --run src/lib/securityAutomationProof.test.ts src/lib/routeCompositionBoundary.test.ts src/lib/internalToolingRouteBoundary.test.ts src/lib/guestLookupScopeProofScript.test.ts src/pages/GuestContactUpdate.test.ts src/lib/launchEdgeFunctions.test.ts`
  - `npm run typecheck -- --pretty false`
  - `npm run lint -- --quiet`
  - `npm run build`
- Added:
  - phone-last-4 step-up verifier for household-wide guest-contact updates
  - Dependabot, Semgrep, CodeQL, and Gitleaks repo automation
  - grouped route modules under `src/routes/*`
- No deploy was run in this batch.
- Live follow-up truth:
  - `npm run proof:v1:guest-lookup-scope` currently still exercises the older deployed guest-contact runtime
  - until guest-contact functions/frontend are redeployed, this batch is branch-hardening rather than runtime-hardening
