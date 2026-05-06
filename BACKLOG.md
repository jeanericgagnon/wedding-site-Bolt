# Production Hardening Backlog

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
- Final Production Readiness Score: 8/10 based on local hardening progress plus green approved postdeploy proof for the current non-SMS launch surface, with remaining P1/P2 and secure service-role/model proof still open.
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
   Current evidence: RSVP lookup is token-only for guest session creation, `lookup_guest` requires an existing short-lived RSVP session, static regressions now prove no name/`ilike`/multi-match enumeration path remains, and `npm run smoke:rsvp` passed after approved network access. Source copy no longer tells guests to search by full name.

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
   Current evidence: major public route/subresource paths were moved toward the resolver contract; audit for any remaining direct public reads is still required.

8. `PARTIAL` - Audit service-role usage.
   Problem: service-role functions must not trust client-supplied IDs and must validate access server-side.
   Acceptance: every service-role function has authorization disposition plus tests/proof.
   Current evidence: service-role inventory/disposition doc and static guard exist. Messaging and photo/media mutation functions now use shared role-aware collaborator checks that block `viewer` mutations even with stale explicit permission rows. Live RLS/service-role proof remains open.

9. `PARTIAL` - Complete SSRF hardening.
   Problem: registry preview must block IPv6/private ranges, validate DNS strictly, and rate-limit strongly.
   Acceptance: hostile private/metadata/internal/redirect/oversize/timeout targets are rejected with safe errors.
   Current evidence: local IPv6/private AAAA, reserved/special IPv4 range blocking, redirect revalidation, size/type/timeout controls, and durable rate-limit hardening exist. `src/lib/registryPreviewUrlNormalizer.test.ts` now adds a local hostile URL matrix for localhost, `.local`, `.internal`, `.test`, metadata hosts, loopback/private/reserved IPv4 ranges including encoded decimal/hex/short forms, IPv6 loopback, IPv4-mapped IPv6, credentialed URLs, and non-HTTP schemes; `test:security` runs that proof. Full live hostile-target runtime matrix remains required.

10. `PARTIAL` - Email safety.
    Problem: email HTML must be escaped, URLs validated, and subjects sanitized.
    Acceptance: all email-producing paths use shared escaping/sanitization and tests cover hostile names/body/URLs/subjects.
    Current evidence: `send-wedding-email`, `process-email-queue`, and `send-bulk-message` now import shared Edge Function email safety helpers for HTML escaping, safe URLs, href escaping, and subject sanitization. `src/lib/emailSafety.test.ts` directly imports those shared Edge Function helpers and proves hostile HTML escaping, safe URL/href fallback and escaping, control-character subject sanitization, fallback subjects, and the subject length cap; `npm run test:security` runs that proof. Direct wedding emails, bulk/scheduled messages, and queued guest follow-ups now reject `viewer` collaborators even when a malformed explicit `messages`/`guests` permission exists. Focused static proof, planner-access tests, typecheck, quiet lint, build, and message smoke pass; live messaging authorization proof remains required.

11. `PARTIAL` - Validation must pass and be recorded.
   Required commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:smoke`, `npm run smoke:registry`, `npm run smoke:rsvp`, `npm run smoke:site`, `npm run guard:file-size`.
   Acceptance: every command passes or failure is fixed/documented in `docs/PRODUCTION_HARDENING_REPORT.md`.
   Current evidence: `docs/PRODUCTION_HARDENING_REPORT.md` exists and records the latest validation lane. CI hardpass now runs typecheck, quiet lint, file-size guard, asset guard, tests, build, registry smoke, CSV mapper smoke, check-in smoke, messages smoke, and strict RSVP when secrets are present. Local typecheck/lint/build/test/guard and non-RSVP smoke lanes pass; `smoke:rsvp` fails live with deployed 503 responses.

### P2 - Required Stability

12. `PARTIAL` - Break oversized files.
   Problem: `Guests.tsx` remains the primary oversized dashboard risk center; recently split legacy pages still need guardrails to prevent regression.
   Acceptance: complexity drops through feature slices without behavior regression; file-size guard baselines are lowered after splits.
   Current evidence: guest-facing `RSVP.tsx` is now below the oversized threshold with a 1961-line baseline. `Guests.tsx` now has service-boundary, snapshot-insights, toolbar, campaign-reminder, household-panel, list-panel, modal, itinerary-drawer, CSV-import-modal, RSVP-settings, RSVP-conflict-panel, list-status-control, dashboard-header, list-display-switcher, dashboard overlay, derived dashboard utility, conflict/reminder segment, CSV download utility, CSV import-preparation, RSVP config/export label utility, invitation payload utility, reminder campaign summary utility, reminder send batch utility, CSV import toast utility, guest form-mapping utility, assisted RSVP mapping utility, selection/campaign clipboard utility, dead-state cleanup, export/contact-link hook extraction, check-in/thank-you hook extraction, and status badge extraction and is below the oversized threshold with a 1939-line baseline. `Messages.tsx` now has service-boundary plus component extraction and is below the oversized threshold with a 1954-line baseline. `Settings.tsx` now has type/constant, service-boundary, navigation, account, notifications, and billing extraction and is below the oversized threshold with a 1963-line baseline. `GuestPhotoSharing.tsx` now has service-boundary plus component extraction and is below the oversized threshold with a 1979-line baseline. `Seating.tsx` now has service and component extraction and its baseline is down from 2370 to 1610. `CoordinatorMode.tsx` now has service and panel extraction and is below the oversized threshold with an 1867-line baseline. `NameChangePlannerTab.tsx` now has helper, intro, card, and account-update-template extraction and is below the oversized threshold with a 1953-line baseline. The name-change engine now has account-update template copy/readiness helpers extracted into `src/lib/nameChange/accountUpdateTemplateCopy.ts`, reducing `engine.ts` from 1738 to 1528 lines while preserving compatibility exports. The largest builder sidebar module now has preview-data, variant-metadata, static section-type preview, and variant swatch extraction; `BuilderSidebarLibrary.tsx` is down to an exact non-page guard baseline of 1003 lines, and the extracted `VariantPreviewSwatch.tsx` is guarded at 1574 lines. `MessageDashboardComponents.tsx` now has detail-modal extraction and is guarded as a non-page module at 1415 lines. Page-level oversized split work is now under the guard threshold; remaining P2 work should focus on keeping baselines strict and reducing oversized utility modules without behavior changes.

13. `PARTIAL` - Remove direct Supabase calls from pages.
    Problem: page components still own too much data access.
    Acceptance: sensitive reads/writes move into repository/service layers with explicit projections and testable contracts.
    Current evidence: many broad `select("*")` projections were replaced by explicit projections. Runtime page/section TSX now has a global regression guard against direct `supabase.from(...)` table access, runtime page/section TS/TSX has a global regression guard against `select('*')`, and those guards now include builder runtime screens/code. Independent strict scans are clean across `src/pages` and `src/sections`. The builder editor entry-site read now runs through `builderProjectService.loadEntrySite` with an explicit `BUILDER_ENTRY_SITE_SELECT` projection, and the boundary guard proves `BuilderPage.tsx` no longer imports Supabase or owns that read. Service-layer migration for remaining non-page modules and deeper architecture cleanup remains.

14. `PARTIAL` - Performance and query safety.
    Problem: overfetching, unscoped queries, and large dataset handling need full audit.
    Acceptance: no unsafe overfetching, queries are scoped, large guest/message/media datasets are paginated or bounded.
    Current evidence: explicit projection work reduced overfetching, and `npm run proof:v1:performance-budget` now runs in `test:launch` plus CI hardpass after production build so oversized route chunks cannot drift silently. Pagination/query-efficiency audit remains.

15. `PARTIAL` - Asset footprint.
   Problem: production build must not include unnecessary large assets.
   Acceptance: large proof/demo/template media are excluded from production deploy or moved to safer storage; asset budget checks exist.
   Current evidence: `npm run guard:assets` now budgets production-copied `public/` assets at the current footprint, is wired into `test:launch`, `proof:v1:test-lanes`, and CI hardpass, and fails on growth. The total public asset cap is now tightened to 210000 KiB and the per-file cap is tightened to 5000 KiB against the current 209433 KiB / 4788 KiB footprint. Existing template GIFs still need a CDN/object-storage or optimized-thumbnail strategy.

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
- Remaining: full service-role cross-table/storage integrity proof, live model-backed AI proof after server-side key configuration, remaining P1/P2 architecture/asset/test-lane cleanup, and GitHub push/commit synchronization.
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
- 2026-05-05 5:52 PM PT - No-deploy Guests and Guest Photo Sharing service-boundary closure:
  - Resolved in this batch: moved guest RSVP reads, guest add rollback, event invitation insert/replace/rollback, guest delete dependency cleanup, delete-all dependency cleanup, imported guest insert, household update, and imported RSVP replacement behind `src/pages/dashboard/guests/guestService.ts`.
  - Resolved in this batch: moved Guest Photo Sharing photo-bucket persistence behind `src/pages/dashboard/guestPhotoSharingService.ts`.
  - Data-boundary hardening: `rg -n "supabase\\.from\\(" src/pages/dashboard -g "*.tsx"` now returns no matches, so dashboard TSX pages no longer own direct table access through `supabase.from(...)`.
  - Maintainability hardening: lowered file-size baselines for `Guests.tsx` from 4790 to 4693 lines and `GuestPhotoSharing.tsx` from 3188 to 3168 lines.
  - No feature loss: guest load/RSVP merge, add/edit/delete, event invitation rollback, delete-all cleanup, CSV import, household grouping, imported RSVP rows, guest photo bucket saves, and AI draft photo-bucket merge behavior are preserved through service helpers.
  - Proof added/updated: `guestService.test.ts` covers explicit RSVP projection and event-invitation row construction; `guestPhotoSharingService.test.ts` covers photo-bucket merge preservation; `dashboardDataBoundary.test.ts` guards these paths and the no-direct-dashboard-table-access scan.
  - Validation passed: `npm test -- src/pages/dashboard/guests/guestService.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (18/18; first sandbox run hit Vite `.vite-temp` EPERM and passed after approved `npm test` rerun), `npm run typecheck`, `npm run lint`, `npm run guard:file-size`, `npm run build`, and the direct dashboard TSX `supabase.from` scan. `npm run lint` passed with the existing warning backlog (553 warnings, 0 errors).
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing guest or photo behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:02 PM PT - No-deploy public interactive, onboarding, and signup service-boundary batch:
  - Resolved in this batch: moved public interactive section reads/writes for polls, quizzes, open prompts, and music requests behind `src/sections/interactiveSectionService.ts`.
  - Resolved in this batch: moved main onboarding existing-site reads, event-seed sync, onboarding site update, wedding-site create/fallback create, guided CSV guest upsert, and signup minimal-site reservation behind `src/pages/onboarding/onboardingService.ts` and `src/pages/signupService.ts`.
  - Data-boundary hardening: the touched public section components, `Onboarding.tsx`, and `Signup.tsx` no longer own direct table access through `supabase.from(...)`; `GuidedSetup.tsx` no longer owns direct guest import upsert table access.
  - No feature loss: public interactive sync/submits, local guest cooldown behavior, song-request submits, onboarding draft/profile persistence, event seed sync with drift fallback, guided CSV guest create/update, and signup minimal-site reservation preserve current behavior through the services.
  - Proof added/updated: `interactiveSectionService.test.ts` covers minimal public insert row builders and source-boundary guards; `onboardingService.test.ts` covers wedding-data seed merge, signup slug normalization, and source-boundary guards.
  - Validation passed: `npm test -- src/sections/interactiveSectionService.test.ts src/pages/onboarding/onboardingService.test.ts` (6/6), `npm run typecheck -- --pretty false` after tightening `OnboardingEventSeed.event_name`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and `rg -n "supabase\\.from\\("` against the touched public/onboarding/signup files.
  - Launch status: unchanged. This reduces local P1/P2 direct-Supabase/page-coupling risk without changing public interactive, onboarding, guided import, or signup behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:06 PM PT - No-deploy PaymentRequired site-creation service boundary and stricter scan finding:
  - Resolved in this batch: moved the `PaymentRequired.tsx` fallback wedding-site creation path behind `src/pages/paymentRequiredService.ts`.
  - Data-boundary hardening: payment checkout orchestration no longer imports Supabase or inserts `wedding_sites` directly; the service owns the explicit `id` projection and collision retry behavior.
  - No feature loss: existing-site reuse, fallback slug generation, six-attempt collision retry, payment checkout setup, and safe payment error behavior are preserved.
  - New active finding: the previous single-line dashboard `supabase.from(...)` scan was incomplete. A stricter multiline scan confirms the touched files are clean, but remaining direct page-owned Supabase calls still exist in areas such as `PaymentRequired` before this fix, `AcceptCollaboratorInvite`, `QuickStart`, `GuidedSetup` site reads/updates, `Itinerary`, `Messages`, `Settings`, `Overview`, `RsvpBoard`, `AuditLogs`, `ErrorLogs`, and some `GuestPhotoSharing` photo/admin flows. Keep this P1/P2 data-boundary lane active; do not mark direct-page-access cleanup done until a multiline/static guard can pass or the remaining exceptions are explicitly classified.
  - Proof added/updated: `paymentRequiredService.test.ts` covers payment slug normalization and the source-boundary guard for the payment-required page.
  - Validation passed: `npm test -- src/pages/paymentRequiredService.test.ts src/sections/interactiveSectionService.test.ts src/pages/onboarding/onboardingService.test.ts` (8/8), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces paid-launch payment/setup coupling risk and records the stricter direct-access finding honestly. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:12 PM PT - No-deploy guided setup, quick start, and collaborator invite service-boundary continuation:
  - Resolved in this batch: moved guided setup site hydration and progress/complete site updates behind `src/pages/onboarding/onboardingService.ts`.
  - Resolved in this batch: moved quick-start seed-site load, final persist-site load, and final wedding-site update behind `src/pages/onboarding/onboardingService.ts`.
  - Resolved in this batch: moved collaborator invite token lookup and invite site-label lookup behind `src/pages/acceptCollaboratorInviteService.ts`.
  - Data-boundary hardening: `GuidedSetup.tsx` and `QuickStart.tsx` no longer own direct `wedding_sites` table reads/writes for these first-run paths; `AcceptCollaboratorInvite.tsx` no longer owns direct invite/site lookup reads. Auth/session and RPC calls remain in the pages where the UI flow needs them.
  - No feature loss: guided hydration, guided progress save, guided completion, quick-start seed restore, AI draft finalization, builder-project patch persistence, invite validation state, invite email prefill, invite site labels, and invite claim flow are preserved.
  - Proof added/updated: `onboardingService.test.ts` now guards guided/quick-start service usage and projections; `acceptCollaboratorInviteService.test.ts` covers minimal invite/site projections and the page boundary.
  - Validation passed: `npm test -- src/pages/acceptCollaboratorInviteService.test.ts src/pages/onboarding/onboardingService.test.ts src/pages/paymentRequiredService.test.ts src/sections/interactiveSectionService.test.ts` (10/10), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces first-run and collaborator-invite data-boundary risk without changing setup or invite behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:18 PM PT - No-deploy Settings owner data-boundary service extraction:
  - Resolved in this batch: moved settings collaborator invite list/create/revoke, translation status reads, slug collision lookup, template-change site read, account couple-name update, slug update, and template-change update behind `src/pages/dashboard/settings/settingsSiteData.ts`.
  - Data-boundary hardening: `Settings.tsx` now has no direct `supabase.from(...)` table access under the stricter multiline scan; only auth calls remain in the page for password verification/update.
  - Maintainability hardening: lowered the file-size guard baseline for `Settings.tsx` from 2328 to 2287 lines.
  - No feature loss: account save, password update, team invite creation/revocation/copy, translation status display, privacy/token/RSVP/notification/music saves, slug collision checks, and template change with generated content preservation are preserved.
  - Proof added/updated: `settingsSiteData.test.ts` covers explicit privacy/team/template/translation projections and guards `Settings.tsx` against reintroducing direct settings table access.
  - Validation passed: `npm test -- src/pages/dashboard/settings/settingsSiteData.test.ts src/pages/acceptCollaboratorInviteService.test.ts src/pages/onboarding/onboardingService.test.ts` (7/7), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `Settings.tsx`.
  - Launch status: unchanged. This reduces P0/P1 settings privacy/team data-boundary risk without changing settings behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:26 PM PT - No-deploy Messages live data service extraction:
  - Resolved in this batch: moved Messages dashboard active-site/site load, message history reads, guest recipient reads, delivery telemetry reads, itinerary audience reads, text-credit preview reads, message create/update/reschedule/retry state writes, and analytics patch writes behind `src/pages/dashboard/messages/messageService.ts`.
  - Data-boundary hardening: `Messages.tsx` now has no direct `supabase.from(...)` table access under the stricter multiline scan; auth/session calls remain in the page for invoking the bulk-message Edge Function.
  - Maintainability hardening: lowered the file-size guard baseline for `Messages.tsx` from 3386 to 3263 lines.
  - No feature loss: live/demo message loading, recipient lists, delivery table fallback, itinerary-segment audiences, SMS credit preview, draft/update/send-now/schedule/retry/reschedule/cancel flows, save-the-date quick create, and bulk-send invocation behavior are preserved through the service boundary.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now requires the Messages page to use the service loaders/writers and guards against reintroducing multiline page-owned `supabase.from(...)` calls.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (15/15), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:messages`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This reduces P1/P2 messaging data-boundary risk without changing messaging behavior. Live messaging authorization proof remains required. No deploy was run.
- 2026-05-05 6:30 PM PT - No-deploy RSVP Board service-boundary extraction:
  - Resolved in this batch: moved RSVP Board active-site resolution, guest RSVP board reads, itinerary event lookup, and event-invitation mapping behind `src/pages/dashboard/rsvpBoardService.ts`.
  - Data-boundary hardening: `RsvpBoard.tsx` no longer imports Supabase or active-site helpers directly and has no direct `supabase.from(...)` table access under the stricter multiline scan.
  - No feature loss: demo rows, live board load, 15-second refresh, manual follow-up/unreachable stats, event-invite badges, invitation progress counts, filters, and dashboard links are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now requires RSVP Board to use the service boundary and explicit guest/event/invitation projections.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/rsvpBoardFilter.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `RsvpBoard.tsx`.
  - Launch status: unchanged. This reduces P1/P2 RSVP dashboard data-boundary risk without changing RSVP Board behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:38 PM PT - No-deploy onboarding status, audit log, and error log service-boundary extraction:
  - Resolved in this batch: moved Wedding Status planning-state updates behind `src/pages/onboarding/onboardingService.ts`.
  - Resolved in this batch: moved dashboard activity-history site resolution, guest audit log reads, guest-name lookup, and app action log loading behind `src/pages/dashboard/auditLogService.ts`.
  - Resolved in this batch: moved admin-user verification and app error log reads behind `src/pages/dashboard/errorLogService.ts`.
  - Data-boundary hardening: `WeddingStatus.tsx`, `AuditLogs.tsx`, and `ErrorLogs.tsx` no longer own direct `supabase.from(...)` table access under the stricter multiline scan.
  - No feature loss: wedding status validation/navigation, venue/date/guest-count persistence, activity-history filtering/search, app-action rows, admin-only error log checks, error-log grouping, filtering, paging, copy, and CSV export behavior are preserved.
  - Proof added/updated: `onboardingService.test.ts` and `dashboardDataBoundary.test.ts` now guard the extracted service boundaries and explicit audit/error projections.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/onboarding/onboardingService.test.ts src/pages/dashboard/rsvpBoardFilter.test.ts` (22/22), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for the touched pages.
  - Launch status: unchanged. This reduces P1/P2 onboarding/admin log data-boundary risk without changing user-facing behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:41 PM PT - No-deploy Vault Contribution config service-boundary extraction:
  - Resolved in this batch: moved public vault contribution enabled-config reads behind `src/pages/vaultContributionService.ts`.
  - Data-boundary hardening: `VaultContribute.tsx` no longer owns direct `vault_configs` table reads under the stricter multiline scan; it still invokes Supabase Edge Functions for vault upload/submit behavior.
  - No feature loss: gated public-site access checks, demo vault fallback, year-specific vault links, vault hub config listing, enabled-config filtering, upload/submit function invocation, and guest-facing invalid-state behavior are preserved.
  - Proof added/updated: `VaultContribute.test.ts` now guards the vault contribution service boundary and explicit config projection.
  - Validation passed: `npm test -- --run src/pages/VaultContribute.test.ts src/lib/dashboardDataBoundary.test.ts src/pages/onboarding/onboardingService.test.ts` (34/34), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `VaultContribute.tsx`.
  - Launch status: unchanged. This reduces guest-facing vault data-boundary risk without changing vault contribution behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:49 PM PT - No-deploy Overview live data service-boundary extraction:
  - Resolved in this batch: moved Overview active-site/site load, guest RSVP summary reads, registry/photo/vault counts, interactive suggestion/vote reads, builder user-edited marker persistence, and draft-from-brief site update behind `src/pages/dashboard/overviewService.ts`.
  - Data-boundary hardening: `Overview.tsx` no longer imports Supabase or active-site helpers directly and has no direct `supabase.from(...)` table access under the stricter multiline scan.
  - No feature loss: demo overview state, live stats, persisted intelligence dismissals, interactive suggestion hiding/loading, draft brief refresh, builder user-edited markers, name-change overview, launch-readiness cards, and public-site preview links are preserved through the service boundary.
  - Proof added/updated: `overviewService.test.ts` now covers builder user-edited JSON preservation; `dashboardDataBoundary.test.ts` now guards Overview service usage and explicit projections.
  - Validation passed: `npm test -- --run src/pages/dashboard/overviewService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `Overview.tsx`.
  - Launch status: unchanged. This reduces P1/P2 dashboard overview data-boundary risk without changing Overview behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 6:53 PM PT - No-deploy Registry dashboard site/policy service-boundary extraction:
  - Resolved in this batch: moved Registry dashboard active-site/site refresh-policy load, refresh budget persistence, refresh policy save, monthly counter reset, and auto-reset persistence behind `src/pages/dashboard/registry/registryService.ts`.
  - Data-boundary hardening: `Registry.tsx` no longer imports Supabase or active-site helpers directly and has no direct `supabase.from(...)` table access under the stricter multiline scan.
  - No feature loss: demo registry items, live registry item loading, gift add/edit/delete, URL preview import, auto refresh, monthly refresh budgeting, policy presets, manual counter reset, and owner action audit calls are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards the Registry page service boundary and explicit site projection.
  - Validation passed: `npm test -- --run src/pages/dashboard/registry/registryService.test.ts src/lib/dashboardDataBoundary.test.ts` (37/37), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:registry`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `Registry.tsx`.
  - Launch status: unchanged. This reduces P1/P2 registry dashboard data-boundary risk without changing registry behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 7:01 PM PT - No-deploy Itinerary schedule and event-invite service-boundary extraction:
  - Resolved in this batch: moved Itinerary active-site/site lookup, event loads, schedule mirror writes to `wedding_data` and `sections`, RSVP invitation/count reads, event create/update/delete, timeline shifts, smart-template inserts, guest picker reads, event-invite toggles, invite-all, and remove-all invitation writes behind `src/pages/dashboard/itineraryService.ts`.
  - Data-boundary hardening: `Itinerary.tsx` no longer imports active-site helpers and has no direct `supabase.from(...)` table access under the stricter multiline scan. It still uses Supabase only as the existing client for the `photo-album-create` Edge Function invoke.
  - No feature loss: demo timeline, live event loading/counts, optional `event_rsvps` table fallback, schedule-section mirroring, event form drift fallback, best-effort photo album creation, timeline shift/undo, smart template creation, event guest picker, invitation removal RSVP rollback, invite-all/remove-all, and toasts are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards Itinerary service usage and explicit event/guest/invitation projections.
  - Validation passed: `npm test -- --run src/pages/dashboard/itineraryService.test.ts src/lib/dashboardDataBoundary.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `Itinerary.tsx`.
  - Additional proof: `npm run smoke:site` failed once in sandbox with `getaddrinfo ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`, then passed after approved network access.
  - Launch status: unchanged. This reduces P1/P2 itinerary data-boundary risk without changing itinerary behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 7:09 PM PT - No-deploy Guest Photo Sharing service-boundary extraction:
  - Resolved in this batch: moved Guest Photo Sharing active-site/site load, event/album/upload reads, guestbook/prospect reads, photo AI analysis/metadata/correction reads, guest hub settings reads, AI photo ops persistence, photo bucket moves, AI correction inserts, guest hub settings save, and guestbook moderation behind `src/pages/dashboard/guestPhotoSharingService.ts`.
  - Data-boundary hardening: `GuestPhotoSharing.tsx` has no direct `supabase.from(...)` table access under the stricter multiline scan. Auth/session calls and Supabase Edge Function invokes remain in the page for existing photo upload, album, analysis, follow-up, and moderation flows.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped from 3168 to 3049 lines and remains within the lowered file-size guard baseline.
  - No feature loss: demo photo space, live photo dashboard load, bucket links, upload windows, photo AI ops planning, high-confidence photo moves, vision suggestions/corrections, guest hub settings, guest follow-up queueing, guestbook moderation, exports, and existing Edge Function flows are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards Guest Photo Sharing service usage, explicit projections, and absence of page-owned table access.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (18/18), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict multiline direct-access scan for `GuestPhotoSharing.tsx`.
  - Remaining direct page-owned table access under the stricter scan is now concentrated in `src/pages/dashboard/Guests.tsx`; continue that P1/P2 data-boundary lane next.
  - Launch status: unchanged. This reduces P1/P2 guest photo dashboard data-boundary risk without changing guest photo behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 7:18 PM PT - No-deploy Guests dashboard load/config service-boundary extraction:
  - Resolved in this batch: moved Guests dashboard active-site/site settings load, guest list + RSVP summary reads, RSVP conflict reads/history reads, itinerary filter event reads, event-invite filter mapping, RSVP audit feed reads, RSVP conflict resolve actions, RSVP config save, and fallback site-id resolution behind `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` no longer owns the main guest list projection, RSVP conflict dashboard projections, itinerary filter projections, RSVP config save, or active-site resolution. The service now explicitly selects `reminder_cadence_days` and `auto_reminders_enabled`, fixing the stale projection mismatch where the page read those fields without selecting them.
  - Maintainability hardening: `Guests.tsx` dropped from 4693 to 4576 lines and remains within the file-size guard baseline.
  - No feature loss: demo/live site settings load, RSVP custom questions, meal config, auto reminder flags, guest list loading with RSVP rows, conflict cards/history, itinerary filtering, RSVP audit feed, conflict resolve, CSV mapper site-id fallback, and RSVP config autosave are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards the extracted Guests service boundary and explicit site/guest/RSVP/conflict/itinerary/audit projections.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run smoke:csvmapper`, `npm run build`, `git diff --check`.
  - Remaining work: `Guests.tsx` still contains direct table access for guest field updates, check-in/thank-you/manual follow-up updates, RSVP reminder settings, guest drawer event invite toggles/audit details, assisted RSVP, and SMS RSVP link slug lookup. Continue extracting those in the next Guests batch.
  - Launch status: unchanged. This reduces P1/P2 guest dashboard data-boundary risk without changing guest-management behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 7:22 PM PT - No-deploy Guests dashboard guest-write service-boundary extraction:
  - Resolved in this batch: moved guest check-in undo/toggle, clear-all check-ins, thank-you toggle/bulk thank-you, invitation/reminder timestamp writes, household merge/split/reassign writes, RSVP reminder settings save, and contact/SMS share-link slug reads out of `Guests.tsx`.
  - Data-boundary hardening: `Guests.tsx` now uses scoped service helpers for those writes and uses the already-loaded `weddingSiteInfo` slug for guest update/SMS RSVP share links instead of re-reading `wedding_sites` from the page.
  - Maintainability hardening: `Guests.tsx` dropped again from 4576 to 4506 lines and remains within the file-size guard baseline.
  - No feature loss: check-in undo/toggle/session-refresh retry, thank-you workflows, bulk due thank-yous, clear-all check-ins, invite/reminder timestamp persistence, household tools, reminder settings autosave, guest update link copy, and text RSVP link copy are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards the new service helper usage and prevents reintroducing the extracted guest-update/wedding-site-link patterns.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`.
  - Remaining work: `Guests.tsx` still contains direct table access for guest drawer event/audit details, event invite toggle/delete/insert, and assisted RSVP save/rollback. Continue extracting those next.
  - Launch status: unchanged. This reduces P1/P2 guest dashboard write-boundary risk without changing guest-management behavior. Live RSVP/public proof blockers remain. No deploy was run.
- 2026-05-05 7:31 PM PT - No-deploy Guests drawer/event/assisted-RSVP service-boundary extraction:
  - Resolved in this batch: moved guest drawer event/audit detail reads, event invite toggle insert/delete with RSVP rollback snapshots, and assisted RSVP save/rollback behind `src/pages/dashboard/guests/guestService.ts`.
  - Data-boundary hardening: `Guests.tsx` now has no direct `supabase.from(...)` table access under the stricter multiline scan. Remaining Supabase usage in the page is for auth/session and Edge Function invocations that preserve existing flows.
  - Maintainability hardening: lowered the file-size guard baseline for `Guests.tsx` from 4693 to 4418 lines so this reduction cannot quietly regress.
  - No feature loss: demo/live itinerary drawer details, event invitation toggles, RSVP snapshot restore on failed invite removal, assisted RSVP recording, assisted RSVP rollback, and RSVP/CSV/check-in proof lanes are preserved.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now guards the drawer/event/assisted RSVP service helpers, explicit projections, and absence of page-owned table access in `Guests.tsx`.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, and strict direct-access scan for `Guests.tsx`.
  - Additional proof: `npm run smoke:rsvp` failed once in sandbox with `getaddrinfo ENOTFOUND atuzuobpprjstfmdnwso.supabase.co`, then passed after approved network access. `npm run proof:v1:guests-rsvp-ops` also failed once in sandbox for the same DNS reason, then passed after approved network access with RSVP strict smoke, CSV mapper guard, and check-in guard green.
  - Launch status: unchanged. This closes the known `Guests.tsx` page-owned table-access lane locally, but live RSVP/public proof blockers remain until deploy/postdeploy proof is explicitly run. No deploy was run.
- 2026-05-05 7:36 PM PT - No-deploy external blank-target link isolation hardening:
  - Resolved in this batch: normalized remaining `target="_blank"` links that used only `rel="noreferrer"` to explicit `rel="noopener noreferrer"` across vendor profile creation, vendor profile links, dashboard registry contribution links, public registry contribution links, dashboard layout external links, and the builder variant preview `Link`.
  - Security hardening: opener isolation is now explicit on the affected external links instead of relying on browser behavior around `noreferrer`.
  - No feature loss: vendor profile external links, registry cash-fund links, public registry contribution links, and dashboard external navigation still open in a new tab.
  - Proof added/updated: `superNiceLaunchBacklogSafety.test.ts` now guards these files against reintroducing bare `rel="noreferrer"` on blank-target external links; the same test was refreshed to follow earlier helper extractions for Guests, Guest Photo Sharing, and Messages.
  - Validation passed: `npm test -- --run src/lib/superNiceLaunchBacklogSafety.test.ts` (13/13), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, `git diff --check`, `rg -n "rel=\"noreferrer\"|rel='noreferrer'" src -g '*.tsx'` (no matches), and a targeted TSX blank-target audit script (0 bad `a`/`Link` tags).
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 7:43 PM PT - No-deploy global page/section table-access regression guard:
  - Resolved in this batch: added a broad runtime TSX guard to `src/lib/dashboardDataBoundary.test.ts` that recursively scans `src/pages` and `src/sections` and fails if any non-test page/section owns direct `supabase.from(...)` table access.
  - Data-boundary hardening: the earlier per-page service-boundary work is now protected by a global regression check instead of relying only on individual page assertions.
  - No feature loss: this is proof-only/static guard hardening. Runtime behavior is unchanged.
  - Proof added/updated: `dashboardDataBoundary.test.ts` now covers 190 runtime TSX files across pages and sections for direct table access.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (18/18), independent strict `rg -U` scan across `src/pages` and `src/sections` (no matches), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This lowers future data-boundary regression risk, but live service-role/RLS and live email/messaging proof blockers remain. No deploy was run.
- 2026-05-05 7:46 PM PT - No-deploy file-size guard baseline tightening:
  - Resolved in this batch: lowered existing oversized-file guard baselines to match current code after recent reductions: `RSVP.tsx` from 1962 to 1961 lines and `GuestPhotoSharing.tsx` from 3168 to 3049 lines.
  - Maintainability hardening: recent line-count reductions now cannot quietly regress while larger P2 file splitting continues.
  - No feature loss: this is guard-only hardening. Runtime behavior is unchanged.
  - Validation passed: `npm run guard:file-size`, `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/lib/superNiceLaunchBacklogSafety.test.ts` (31/31), `git diff --check`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 7:54 PM PT - No-deploy seating component split and guard tightening:
  - Resolved in this batch: moved seating drag/drop guest chips, unassigned pool, table card, seat drop slot, and table form out of `Seating.tsx` into `src/pages/dashboard/seating/SeatingDashboardComponents.tsx`.
  - Maintainability hardening: `Seating.tsx` dropped from 2169 to 1610 lines, now below the new-page oversized threshold, and `scripts/check-file-size-guard.mjs` now enforces the lower 1610-line baseline.
  - No feature loss: seating page orchestration, demo/live seating, drag/drop seats, table edit/create, visual/list layouts, check-in controls, seating continuity, and exports remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts src/pages/dashboard/seating/seatingService.test.ts` (35/35), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, strict page/section direct-access scan, `git diff --check`, and `npm run proof:v1:seating-continuity` after approved rerun past the sandbox Vite `.vite-temp` EPERM failure.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 7:57 PM PT - No-deploy page/section select-star regression guard:
  - Resolved in this batch: expanded `src/lib/dashboardDataBoundary.test.ts` with a recursive runtime source-file guard that scans non-test `.ts` and `.tsx` files under `src/pages` and `src/sections` for `select('*')`.
  - Data-boundary hardening: page/section services now have a broad regression gate against returning unbounded table payloads from those runtime surfaces.
  - No feature loss: this is proof-only/static guard hardening. Runtime behavior is unchanged.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), independent strict `rg` select-star scan across `src/pages` and `src/sections` (no matches), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:03 PM PT - No-deploy RSVP lookup scoping proof and stale-copy cleanup:
  - Resolved in this batch: added a focused `validate-rsvp-token` regression proving `lookup` remains invite-token-only, returns no guest list, mints sessions only after exact invite-token validation, and has no name/`ilike`/multi-match enumeration path.
  - Product/security copy cleanup: removed the stale submit failure copy that told guests to "search by your full name"; source now directs them to the private RSVP link or code.
  - No feature loss: invite-token RSVP, short-lived RSVP sessions, `lookup_guest` with an existing session, submit/session validation, event scope checks, plus-one/children limits, and household-safe response shape remain intact.
  - Validation passed: `npm test -- --run src/lib/launchEdgeFunctions.test.ts` (28/28), independent RSVP source scan for name-enumeration remnants (no matches), `npm run smoke:rsvp` after approved network access, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run build`, and `git diff --check`. Initial sandboxed `npm run smoke:rsvp` failed with Supabase DNS `ENOTFOUND` and passed after approved network access.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:07 PM PT - No-deploy asset budget baseline tightening:
  - Resolved in this batch: tightened `scripts/check-asset-budget.mjs` from a 215000 KiB total public asset cap to 210000 KiB and from a 6000 KiB per-file cap to 5000 KiB.
  - Asset hardening: `npm run guard:assets` now fails closer to the current production-copied footprint of 209433 KiB total and 4788 KiB largest file, preventing quiet growth while the larger CDN/object-storage or optimized-thumbnail path remains open.
  - No feature loss: this is guard-only hardening. Template preview GIFs, preview photos, variant previews, and public assets remain available.
  - Validation passed: `npm run guard:assets`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:10 PM PT - No-deploy Coordinator panel extraction and guard tightening:
  - Resolved in this batch: moved the coordinator role selector, helper access panel, and top stat cards into `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
  - Additional panel split in this batch: moved the coordinator handoff card into the same panel module.
  - Maintainability hardening: `CoordinatorMode.tsx` dropped from 2736 to 2652 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2652-line baseline.
  - No feature loss: coordinator role view switching, owner-only role selector behavior, hero stats, check-in/Q&A/timeline/message orchestration, and coordinator data services remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:21 PM PT - No-deploy Settings navigation extraction and guard tightening:
  - Resolved in this batch: moved Settings tab IDs, tab construction, role-based tab filtering, and the settings navigation UI into `src/pages/dashboard/settings/SettingsNavigation.tsx`.
  - Maintainability hardening: `Settings.tsx` dropped from 2287 to 2259 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2259-line baseline.
  - No feature loss: owner-only Team/Billing visibility, collaborator tab restrictions, active-tab switching, settings hero stats, account/site/RSVP/notification/billing forms, and Settings service boundaries remain intact.
  - Validation passed: `npm test -- src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false` after fixing the new tab array type, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:27 PM PT - No-deploy Name Change planner card extraction and guard tightening:
  - Resolved in this batch: moved `ExecutionSnapshotCard` and `ReminderPostureCard` from `NameChangePlannerTab.tsx` into `src/pages/dashboard/planning/NameChangePlannerCards.tsx`.
  - Maintainability hardening: `NameChangePlannerTab.tsx` dropped from 2414 to 2197 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2197-line baseline.
  - No feature loss: execution snapshot cards, status-vault notes, guided next actions, form payload details, field-risk cards, reminder posture cards, planner routing, document intake, and reminder behavior remain intact.
  - Validation passed: focused name-change test lane `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts` (53/53) after restoring missed imports caught by the first run, `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:32 PM PT - No-deploy Messages detail modal/component extraction and guard tightening:
  - Resolved in this batch: moved message toasts, message status badge rendering, and the message detail modal out of `Messages.tsx` into `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 3263 to 2842 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2842-line baseline.
  - No feature loss: message history details, scheduled-message controls, retry/send-now/reschedule/cancel actions, delivery review sections, status badges, and toast display behavior remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false` after fixing incomplete moved exports/imports and restoring still-used icon imports, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:36 PM PT - No-deploy Guest Photo Sharing slideshow extraction and guard tightening:
  - Resolved in this batch: moved slideshow draft controls, slideshow frame list, and slideshow preview modal out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoSlideshowCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped from 3049 to 2944 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2944-line baseline.
  - No feature loss: slideshow-ready album filtering, order/theme selection, preview modal, copied slideshow notes state, upload/date captions, and existing photo-sharing upload/moderation flows remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:40 PM PT - No-deploy Guest Photo Sharing album-link panel extraction and guard tightening:
  - Resolved in this batch: moved the album creation templates, parent/event selectors, newest-link actions, missing-event album action, copy fallback, and newest-album QR panel out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoAlbumCreateCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2944 to 2811 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2811-line baseline.
  - No feature loss: album creation, parent album selection, itinerary-event linking, newest upload link copy/open/QR actions, missing itinerary album creation, copy fallback text area, and existing album list/moderation behavior remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-05 8:46 PM PT - No-deploy Guest Photo Sharing album controls extraction and guard tightening:
  - Resolved in this batch: moved the album sharing toolbar, owner controls, tag/status/search filters, bulk moderation controls, and visible album count display out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoAlbumControls.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2811 to 2766 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2766-line baseline.
  - No feature loss: copy-all links, copy-all prompts, send active album requests, refresh all links, export link/share/handoff sheets, flagged/hidden/tag filters, bulk moderation controls, search, and active/paused filtering remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 7:19 AM PT - No-deploy Guest Photo Sharing recent-upload moderation extraction and guard tightening:
  - Resolved in this batch: moved the recent upload list, tag chips, recap badges, and per-upload feature/story/hide/flag moderation buttons out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoRecentUploadsList.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2766 to 2697 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2697-line baseline.
  - No feature loss: recent upload display, guest/file/date labels, tag filtering, feature/story/recap-hide toggles, flag/unflag, restore/remove, and existing album moderation callbacks remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 7:46 AM PT - No-deploy Guest Photo Sharing bucket window editor extraction and guard tightening:
  - Resolved in this batch: moved parent-album reassignment controls, upload-window date inputs, suggested-window action, and save-window action out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoBucketWindowEditor.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2697 to 2660 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2660-line baseline.
  - No feature loss: parent album changes, descendant-cycle exclusion, upload opens/closes drafts, suggested window application, save window behavior, and existing album/recent-upload moderation flows remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts` (20/20), `npm run typecheck -- --pretty false` after restoring the still-used `Input` import, `npm run guard:file-size` after setting the exact 2660-line baseline, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 7:54 AM PT - No-deploy Guest Photo Sharing bucket-card extraction and guard tightening:
  - Resolved in this batch: moved the per-album shell, parent label, status/count chips, backup/QR/link/messaging actions, sub-album shortcuts, and upload-link summary out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2660 to 2556 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2556-line baseline.
  - Link-safety hardening: `dashboardLinkSafety.test.ts` now follows the extracted bucket-card component and still proves backup-folder and QR opens flow through safe URL handling.
  - No feature loss: per-album active/paused state, backup open, link refresh/copy, QR open, photo-list export, share-prompt copy, messaging prefill, sub-album filtering, upload-link display, upload-window editing, and recent-upload moderation remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 8:00 AM PT - No-deploy Guest Photo Sharing guest-hub QR extraction and guard tightening:
  - Resolved in this batch: moved the one-QR guest hub card, hub/recap link actions, QR open action, print-card action, guest action chips, and QR panels out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoHubQrCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2556 to 2506 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2506-line baseline.
  - No feature loss: guest hub link copy/open, QR open, print-card save, recap copy/open, action summary chips, hub QR panel, recap QR panel, and existing album/moderation flows remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 8:06 AM PT - No-deploy Guest Photo Sharing hub controls/follow-up/guestbook extraction and guard tightening:
  - Resolved in this batch: moved guest hub controls into `src/pages/dashboard/guestPhotos/GuestPhotoHubControlsCard.tsx`, guest follow-up export/queue preview into `src/pages/dashboard/guestPhotos/GuestPhotoFollowupCard.tsx`, and guestbook export/moderation preview into `src/pages/dashboard/guestPhotos/GuestPhotoGuestbookCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2506 to 2418 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2418-line baseline.
  - No feature loss: hub action toggles, custom hub message, default language, save controls, guest prospect counts/export/queue actions, guestbook export, guestbook flag/hide moderation, and existing photo album/moderation flows remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 8:13 AM PT - No-deploy Guest Photo Sharing photo-review extraction and guard tightening:
  - Resolved in this batch: moved photo review summary stats, curation actions, highlights, timeline, similar sets, review queue, and memory chapter preview out of `GuestPhotoSharing.tsx` into `src/pages/dashboard/guestPhotos/GuestPhotoReviewCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2418 to 2317 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2317-line baseline.
  - No feature loss: highlight slideshow ordering, saved-photo-time ordering, curation export, memory chapter/recap note copy, review-item hiding, similar-extra hiding, hidden upload restore, recap feature/story/hide toggles, and existing album/moderation flows remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 8:20 AM PT - No-deploy Guest Photo Sharing moments and schedule album extraction:
  - Resolved in this batch: moved the AI/photo moments panel into `src/pages/dashboard/guestPhotos/GuestPhotoMomentsCard.tsx` and the schedule-derived moment album suggestion panel into `src/pages/dashboard/guestPhotos/GuestPhotoMomentAlbumsCard.tsx`.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2317 to 2207 lines, and `scripts/check-file-size-guard.mjs` now enforces the lower 2207-line baseline.
  - No feature loss: sort-new-photos, review-visible, high-confidence photo moves, per-analysis move/keep decisions, reviewed/photo metadata counts, schedule-derived album suggestions, and create-moment-album actions remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 8:35 AM PT - No-deploy Guest Photo Sharing below-threshold component extraction:
  - Resolved in this batch: moved the Memories hero, memory/vault guidance, no-app readiness checklist, recap sharing controls, couple photo albums card, album/upload stats, slideshow draft controls, and photo organizer plan out of `GuestPhotoSharing.tsx` into focused `src/pages/dashboard/guestPhotos/*` components.
  - Maintainability hardening: `GuestPhotoSharing.tsx` dropped again from 2207 to 1979 lines, bringing it below the 2000-line oversized-file threshold, and `scripts/check-file-size-guard.mjs` now enforces the exact 1979-line baseline.
  - No feature loss: vault navigation, readiness blockers, recap preview/status save, couple-album uploads/removals, owner stats, slideshow draft organization, AI organizer note copy, and high-confidence organizer moves remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guestPhotoSharingService.test.ts src/lib/dashboardDataBoundary.test.ts src/lib/dashboardLinkSafety.test.ts` (24/24), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:12 AM PT - No-deploy Name Change planner intro extraction and below-threshold guard tightening:
  - Resolved in this batch: moved the Name Change planner path/health/privacy cards, resume panel, lifecycle jump cards, roadmap cards, and milestone/proof progress cards into `src/pages/dashboard/planning/NameChangePlannerCards.tsx`.
  - Maintainability hardening: `NameChangePlannerTab.tsx` dropped from 2197 to 1999 lines, bringing it below the 2000-line oversized-file threshold, and `scripts/check-file-size-guard.mjs` now enforces the exact 1999-line baseline.
  - No feature loss: resume routing, lifecycle jumps, save-and-return action, roadmap/milestone display, dual-partner proof tracks, document/status vault, execution cards, reminders, admin review, and existing name-change planner behavior remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts` (53/53), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:17 AM PT - No-deploy Coordinator command deck extraction and guard tightening:
  - Resolved in this batch: moved the command summary cards, command deck cards, and ops snapshot cards into `CoordinatorCommandDeckPanel` in `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
  - Maintainability hardening: `CoordinatorMode.tsx` dropped from 2599 to 2537 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2537-line baseline.
  - No feature loss: command summary jumps, priority labels, command deck actions, ops snapshot lane jumps, role restrictions, summary panels, check-in, timeline, alerting, and Q&A behavior remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:21 AM PT - No-deploy Messages saved-template card extraction and guard tightening:
  - Resolved in this batch: moved the reusable saved-template library card into `MessageSavedTemplatesCard` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 2533 to 2490 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2490-line baseline.
  - No feature loss: saved template display, reusable audience labels, expired saved-schedule warning, template use, template removal, composer behavior, history summaries, and existing send/schedule/retry controls remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:26 AM PT - No-deploy Messages campaign-thread extraction and guard tightening:
  - Resolved in this batch: moved campaign rollups and the active campaign thread panel into `MessageCampaignThreadPanels` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 2490 to 2357 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2357-line baseline.
  - No feature loss: campaign thread filtering, active thread clearing, latest-message view/edit/duplicate actions, reminder/day-of/thank-you follow-up starts, scheduled follow-up starts, delivery/contact counters, and existing history controls remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:29 AM PT - No-deploy Messages review-queue extraction and guard tightening:
  - Resolved in this batch: moved follow-up review and review queue panels into `MessageReviewQueuePanels` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 2357 to 2306 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2306-line baseline.
  - No feature loss: follow-up review counts, review queue empty state, recipient review labels, latest message context, approve/open/follow-up actions, and existing message send/retry/schedule flows remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:40 AM PT - No-deploy Messages history card extraction and guard tightening:
  - Resolved in this batch: moved the message history filter header, quick filters, campaign/review summary panels, empty state, filtered history rows, and scheduled/retry row controls into `MessageHistoryCard` in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 2306 to 2123 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2123-line baseline.
  - No feature loss: history search/filtering, campaign-thread selection/clearing, review queue actions, scheduled send-now/reschedule/draft controls, retry controls, recipient counters, due-now labels, and message detail opening remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:45 AM PT - No-deploy Messages composer panel extraction and guard tightening:
  - Resolved in this batch: moved composer language preview, schedule controls, recipient preview, and preflight reach/capacity warnings into focused components in `src/pages/dashboard/messages/MessageDashboardComponents.tsx`.
  - Maintainability hardening: `Messages.tsx` dropped from 2123 to 1954 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 1954-line baseline.
  - No feature loss: composer template selection, language preview, schedule date/time handling, recipient preview, SMS credit/capacity warnings, text setup lock, email cap warning, send-now, schedule, and save-draft behavior remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts` (19/19), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:52 AM PT - No-deploy Coordinator day-of summary extraction and guard tightening:
  - Resolved in this batch: moved the day-of summary board, current-signal cue, standing prompt, suggested action board, progress/navigation/next-step cards, and embedded command deck into `CoordinatorDayOfSummaryPanel` in `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
  - Maintainability hardening: `CoordinatorMode.tsx` dropped from 2537 to 2391 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2391-line baseline.
  - No feature loss: summary cue display, alert/manual override labels, return-to-board target, standing prompt jump, primary action, return/revisit controls, command summary actions, ops snapshot jumps, and planner/viewer notices remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 9:57 AM PT - No-deploy Coordinator check-in queue extraction and guard tightening:
  - Resolved in this batch: moved the check-in queue shell, door board, filters, ready/review quick actions, active guest action, empty state, and guest rows into `CoordinatorCheckInQueuePanel` in `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
  - Maintainability hardening: `CoordinatorMode.tsx` dropped from 2391 to 2267 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2267-line baseline.
  - No feature loss: check-in search, Enter-to-check-in, arrivals/all/checked-in filter, ready-now/review-only toggles, active guest check-in, suggested/selected labels, door-review escalation, disabled viewer controls, and queue row check-in behavior remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:06 AM PT - No-deploy Coordinator timeline/message extraction and guard tightening:
  - Resolved in this batch: moved the run-of-show timeline board, focused-event controls, jump buttons, per-event timeline rows, day-of message alert board, alert activity board, suggestion chips, form controls, ready-to-send cue, and alert-history filters into `CoordinatorTimelinePanel` and `CoordinatorDayOfMessagePanel` in `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx`.
  - Maintainability hardening: `CoordinatorMode.tsx` dropped from 2267 to 1867 lines, bringing it below the 2000-line oversized-file threshold, and `scripts/check-file-size-guard.mjs` now enforces the exact 1867-line baseline.
  - No feature loss: timeline focus, live/up-next/suggested jumps, primary/correction timeline transitions, alert draft sync, suggestion re-alignment, send-now/schedule controls, alert filters, role-gated controls, and alert history display remain intact.
  - Validation passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/pages/dashboard/coordinator/coordinatorService.test.ts` (20/20), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:12 AM PT - No-deploy Guests snapshot insights extraction and guard tightening:
  - Resolved in this batch: moved the guest snapshot stats, RSVP insight cards, event/meal/custom-answer/song-request summaries, and quick insight filter buttons into `GuestSnapshotInsightsPanel` in `src/pages/dashboard/guests/GuestSnapshotInsightsPanel.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 4418 to 4270 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 4270-line baseline.
  - No feature loss: guest snapshot counts, event/meal/custom-answer/song-request insight display, missing-meal/plus-one/no-response/pending-no-email/ceremony-no/reception-no focus buttons, and the existing guest operations flow remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:20 AM PT - No-deploy Guests toolbar and campaign extraction:
  - Resolved in this batch: moved the guest search/import/add/actions toolbar into `GuestOpsToolbar`, and moved the campaign insights card/modal into `GuestCampaignReminderPanel`.
  - Maintainability hardening: `Guests.tsx` dropped from 4270 to 4174 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 4174-line baseline.
  - No feature loss: guest search, CSV/XLSX import entry, add guest, export actions, RSVP link copy, checklist actions, reminder sends, auto-reminder toggle, delete-all entry, campaign preset selection, recipient preview, skip-recent toggle, and focus shortcuts remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:24 AM PT - No-deploy Guests household panel extraction:
  - Resolved in this batch: moved the household merge banner, no-households state, grouped household rows, and ungrouped selectable guest list into `GuestHouseholdPanel` in `src/pages/dashboard/guests/GuestHouseholdPanel.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 4174 to 4090 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 4090-line baseline.
  - No feature loss: household mode display, merge disabled state, status badges, grouped member rows, ungrouped guest selection toggles, and household merge entry remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:29 AM PT - No-deploy Guests list panel extraction:
  - Resolved in this batch: moved the main guest table, row status stack, RSVP lifecycle chips, event RSVP chips, row actions, and no-results state into `GuestListPanel` in `src/pages/dashboard/guests/GuestListPanel.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 4090 to 3899 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 3899-line baseline.
  - No feature loss: guest row opening, RSVP preview, invitation send, check-in toggle, thank-you toggle, assisted RSVP entry, edit/delete actions, status badges, custom-answer indicators, and no-results copy remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:34 AM PT - No-deploy Guests form, assisted RSVP, and delete-all modal extraction:
  - Resolved in this batch: moved the add/edit guest form modal, assisted RSVP modal, and delete-all confirmation modal into `GuestModals` in `src/pages/dashboard/guests/GuestModals.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 3899 to 3745 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 3745-line baseline.
  - No feature loss: add/edit guest fields, plus-one controls, itinerary invitation checkboxes, assisted RSVP status/source/notes, modal close behavior, delete-all typed confirmation, and save/submit handlers remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:41 AM PT - No-deploy Guests itinerary drawer extraction:
  - Resolved in this batch: moved the guest itinerary drawer, visibility preview, RSVP detail cards, exception/household context, audit trail, and event invitation toggles into `GuestItineraryDrawer` in `src/pages/dashboard/guests/GuestItineraryDrawer.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 3745 to 3383 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 3383-line baseline.
  - No feature loss: drawer close behavior, guest update/RSVP link copy, guest preview links, follow-up task save, focus guest search, audit display, loading/empty states, event invitation toggles, and instant-save footer remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:45 AM PT - No-deploy Guests CSV import modal extraction:
  - Resolved in this batch: moved the CSV column mapper and CSV review/import modal into `GuestCsvImportModals` in `src/pages/dashboard/guests/GuestCsvImportModals.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 3383 to 3203 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 3203-line baseline.
  - No feature loss: column mapping, invited-event multiselect, mapping validation, import review warnings, preview rows, cancel/reset behavior, and confirm import action remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:52 AM PT - No-deploy Guests RSVP settings extraction:
  - Resolved in this batch: moved the RSVP settings view, access-mode plan, setup checklist, question templates, meal choices editor, question editor, and guest change history panel into `GuestRsvpSettingsView` in `src/pages/dashboard/guests/GuestRsvpSettingsView.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 3203 to 2959 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2959-line baseline.
  - No feature loss: RSVP settings tab navigation, RSVP view link, access mode status cards, template add/disable behavior, meal option editing, custom question editing/deletion confirmation, save/autosave status, and audit feed display remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 10:57 AM PT - No-deploy Guests RSVP conflict panel extraction:
  - Resolved in this batch: moved local RSVP conflict readback, persisted RSVP conflict filtering/details, conflict stats, and resolve actions into `GuestRsvpConflictPanels` in `src/pages/dashboard/guests/GuestRsvpConflictPanels.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 2959 to 2843 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2843-line baseline.
  - No feature loss: duplicate-email/declined-plus-one review, pending-review focus, conflict severity filtering, resolve-all, per-conflict resolve, details toggle, stale-conflict age copy, stats, and top-reason display remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:03 AM PT - No-deploy Guests list status controls extraction:
  - Resolved in this batch: moved recommended guest action, RSVP follow-up list, planner handoff, quick-start photos jump, active segment readback, exception/meal/no-contact helper panels, segment tabs, household/check-in toggles, check-in banners, and selection readback into `GuestListStatusControls` in `src/pages/dashboard/guests/GuestListStatusControls.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 2843 to 2690 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2690-line baseline.
  - No feature loss: recommended focus/save task, ops queue focus, quick-start skip-to-photos, clear filters, exception/meal/no-contact copy actions, campaign modal opening, segment selection, household toggle, check-in mode, undo last check-in, view checked-in, and visible-selection trimming remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:06 AM PT - No-deploy Guests dashboard header extraction:
  - Resolved in this batch: moved the Guests dashboard hero, RSVP settings tab switch, insights toggle, import summary readback, and planner-mode notice into `GuestDashboardHeader` in `src/pages/dashboard/guests/GuestDashboardHeader.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 2690 to 2644 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2644-line baseline.
  - No feature loss: hero stats/actions, add-guest disable state, RSVP view link, RSVP settings navigation, insights toggle, CSV import summary copy, and planner read-only context remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:09 AM PT - No-deploy Guests list display switcher extraction:
  - Resolved in this batch: moved the no-results state, household/list branch, and guest list panel routing into `GuestListDisplaySwitcher` in `src/pages/dashboard/guests/GuestListDisplaySwitcher.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 2644 to 2635 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2635-line baseline.
  - No feature loss: clear-filter empty state, household merge/select view, list table view, check-in behavior, assisted RSVP entry, edit/delete, invitation send, and itinerary drawer opening remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (21/21), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:16 AM PT - No-deploy Guests derived dashboard utility extraction:
  - Resolved in this batch: moved Guests dashboard filtering, dashboard stats, and event report rollups into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: `Guests.tsx` dropped from 2635 to 2565 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2565-line baseline.
  - No feature loss: search, primary/extra filters, event invite/not-invite filters, due-reminder and thank-you-due filters, dashboard hero stats, snapshot event report counts, campaign/list behavior, and guest operations flow remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (43/43), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:21 AM PT - No-deploy Guests conflict/reminder/export utility extraction:
  - Resolved in this batch: moved RSVP conflict stat derivation, due-reminder and thank-you-due segment derivation, and reusable guest CSV download wiring into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: `Guests.tsx` dropped from 2565 to 2492 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2492-line baseline.
  - No feature loss: RSVP conflict stats, stale-conflict counts, top conflict reasons, due reminder targeting, thank-you due targeting, all guest CSV export actions, and event attendance exports remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (45/45), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:25 AM PT - No-deploy Guests CSV import preparation utility extraction:
  - Resolved in this batch: moved demo imported-guest construction, imported guest row cleanup, and CSV import sidecar derivation for households, event invites, and RSVP rows into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: `Guests.tsx` dropped from 2492 to 2430 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2430-line baseline.
  - No feature loss: demo imports, secure-token imports, household grouping, guarded household separation, event invite import, RSVP row import, quick-start photo continuation, and import summary toasts remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (46/46), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:30 AM PT - No-deploy Guests RSVP config and export label utility extraction:
  - Resolved in this batch: moved RSVP config cleanup/validation, guest display-name formatting, filtered-export suffix formatting, and SMS RSVP link row building into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: `Guests.tsx` dropped from 2430 to 2406 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2406-line baseline.
  - No feature loss: RSVP question cleanup, meal-option title-casing, validation toasts, demo/live RSVP settings saves, invitation names, campaign preview names, filtered CSV naming, and SMS RSVP link copy remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (48/48 after refreshing the stale boundary assertion), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:33 AM PT - No-deploy Guests invitation payload utility extraction:
  - Resolved in this batch: moved wedding invitation email payload construction into `src/pages/dashboard/guests/guestDashboardUtils.ts` and reused it across single invitation, selected reminders, filtered reminder campaign, and due-reminder send paths.
  - Maintainability hardening: `Guests.tsx` dropped from 2406 to 2358 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2358-line baseline.
  - No feature loss: single invite sends, selected reminders, filtered reminder campaigns, due reminders, invitation timestamp writes, reminder timestamp writes, campaign logs, and owner-facing success/failure toasts remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (48/48), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 11:37 AM PT - No-deploy Guests reminder campaign summary utility extraction:
  - Resolved in this batch: moved reminder send summary copy, campaign confirmation description construction, and campaign log entry construction into `src/pages/dashboard/guests/guestDashboardUtils.ts`.
  - Maintainability hardening: `Guests.tsx` dropped from 2358 to 2346 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2346-line baseline.
  - No feature loss: selected reminder result toasts, filtered campaign confirmation copy, no-contact warning copy, recipient previews, demo campaign logs, due-reminder logs, and send success/failure summaries remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (48/48), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:11 PM PT - No-deploy Guests below-threshold owner utility extraction:
  - Resolved in this batch: moved guest export/contact-link actions into `src/pages/dashboard/guests/useGuestDashboardExports.ts`, check-in/thank-you actions into `src/pages/dashboard/guests/useGuestDashboardCheckIns.ts`, and RSVP status badge rendering into `src/pages/dashboard/guests/GuestStatusBadge.tsx`.
  - Maintainability hardening: `Guests.tsx` dropped from 2137 to 1939 lines, bringing it below the 2000-line oversized-file threshold, and `scripts/check-file-size-guard.mjs` now enforces the exact 1939-line baseline.
  - No feature loss: guest exports, text RSVP link copy/download fallback, guest update link copy/download fallback, check-in undo/clear/toggle, thank-you sent toggles/bulk mark, household/list status badges, and dashboard data-boundary checks remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/guests/guestDashboardUtils.test.ts src/pages/dashboard/guests/guestService.test.ts src/lib/dashboardDataBoundary.test.ts` (52/52 after refreshing the stale boundary assertion), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:15 PM PT - No-deploy Name-change template card headroom extraction:
  - Resolved in this batch: moved the prewritten account-update template card out of `NameChangePlannerTab.tsx` into `src/pages/dashboard/planning/NameChangeAccountUpdateTemplatesCard.tsx`.
  - Maintainability hardening: `NameChangePlannerTab.tsx` dropped from 1999 to 1953 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 1953-line baseline.
  - No feature loss: readiness-aware account update template subjects, context lines, body copy, status chips, copy button labels, copy/download behavior, and copied-state reset remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/lib/dashboardDataBoundary.test.ts` (62/62), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:24 PM PT - No-deploy Builder sidebar preview metadata extraction:
  - Resolved in this batch: moved builder sidebar live-preview fixture data into `src/builder/components/builderSidebarPreviewData.ts` and variant tone/art-direction metadata into `src/builder/components/builderVariantPreviewMetadata.ts`.
  - Maintainability hardening: `BuilderSidebarLibrary.tsx` dropped from 3294 to 2869 lines, and `scripts/check-file-size-guard.mjs` now tracks it as a non-page baseline at 2869 lines.
  - No feature loss: section picker photo-set controls, section previews, live variant previews, variant tone chips, art-direction descriptions, sequence/composition cues, and preview wedding-data fixtures remain intact.
  - Validation passed: `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx` (16/16; the SectionRenderer test intentionally logs a safe-fallback error), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:27 PM PT - No-deploy Builder sidebar static preview extraction:
  - Resolved in this batch: moved the static section-type preview renderer out of `BuilderSidebarLibrary.tsx` into `src/builder/components/SectionTypePreview.tsx`.
  - Maintainability hardening: `BuilderSidebarLibrary.tsx` dropped from 2869 to 2575 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 2575-line non-page baseline.
  - No feature loss: section type preview thumbnails, compact preview wrapping, live variant fallback headers, and the surrounding variant preview cards remain intact.
  - Validation passed: `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx` (16/16; the SectionRenderer test intentionally logs a safe-fallback error), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:31 PM PT - No-deploy Builder sidebar variant swatch extraction:
  - Resolved in this batch: moved the large static fallback variant preview swatch renderer out of `BuilderSidebarLibrary.tsx` into `src/builder/components/VariantPreviewSwatch.tsx`.
  - Maintainability hardening: `BuilderSidebarLibrary.tsx` dropped from 2575 to 1003 lines; `scripts/check-file-size-guard.mjs` now enforces exact non-page baselines for `BuilderSidebarLibrary.tsx` at 1003 lines and `VariantPreviewSwatch.tsx` at 1574 lines.
  - No feature loss: fallback preview swatches, live-preview fallback rendering, hover styling, variant cards, compact section preview headers, and builder sidebar drag/layer behavior remain intact.
  - Validation passed: `npm test -- --run src/builder/components/BuilderShell.test.tsx src/builder/components/BuilderInspectorPanel.gallery.test.ts src/builder/components/BuilderSectionRail.test.tsx src/builder/components/BuilderTopBar.test.tsx src/builder/components/SectionRenderer.public.test.tsx` (16/16; the SectionRenderer test intentionally logs a safe-fallback error), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:36 PM PT - No-deploy Builder entry-site service-boundary extraction:
  - Resolved in this batch: moved the builder editor entry-site `wedding_sites` read out of `BuilderPage.tsx` into `builderProjectService.loadEntrySite` with an explicit `BUILDER_ENTRY_SITE_SELECT` projection.
  - Data-boundary hardening: `src/lib/dashboardDataBoundary.test.ts` now includes builder runtime screens/code in the no-direct-Supabase/no-select-star guards, proves the builder service owns the entry projection, and proves `BuilderPage.tsx` no longer imports Supabase or owns the direct table read.
  - No feature loss: active-site resolution, no-site fallback, couple-name display, builder project load, wedding-data load, setup-draft hydration, template default application, and draft-save behavior remain intact.
  - Validation passed: `npm test -- --run src/builder/services/builderProjectService.test.ts src/builder/BuilderPage.test.ts src/lib/dashboardDataBoundary.test.ts` (25/25), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:43 PM PT - No-deploy Registry preview hostile URL matrix and proof-lane refresh:
  - Resolved in this batch: added `src/lib/registryPreviewUrlNormalizer.test.ts` to prove registry preview URL normalization rejects localhost, `.local`, `.internal`, `.test`, metadata hosts, AWS metadata IP, loopback/private/reserved IPv4 ranges, decimal/hex/short loopback forms, IPv6 loopback, IPv4-mapped IPv6, credentialed URLs, JavaScript URLs, and file URLs while preserving public Target/Amazon canonicalization.
  - Proof-lane hardening: wired the new matrix into `npm run test:security`, refreshed the public access artifact guard to follow the current shared helper, and updated `scripts/v1-proof-ai-rollout.mjs` so AI/photo rollout proof resolves extracted select constants in `guestPhotoSharingService.ts`.
  - No feature loss: registry URL preview canonicalization, product dedupe, public-site invite/password session storage, and guest photo AI/photo safe-column proof remain intact.
  - Validation passed: `npm test -- --run src/lib/registryPreviewUrlNormalizer.test.ts src/lib/launchEdgeFunctions.test.ts` (53/53), `npm run test:security` (222/222), `node scripts/v1-proof-ai-clearance.mjs` (local-only non-launch-clearance with 2/2 local subchecks green), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run; live hostile-target/runtime authorization proof remains gated.
- 2026-05-06 12:46 PM PT - No-deploy test-lane security matrix drift fix:
  - Resolved in this batch: updated `scripts/v1-proof-test-lanes.mjs` so its hardcoded `test:security` contract includes `src/lib/registryPreviewUrlNormalizer.test.ts`.
  - Proof-lane hardening: `npm run proof:v1:test-lanes` now fails if the hostile registry-preview URL matrix is removed from the named security lane, keeping `package.json`, launch proof, and CI expectations aligned.
  - No feature loss: this is proof-script-only hardening; runtime app behavior is unchanged.
  - Validation passed: `node --check scripts/v1-proof-test-lanes.mjs`, `npm run proof:v1:test-lanes`, `npm run test:security` (222/222), `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run guard:file-size`, `npm run guard:assets`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:49 PM PT - No-deploy launch performance-budget gate wiring:
  - Resolved in this batch: wired `npm run proof:v1:performance-budget` into `npm run test:launch` immediately after production build.
  - CI/proof-lane hardening: added the same performance-budget step to `.github/workflows/ci-hardpass.yml` and updated `scripts/v1-proof-test-lanes.mjs` so the launch-lane and CI contracts fail if the bundle budget proof is removed.
  - Current built-output proof: `npm run proof:v1:performance-budget` passes with 0 failures and 3 review chunks: `registry-CCjYb-Xs.js` 325.27 KiB, `nameChangeService-Bf0FgOO0.js` 288.54 KiB, and `Planning-DBFVjkJn.js` 253.86 KiB.
  - Validation passed: `npm run proof:v1:performance-budget`, `npm run proof:v1:test-lanes`, and the full updated `npm run test:launch` command chain.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:56 PM PT - No-deploy Messages detail modal extraction:
  - Resolved in this batch: moved the message detail modal from `src/pages/dashboard/messages/MessageDashboardComponents.tsx` into `src/pages/dashboard/messages/MessageDetailModal.tsx`.
  - Maintainability hardening: `MessageDashboardComponents.tsx` dropped from 1799 to 1415 lines, and `scripts/check-file-size-guard.mjs` now enforces the exact 1415-line non-page baseline.
  - No feature loss: message detail viewing, delivery attention summaries, skipped-contact summaries, scheduled reschedule/unschedule controls, retry, duplicate/edit composer actions, and modal status display remain intact.
  - Validation passed: `npm test -- --run src/pages/dashboard/messages/messageDashboardUtils.test.ts src/lib/dashboardDataBoundary.test.ts` (31/31), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 12:59 PM PT - No-deploy shared email safety executable proof:
  - Resolved in this batch: added `src/lib/emailSafety.test.ts` to directly import the shared Edge Function email safety helpers and prove hostile HTML escaping, safe URL fallback, href escaping, subject control-character cleanup, fallback subject behavior, and the 180-character subject cap.
  - Proof-lane hardening: wired the helper proof into `npm run test:security` and refreshed `scripts/v1-proof-test-lanes.mjs` so the named security lane fails if the email-safety proof is removed.
  - No feature loss: shared helper behavior remains preserved for `send-wedding-email`, `process-email-queue`, `send-bulk-message`, and vendor inquiry email paths; this batch only adds executable proof and proof-lane wiring.
  - Validation passed: `npm test -- --run src/lib/emailSafety.test.ts src/lib/launchEdgeFunctions.test.ts` (32/32), `npm run proof:v1:test-lanes`, `npm run test:security` (226/226), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run; live messaging authorization proof remains required.
- 2026-05-06 1:05 PM PT - No-deploy name-change account-update helper extraction:
  - Resolved in this batch: moved pure account-update template proof/readiness/copy helpers from `src/lib/nameChange/engine.ts` into `src/lib/nameChange/accountUpdateTemplateCopy.ts`.
  - Maintainability hardening: `engine.ts` dropped from 1738 to 1528 lines while preserving its existing compatibility exports for planner surfaces and action-feed callers.
  - No feature loss: generated account-update template subjects, audience/status/action lines, readiness labels, copied-state labels, checklist/proof normalization, and planner card copy behavior remain intact.
  - Validation passed: `npm test -- --run src/lib/nameChange/engine.test.ts src/lib/nameChange/actionFeed.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/planning/nameChangePlannerUi.test.ts` (153/153), `npm run typecheck -- --pretty false`, `npm run guard:file-size`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`.
  - Launch status: unchanged. This is local-only hardening and no deploy was run.
- 2026-05-06 1:18 PM PT - Approved deploy and postdeploy proof:
  - DONE: committed the accumulated hardening checkpoint as `4d211c1d` (`Harden launch gates and split dashboard modules`).
  - DONE: deployed updated Supabase Edge Functions on project `atuzuobpprjstfmdnwso`: `validate-rsvp-token`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`, `photo-album-create`, `photo-album-manage`, `photo-analyze-batch`, `photo-export-manifest`, and `photo-upload-moderate`.
  - DONE: Vercel production deploy completed and is aliased to `https://dayof.love`; deployment id `dpl_H2GEvD7Zo6Ka3a8xFtEKcvQqzArz`, deployment URL `https://wedding-site-bolt-gfi6ia4yp-eric-gagnons-projects.vercel.app`.
  - Proof repair: installed the missing local Playwright Chromium runtime and refreshed the CSV/check-in smoke guards to follow extracted Guests components/hooks.
  - Validation passed after deploy: `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:postdeploy` passed 8/8, including canonical smoke, prereqs, AI rollout, AI exposure static, runtime wording truth, public quality, guests/RSVP ops, and anon-limited data integrity.
  - Launch status: production is updated and current postdeploy proof is green. Overall readiness remains `PARTIAL` until the still-gated service-role/RLS live proof, live email/messaging authorization proof, and external OpenAI key rotation are closed.
- Do not start broad refactors from this file alone.
- Execute this backlog top-down by risk, beginning with the P0 public data, gating, RSVP, AI key, service worker, email escaping, SSRF, and settings contract issues.
- Update proof logs and launch docs only after concrete verification passes.
