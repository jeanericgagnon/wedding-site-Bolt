# V1 Smoke Proof Log

_Date:_ `2026-05-11`
_Production:_ [dayof.love](https://dayof.love)
_Latest verified deploy:_ `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`
_Exact frontend SHA:_ `f0cbf841`
_Launch call right now:_ `GO`

## Current Truth

- The main verified live runtime is exact frontend SHA `f0cbf841`.
- Public DTO minimization is closed and live-proven.
- Secure service-role, queue, storage/media, and email queue-processing proof lanes are green with the provided secure key.
- Guest contact, RSVP, public site, guest hub, photo, registry preview, collaborator runtime, and AI/provider launch lanes are green on the blocker-fix runtime.
- Client-facing RLS proof now has one canonical live matrix command: `npm run proof:v1:client-rls-matrix`.
- That matrix now explicitly proves direct guest, planning, and seating writes stay permission-scoped while direct timeline/settings writes remain denied without permission.
- The guest-dashboard settings RPC batch is still local-only and stays outside the live runtime baseline until deployment plus `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` proof.
- The message/coordinator write RPC batch is also local-only and stays outside the live runtime baseline until deployment and fresh live proof.
- The settings/overview owner-write RPC batch is also local-only and stays outside the live runtime baseline until deployment and fresh live proof.
- The vault/planning vendor-budget RPC batch is also local-only and stays outside the live runtime baseline until deployment and fresh live proof.
- Payment gate now fails closed on billing lookup failure.
- RSVP capacity enforcement now serializes through the deployed database function path.
- Release launch CI now hard-fails without strict Supabase RSVP proof secrets and passes with the configured repo secrets.
- Internal tooling routes are now disabled in production by default unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`.
- Public vault contribution is not part of the current launch baseline:
  - the route fails closed with safe unavailable copy
  - `vault-contribution-public` still does not appear in live function inventory

## Latest Runtime Proof Results

- `npm test` -> `PASS` (`537/537` files, `3321/3321` tests)
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
