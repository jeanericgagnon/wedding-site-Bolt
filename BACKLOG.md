# Production Hardening Backlog

This backlog is organized by launch priority and is meant to drive focused production hardening work. It is intentionally implementation-oriented: each item includes the problem, risk, likely inspection areas, acceptance criteria, and a suggested approach.

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
- Do not start broad refactors from this file alone.
- Execute this backlog top-down by risk, beginning with the P0 public data, gating, RSVP, AI key, service worker, email escaping, SSRF, and settings contract issues.
- Update proof logs and launch docs only after concrete verification passes.
