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

### 2026-05-08 3:26 AM PT - No-Deploy Settings Dashboard View Model Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer hand-assembles the owner-settings derived support bundle inline.
- New `src/pages/dashboard/settings/buildSettingsDashboardViewModel.ts` now owns public site URL derivation, visible settings tabs, filtered planner role options, current template label lookup, and wedding identity export/print asset assembly.
- `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin that seam and reject regaining the old inline derived-view assembly inside `Settings.tsx`.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This keeps `Settings.tsx` more focused on state and handler wiring instead of derived page-model assembly. No deploy was run.

### 2026-05-08 3:22 AM PT - No-Deploy Settings Dashboard Snapshot Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer owns the full owner-settings bootstrap and hydration fetch path inline.
- New `src/pages/dashboard/settings/loadSettingsDashboardSnapshot.ts` now owns the signed-out, demo, and live snapshot load/normalization seam for settings bootstrap, including collaborator invites, translation statuses, RSVP settings, and notification/privacy defaults.
- `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin that seam and reject regaining the old page-owned `loadSettingsSite(...)` snapshot path inside `Settings.tsx`.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This pulls a big chunk of bootstrap logic out of `Settings.tsx` and keeps the page more focused on local state and action wiring instead of fetch-and-normalize choreography. No deploy was run.

### 2026-05-08 3:15 AM PT - No-Deploy Settings RSVP Tab Content Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer composes the full owner-facing RSVP tab body inline.
- New `src/pages/dashboard/settings/SettingsRsvpTabContent.tsx` now owns the shared meal-choice and advanced-question panel cluster for the RSVP tab.
- `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin that seam and reject regaining the old inline RSVP-tab panel block inside `Settings.tsx`.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This pulls another dense owner-facing panel cluster out of `Settings.tsx` and keeps the page more focused on lifecycle and orchestration instead of RSVP-tab composition. No deploy was run.

### 2026-05-08 3:12 AM PT - No-Deploy Settings Site Tab Content Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer composes the full owner-facing site tab body inline.
- New `src/pages/dashboard/settings/SettingsSiteTabContent.tsx` now owns the shared site-url, identity-export, privacy, and template panel cluster for the site tab.
- `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin that seam and reject regaining the old inline site-tab panel block inside `Settings.tsx`.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This pulls another dense owner-facing panel cluster out of `Settings.tsx` and keeps the page more focused on lifecycle and orchestration instead of site-tab composition. No deploy was run.

### 2026-05-08 3:08 AM PT - No-Deploy Settings Tab Content Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the owner settings tab switch inline.
- New `src/pages/dashboard/settings/SettingsTabContent.tsx` now owns the shared account/team/site/rsvp/notifications/billing tab handoff seam.
- `src/lib/settingsErrorSafety.test.ts` and `src/pages/dashboard/settings/settingsSiteData.test.ts` now pin that seam and reject regaining the old inline `activeTab === ...` render block inside `Settings.tsx`.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `npm run proof:v1:board:md`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This trims more render ownership out of `Settings.tsx` and makes the page harder to quietly regrow as an inline tab router. No deploy was run.

### 2026-05-07 6:52 PM PT - No-Deploy Settings RSVP Questions Panel Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the advanced RSVP custom-questions card inline.
- New `src/pages/dashboard/settings/SettingsRsvpQuestionsPanel.tsx` now owns the advanced RSVP visibility toggle, question list/editor, choice editing, song-request playlist block, and save action.
- `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins that seam and rejects regaining the old inline advanced-RSVP copy directly inside the page.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 1 file and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes the biggest remaining self-contained form block from `Settings.tsx` and leaves the page much more focused on state and orchestration instead of advanced RSVP markup. No deploy was run.

### 2026-05-07 6:47 PM PT - No-Deploy Settings RSVP Meal Panel Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the RSVP meal-choice card inline.
- New `src/pages/dashboard/settings/SettingsRsvpMealPanel.tsx` now owns the meal-choice toggle, meal-option list/editor, save action, and collapsed success/error state for the simpler RSVP settings lane.
- `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins that seam and rejects regaining the old inline meal-choice copy directly inside the page.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 1 file and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This trims another self-contained owner-facing card out of `Settings.tsx` and keeps the page more focused on state and handlers instead of RSVP meal-choice markup. No deploy was run.

### 2026-05-07 6:44 PM PT - No-Deploy Settings Template Panel Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the full template-switcher card inline.
- New `src/pages/dashboard/settings/SettingsTemplatePanel.tsx` now owns the template title/header, visibility toggle, success/error notices, and the template selection grid.
- `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins that seam and rejects regaining the old inline template-copy block directly inside the page.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 1 file and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This trims another large owner-facing card out of `Settings.tsx` and keeps the page more focused on state and handlers instead of template-selection markup. No deploy was run.

### 2026-05-07 6:41 PM PT - No-Deploy Settings Privacy Panel Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the full privacy/access card inline.
- New `src/pages/dashboard/settings/SettingsPrivacyPanel.tsx` now owns the privacy-mode chooser, default language selector, translation status grid, invite-only access-link card, password-protected input, and search-visibility toggle UI.
- `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins that seam and rejects regaining the old inline privacy-copy block directly inside the page.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 1 file and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This trims another large owner-facing card out of `Settings.tsx` and keeps the page more focused on state and handlers instead of a long privacy/access form block. No deploy was run.

### 2026-05-07 6:36 PM PT - No-Deploy Settings Identity Exports Panel Extraction

What changed:
- `src/pages/dashboard/Settings.tsx` no longer carries the full wedding identity exports card inline.
- New `src/pages/dashboard/settings/SettingsIdentityExportsPanel.tsx` now owns the export readiness badge, export item cards, manifest grid, warnings, and manifest/print-pack actions.
- `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins that seam and rejects regaining the old inline identity-export copy directly inside the page.

Commands run:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 1 file and 6 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This trims another owner-facing card out of the oversized `Settings.tsx` file and keeps the page more focused on state/handlers instead of large export UI markup. No deploy was run.

### 2026-05-07 6:18 PM PT - No-Deploy Preview Photo Manifest Service Extraction

What changed:
- Added `src/pages/previewPhotoManifestService.ts` so `TemplateScrollCapture.tsx` and `VariantPreviewCapture.tsx` no longer own duplicate preview manifest fetch transport inline.
- Both capture pages now route preview photo manifest loading through `loadPreviewPhotoManifest()`.
- Added `src/pages/previewPhotoManifestService.test.ts` and `src/pages/previewPhotoManifestService.boundary.test.ts` so the shared preview-manifest boundary is pinned.

Commands run:
- `npm test -- --run src/pages/previewPhotoManifestService.test.ts src/pages/previewPhotoManifestService.boundary.test.ts`: PASS, 2 files and 2 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another duplicated page-owned fetch cluster and keeps the preview capture pages focused on rendering rather than raw manifest transport. No deploy was run.

### 2026-05-07 6:12 PM PT - No-Deploy Shared RSVP Function Transport Extraction

What changed:
- Added `src/pages/rsvpFunctionService.ts` so `RSVP.tsx` and `EventRSVP.tsx` no longer own duplicate guest-facing `validate-rsvp-token` fetch transport inline.
- `RSVP.tsx` now routes lookup, guest follow-up lookup, and submit through `callValidateRsvpToken(...)`.
- `EventRSVP.tsx` now routes event lookup and event submit through the same shared RSVP function service and reuses `hasRsvpFunctionRuntime()` for the runtime guard.
- Added `src/pages/rsvpFunctionService.test.ts` and updated `src/lib/publicGuestSurfaceBoundary.test.ts` so the shared RSVP transport boundary is pinned.

Commands run:
- `npm test -- --run src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx`: PASS, 4 files and 119 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another duplicated guest-facing fetch cluster and keeps both RSVP pages more focused on guest flow instead of raw function transport. No deploy was run.

### 2026-05-07 6:01 PM PT - No-Deploy Guest Public Submission Service Extraction

What changed:
- Added `src/pages/guestPublicSubmissionService.ts` so `PhotoUpload.tsx`, `GuestbookSubmit.tsx`, and `GuestContactUpdate.tsx` no longer own direct guest-facing public function fetch transport inline.
- `PhotoUpload.tsx` now routes photo uploads through `uploadGuestPhotos(...)` and its guest prospect opt-in follow-up through the shared `guestHubPublicService.ts`.
- `GuestbookSubmit.tsx` now routes guestbook submission through `submitGuestbookEntry(...)`.
- `GuestContactUpdate.tsx` now routes both guest contact lookup and guest contact submit through `callGuestContactFunction(...)`.
- Added `src/pages/guestPublicSubmissionService.test.ts` and updated `src/lib/publicGuestSurfaceBoundary.test.ts` so the guest-facing photo/guestbook/contact transport boundary is pinned.

Commands run:
- `npm test -- --run src/pages/guestPublicSubmissionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/PhotoUpload.test.ts src/pages/GuestbookSubmit.test.ts src/pages/GuestContactUpdate.test.ts`: PASS, 5 files and 21 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another guest-facing page-owned fetch cluster and gives the public submission surface one shared transport seam for future hardening without changing guest behavior. No deploy was run.

### 2026-05-07 5:57 PM PT - No-Deploy Guest Hub Public Service Extraction

What changed:
- Added `src/pages/guestHubPublicService.ts` so `EventHub.tsx` and `EventRecap.tsx` no longer own direct public guest-hub fetch transport inline.
- `EventHub.tsx` now routes guest hub config loading, guest-hub telemetry, and guest prospect opt-in submission through the shared service.
- `EventRecap.tsx` now routes recap config loading, guest-hub telemetry, and guest prospect opt-in submission through the same shared service.
- Added `src/pages/guestHubPublicService.test.ts` and updated `src/lib/publicGuestSurfaceBoundary.test.ts` so the guest-facing event hub/recap transport boundary is pinned.

Commands run:
- `npm test -- --run src/pages/guestHubPublicService.test.ts src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 4 files and 28 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another guest-facing page-owned fetch cluster and keeps the event hub and recap pages more focused on guest flow rather than function transport. No deploy was run.

### 2026-05-07 5:53 PM PT - No-Deploy Message Bulk Send Transport Extraction

What changed:
- `src/pages/dashboard/Messages.tsx` no longer owns the direct `send-bulk-message` fetch transport for immediate send or scheduled dispatch.
- `src/pages/dashboard/messages/messageService.ts` now owns `triggerDashboardBulkSend(...)` and `triggerScheduledMessageDispatch(...)` alongside the existing message auth token helper.
- Expanded `src/pages/dashboard/messages/messageService.boundary.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the messaging dashboard boundary now pins the moved transport seam.

Commands run:
- `npm test -- --run src/pages/dashboard/messages/messageService.boundary.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 2 files and 24 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes the last direct bulk-send fetch cluster from `Messages.tsx` and keeps the page focused on composer flow rather than delivery transport. No deploy was run.

### 2026-05-07 5:45 PM PT - No-Deploy Guest Conflict Service Boundary Cleanup

What changed:
- `src/pages/dashboard/Guests.tsx` no longer owns the live `rsvp_conflicts` resolve/resolve-all writes inline.
- `src/pages/dashboard/guests/guestService.ts` now owns `resolveGuestDashboardConflict(...)` and `resolveGuestDashboardConflicts(...)`.
- Expanded `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard boundary now pins the moved RSVP-conflict writes.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 2 files and 46 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes the last small direct `rsvp_conflicts` write cluster from `Guests.tsx` while preserving guest conflict review behavior. No deploy was run.

### 2026-05-07 4:06 PM PT - No-Deploy Guest Photo Function Service Extraction

What changed:
- `src/pages/dashboard/GuestPhotoSharing.tsx` no longer owns the auth-retrying owner function transport or the direct `queue-guest-followups` invocation.
- `src/pages/dashboard/guestPhotoSharingService.ts` now owns `invokeGuestPhotoOwnerFunction(...)` and `queueGuestPhotoFollowups(...)` alongside the existing guest-photo auth/session helpers.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the guest-photo dashboard boundary now pins that function-transport seam too.

Commands run:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 4 files and 34 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This pulls another owner-dashboard function cluster out of `GuestPhotoSharing.tsx` and keeps the page more focused on moderation and sharing flow rather than Edge Function transport and auth-retry handling. No deploy was run.

### 2026-05-07 3:59 PM PT - No-Deploy Setup Bootstrap Service Extraction

What changed:
- `src/pages/setup/SetupShell.tsx` no longer owns the direct `invokeFunctionOrThrow(supabase, 'setup-bootstrap', ...)` call.
- New `src/pages/setup/setupService.ts` now owns `submitSetupBootstrap(...)` for the setup bootstrap Edge Function handoff.
- Added `src/pages/setup/setupService.test.ts` so the setup page-to-service boundary is pinned.

Commands run:
- `npm test -- --run src/pages/setup/setupService.test.ts src/lib/launchWordingGuard.test.ts`: PASS, 2 files and 4 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another page-owned function invoke and keeps `SetupShell.tsx` focused on setup flow instead of transport wiring. No deploy was run.

### 2026-05-07 3:56 PM PT - No-Deploy Login Auth Listener Service Extraction

What changed:
- `src/pages/Login.tsx` no longer owns the direct `supabase.auth.onAuthStateChange(...)` subscription.
- `src/pages/loginService.ts` now owns `subscribeLoginAuthState(...)` alongside the existing login session priming, password sign-in, Google OAuth start, and password reset helpers.
- Expanded `src/pages/loginService.test.ts` so the login page-to-service auth boundary now pins both session priming and auth-listener subscription.

Commands run:
- `npm test -- --run src/pages/loginService.test.ts src/pages/Login.test.tsx src/lib/authErrorCopy.test.ts`: PASS, 3 files and 14 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes the last direct Supabase auth call from `Login.tsx` and keeps the page focused on UI and redirect flow instead of auth transport details. No deploy was run.

### 2026-05-07 3:53 PM PT - No-Deploy Vault Contribution Function Service Extraction

What changed:
- `src/pages/VaultContribute.tsx` no longer owns direct `supabase.functions.invoke(...)` calls for public vault config loading, Google Drive upload, attachment upload, or final entry submission.
- `src/pages/vaultContributionService.ts` now owns `loadEnabledVaultContributionConfig(...)`, `listEnabledVaultContributionConfigs(...)`, `uploadVaultContributionToGoogleDrive(...)`, `uploadVaultContributionAttachment(...)`, and `submitVaultContributionRows(...)`.
- Updated `src/pages/VaultContribute.test.ts` and `src/lib/publicGuestSurfaceBoundary.test.ts` so the guest-facing vault contribution page now has a pinned page-to-service boundary for those function calls.

Commands run:
- `npm test -- --run src/pages/VaultContribute.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/lib/publicSiteAccess.test.ts`: PASS, 3 files and 20 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another guest-facing page-owned function cluster and keeps `VaultContribute.tsx` focused on guest form flow instead of transport details. No deploy was run.

### 2026-05-07 3:48 PM PT - No-Deploy Site View Public Function Service Extraction

What changed:
- Added `src/pages/siteViewService.ts` so the public site page no longer owns its direct public-subresource function calls.
- `src/pages/SiteView.tsx` now routes `public-itinerary-by-slug` and `public-registry-items` reads through `fetchPublicItineraryRows(...)` and `hasLiveRegistryItems(...)` in that service instead of directly invoking `supabase.functions.invoke(...)` inline.
- Added `src/pages/siteViewService.test.ts` and updated `src/lib/publicGuestSurfaceBoundary.test.ts` so the guest-facing site page now has a pinned page-to-service boundary for those public function reads.

Commands run:
- `npm test -- --run src/pages/siteViewService.test.ts src/pages/SiteView.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/lib/publicSiteAccess.test.ts`: PASS, 4 files and 15 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another page-owned Supabase function cluster and keeps `SiteView.tsx` more focused on public rendering flow rather than transport details. No deploy was run.

### 2026-05-07 3:46 PM PT - No-Deploy Vault Function Service Extraction

What changed:
- `src/pages/dashboard/vaultService.ts` now owns the remaining dashboard vault Edge Function helpers:
  - `resolveVaultEntryLink(...)`
  - `checkVaultGoogleDriveHealth(...)`
  - `startVaultGoogleDriveAuth(...)`
  - `finishVaultGoogleDriveAuth(...)`
- `src/pages/dashboard/Vault.tsx` now uses those service helpers instead of directly invoking `supabase.functions.invoke(...)` for vault attachment resolution and Google Drive health/auth flow.
- Expanded `src/pages/dashboard/vaultService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the vault page-to-service function boundary is pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/vaultService.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 2 files and 22 tests.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- IMPROVED. This removes another owner-dashboard page-owned Supabase function cluster and keeps `Vault.tsx` more UI-focused without changing vault attachment or Drive-connection behavior. No deploy was run.

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

### 2026-05-07 4:13 PM PT - No-Deploy Guest Dashboard Snapshot Service Extraction

What changed:
- Moved guest dashboard site-settings bootstrap plus guest, RSVP, and RSVP-conflict snapshot hydration out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls `loadGuestDashboardSiteSettings(userId)` and `loadGuestDashboardSnapshot(weddingSiteId)` instead of owning direct `wedding_sites`, `guests`, `rsvps`, and `rsvp_conflicts` table access inline.
- The guest service now owns explicit dashboard site-settings and RSVP-conflict projections plus the bounded guest dashboard, unresolved conflict, and conflict-history row caps.
- Expanded `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` so the guest dashboard bootstrap/snapshot boundary and moved query caps stay pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing guest list hydration, RSVP merge behavior, RSVP settings bootstrap, reminder settings, or conflict review behavior. No deploy was run.

### 2026-05-07 4:22 PM PT - No-Deploy Guest Dashboard Itinerary And RSVP Audit Service Extraction

What changed:
- Moved guest dashboard itinerary-filter bootstrap and RSVP audit-feed hydration out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls `loadGuestDashboardItineraryFilters(weddingSiteId)` and `loadGuestDashboardRsvpAuditFeed(weddingSiteId)` instead of owning direct `itinerary_events`, `wedding_sites`, `event_invitations`, and `guest_audit_logs` reads inline.
- The guest service now owns explicit itinerary-event, site-seed, invite-map, and audit projections plus the bounded itinerary-filter event/invitation caps and RSVP audit row cap.
- Expanded `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` so the moved itinerary-filter/audit boundary and query caps stay pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing itinerary filter behavior, RSVP event fallback seeding, invite guest-map hydration, or owner RSVP audit review behavior. No deploy was run.

### 2026-05-07 4:28 PM PT - No-Deploy Guest Itinerary Drawer Service Extraction

What changed:
- Moved guest itinerary drawer bootstrap and itinerary invite toggle transport out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls `loadGuestItineraryDrawerSnapshot(weddingSiteId, guestId)`, `addGuestEventInvitation(...)`, and `removeGuestEventInvitation(...)` instead of owning direct `itinerary_events`, `event_invitations`, and `guest_audit_logs` reads/writes inline.
- The guest service now owns explicit drawer event and audit projections plus the bounded drawer event, invitation, and audit row caps.
- Expanded `src/pages/dashboard/guests/guestService.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/pages/dashboard/guestQueryBounds.test.ts` so the moved drawer service boundary and query caps stay pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing itinerary drawer hydration, invited-event state, audit history review, or RSVP-snapshot rollback behavior on invite removal. No deploy was run.

### 2026-05-07 4:33 PM PT - No-Deploy Assisted RSVP Persistence Service Extraction

What changed:
- Moved assisted RSVP guest/RSVP persistence and rollback logic out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls `saveAssistedGuestRsvp(...)` instead of owning direct `guests` updates, RSVP lookup/upsert, and guest-row rollback inline.
- The guest service now owns the manual RSVP source tagging, guest RSVP state update, RSVP row update/insert, and guest-row rollback if the RSVP write fails.
- Expanded `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the assisted RSVP service boundary and rollback path stay pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing assisted RSVP source tagging, guest RSVP state updates, RSVP upsert behavior, or rollback safety on live write failure. No deploy was run.

### 2026-05-07 4:37 PM PT - No-Deploy Guest Site Slug And Active-Site Helper Extraction

What changed:
- Moved guest RSVP text-link site slug lookup and repeated active-site fallback lookup out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls `loadGuestDashboardSiteSlug(weddingSiteId)` and `resolveGuestDashboardSiteId(userId)` instead of directly querying `wedding_sites` for `site_slug` or calling `resolveActiveSiteForUser(user.id)` inline.
- The guest service now owns the `site_slug` read plus the simple active-site-id resolution helper used by guest CSV preview/import.
- Expanded `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so that boundary stays pinned.

Commands run:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing RSVP text-link export behavior or the guest CSV preview/import active-site fallback. No deploy was run.

### 2026-05-07 4:49 PM PT - Guest Status and Household Service Extraction

- Moved routine guest status and household mutations out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls service helpers for:
  - check-in undo/toggle writes
  - single and bulk thank-you sent writes
  - clear-all check-ins
  - household merge/split/reassign writes
  - reminder setting persistence
  - guest update-link public slug lookup
- Added/expanded guest service helpers:
  - `loadGuestDashboardPublicSlug(...)`
  - `updateGuestCheckInForSite(...)`
  - `updateGuestThankYouSentForSite(...)`
  - `markGuestsThankYouSentForSite(...)`
  - `assignGuestsToHouseholdForSite(...)`
  - `updateGuestHouseholdForSite(...)`
  - `persistGuestReminderSettings(...)`
- Expanded `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard page no longer owns those direct `guests` and `wedding_sites` writes inline.

Validation:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`: PASS, 60/60.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing guest check-in, thank-you tracking, household management, reminder settings, or guest update-link behavior. No deploy was run.

### 2026-05-07 4:56 PM PT - Guest Reminder Delivery Service Extraction

- Moved the remaining guest reminder/config persistence writes out of `src/pages/dashboard/Guests.tsx` and into `src/pages/dashboard/guests/guestService.ts`.
- `Guests.tsx` now calls service helpers for:
  - RSVP settings persistence
  - single invitation sent timestamp writes
  - selected reminder invitation/reminder timestamp writes
  - filtered campaign invitation/reminder timestamp writes
  - due-reminder timestamp writes
- Added/expanded guest service helpers:
  - `persistGuestDashboardRsvpConfig(...)`
  - `markGuestInvitationSentForSite(...)`
  - `markGuestInvitationAndReminderSentForSite(...)`
  - `markGuestReminderSentForSite(...)`
- Expanded `src/pages/dashboard/guests/guestService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard no longer owns those direct RSVP-config and reminder-delivery writes inline.

Validation:
- `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`: PASS, 64/64.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest dashboard page-to-service migration without changing RSVP settings save behavior or invitation/reminder send tracking. No deploy was run.

### 2026-05-07 5:00 PM PT - Itinerary Event Guest Manager Service Extraction

- Moved itinerary event guest manager snapshot loading plus invite add/remove/invite-all/remove-all transport out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
- `Itinerary.tsx` now calls:
  - `loadItineraryEventGuestManagerSnapshot(eventId)`
  - `addItineraryEventGuestInvitation(...)`
  - `removeItineraryEventGuestInvitation(...)`
  - `inviteAllGuestsToItineraryEvent(...)`
  - `removeAllGuestsFromItineraryEvent(...)`
  instead of directly reading `wedding_sites`, `guests`, and `event_invitations` inline in the event guest manager.
- The service now owns the explicit guest-picker projection plus the bounded guest and invitation row caps for that flow.
- Expanded `src/pages/dashboard/itineraryService.test.ts`, `src/pages/dashboard/itineraryQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` so the itinerary page no longer silently regains those guest-manager reads/writes.

Validation:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 32/32.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the itinerary dashboard page-to-service migration without changing event guest search, invite toggles, invite-all/remove-all behavior, or RSVP rollback safety. No deploy was run.

### 2026-05-07 5:03 PM PT - Itinerary Event Mutation Service Extraction

- Moved itinerary event save/delete transport plus best-effort photo album creation out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
- `Itinerary.tsx` now calls:
  - `saveItineraryEvent(...)`
  - `deleteItineraryEvent(...)`
  instead of directly mutating `wedding_sites`, `itinerary_events`, or invoking `photo-album-create` inline for the live event CRUD path.
- The service preserves the current field-drift fallback loop, site lookup, and best-effort album creation behavior while keeping page-owned validation, demo behavior, and save notices intact.
- Expanded `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the itinerary page no longer silently regains those event mutation and album-creation transport calls.

Validation:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 35/35.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the itinerary dashboard page-to-service migration without changing live event save/delete behavior or the best-effort photo album sidecar flow. No deploy was run.

### 2026-05-07 5:06 PM PT - Itinerary Dashboard Loader Service Extraction

- Moved itinerary dashboard event loading, invitation-count hydration, RSVP-count hydration, and schedule mirror refresh trigger out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
- `Itinerary.tsx` now calls `loadItineraryDashboardEvents(hasEventRsvpsTable)` instead of directly reading `wedding_sites`, `itinerary_events`, `event_invitations`, and `event_rsvps` inline for the live dashboard load path.
- The service now owns the explicit itinerary event projection plus the bounded event-list, invitation, and guest row caps for the dashboard loader and event guest manager paths.
- It also preserves the current optional `event_rsvps` table detection, event normalization, invitation counts, RSVP counts, and schedule mirror refresh behavior.
- Expanded `src/pages/dashboard/itineraryService.test.ts`, `src/pages/dashboard/itineraryQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` so the itinerary page no longer silently regains those read paths.

Validation:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 36/36.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the itinerary dashboard page-to-service migration without changing owner-facing event hydration, RSVP counts, or schedule mirror behavior. No deploy was run.

### 2026-05-07 5:09 PM PT - Itinerary Timeline Persistence Service Extraction

- Moved itinerary timeline shift persistence and mirror refresh out of `src/pages/dashboard/Itinerary.tsx` and into `src/pages/dashboard/itineraryService.ts`.
- `Itinerary.tsx` now calls `persistItineraryTimeline(nextEvents)` instead of directly fanning out `itinerary_events` updates inline during timeline shifts and undo.
- The service preserves the current active-site resolution, per-event date/time/display-order updates, and schedule mirror refresh behavior while the page keeps demo shifts, undo state, and save notices.
- Expanded `src/pages/dashboard/itineraryService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the itinerary page no longer silently regains the live bulk update loop.

Validation:
- `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 37/37.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the itinerary dashboard page-to-service migration without changing owner-facing timeline shift or undo behavior. No deploy was run.

### 2026-05-07 5:16 PM PT - Guest Photo Dashboard Snapshot Service Extraction

- Moved guest photo dashboard snapshot loading out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
- `GuestPhotoSharing.tsx` now calls `loadGuestPhotoDashboardSnapshot(userId)` instead of directly reading:
  - `wedding_sites`
  - `itinerary_events`
  - `photo_albums`
  - `photo_uploads`
  - `guestbook_entries`
  - `guest_prospect_optins`
  - `photo_upload_ai_analysis`
  - `photo_upload_metadata`
  - `photo_ai_bucket_corrections`
  - `guest_hub_settings`
- The service now owns the explicit dashboard snapshot projections plus the bounded event, album, upload, guestbook, prospect, analysis, metadata, and correction row caps.
- It also preserves the current active-site lookup, wedding meta hydration, and guest-hub settings defaults while the page keeps demo loading, state wiring, and auth-retry behavior.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts`, `src/pages/dashboard/guestPhotoQueryBounds.test.ts`, and `src/lib/dashboardDataBoundary.test.ts` so the page no longer silently regains those read paths.

Validation:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 35/35.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest photo dashboard page-to-service migration without changing owner-facing photo dashboard hydration or moderation workflows. No deploy was run.

### 2026-05-07 5:23 PM PT - Guest Photo Moderation Service Extraction

- Moved guest photo guest-hub settings persistence and guestbook moderation writes out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
- `GuestPhotoSharing.tsx` now calls:
  - `saveGuestPhotoHubSettings(siteId, hubSettings)`
  - `moderateGuestbookEntry(entryId, patch)`
- The service now owns the `guest_hub_settings` upsert details, including recap publish/close timestamps, trimmed custom message handling, default language fallback, and `updated_by` / `updated_at` metadata.
- The service also owns `guestbook_entries` moderation updates, including the shared `moderated_at` timestamp write.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the page no longer silently regains those `guest_hub_settings` and `guestbook_entries` writes.

Validation:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 37/37.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest photo dashboard page-to-service migration without changing owner-facing hub settings or guestbook moderation behavior. No deploy was run.

### 2026-05-07 5:31 PM PT - Guest Photo AI Curation Service Extraction

- Moved the guest photo AI curation write primitives out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
- `GuestPhotoSharing.tsx` now routes:
  - AI photo ops plan persistence through `persistGuestPhotoAiOpsPlan(siteId, plan)`
  - upload bucket moves through `moveGuestPhotoUploadToBucket(siteId, uploadId, photoAlbumId)`
  - AI bucket-correction inserts through `createGuestPhotoBucketCorrection(siteId, analysis, action, chosenBucketId, reason)`
- The page still owns the higher-level UI state transitions, success/error messaging, and optimistic local list updates, while the service now owns the direct `wedding_sites`, `photo_uploads`, and `photo_ai_bucket_corrections` write contracts.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the page no longer silently regains those AI curation write paths.

Validation:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 40/40.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest photo dashboard page-to-service migration without changing owner-facing AI sort, album move, or correction behavior. No deploy was run.

### 2026-05-07 5:37 PM PT - Guest Photo Function Transport Service Extraction

- Moved the remaining guest photo owner Edge Function transport out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
- `GuestPhotoSharing.tsx` now routes:
  - upload analysis requests through `analyzeGuestPhotoUploads(...)`
  - manifest export requests through `exportGuestPhotoManifest(...)`
  - upload moderation requests through `moderateGuestPhotoUploads(...)`
  - album management requests through `manageGuestPhotoAlbum(...)`
- The page still owns owner-facing notices, optimistic state updates, and flow-specific branching, while the service now owns those remaining function payload contracts and auth-retry transport details.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the page no longer silently regains those function-invoke paths.

Validation:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 44/44.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest photo dashboard page-to-service migration without changing owner-facing moderation, album-link, or export behavior. No deploy was run.

### 2026-05-07 5:41 PM PT - Guest Photo Album Creation Service Extraction

- Moved the last direct owner-function transport out of `src/pages/dashboard/GuestPhotoSharing.tsx` and into `src/pages/dashboard/guestPhotoSharingService.ts`.
- `GuestPhotoSharing.tsx` now routes itinerary-driven album creation, suggestion-driven moment album creation, and manual album creation through `createGuestPhotoAlbum(...)`.
- With this batch, the guest photo dashboard page no longer owns direct Supabase auth transport, direct Supabase table access, or direct owner Edge Function transport inline.
- Expanded `src/pages/dashboard/guestPhotoSharingService.test.ts` and `src/lib/dashboardDataBoundary.test.ts` so the album-create helper and the no-direct-transport page boundary are both pinned.

Validation:
- `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/lib/dashboardDataBoundary.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the guest photo dashboard page-to-service migration and leaves the page UI-focused, without changing owner-facing album creation behavior. No deploy was run.

### 2026-05-07 5:52 PM PT - Messages Composer Component Extraction

- Moved the large inline composer shell out of `src/pages/dashboard/Messages.tsx` and into `src/pages/dashboard/messages/MessageDashboardComponents.tsx` as `MessageComposerCard`.
- The extracted component now owns the campaign name, template picker, channel switcher, audience picker, message body form, schedule panel, recipient preview panel, preflight panel, and send/save buttons, while `Messages.tsx` keeps the state and callbacks.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the page is now pinned to the higher-level `MessageComposerCard` seam instead of silently regaining the lower-level composer panel wiring inline.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and service-boundary lanes for the messages dashboard without changing composer behavior. No deploy was run.

### 2026-05-07 6:29 PM PT - Settings Team Access Panel Extraction

- Moved the full planner/collaborator invite card out of `src/pages/dashboard/Settings.tsx` and into `src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx`.
- `Settings.tsx` now keeps the state and handlers for invite creation, resend, revoke, and local planner invite persistence, while the extracted panel owns the large role-picker, permission-picker, collaborator list, and action-card UI shell.
- Tightened `src/pages/dashboard/settings/settingsSiteData.test.ts` so the settings boundary now expects the page to render `SettingsTeamAccessPanel` and rejects silently regaining the old inline planner invite/collaborator list copy.

Validation:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 6/6.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for settings without changing owner/team access behavior. No deploy was run.

### 2026-05-07 6:33 PM PT - Settings Site URL Panel Extraction

- Moved the full site-url settings card out of `src/pages/dashboard/Settings.tsx` and into `src/pages/dashboard/settings/SettingsSiteUrlPanel.tsx`.
- `Settings.tsx` now keeps the slug state, submit handler, and normalized slug write behavior, while the extracted panel owns the owner-facing URL card, public link preview, and QR/share UI shell.
- Tightened `src/pages/dashboard/settings/settingsSiteData.test.ts` so the settings boundary now expects `SettingsSiteUrlPanel` and rejects silently regaining the old inline site-url copy inside the page.

Validation:
- `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts`: PASS, 6/6.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for settings without changing public site link behavior. No deploy was run.

### 2026-05-07 7:07 PM PT - Guest Dashboard Overlay Boundary Extraction

- Moved the remaining guest dashboard overlay stack behind `src/pages/dashboard/guests/GuestDashboardOverlays.tsx`.
- `src/pages/dashboard/Guests.tsx` no longer owns the assisted RSVP modal, add/edit guest modal shell, itinerary drawer shell, delete-all modal, CSV import modal stack, or inline confirm dialog render path.
- The page still owns the guest state, handlers, and mutation/service calls, while the extracted overlay layer owns the modal/drawer composition.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard now pins the higher-level `GuestDashboardOverlays` seam and rejects regaining the old inline overlay copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 15/15.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest dashboard without changing guest add/edit, assisted RSVP, itinerary invitation, delete-all, or CSV import behavior. No deploy was run.

### 2026-05-07 7:16 PM PT - Guest Dashboard Header And List-Display Boundary Extraction

- Moved the guest dashboard hero/header shell, import/actions toolbar shell, and list-vs-households display composition behind existing guest dashboard components.
- `src/pages/dashboard/Guests.tsx` now routes those seams through `src/pages/dashboard/guests/GuestDashboardHeader.tsx`, `src/pages/dashboard/guests/GuestOpsToolbar.tsx`, and `src/pages/dashboard/guests/GuestListDisplaySwitcher.tsx` instead of carrying the large inline JSX blocks.
- The page still owns the guest state, filters, handlers, and service calls, while the extracted components own the top-level guest dashboard composition.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard now pins the higher-level header, toolbar, and list-display seams and rejects regaining the old inline search/empty-state composition.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 15/15.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest dashboard without changing guest insights, import actions, household grouping, or list actions. No deploy was run.

### 2026-05-07 7:27 PM PT - Guest Dashboard Panel Extraction Continuation

- Moved the guest RSVP settings screen, snapshot/insights panel, RSVP conflict review panels, and campaign reminder modal shell behind existing guest dashboard components.
- `src/pages/dashboard/Guests.tsx` now routes those seams through `src/pages/dashboard/guests/GuestRsvpSettingsView.tsx`, `src/pages/dashboard/guests/GuestSnapshotInsightsPanel.tsx`, `src/pages/dashboard/guests/GuestRsvpConflictPanels.tsx`, and `src/pages/dashboard/guests/GuestCampaignReminderPanel.tsx` instead of carrying the large inline JSX blocks.
- The page still owns the guest state, filters, handlers, and service calls, while the extracted components own the RSVP-settings, insight, conflict-review, and campaign-planning composition.
- `Guests.tsx` dropped from 3371 lines to 2806 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard now pins the higher-level RSVP settings, insights, conflict, and campaign seams and rejects regaining the old inline hero/panel copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 15/15.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest dashboard without changing RSVP settings, conflict review, or campaign reminder behavior. No deploy was run.

### 2026-05-07 7:39 PM PT - Guest Dashboard Ops-Summary Extraction

- Moved the guest dashboard recommended-action card, RSVP follow-up list, planner handoff card, and quickstart photo skip card behind `src/pages/dashboard/guests/GuestOpsSummaryPanel.tsx`.
- `src/pages/dashboard/Guests.tsx` now routes that ops-summary stack through `GuestOpsSummaryPanel` instead of carrying the inline recommended-action and follow-up queue composition.
- The page still owns the guest state, filters, handlers, and service calls, while the extracted component owns the ops-summary composition.
- `Guests.tsx` dropped from 2806 lines to 2763 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest dashboard now pins the higher-level `GuestOpsSummaryPanel` seam and rejects regaining the old inline `Recommended next action` and `RSVP follow-up list` copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts`: PASS, 15/15.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest dashboard without changing recommended next actions, follow-up queue review, planner handoff guidance, or quickstart continuation behavior. No deploy was run.

### 2026-05-07 7:46 PM PT - Guest Photo Card-Boundary Extraction

- Moved the guest photo hero, guest follow-up card, guestbook card, couple albums card, stats cards, slideshow draft card, and photo moments card behind existing `src/pages/dashboard/guestPhotos/*` components.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes those seams through `GuestPhotoHeroCard`, `GuestPhotoFollowupCard`, `GuestPhotoGuestbookCard`, `GuestPhotoCoupleAlbumsCard`, `GuestPhotoStatsCards`, `GuestPhotoSlideshowDraftCard`, and `GuestPhotoMomentsCard` instead of carrying those large inline JSX blocks.
- The page still owns the guest photo state, handlers, and service calls, while the extracted components own the higher-level dashboard composition for those cards.
- `GuestPhotoSharing.tsx` dropped from 3018 lines to 2846 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now pins those higher-level card seams and rejects regaining the old inline copy for the extracted sections.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest photo dashboard without changing guest follow-up, guestbook moderation, couple albums, slideshow planning, or photo-moment review behavior. No deploy was run.

### 2026-05-07 7:52 PM PT - Guest Photo Dashboard Card Extraction Continuation

- Moved the guest photo memory-and-vaults card, no-app memory flow checklist, guest hub QR card, recap sharing card, guest hub controls card, and moment albums card behind existing `src/pages/dashboard/guestPhotos/*` components.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes those seams through `GuestPhotoMemoryVaultsCard`, `GuestPhotoMemoryFlowCard`, `GuestPhotoHubQrCard`, `GuestPhotoRecapSharingCard`, `GuestPhotoHubControlsCard`, and `GuestPhotoMomentAlbumsCard` instead of carrying those large inline JSX blocks.
- The page still owns the guest photo state, handlers, and service calls, while the extracted components own another layer of high-level dashboard composition.
- `GuestPhotoSharing.tsx` dropped from 2846 lines to 2625 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now pins those additional higher-level card seams and rejects regaining the old inline copy for the extracted sections.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest photo dashboard without changing vault handoff, guest hub sharing, recap visibility control, guest hub toggles, or moment-album suggestion behavior. No deploy was run.

### 2026-05-07 7:59 PM PT - Guest Photo Review And Slideshow Extraction

- Moved the guest photo review card behind `GuestPhotoReviewCard`, while keeping the earlier `GuestPhotoOrganizerCard` and `GuestPhotoSlideshowCard` routing pinned in the same guest-photo seam lane.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now treats organizer, slideshow, and review as higher-level guest-photo composition seams instead of carrying the old inline review block.
- `GuestPhotoSharing.tsx` dropped from 2625 lines to 2389 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now pins those additional higher-level seams and rejects regaining the old inline review/slideshow copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest photo dashboard without changing organizer notes, slideshow preview/export, highlight review, duplicate triage, or hidden-photo recovery behavior. No deploy was run.

### 2026-05-07 8:04 PM PT - Guest Photo Album Management Extraction

- Moved the guest photo album creation shell, album controls shell, bucket header shell, and recent uploads list behind existing `src/pages/dashboard/guestPhotos/*` components.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes those seams through `GuestPhotoAlbumCreateCard`, `GuestPhotoAlbumControls`, `GuestPhotoBucketCard`, and `GuestPhotoRecentUploadsList` instead of carrying the old inline album-management composition.
- The page still owns guest photo state, service calls, upload-window drafts, and per-bucket handlers, while the extracted components own another large layer of display composition.
- `GuestPhotoSharing.tsx` dropped from 2389 lines to 2038 lines in this continuation batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now pins those additional higher-level seams and rejects regaining the old inline album-management copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This materially advances the oversized-file and page-boundary lanes for the guest photo dashboard without changing album creation, event-album bootstrap, sharing-link actions, upload-window editing, or per-upload moderation behavior. No deploy was run.

### 2026-05-07 8:09 PM PT - Guest Photo Duplicate Review Cleanup

- Removed a duplicate `GuestPhotoReviewCard` mount from `src/pages/dashboard/GuestPhotoSharing.tsx`, so the owner review surface now renders once instead of twice.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now counts `GuestPhotoReviewCard` mounts and requires a single instance instead of merely checking that the component appears somewhere in the page.
- `GuestPhotoSharing.tsx` dropped from 2038 lines to 2012 lines in this cleanup batch.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This corrects a real duplicated owner-dashboard review surface without changing highlight review, duplicate triage, recap moderation, organizer notes, or slideshow planning behavior. No deploy was run.

### 2026-05-07 8:13 PM PT - Guest Photo State Shell Extraction

- Moved the guest photo quick-start continuation banner and album-list loading/blank/filter-empty state shells behind `GuestPhotoQuickStartBanner` and `GuestPhotoAlbumListState`.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes those small but noisy UI branches through dedicated guest-photo components instead of carrying the inline banner and album-state shell composition.
- `GuestPhotoSharing.tsx` dropped from 2012 lines to 1986 lines in this cleanup batch.
- Tightened `src/lib/dashboardDataBoundary.test.ts` so the guest photo dashboard now pins those additional seams and rejects regaining the old inline quick-start and album-state copy.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest photo dashboard without changing quick-start handoff, empty-album suggestions, loading feedback, or filtered-empty behavior. No deploy was run.

### 2026-05-07 8:16 PM PT - Guest Photo Window Editor Extraction

- Moved the per-bucket parent-album and upload-window editor behind `GuestPhotoBucketWindowEditor`.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes that bucket-management seam through a dedicated guest-photo component instead of carrying the inline parent/window editor block inside the bucket map.
- `GuestPhotoSharing.tsx` dropped from 1986 lines to 1949 lines in this cleanup batch.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest photo dashboard without changing parent-album reassignment, suggested window defaults, or upload-window edit behavior. No deploy was run.

### 2026-05-07 8:20 PM PT - Guest Photo Bucket List Extraction

- Moved the guest photo bucket render loop behind `GuestPhotoBucketList`.
- `src/pages/dashboard/GuestPhotoSharing.tsx` now routes that larger bucket-list seam through a dedicated guest-photo component instead of owning the repeated `GuestPhotoBucketCard` / `GuestPhotoBucketWindowEditor` / `GuestPhotoRecentUploadsList` loop inline.
- `GuestPhotoSharing.tsx` dropped from 1949 lines to 1917 lines in this cleanup batch.

Validation:
- `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts`: PASS, 45/45.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Status:
- PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest photo dashboard without changing bucket rendering, upload-window editing, recent-upload moderation, or sharing controls. No deploy was run.

## 2026-05-07 8:24 PM PT No-Deploy Guest Dashboard Export Service Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes guest CSV/export/download behavior through the existing `src/pages/dashboard/guests/useGuestDashboardExports.ts` hook instead of carrying the inline blob/download block.
  - That seam now covers guest exports, RSVP responder/pending/meal/attendance exports, thank-you/check-in exports, address/household exports, guest update link copy, and text RSVP link copy.
  - `useGuestDashboardExports.ts` now accepts optional slug-loader helpers so the guest dashboard keeps the current service-backed public/site slug lookup behavior instead of regressing to stale local assumptions.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin the new export-hook seam and reject regaining the old inline guest export helper block.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts src/pages/dashboard/guests/guestDashboardUtils.test.ts`: PASS, 66/66.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest export behavior. No deploy was run.

## 2026-05-07 8:31 PM PT No-Deploy Guest Dashboard Segment Controls Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its segment summary, RSVP follow-up alerts, filter chips, check-in status banners, and selected-guest status bar through `src/pages/dashboard/guests/GuestSegmentControlsPanel.tsx`.
  - The guest dashboard page no longer owns that inline `Active segment`, exception banner, missing-meal banner, no-contact banner, check-in mode banner, and selected-guest summary composition block.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestSegmentControlsPanel` and rejects regaining the old inline segment/banner copy.
  - `src/pages/dashboard/Guests.tsx` dropped from 2644 lines to 2560 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing segment/filter behavior. No deploy was run.

## 2026-05-07 8:37 PM PT No-Deploy Guest Dashboard Engagement Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest engagement controls stack through `src/pages/dashboard/guests/GuestEngagementControlsPanel.tsx`.
  - That higher-level shell now owns the page composition seam for `GuestOpsToolbar`, `GuestCampaignReminderPanel`, and `GuestSegmentControlsPanel`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestEngagementControlsPanel` and rejects regaining the old inline engagement stack in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2560 lines to 2545 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing engagement controls behavior. No deploy was run.

## 2026-05-07 8:43 PM PT No-Deploy Guest Dashboard Workspace Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its bordered guest workspace card through `src/pages/dashboard/guests/GuestDashboardWorkspace.tsx`.
  - That higher-level shell now owns the `Card` composition seam for `GuestEngagementControlsPanel` and `GuestListDisplaySwitcher`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardWorkspace` and rejects regaining the old inline guest engagement/list seam in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2545 lines to 2542 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest workspace behavior. No deploy was run.

## 2026-05-07 8:47 PM PT No-Deploy Guest Dashboard Content Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its middle dashboard content stack through `src/pages/dashboard/guests/GuestDashboardContent.tsx`.
  - That higher-level shell now owns the page composition seam for `GuestSnapshotInsightsPanel`, `GuestRsvpConflictPanels`, `GuestOpsSummaryPanel`, and `GuestDashboardWorkspace`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardContent` and rejects regaining the old inline guest insights/conflict/ops/workspace seam in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` held at 2542 lines in this batch, but the page owns one less top-level layout seam.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest dashboard behavior. No deploy was run.

## 2026-05-07 8:50 PM PT No-Deploy Guest Dashboard Ops View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its ops-mode page shell through `src/pages/dashboard/guests/GuestDashboardOpsView.tsx`.
  - That higher-level shell now owns the `DashboardLayout` composition seam for `GuestDashboardHeader` and `GuestDashboardContent`, while still rendering `GuestDashboardOverlays` from the page.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardOpsView` and rejects regaining the old inline guest ops-page shell in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` held at 2542 lines in this batch, but the page owns one less top-level route/layout seam.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest ops-mode behavior. No deploy was run.

## 2026-05-07 8:55 PM PT No-Deploy Guest Dashboard Route View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its loading branch, RSVP-settings branch, and ops-mode branch through `src/pages/dashboard/guests/GuestDashboardRouteView.tsx`.
  - That higher-level shell now owns the route/view selection seam for `DashboardLayout`, `DashboardStateBlock`, `GuestRsvpSettingsView`, and `GuestDashboardOpsView`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `GuestDashboardRouteView` and rejects regaining the old inline loading/RSVP/ops branch seam in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2542 lines to 2524 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest route behavior. No deploy was run.

## 2026-05-07 8:59 PM PT No-Deploy Guest Dashboard Overlay Route Consolidation
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` no longer mounts `GuestDashboardOverlays` directly; that overlay branch now routes through `src/pages/dashboard/guests/GuestDashboardRouteView.tsx`.
  - The route shell now owns the combined loading/RSVP/ops/overlay composition seam instead of the page hand-wiring overlays after the route branch.
  - `src/lib/dashboardDataBoundary.test.ts` continues to pin `GuestDashboardRouteView` and now also rejects regaining the old inline overlay mount in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2524 lines to 2522 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest overlay behavior. No deploy was run.

## 2026-05-07 9:03 PM PT No-Deploy Guest Dashboard Overlay Props Helper Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes its guest overlay prop bundle through `src/pages/dashboard/guests/buildGuestDashboardOverlayProps.ts`.
  - The page no longer carries the old long inline `GuestDashboardOverlays` prop assembly block even though the route shell still owns the actual overlay mount.
  - `src/lib/dashboardDataBoundary.test.ts` now pins the `buildGuestDashboardOverlayProps({` helper seam so the page does not quietly regrow the old inline overlay prop block.
  - `src/pages/dashboard/Guests.tsx` moved slightly from 2522 lines to 2523 lines in this batch; this was an ownership cleanup, not a size optimization.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestQueryBounds.test.ts`: PASS, 46/46.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the guest dashboard without changing guest overlay behavior. No deploy was run.

## 2026-05-07 9:09 PM PT No-Deploy Message Dashboard View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes its non-loading dashboard body through `src/pages/dashboard/messages/MessageDashboardView.tsx`.
  - That higher-level shell now owns the `DashboardLayout` composition seam for the page hero, planner banner, sending-details toggle, composer/saved-template grid, reach snapshot, starting points, history panel, detail modal, and toast stack.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `MessageDashboardView` and rejects regaining the old inline message dashboard card/modal/toast composition in `Messages.tsx`.
  - `src/pages/dashboard/Messages.tsx` dropped from 1755 lines to 1689 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the messages dashboard without changing message delivery behavior. No deploy was run.

## 2026-05-07 9:14 PM PT No-Deploy Message Dashboard Route View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes its loading-vs-live message dashboard branch through `src/pages/dashboard/messages/MessageDashboardRouteView.tsx`.
  - That higher-level route shell now owns the `DashboardLayout` plus `DashboardStateBlock` loading branch and hands the live branch through to `MessageDashboardView`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `MessageDashboardRouteView` and rejects regaining the old inline loading shell, dashboard cards, modal, and toast composition in `Messages.tsx`.
  - `src/pages/dashboard/Messages.tsx` dropped from 1689 lines to 1665 lines in this batch, while `src/pages/dashboard/messages/MessageDashboardRouteView.tsx` came in at 26 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the messages dashboard without changing message loading or delivery behavior. No deploy was run.

## 2026-05-07 8:59 PM PT No-Deploy Vault Dashboard Route View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Vault.tsx` now routes its loading-vs-live vault dashboard branch through `src/pages/dashboard/VaultDashboardRouteView.tsx`.
  - That higher-level route shell now owns the `DashboardLayout` plus `DashboardStateBlock` loading branch and hands the live branch through to the anniversary-vault dashboard body.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `VaultDashboardRouteView` and rejects regaining the old inline loading shell in `Vault.tsx`.
  - `src/pages/dashboard/Vault.tsx` dropped from 1629 lines to 1618 lines in this batch, while `src/pages/dashboard/VaultDashboardRouteView.tsx` came in at 22 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts`: PASS, 22/22.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the vault dashboard without changing vault loading or dashboard behavior. No deploy was run.

## 2026-05-07 9:02 PM PT No-Deploy Overview Dashboard Route View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Overview.tsx` now routes its layout, recoverable error state, and loading skeleton through `src/pages/dashboard/OverviewDashboardRouteView.tsx`.
  - That higher-level route shell now owns the `DashboardLayout` plus `DashboardStateBlock` shell and hands the live branch through to the overview dashboard body.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `OverviewDashboardRouteView` and rejects regaining the old inline overview layout and state shell in `Overview.tsx`.
  - `src/pages/dashboard/Overview.tsx` dropped from 1661 lines to 1644 lines in this batch, while `src/pages/dashboard/OverviewDashboardRouteView.tsx` came in at 36 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 30/30.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the overview dashboard without changing overview loading or dashboard behavior. No deploy was run.

## 2026-05-07 9:05 PM PT No-Deploy Settings Dashboard Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Settings.tsx` now routes its outer layout, hero stats, and settings navigation through `src/pages/dashboard/settings/SettingsDashboardShell.tsx`.
  - That higher-level shell now owns the `DashboardLayout`, `DashboardPageHero`, and `SettingsNavigation` chrome while the page stays focused on tab-specific panel state and handlers.
  - `src/pages/dashboard/settings/settingsSiteData.test.ts` now pins `SettingsDashboardShell` and rejects regaining the old inline settings layout, hero, and nav shell in `Settings.tsx`.
  - `src/pages/dashboard/Settings.tsx` dropped from 1313 lines to 1298 lines in this batch, while `src/pages/dashboard/settings/SettingsDashboardShell.tsx` came in at 49 lines.
- Proof passed:
  - `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS, 17/17.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the settings dashboard without changing settings behavior. No deploy was run.

## 2026-05-07 9:07 PM PT No-Deploy Itinerary Dashboard Route View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Itinerary.tsx` now routes its loading-vs-live itinerary dashboard branch through `src/pages/dashboard/ItineraryDashboardRouteView.tsx`.
  - That higher-level route shell now owns the `DashboardLayout` loading shell and hands the live branch through to the itinerary dashboard body.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `ItineraryDashboardRouteView` and rejects regaining the old inline itinerary layout shell in `Itinerary.tsx`.
  - `src/pages/dashboard/Itinerary.tsx` dropped from 1122 lines to 1109 lines in this batch, while `src/pages/dashboard/ItineraryDashboardRouteView.tsx` came in at 27 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 37/37.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the itinerary dashboard without changing itinerary loading or schedule behavior. No deploy was run.

## 2026-05-07 9:10 PM PT No-Deploy Planning Dashboard Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Planning.tsx` now routes its outer layout, hero stats, section selector, role selector, and planner/coordinator mode banners through `src/pages/dashboard/planning/PlanningDashboardShell.tsx`.
  - That higher-level shell now owns the `DashboardLayout`, `DashboardPageHero`, and planning page chrome while the page stays focused on tab-specific planning content and handlers.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `PlanningDashboardShell` and rejects regaining the old inline planning layout and hero shell in `Planning.tsx`.
  - `src/pages/dashboard/Planning.tsx` dropped from 992 lines to 930 lines in this batch, while `src/pages/dashboard/planning/PlanningDashboardShell.tsx` came in at 120 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/planning/planningService.test.ts`: PASS, 21/21.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and page-boundary cleanup in the planning dashboard without changing planning behavior. No deploy was run.

## 2026-05-07 9:13 PM PT No-Deploy Site View Route Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/SiteView.tsx` now routes its loading/privacy/error/readiness branch selection through `src/pages/SiteViewRouteView.tsx`.
  - That higher-level route shell now owns the loading spinner, coming-soon view, password gate, invite-only gate, error state, fallback-not-ready state, and live-content handoff.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` now pins `SiteViewRouteView` and rejects regaining the old inline loading/error copy in `SiteView.tsx`.
  - `src/pages/SiteView.tsx` dropped from 1055 lines to 1028 lines in this batch, while `src/pages/SiteViewRouteView.tsx` came in at 57 lines.
- Proof passed:
  - `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/pages/siteViewService.test.ts src/pages/SiteView.test.ts src/lib/publicSiteAccess.test.ts`: PASS, 15/15.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and public-surface route cleanup in `SiteView` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:17 PM PT No-Deploy Vault Contribution Route Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/VaultContribute.tsx` now routes its loading, invalid-link, vault-picker, success, error, and form branches through `src/pages/VaultContributeRouteView.tsx`.
  - That higher-level route shell now owns the guest-facing `step` ladder while the page stays focused on vault contribution state, uploads, and form handlers.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/VaultContribute.test.ts` now pin `VaultContributeRouteView` and reject regaining the old inline `if (step === ...)` ladder in `VaultContribute.tsx`.
  - `src/pages/VaultContribute.tsx` dropped from 1053 lines to 1023 lines in this batch, while `src/pages/VaultContributeRouteView.tsx` came in at 30 lines.
- Proof passed:
  - `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/pages/VaultContribute.test.ts`: PASS, 16/16.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and public-surface route cleanup in `VaultContribute` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:22 PM PT No-Deploy Event Hub Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventHub.tsx` now routes its missing-slug branch through `src/pages/EventHubRouteView.tsx` and its loading/offline/fallback retry notice through `src/pages/EventHubConfigStatusCard.tsx`.
  - Those higher-level components now own the top-level public guest hub route split plus the config-status notice slab while the page stays focused on guest-hub config state, actions, and opt-in handlers.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventHub.test.tsx` now pin `EventHubRouteView` plus `EventHubConfigStatusCard` and reject regaining the old inline missing-slug branch in `EventHub.tsx`.
  - `src/pages/EventHub.tsx` dropped from 545 lines to 524 lines in this batch, while `src/pages/EventHubRouteView.tsx` came in at 12 lines and `src/pages/EventHubConfigStatusCard.tsx` came in at 47 lines.
- Proof passed:
  - `npm test -- --run src/pages/EventHub.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts`: PASS, 19/19.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the oversized-file and public-surface route cleanup in `EventHub` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:26 PM PT No-Deploy Event Recap Route Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventRecap.tsx` now routes its recap loading state plus no-data error fallback through `src/pages/EventRecapRouteView.tsx`.
  - That higher-level route shell now owns the loading-vs-error-vs-content split while the page stays focused on recap data shaping, story export, sharing, and guest opt-in handlers.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRecap.test.tsx` now pin `EventRecapRouteView` and reject regaining the old inline loading/error blocks in `EventRecap.tsx`.
  - `src/pages/EventRecap.tsx` moved from 538 lines to 558 lines in this batch, while `src/pages/EventRecapRouteView.tsx` came in at 21 lines; the page got a little longer because the recap body was made explicitly route-safe instead of relying on eager `data!` assumptions.
- Proof passed:
  - `npm test -- --run src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts`: PASS, 18/18.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface route cleanup in `EventRecap` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:30 PM PT No-Deploy Event RSVP Route Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventRSVP.tsx` now routes its loading spinner plus invalid-link guest error shell through `src/pages/EventRsvpRouteView.tsx`.
  - That higher-level route shell now owns the loading-vs-error-vs-live split while the page keeps the event invitation workspace and RSVP modal editor local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRSVP.test.tsx` now pin `EventRsvpRouteView` so the event RSVP page keeps routing through the dedicated route shell.
  - `src/pages/EventRSVP.tsx` moved from 837 lines to 845 lines in this batch, while `src/pages/EventRsvpRouteView.tsx` came in at 21 lines; the page grew slightly because the live page shell is now named explicitly before the route handoff.
- Proof passed:
  - `npm test -- --run src/pages/EventRSVP.test.tsx src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 10/10.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface route cleanup in `EventRSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:35 PM PT No-Deploy RSVP Route Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its token-linked invitation loading state plus “Enter invitation code instead” fallback through `src/pages/RsvpRouteView.tsx`.
  - That higher-level route shell now owns the token-auto-loading vs live RSVP content split while the page keeps the invitation search, picked-guest lookup, household RSVP editing, and submit flow local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpRouteView` so the RSVP page keeps routing through the dedicated route shell.
  - `src/pages/RSVP.tsx` stayed effectively flat in this batch, while `src/pages/RsvpRouteView.tsx` came in at 13 lines; this was primarily a boundary cleanup rather than a file-size win.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface route cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:39 PM PT No-Deploy Photo Upload Status Panel Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/PhotoUpload.tsx` now routes its upload feedback slab through `src/pages/PhotoUploadStatusPanel.tsx`.
  - That shared guest-facing status panel now owns upload error copy, success copy, recap/back-to-hub CTAs, create-your-own CTA, and uploaded/failed filename summaries while the page keeps runtime gating, prospect opt-in, file capture, and submit flow local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/PhotoUpload.test.ts` now pin `PhotoUploadStatusPanel` so the photo upload page keeps routing through the dedicated feedback shell.
  - `src/pages/PhotoUpload.tsx` dropped from 392 lines to 342 lines in this batch, while `src/pages/PhotoUploadStatusPanel.tsx` came in at 55 lines.
- Proof passed:
  - `npm test -- --run src/pages/PhotoUpload.test.ts src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 9/9.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `PhotoUpload` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:42 PM PT No-Deploy Guest Contact Lookup Panel Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/GuestContactUpdate.tsx` now routes its guest contact search-and-match picker through `src/pages/GuestContactLookupPanel.tsx`.
  - That shared guest-facing lookup panel now owns the full-name search field, lookup CTA, matched-guest selector, and apply-to-household toggle while the page keeps gated lookup transport, demo fallback, mailing/contact fields, and submit flow local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/GuestContactUpdate.test.ts` now pin `GuestContactLookupPanel` so the guest contact update page keeps routing through the dedicated lookup shell.
  - `src/pages/GuestContactUpdate.tsx` dropped from 271 lines to 225 lines in this batch, while `src/pages/GuestContactLookupPanel.tsx` came in at 72 lines.
- Proof passed:
  - `npm test -- --run src/pages/GuestContactUpdate.test.ts src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 7/7.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `GuestContactUpdate` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:45 PM PT No-Deploy Guestbook Form Panel Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/GuestbookSubmit.tsx` now routes its guestbook form shell through `src/pages/GuestbookSubmitFormPanel.tsx`.
  - That shared guest-facing form panel now owns the optional guest name/email fields, note editor, honeypot field, safe status/error copy, submit CTA, and back-to-hub link while the page keeps runtime gating, invite-token capture, and submit transport local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/GuestbookSubmit.test.ts` now pin `GuestbookSubmitFormPanel` so the guestbook submit page keeps routing through the dedicated form shell.
  - `src/pages/GuestbookSubmit.tsx` dropped from 144 lines to 97 lines in this batch, while `src/pages/GuestbookSubmitFormPanel.tsx` came in at 74 lines.
- Proof passed:
  - `npm test -- --run src/pages/GuestbookSubmit.test.ts src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 8/8.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `GuestbookSubmit` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:50 PM PT No-Deploy Event Hub Live Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventHub.tsx` now routes its full guest hub live-content shell through `src/pages/EventHubLiveContent.tsx`.
  - That shared guest-facing live-content component now owns the hero, enabled action cards, travel guest path, save-link notice, hub-details board, and recap opt-in form while the page keeps slug normalization, config loading, access headers, tracking, and opt-in transport local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventHub.test.tsx` now pin `EventHubLiveContent` so the event hub page keeps routing through the dedicated live-content shell.
  - `src/pages/EventHub.tsx` dropped from 524 lines to 269 lines in this batch, while `src/pages/EventHubLiveContent.tsx` came in at 280 lines.
- Proof passed:
  - `npm test -- --run src/pages/EventHub.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts`: PASS, 19/19.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `EventHub` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 9:54 PM PT No-Deploy Event Recap Live Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventRecap.tsx` now routes its full recap live-content shell through `src/pages/EventRecapLiveContent.tsx`.
  - That shared guest-facing live-content component now owns the recap header, share CTA, stats strip, and nested route-view shell while the page keeps slug normalization, config loading, tracking, share/download helpers, and opt-in transport local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRecap.test.tsx` now pin `EventRecapLiveContent` so the event recap page keeps routing through the dedicated live-content shell.
  - `src/pages/EventRecap.tsx` dropped from 558 lines to 468 lines in this batch, while `src/pages/EventRecapLiveContent.tsx` came in at 94 lines.
- Proof passed:
  - `npm test -- --run src/pages/EventRecap.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts src/pages/guestHubPublicService.test.ts`: PASS, 18/18.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `EventRecap` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:03 PM PT No-Deploy Event RSVP Live Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/EventRSVP.tsx` now routes its full guest-facing live-content shell through `src/pages/EventRsvpLiveContent.tsx`.
  - That shared guest-facing live-content component now owns the invitation list shell, event metadata rows, RSVP badge state, empty-state card, and event RSVP CTA stack while the page keeps token lookup, continuity refresh behavior, modal RSVP editing, and session-backed submit transport local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/EventRSVP.test.tsx` now pin `EventRsvpLiveContent` so the event RSVP page keeps routing through the dedicated live-content shell.
  - `src/pages/EventRSVP.tsx` dropped from 845 lines to 730 lines in this batch, while `src/pages/EventRsvpLiveContent.tsx` came in at 172 lines.
- Proof passed:
  - `npm test -- --run src/pages/EventRSVP.test.tsx src/pages/rsvpFunctionService.test.ts src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 10/10.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `EventRSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:05 PM PT No-Deploy RSVP Search View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its large guest-facing search/hero entry slab through `src/pages/RsvpSearchView.tsx`.
  - That shared guest-facing search component now owns the public hero image shell, invitation search form, prediction list, helper guidance, and guest-safe search error slab while the page keeps token auto-load handling, private RSVP lookup, prediction state, and downstream pick/form/success logic local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpSearchView` so the main RSVP page keeps routing through the dedicated search shell.
  - `src/pages/RSVP.tsx` dropped from 1954 lines to 1831 lines in this batch, while `src/pages/RsvpSearchView.tsx` came in at 182 lines.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes token lookup, manual guest search, and guest-pick lookup follow-up through `src/pages/classifyRsvpLookupResponse.ts`.
  - That shared lookup classifier now owns the guest vs ambiguous vs not-found outcome split plus the default meal config, household guest list, playlist URL, RSVP question list, deadline, and session hydration that used to be repeated inline across multiple RSVP lookup paths.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `classifyRsvpLookupResponse(...)` and its explicit `guest` / `ambiguous` / `not_found` outcomes so the main RSVP page keeps routing lookup-result branching through the dedicated classifier.
  - `src/pages/RSVP.tsx` dropped from 1212 lines to 1208 lines in this batch, while `src/pages/classifyRsvpLookupResponse.ts` came in at 54 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:55 AM PT No-Deploy Vault Dashboard Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Vault.tsx` now routes anniversary reminder sends, vault creation, starter vault seeding, enable/disable toggles, vault edits, entry saves, entry deletes, and vault deletes through `src/pages/dashboard/useVaultDashboardActions.ts`.
  - That hook now owns the repeated owner vault transport, demo/live persistence, duplicate-anniversary guardrails, and success/error choreography while the page keeps the presentation, Google Drive state, release notices, and per-card interaction shell.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useVaultDashboardActions({ ... })` plus its `sendAnniversaryReminder(...)`, `createVaultConfig(...)`, `seedStarterVaultConfigs(...)`, `updateVaultEnabled(...)`, `updateVaultConfig(...)`, `createVaultEntry(...)`, `deleteVaultEntry(...)`, and `deleteVaultConfigWithEntryRollback(...)` contract.
  - `src/pages/dashboard/Vault.tsx` dropped from 1618 lines to 1387 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts`: PASS, 22/22.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:15 AM PT No-Deploy Settings Site/Team Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Settings.tsx` now routes planner invite save/remove, collaborator invite create/revoke/resend/copy, site slug updates, privacy saves, guest-link regeneration, identity export actions, default-language updates, translation generation, and music-playlist saves through `src/pages/dashboard/settings/useSettingsSiteAccessActions.ts`.
  - That hook now owns the repeated settings action transport, identity export copy/download flow, guest-link handling, collaborator invite lifecycle, translation/privacy persistence, and customer-safe success/error choreography while the page keeps account, RSVP, notification, billing, and template orchestration.
  - `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `useSettingsSiteAccessActions({ ... })` plus its collaborator-invite, slug/privacy, translation, and identity-export contract.
  - `src/pages/dashboard/Settings.tsx` dropped from 1298 lines to 1004 lines in this batch.
- Proof passed:
  - `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS, 17/17.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:22 AM PT No-Deploy Settings Experience Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Settings.tsx` now routes RSVP settings saves, notification preference saves, billing checkout launch, and template regeneration/switching through `src/pages/dashboard/settings/useSettingsExperienceActions.ts`.
  - That hook now owns the repeated RSVP validation/persistence flow, notification preference writes, checkout-session redirect choreography, template regeneration/remap path, and customer-safe success/error handling while the page keeps the settings shell and panel composition.
  - `src/pages/dashboard/settings/settingsSiteData.test.ts` and `src/lib/settingsErrorSafety.test.ts` now pin `useSettingsExperienceActions({ ... })` plus its RSVP, notification, billing, and template-change contract.
  - `src/pages/dashboard/Settings.tsx` dropped from 1004 lines to 883 lines in this batch.
- Proof passed:
  - `npm test -- --run src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts src/pages/dashboard/settings/settingsDashboardUtils.test.ts`: PASS, 17/17.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:28 AM PT No-Deploy Message Compose Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes draft saves, scheduled sends, immediate sends, demo delivery-state updates, and bulk-send follow-through through `src/pages/dashboard/messages/useMessageComposeActions.ts`.
  - That hook now owns the repeated recipient validation, message insert/update flow, demo/live send orchestration, send-now delivery transport, and customer-safe compose toast handling while the page keeps campaign presets, history, filters, and dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposeActions({ ... })` plus its `insertDashboardMessageMinimal(...)`, `updateDashboardMessage(...)`, and `triggerDashboardBulkSend(...)` contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 1333 lines to 1171 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 02:18 AM PT No-Deploy Overview Snapshot-State Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Overview.tsx` now routes demo overview state, site draft fallback shaping, persisted intelligence-dismissal hydration, name-change workspace snapshot mapping, and final overview stats assembly through `src/pages/dashboard/buildOverviewSnapshotState.ts`.
  - That helper now owns the remaining mixed snapshot/state shaping for demo stats, wedding-date fallback resolution, draft brief/refine-target fallback construction, name-change lifecycle snapshot assembly, and final overview stat composition while the page keeps the route shell, intelligence actions, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `buildOverviewSiteDraftState(site)`, `buildNameChangeOverviewSnapshotState(workspace)`, and `buildOverviewStatsFromSnapshot({ ... })`, and also checks that `src/pages/dashboard/buildOverviewSnapshotState.ts` exports `buildDemoOverviewSnapshotState()`, `buildOverviewSiteDraftState(site: { ... })`, `buildNameChangeOverviewSnapshotState(workspace: ...)`, and `buildOverviewStatsFromSnapshot({ ... })`.
  - `src/pages/dashboard/Overview.tsx` dropped from 1500 lines to 1372 lines in this batch, while `src/pages/dashboard/buildOverviewSnapshotState.ts` came in at 325 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 30/30.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 02:34 AM PT No-Deploy Overview Live-Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Overview.tsx` now routes the owner-facing overview dashboard body through `src/pages/dashboard/OverviewDashboardLiveContent.tsx`.
  - That component now owns the hero, setup progress, digest cards, archive and keepsake panels, name-change assistant surface, site-status card, analytics cards, proof-only panels, and interactive suggestion rendering while the page keeps loading, snapshot hydration, intelligence actions, and top-level state.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<OverviewDashboardLiveContent`, checks that `OverviewDashboardLiveContent.tsx` owns the calm hero and site card surface, and rejects regaining the inline `A calmer place to plan {coupleLabel}.` slab in `Overview.tsx`.
  - `src/pages/dashboard/Overview.tsx` dropped from 1372 lines to 319 lines in this batch, while `src/pages/dashboard/OverviewDashboardLiveContent.tsx` came in at 1168 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 30/30.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 02:40 AM PT No-Deploy Vault Live-Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Vault.tsx` now routes the owner-facing vault summary shell and list wrapper through `src/pages/dashboard/VaultDashboardLiveContent.tsx`.
  - That component now owns the anniversary-vault hero, media backup status panel, no-date warning, archive-mode note ideas, starter-vault empty state, add-another/maxed-out shell, and vault guidance footer while the page keeps loading, data hydration, card-level entry state, and the extracted vault action transport.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<VaultDashboardLiveContent`, checks that `VaultDashboardLiveContent.tsx` owns the `DashboardPageHero`, starter-vault CTA, and `How Vaults work` shell, and rejects regaining the old inline starter-vault slab in `Vault.tsx`.
  - `src/pages/dashboard/Vault.tsx` dropped from 1393 lines to 1262 lines in this batch, while `src/pages/dashboard/VaultDashboardLiveContent.tsx` came in at 196 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/vaultService.test.ts`: PASS, 22/22.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:00 AM PT No-Deploy Overview Intelligence Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Overview.tsx` now routes builder-field dirty marking, AI draft refresh from the saved brief, invisible-intelligence dismissal persistence, and interactive-suggestion hiding through `src/pages/dashboard/useOverviewIntelligenceActions.ts`.
  - That hook now owns the repeated overview intelligence transport, local-storage persistence, AI draft refresh orchestration, and success/error choreography while the page keeps the stats loading, planning signals, and overall dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useOverviewIntelligenceActions({ ... })` plus its `markOverviewBuilderFieldAsUserEdited(...)`, `loadOverviewDraftRefreshSeed(...)`, `updateOverviewDraftRefresh(...)`, `persistOverviewIntelligenceDismissals(...)`, and `hideInteractiveSuggestion(...)` contract.
  - `src/pages/dashboard/Overview.tsx` dropped from 1644 lines to 1577 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 30/30.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:07 AM PT No-Deploy Itinerary Timeline Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Itinerary.tsx` now routes event save/delete, bulk timeline shifts, undo, and smart-template creation through `src/pages/dashboard/useItineraryTimelineActions.ts`.
  - That hook now owns the repeated itinerary mutation transport, demo/live persistence, timeline-shift choreography, and success/error handling while the page keeps the schedule UI, guest picker flow, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useItineraryTimelineActions({ ... })` plus its `saveItineraryEvent(...)`, `deleteItineraryEvent(...)`, `persistItineraryTimeline(...)`, `resolveItinerarySiteId(...)`, and `createItineraryTemplateEvents(...)` contract.
  - `src/pages/dashboard/Itinerary.tsx` dropped from 1109 lines to 928 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 37/37.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:34 AM PT No-Deploy Message Composer Draft Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes composer template application, saved-template load/delete, reusable-template saves, save-the-date quick-create, and event/day-of presets through `src/pages/dashboard/messages/useMessageComposerDraftActions.ts`.
  - That hook now owns the repeated draft assembly, local saved-template persistence, demo/live save-the-date creation, and success/error toast choreography while the page keeps the message loading, audience math, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposerDraftActions({ ... })` plus its `createDashboardMessage(payload)`, `writeSavedComposerTemplates(updated)`, and save-the-date draft contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 1171 lines to 983 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:39 AM PT No-Deploy Message Composer History Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes edit/duplicate composer reloads plus thread follow-up and scheduled follow-up flows through `src/pages/dashboard/messages/useMessageComposerHistoryActions.ts`.
  - That hook now owns the repeated message-to-composer hydration, permission gating, follow-up preset selection, scheduled follow-up timing, and success/info toast choreography while the page keeps the delivery stats, filters, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageComposerHistoryActions({ ... })` plus its `toScheduleInputValue(message.scheduled_for)`, `applyComposerTemplate('rsvp-reminder', ...)`, and `formatScheduledMessageDateTime(scheduledIso)` contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 983 lines to 844 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:43 AM PT No-Deploy Message Dashboard Prefill Sync Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes URL template prefills, composer field prefills, text-credit checkout refresh handling, and query cleanup through `src/pages/dashboard/messages/useMessageDashboardPrefillSync.ts`.
  - That hook now owns the repeated route/session prefill parsing, checkout-status toast handling, post-refresh reload calls, and query-string cleanup while the page keeps the data loading, audience math, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardPrefillSync({ ... })` plus its requested-template detection, success toast, and `cleanedParams.delete('smsCredits')` contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 844 lines to 796 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:45 AM PT No-Deploy Message Dashboard Continuity Sync Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes focus refresh, RSVP continuity event refresh, cross-tab storage refresh, and visibility refresh through `src/pages/dashboard/messages/useMessageDashboardContinuitySync.ts`.
  - That hook now owns the repeated continuity event listener setup/teardown and guest/message refresh choreography while the page keeps the data loading, compose state, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardContinuitySync({ ... })` plus its focus listener, RSVP continuity event listener, and visibility-change contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 796 lines to 765 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 01:50 AM PT No-Deploy Message Dashboard Data Hook Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes active-site resolution, message history loading, guest loading, delivery loading, itinerary audience loading, and SMS credit preview loading through `src/pages/dashboard/messages/useMessageDashboardData.ts`.
  - That hook now owns the repeated demo/live fetch choreography, missing-table fallback handling, itinerary segment hydration, and customer-safe load error behavior while the page keeps the compose state, derived audience math, and high-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardData({ ... })` plus its `loadMessagesActiveSite(userId)`, `loadDashboardMessages(weddingSite.id)`, `loadMessageDeliveries(messageIds)`, `loadMessageItineraryAudience(weddingSite.id)`, and `loadSmsCreditPreview(weddingSite.id, cutoff)` contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 765 lines to 565 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.

## 2026-05-08 12:34 AM PT No-Deploy Guest Dashboard Campaign Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest invitation and reminder send lifecycle through `src/pages/dashboard/guests/useGuestDashboardCampaignActions.ts`.
  - That hook now owns single invite sends, selected reminder sends, filtered campaign sends, and due-reminder sends, including the repeated email transport, sent-timestamp persistence, campaign log, and post-send refresh choreography.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCampaignActions({ ... })` plus its `sendGuestInvitationEmail(...)`, `markGuestInvitationSentForSite(...)`, `markGuestInvitationAndReminderSentForSite(...)`, and `markGuestReminderSentForSite(...)` contract.
  - `src/pages/dashboard/Guests.tsx` dropped from 2523 lines to 2262 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues guest dashboard ownership cleanup without changing collaborator or guest-facing behavior. No deploy was run.

## 2026-05-08 12:42 AM PT No-Deploy Message Delivery Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes retry sends, send-now from scheduled, reschedule, cancel-schedule, and run-due-scheduled actions through `src/pages/dashboard/messages/useMessageDeliveryActions.ts`.
  - That hook now owns the repeated demo/live delivery transport, recipient recount, and history refresh choreography for message-history actions while the page keeps the compose flow and higher-level dashboard assembly.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDeliveryActions({ ... })` plus its `triggerDashboardBulkSend(...)` and `triggerScheduledMessageDispatch(10)` contract.
  - `src/pages/dashboard/Messages.tsx` dropped from 1665 lines to 1333 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues message dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 01:56 AM PT No-Deploy Message Dashboard View-Props Helper Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes its remaining route-view prop assembly through `src/pages/dashboard/messages/buildMessageDashboardViewProps.ts` instead of hand-owning the dashboard prop bundle inline.
  - That helper now owns the `composerProps`, `historyProps`, `reachSnapshotProps`, `savedTemplatesProps`, `sendingDetailsProps`, `startingPointsProps`, and `detailModalProps` composition for `MessageDashboardView`.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `buildMessageDashboardViewProps({ ... })` plus the helper-owned `detailModalProps`, `composerProps`, `historyProps`, and `reachSnapshotProps` seams.
  - `src/pages/dashboard/Messages.tsx` dropped from 565 lines to 530 lines in this batch while `src/pages/dashboard/messages/buildMessageDashboardViewProps.ts` came in at 256 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues message dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 02:01 AM PT No-Deploy Message Dashboard Derived-State Helper Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes its remaining reachability, credit, delivery, and history analytics derivation through `src/pages/dashboard/messages/buildMessageDashboardDerivedState.ts` instead of hand-owning that pure dashboard math inline.
  - That helper now owns recipient reachability counts, SMS credit math, email-cap math, filtered history, campaign thread selection, delivery health, retry/review candidate selection, and provider telemetry derivation for the messages dashboard.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `buildMessageDashboardDerivedState({ ... })` plus its `filterMessageHistory(...)`, `buildCampaignThreads(...)`, `getActiveCampaignThread(...)`, and `buildProviderTelemetry(...)` seams.
  - `src/pages/dashboard/Messages.tsx` dropped from 530 lines to 501 lines in this batch while `src/pages/dashboard/messages/buildMessageDashboardDerivedState.ts` came in at 148 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues message dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 02:05 AM PT No-Deploy Message Dashboard UI-State Hook Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes its remaining local state, persistence, and UI-state lifecycle glue through `src/pages/dashboard/messages/useMessageDashboardUiState.ts` instead of hand-owning that scaffolding inline.
  - That hook now owns saved-template bootstrapping, persisted role restore/save, toast state, composer/delivery modal state, history filter state, and sending-details URL bootstrap for the messages dashboard.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageDashboardUiState()` plus the hook-owned saved-template state, sending-details URL bootstrap, and persisted `readPlannerAccessRole(...)` / `writePlannerAccessRole(...)` seams.
  - `src/pages/dashboard/Messages.tsx` dropped from 501 lines to 478 lines in this batch while `src/pages/dashboard/messages/useMessageDashboardUiState.ts` came in at 147 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues message dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 02:08 AM PT No-Deploy Message Billing Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Messages.tsx` now routes the text-credit checkout flow through `src/pages/dashboard/messages/useMessageBillingActions.ts` instead of hand-owning that billing action inline.
  - That hook now owns provider-enabled gating, checkout session launch, billing audit logging, and customer-safe billing failure handling for SMS credit checkout.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useMessageBillingActions({ ... })` plus its `createSmsCreditsSession(...)`, `sms_credits_checkout_started`, and `safeMessagesError(...)` seams.
  - `src/pages/dashboard/Messages.tsx` dropped from 478 lines to 449 lines in this batch while `src/pages/dashboard/messages/useMessageBillingActions.ts` came in at 56 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts`: PASS, 24/24.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues message dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 02:13 AM PT No-Deploy Overview Dashboard Model Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Overview.tsx` now routes its readiness, digest, visibility, and analytics derivation through `src/pages/dashboard/buildOverviewDashboardModel.ts` instead of hand-owning that pure dashboard model logic inline.
  - That helper now owns publish-readiness modeling, launch-readiness scoring, invite analytics, invisible-intelligence filtering, calm-digest generation, site visibility/archive descriptors, and publish-state badge derivation.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `buildOverviewDashboardModel({ ... })` plus its `buildWebsiteInviteAnalyticsReadiness(...)`, `buildPublishReadinessItems(...)`, and `buildCalmOwnerDigest(...)` seams.
  - `src/pages/dashboard/Overview.tsx` dropped from 1577 lines to 1500 lines in this batch while `src/pages/dashboard/buildOverviewDashboardModel.ts` came in at 192 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/overviewQueryBounds.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/overviewUtils.test.ts src/pages/dashboard/overviewDate.test.ts`: PASS, 30/30.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues overview ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 12:49 AM PT No-Deploy Guest Photo Album Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/GuestPhotoSharing.tsx` now routes itinerary-album creation, moment-album creation, direct album creation, album activation/parenting/link regeneration, and upload-window saves through `src/pages/dashboard/guestPhotos/useGuestPhotoAlbumActions.ts`.
  - That hook now owns the repeated owner album transport, upload-link persistence, and success/error choreography for those album-management actions while the page keeps the broader moderation and review workflow.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `useGuestPhotoAlbumActions({ ... })` plus its `createGuestPhotoAlbum(...)`, `manageGuestPhotoAlbum({ action: 'regenerate_link' ... })`, and `manageGuestPhotoAlbum({ action: 'set_window' ... })` contract.
  - `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1917 lines to 1750 lines in this batch.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues guest photo dashboard ownership cleanup without changing collaborator behavior. No deploy was run.

## 2026-05-08 12:05 AM PT No-Deploy RSVP Guest-Lookup Transport Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes both manual invitation search lookup and picked-guest follow-up lookup through `src/pages/lookupRsvpGuest.ts`.
  - That shared helper now owns the demo `demoLookup(...)` path plus the live `callValidateRsvpToken({ action: 'lookup' ... })` and `callValidateRsvpToken({ action: 'lookup_guest' ... })` transport split while the page keeps result classification, guest hydration, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `lookupRsvpGuest(...)` so the main RSVP page keeps routing guest lookup transport through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1154 lines to 1162 lines in this batch, while `src/pages/lookupRsvpGuest.ts` came in at 36 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:09 AM PT No-Deploy RSVP Token-Lookup Transport Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes token invitation lookup through `src/pages/lookupRsvpToken.ts`.
  - That shared helper now owns the demo `demoLookup(token)` path plus the live `callValidateRsvpToken({ action: 'lookup', searchValue: token })` transport split while the page keeps token preflight, result classification, continuity refresh behavior, and guest hydration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `lookupRsvpToken(...)` so the main RSVP page keeps routing token lookup transport through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1162 lines to 1161 lines in this batch, while `src/pages/lookupRsvpToken.ts` came in at 23 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:15 AM PT No-Deploy RSVP Token-Lookup Lifecycle Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes token invitation lookup execution through `src/pages/runRsvpTokenLookup.ts`.
  - That shared helper now owns the token transport call, token result application via `applyTokenRsvpLookupResult(...)`, preserve-visible-state fallback, and token lookup finalization while the page keeps token preflight and continuity scheduling local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpTokenLookup(...)` so the main RSVP page keeps routing token lookup execution through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1161 lines to 1146 lines in this batch, while `src/pages/runRsvpTokenLookup.ts` came in at 113 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:20 AM PT No-Deploy RSVP Guest-Lookup Lifecycle Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes manual invitation search lookup and picked-guest follow-up lookup execution through `src/pages/runRsvpGuestLookup.ts`.
  - That shared helper now owns the guest lookup transport call, manual result application via `applyManualRsvpLookupResult(...)`, picked-guest fallback handling, and loading finalization while the page keeps lookup reset prep and guest selection state local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpGuestLookup(...)` so the main RSVP page keeps routing guest lookup execution through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1146 lines to 1128 lines in this batch, while `src/pages/runRsvpGuestLookup.ts` came in at 140 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:26 AM PT No-Deploy RSVP Submit Lifecycle Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes RSVP submit execution through `src/pages/runRsvpSubmit.ts`.
  - That shared helper now owns readiness validation, payload assembly handoff, demo submit persistence, live submit transport, submit-success routing, and submit finalization while the page keeps the submit trigger and route-level refs local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `runRsvpSubmit(...)` so the main RSVP page keeps routing submit execution through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1128 lines to 1048 lines in this batch, while `src/pages/runRsvpSubmit.ts` came in at 262 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-08 12:02 AM PT No-Deploy RSVP Resolved-Guest Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared resolved guest handoff through `src/pages/applyResolvedRsvpGuest.ts`.
  - That shared helper now owns token-session updates, normalized RSVP prep, selected household guest derivation, household-selection defaults, and `applyRsvpGuestSelection(...)` arg assembly while the page keeps lookup transport and higher-level route orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyResolvedRsvpGuest(...)` plus its token-session branch, selected-household derivation, and `applyRsvpGuestSelection(...)` handoff so the main RSVP page keeps routing through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1159 lines to 1154 lines in this batch, while `src/pages/applyResolvedRsvpGuest.ts` came in at 131 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:58 PM PT No-Deploy RSVP Manual-Lookup Result Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared manual-search and picked-guest follow-up lookup resolution branch through `src/pages/applyManualRsvpLookupResult.ts`.
  - That shared helper now owns guest/ambiguous/not-found branching, guest-safe error copy, classifier handoff, and picked-guest fallback behavior while the page keeps request transport and stale-request guards local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyManualRsvpLookupResult(...)` plus its fallback guest path, classifier handoff, ambiguous handoff, and guest-safe error contracts so the main RSVP page keeps routing through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1185 lines to 1159 lines in this batch, while `src/pages/applyManualRsvpLookupResult.ts` came in at 109 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:53 PM PT No-Deploy RSVP Token-Lookup Result Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared token-lookup guest/ambiguous/not-found resolution branch through `src/pages/applyTokenRsvpLookupResult.ts`.
  - That shared helper now owns the preserve-visible-state branch, token session toggles, guest handoff, ambiguous handoff, and guest-safe not-found handling while the page keeps the request transport and stale-request guard local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyTokenRsvpLookupResult(...)` plus its token/manual source contract, preserve-visible-state branch, and guest-safe not-found handling so the main RSVP page keeps routing through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1210 lines to 1185 lines in this batch, while `src/pages/applyTokenRsvpLookupResult.ts` came in at 113 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:49 PM PT No-Deploy RSVP Token-Lookup Preflight Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared token-lookup preflight and reset choreography through `src/pages/prepareRsvpTokenLookupState.ts`.
  - That shared helper now owns the empty-token reset branch plus the active token-lookup request preflight for request-id increments, continuity flags, token-session reset, search-state reset, and fresh lookup shell preparation while the page keeps the actual lookup resolution branching local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `prepareRsvpTokenLookupState(...)` plus its explicit `empty` / `lookup` outcomes and `searchValue: token` reset contract so the main RSVP page keeps routing through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1237 lines to 1210 lines in this batch, while `src/pages/prepareRsvpTokenLookupState.ts` came in at 182 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:39 PM PT No-Deploy RSVP Submit-Success-Args Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its repeated post-submit success arg assembly through `src/pages/buildRsvpSubmitSuccessArgs.ts`.
  - That shared helper now owns continuity ping wiring and `submitSource` derivation for both the demo submit-success path and the live submit-success path while the page keeps submit validation, transport, and success application local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpSubmitSuccessArgs(...)` plus its continuity-update and token-vs-manual submit-source contract so the main RSVP page keeps routing through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1242 lines to 1237 lines in this batch, while `src/pages/buildRsvpSubmitSuccessArgs.ts` came in at 63 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its full page-reset bundle through `src/pages/resetRsvpPageState.ts`.
  - That shared reset helper now owns the common loading, guest, RSVP session, ambiguous guest, deadline, playlist, question, meal, household, form, and search reset choreography used by both `resetToSearch(...)` and the empty-token branch in `loadInvitationForToken(...)`.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `resetRsvpPageState(...)` and its search-step/token-loading reset behavior so the main RSVP page keeps routing full-page resets through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1208 lines to 1205 lines in this batch, while `src/pages/resetRsvpPageState.ts` came in at 95 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared pre-submit guest-facing guardrails through `src/pages/validateRsvpSubmitReadiness.ts`.
  - That shared submit-readiness helper now owns deadline enforcement, invitation-session enforcement, event-selection guardrails, and household-share selection requirements that used to sit inline at the top of `handleSubmit(...)`.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `validateRsvpSubmitReadiness(...)` and its exact guest-facing error copy so the main RSVP page keeps routing pre-submit checks through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1205 lines to 1201 lines in this batch, while `src/pages/validateRsvpSubmitReadiness.ts` came in at 58 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared post-submit success choreography through `src/pages/applyRsvpSubmitSuccess.ts`.
  - That shared success helper now owns guest rehydration, household-selection normalization, continuity ping, and success-step routing for both demo and live submit success paths that used to be repeated inline in `handleSubmit(...)`.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyRsvpSubmitSuccess(...)` and its continuity/success handoff so the main RSVP page keeps routing post-submit success state through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1201 lines to 1232 lines in this batch, while `src/pages/applyRsvpSubmitSuccess.ts` came in at 72 lines, so this was an ownership cleanup rather than a size reduction.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared RSVP submit payload assembly through `src/pages/buildRsvpSubmitPayload.ts`.
  - That shared payload helper now owns target guest-id selection, notes/meal/plus-one normalization, child-count normalization, custom-answer normalization, and normalized existing-RSVP assembly that used to be hand-built inline in `handleSubmit(...)`.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpSubmitPayload(...)` and its target-guest / normalized-RSVP / plus-one-count assembly so the main RSVP page keeps routing submit-payload prep through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1232 lines to 1238 lines in this batch, while `src/pages/buildRsvpSubmitPayload.ts` came in at 66 lines, so this was an ownership cleanup rather than a size reduction.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared demo RSVP response write through `src/pages/applyDemoRsvpSubmit.ts`.
  - That shared demo-submit helper now owns demo storage readback, per-guest row mutation, and demo storage writeback that used to sit inline in the `USE_DEMO_RSVP` submit branch.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyDemoRsvpSubmit(...)` plus its demo storage read/write contract so the main RSVP page keeps routing demo submit persistence through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1238 lines to 1236 lines in this batch, while `src/pages/applyDemoRsvpSubmit.ts` came in at 15 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared live RSVP submit transport through `src/pages/submitRsvpResponse.ts`.
  - That shared submit-response helper now owns the `validate-rsvp-token` `submit` request plus the strict `{ success: true }` response check that used to sit inline in the live submit path.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `submitRsvpResponse(...)` plus its `action: 'submit'` / `submitSucceeded` transport contract so the main RSVP page keeps routing live submit transport through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1236 lines to 1234 lines in this batch, while `src/pages/submitRsvpResponse.ts` came in at 62 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its shared loaded-form restore flow through `src/pages/restoreLoadedRsvpState.ts`.
  - That shared restore helper now owns selected guest-id assembly, normalized RSVP rebuilding, household-selection normalization, token-linked-session restoration, and form-step reset that used to sit inline in `returnToLoadedRsvp(...)`.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `restoreLoadedRsvpState(...)` and its form-step / loaded-RSVP / token-linked-session handoff so the main RSVP page keeps routing loaded-state restore through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1234 lines to 1242 lines in this batch, while `src/pages/restoreLoadedRsvpState.ts` came in at 95 lines, so this was an ownership cleanup rather than a size reduction.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:08 PM PT No-Deploy RSVP Success View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its guest-facing confirmation/success slab through `src/pages/RsvpSuccessView.tsx`.
  - That shared guest-facing success component now owns the confirmation badge shell, RSVP summary drawer, inherited-household recap, confirmation copy, and done / submit-another CTA stack while the page keeps submit state, post-submit transitions, and reset/reload behavior local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpSuccessView` so the main RSVP page keeps routing through the dedicated success shell.
  - `src/pages/RSVP.tsx` dropped from 1831 lines to 1734 lines in this batch, while `src/pages/RsvpSuccessView.tsx` came in at 158 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:11 PM PT No-Deploy RSVP Guest Picker Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its ambiguous-guest picker slab through `src/pages/RsvpGuestPickerView.tsx`.
  - That shared guest-facing picker component now owns the multiple-match explanation copy, guest choice list, invite-access hint rows, and search-again CTA while the page keeps lookup state, guest selection handling, and downstream form flow local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpGuestPickerView` so the main RSVP page keeps routing through the dedicated picker shell.
  - `src/pages/RSVP.tsx` dropped from 1734 lines to 1695 lines in this batch, while `src/pages/RsvpGuestPickerView.tsx` came in at 79 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:14 PM PT No-Deploy RSVP Flow Shell Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its remaining non-search route/content branch shell through `src/pages/RsvpFlowView.tsx`.
  - That shared guest-facing flow component now owns the pick/form/success route composition while the page keeps state, lookup, submission, and the deeper form/content blocks local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpFlowView` so the main RSVP page keeps routing through the dedicated flow shell.
  - `src/pages/RSVP.tsx` stayed at 1695 lines in this batch, while `src/pages/RsvpFlowView.tsx` came in at 23 lines, so this was an ownership cleanup more than a size reduction.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:25 PM PT No-Deploy RSVP Form View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its giant live RSVP form/review card through `src/pages/RsvpFormView.tsx`.
  - That shared guest-facing form component now owns the deadline/status notices, progress rail, attendance/details/review steps, household inheritance controls, meal and custom-question inputs, error slab, and back/continue/submit CTA stack while the page keeps lookup state, submit orchestration, continuity refresh behavior, and route switching local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpFormView` so the main RSVP page keeps routing through the dedicated form shell.
  - `src/pages/RSVP.tsx` dropped from 1695 lines to 1283 lines in this batch, while `src/pages/RsvpFormView.tsx` came in at 529 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This materially reduces public-surface oversized-file risk in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:30 PM PT No-Deploy RSVP Live Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its live search-vs-flow guest surface through `src/pages/RsvpLiveContentView.tsx`.
  - That shared guest-facing content component now owns the top-level live handoff between `RsvpSearchView` and `RsvpFlowView`, plus the nested guest picker, form, and success shells, while the page keeps lookup state, token continuity behavior, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpLiveContentView` so the main RSVP page keeps routing through the dedicated live-content shell.
  - `src/pages/RSVP.tsx` dropped from 1283 lines to 1250 lines in this batch, while `src/pages/RsvpLiveContentView.tsx` came in at 208 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:34 PM PT No-Deploy RSVP Token Loading Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its token-autoload loading shell through `src/pages/RsvpTokenLoadingView.tsx`.
  - That shared guest-facing loading component now owns the loading spinner and “Enter invitation code instead” fallback while the page keeps token resolution state and reset behavior local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpTokenLoadingView` so the main RSVP page keeps routing through the dedicated token-loading shell.
  - `src/pages/RSVP.tsx` dropped from 1250 lines to 1237 lines in this batch, while `src/pages/RsvpTokenLoadingView.tsx` came in at 21 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:37 PM PT No-Deploy RSVP Live Content Prop Helper Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its large `RsvpLiveContentView` prop bundle through `src/pages/buildRsvpLiveContentViewProps.ts`.
  - That shared helper now owns the live-content prop assembly seam while the page keeps lookup state, continuity behavior, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpLiveContentViewProps(...)` so the main RSVP page keeps routing through the dedicated prop-assembly helper.
  - `src/pages/RSVP.tsx` moved from 1237 lines to 1240 lines in this batch, while `src/pages/buildRsvpLiveContentViewProps.ts` came in at 7 lines, so this was an ownership cleanup rather than a size reduction.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:40 PM PT No-Deploy RSVP Derived View State Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its derived guest-facing view state through `src/pages/buildRsvpDerivedViewState.ts`.
  - That shared helper now owns demo RSVP guest suggestions, active prediction id, invited event labels, allowed-children option sizing, and inherited household member derivation while the page keeps lookup state, continuity behavior, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpDerivedViewState(...)` so the main RSVP page keeps routing through the dedicated derived-state helper.
  - `src/pages/RSVP.tsx` dropped from 1240 lines to 1229 lines in this batch, while `src/pages/buildRsvpDerivedViewState.ts` came in at 72 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:43 PM PT No-Deploy RSVP Step Validation Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its step-advance validation rules through `src/pages/validateRsvpFormAdvance.ts`.
  - That shared helper now owns attendance/event-selection validation, meal-choice gating, and required custom-question checks while the page keeps form state, lookup state, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `validateRsvpFormAdvance(...)` so the main RSVP page keeps routing through the dedicated step-validation helper.
  - `src/pages/RSVP.tsx` dropped from 1229 lines to 1211 lines in this batch, while `src/pages/validateRsvpFormAdvance.ts` came in at 69 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:50 PM PT No-Deploy RSVP Page-View-Model Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes another layer of guest-facing page view state through `src/pages/buildRsvpPageViewModel.ts`.
  - That shared helper now owns guest display name derivation, deadline state, submit availability, meal-option membership, and the shared RSVP search/prediction ids while the page keeps lookup, form, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpPageViewModel(...)` so the main RSVP page keeps routing through the dedicated page-view-model helper.
  - `src/pages/RSVP.tsx` moved from 1211 lines to 1212 lines in this batch, while `src/pages/buildRsvpPageViewModel.ts` came in at 46 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:53 PM PT No-Deploy RSVP Live-Content Action Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes the guest-facing live-content action bundle through `src/pages/buildRsvpLiveContentActions.ts`.
  - That shared helper now owns back-navigation, loading cancellation, done routing, search-again reset, and submit-another reset while the page keeps lookup state, form state, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `buildRsvpLiveContentActions(...)` so the main RSVP page keeps routing through the dedicated live-content action helper.
  - `src/pages/RSVP.tsx` dropped from 1212 lines to 1204 lines in this batch, while `src/pages/buildRsvpLiveContentActions.ts` came in at 70 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 10:57 PM PT No-Deploy RSVP Page Route-View Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its top-level route/content composition through `src/pages/RsvpPageRouteView.tsx`.
  - That shared wrapper now owns the `RsvpRouteView` handoff, token-loading shell, and live-content mount while the page keeps state, validation, lookup logic, and live-content prop assembly local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `RsvpPageRouteView` and the named `liveContentProps` handoff so the main RSVP page keeps routing through the dedicated route wrapper.
  - `src/pages/RSVP.tsx` dropped from 1204 lines to 1194 lines in this batch, while `src/pages/RsvpPageRouteView.tsx` came in at 25 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:00 PM PT No-Deploy RSVP Lookup-Reset Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes its repeated manual lookup reset path through `src/pages/resetRsvpLookupFlow.ts`.
  - That shared helper now owns the pre-search and pre-guest-pick reset bundle for loading state, guest selection, RSVP state, form state, meal config, household state, and form step while the page keeps lookup branching, selection hydration, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `resetRsvpLookupFlow(...)` so the main RSVP page keeps routing repeated lookup resets through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1194 lines to 1200 lines in this batch, while `src/pages/resetRsvpLookupFlow.ts` came in at 93 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:04 PM PT No-Deploy RSVP Guest-Selection Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes the RSVP guest-selection state application block through `src/pages/applyRsvpGuestSelection.ts`.
  - That shared helper now owns guest/session assignment, RSVP hydration, household selection state, meal/question state, and form-route setup while the page keeps lookup branching, token/manual source choice, and submit orchestration local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyRsvpGuestSelection(...)` so the main RSVP page keeps routing guest-selection hydration through the dedicated helper.
  - `src/pages/RSVP.tsx` dropped from 1200 lines to 1197 lines in this batch, while `src/pages/applyRsvpGuestSelection.ts` came in at 113 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.

## 2026-05-07 11:07 PM PT No-Deploy RSVP Ambiguous-Lookup Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/RSVP.tsx` now routes the ambiguous guest-picker hydration branch through `src/pages/applyAmbiguousRsvpLookupState.ts`.
  - That shared helper now owns the repeated guest list, deadline, question, meal config, playlist, household, and selected-household hydration for multiple-match lookup results while the page keeps the actual lookup branching and guest-selection decisions local.
  - `src/lib/publicGuestSurfaceBoundary.test.ts` and `src/pages/RSVP.test.tsx` now pin `applyAmbiguousRsvpLookupState(...)` so the main RSVP page keeps routing repeated ambiguous-match hydration through the dedicated helper.
  - `src/pages/RSVP.tsx` moved from 1197 lines to 1212 lines in this batch, while `src/pages/applyAmbiguousRsvpLookupState.ts` came in at 49 lines.
- Proof passed:
  - `npm test -- --run src/pages/RSVP.test.tsx src/lib/publicGuestSurfaceBoundary.test.ts`: PASS, 113/113.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Status:
  - PARTIAL. This continues the public-surface cleanup in `RSVP` without changing guest-facing behavior. No deploy was run.
## 2026-05-08 02:44 AM PT No-Deploy Guest Photo Live-Content Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/GuestPhotoSharing.tsx` now routes the owner-facing photo dashboard body through `src/pages/dashboard/guestPhotos/GuestPhotoDashboardLiveContent.tsx`.
  - That component now owns the quick-start banner, hero, memory/vault cards, guest hub QR and recap controls, follow-up and guestbook surfaces, slideshow/review surfaces, album create card, and album controls/list shell while the page keeps loading, service orchestration, derived state, and the extracted album action transport.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<GuestPhotoDashboardLiveContent`, checks that `GuestPhotoDashboardLiveContent.tsx` owns the photo dashboard card surface, and rejects regaining the old inline hero/quick-start/album-list shell in `GuestPhotoSharing.tsx`.
  - `src/pages/dashboard/GuestPhotoSharing.tsx` dropped from 1750 lines to 1699 lines in this batch, while `src/pages/dashboard/guestPhotos/GuestPhotoDashboardLiveContent.tsx` came in at 123 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/dashboard/guestPhotoSharingUtils.test.ts src/pages/dashboard/guestPhotoQueryBounds.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 03:01 AM PT No-Deploy Itinerary Guest-Manager Modal Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Itinerary.tsx` now routes the event guest invitation modal through `src/pages/dashboard/EventGuestManagerModal.tsx`.
  - That component now owns guest snapshot loading, invitation toggles, bulk invite-all/remove-all flows, guest search filtering, and the confirmation modal while the page keeps the timeline hero, event form, schedule actions, and top-level route state.
  - `src/lib/dashboardDataBoundary.test.ts` now pins `<EventGuestManagerModal`, checks that `EventGuestManagerModal.tsx` owns the itinerary guest invitation service calls, and rejects regaining that event-guest transport block in `Itinerary.tsx`.
  - `src/pages/dashboard/Itinerary.tsx` dropped from 928 lines to 699 lines in this batch, while `src/pages/dashboard/EventGuestManagerModal.tsx` came in at 235 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/itineraryQueryBounds.test.ts src/pages/dashboard/itineraryService.test.ts src/pages/dashboard/itineraryEventDate.test.ts src/pages/dashboard/itineraryEventRsvpCounts.test.ts`: PASS, 37/37.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 03:36 AM PT No-Deploy Guest Dashboard Data-Hook Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard bootstrap and refresh lifecycle through `src/pages/dashboard/guests/useGuestDashboardData.ts`.
  - That hook now owns site-settings hydration, guest snapshot loading, itinerary filter hydration, RSVP audit-feed hydration, demo-mode RSVP/bootstrap state, and refresh wiring while the page keeps the guest ops actions, RSVP conflict handling, modal state, and owner-facing render composition.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardData({ ... })`, check that `useGuestDashboardData.ts` owns the guest dashboard site-settings/snapshot/itinerary/audit service calls, and reject regaining those direct load paths in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2262 lines to 2103 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardData.ts` came in at 258 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 03:44 AM PT No-Deploy Guest Dashboard Detail-Actions Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard household/detail/drawer mutation lane through `src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts`.
  - That hook now owns household merge/split/reassign flows, itinerary drawer loading, event-invite toggles, assisted RSVP save behavior, check-in toggle retry behavior, and the related drawer/modal state while the page keeps the broader guest ops summary, config, export, and import flows.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardGuestDetailActions({ ... })`, check that `useGuestDashboardGuestDetailActions.ts` owns the guest itinerary drawer, invite-toggle, assisted-RSVP, refresh-session, and household service calls, and reject regaining those direct paths in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 2103 lines to 1924 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts` came in at 289 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 03:52 AM PT No-Deploy Guest Dashboard CSV-Import Hook Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard CSV import parse/map/preview/import lifecycle through `src/pages/dashboard/guests/useGuestDashboardCsvImport.ts`.
  - That hook now owns parser state, mapper modal state, review state, import summary state, demo/live import transport, event invite and RSVP import hydration, and customer-safe review reset behavior while the page keeps guest ops, RSVP settings, export actions, and top-level dashboard composition.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCsvImport({ ... })`, check that `useGuestDashboardCsvImport.ts` owns the guest import parser/service choreography, and reject regaining direct import parsing or inserted-guest transport in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 1924 lines to 1685 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardCsvImport.ts` came in at 429 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 04:00 AM PT No-Deploy Guest Dashboard View-Props Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the owner-facing guest dashboard ops/settings prop-bundle assembly through `src/pages/dashboard/guests/buildGuestDashboardViewProps.ts`.
  - That helper now owns engagement, household/list, insight, conflict, ops-summary, workspace, header, ops-view, and RSVP-settings prop assembly while the page keeps state, mutations, exports, overlay composition, and route-level mode decisions.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `buildGuestDashboardViewProps({ ... })`, check that `buildGuestDashboardViewProps.ts` owns the guest dashboard prop-assembly seam, and reject regaining the old inline `guestEngagementProps` / `guestDashboardOpsViewProps` / `guestRsvpConfigViewProps` slabs in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 1685 lines to 1618 lines in this batch, while `src/pages/dashboard/guests/buildGuestDashboardViewProps.ts` came in at 248 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 04:17 AM PT No-Deploy Guest Dashboard CRUD-Actions Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard add/edit/delete and guest-form lifecycle through `src/pages/dashboard/guests/useGuestDashboardCrudActions.ts`.
  - That hook now owns guest creation, guest edit persistence, guest delete rollback, form reset, and edit-form hydration while the page keeps state, campaigns, exports, overlays, and route-level dashboard orchestration.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardCrudActions({ ... })`, check that `useGuestDashboardCrudActions.ts` owns the guest CRUD seam, and reject regaining the old inline CRUD handlers in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 1521 lines to 1301 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardCrudActions.ts` came in at 319 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 04:10 AM PT No-Deploy Guest Dashboard Follow-Up-Actions Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard saved-segment and follow-up task lifecycle through `src/pages/dashboard/guests/useGuestDashboardFollowUpActions.ts`.
  - That hook now owns segment-save, manual follow-up capture, and generated checklist task creation while the page keeps state, campaigns, exports, overlays, and route-level dashboard orchestration.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardFollowUpActions({ ... })`, check that `useGuestDashboardFollowUpActions.ts` owns the follow-up seam, and reject regaining the old inline follow-up handlers in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 1543 lines to 1521 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardFollowUpActions.ts` came in at 63 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
## 2026-05-08 04:05 AM PT No-Deploy Guest Dashboard Clipboard-Actions Extraction
- Continued from `BACKLOG.md` in a no-deploy batch.
- Fixed/proved:
  - `src/pages/dashboard/Guests.tsx` now routes the guest dashboard copy/download follow-up artifact actions through `src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts`.
  - That hook now owns RSVP follow-up summary copy, exception checklist copy, meal follow-up copy, missing-contact copy, filtered-email copy, checklist markdown copy, and campaign dry-run export while the page keeps state, campaigns, exports, overlays, and route-level dashboard orchestration.
  - `src/lib/dashboardDataBoundary.test.ts` and `src/pages/dashboard/guests/guestService.test.ts` now pin `useGuestDashboardClipboardActions({ ... })`, check that `useGuestDashboardClipboardActions.ts` owns the guest dashboard copy/download seam, and reject regaining the old inline copy handlers in `Guests.tsx`.
  - `src/pages/dashboard/Guests.tsx` dropped from 1618 lines to 1543 lines in this batch, while `src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts` came in at 145 lines.
- Proof passed:
  - `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/guests/guestService.test.ts`: PASS, 45/45.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `git diff --check`: PASS.
- Launch status did not change. This is local-only hardening and no deploy was run.
