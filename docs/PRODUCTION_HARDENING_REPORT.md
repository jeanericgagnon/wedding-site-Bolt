# Production Hardening Report

_Created:_ 2026-05-04 9:20 PM PT
_Branch:_ `codex/v1-finish-hard-gates`
_Scope:_ 10/10 production-hardening execution. No deploy unless Eric explicitly requests it.

## Current Verdict

Final Production Readiness Score: 8/10

The approved production deploy and current non-SMS postdeploy proof are green, and additional local hardening continues. The app is still not 10/10 production-ready until remaining P1/P2 security, service-role integrity, live model-backed AI, and live messaging authorization proof are complete. The active standard is real private wedding and guest data must be safe by design.

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

### 2026-05-05 5:52 PM PT - Guests And Guest Photo Sharing Service-Boundary Closure

What changed:
- Moved guest RSVP reads, guest add rollback, event invitation insert/replace/rollback, guest delete dependency cleanup, delete-all dependency cleanup, imported guest insert, household updates, and imported RSVP replacement into `src/pages/dashboard/guests/guestService.ts`.
- Moved Guest Photo Sharing photo-bucket persistence into `src/pages/dashboard/guestPhotoSharingService.ts`.
- Lowered file-size guard baselines for `Guests.tsx` from 4790 to 4693 lines and `GuestPhotoSharing.tsx` from 3188 to 3168 lines.
- Verified `rg -n "supabase\\.from\\(" src/pages/dashboard -g "*.tsx"` returns no matches, so dashboard TSX pages no longer own direct table access through `supabase.from(...)`.

Commands run:
- `npm test -- src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: first sandbox run failed on Vite `.vite-temp` EPERM, then PASS after approved `npm test` rerun, 3 files and 18 tests.
- `npm run typecheck`: initial FAIL on photo-bucket type shape, then PASS after typing the service with `CanonicalPhotoBuckets` and fixing the test fixture.
- `npm run lint`: PASS with existing warning backlog, 553 warnings and 0 errors.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n "supabase\\.from\\(" src/pages/dashboard -g "*.tsx"`: PASS, no matches.

Status:
- PARTIAL. This narrows dashboard page data-boundary drift while preserving guest add/edit/delete/import, event RSVP cleanup/rollback, household updates, imported RSVP rows, and guest photo bucket persistence. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:02 PM PT - Public Interactive, Onboarding, And Signup Service Boundaries

What changed:
- Moved public interactive poll/quiz/suggestion reads and writes behind `src/sections/interactiveSectionService.ts`.
- Moved music-request suggestion writes behind the same public interactive service.
- Moved main onboarding existing-site reads, event-seed sync, existing-site update, create-site/fallback-create, guided CSV guest upsert, and signup minimal-site reservation behind `src/pages/onboarding/onboardingService.ts` and `src/pages/signupService.ts`.
- Added source-boundary tests so the touched public section components, `Onboarding.tsx`, and `Signup.tsx` do not quietly reintroduce direct `supabase.from(...)` table access for these flows.

Commands run:
- `npm test -- src/sections/interactiveSectionService.test.ts`: PASS, 3/3.
- `npm test -- src/sections/interactiveSectionService.test.ts src/pages/onboarding/onboardingService.test.ts`: PASS, 2 files and 6 tests.
- `npm run typecheck -- --pretty false`: initial FAIL on `OnboardingEventSeed.event_name` optionality, then PASS after matching the event-seed contract.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n "supabase\\.from\\(" src/pages/Onboarding.tsx src/pages/Signup.tsx src/pages/onboarding/GuidedSetup.tsx src/sections/variants/contact/interactiveHub.tsx src/sections/variants/music/requestForm.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows public/onboarding page data-boundary drift while preserving interactive public sections, music requests, onboarding profile creation/update, event seed sync, guided CSV import, and signup minimal-site behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:06 PM PT - PaymentRequired Service Boundary And Stricter Direct-Access Finding

What changed:
- Moved the `PaymentRequired.tsx` fallback wedding-site creation path into `src/pages/paymentRequiredService.ts`.
- Removed Supabase table access from the payment-required page; the service owns existing-site reuse, fallback slug normalization, collision retry, explicit `id` projection, and safe thrown setup error.
- Added a source-boundary test so the payment-required page cannot quietly reintroduce direct `wedding_sites` writes.

New finding:
- The earlier single-line `supabase.from(...)` scan was too narrow. A stricter multiline scan shows the touched public/onboarding/payment files are clean, but there are still remaining direct page-owned Supabase calls in other routes, including collaborator invite acceptance, quick start, guided setup site reads/updates, itinerary, messages, settings, overview, RSVP board, audit/error logs, and some guest-photo/admin photo flows. This keeps the P1/P2 data-boundary cleanup lane active.

Commands run:
- `npm test -- src/pages/paymentRequiredService.test.ts src/sections/interactiveSectionService.test.ts src/pages/onboarding/onboardingService.test.ts`: PASS, 3 files and 8 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows payment/setup coupling risk and corrects the direct-access proof status. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:12 PM PT - Guided Setup, Quick Start, And Collaborator Invite Service Boundaries

What changed:
- Moved guided setup site hydration plus progress/complete wedding-site updates into `src/pages/onboarding/onboardingService.ts`.
- Moved quick-start seed-site reads, final persist-site reads, and final wedding-site update into `src/pages/onboarding/onboardingService.ts`.
- Moved collaborator invite token lookup and invite site-label lookup into `src/pages/acceptCollaboratorInviteService.ts`.
- Added source-boundary tests so these pages cannot quietly reintroduce direct `wedding_sites` or invite lookup reads/writes for the extracted paths.

Commands run:
- `npm test -- src/pages/onboarding/onboardingService.test.ts src/pages/paymentRequiredService.test.ts src/sections/interactiveSectionService.test.ts`: PASS, 3 files and 8 tests.
- `npm test -- src/pages/acceptCollaboratorInviteService.test.ts src/pages/onboarding/onboardingService.test.ts src/pages/paymentRequiredService.test.ts src/sections/interactiveSectionService.test.ts`: PASS, 4 files and 10 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows first-run and collaborator-invite data-boundary risk while preserving setup, quick-start finalization, and invite-claim behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:18 PM PT - Settings Owner Data-Boundary Service Extraction

What changed:
- Moved settings collaborator invite list/create/revoke, translation status reads, slug collision lookup, template-change site read, account couple-name update, slug update, and template-change update into `src/pages/dashboard/settings/settingsSiteData.ts`.
- Reduced `Settings.tsx` to auth-only Supabase usage for password verification/update; the stricter multiline direct table-access scan now returns no matches for the settings page.
- Lowered the file-size guard baseline for `Settings.tsx` from 2328 to 2287 lines.

Commands run:
- `npm test -- src/pages/dashboard/settings/settingsSiteData.test.ts src/pages/acceptCollaboratorInviteService.test.ts src/pages/onboarding/onboardingService.test.ts`: PASS, 3 files and 7 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS after lowering the `Settings.tsx` baseline to 2287.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from" src/pages/dashboard/Settings.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows settings privacy/team/template data-boundary risk while preserving account, password, team invite, translation, slug, privacy, RSVP, notification, music, and template behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:26 PM PT - Messages Live Data Service Extraction

What changed:
- Moved Messages dashboard active-site/site load, message history reads, guest recipient reads, delivery telemetry reads, itinerary audience reads, text-credit preview reads, message create/update/reschedule/retry state writes, and analytics patch writes into `src/pages/dashboard/messages/messageService.ts`.
- Reduced `Messages.tsx` to auth/session usage for bulk-message Edge Function calls; the stricter multiline direct table-access scan now returns no matches for the Messages page.
- Added explicit projections for message site rows, guests, deliveries, itinerary events, event invitations, expiring SMS credits, and SMS credit transactions.
- Lowered the file-size guard baseline for `Messages.tsx` from 3386 to 3263 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 15/15.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS after lowering the `Messages.tsx` baseline to 3263.
- `npm run smoke:messages`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This narrows messaging data-boundary drift while preserving live/demo message loading, recipient lists, delivery fallback, itinerary audiences, SMS credit preview, compose/update/send/schedule/retry/reschedule/cancel flows, save-the-date quick create, and bulk-send invocation behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:30 PM PT - RSVP Board Service-Boundary Extraction

What changed:
- Moved RSVP Board active-site resolution, guest RSVP board reads, itinerary event lookup, and event-invitation mapping into `src/pages/dashboard/rsvpBoardService.ts`.
- Removed Supabase and active-site imports from `RsvpBoard.tsx`; the page now calls service functions and keeps rendering, polling, filtering, and stats only.
- Added explicit RSVP Board projections for guests, itinerary events, and event invitations.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/rsvpBoardFilter.test.ts`: PASS, 18/18.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from" src/pages/dashboard/RsvpBoard.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows RSVP dashboard data-boundary drift while preserving demo rows, live board load, refresh polling, manual follow-up/unreachable stats, event-invite badges, invitation progress counts, filters, and dashboard links. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:38 PM PT - Onboarding Status, Audit Log, And Error Log Service Boundaries

What changed:
- Moved Wedding Status planning-state updates into `src/pages/onboarding/onboardingService.ts`.
- Moved dashboard activity-history site resolution, guest audit log reads, guest-name lookup, and app action log loading into `src/pages/dashboard/auditLogService.ts`.
- Moved admin-user verification and app error log reads into `src/pages/dashboard/errorLogService.ts`.
- Removed direct `supabase.from(...)` table access from `WeddingStatus.tsx`, `AuditLogs.tsx`, and `ErrorLogs.tsx`.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/onboarding/onboardingService.test.ts src/pages/dashboard/rsvpBoardFilter.test.ts`: PASS, 22/22.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from" src/pages/onboarding/WeddingStatus.tsx src/pages/dashboard/AuditLogs.tsx src/pages/dashboard/ErrorLogs.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows onboarding/admin log data-boundary drift while preserving wedding status validation/navigation, venue/date/guest-count persistence, activity-history filtering/search, app-action rows, admin-only error log checks, error-log grouping, filtering, paging, copy, and CSV export behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:41 PM PT - Vault Contribution Config Service Boundary

What changed:
- Moved public vault contribution enabled-config reads into `src/pages/vaultContributionService.ts`.
- Removed direct `vault_configs` table reads from `VaultContribute.tsx`; the page still invokes Supabase Edge Functions for vault upload/submit behavior.
- Added an explicit public vault contribution config projection.

Commands run:
- `npm test -- --run src/pages/VaultContribute.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/onboarding/onboardingService.test.ts`: PASS, 34/34.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from" src/pages/VaultContribute.tsx`: PASS, no table-read matches.

Status:
- PARTIAL. This narrows guest-facing vault data-boundary drift while preserving gated public-site access checks, demo vault fallback, year-specific vault links, vault hub config listing, enabled-config filtering, upload/submit function invocation, and guest-facing invalid-state behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:49 PM PT - Overview Live Data Service Boundary

What changed:
- Moved Overview active-site/site load, guest RSVP summary reads, registry/photo/vault counts, interactive suggestion/vote reads, builder user-edited marker persistence, and draft-from-brief site update into `src/pages/dashboard/overviewService.ts`.
- Removed Supabase and active-site imports from `Overview.tsx`; the page now owns rendering/orchestration while the service owns explicit table projections and writes.
- Added explicit Overview projections for site rows, guest rows, draft source rows, builder site JSON, interactive suggestions, and interactive votes.

Commands run:
- `npm test -- --run src/pages/dashboard/overviewService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|from '../../lib/supabase'|from '../../lib/activeSite'" src/pages/dashboard/Overview.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows dashboard Overview data-boundary drift while preserving demo overview state, live stats, persisted intelligence dismissals, interactive suggestion hiding/loading, draft brief refresh, builder user-edited markers, name-change overview, launch-readiness cards, and public-site preview links. No deploy was run, so live proof status is unchanged.

### 2026-05-05 6:53 PM PT - Registry Dashboard Site/Policy Service Boundary

What changed:
- Moved Registry dashboard active-site/site refresh-policy load, refresh budget persistence, refresh policy save, monthly counter reset, and auto-reset persistence into `src/pages/dashboard/registry/registryService.ts`.
- Removed Supabase and active-site imports from `Registry.tsx`; the page now keeps registry UI/orchestration while the service owns explicit site projections and writes.
- Added an explicit Registry dashboard site projection for refresh policy and wedding-date fields.

Commands run:
- `npm test -- --run src/pages/dashboard/registry/registryService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 37/37.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run smoke:registry`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from\\(|from '../../lib/supabase'|from '../../lib/activeSite'" src/pages/dashboard/Registry.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows registry dashboard data-boundary drift while preserving demo registry items, live registry item loading, gift add/edit/delete, URL preview import, auto refresh, monthly refresh budgeting, policy presets, manual counter reset, and owner action audit calls. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:01 PM PT - Itinerary Schedule And Event-Invite Service Boundary

What changed:
- Moved Itinerary active-site/site lookup, event loads, schedule mirror writes to `wedding_data` and `sections`, RSVP invitation/count reads, event create/update/delete, timeline shifts, smart-template inserts, guest picker reads, event-invite toggles, invite-all, and remove-all invitation writes into `src/pages/dashboard/itineraryService.ts`.
- Removed active-site imports and direct `supabase.from(...)` table access from `Itinerary.tsx`; the page still passes the Supabase client to the existing `photo-album-create` Edge Function invoke.
- Added explicit Itinerary projections for sites, events, wedding data, schedule sections, event invitations, event RSVPs, and guest picker rows.

Commands run:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 18/18.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from\\(|from '../../lib/activeSite'" src/pages/dashboard/Itinerary.tsx`: PASS, no matches.
- `npm run smoke:site`: FAIL in sandbox only, `getaddrinfo ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`.
- `npm run smoke:site`: PASS after approved network access.

Status:
- PARTIAL. This narrows Itinerary data-boundary drift while preserving demo timeline, live event loading/counts, optional `event_rsvps` table fallback, schedule-section mirroring, event form drift fallback, best-effort photo album creation, timeline shift/undo, smart template creation, event guest picker, invitation removal RSVP rollback, invite-all/remove-all, and toasts. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:09 PM PT - Guest Photo Sharing Service Boundary

What changed:
- Moved Guest Photo Sharing active-site/site load, event/album/upload reads, guestbook/prospect reads, photo AI analysis/metadata/correction reads, guest hub settings reads, AI photo ops persistence, photo bucket moves, AI correction inserts, guest hub settings save, and guestbook moderation into `src/pages/dashboard/guestPhotoSharingService.ts`.
- Removed direct `supabase.from(...)` table access from `GuestPhotoSharing.tsx`; the page still owns auth/session refresh and existing Edge Function invokes for album/upload/analysis/follow-up flows.
- Added explicit Guest Photo Sharing projections for site rows, itinerary events, photo albums, uploads, guestbook entries, guest prospects, photo AI analysis, upload metadata, AI bucket corrections, and guest hub settings.
- `GuestPhotoSharing.tsx` dropped from 3168 to 3049 lines while preserving the file-size guard baseline.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 18/18.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from\\(" src/pages/dashboard/GuestPhotoSharing.tsx`: PASS, no matches.

Status:
- PARTIAL. This narrows Guest Photo Sharing data-boundary drift while preserving demo photo space, live photo dashboard load, bucket links, upload windows, photo AI ops planning, high-confidence photo moves, vision suggestions/corrections, guest hub settings, guest follow-up queueing, guestbook moderation, exports, and existing Edge Function flows. Remaining direct page-owned table access under the stricter scan is concentrated in `src/pages/dashboard/Guests.tsx`. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:18 PM PT - Guests Dashboard Load/Config Service Boundary

What changed:
- Moved Guests dashboard active-site/site settings load, guest list + RSVP summary reads, RSVP conflict reads/history reads, itinerary filter event reads, event-invite filter mapping, RSVP audit feed reads, RSVP conflict resolve actions, RSVP config save, and fallback site-id resolution into `src/pages/dashboard/guests/guestService.ts`.
- Added explicit Guests projections for site settings, guests, RSVP rows, RSVP conflicts, itinerary events, wedding-data seeds, event invitations, and RSVP audit rows.
- Fixed a projection mismatch by selecting `reminder_cadence_days` and `auto_reminders_enabled` in the service before reading those values.
- `Guests.tsx` dropped from 4693 to 4576 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run smoke:csvmapper`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -n -U "supabase\\s*\\n\\s*\\.from|supabase\\.from\\(" src/pages/dashboard/Guests.tsx | head -100`: PASS for visibility scan; remaining matches are intentionally logged below.

Status:
- PARTIAL. This narrows Guests dashboard data-boundary drift while preserving demo/live site settings load, RSVP custom questions, meal config, auto reminder flags, guest list loading with RSVP rows, conflict cards/history, itinerary filtering, RSVP audit feed, conflict resolve, CSV mapper site-id fallback, and RSVP config autosave. Remaining direct table access in `Guests.tsx` covers guest field updates, check-in/thank-you/manual follow-up updates, RSVP reminder settings, guest drawer event invite toggles/audit details, assisted RSVP, and SMS RSVP link slug lookup. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:22 PM PT - Guests Dashboard Guest-Write Service Boundary

What changed:
- Moved guest check-in undo/toggle, clear-all check-ins, thank-you toggle/bulk thank-you, invitation/reminder timestamp writes, household merge/split/reassign writes, and RSVP reminder settings save into `src/pages/dashboard/guests/guestService.ts`.
- Reused loaded `weddingSiteInfo` for guest update and SMS RSVP share links instead of re-reading `wedding_sites` from `Guests.tsx`.
- Added source-boundary guards for the extracted guest-update and wedding-site-link patterns.
- `Guests.tsx` dropped from 4576 to 4506 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. This narrows Guests dashboard write-boundary drift while preserving check-in undo/toggle/session-refresh retry, thank-you workflows, bulk due thank-yous, clear-all check-ins, invite/reminder timestamp persistence, household tools, reminder settings autosave, guest update link copy, and text RSVP link copy. Remaining direct table access in `Guests.tsx` covers guest drawer event/audit details, event invite toggle/delete/insert, and assisted RSVP save/rollback. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:31 PM PT - Guests Drawer/Event/Assisted-RSVP Service Boundary

What changed:
- Moved guest drawer itinerary/audit detail reads, event invitation toggle insert/delete, RSVP snapshot restore on invite-removal failure, and assisted RSVP save/rollback into `src/pages/dashboard/guests/guestService.ts`.
- Removed the remaining direct `supabase.from(...)` table access from `Guests.tsx`; the page still owns auth/session and existing Edge Function invocation behavior.
- Added explicit drawer/event/assisted RSVP projections for event invitations, guest audit rows, and assisted RSVP rows.
- Lowered the `Guests.tsx` file-size guard baseline from 4693 to 4418 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.
- `rg -U -n "supabase\\s*\\n\\s*\\.from|supabase\\.from\\(" src/pages/dashboard/Guests.tsx`: PASS, no matches.
- `npm run smoke:rsvp`: FAIL in sandbox only, `getaddrinfo ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`.
- `npm run smoke:rsvp`: PASS after approved network access.
- `npm run proof:v1:guests-rsvp-ops`: FAIL in sandbox only because the strict RSVP smoke could not resolve `atuzuobpprjstfmdnwso.supabase.co`; CSV mapper and check-in guard passed.
- `npm run proof:v1:guests-rsvp-ops`: PASS after approved network access with RSVP strict smoke, CSV mapper guard, and check-in guard green.

Status:
- PARTIAL. This closes the known Guests page-owned table-access lane locally while preserving demo/live itinerary drawer details, event invitation toggles, RSVP snapshot restore on failed invite removal, assisted RSVP recording, assisted RSVP rollback, CSV mapper, check-in guard, and strict RSVP smoke behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:36 PM PT - External Blank-Target Link Isolation

What changed:
- Updated the remaining external blank-target links that used only `rel="noreferrer"` to explicit `rel="noopener noreferrer"`.
- Covered vendor profile creation links, vendor profile proof/resource links, dashboard registry contribution links, public registry contribution links, dashboard layout external links, and the builder variant preview `Link`.
- Refreshed the launch safety guard to track the earlier Guests, Guest Photo Sharing, and Messages helper extractions while adding a regression for bare `rel="noreferrer"`.

Commands run:
- `npm test -- --run src/lib/superNiceLaunchBacklogSafety.test.ts`: FAIL twice while stale assertions still expected helpers to live inline in `Guests.tsx`, `GuestPhotoSharing.tsx`, and `Messages.tsx`.
- `npm test -- --run src/lib/superNiceLaunchBacklogSafety.test.ts`: PASS, 13/13 after updating those assertions to the extracted helper locations.
- `rg -n "rel=\"noreferrer\"|rel='noreferrer'" src -g '*.tsx'`: PASS, no matches.
- Targeted TSX blank-target audit script: PASS, 0 bad `a`/`Link` tags.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. This narrows external-link opener risk while preserving vendor, registry, and dashboard external-link behavior. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:43 PM PT - Global Page/Section Table-Access Regression Guard

What changed:
- Added a broad runtime TSX guard to `src/lib/dashboardDataBoundary.test.ts`.
- The guard recursively scans non-test `.tsx` files under `src/pages` and `src/sections` and fails if any page or section owns direct `supabase.from(...)` table access.
- This turns the recent page/section service-boundary milestone into a regression gate instead of a one-time scan.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 18/18.
- `rg -U -n "supabase\\s*(?:\\.\\s*from|\\n\\s*\\.\\s*from)\\s*\\(" src/pages src/sections -g '*.tsx' -g '!*.test.tsx' -g '!*.spec.tsx'`: PASS, no matches.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. This lowers future public/page data-boundary regression risk with proof-only hardening. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:46 PM PT - File-Size Guard Baseline Tightening

What changed:
- Lowered the `RSVP.tsx` file-size guard baseline from 1962 to 1961 lines.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 3168 to 3049 lines.
- Locked recent no-feature-loss reductions into `scripts/check-file-size-guard.mjs` while larger P2 file splitting continues.

Commands run:
- `npm run guard:file-size`: PASS.
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/superNiceLaunchBacklogSafety.test.ts`: PASS, 31/31.
- `git diff --check`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This is guard-only maintainability hardening with no runtime behavior change. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:54 PM PT - Seating Component Split And Guard Tightening

What changed:
- Moved seating drag/drop guest chips, unassigned pool, table card, seat drop slot, and table form into `src/pages/dashboard/seating/SeatingDashboardComponents.tsx`.
- Kept `Seating.tsx` focused on page orchestration, data flow, and actions.
- Lowered the `Seating.tsx` file-size guard baseline from 2169 to 1610 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts`: PASS, 35/35.
- `npm run typecheck -- --pretty false`: PASS after restoring the page-level `TableShape` type import.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- Strict page/section direct-access scan: PASS, no direct `supabase.from(...)` table access in runtime page/section TSX.
- `git diff --check`: PASS.
- `npm run proof:v1:seating-continuity`: FAIL in sandbox only with Vite `.vite-temp` `EPERM` during nested test/build steps.
- `npm run proof:v1:seating-continuity`: PASS after approved rerun.

Status:
- PARTIAL. This reduces the oversized seating page risk while preserving seating table creation/editing, visual/list drag/drop seating, check-in controls, exports, and seating continuity proof. No deploy was run, so live proof status is unchanged.

### 2026-05-05 7:57 PM PT - Page/Section Select-Star Regression Guard

What changed:
- Expanded `src/lib/dashboardDataBoundary.test.ts` with a recursive runtime source guard for non-test `.ts` and `.tsx` files under `src/pages` and `src/sections`.
- The guard fails if those runtime page/section surfaces reintroduce `select('*')`.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- Independent strict `rg` select-star scan across `src/pages` and `src/sections`: PASS, no matches.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- PARTIAL. This is proof-only data-boundary hardening with no runtime behavior change. No deploy was run, so live proof status is unchanged.

### 2026-05-05 8:03 PM PT - RSVP Lookup Scoping Proof And Stale-Copy Cleanup

What changed:
- Added a focused static regression proving `validate-rsvp-token` lookup is invite-token-only and non-enumerating.
- The regression guards against name/`ilike` lookup, multi-match guest-list responses, raw invite-token payloads, and site-id leakage in the lookup response shape.
- Removed stale guest-facing copy that told guests to "search by your full name" when an RSVP session cannot resolve.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 28/28.
- Independent RSVP source scan for `ilike`, `byName`, `name.ilike`, `guests: by`, `invite_token:`, and `wedding_site_id: guest.wedding_site_id`: PASS, no matches.
- `npm run smoke:rsvp`: FAIL in sandbox only with `getaddrinfo ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`.
- `npm run smoke:rsvp`: PASS after approved network access.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: FAIL once on `no-regex-spaces` in the new test regex.
- `npm run lint -- --quiet`: PASS after replacing literal spaces with `{4}` in the regex.
- `npm run guard:file-size`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.
- `git diff --check`: PASS.

Status:
- DONE locally for RSVP lookup scoping. No deploy was run, so launch status is unchanged and the live proof board blockers remain live/deploy/external.

### 2026-05-05 8:07 PM PT - Asset Budget Baseline Tightening

What changed:
- Tightened `scripts/check-asset-budget.mjs` total public asset budget from 215000 KiB to 210000 KiB.
- Tightened the per-file public asset budget from 6000 KiB to 5000 KiB.
- Kept existing product preview assets intact while making future asset-footprint growth fail sooner.

Commands run:
- `npm run guard:assets`: PASS, 209433 KiB total public assets, 334 files, largest file 4788 KiB.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This strengthens the production asset-footprint guard without feature loss. The existing template preview GIF footprint still needs a CDN/object-storage or optimized-thumbnail strategy before the asset item can be marked done. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:10 PM PT - Coordinator Panel Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
- Moved the coordinator role selector, helper access panel, handoff card, and top stat-card presentation out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2736 to 2652 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims one oversized coordinator page slice without changing coordinator role switching, dashboard stats, day-of check-in, timeline, Q&A, alert, or service behavior. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:21 PM PT - Settings Navigation Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/settings/SettingsNavigation.tsx`.
- Moved Settings tab IDs, tab construction, role-based tab filtering, and the settings navigation UI out of `Settings.tsx`.
- Lowered the `Settings.tsx` file-size guard baseline from 2287 to 2259 lines.

Commands run:
- `npm test -- src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: FAIL once because the new tab array widened `id` to `string`.
- `npm run typecheck -- --pretty false`: PASS after typing the tab list as `SettingsTab[]`.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Settings page without changing owner-only Team/Billing visibility, collaborator restrictions, settings forms, privacy controls, billing, or service boundaries. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:27 PM PT - Name Change Planner Card Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/planning/NameChangePlannerCards.tsx`.
- Moved `ExecutionSnapshotCard` and `ReminderPostureCard` out of `NameChangePlannerTab.tsx`.
- Lowered the `NameChangePlannerTab.tsx` file-size guard baseline from 2414 to 2197 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: FAIL once, 34 component tests failed because the tab still used `getExecutionStatusVaultNotes` and `getExecutionNextActionDetail` after extraction.
- Same focused name-change test lane: PASS, 53/53 after restoring the missed imports.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims a large name-change planner slice without changing execution cards, status-vault details, guided next actions, reminder posture cards, document intake, or reminder behavior. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:32 PM PT - Messages Detail Modal Component Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
- Moved message toasts, status badge rendering, and the message detail modal out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 3263 to 2842 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS after fixing the mechanical extraction to export/import the moved components correctly and restoring remaining icon imports still used in `Messages.tsx`.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving message history details, scheduled controls, retry/send-now/reschedule/cancel actions, delivery review sections, status badges, and toasts. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:36 PM PT - Guest Photo Sharing Slideshow Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoSlideshowCard.tsx`.
- Moved slideshow draft controls, frame list rendering, and the slideshow preview modal out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 3049 to 2944 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving slideshow-ready album filtering, order/theme selection, preview behavior, slideshow notes export, upload captions, and photo-sharing upload/moderation behavior. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:40 PM PT - Guest Photo Sharing Album-Link Panel Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoAlbumCreateCard.tsx`.
- Moved album creation templates, parent/event selectors, newest-link actions, missing-event album action, copy fallback, and newest-album QR panel out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2944 to 2811 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving album creation, parent album selection, itinerary-event linking, newest upload link copy/open/QR actions, missing itinerary album creation, copy fallback behavior, and album list/moderation behavior. No deploy was run, so launch status is unchanged.

### 2026-05-05 8:46 PM PT - Guest Photo Sharing Album Controls Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoAlbumControls.tsx`.
- Moved the album sharing toolbar, owner controls, tag/status/search filters, bulk moderation controls, and visible album count display out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2811 to 2766 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving copy-all links/prompts, send active album requests, refresh all links, export link/share/handoff sheets, flagged/hidden/tag filters, bulk moderation controls, search, and active/paused filtering. No deploy was run, so launch status is unchanged.

### 2026-05-06 7:19 AM PT - Guest Photo Sharing Recent-Upload Moderation Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoRecentUploadsList.tsx`.
- Moved recent upload rows, tag chips, recap badges, and per-upload feature/story/hide/flag moderation controls out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2766 to 2697 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving recent upload display, guest/file/date labels, tag filtering, feature/story/recap-hide toggles, flag/unflag, restore/remove, and album moderation callbacks. No deploy was run, so launch status is unchanged.

### 2026-05-06 7:46 AM PT - Guest Photo Sharing Bucket Window Editor Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoBucketWindowEditor.tsx`.
- Moved parent-album reassignment controls, upload-window date inputs, suggested-window action, and save-window action out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2697 to 2660 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: FAIL once because `Input` was still used elsewhere in `GuestPhotoSharing.tsx` after the extraction.
- `npm run typecheck -- --pretty false`: PASS after restoring the still-used `Input` import.
- `npm run guard:file-size`: FAIL once because the restored import made the exact count 2660 instead of 2659.
- `npm run guard:file-size`: PASS after setting the exact 2660-line baseline.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving parent album changes, descendant-cycle exclusion, upload opens/closes drafts, suggested window application, save window behavior, and existing album/recent-upload moderation flows. No deploy was run, so launch status is unchanged.

### 2026-05-06 7:54 AM PT - Guest Photo Sharing Bucket-Card Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx`.
- Moved the per-album shell, parent label, status/count chips, backup/QR/link/messaging actions, sub-album shortcuts, and upload-link summary out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2660 to 2556 lines.
- Updated the dashboard link-safety regression to follow the extracted bucket-card component and keep proving safe backup-folder and QR URL opens.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving per-album active/paused state, backup open, link refresh/copy, QR open, photo-list export, share-prompt copy, messaging prefill, sub-album filtering, upload-link display, upload-window editing, and recent-upload moderation. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:00 AM PT - Guest Photo Sharing Guest-Hub QR Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoHubQrCard.tsx`.
- Moved the one-QR guest hub card, hub/recap link actions, QR open action, print-card action, guest action chips, and QR panels out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2556 to 2506 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving guest hub link copy/open, QR open, print-card save, recap copy/open, action summary chips, hub QR panel, recap QR panel, and existing album/moderation flows. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:06 AM PT - Guest Photo Sharing Hub Controls/Follow-Up/Guestbook Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoHubControlsCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoFollowupCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoGuestbookCard.tsx`.
- Moved guest hub controls, guest follow-up export/queue preview, and guestbook export/moderation preview out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2506 to 2418 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving hub action toggles, custom hub message, default language, save controls, guest prospect counts/export/queue actions, guestbook export, guestbook flag/hide moderation, and existing photo album/moderation flows. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:13 AM PT - Guest Photo Sharing Photo-Review Extraction And Guard Tightening

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoReviewCard.tsx`.
- Moved photo review summary stats, curation actions, highlights, timeline, similar sets, review queue, and memory chapter preview out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2418 to 2317 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving highlight slideshow ordering, saved-photo-time ordering, curation export, memory chapter/recap note copy, review-item hiding, similar-extra hiding, hidden upload restore, recap feature/story/hide toggles, and existing album/moderation flows. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:20 AM PT - Guest Photo Sharing Moments And Schedule Album Extraction

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoMomentsCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoMomentAlbumsCard.tsx`.
- Moved the AI/photo moments panel and the schedule-derived moment album suggestion panel out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2317 to 2207 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized guest photo-sharing page while preserving sort-new-photos, review-visible, high-confidence photo moves, per-analysis move/keep decisions, reviewed/photo metadata counts, schedule-derived album suggestions, and create-moment-album actions. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:35 AM PT - Guest Photo Sharing Below-Threshold Component Extraction

What changed:
- Added `src/pages/dashboard/guestPhotos/GuestPhotoHeroCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoMemoryVaultsCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoMemoryFlowCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoRecapSharingCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoCoupleAlbumsCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoStatsCards.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoSlideshowDraftCard.tsx`.
- Added `src/pages/dashboard/guestPhotos/GuestPhotoOrganizerCard.tsx`.
- Moved the Memories hero, memory/vault guidance, no-app readiness checklist, recap sharing controls, couple photo albums card, album/upload stats, slideshow draft controls, and photo organizer plan out of `GuestPhotoSharing.tsx`.
- Lowered the `GuestPhotoSharing.tsx` file-size guard baseline from 2207 to 1979 lines, bringing the page below the 2000-line oversized-file threshold.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes `GuestPhotoSharing.tsx` from the oversized-page class while preserving vault navigation, readiness blockers, recap preview/status save, couple-album uploads/removals, owner stats, slideshow draft organization, AI organizer note copy, and high-confidence organizer moves. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:50 AM PT - Settings Below-Threshold Panel Extraction

What changed:
- Added `src/pages/dashboard/settings/SettingsAccountPanel.tsx`.
- Added `src/pages/dashboard/settings/SettingsNotificationsPanel.tsx`.
- Added `src/pages/dashboard/settings/SettingsBillingPanel.tsx`.
- Moved account, notification, and billing panels out of `Settings.tsx`.
- Lowered the `Settings.tsx` file-size guard baseline from 2259 to 1963 lines, bringing the page below the 2000-line oversized-file threshold.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes `Settings.tsx` from the oversized-page class while preserving account settings, notifications, billing, settings service boundaries, owner/collaborator restrictions, and existing settings data contracts. No deploy was run, so launch status is unchanged.

### 2026-05-06 8:55 AM PT - Coordinator Attention Panel Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` with `CoordinatorAttentionPanel`.
- Moved the day-of attention/escalation card, correction cues, next-arrival shortcuts, and coordinator quick links out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2652 to 2599 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized coordinator page while preserving attention-now escalation behavior, correction cue routing, next-arrival focus, coordinator quick links, service extraction, and role-aware coordinator behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:03 AM PT - Messages Presentational Panel Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageGuestFlowCard`, `MessageSendingDetailsPanel`, `MessageReachSnapshotCard`, and `MessageStartingPointsCard`.
- Moved the guest-flow explainer, optional sending-details panels, guest reach snapshot, helpful starts, and starting-point template cards out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2842 to 2641 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving guest-flow guidance, text-credit purchase locks, text-credit activity display, reach snapshot, photo shortcut, quick template starts, reusable template behavior, and existing message send/schedule/retry paths. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:06 AM PT - Messages History Summary Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageHistorySummaryPanels`.
- Moved message-history status counts, provider telemetry cards, audience breakdown, channel breakdown, delivery-health cards, and campaign status chips out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2641 to 2533 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving history filters, delivery-health summaries, audience/channel breakdowns, campaign chips, message history rendering, retry/send-now/reschedule/cancel controls, and existing messaging service behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:12 AM PT - Name Change Planner Intro Extraction And Below-Threshold Guard Tightening

What changed:
- Extended `src/pages/dashboard/planning/NameChangePlannerCards.tsx` with `NameChangePlannerIntroCards`.
- Moved the path/health/privacy cards, resume panel, lifecycle jump cards, roadmap cards, and milestone/proof progress cards out of `NameChangePlannerTab.tsx`.
- Lowered the `NameChangePlannerTab.tsx` file-size guard baseline from 2197 to 1999 lines, bringing the page below the 2000-line oversized-file threshold.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts`: PASS, 53/53.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes `NameChangePlannerTab.tsx` from the oversized-page class while preserving resume routing, lifecycle jumps, save-and-return action, roadmap/milestone display, dual-partner proof tracks, document/status vault, execution cards, reminders, admin review, and existing name-change planner behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:17 AM PT - Coordinator Command Deck Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` with `CoordinatorCommandDeckPanel`.
- Moved the command summary cards, command deck cards, and ops snapshot cards out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2599 to 2537 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Coordinator Mode page while preserving command summary jumps, priority labels, command deck actions, ops snapshot lane jumps, role restrictions, summary panels, check-in, timeline, alerting, and Q&A behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:21 AM PT - Messages Saved-Template Card Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageSavedTemplatesCard`.
- Moved the reusable saved-template library card out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2533 to 2490 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving saved template display, reusable audience labels, expired saved-schedule warning, template use, template removal, composer behavior, history summaries, and existing send/schedule/retry controls. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:26 AM PT - Messages Campaign-Thread Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageCampaignThreadPanels`.
- Moved campaign rollups and the active campaign thread panel out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2490 to 2357 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving campaign thread filtering, active thread clearing, latest-message view/edit/duplicate actions, reminder/day-of/thank-you follow-up starts, scheduled follow-up starts, delivery/contact counters, and existing history controls. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:29 AM PT - Messages Review Queue Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageReviewQueuePanels`.
- Moved follow-up review and review queue panels out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2357 to 2306 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving follow-up review counts, review queue empty state, recipient review labels, latest message context, approve/open/follow-up actions, and existing message send/retry/schedule flows. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:40 AM PT - Messages History Card Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with `MessageHistoryCard`.
- Moved the message history filter header, quick filters, campaign/review summary panels, empty state, filtered history rows, and scheduled/retry row controls out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2306 to 2123 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Messages page while preserving history search/filtering, campaign-thread selection/clearing, review queue actions, scheduled send-now/reschedule/draft controls, retry controls, recipient counters, due-now labels, and message detail opening. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:45 AM PT - Messages Composer Panel Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/messages/MessageDashboardComponents.tsx` with focused composer panels for language preview, scheduling, recipient preview, and preflight warnings.
- Moved those composer sections out of `Messages.tsx`.
- Lowered the `Messages.tsx` file-size guard baseline from 2123 to 1954 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This brings `Messages.tsx` below the oversized threshold while preserving composer template selection, language preview, schedule date/time handling, recipient preview, SMS credit/capacity warnings, text setup lock, email cap warning, send-now, schedule, and save-draft behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:52 AM PT - Coordinator Day-Of Summary Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` with `CoordinatorDayOfSummaryPanel`.
- Moved the day-of summary board, current-signal cue, standing prompt, suggested action board, progress/navigation/next-step cards, and embedded command deck out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2537 to 2391 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Coordinator page while preserving summary cue display, alert/manual override labels, return-to-board target, standing prompt jump, primary action, return/revisit controls, command summary actions, ops snapshot jumps, and planner/viewer notices. No deploy was run, so launch status is unchanged.

### 2026-05-06 9:57 AM PT - Coordinator Check-In Queue Extraction And Guard Tightening

What changed:
- Extended `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` with `CoordinatorCheckInQueuePanel`.
- Moved the check-in queue shell, door board, filters, ready/review quick actions, active guest action, empty state, and guest rows out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2391 to 2267 lines.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Coordinator page while preserving check-in search, Enter-to-check-in, arrivals/all/checked-in filter, ready-now/review-only toggles, active guest check-in, suggested/selected labels, door-review escalation, disabled viewer controls, and queue row check-in behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:06 AM PT - Coordinator Timeline And Message Extraction

What changed:
- Extended `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` with `CoordinatorTimelinePanel` and `CoordinatorDayOfMessagePanel`.
- Moved the run-of-show timeline board, focused-event controls, jump buttons, per-event timeline rows, day-of message alert board, alert activity board, suggestion chips, form controls, ready-to-send cue, and alert-history filters out of `CoordinatorMode.tsx`.
- Lowered the `CoordinatorMode.tsx` file-size guard baseline from 2267 to 1867 lines, bringing it below the 2000-line oversized-file threshold.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes `CoordinatorMode.tsx` from the oversized-page class while preserving timeline focus, live/up-next/suggested jumps, primary/correction timeline transitions, alert draft sync, suggestion re-alignment, send-now/schedule controls, alert filters, role-gated controls, and alert history display. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:12 AM PT - Guests Snapshot Insights Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestSnapshotInsightsPanel.tsx`.
- Moved the guest snapshot stats, RSVP insight cards, event/meal/custom-answer/song-request summaries, and quick insight filter buttons out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 4418 to 4270 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving guest snapshot counts, event/meal/custom-answer/song-request insight display, missing-meal/plus-one/no-response/pending-no-email/ceremony-no/reception-no focus buttons, and the existing guest operations flow. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:20 AM PT - Guests Toolbar And Campaign Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestOpsToolbar.tsx`.
- Added `src/pages/dashboard/guests/GuestCampaignReminderPanel.tsx`.
- Moved the guest search/import/add/actions toolbar and campaign insights card/modal out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 4270 to 4174 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving guest search, CSV/XLSX import entry, add guest, export actions, RSVP link copy, checklist actions, reminder sends, auto-reminder toggle, delete-all entry, campaign preset selection, recipient preview, skip-recent toggle, and focus shortcuts. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:24 AM PT - Guests Household Panel Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestHouseholdPanel.tsx`.
- Moved the household merge banner, no-households state, grouped household rows, and ungrouped selectable guest list out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 4174 to 4090 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving household mode display, merge disabled state, status badges, grouped member rows, ungrouped guest selection toggles, and household merge entry. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:29 AM PT - Guests List Panel Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestListPanel.tsx`.
- Moved the main guest table, row status stack, RSVP lifecycle chips, event RSVP chips, row actions, and no-results state out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 4090 to 3899 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving guest row opening, RSVP preview, invitation send, check-in toggle, thank-you toggle, assisted RSVP entry, edit/delete actions, status badges, custom-answer indicators, and no-results copy. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:34 AM PT - Guests Form, Assisted RSVP, And Delete-All Modal Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestModals.tsx`.
- Moved the add/edit guest form modal, assisted RSVP modal, and delete-all confirmation modal out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 3899 to 3745 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving add/edit guest fields, plus-one controls, itinerary invitation checkboxes, assisted RSVP status/source/notes, modal close behavior, delete-all typed confirmation, and save/submit handlers. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:41 AM PT - Guests Itinerary Drawer Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestItineraryDrawer.tsx`.
- Moved the guest itinerary drawer, visibility preview, RSVP detail cards, exception/household context, audit trail, and event invitation toggles out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 3745 to 3383 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving drawer close behavior, guest update/RSVP link copy, guest preview links, follow-up task save, focus guest search, audit display, loading/empty states, event invitation toggles, and instant-save footer. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:45 AM PT - Guests CSV Import Modal Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestCsvImportModals.tsx`.
- Moved the CSV column mapper and CSV review/import modal out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 3383 to 3203 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving column mapping, invited-event multiselect, mapping validation, import review warnings, preview rows, cancel/reset behavior, and confirm import action. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:52 AM PT - Guests RSVP Settings View Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestRsvpSettingsView.tsx`.
- Moved the RSVP settings view, access-mode plan, setup checklist, question templates, meal choices editor, question editor, and guest change history panel out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 3203 to 2959 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving RSVP settings tab navigation, RSVP view link, access mode status cards, template add/disable behavior, meal option editing, custom question editing/deletion confirmation, save/autosave status, and audit feed display. No deploy was run, so launch status is unchanged.

### 2026-05-06 10:57 AM PT - Guests RSVP Conflict Panel Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestRsvpConflictPanels.tsx`.
- Moved local RSVP conflict readback, persisted RSVP conflict filtering/details, conflict stats, and resolve actions out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 2959 to 2843 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving duplicate-email/declined-plus-one review, pending-review focus, conflict severity filtering, resolve-all, per-conflict resolve, details toggle, stale-conflict age copy, stats, and top-reason display. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:03 AM PT - Guests List Status Controls Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestListStatusControls.tsx`.
- Moved recommended guest action, RSVP follow-up list, planner handoff, quick-start photos jump, active segment readback, exception/meal/no-contact helper panels, segment tabs, household/check-in toggles, check-in banners, and selection readback out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 2843 to 2690 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving recommended focus/save task, ops queue focus, quick-start skip-to-photos, clear filters, exception/meal/no-contact copy actions, campaign modal opening, segment selection, household toggle, check-in mode, undo last check-in, view checked-in, and visible-selection trimming. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:06 AM PT - Guests Dashboard Header Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestDashboardHeader.tsx`.
- Moved the Guests dashboard hero, RSVP settings tab switch, insights toggle, import summary readback, and planner-mode notice out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 2690 to 2644 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving hero stats/actions, add-guest disable state, RSVP view link, RSVP settings navigation, insights toggle, CSV import summary copy, and planner read-only context. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:09 AM PT - Guests List Display Switcher Extraction

What changed:
- Added `src/pages/dashboard/guests/GuestListDisplaySwitcher.tsx`.
- Moved the no-results state, household/list branch, and guest list panel routing out of `Guests.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 2644 to 2635 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 21/21.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving clear-filter empty state, household merge/select view, list table view, check-in behavior, assisted RSVP entry, edit/delete, invitation send, and itinerary drawer opening. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:16 AM PT - Guests Derived Dashboard Utility Extraction

What changed:
- Moved Guests dashboard filtering, dashboard stats, and event report rollups into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for stats, dashboard filtering, and event report counts.
- Lowered the `Guests.tsx` file-size guard baseline from 2635 to 2565 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 43/43.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving search, primary/extra filters, event invite/not-invite filters, due-reminder and thank-you-due filters, dashboard hero stats, snapshot event report counts, campaign/list behavior, and guest operations flow. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:21 AM PT - Guests Conflict/Reminder/Export Utility Extraction

What changed:
- Moved RSVP conflict stat derivation, due-reminder and thank-you-due segment derivation, and reusable guest CSV download wiring into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for conflict freshness/top-code stats and due reminder/thank-you segment selection.
- Lowered the `Guests.tsx` file-size guard baseline from 2565 to 2492 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving RSVP conflict stats, stale-conflict counts, top conflict reasons, due reminder targeting, thank-you due targeting, all guest CSV export actions, and event attendance exports. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:25 AM PT - Guests CSV Import Preparation Utility Extraction

What changed:
- Moved demo imported-guest construction, imported guest row cleanup, and CSV import sidecar derivation for households, event invites, and RSVP rows into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for demo import rows, internal field stripping, household sidecars, event invite rows, and imported RSVP rows.
- Lowered the `Guests.tsx` file-size guard baseline from 2492 to 2430 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 46/46.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving demo imports, secure-token imports, household grouping, guarded household separation, event invite import, RSVP row import, quick-start photo continuation, and import summary toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:30 AM PT - Guests RSVP Config And Export Label Utility Extraction

What changed:
- Moved RSVP config cleanup/validation, guest display-name formatting, filtered-export suffix formatting, and SMS RSVP link row building into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for RSVP config cleanup, display names, export segment suffixes, and SMS RSVP link rows.
- Lowered the `Guests.tsx` file-size guard baseline from 2430 to 2406 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 48/48 after refreshing the stale boundary assertion for the new RSVP config helper call shape.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving RSVP question cleanup, meal-option title-casing, validation toasts, demo/live RSVP settings saves, invitation names, campaign preview names, filtered CSV naming, and SMS RSVP link copy. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:33 AM PT - Guests Invitation Payload Utility Extraction

What changed:
- Moved wedding invitation email payload construction into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Reused the helper across single invitation, selected reminders, filtered reminder campaigns, and due-reminder send paths.
- Lowered the `Guests.tsx` file-size guard baseline from 2406 to 2358 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 48/48.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving single invite sends, selected reminders, filtered reminder campaigns, due reminders, invitation timestamp writes, reminder timestamp writes, campaign logs, and owner-facing success/failure toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:37 AM PT - Guests Reminder Campaign Summary Utility Extraction

What changed:
- Moved reminder send summary copy, campaign confirmation description construction, and campaign log entry construction into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for send summaries, campaign confirmation copy, and campaign log entries.
- Lowered the `Guests.tsx` file-size guard baseline from 2358 to 2346 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 48/48.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving selected reminder result toasts, filtered campaign confirmation copy, no-contact warning copy, recipient previews, demo campaign logs, due-reminder logs, and send success/failure summaries. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:42 AM PT - Guests CSV Import Toast Utility Extraction

What changed:
- Moved CSV import preview and import success toast construction into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for skipped-row messaging, unknown-event warnings, duplicate-name warnings, household warnings, household group summaries, guarded-household summaries, and event invite summaries.
- Lowered the `Guests.tsx` file-size guard baseline from 2346 to 2338 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 48/48.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving CSV mapper preview toasts, skipped-row messaging, unknown-event warnings, duplicate-name warnings, household-match warnings, demo import success, live import success, household grouping, guarded-household separation, event-invite summaries, and import readback summaries. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:46 AM PT - Guests Form Mapping Utility Extraction

What changed:
- Moved add/edit guest form mapping, demo guest construction, demo edit projection, event invite ID selection, edit-form hydration, and edit rollback value capture into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for demo guest creation, edit form mapping, event invite selection, edit-form hydration, and rollback values.
- Lowered the `Guests.tsx` file-size guard baseline from 2338 to 2288 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 49/49.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving demo add/edit guests, live add/edit guests, ceremony/reception invite flags, custom itinerary event invites, edit modal hydration, failed edit rollback, add failure cleanup, and owner-facing add/edit toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:48 AM PT - Guests Assisted RSVP Mapping Utility Extraction

What changed:
- Moved assisted RSVP manual-note construction and demo assisted-RSVP state projection into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for manual RSVP note tags plus demo confirmed and declined RSVP state updates.
- Lowered the `Guests.tsx` file-size guard baseline from 2288 to 2264 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 50/50.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving assisted RSVP manual source tags, demo confirmed RSVP updates, demo declined RSVP cleanup, live assisted RSVP saves, drawer/form closure, and owner-facing assisted RSVP toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:52 AM PT - Guests Selection And Campaign Clipboard Utility Extraction

What changed:
- Moved selected/unresolved guest ID derivation, selection toast copy, visible-selection trimming, checklist markdown copy, and campaign dry-run clipboard text into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Added focused utility proof for unresolved ID selection, selected-count copy, visible selection trimming, checklist markdown, and dry-run recipient preview text.
- Lowered the `Guests.tsx` file-size guard baseline from 2264 to 2259 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 51/51.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving unresolved selection, filtered selection, visible-selection trimming, checklist copy/download fallback, campaign dry-run copy/download fallback, and owner-facing selection/dry-run toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 11:56 AM PT - Guests Dashboard Overlay Component Extraction

What changed:
- Moved the Guests dashboard modal/drawer stack into `src/pages/dashboard/guests/GuestDashboardOverlays.tsx`.
- Centralized rendering for assisted RSVP, add/edit guest, itinerary drawer, delete-all confirmation, CSV mapper, CSV review, and confirmation dialogs while keeping `Guests.tsx` as the workflow coordinator.
- Lowered the `Guests.tsx` file-size guard baseline from 2259 to 2205 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 51/51.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving assisted RSVP modals, add/edit guest modals, itinerary drawer behavior, delete-all confirmation, CSV mapping/review modals, shared confirmation dialogs, and all close/save/confirm handlers. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:00 PM PT - Guests Reminder Send Batch Utility Extraction

What changed:
- Moved shared reminder batch send/timestamp counting into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
- Reused the helper across selected reminders, filtered reminder campaigns, and due reminders.
- Added focused utility proof for invitation payload construction, per-guest timestamp updates, skipped no-email rows, and failed recipient counting.
- Lowered the `Guests.tsx` file-size guard baseline from 2205 to 2187 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 52/52.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims the oversized Guests page while preserving selected reminder sends, filtered campaign sends, due-reminder sends, invitation/reminder timestamp writes, partial-failure counts, no-email skips, campaign logs, fetch refreshes, and owner-facing send result toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:03 PM PT - Guests Dead State Cleanup

What changed:
- Removed stale `Guests.tsx` saved-segment persistence state, old RSVP ops-summary copy handler, unused export-menu state, and unused derived label/completeness values that no longer feed the rendered dashboard.
- Lowered the `Guests.tsx` file-size guard baseline from 2187 to 2137 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 52/52.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This trims inert page state while preserving the rendered Guests dashboard, campaign presets, follow-up tasks, checklist copy, selection behavior, reminder sends, exports, and CSV workflows. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:11 PM PT - Guests Below-Threshold Owner Utility Extraction

What changed:
- Moved guest export actions, text RSVP link copy/download fallback, and guest update link copy/download fallback into `src/pages/dashboard/guests/useGuestDashboardExports.ts`.
- Moved check-in undo/clear/toggle behavior plus single and bulk thank-you status writes into `src/pages/dashboard/guests/useGuestDashboardCheckIns.ts`.
- Moved the shared RSVP status badge renderer into `src/pages/dashboard/guests/GuestStatusBadge.tsx`.
- Lowered the `Guests.tsx` file-size guard baseline from 2137 to 1939 lines, bringing it below the 2000-line oversized-file threshold.
- Refreshed the dashboard data-boundary assertion so it follows the check-in service calls in their new hook.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 52/52 after refreshing the stale boundary assertion.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This removes `Guests.tsx` from the oversized-page class while preserving guest exports, contact-link sharing, text RSVP link sharing, check-in state updates, thank-you state updates, status badges, refresh behavior, and customer-safe toasts. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:15 PM PT - Name-Change Template Card Headroom Extraction

What changed:
- Moved the prewritten account-update template card into `src/pages/dashboard/planning/NameChangeAccountUpdateTemplatesCard.tsx`.
- Lowered the `NameChangePlannerTab.tsx` file-size guard baseline from 1999 to 1953 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 62/62.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This adds guard headroom to the tightest remaining page baseline while preserving readiness-aware account update template subjects, context lines, body copy, status chips, copy button labels, copy/download behavior, and copied-state reset. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:24 PM PT - Builder Sidebar Preview Metadata Extraction

What changed:
- Moved builder sidebar live-preview fixture data into `src/builder/components/builderSidebarPreviewData.ts`.
- Moved variant tone, art-direction, and curated preview wedding-data metadata into `src/builder/components/builderVariantPreviewMetadata.ts`.
- Lowered `BuilderSidebarLibrary.tsx` from 3294 to 2869 lines.
- Added `BuilderSidebarLibrary.tsx` to the file-size guard as an exact non-page tracked baseline at 2869 lines.

Commands run:
- `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx`: PASS, 16/16. `SectionRenderer.public.test.tsx` intentionally logs the simulated provider failure while proving the safe fallback.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This reduces the largest non-generated source module and adds guard coverage while preserving section picker photo-set controls, section previews, live variant previews, variant tone chips, art-direction descriptions, sequence/composition cues, and preview wedding-data fixtures. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:27 PM PT - Builder Sidebar Static Preview Extraction

What changed:
- Moved the static section-type preview renderer into `src/builder/components/SectionTypePreview.tsx`.
- Lowered `BuilderSidebarLibrary.tsx` from 2869 to 2575 lines.
- Lowered the non-page file-size guard baseline for `BuilderSidebarLibrary.tsx` from 2869 to 2575 lines.

Commands run:
- `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx`: PASS, 16/16. `SectionRenderer.public.test.tsx` intentionally logs the simulated provider failure while proving the safe fallback.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This keeps reducing the largest non-generated source module while preserving section type preview thumbnails, compact preview wrapping, live variant fallback headers, and the surrounding variant preview cards. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:31 PM PT - Builder Sidebar Variant Swatch Extraction

What changed:
- Moved the large static fallback variant preview swatch renderer into `src/builder/components/VariantPreviewSwatch.tsx`.
- Lowered `BuilderSidebarLibrary.tsx` from 2575 to 1003 lines.
- Added exact non-page file-size guard baselines for `BuilderSidebarLibrary.tsx` at 1003 lines and `VariantPreviewSwatch.tsx` at 1574 lines.

Commands run:
- `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx`: PASS, 16/16. `SectionRenderer.public.test.tsx` intentionally logs the simulated provider failure while proving the safe fallback.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This finishes the biggest builder-sidebar split by isolating static fallback preview art while preserving fallback swatches, live-preview fallback rendering, hover styling, variant cards, compact section preview headers, and builder sidebar drag/layer behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:36 PM PT - Builder Entry-Site Service-Boundary Extraction

What changed:
- Moved the builder editor entry-site `wedding_sites` read from `BuilderPage.tsx` into `builderProjectService.loadEntrySite`.
- Added an explicit `BUILDER_ENTRY_SITE_SELECT` projection in the builder project service.
- Updated the dashboard data-boundary guard to include builder runtime screens/code in the no-direct-Supabase/no-select-star checks and prove the builder page no longer imports Supabase or owns that direct table read.

Commands run:
- `npm test -- --run src/builder/services/builderProjectService.test.ts src/builder/BuilderPage.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 25/25.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This reduces builder page data ownership while preserving active-site resolution, no-site fallback, couple-name display, builder project load, wedding-data load, setup-draft hydration, template default application, and draft-save behavior. No deploy was run, so launch status is unchanged.

### 2026-05-06 12:43 PM PT - Registry Preview Hostile URL Matrix And Proof-Lane Refresh

What changed:
- Added `src/lib/registryPreviewUrlNormalizer.test.ts` with a local hostile URL matrix for registry preview normalization.
- Wired that matrix into `npm run test:security`.
- Refreshed the public-site access artifact guard so it follows the current shared helper extraction.
- Updated `scripts/v1-proof-ai-rollout.mjs` so AI/photo rollout proof resolves extracted select constants in `guestPhotoSharingService.ts`.

Commands run:
- `npm test -- --run src/lib/registryPreviewUrlNormalizer.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 53/53.
- `npm run test:security`: PASS, 222/222.
- `node scripts/v1-proof-ai-clearance.mjs`: expected nonzero local-only launch-clearance result with 2/2 local subchecks green and the live-gate blocker preserved.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This strengthens local P1 SSRF proof and security-lane freshness while preserving registry URL preview canonicalization, product dedupe, public-site invite/password session storage, and guest photo AI/photo safe-column proof. No deploy was run, so live hostile-target/runtime authorization proof remains gated.

### 2026-05-06 12:46 PM PT - Test-Lane Security Matrix Drift Fix

What changed:
- Updated `scripts/v1-proof-test-lanes.mjs` so its hardcoded `test:security` contract includes `src/lib/registryPreviewUrlNormalizer.test.ts`.
- `npm run proof:v1:test-lanes` now fails if the hostile registry-preview URL matrix is removed from the named security lane.

Commands run:
- `node --check scripts/v1-proof-test-lanes.mjs`: PASS.
- `npm run proof:v1:test-lanes`: PASS, 9/9 script contracts plus CI hardpass checks.
- `npm run test:security`: PASS, 222/222.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This is local proof-lane hardening only; runtime behavior and launch status are unchanged, and no deploy was run.

### 2026-05-06 12:49 PM PT - Launch Performance-Budget Gate Wiring

What changed:
- Wired `npm run proof:v1:performance-budget` into `npm run test:launch` after production build.
- Added the same named performance-budget step to `.github/workflows/ci-hardpass.yml`.
- Updated `scripts/v1-proof-test-lanes.mjs` so it guards the launch-lane and CI performance-budget contract.

Commands run:
- `npm run proof:v1:performance-budget`: PASS, 0 failures and 3 review chunks: `registry-CCjYb-Xs.js` 325.27 KiB, `nameChangeService-Bf0FgOO0.js` 288.54 KiB, and `Planning-DBFVjkJn.js` 253.86 KiB.
- `npm run proof:v1:test-lanes`: PASS, 9/9 script contracts plus CI hardpass checks.
- `npm run test:launch`: PASS. This ran typecheck, quiet lint, `test:security`, file-size guard, asset guard, production build, performance-budget proof, and proof-board markdown generation.

Status:
- PARTIAL. This makes route-chunk budget proof part of the normal launch lane, but broader query/pagination and existing asset optimization work remain. No deploy was run.

### 2026-05-06 12:56 PM PT - Messages Detail Modal Extraction

What changed:
- Moved the message detail modal into `src/pages/dashboard/messages/MessageDetailModal.tsx`.
- Reduced `src/pages/dashboard/messages/MessageDashboardComponents.tsx` from 1799 to 1415 lines.
- Added a non-page file-size guard baseline for `MessageDashboardComponents.tsx` at 1415 lines.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 31/31.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This reduces a large dashboard support module while preserving message detail viewing, delivery attention summaries, skipped-contact summaries, scheduled send controls, retry, duplicate/edit composer actions, and status display. No deploy was run.

### 2026-05-06 12:59 PM PT - Shared Email Safety Executable Proof

What changed:
- Added `src/lib/emailSafety.test.ts` to directly import the shared Edge Function email safety helpers.
- Proved hostile HTML escaping, safe URL fallback, href escaping, subject control-character cleanup, empty-subject fallback, and the 180-character subject cap.
- Wired the helper proof into `npm run test:security`.
- Updated `scripts/v1-proof-test-lanes.mjs` so the security lane contract fails if `src/lib/emailSafety.test.ts` is removed.

Commands run:
- `npm test -- --run src/lib/emailSafety.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 32/32.
- `npm run proof:v1:test-lanes`: PASS, 9/9 script contracts plus CI hardpass checks.
- `npm run test:security`: PASS, 226/226.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This strengthens the local P1 email safety proof while preserving shared helper behavior for `send-wedding-email`, `process-email-queue`, `send-bulk-message`, and vendor inquiry email paths. Live messaging authorization proof remains required. No deploy was run.

### 2026-05-06 1:05 PM PT - Name-Change Account-Update Helper Extraction

What changed:
- Moved pure account-update template proof/readiness/copy helpers into `src/lib/nameChange/accountUpdateTemplateCopy.ts`.
- Kept `src/lib/nameChange/engine.ts` compatibility exports intact for existing planner and action-feed imports.
- Reduced `src/lib/nameChange/engine.ts` from 1738 to 1528 lines.

Commands run:
- `npm test -- --run src/lib/nameChange/engine.test.ts src/lib/nameChange/actionFeed.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/planning/nameChangePlannerUi.test.ts`: PASS, 153/153.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This reduces the name-change engine maintenance surface while preserving generated account-update template subjects, audience/status/action lines, readiness labels, copied-state labels, checklist/proof normalization, and planner card copy behavior. No deploy was run.

### 2026-05-06 1:18 PM PT - Approved Deploy And Postdeploy Proof

What changed:
- Committed the accumulated hardening checkpoint as `4d211c1d` (`Harden launch gates and split dashboard modules`).
- Deployed updated Supabase Edge Functions on project `atuzuobpprjstfmdnwso`: `validate-rsvp-token`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`, `photo-album-create`, `photo-album-manage`, `photo-analyze-batch`, `photo-export-manifest`, and `photo-upload-moderate`.
- Deployed Vercel production deployment `dpl_H2GEvD7Zo6Ka3a8xFtEKcvQqzArz`, aliased to `https://dayof.love`.
- Installed missing local Playwright Chromium and refreshed stale CSV/check-in smoke guards so postdeploy proof follows the extracted Guests components/hooks.

Commands run:
- `supabase functions deploy validate-rsvp-token --project-ref atuzuobpprjstfmdnwso --no-verify-jwt`: PASS.
- `supabase functions deploy send-wedding-email --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy send-bulk-message --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy queue-guest-followups --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy photo-album-create --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy photo-album-manage --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy photo-analyze-batch --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy photo-export-manifest --project-ref atuzuobpprjstfmdnwso`: PASS.
- `supabase functions deploy photo-upload-moderate --project-ref atuzuobpprjstfmdnwso`: PASS.
- `FORCE_DEPLOY=1 npm run deploy:prod`: PASS for deploy; first built-in postdeploy proof failed because local Playwright Chromium was missing and two stale static smoke guards still inspected the pre-extraction Guests file.
- `npx playwright install chromium`: PASS.
- `npm run smoke:csvmapper`: PASS.
- `npm run smoke:checkin`: PASS.
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:postdeploy`: PASS, 8/8.

Status:
- PARTIAL. Production is updated and current postdeploy proof is green. Remaining launch-clear blockers are still the secure service-role/RLS live proof, live email/messaging authorization proof, and external OpenAI key rotation before broad public traffic.

### 2026-05-06 1:25 PM PT - Live Email/Messaging Unauthenticated Denial Proof

What changed:
- Added `scripts/v1-proof-email-messaging-authorization.mjs`.
- Wired it as `npm run proof:v1:email-messaging-authorization`.
- Added static launch proof coverage in `src/lib/launchEdgeFunctions.test.ts` so the proof script keeps covering `process-email-queue`, `queue-guest-followups`, `send-bulk-message`, and `send-wedding-email`.
- Added the live denial proof to the comms-center proof-board slice and guarded that board contract in `src/lib/proofBoardFreshness.test.ts`.

Commands run:
- `npm run proof:v1:email-messaging-authorization`: first sandbox run failed only on blocked network fetches.
- `npm run proof:v1:email-messaging-authorization`: PASS after approved network access. Deployed `process-email-queue`, `queue-guest-followups`, and `send-bulk-message` returned `401` with no bearer token; deployed `send-wedding-email` returned `401` at the authorization boundary for direct RSVP email relay input.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 39/39.
- `npm test -- --run src/lib/proofBoardFreshness.test.ts src/lib/launchEdgeFunctions.test.ts src/lib/plannerAccess.test.ts`: PASS, 40/40.
- `npm run smoke:messages`: PASS.
- `npm run proof:v1:board:md`: PASS, with `npm run proof:v1:email-messaging-authorization` listed under comms-center automated proof.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS. Known warnings remain: Browserslist caniuse-lite is outdated and Vite generated an empty `vendor-react` chunk.

Status:
- PARTIAL. This closes the unauthenticated live denial slice for deployed email/messaging send and queue functions, with no deploy run in this batch. Authenticated owner/planner/coordinator/viewer live mutation proof, secure service-role/RLS proof, and external OpenAI key rotation remain required.

### 2026-05-06 1:32 PM PT - Live Photo/Media Service-Role Unauthenticated Denial Proof

What changed:
- Added `scripts/v1-proof-service-role-authorization.mjs`.
- Wired it as `npm run proof:v1:service-role-authorization`.
- Added static launch proof coverage in `src/lib/launchEdgeFunctions.test.ts` so the proof script keeps covering `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch`.
- Added the live service-role/media denial proof to the proof board AI/photo proof commands and guarded that board contract in `src/lib/proofBoardFreshness.test.ts`.

Commands run:
- `npm run proof:v1:service-role-authorization`: first sandbox run failed only on blocked network fetches.
- `npm run proof:v1:service-role-authorization`: PASS after approved network access. Deployed `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch` returned `401` without an authorization bearer.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/proofBoardFreshness.test.ts src/lib/plannerAccess.test.ts`: PASS, 40/40.
- `npm run proof:v1:board:md`: PASS, with `npm run proof:v1:service-role-authorization` listed in AI/photo proof commands and automated proof.

Status:
- PARTIAL. This closes the unauthenticated live denial slice for deployed photo/media service-role functions, with no deploy run in this batch. Authenticated owner/planner/coordinator/viewer live mutation proof and secure service-role/RLS cross-table/storage proof remain required.

### 2026-05-06 1:37 PM PT - Public Subresource Access-Gate Coverage Proof

What changed:
- Added `scripts/v1-proof-public-access-coverage.mjs`.
- Wired it as `npm run proof:v1:public-access-coverage`.
- Removed the stale `photo-upload` slug-path post-gate `!tokenHash && !site.is_published` shortcut so password/invite-mode slug uploads stay governed by `canReadPublicSubresource`.
- Narrowed the later `photo-upload` site read to Drive backup fields only.
- Added static launch proof coverage in `src/lib/launchEdgeFunctions.test.ts`.
- Added the public-access coverage proof to the proof board public-site trust slice and guarded that board contract in `src/lib/proofBoardFreshness.test.ts`.

Commands run:
- `npm run proof:v1:public-access-coverage`: FAIL before the fix, catching `photo-upload` as the only stale published-only shortcut.
- `npm run proof:v1:public-access-coverage`: PASS after the fix across all detected public subresource functions.
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/proofBoardFreshness.test.ts src/lib/publicSiteAccess.test.ts`: PASS, 32/32.
- `npm run proof:v1:board:md`: PASS, with `npm run proof:v1:public-access-coverage` listed under public-site trust automated proof.

Status:
- PARTIAL. This closes a local public-access drift bug and adds a reusable gate for future public subresource functions. No deploy was run, so production needs an approved deploy before the `photo-upload` slug-mode fix is live.

### 2026-05-06 1:41 PM PT - Public Access Proof Hardpass Wiring

What changed:
- Wired `npm run proof:v1:public-access-coverage` into `npm run test:launch` immediately after `test:security`.
- Added a named CI hardpass step for `npm run proof:v1:public-access-coverage`.
- Updated `scripts/v1-proof-test-lanes.mjs` so the release-lane contract fails if the public access coverage command, launch-lane placement, or CI step is removed.
- The public subresource access proof now graduates from a one-off proof command into the launch and CI hardpass paths.

Commands run:
- `npm run proof:v1:public-access-coverage`: PASS.
- `npm run proof:v1:test-lanes`: PASS, 10/10 script contracts plus CI hardpass checks.
- `npm run test:launch`: PASS. This ran typecheck, quiet lint, `test:security` (226/226), public-access coverage proof, file-size guard, asset guard, production build, performance-budget proof, and proof-board markdown generation.

Status:
- PARTIAL. This is local-only release-lane hardening and no deploy was run.

### 2026-05-06 1:45 PM PT - Public Asset Directory Budget Guard

What changed:
- Updated `scripts/check-asset-budget.mjs` to report top-level public asset directory totals.
- Added explicit directory budgets for `template-previews-gif`, `preview-photos`, `variant-previews`, `photos`, and `template-previews`.
- Added a 500 KiB ceiling for any new unbudgeted top-level public directory.

Commands run:
- `npm run guard:assets`: PASS, 209433 KiB total public assets.
- Directory budget proof: `public/template-previews-gif` 140502 KiB under 141000 KiB, `public/preview-photos` 41847 KiB under 42000 KiB, `public/variant-previews` 11911 KiB under 12000 KiB, `public/photos` 10551 KiB under 11000 KiB, and `public/template-previews` 4327 KiB under 4500 KiB.

Status:
- PARTIAL. This prevents quiet growth in the heaviest public asset buckets while the larger CDN/object-storage or optimized-thumbnail strategy remains open. No deploy was run.

### 2026-05-06 1:48 PM PT - Dashboard High-Cardinality Query Caps

What changed:
- Added explicit high-water caps to guest dashboard guest/event/invitation reads.
- Added explicit high-water caps to message dashboard history, recipient, event, and event-invitation reads.
- Added explicit high-water caps to guest-photo event and album reads.
- Updated `src/lib/dashboardDataBoundary.test.ts` to guard the cap constants and `.limit(...)` calls for those high-cardinality service reads.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/settings/settingsSiteData.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts`: PASS, 34/34.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This bounds worst-case dashboard service loads while true beyond-cap pagination remains tracked separately. No deploy was run.

### 2026-05-06 1:52 PM PT - Dashboard High-Cardinality Query Caps Continuation

What changed:
- Added explicit high-water caps to RSVP board guest, event, and event-invitation reads.
- Added explicit high-water caps to coordinator guest, event, and event-invitation reads.
- Added explicit high-water caps to overview guest reads, registry item reads, seating itinerary/lookup assignment reads, and itinerary guest-picker invitation reads.
- Updated `src/lib/dashboardDataBoundary.test.ts` to guard this second wave of cap constants and `.limit(...)` calls.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/registry/registryTypes.test.ts`: PASS, 49/49.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This further bounds worst-case dashboard service loads while true beyond-cap pagination remains tracked separately. No deploy was run.

### 2026-05-06 1:58 PM PT - Onboarding AI Service-Role Usage Trust Fix

What changed:
- `supabase/functions/onboarding-ai-orchestrate/index.ts` no longer trusts the browser-supplied `siteId` for service-role usage attribution or rate-limit site context.
- Added `resolveVerifiedUsageSiteId(...)`, which reads the bearer token with `admin.auth.getUser(token)`, confirms site ownership through `wedding_sites.user_id`, and otherwise requires a matching `wedding_site_collaborators` row.
- Rate-limit context and `internal_ai_usage_events.wedding_site_id` inserts now use `verifiedUsageSiteId`.
- Anonymous onboarding still works and remains IP/subject rate-limited; unverified site ids are simply not attached to internal usage rows.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/aiProviderKeySecurity.test.ts`: PASS, 36/36.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `git diff --check`: PASS.
- `npm run guard:assets`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local service-role trust gap in onboarding AI usage logging. No deploy was run, so production needs an approved deploy before this Edge Function fix is live.

### 2026-05-06 2:01 PM PT - Service-Role Disposition Category Hardening

What changed:
- Updated `docs/service-role-authorization-disposition-2026-05-05.md` so public/optional-auth rate-limited helpers are no longer grouped with owner/collaborator service-role functions.
- `log-client-error`, `onboarding-ai-orchestrate`, and `vendor-profile-preview` are now recorded as public or optional-auth rate-limited helpers with their required trust boundary.
- `src/lib/serviceRoleAuthorizationDisposition.test.ts` now parses the disposition categories and requires every service-role Edge Function to appear in exactly one category.

Commands run:
- `npm test -- --run src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 30/30.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This tightens local service-role proof/disposition accuracy. No deploy was run; secure service-role/RLS live proof remains open.

### 2026-05-06 2:02 PM PT - Full Local Launch-Lane Checkpoint

Commands run:
- `npm run test:launch`: PASS.

Coverage:
- Typecheck.
- Quiet lint.
- `test:security`: PASS, 227/227.
- Public subresource access-gate coverage proof.
- File-size guard.
- Asset directory budget guard.
- Production build.
- Performance-budget proof.
- Proof-board markdown generation.

Status:
- PARTIAL. The post-disposition hardpass lane is green locally, with proof board regenerated at 2026-05-06 2:02 PM PT. No deploy was run.

### 2026-05-06 2:05 PM PT - Google Drive OAuth State Signing Hardening

What changed:
- `supabase/functions/google-drive-auth-start/index.ts` now signs Google Drive OAuth state with the shared HMAC session-token helper.
- `supabase/functions/google-drive-auth-callback/index.ts` now verifies that signed state before service-role Drive token exchange/write work.
- The callback now requires `scope: "google_drive_oauth"`, `siteId`, `userId`, and timestamp from the verified state token and no longer trusts `JSON.parse(atob(stateRaw))`.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts`: PASS, 30/30.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local Google Drive service-role callback trust gap. No deploy was run, so production needs an approved function deploy before the callback fix is live.

### 2026-05-06 2:09 PM PT - Registry Preview Display-Image SSRF Hardening

What changed:
- `supabase/functions/registry-preview/index.ts` now validates product image URLs before passing them to the display-image proxy.
- Added `isPublicPreviewResourceUrl(...)` and reused the existing preview hostname blocklist so private/local/metadata/credentialed image URLs are dropped, including blocked nested targets inside existing `images.weserv.nl` proxy URLs.
- Existing public product images, generated avatar fallbacks, and logo fallbacks remain available.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/registryPreviewUrlNormalizer.test.ts`: PASS, 53/53.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local registry-preview image proxy SSRF gap. No deploy was run, so production needs an approved function deploy before the registry preview fix is live.

### 2026-05-06 2:16 PM PT - Registry Preview Image-Resource Proof Extraction

What changed:
- Moved the registry display-image SSRF helper into `supabase/functions/registry-preview/urlNormalizer.ts` as exported `isPublicPreviewResourceUrl(...)`.
- `supabase/functions/registry-preview/index.ts` now imports the shared helper instead of keeping a private copy.
- Added direct unit coverage for public image URLs, existing `images.weserv.nl` proxy URLs, metadata/private image targets, credentialed URLs, non-web schemes, blocked nested proxy targets, and over-nested proxy recursion.

Commands run:
- `npm test -- --run src/lib/registryPreviewUrlNormalizer.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 62/62.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This strengthens the local executable proof for the registry-preview image proxy SSRF fix. No deploy was run, so production still needs an approved function deploy before the registry preview fix is live.

### 2026-05-06 2:19 PM PT - Vendor Preview Image URL Sanitization

What changed:
- `supabase/functions/vendor-profile-preview/index.ts` now runs fetched `og:image` / `twitter:image` values through `normalizeVendorImageUrl(...)`.
- The helper resolves relative image URLs against the already-normalized public website and drops non-HTTP(S), credentialed, private/local/internal/test/metadata-hosted, or malformed image targets.
- `src/lib/launchEdgeFunctions.test.ts` now guards the helper, relative-URL resolution, and sanitized `websiteImage` assignment.

Commands run:
- `npm test -- --run src/lib/launchEdgeFunctions.test.ts`: PASS, 28/28.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local vendor-profile preview image metadata trust gap. No deploy was run, so production needs an approved function deploy before this Edge Function fix is live.

### 2026-05-06 2:22 PM PT - Vendor Fallback Draft Image Hardening

What changed:
- `src/lib/vendorProfiles.ts` no longer creates fallback hero images through `image.thum.io` when `vendor-profile-preview` is unavailable.
- Fallback draft URL normalization now rejects non-HTTP(S), credentialed, private/local/internal/test/metadata-hosted, IPv6-looking, and malformed website URLs; Instagram fallback values now use the shared public Instagram sanitizer.
- `createVendorProfile(...)` now sanitizes hero/gallery images, website URL, Instagram URL, and contact email again before insert.
- `getSafePublicInstagramUrl(...)` now rejects credentialed Instagram URLs, and shared public web/image helpers now reject credentialed, localhost, metadata, private IPv4, internal, `.local`, and `.test` hosts.
- Added `src/lib/vendorProfiles.test.ts` and expanded `src/sections/publicLinks.test.ts` for fallback, insert, public web/image, and public Instagram link safety.

Commands run:
- `npm test -- --run src/sections/publicLinks.test.ts src/lib/vendorProfiles.test.ts src/pages/VendorProfileCreate.test.tsx src/pages/VendorProfile.test.tsx src/lib/dashboardLinkSafety.test.ts`: PASS, 25/25.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes local public-link, vendor fallback, and service-layer insert trust gaps. No deploy was run.

### 2026-05-06 2:32 PM PT - Share QR URL Hardening

What changed:
- `isSafePublicQrAssetUrl(...)` now reuses `getSafePublicWebUrl(...)` before applying token-like query/hash checks.
- `ShareQrPanel` now computes a sanitized public share URL and renders nothing for unsafe inputs, so copy/open/download actions cannot pass private, credentialed, tokenized, local, metadata, or non-web URLs to the QR image endpoint.
- Added component coverage for safe QR rendering and unsafe QR suppression.

Commands run:
- `npm test -- --run src/lib/guestHubQrAssets.test.ts src/components/ui/ShareQrPanel.test.tsx src/sections/publicLinks.test.ts`: PASS, 17/17.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local QR/share public-link trust gap. No deploy was run.

### 2026-05-06 2:36 PM PT - Photo Dashboard QR Generation Hardening

What changed:
- `GuestPhotoSharing.tsx` now uses `isSafePublicQrAssetUrl(...)` and the shared `buildQrImageUrl(...)` for album upload QR links instead of assembling QR-server URLs inline.
- `src/lib/dashboardLinkSafety.test.ts` now guards that the photo dashboard keeps using the shared QR safety helper before QR generation.
- Kept the strict `GuestPhotoSharing.tsx` file-size baseline unchanged at 1979 lines by removing an existing duplicate import line.

Commands run:
- `npm test -- --run src/lib/dashboardLinkSafety.test.ts src/lib/guestHubQrAssets.test.ts src/components/ui/ShareQrPanel.test.tsx`: PASS, 12/12.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local photo-dashboard QR generation trust gap. No deploy was run.

### 2026-05-06 2:40 PM PT - Shared Public Link Sanitizer Tightening

What changed:
- `getSafePublicWebUrl(...)` and `getSafePublicImageUrl(...)` now reject reserved `.invalid` and `.example` hostnames.
- `getSafePublicImageUrl(...)` no longer allows generic `data:image/svg+xml` payloads; raster data-image placeholders and local static image paths remain supported.
- Public link tests now cover the reserved-host and SVG data-image rejection cases, with QR and vendor profile callers re-proven against the tighter helper.

Commands run:
- `npm test -- --run src/sections/publicLinks.test.ts src/lib/guestHubQrAssets.test.ts src/lib/vendorProfiles.test.ts src/pages/VendorProfileCreate.test.tsx src/pages/VendorProfile.test.tsx`: PASS, 24/24.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This closes a local shared public-link sanitizer gap. No deploy was run.

### 2026-05-06 2:42 PM PT - Global Select-Star Guard Hardening

What changed:
- `src/lib/dashboardDataBoundary.test.ts` now scans all runtime app source under `src` plus Supabase Edge Function code under `supabase/functions` for `.select('*')`.
- The previous boundary guard covered pages, builder code, and public sections; this expands the regression proof to shared services, libraries, and Edge Function source.

Commands run:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 20/20.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This broadens local sensitive-field exposure regression proof. No deploy was run.

### 2026-05-06 2:45 PM PT - Owner Preview Exit Token Cleanup

What changed:
- Owner preview mode now strips `token`, `invite_token`, `secureToken`, and `access_token` from the “Leave preview” href for guest-specific preview paths.
- Guest preview still opens through the existing invite-link flow; the cleanup only affects the exit link so private access params do not remain in the address bar after leaving preview.

Commands run:
- `npm test -- --run src/lib/ownerPreviewMode.test.ts src/lib/guestVisibilityPreview.test.ts`: PASS, 8/8.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.

Status:
- PARTIAL. This narrows local owner-preview token retention risk. No deploy was run.

### 2026-05-06 2:50 PM PT - P1 Live Authorization Proof Refresh

What changed:
- Backlog priority shifted per Eric: pause file-splitting work and test/lint/typecheck-fix-only cleanup; focus next on remaining P1/security/live-proof blockers.
- No runtime code changed in this checkpoint.

Commands run:
- `npm run proof:v1:service-role-authorization`: first sandboxed run failed with network `fetch failed`; reran with approved network access and PASS. Live unauthenticated media service-role calls returned 401 for `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch`.
- `npm run proof:v1:email-messaging-authorization`: PASS. Live unauthenticated email/messaging calls returned 401 for `process-email-queue`, `queue-guest-followups`, `send-bulk-message`, and `send-wedding-email`.
- `npm run proof:v1:collaborator-runtime`: BLOCKED. Missing disposable proof credentials: `V1_OWNER_EMAIL`, `V1_OWNER_PASSWORD`, `V1_COLLABORATOR_EMAIL`, and `V1_COLLABORATOR_PASSWORD`.

Status:
- PARTIAL. Fresh live unauthenticated denial proof is green, but authenticated role-by-role mutation proof and secure service-role/RLS proof remain blocked on a credentialed secure proof environment. No deploy was run.

### 2026-05-06 2:53 PM PT - Preview Reserved-Host SSRF Hardening

What changed:
- Registry preview URL normalization now rejects reserved `.invalid` and `.example` hostnames.
- Registry preview display-image normalization now also rejects those reserved hostnames, including nested `images.weserv.nl` proxy targets.
- Vendor profile preview source and image URL normalization now rejects the same reserved hostnames.

Commands run:
- `npm test -- --run src/lib/registryPreviewUrlNormalizer.test.ts src/lib/launchEdgeFunctions.test.ts`: PASS, 66/66.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run guard:file-size`: PASS.
- `npm run guard:assets`: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS with known Browserslist `caniuse-lite` and empty `vendor-react` warnings.
- `npm run proof:v1:ai-product-readiness`: PASS, 23/23.

Status:
- PARTIAL. This narrows local SSRF/public-source preview risk. No deploy was run, so production still needs an approved function deploy before this Edge Function hardening is live.
