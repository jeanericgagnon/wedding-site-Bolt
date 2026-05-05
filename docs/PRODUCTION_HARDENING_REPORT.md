# Production Hardening Report

_Created:_ 2026-05-04 9:20 PM PT
_Branch:_ `codex/v1-finish-hard-gates`
_Scope:_ 10/10 production-hardening execution. No deploy unless Eric explicitly requests it.

## Current Verdict

Final Production Readiness Score: 7/10

The app has substantial local hardening in place, but it is not production-ready until P0/P1 security boundaries are proven locally and, where production behavior is involved, after approved live deploy/proof. The active standard is real private wedding and guest data must be safe by design.

## No Feature Loss Checklist

- Public site renders public/password/invite/hidden states: PARTIAL, local static gate proof and `smoke:site` pass; live gate/subresource proof still required after deploy/function deploy.
- RSVP lookup, invite-link RSVP, household RSVP, event RSVP, and submit still work: BLOCKED live, local tests pass but `smoke:rsvp` returns 503 from the deployed function for every case.
- Registry, itinerary, guest contact update, vault upload, photo upload, builder publish, messaging, and dashboard reads still work: PARTIAL, focused local tests plus registry/site/csv/check-in/messages smoke lanes pass; live RSVP remains blocked.
- Existing smoke lanes for registry, RSVP, site, CSV mapper, check-in, messages: PARTIAL, all listed lanes pass except live `smoke:rsvp`; aggregate `test:smoke` fails because it stops at RSVP.

## Batch Log

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
