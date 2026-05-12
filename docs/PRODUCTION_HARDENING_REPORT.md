# Production Hardening Report

_Updated:_ `2026-05-11 08:48 PM PDT`

## Current Score

- Readiness score: `9.9 / 10`
- Launch verdict: `GO`
- Production-ready: `YES`

## Exact Runtime Identity

- Branch: `codex/v1-finish-hard-gates-3`
- Exact frontend Git SHA: `f0cbf841`
- Exact frontend commit: `Fix payment gate and serialize RSVP capacity`
- Exact Vercel production deploy: `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
- Production URL: [dayof.love](https://dayof.love)
- Supabase project: `atuzuobpprjstfmdnwso`

## Exact Blockers

No active `P0` / `P1` launch blockers remain.

## Exact Proof Gaps

No active launch-critical proof gaps remain.

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
- broader client-RLS role matrix expansion
- client-write surface reduction into Edge Functions / RPCs
- local-only guest/planning/seating RPC batches still need migration apply/deploy and fresh live proof:
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

## Exact Proof State

Fresh local proof:
- `npm test` -> `PASS` (`537/537` files, `3321/3321` tests)
- `npm run typecheck -- --pretty false` -> `PASS`
- `npm run lint -- --quiet` -> `PASS`
- `npm run build` -> `PASS`
- `npm run test:security` -> `PASS`
- `npm run proof:v1:public-access-coverage` -> `PASS`
- `npm run proof:v1:client-write-inventory` -> `PASS`
  - broadened tracked-`src` runtime scan now reports no direct client `.insert/.update/.upsert/.delete` calls in shipped `src` runtime files
- `npm run proof:v1:board:md` -> `PASS`
- `npm run guard:file-size` -> `PASS`
- `npm run guard:assets` -> `PASS`
- `npm run proof:v1:performance-budget` -> `PASS`
- `git diff --check` -> `PASS`
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
- collaborator runtime now also proves guest-scoped collaborators can directly mutate guest rows, planner-scoped collaborators can directly write planning tasks, and coordinator-scoped collaborators can directly write seating events/tables, while direct timeline/settings writes remain denied without permission
- `npm run test:smoke` -> `PASS`

Fresh production proof after exact-SHA frontend deploy:
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` -> `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` -> `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops` -> `LIVE PASS`
- `npm run proof:v1:guest-lookup-scope` -> `LIVE PASS`
- `npm run proof:v1:client-rls-matrix` -> `LIVE PASS`
- the canonical client-RLS matrix now includes direct guest/planning/seating write allow/deny coverage in addition to anon guest-contact and public RSVP scope
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

Current live launch baseline:
- frontend: `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q` from exact runtime SHA `f0cbf841`
- `submit-rsvp --no-verify-jwt`: redeployed on the serialized capacity path after migration `20260511170500_serialize_submit_rsvp_capacity.sql`
- `public-site-access --no-verify-jwt`: same-day already confirmed and live-proven
- `guest-contact-lookup --no-verify-jwt`: same-day already confirmed and live-proven
- `guest-contact-submit --no-verify-jwt`: same-day already confirmed and live-proven
- `photo-upload --no-verify-jwt`: same-day already confirmed and live-proven
- `process-email-queue`: same-day already confirmed and live-proven
- `translate-site-content`: same-day already confirmed and live-proven

Explicitly deferred / not in current launch baseline:
- `vault-contribution-public --no-verify-jwt`
- `vault-entry-submit --no-verify-jwt`

Those two deploy commands previously reported success, but the live inventory/runtime still does not confirm the expected state. The public vault lane therefore stays explicitly deferred/fail-closed instead of being counted as launch-ready.

## What Changed Since Last Report

- Deployed the blocker-fix frontend runtime on exact SHA `f0cbf841`
- Promoted Vercel production deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
- Applied migration `20260511170500_serialize_submit_rsvp_capacity.sql` to the linked Supabase project
- Deployed `submit-rsvp --no-verify-jwt` on the serialized RSVP capacity path
- Reran live `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, and `guest-lookup-scope` against the blocker-fix runtime and kept them green
- Wired GitHub Actions secrets for the Supabase RSVP proof lane
- Proved the release gate twice in Actions:
  - `25705386070` green with the broader workflow shape
  - `25705683563` green with the focused launch-critical proof shape
- Fixed the `guests-rsvp-ops` wrapper to use a portable shell so Linux Actions runners can execute it cleanly
- Disabled `/builder-v2-lab`, `/variant-preview-capture`, and `/template-scroll-capture` in production by default unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
- Removed public template links that would otherwise advertise those internal capture routes when the gate is off
- Added `npm run proof:v1:client-rls-matrix` as the canonical live baseline for anon guest-contact scope, public RSVP scope, owner/collaborator viewer-deny plus planner/coordinator-allow proof, and direct guest-table write allow/deny coverage
- Expanded the live collaborator/client-RLS proof baseline so planning and seating direct writes are now proven in production too
- Moved guest-dashboard RSVP-config and reminder-settings writes behind guest-scoped RPCs in the working tree; migration apply, deploy, and `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` proof are still pending, so the current launch runtime truth is unchanged
- Moved guest core create/update/delete and bulk patch writes behind a third local RPC batch in the working tree; focused local proof (`guestService.test`, `typecheck`, `lint`, `build`) is green, but migration apply/deploy/live proof are still pending so the current launch runtime truth is unchanged
- Moved core planning task and seating event/table writes behind a second local RPC batch in the working tree; focused local proof (`planningService.test`, `seatingService.test`, `typecheck`, `lint`, `build`) is green, but migration apply/deploy/live proof are still pending so the current runtime truth is unchanged
- Fixed a collaborator payment-gate timing race in the working tree so planner/coordinator/viewer roles wait for role resolution before any payment redirect path is chosen; focused local proof (`ProtectedRoute.test.tsx`, `typecheck`, `lint`, `build`) is green, but the live frontend runtime has not been refreshed yet
- Moved the remaining guest invitation/import/assisted-RSVP direct write paths behind a fourth local RPC batch in the working tree; focused local proof (`guestService.test`, `typecheck`, `lint`, `build`) is green, but migration apply/deploy/live proof are still pending so the current launch runtime truth is unchanged
- Reused the new invitation RPCs from the itinerary dashboard so event-level guest invite/uninvite flows no longer depend on direct client `event_invitations` writes there; focused local proof (`itineraryService.test`, `itineraryQueryBounds.test`, `typecheck`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep
- Moved owner-side vault writes plus planning vendor/budget writes behind an eighth local RPC batch in the working tree; focused local proof (`vaultService.test`, `planningService.test`, `planningServiceStarterSuite.test.ts`, `typecheck`, `lint`, `build`) is green, but migration apply/deploy/live proof are still pending so the current runtime truth is unchanged
- Moved onboarding/signup site bootstrap, site patch, event seed insert, and guided guest import writes behind a ninth local RPC batch in the working tree; focused local proof (`onboardingService.test.ts`, `signupService.test.ts`, `typecheck`) is green, but migration apply/deploy/live proof are still pending so the current runtime truth is unchanged
- Moved the name-change planner write paths behind a tenth local RPC batch in the working tree; focused local proof (`nameChangeService.test.ts`, `dashboardDataBoundary.test.ts`, `typecheck`) is green, and the raw-write inventory no longer reports direct client `.insert/.update/.upsert/.delete` calls in `src/pages` / `src/pages/dashboard`, but migration apply/deploy/live proof are still pending so the current runtime truth is unchanged
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
- The broadened write inventory is now back to green across tracked `src` runtime files; the remaining gap is remote apply/deploy and fresh live proof, not additional known direct-write clusters
- Moved registry owner-side item CRUD, reorder, and refresh-policy writes behind a fifth local RPC batch in the working tree; focused local proof (`registryService.test`, `typecheck`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep
- Moved dashboard message create/update and coordinator alert/check-in/Q&A writes behind a sixth local RPC batch in the working tree; focused local proof (`messageService.boundary.test.ts`, `coordinatorService.test.ts`, `typecheck`, `lint`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep
- Moved owner settings and overview write paths behind a seventh local RPC batch in the working tree; focused local proof (`settingsSiteData.test.ts`, `overviewService.test.ts`, `typecheck`, `lint`) is green, and the live runtime truth stays unchanged until the already-pending RPC deploy/proof sweep

## What Remains Before 10 / 10

Only deferred, non-launch follow-up remains:
- public vault contribution enablement and live proof
- custom-host/subdomain dedicated DNS rerun
- apply/deploy the local guest/planning/seating/invitation RSVP/registry/message-coordinator/settings-overview/vault/onboarding/name-change/media-audit/guest-photo-misc/builder-section-itinerary/seating-version RPC batches, then rerun collaborator/client-RLS live proof with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`
- rerun `npm run proof:v1:client-write-inventory` after the remote apply sweep so the local no-direct-client-write inventory stays canonical
- broader client-RLS role matrix expansion for remaining non-guest dashboard write surfaces beyond guest, planning, and seating
- client-write surface reduction into Edge Functions / RPCs
- dedicated custom-host DNS rerun only if that launch surface becomes active

Why this is `9.9 / 10` instead of `10 / 10`:
- the launch baseline is green and production-ready
- the current committed branch head (`a4342334`) contains post-deploy proof hardening beyond the exact live frontend runtime SHA (`f0cbf841`)
- that remaining delta is non-runtime and non-launch, but it keeps me just shy of calling it mathematically perfect

## Bottom Line

This repo is launch-ready today.

The strongest current truth is:
- exact frontend SHA is known
- public DTO lane is closed
- secure queue/storage/message proof is green
- guest/public critical live proofs are green on the deployed blocker-fix runtime
- release-gate RSVP proof is now enforced and green in GitHub Actions
