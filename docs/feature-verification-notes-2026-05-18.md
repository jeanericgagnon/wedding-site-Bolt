# Feature Verification Notes — 2026-05-18

## Current read

- 2026-05-19 PT: Scoped onboarding/setup browser draft memory by authenticated user where available, with legacy global-key migration for onboarding draft, quick start, guided setup, onboarding resume, and builder setup/template state. Wired the scoped reads/writes through Onboarding, QuickStart, GuidedSetup, SetupShell, Templates, TemplateDetail, BuilderPage, PaymentRequired, PaymentSuccess, Celebration, and overview setup-progress reads. No deploy was run.
- 2026-05-19 PT: Followed that scoping through the auth/payment continuation breadcrumb too. `signup-return-path` is now scope-aware with legacy migration, and Login, Signup, QuickStart, GuidedSetup, and WeddingStatus now use scoped continuation cleanup/restore paths where user context exists. No deploy was run.
- UI import / consistency pass: **source-level complete enough to verify**
- `npm run build`: **passed**
- `npm run typecheck -- --pretty false`: **passed**
- `npm run lint -- --quiet`: **passed**
- network-backed smoke: **rerun successfully with escalation**
- feature-critical Playwright write/read proofs: **green across the shipped non-SMS lanes**
- broad Vitest feature batches: **much healthier after thread-pool proof updates, though a few Playwright live lanes are still noisier than the focused smokes**
- full-suite local gate: **typecheck + lint + coordinator local proof + name-change local proof + registry local proof now green**
- full-suite local exit gate: **green**
- full-suite live exit gate: **green**
- proof-board freshness: **the generated board now warns when `BACKLOG.md` current-state metadata is stale, instead of quietly presenting it as live-run truth**
- proof-board freshness guard: `npm run proof:v1:board:freshness` now fails deliberately when the backlog current-state snapshot is stale, so the launch board can be used as an explicit trust check instead of a best-effort readout
- proof-lane contract checker now also pins the raw `npm run proof:v1:board` script itself, so the machine-readable board path cannot drift quietly while freshness and markdown call sites still look correct
- named markdown board command remains explicit too: `npm run proof:v1:board:md` is the packaged launch-board render path the runbooks and validation matrix now track
- canonical validation matrix now explicitly tracks all three board paths too: raw machine-readable board, markdown board, and freshness gate
- `test:launch`, `dayof:proof`, and `proof:v1:launch-closeout` now run the same full board-command trio in order too, so the helper paths stop lagging behind the documented launch contract
- `proof:v1:full-suite-exit-gate` now runs that same trio at the front of its local gate too, so the top-level aggregate proof wrapper matches the other launch-control helpers
- proof runbook now uses the named package commands for both board outputs too, so the operator-facing quick path matches the guarded repo contract instead of teaching a one-off raw script invocation
- canonical-smoke and security-automation messaging now name the current board-flow contract more explicitly too, so the proof scripts themselves stop implying that “the board” is a single loose artifact
- canonical-smoke now says that same contract in its own result summary too, so the supporting route/build/site-lookup gate explicitly says it defers the launch call to the proof-board flow instead of sounding like a launch artifact source
- the proof-board script and its regression test now use that same explicit wording too, so stale-board failures point to the actual guarded contract instead of a generic “board” concept
- full-suite exit gate now starts by running the full board-command trio (`npm run proof:v1:board:freshness`, `npm run proof:v1:board`, `npm run proof:v1:board:md`), so stale canonical launch metadata is treated as a gate failure and both board outputs stay current inside the aggregate wrapper
- workflow-level launch gates are now explicitly guarded as freshness-only in both tests and `proof:v1:security-automation`, so CI/release cannot quietly drift into regenerating board outputs instead of just enforcing canonical-state freshness
- local/helper proof paths now say the complementary part out loud too: they are the places that regenerate `npm run proof:v1:board` and `npm run proof:v1:board:md` when a refreshed board artifact is actually needed
- production hardening report and smoke-log summaries now say the same thing too, so the workflow/helper split stays visible in the main current-facing proof snapshots
- the runtime-note checklist checker and security-automation proof summary now carry that same split too, so even the small helper scripts stop lagging behind the repo’s launch-contract wording
- `proof:v1:test-lanes` now says the same workflow/helper split in its own result summary, so the meta-checker that watches launch command wiring no longer reports a bare pass/fail without the current contract context
- the gated-unblock and runtime-note helper checkers now say the same workflow/helper split in their own result summaries, so even the tiny operator-facing proof scripts explain the current contract instead of only checking phrases
- launch-closeout and full-suite exit-gate now carry the same contract in their own summaries, so the broader helper bundles also say when they refresh board artifacts versus when they still defer the final launch call to the proof-board flow
- registry, comms-center, and guest-language proof helpers now say what kind of lane truth they provide instead of only reporting counts, so feature-bundle output is a little more self-explanatory under pressure
- coordinator, seating, and day-of web-mode proof helpers now say the same kind of lane-truth story too, so adjacent shipped-surface bundles are clearer about whether they close live truth, local truth, or supporting read-only evidence
- travel guest portal, photo memory flow, and guest preview proof helpers now say the same kind of lane-truth story too, so the guest-facing bundle family is more consistent about what each proof lane actually proves
- QR scanner, website/invite analytics, and collaborator access proof helpers now say the same kind of lane-truth story too, so the ops/privacy/permissions bundle family is clearer about what is shipped evidence versus what still rolls up into broader launch truth
- prereqs, client RLS matrix, and client write inventory now say the same kind of infra-lane truth story too, so readiness, permission-boundary, and source-inventory proofs are clearer about what they establish versus what they only support
- performance budget, AST security, and public-access coverage now say the same kind of infra-lane truth story too, so build-guard, source-security, and static boundary proofs are clearer about what they establish versus what they only support
- notification digest, wedding identity exports, and budget/vendor ledger now say the same kind of lane-truth story too, so the long-tail owner/planning proof helpers are clearer about what shipped behavior they validate versus what is already carried by the canonical live matrix versus future upkeep reruns
- AI clearance/readiness/migration, registry-preview SSRF, and data-integrity helpers now say the same kind of lane-truth story too, so AI/privacy, fetch-safety, and deep integrity proofs are clearer about what they close versus what they only prepare or support
- AI secure model/exposure plus collaborator-runtime and guest-lookup-scope helpers now say the same kind of lane-truth story too, so the deeper live runtime/privacy lanes are clearer about what they close versus what they complement
- guest-hub QR, guests/RSVP ops, and name-change runtime now say the same kind of lane-truth story too, so these major shipped product-lane proofs are clearer about when they close live/runtime truth versus when they still wait on a dedicated rerun
- proof board plus the remaining checker-style helpers now say their contract role out loud too, so the canonical artifact and the last wiring/operator guards are clearer about whether they establish launch truth or only keep the proof path aligned
- `proof:v1:launch-closeout` now has an explicit contractSummary too, so every proof helper that still exposes summary-style output now says whether it closes truth, refreshes artifacts, or only keeps the proof path aligned
- the planner extraction drift is fixed again too: `typecheck` and `lint` are back green after reconnecting the name-change execution/preparation/status/template panels to the extracted row shapes, while the targeted planner Vitest lane still exhibits the same silent-runner behavior instead of a fresh assertion failure
- the planner tab is slimmer again too: the execution-snapshot wiring is now bundled through a single memo, `NameChangePlannerTab.tsx` is down to 812 lines, and `typecheck` stayed green after the cleanup
- the planner module boundaries are cleaner too: workspace/reference/operational/follow-up/workflow/document surfaces now live in focused sidecars behind `NameChangePlannerPanels.tsx`, and the planner scan shows those sidecars are being consumed through the barrel instead of leaking direct imports back into the rest of the planner
- the older V1 gap notes now say that part out loud too, so current-facing repo docs no longer imply that hardpass/release regenerate board outputs when they are only meant to enforce freshness
- launch-closeout and day-of helper entrypoints now run the same freshness guard first, so local proof wrappers and launch scripts enforce the same canonical-state contract
- the archived production hardening changelog now says the same workflow/helper split at the top too, so historical summary readers are less likely to infer that CI/release regenerate board artifacts

This note is meant to be the brief "how it works" map plus the current proof signal for each feature lane outside SMS.

## Feature lanes

### 1. Public site / wedding website

- Main routes:
  - `/`
  - `/site/:slug`
  - subdomain root via public routing
- What it does:
  - renders the published wedding site
  - respects privacy / invite-only / password gates
  - surfaces sections like hero, story, schedule, travel, registry, gallery, RSVP
- Current proof:
  - build + typecheck are green
  - covered by route and rendering tests including `SiteView.test.ts`, `Home.test.tsx`, public section tests, and section renderer public tests
  - runtime browser proof cleared via:
    - `npm run smoke:site`
    - `npm run smoke:web`
    - `tests/e2e/public-site-quality.spec.ts`

### 2. RSVP

- Main routes:
  - `/rsvp`
  - `/rsvp/:token`
  - `/events`
- What it does:
  - supports guest lookup / invite-token entry
  - supports event-specific RSVP, household inheritance, meal choices, and review/submit flow
  - event RSVP path supports per-event attendance updates
- Current proof:
  - strong test coverage in `RSVP.test.tsx` and `EventRSVP.test.tsx`
  - dedicated strict smoke exists: `npm run smoke:rsvp:strict`
  - guest import / RSVP support lanes also have local guard coverage via `smoke:csvmapper`
  - runtime strict smoke cleared in this session:
    - `npm run smoke:rsvp:strict`

### 3. Guest hub / guest link experience

- Main routes:
  - `/event/:siteRef`
  - guest link states with invite-specific params
- What it does:
  - gives guests one mobile hub for updates, RSVP, travel, photos, recap, and day-of link actions
  - supports guest-specific readback and invite-scoped actions
  - supports guest-language and guest-preview continuity
- Current proof:
  - covered by `EventHub.test.tsx` and `EventHubLiveContent.test.tsx`
  - dedicated proof lanes exist for guest hub QR, guest language continuity, guest preview confidence, and day-of web mode
  - runtime proof cleared via:
    - `tests/e2e/guest-preview-flow.spec.ts`
    - `tests/e2e/travel-guest-hub-mobile.spec.ts`
    - `tests/e2e/dayof-web-mode-offline.spec.ts`
    - `tests/e2e/guest-hub-write-read.spec.ts`
    - `tests/e2e/dayof-web-mode-live.spec.ts`

### 4. Guest contact update

- Main route:
  - `/guest-contact/:token`
- What it does:
  - lets a guest confirm or update shared contact details from their invite path
- Current proof:
  - component and route coverage exists in guest/public submission tests and guest contact page tests
  - live write/read proof passed:
    - `tests/e2e/guest-contact-update-write-read.spec.ts`

### 5. Travel guest portal

- Main surfaces:
  - travel sections on `/site/:slug`
  - guest-hub travel cards from `/event/:siteRef`
- What it does:
  - centralizes hotel block, directions, route cards, stay notes, and weekend travel timing
  - owner-facing landing contract now exists at `/dashboard/builder?tool=travel`
- Current proof:
  - travel section tests and guest hub travel coverage exist
  - structured venue map-link fallback is covered in `src/lib/travelGuestPortal.test.ts`
  - dedicated proof lane exists: `npm run proof:v1:travel-guest-portal`
  - runtime guest-hub / travel proof cleared via:
    - `tests/e2e/travel-guest-hub-mobile.spec.ts`

### 6. Photos / memories / guestbook / recap / vault

- Main routes:
  - `/photos/upload`
  - `/guestbook/:siteRef`
  - `/event/:siteRef/recap`
  - `/vault/:siteSlug`
  - `/vault/:siteSlug/:year`
- What it does:
  - photo upload lets guests add event media
  - guestbook collects written notes
  - recap allows guest recap opt-in / recap retrieval flow
  - vault supports anniversary capsule contributions
  - owner dashboard memories lane manages albums, recap sharing, guest hub QR, review, and organization
- Current proof:
  - public-side tests exist for `PhotoUpload`, `GuestbookSubmit`, `EventRecap`, and `VaultContribute`
  - owner-side tests exist for guest photo hub QR and memories controls
  - dedicated proof lane exists: `npm run proof:v1:photo-memory-flow`
  - runtime proof cleared via:
    - `tests/e2e/photo-memory-flow.spec.ts`
    - `tests/e2e/vault-contribute-write-read.spec.ts`
    - `tests/e2e/guest-hub-qr-print-pack-live.spec.ts`
  - remaining guest-hub QR gap is the mobile QR-to-hub landing rerun, not print-pack export safety

### 7. Guest management

- Main route:
  - `/dashboard/guests`
- What it does:
  - manages invite list, RSVP settings, guest details, address collection, saved segments, guest itinerary drawer, and thank-you note workflow
  - supports deep-link tool landings like:
    - `?tool=guest-details`
    - `?tool=address-collection`
    - `?tool=import-export`
    - `?tool=thank-you-notes`
    - `?tab=rsvp-settings`
- Current proof:
  - route-state helpers and UI tests exist
  - itinerary drawer, RSVP settings, import-review, and guest ops tests are present
  - dedicated proof lane exists: `npm run proof:v1:guests-rsvp-ops`
  - local guard proof passed:
    - `npm run smoke:csvmapper`
    - `npm run smoke:checkin`
  - onboarding-to-guests handoff proof passed:
    - `tests/e2e/quick-start-onboarding-write-read.spec.ts`

### 8. Messaging center (excluding live SMS sending)

- Main route:
  - `/dashboard/messages`
- What it does:
  - supports message templates, audience selection, review queues, send-state history, and comms-center workflows
  - the UI and tests cover composition and operational review
  - live SMS sending remains intentionally out of scope / deferred
- Current proof:
  - message dashboard and detail modal tests exist
  - dedicated proof lane exists: `npm run proof:v1:comms-center`
  - live SMS is not being treated as cleared
  - local guard proof passed:
    - `npm run smoke:messages`
  - runtime dashboard proof cleared via:
    - `tests/e2e/messages-comms-center.spec.ts`
    - `tests/e2e/messages-comms-center-live.spec.ts`
  - remaining delivery-history proof is a deferred provider/send-lane follow-up, not a missing non-SMS dashboard proof

### 9. Registry

- Main route:
  - `/dashboard/registry`
- What it does:
  - manages registry items, gifts, funds, cleanup, duplicate checks, preview safety, and barcode scanning
  - public site renders only sanitized / safe registry links
- Current proof:
  - dashboard tests exist for registry item cards and forms
  - public section tests exist for registry sanitization and guest rendering
  - dedicated proof lane exists: `npm run proof:v1:registry`
  - local guard proof passed:
    - `npm run smoke:registry`
  - local full proof lane passed after stale dashboard-copy assertions were corrected:
    - `npm run proof:v1:registry`
  - live write/read proof passed:
    - `tests/e2e/registry-write-read.spec.ts`

### 10. Seating

- Main routes:
  - `/dashboard/seating`
  - `/dashboard/seating-lookup`
- What it does:
  - supports seating planning, table assignment, readiness states, floor planning, and lookup
  - lookup supports guest-facing or day-of name-to-seat retrieval workflows
- Current proof:
  - seating dashboard and seating component tests exist
  - e2e and continuity proof exist for write/read and continuity
  - dedicated proof lane exists: `npm run proof:v1:seating-continuity`
  - live write/read proof passed:
    - `tests/e2e/seating-write-read.spec.ts`

### 11. Schedule / itinerary

- Main route:
  - `/dashboard/itinerary`
- What it does:
  - manages weekend schedule, guest-visible event sequencing, and owner editing flow
  - also feeds guest-facing schedule surfaces in the site and guest hub
- Current proof:
  - itinerary route content and view tests exist
  - public schedule tests exist for guest-facing section variants
  - runtime guest-facing continuity is exercised through:
    - `tests/e2e/guest-preview-flow.spec.ts`
    - `tests/e2e/travel-guest-hub-mobile.spec.ts`

### 12. Website builder / publish / QR / preview

- Main routes:
  - `/dashboard/builder`
  - internal capture routes when enabled
- What it does:
  - edits the site section-by-section
  - supports preview/share workflow, design/panel deep links, media library, palette/theme, section rail, and QR/share surfaces
  - new landing contracts now support:
    - `?panel=design`
    - `?tool=share`
    - `?tool=qr-codes`
    - `?tool=travel`
- Current proof:
  - builder tests exist for section rail, public renderer, publish UI hints, and component-level behavior
  - build passed on the imported builder UI
  - published-site lookup/runtime proof passed via:
    - `npm run smoke:site`
    - `npm run smoke:web`

### 13. Settings / privacy / team / billing / identity exports

- Main route:
  - `/dashboard/settings`
- What it does:
  - centralizes privacy, site access, team access, RSVP config, billing/account panels, notifications, and identity export tooling
  - now honors deep-link tabs like:
    - `?tab=team`
    - `?tab=privacy`
    - `?tab=site`
    - `?tab=billing`
- Current proof:
  - route-state tests exist
  - panel tests exist for identity exports and related settings panels
  - privacy / site / team / export surfaces compile and route correctly
  - runtime proof cleared via:
    - `tests/e2e/settings-privacy-config.spec.ts`
    - `tests/e2e/settings-rsvp-config.spec.ts`
    - `tests/e2e/wedding-identity-exports.spec.ts`
  - remaining identity-export work is future shipped-runtime upkeep after the next export-affecting deploy, not baseline asset-generation proof

### 14. Collaborator access

- Main route:
  - `/accept-collaborator-invite`
- What it does:
  - allows collaborators to claim access and land in the shared owner experience with the right trust framing
- Current proof:
  - dedicated proof lane exists: `npm run proof:v1:collaborator-access`
  - route coverage and invite tests exist
  - live collaborator permission proof passed:
    - `tests/e2e/collaborator-permission-rls.spec.ts`

### 15. Coordinator / day-of / check-in / QR

- Main routes:
  - `/dashboard/coordinator`
  - QR scanning and day-of mode flows inside coordinator
- What it does:
  - provides guest lookup, issue desk routing, check-in, staffing handoff, guest questions, live task deck, timeline, and day-of messaging
  - QR validation now routes review-needed guests to the issue desk instead of exposing unsafe confirm paths
- Current proof:
  - coordinator integration tests exist, especially for QR routing
  - dedicated proof lanes exist:
    - `npm run proof:v1:coordinator-dayof`
    - `npm run proof:v1:qr-scanner`
    - `npm run smoke:checkin`
  - local guard proof passed:
    - `npm run smoke:checkin`
  - local full proof lane passed:
    - `npm run proof:v1:coordinator-dayof`
  - runtime proof cleared via:
    - `tests/e2e/coordinator-dayof-live.spec.ts`
    - `tests/e2e/dayof-web-mode-offline.spec.ts`

### 16. Planning: tasks, budget, vendors, payments, songs, addresses

- Main route:
  - `/dashboard/planning`
- What it does:
  - combines tasks, budget ledger, vendor tracking, payment milestones, song requests, and address collection
  - budget and vendor areas are now much more aligned with the imported dashboard shell
- Current proof:
  - tests exist for `BudgetTab`, `PlanningOverviewTab`, `VendorsTab`, and related planning utilities
  - dedicated proof lane exists for vendor/budget ledger: `npm run proof:v1:budget-vendor-ledger`
  - runtime proof cleared via:
    - `tests/e2e/planning-budget-vendor-ledger.spec.ts`
    - `tests/e2e/planning-songs-addresses.spec.ts`
    - the broad authenticated production write/read suite, which already covered planning song requests and address collection on `https://dayof.love`

### 17. Name change assistant

- Main route:
  - `/dashboard/planning` with name-change lane
- What it does:
  - manages post-wedding name change roadmap, status vault, account update templates, reminders, and execution sequencing
  - routing supports roadmap / case-setup / status-vault anchor continuation
- Current proof:
  - large dedicated test surface exists around `NameChangePlannerTab` and related helpers
  - dedicated proof lane exists: `npm run proof:v1:name-change-runtime`
  - local full proof lane passed after resume-card label assertions were synced to the current UI language:
    - `npm run proof:v1:name-change-runtime`
  - runtime proof cleared via:
    - `tests/e2e/name-change-runtime.spec.ts`

### 18. Vendor public pages and vendor profile creation

- Main routes:
  - `/vendor/:slug`
  - vendor profile create / template flows
- What it does:
  - renders public vendor pages with safe public links and inquiry packaging
  - owner/vendor tooling supports profile generation and publishing
- Current proof:
  - `VendorProfile.test.tsx` covers safe links/images and inquiry flow
  - `VendorProfileCreate.test.tsx` covers create/generate/publish flow
  - runtime proof cleared via:
    - `tests/e2e/vendor-profile-create-ui.spec.ts`
    - `tests/e2e/vendor-templates-ui.spec.ts`
    - `tests/e2e/vendor-profile-public-inquiry-ui.spec.ts`

### 19. Auth / onboarding / quick start / payment success

- Main routes:
  - `/login`
  - `/signup`
  - onboarding routes
  - `/payment/success`
  - `/payment-required`
- What it does:
  - carries quick-start draft state through login/signup/onboarding
  - payment success now lands in the richer setup-choice flow rather than the old thin waiting room
- Current proof:
  - login/home/product/onboarding/payment tests exist
  - payment success was already confirmed as fixed earlier in live work
  - runtime proof cleared via:
    - `tests/e2e/payment-success-bridge.spec.ts`
    - `tests/e2e/quick-start-onboarding-write-read.spec.ts`

### 20. Owner overview analytics and invite readback

- Main route:
  - `/dashboard`
- What it does:
  - gives owners aggregate website, invite, and guest-journey analytics without leaking invite tokens or guest-private detail
  - keeps analytics detail on owner/planner surfaces only while public and guest routes stay privacy-safe
- Current proof:
  - overview analytics model and readiness tests exist
  - public/privacy browser proof passed:
    - `tests/e2e/analytics-public-privacy.spec.ts`
  - owner readback browser proof passed:
    - `tests/e2e/analytics-owner-live.spec.ts`

## Current blockers / caveats

- SMS is intentionally excluded from this verification pass.
- Large Vitest batches are much less opaque after the thread-pool and logging updates, but the broadest Playwright live lanes can still go quiet in this shell before they return a final verdict.
- The proof wrappers for full-suite, comms-center, analytics, coordinator, registry, and name-change now emit step-progress logging, which makes the slow passes much more debuggable even when they are still sequential and heavy.
- The full-suite live gate no longer accidentally points coordinator/responsive proof at deployed `dayof.love`; it now boots a local preview and validates the current local code instead.
- Shared preview-runtime handling is now consolidated across the main proof scripts, which reduces drift between full-suite, registry, comms-center, seating, guest-preview, guest-hub QR, guest-language, photo-memory, website/invite analytics, and guest RSVP proof lanes.
- The refreshed local full-suite exit gate is now green end-to-end:
  - `npm run proof:v1:full-suite-exit-gate`: passed
- The local preview-backed proof lanes were revalidated after that shared runtime fix:
  - `npm run proof:v1:registry`: passed
  - `npm run proof:v1:comms-center`: passed
  - `npm run proof:v1:seating-continuity`: passed
  - `npm run proof:v1:guest-language-continuity`: passed
  - `npm run proof:v1:guest-hub-qr`: passed
- The guest-preview wrapper stayed noisy in this shell, but the product-facing proof itself is green when run directly:
  - `tests/e2e/guest-preview-flow.spec.ts`: passed
  - `tests/e2e/guest-preview-mobile.spec.ts`: passed
- This session surfaced and fixed two real proof drifts:
  - stale resume-card lifecycle label expectations in `NameChangePlannerTab.test.tsx`
  - stale multi-match copy expectations in `RegistryDashboardRouteContent.test.tsx`
- This session also converted the last major proof-infra drift from a hidden risk into an explicit fix:
  - live coordinator/responsive proof was defaulting to production copy until the exit gate was updated to use a fresh local preview
- The live full-suite exit gate is now green end-to-end as well:
  - `V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate`: passed
- A calmer follow-up pass should do:
  - a calmer broad Vitest pass once the shell is less overloaded

## Practical conclusion

The new UI pass should now be treated as the real shipped interface, not a half-landed experiment. The codebase compiles and builds, the route/deep-link contract layer is in place, and the shipped non-SMS feature lanes now have direct runtime proof across smoke scripts, focused Playwright routes, live write/read checks, and the aggregated local + live full-suite exit gates. The remaining work has moved from feature verification into broader bug sweeping and cleanup.

The maintainability pass is also paying off while verification runs: `NameChangePlannerTab.tsx` is down to **770 lines**, with the workspace-summary, case-setup, execution-sections, generated-checklist, preparation-overview, status-tracking, prewritten-template, next-steps, reminder, recent-activity, and document-workspace lanes split into shared planner panel components. The planner now has focused sidecars in `NameChangePlannerWorkspacePanels.tsx`, `NameChangePlannerOperationalPanels.tsx`, `NameChangePlannerExecutionPanels.tsx`, and `NameChangePlannerDocumentPanels.tsx`, a dedicated shared type registry in `NameChangePlannerPanelTypes.ts`, and the remaining core `NameChangePlannerPanels.tsx` file is down to **49 lines**.

## Confirmed this session

- `npm run build`: passed
- `npm run typecheck -- --pretty false`: passed
- `npm run smoke:csvmapper`: passed
- `npm run smoke:checkin`: passed
- `npm run smoke:messages`: passed
- `npm run smoke:registry`: passed
- `npm run smoke:site`: passed
- `npm run smoke:rsvp:strict`: passed
- `npm run smoke:web`: passed
- `tests/e2e/public-site-quality.spec.ts`: passed
- `tests/e2e/guest-preview-flow.spec.ts`: passed
- `tests/e2e/travel-guest-hub-mobile.spec.ts`: passed
- `tests/e2e/photo-memory-flow.spec.ts`: passed
- `tests/e2e/dayof-web-mode-offline.spec.ts`: passed
- `tests/e2e/wedding-identity-exports.spec.ts`: passed
- `tests/e2e/name-change-runtime.spec.ts`: passed
- `tests/e2e/planning-budget-vendor-ledger.spec.ts`: passed
- `tests/e2e/payment-success-bridge.spec.ts`: passed
- `tests/e2e/vendor-profile-create-ui.spec.ts`: passed
- `tests/e2e/vendor-templates-ui.spec.ts`: passed
- `tests/e2e/vendor-profile-public-inquiry-ui.spec.ts`: passed
- `tests/e2e/messages-comms-center.spec.ts`: passed
- `tests/e2e/messages-comms-center-live.spec.ts`: passed
- `tests/e2e/coordinator-dayof-live.spec.ts`: passed
- `tests/e2e/guest-contact-update-write-read.spec.ts`: passed
- `tests/e2e/settings-privacy-config.spec.ts`: passed
- `tests/e2e/settings-rsvp-config.spec.ts`: passed
- `tests/e2e/seating-write-read.spec.ts`: passed
- `tests/e2e/vault-contribute-write-read.spec.ts`: passed
- `tests/e2e/registry-write-read.spec.ts`: passed
- `tests/e2e/quick-start-onboarding-write-read.spec.ts`: passed
- `tests/e2e/full-suite-three-lanes-responsive.spec.ts`: passed
- `tests/e2e/collaborator-permission-rls.spec.ts`: passed
- `tests/e2e/analytics-public-privacy.spec.ts`: passed
- `tests/e2e/analytics-owner-live.spec.ts`: passed
- `tests/e2e/guest-hub-write-read.spec.ts`: passed
- `tests/e2e/dayof-web-mode-live.spec.ts`: passed
- `tests/e2e/guest-hub-qr-print-pack-live.spec.ts`: passed
- `npm run test:e2e:live`: passed
- `npm run proof:v1:registry`: passed
- `npm run proof:v1:comms-center`: passed
- `npm run proof:v1:seating-continuity`: passed
- `npm run proof:v1:guest-language-continuity`: passed
- `npm run proof:v1:guest-hub-qr`: passed
- `npm run proof:v1:full-suite-exit-gate`: passed
- `V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate`: passed

## Follow-on cleanup and reliability sweep

- Fixed a real async failure-path bug family across planning forms:
  - `src/pages/dashboard/planning/VendorsTab.tsx`
  - `src/pages/dashboard/planning/TasksTab.tsx`
  - `src/pages/dashboard/planning/BudgetTab.tsx`
- Extended the same async failure-path sweep into:
  - `src/pages/dashboard/planning/PaymentsTab.tsx`
- Tightened another planning failure path in:
  - `src/pages/dashboard/planning/BudgetTab.tsx`
- Extended the same in-flight / recovery cleanup into:
  - `src/pages/dashboard/planning/SongRequestsTab.tsx`
- Extended the same in-flight / recovery cleanup into:
  - `src/pages/dashboard/planning/TasksTab.tsx` bulk-complete flow
- Extended the same local error-handling cleanup into:
  - `src/pages/dashboard/planning/VendorsTab.tsx` vendor meta follow-up controls
- Extended the same local error-handling cleanup into:
  - `src/pages/dashboard/planning/PlanningOverviewTab.tsx` starter-suite apply / undo actions
- Failed saves no longer leave the add/edit forms stuck on `Saving...`, and failed task checklist generation no longer leaves the CTA stuck on `Building...`.
- Failed payment updates no longer leave the per-row `Paid` action in an in-flight state without local recovery.
- Failed budget-goal autosaves now surface an explicit error toast instead of silently failing behind the autosave hint.
- The budget autosave status line also stops showing stale `Saved ...` text after a later failed edit, so the save hint no longer overstates what actually persisted.
- The budget autosave status line also ignores older successful saves that resolve after a newer edit has already started, so stale success can’t overwrite newer unsaved state.
- The budget autosave spinner also stays owned by the newest request, so an older save resolving cannot clear `Saving…` while a newer edit is still in flight.
- Stale failed autosaves are also suppressed once a newer edit has started, so older errors cannot toast over the current budget edit flow.
- Playlist-save and RSVP-question actions in Song Requests now expose in-flight state and recover cleanly after a failed save instead of behaving like stateless click targets.
- Task bulk-complete now exposes in-flight state, blocks repeat clicks while saving, and shows a toast if the batch update fails.
- Vendor follow-up/meta controls now catch failed meta saves and show a toast instead of silently dropping the update or leaving an unhandled rejection behind.
- The main planning forms now also pair their recovery with explicit failure feedback:
- Higher-impact planning actions now also pair recovery with explicit failure feedback:
  - `TasksTab.tsx` failed task saves toast
  - `TasksTab.tsx` failed checklist generation toasts
  - `BudgetTab.tsx` failed budget-item saves toast
  - `VendorsTab.tsx` failed vendor saves toast
  - `PlanningOverviewTab.tsx` failed starter-suite apply / undo toasts
- Added focused regression coverage for those failure paths:
  - `src/pages/dashboard/planning/VendorsTab.test.tsx`
  - `src/pages/dashboard/planning/TasksTab.test.tsx`
  - `src/pages/dashboard/planning/BudgetTab.test.tsx`
  - `src/pages/dashboard/planning/PaymentsTab.test.tsx`
  - `src/pages/dashboard/planning/SongRequestsTab.test.tsx`
- `TasksTab.test.tsx` now also covers the failed bulk-complete recovery path.
- `TasksTab.tsx` quick row actions now also fail honestly: the done-toggle and delete buttons are wrapped in local mutation guards, row controls disable while that task mutation is in flight, and failed quick actions now toast instead of silently dropping the click.
- `VendorsTab.test.tsx` now also covers the failed vendor-meta save toast path.
- `VendorsTab.tsx` quick row delete now also fails honestly: list-card delete is wrapped in a local mutation guard, row edit/delete controls disable while that delete is in flight, and failed vendor delete now toasts instead of silently dropping the click.
- The planning tab tests now also assert those failed save/checklist paths surface visible toasts instead of only re-enabling the controls.
- `PlanningOverviewTab.test.tsx` now also covers failed starter-suite apply / undo toast paths.
- `BudgetTab.test.tsx` now also covers the failed budget-goal autosave toast path.
- `BudgetTab.test.tsx` now also covers clearing stale saved-state UI after a later autosave failure.
- `BudgetTab.test.tsx` now also covers the “older autosave resolves after newer edit” race so stale success UI cannot reappear.
- `BudgetTab.test.tsx` now also covers the matching saving-state race so older autosaves cannot clear the in-flight indicator for newer edits.
- `BudgetTab.test.tsx` now also covers suppressing stale autosave error toasts after a newer edit has already taken over.
- `BudgetTab.tsx` quick row delete now also fails honestly: table/card delete is wrapped in a local mutation guard, row edit/delete controls disable while that delete is in flight, and failed delete now toasts instead of silently dropping the click.
- `AddressCollectionTab.tsx` copy actions now also fail honestly: follow-up/link/email/text copy actions expose in-flight state, recover after failed clipboard/download attempts, and now toast instead of silently dropping the copy.
- `AddressCollectionTab.test.tsx` now covers failed address-link and follow-up copy recovery, so the address-collection shortcuts are part of the same planning reliability safety net.
- `PaymentsTab.tsx` and `SongRequestsTab.tsx` copy helpers now also fail honestly: payment-summary and DJ-list copy actions expose in-flight state, recover after failed clipboard/download attempts, and now toast instead of silently dropping the copy.
- `PaymentsTab.test.tsx` and `SongRequestsTab.test.tsx` now also cover failed copy recovery, so these planning handoff shortcuts are part of the same reliability safety net too.
- `VendorsTab.tsx` vendor-brief copy now follows the same rule too: it exposes in-flight state, recovers after failed clipboard/download attempts, and now toasts instead of silently dropping the copy.
- `VendorsTab.test.tsx` now also covers failed vendor-brief copy recovery, so the vendor handoff shortcut is in the same safety net too.
- `NameChangePlannerTab.tsx` now gives planner save/export/template actions an honest inline failure surface too: planner saves are wrapped and report a visible banner on failure, and template/export/packet copy actions now expose in-flight state instead of fire-and-forget behavior.
- `NameChangePlannerTab.test.tsx` now also covers failed planner save and failed planner-export copy, so the name-change planner’s higher-value handoff actions are in the same reliability memory too.
- the planner copy-button states now match reality too: while a template/export/packet copy is in flight, the rest of that button family disables instead of looking clickable while the handler quietly ignores the click.
- `NameChangePlannerTab.test.tsx` now also covers failed template copy and failed institution-packet copy, so the main planner handoff lanes all share the same visible-failure contract.
- `GuestItineraryDrawer.tsx` private RSVP / preview copy actions now also fail honestly: they expose in-flight state, report copy failures through the existing toast channel, and no longer silently drop guest-link copy attempts.
- `GuestItineraryDrawer.test.tsx` now covers failed RSVP-link and failed preview-link copy, so the guest itinerary share shortcuts are part of the same reliability safety net.
- `VaultCard.tsx` share-link and recap-link copy actions now also expose in-flight state and report copy failures through the existing vault error channel instead of silently failing.
- Maintainability follow-through:
  - `src/pages/dashboard/planning/VendorsTab.tsx` now centralizes vendor meta reads and repeated file/milestone mutation helpers
  - current biggest planning UI surfaces are now:
    - `src/pages/dashboard/planning/VendorsTab.tsx` at 963 lines
    - `src/pages/dashboard/planning/BudgetTab.tsx` at 641 lines
    - `src/pages/dashboard/planning/TasksTab.tsx` at 423 lines
- Honest verification note:
  - targeted Vitest lanes for the new planning regression tests started cleanly and then fell back into the same silent runner/session behavior seen elsewhere in this environment, so this pass is recorded as code + diff-hygiene green, not fresh narrow-test green
- Dashboard copy/share honesty sweep continued outside planning:
  - `GuestItineraryDrawer` RSVP/preview copy actions now expose in-flight state and surface copy failures through `onToast`
  - `VaultCard` share-link and recap-link copy actions now expose in-flight state and report failures through the existing vault error channel
  - `DashboardErrorLogs` fingerprint/message copy actions no longer swallow copy failures; they now disable while active and show a retry alert when copy fails
  - `CoordinatorMode` shift snapshot copy no longer assumes success; it now shows an error toast on copy failure
  - `RegistryItemCard` cash-fund copy actions now disable while active and show a specific retry hint instead of a vague generic failure
  - public `RegistrySection` cash-fund Zelle copy now uses the shared copy helper, exposes in-flight / downloaded / retry states, and no longer swallows clipboard failure on the guest-facing surface
  - shared `ShareQrPanel` copy now shows `Copying...`, exposes a retry alert on failure, and reveals the fallback link field when clipboard copy fails, which hardens every guest-photo / settings / itinerary surface that uses the shared panel
  - `VendorProfileCreate` live-URL copy now disables while active and shows an error toast instead of assuming success
  - `EventRecap` now uses action-specific failure copy for recap-link vs story-caption copy errors instead of generic browser-bar fallback wording
  - `EventHub` travel-plan copy now reports failure honestly instead of assuming the shared travel snippet always copies successfully
  - public `music/requestForm` no longer clears guest song ideas before the network write succeeds; failed submits now keep the typed song visible, show an inline error, and leave the action retryable
  - public `contact/interactiveHub` no longer clears typed guest suggestions before the network write succeeds; failed idea submits now keep the draft visible, show an inline error, and leave the action retryable
  - `VaultContribute` no longer drops `submitting` before the final contribution write settles, which keeps the save button honestly disabled through the real end of a guest vault submission
  - `GuestbookSubmit` and `VendorProfile` now clear stale public-form error state as soon as the guest starts editing again, so old failure copy does not keep shadowing corrected input
  - `GuestContactUpdate`, `EventRecap`, and `EventHub` now also clear stale guest-facing status/error copy as soon as the guest edits opt-in/contact fields again
- Auth/onboarding stale-error recovery pass: collaborator-invite auth fields now clear stale auth/claim errors and claim messaging while editing; Quick Start question/follow-up inputs now clear stale retry copy while typing; Wedding Status field edits now clear stale validation errors across status, destination toggle, venue details, address, guest count, and invitation date inputs.
- Public/dashboard stale-error recovery pass: the public RSVP section now clears stale submit failure copy as soon as the guest edits the form again, and the vault entry composer now clears stale save-error copy while the owner updates any note or attachment field.
- RSVP variant parity pass: the multi-event public RSVP variant now clears stale submission failure copy as soon as the guest changes name, email, attendance, guest count, or dietary notes, so the default and multi-event RSVP forms recover the same way.
- Fresh-attempt feedback pass: the public photo upload form now clears stale error/success/upload-name feedback as soon as the guest edits token, identity, note, update toggles, or files; the vault contribution form now clears stale submit-error copy while the guest updates author, title, message, or media type.
- Guided setup stale-error recovery pass: choosing template/palette options, inserting the welcome-note / FAQ starter drafts, and stepping backward now clear stale save-error copy so the setup flow stops looking broken after the user keeps working.
- Vault/setup validation recovery pass: guest vault contribution now clears field-level validation errors as soon as the matching name/message/file controls change, and the setup shell now clears stale validation copy when moving backward between steps.
- Settings share-tools reliability pass: collaborator invite copy/resend now distinguishes true clipboard success from download fallback, guest access link copy now clears stale copied state before retrying and surfaces copy failures honestly, and the wedding-identity manifest/style-kit copy actions now catch clipboard/download failures instead of assuming success.
- Settings account recovery pass: editing partner names now clears stale account-save status, and editing any password field now clears stale password success/error copy so the owner gets a visibly fresh attempt while correcting account settings.
- Guest-dashboard clipboard recovery pass: RSVP follow-up summary, exception checklist, meal checklist, missing-contact list, filtered-email export, checklist markdown, and campaign dry-run copy actions now catch clipboard/download failures and surface honest error toasts instead of assuming every export succeeds.
- Guest/registry export recovery pass: the guest update link export, text RSVP link export, and registry duplicate-review export now all catch clipboard/download failures and surface explicit error toasts instead of failing optimistically.
- Guest-photo export recovery pass: bulk photo share-message copy, bulk known-link copy, and slideshow-plan export now stop overclaiming clipboard success after fallback/failure; slideshow export also surfaces a real fallback text/error path instead of pretending the copy always worked.
- Vault share fallback pass: vault share-link and recap-link actions now surface a visible downloaded-state fallback instead of only changing button state for the pure clipboard-success path.
- Settings site/team recovery pass: editing planner invite fields, planner permissions, site URL slug, or RSVP playlist URL now clears stale success/error state immediately so the owner sees a visibly fresh attempt while updating access and sharing settings.
- Name-change planner copy-fallback pass: template copy, institution-packet copy, and planner-export copy now keep the downloaded fallback honest in the UI instead of still saying `Copied` after `copyTextOrDownload(...)` falls back; planner buttons now distinguish copied vs downloaded states and `NameChangePlannerTab.test.tsx` now guards that behavior.
- Error-log copy fallback pass: the admin error-log fingerprint/message actions now distinguish downloaded fallback from real clipboard success instead of flattening both paths into `Copied`, and `ErrorLogs.test.tsx` now guards the downloaded-label path too.
- Shared QR-panel fallback pass: `ShareQrPanel` now uses explicit copied/downloaded/error state instead of a single copied boolean, so clipboard fallback stops masquerading as pure success across every QR/share surface that reuses the panel; `ShareQrPanel.test.tsx` now guards the downloaded-label path too.
- Guest-photo export notice pass: owner album/share/slideshow controls now carry explicit copied-vs-downloaded notice state instead of a plain `copied` key, so fallback downloads stop reading like pure clipboard success across newest-link, bulk-share, guest-hub, organizer-note, and slideshow-note actions; `guestPhotoExportRecovery.test.ts` now guards those downloaded labels.
- Vendor/profile + address-collection copy-notice pass: the published vendor live-URL button and the owner address-collection copy actions now show downloaded fallback labels in the controls themselves instead of only relying on toasts, and `VendorProfileCreate.test.tsx` plus `AddressCollectionTab.test.tsx` now guard those downloaded-label paths.
- Settings privacy-link notice pass: the invite-only guest access control now carries explicit copied-vs-downloaded notice state instead of a boolean copied flag, so guest-access-link fallback is visible in the control itself and the settings source guard now pins that notice behavior too.
- Guest drawer + planning copy-notice pass: guest RSVP/preview copy actions, payment-summary copy, and DJ-list copy now surface downloaded fallback in the controls themselves instead of snapping straight back to generic copy labels; `GuestItineraryDrawer.test.tsx`, `PaymentsTab.test.tsx`, and `SongRequestsTab.test.tsx` now guard those downloaded-label paths.
- Settings collaborator + guest dashboard copy-notice pass: pending collaborator invite controls now distinguish copied-vs-downloaded link states in-button instead of relying only on invite toasts, and the guest dashboard now carries downloaded fallback labels directly in the visible address-collection / exception / meal / no-contact copy controls after the helper layer returns real copy outcomes; `SettingsTeamAccessPanel.test.tsx` plus `guestDashboardCopyNoticeRecovery.test.ts` now pin that behavior.
- Guest-photo review export truth pass: the review workspace no longer labels JSON export actions like clipboard copies, so chapter and recap export controls now say `Download ... notes` instead of pretending they copy; `guestPhotoExportRecovery.test.ts` now guards that wording.
- Registry guest-link truth pass: the registry hero no longer presents dead guest-view buttons, because it now builds a real guest registry URL from the active site slug, opens that guest view intentionally, and distinguishes copied-vs-downloaded fallback on the visible guest-link and duplicate-review controls; `registryDashboardCopyNotice.test.ts` now pins the slug wiring plus the in-button notice wording.
- Registry cash-fund copy-notice pass: owner Zelle and payout-detail copy buttons now distinguish copied-vs-downloaded fallback in-button instead of hiding the real outcome only in the hint text, and `RegistryItemCard.test.tsx` now guards those downloaded-label states too.
- Public/event copy-notice pass: the event hub travel-plan control, event recap share/caption controls, and coordinator shift-snapshot handoff control now surface copied-vs-downloaded fallback directly in the buttons instead of only through trailing status copy or toasts; `publicShareCopyNoticeRecovery.test.ts` plus the updated `EventHubLiveContent` tests now pin that wording.
- Vendor-brief control truth pass: `VendorsTab.tsx` now carries copied-vs-downloaded state in the visible vendor-brief button instead of leaving the real outcome hidden only in toasts, and `VendorsTab.test.tsx` now guards both the copied and downloaded button states.
- Guest-photo owner label clarity pass: newest-album, upload-link, organizer-note, and slideshow-note controls now use specific copied-vs-downloaded labels instead of vague bare `Copied` / `Downloaded` states, and `guestPhotoExportRecovery.test.ts` now pins those clearer owner-card labels.
- Planner copy-label follow-through pass: the remaining extracted name-change planner panels now say `Copied update`, `Copied packet`, `Copied export`, and `Downloaded update` instead of falling back to bare generic labels, so the planner’s copied-vs-downloaded language now reads consistently across templates, packets, and exports; `NameChangePlannerTab.test.tsx` now guards those more specific labels too.
- Owner link-label specificity pass: vault sharing, collaborator invites, guest contact collection, registry guest-link copy, coordinator shift snapshot, and the settings guest-access control now use action-specific copied-vs-downloaded wording instead of generic `Copied link` / `Downloaded link` / `Copied!` labels, and the matching source guards now pin those clearer owner-facing states.
- Shared QR label-derivation pass: `ShareQrPanel` now derives specific copied/downloaded labels from `copyLabel` automatically when callers do not provide custom wording, so upload / site / RSVP / preview / guest-update QR surfaces stop falling back to generic `Copied` or `Downloaded link` labels; `ShareQrPanel.test.tsx` now guards that shared behavior.
- Planning handoff label-specificity pass: address collection, payment-summary, and DJ-list controls now say `Downloaded address link`, `Downloaded guest follow-ups`, `Downloaded payment summary`, and `Downloaded DJ list` instead of generic link/summary/list wording, and the focused planning tests now pin those more specific handoff labels.
- Planner packet/export label finish pass: the remaining name-change packet/export buttons now echo their real artifact names after copy fallback or success, so the planner says `Copied action packet` and `Downloaded banking and credit packet` instead of generic packet/export labels; `NameChangePlannerTab.test.tsx` now pins that last bit of specificity too.
- Itinerary fresh-attempt recovery pass: the event editor now clears stale save/error banners as soon as the owner changes event name, date, time, location, description, notes, or visibility again, and cancel now clears stale success state too; `itineraryDashboardRecovery.test.ts` now pins that clear-on-edit wiring.
- Itinerary timeline-control recovery pass: the smart-template date/time inputs and bulk-shift target/minutes inputs now also clear stale save/notice state as soon as the owner starts changing the next template or shift attempt, so the whole itinerary workspace follows the same fresh-attempt rule; `itineraryDashboardRecovery.test.ts` now pins that timeline-control wiring too.
- Settings fresh-attempt recovery pass:
  - site visibility/privacy edits now clear stale visibility success/error state while the owner is already adjusting sharing, analytics, playlist, password, and privacy fields again
  - RSVP draft edits now clear stale RSVP save/validation state while the owner is changing meal settings and question drafts
  - notification draft edits now clear stale notification save/error state while the owner is changing digest and alert preferences again
  - source guard added in `src/pages/dashboard/settings/settingsFreshAttemptRecovery.test.ts`
- Registry item editor recovery pass:
  - stale link-import feedback now clears when the owner starts correcting imported registry details like URL, item name, price, store, image, and notes
  - stale barcode lookup feedback now clears when the owner starts a new barcode/manual attempt instead of lingering across the next edit
  - stale save-error state now clears as soon as the owner edits the registry item again
  - vault settings modal edits now clear stale vault save-error state while the owner is adjusting the label or anniversary timing again
  - source guard added in `src/pages/dashboard/registry/registryItemFormRecovery.test.ts`
- Public lookup recovery pass:
  - RSVP guest search now clears stale lookup/submit error state as soon as the guest edits the search field again
  - guest contact update now clears stale lookup/update result copy when the guest switches matched records or changes whole-household scope
  - guest contact identity edits now also clear stale matched-record / household-scope selection so a fresh lookup starts from fresh identity inputs instead of clinging to the last hit
  - source guard added in `src/pages/publicLookupRecovery.test.ts`
- Public access recovery pass:
  - site password gate now hides the stale current error as soon as a guest starts typing a new password attempt, instead of leaving the old failure message stuck on-screen during the retry
  - source guard added in `src/pages/publicAccessRecovery.test.ts`
## 2026-05-19 PT - auth + public purchase fresh-attempt recovery

- Hardened `src/pages/Login.tsx` so stale auth notice/error state clears when a fresh attempt actually starts again:
  - email/password typing clears old login notice state, not just the last error
  - reset-email typing clears stale forgot-password notice/error state too
  - switching between sign-in and forgot-password views now clears old auth feedback instead of carrying it forward
- Hardened `src/sections/components/RegistrySection.tsx` so stale public purchase failure state no longer sticks while a guest retries a different purchase path:
  - opening a new purchase modal clears the previous purchase failure
  - editing the purchaser name clears the previous purchase failure
  - regrouping/resorting the registry clears stale purchase failure state too
- Added source guards in `src/pages/authAccessFreshAttemptRecovery.test.ts`.

## 2026-05-19 PT - owner publish/share drift recovery

- Hardened `src/pages/VendorProfileCreate.tsx` so stale published/copy state no longer survives after the underlying vendor draft changes:
  - draft or setup-form changes now clear the old published card
  - draft or setup-form changes now clear the old live-URL copied/downloaded notice too
- Hardened `src/pages/dashboard/VaultCard.tsx` so stale recap-link copy state no longer survives after recap inputs change:
  - recap style / length / photos-only changes now clear the old recap-link copy notice
  - create/refresh recap actions clear old recap-link copy notice before generating the next draft
- Added/updated guards in:
  - `src/pages/VendorProfileCreate.test.tsx`
  - `src/pages/dashboard/vaultService.test.ts`

## 2026-05-19 PT - timer lifecycle hardening

- Hardened timer-driven owner/public surfaces so delayed status resets and redirects do not keep firing after the UI moves on:
  - `src/pages/VendorProfileCreate.tsx`
    - live URL copied/downloaded notice timer now clears on unmount
  - `src/pages/dashboard/VaultCard.tsx`
    - share-link, recap-link, and delete-confirm timers now clear on unmount
  - `src/components/ui/ShareQrPanel.tsx`
    - copy-status reset timer now clears on unmount
  - `src/pages/PaymentSuccess.tsx`
    - payment polling and delayed navigation timers now clear on unmount
    - delayed redirect scheduling is centralized so old timers do not win after the flow changes
- Added source guards in `src/pages/timerLifecycleRecovery.test.ts`.

## 2026-05-19 PT - dashboard copy timer cleanup

- Hardened timer-driven copy notices across planning and guest dashboard tools so delayed reset callbacks do not keep firing after the UI unmounts:
  - `src/pages/dashboard/planning/PaymentsTab.tsx`
  - `src/pages/dashboard/planning/SongRequestsTab.tsx`
  - `src/pages/dashboard/planning/AddressCollectionTab.tsx`
  - `src/pages/dashboard/guests/GuestItineraryDrawer.tsx`
- Each now tracks its copy-notice timeout through a ref and clears it on unmount before any later state reset can fire.
- Added source guards in `src/pages/dashboard/dashboardCopyTimerCleanup.test.ts`.

## 2026-05-19 PT - dashboard/admin timer cleanup follow-through

- Hardened more timer-driven admin and owner controls so delayed UI resets do not keep firing after their screen unmounts:
  - `src/pages/dashboard/ErrorLogs.tsx`
  - `src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts`
  - `src/pages/dashboard/registry/RegistryItemCard.tsx`
- This covers:
  - admin copy-status reset timers
  - guest-photo export/share-note reset timers
  - registry owner delete-confirm cooldown plus copied-hint timers
- Added source guards in `src/pages/dashboard/dashboardTimerCleanupRecovery.test.ts`.

## 2026-05-19 PT - planner and builder timer cleanup

- Hardened more timer-driven editing surfaces so delayed notice resets do not keep firing after the UI has already moved on:
  - `src/pages/dashboard/planning/NameChangePlannerTab.tsx`
    - account-update template copy notice timer now clears on unmount
    - planner-export copy notice timer now clears on unmount
    - institution-packet copy notice timer now clears on unmount
  - `src/pages/BuilderV2Lab.tsx`
    - builder save-state timer now clears on unmount
    - builder action-notice timer now clears on unmount
- Added source guards in `src/pages/timerLifecycleRecovery.test.ts`.

## 2026-05-19 PT - guest drawer and settings timer follow-through

- Closed two remaining copy-notice timer gaps so both surfaces now clean up every delayed reset path instead of only the main happy path:
  - `src/pages/dashboard/guests/GuestItineraryDrawer.tsx`
    - guest preview-link copy now reuses the same timeout ref + unmount cleanup path as RSVP-link copy
  - `src/pages/dashboard/settings/useSettingsSiteAccessActions.ts`
    - guest access link copy notice now clears through a tracked timeout ref instead of a naked delayed callback
- Added source guards in:
  - `src/pages/dashboard/dashboardCopyTimerCleanup.test.ts`
  - `src/pages/dashboard/settings/settingsSiteAccessActions.test.ts`

## 2026-05-19 PT - dashboard toast timer cleanup

- Hardened dashboard toast systems so delayed toast-removal callbacks do not keep firing after their screen unmounts:
  - `src/pages/dashboard/messages/useMessageDashboardUiState.ts`
  - `src/pages/dashboard/Registry.tsx`
  - `src/pages/dashboard/Vault.tsx`
- Each now tracks toast-removal timers through refs, clears them on unmount, and drops completed timer ids after the toast is removed.
- Added source guards in `src/pages/dashboard/dashboardToastTimerCleanup.test.ts`.

## 2026-05-19 PT - guest and public timer cleanup follow-through

- Closed another timer family across guest and public registry flows so delayed UI callbacks do not keep firing after the surface moves on:
  - `src/sections/components/RegistrySection.tsx`
    - public purchase modal close timer now clears on unmount
    - public cash-fund Zelle status reset timer now clears on unmount
  - `src/pages/dashboard/guests/useGuestDashboardCrudActions.ts`
    - guest delete confirmation timer now clears on unmount and reuses a tracked ref
- Added source guards in `src/pages/dashboard/dashboardGuestAndPublicTimerCleanup.test.ts`.

## 2026-05-19 PT - dashboard load-timeout cleanup

- Hardened dashboard data-load timeout races so old timeout callbacks do not keep running after the real data load already wins:
  - `src/pages/dashboard/useVaultDashboardData.ts`
  - `src/pages/dashboard/registry/useRegistryDashboardData.ts`
- Both now use a timed-load helper that clears the scheduled reject timer in `finally` after the promise settles.
- Added source guards in:
  - `src/pages/dashboard/vaultService.test.ts`
  - `src/pages/dashboard/registry/registryDashboardCopyNotice.test.ts`

## 2026-05-19 PT - dashboard stale-user reset cleanup

- Fixed stale owner-dashboard state when the active user/session disappears:
  - `src/pages/dashboard/registry/useRegistryDashboardData.ts`
    - now resets site slug, items, thank-you ledger, refresh policy state, and related counters instead of leaving the last owner snapshot hanging around
  - `src/pages/dashboard/useOverviewDashboardData.ts`
    - now resets stats, interactive suggestions, recent activity, draft brief state, and name-change overview state when there is no active user
- Added source guards in:
  - `src/pages/dashboard/registry/registryDashboardCopyNotice.test.ts`
  - `src/pages/dashboard/overviewQueryBounds.test.ts`

## 2026-05-19 PT - guest and vault stale-session reset cleanup

- Fixed more partial-reset dashboard hooks so losing the active user/site context clears the whole surface instead of leaving pieces of the last session behind:
  - `src/pages/dashboard/guests/useGuestDashboardData.ts`
    - now resets guests, site info, RSVP config state, itinerary filters, conflict state, and audit feed state when there is no active user/site context
  - `src/pages/dashboard/useVaultDashboardData.ts`
    - now resets drive health/connectivity state, storage provider, couple identity state, and vault content together through a shared reset helper
- Added source guards in:
  - `src/pages/dashboard/guests/guestService.test.ts`
  - `src/pages/dashboard/vaultService.test.ts`

## 2026-05-19 PT - messages and guest-photo stale-session reset cleanup

- Fixed two more dashboard hooks that were leaving partial state behind after the active user/session disappeared:
  - `src/pages/dashboard/messages/useMessageDashboardData.ts`
    - now resets wedding site, recipients, deliveries, SMS preview state, itinerary audience state, and role/permission state through a shared reset helper
  - `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts`
    - now resets publication state, events, buckets, uploads, AI state, guestbook/prospect state, upload-link state, and window drafts through a shared reset helper
- Added source guards in `src/pages/dashboard/dashboardStaleSessionReset.test.ts`.

## 2026-05-19 PT - guest detail stale-context cleanup

- Fixed the guest detail/drawer hook so guest-focused subflows do not outlive the active site context:
  - `src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts`
    - now resets drawer guest state, itinerary detail state, guest audit entries, assisted RSVP state, check-in hint state, and invite-rotation state when the active site context disappears
- Added source guards in `src/pages/dashboard/guests/guestService.test.ts`.

## 2026-05-19 PT - settings stale-session reset cleanup

- Fixed sticky owner-settings state in `src/pages/dashboard/settings/useSettingsDashboardUiState.ts` so losing the active user context now clears the full settings shell instead of leaving the last owner session hanging around:
  - resets billing, privacy/share state, RSVP/settings drafts, notifications state, collaborator invite state, translation state, wedding/site identity state, and related success/error feedback through a shared reset helper
  - also resets that same sticky state when the signed-in user changes without a full settings-shell remount
  - also resets stale planner invite state when `readPlannerInvite(...)` no longer finds a saved invite for the current site/user context
- Added source guards in `src/pages/dashboard/settings/settingsStaleSessionReset.test.ts`.

## 2026-05-19 PT - guest route-support stale-context cleanup

- Fixed `src/pages/dashboard/guests/useGuestDashboardRouteSupport.ts` so guest dashboard route-level UI does not leak across missing-site contexts:
  - now clears any open confirm dialog when there is no active `weddingSiteId`
  - now skips planner-role read/write persistence when there is no active site instead of falling back to a shared `"global"` key
- Added source guards in `src/pages/dashboard/guests/guestRouteSupportRecovery.test.ts`.

## 2026-05-19 PT - dashboard interaction reset cleanup

- Fixed transient interaction state so dashboard editors and overlays do not outlive the active site context:
  - `src/pages/dashboard/useItineraryDashboardData.ts`
    - now tracks whether itinerary data is backed by an active site instead of flattening missing-site and empty-itinerary states together
  - `src/pages/dashboard/useItineraryDashboardUiState.ts`
    - now resets open event-form state, selected event state, timeline shift state, save feedback, and draft form state when there is no active itinerary site context
  - `src/pages/dashboard/guests/useGuestDashboardUiState.ts`
    - now resets guest transient interaction state when the active guest site disappears or changes, including selected guests, open modals/menus, edit/add drafts, delete confirmations, and other stale workspace UI
- Added source guards in `src/pages/dashboard/dashboardInteractionReset.test.ts`.

## 2026-05-19 PT - operator dashboard context reset cleanup

- Fixed more operator-heavy dashboard surfaces so site/session loss does not leave the last workspace hanging around:
  - `src/pages/dashboard/messages/useMessageDashboardUiState.ts`
    - now resets transient message-composer/history/viewer state when the active messaging site disappears or changes
  - `src/pages/dashboard/coordinator/useCoordinatorDashboardData.ts`
    - now resets coordinator site data, issue/qna/timeline state, and operator session/draft state when the active user/site context disappears or bootstrap fails
  - `src/pages/dashboard/coordinator/useCoordinatorDashboardUiState.ts`
    - now resets transient coordinator command-jump, override, and summary-feedback state when the active coordinator site disappears or changes
- Added source guards in `src/pages/dashboard/dashboardOperatorContextReset.test.ts`.

## 2026-05-19 PT - seating workspace reset cleanup

- Fixed `src/pages/dashboard/seating/useSeatingDashboardData.ts` so losing the active seating site clears the full seating workspace instead of leaving stale event/table/assignment state behind.
- Fixed `src/pages/dashboard/seating/useSeatingDashboardInteractionState.ts` so transient seating workspace UI resets when the active site disappears or changes:
  - editing/add-table state
  - seat picker state
  - check-in workspace state
  - reset/auto-table dialogs
  - selected table / drag state
  - canvas zoom/fullscreen state
- Threaded the active site context into `src/pages/dashboard/Seating.tsx`.
- Added source guards in `src/pages/dashboard/dashboardWorkspaceReset.test.ts`.

## 2026-05-19 PT - guest photo and planning workspace reset cleanup

- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts` so the guest-photo owner workspace now has an explicit interaction reset helper for stale success/error state, filters, draft bucket controls, slideshow preview state, and working-bucket progress.
- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoBucketWorkspace.ts` so the in-memory bucket upload workspace resets cleanly when the active photo site changes or disappears instead of preserving the last site’s pending bucket/upload workspace.
- Wired `src/pages/dashboard/GuestPhotoSharing.tsx` so guest-photo interaction state and the bucket workspace both reset when the active site changes or goes missing outside demo mode.
- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts` so a newly loaded site without saved photo buckets now gets a clean empty bucket workspace instead of accidentally inheriting the previous site’s in-memory bucket bundle.
- Fixed `src/pages/dashboard/Planning.tsx` so the planning dashboard now resets stale owner workspace state when:
  - the signed-in user changes
  - the active planning site lookup comes back empty
  - the active planning site changes
  - the initial planning load throws
- That planning reset now clears stale tasks, budget/vendors, site metadata, permissions/roles, and the embedded name-change workspace instead of quietly preserving the previous owner/site snapshot.
- Added source guards in `src/pages/dashboard/dashboardWorkspaceReset.test.ts`.

## 2026-05-19 PT - registry and vault owner workspace reset cleanup

- Fixed `src/pages/dashboard/registry/useRegistryDashboardData.ts` so an empty registry site lookup now resets dashboard state instead of quietly leaving the previous site snapshot on screen.
- Fixed `src/pages/dashboard/Registry.tsx` so transient owner workspace state now resets when the active registry site changes or disappears:
  - search/filter state
  - add/edit form state
  - alert/image issue toggles
  - bulk import modal and draft URLs
  - actions menu state
  - thank-you sync busy state
- Fixed `src/pages/dashboard/Vault.tsx` so stale vault entry-form and config-edit state now reset when the active vault site changes or disappears instead of carrying a previous site’s open workspace forward.
- Added source guards in `src/pages/dashboard/dashboardOwnerWorkspaceReset.test.ts`.

## 2026-05-19 PT - operator utility reset cleanup

- Fixed `src/pages/dashboard/RsvpBoard.tsx` so the RSVP board now resets stale rows, filter state, last-refreshed state, and load errors when the signed-in user or active site context disappears instead of leaving the previous board snapshot hanging around.
- Fixed `src/pages/dashboard/SeatingLookup.tsx` so the seating lookup now resets stale rows/events/query state when site context disappears and clears its live search state when the active site changes.
- Fixed `src/pages/dashboard/AuditLogs.tsx` so stale audit rows, filters, search, and error state now reset when the signed-in user disappears or changes.
- Fixed `src/pages/dashboard/ErrorLogs.tsx` so stale admin/error-log state now resets when the signed-in user disappears or changes, and stale loaded rows/details are cleared whenever admin access is no longer active.
- Added source guards in `src/pages/dashboard/dashboardUtilityReset.test.ts`.

## 2026-05-19 PT - coordinator and itinerary modal reset cleanup

- Fixed `src/pages/dashboard/CoordinatorMode.tsx` so page-local interaction state now resets when the active coordinator site changes or disappears:
  - handoff busy state
  - issue busy state
  - shift snapshot copy notice
  - selected issue state
  - local issue draft workspace
- This closes the last local coordinator page states that could still outlive the shared coordinator UI/data reset hooks.
- Fixed `src/pages/dashboard/EventGuestManagerModal.tsx` so switching itinerary events now resets stale modal workspace state before loading the next event:
  - confirmation dialog state
  - prior guest list and invited set
  - bulk busy state
  - guest search query
- The modal now also clears that state on unmount, so it does not reopen carrying the last event’s in-progress workspace.
- Added source guards in `src/pages/dashboard/dashboardOperatorContextReset.test.ts` and `src/pages/dashboard/eventGuestManagerRecovery.test.ts`.

## 2026-05-19 PT - editor draft rehydrate cleanup

- Fixed `src/pages/dashboard/VaultEditModal.tsx` so loading a different vault config now rehydrates the modal draft instead of preserving the previous label/year/manual-edit state.
- Fixed `src/pages/dashboard/registry/RegistryItemForm.tsx` so changing the edited registry item now fully rehydrates the local draft and clears stale lookup/import/save state:
  - draft fields
  - source mode
  - URL and barcode inputs
  - import preview and confidence state
  - duplicate warning
  - barcode lookup state
  - save error / loading flags
- Fixed `src/pages/dashboard/seating/SeatingDashboardComponents.tsx` so the seating `TableForm` now rehydrates name/capacity/shape/layout/notes when a different table is loaded instead of carrying the previous table draft forward.
- Added source guards in `src/pages/dashboard/registry/registryItemFormRecovery.test.ts`.

## 2026-05-19 PT - public route draft reset cleanup

- Fixed `src/pages/PhotoUpload.tsx` so the upload form now treats a changed invite/link context like a fresh page:
  - route params now track router search changes instead of freezing the first URL
  - token, guest fields, note, file selection, update toggles, and feedback reset when the upload link context changes
- Fixed `src/pages/AcceptCollaboratorInvite.tsx` so switching invite tokens now resets stale auth/claim state instead of carrying the last invite’s email/password/claim progress into the next one.
- Invite lookup hydration now rebuilds the sign-in/sign-up drafts from the new invite email/name instead of preserving passwords or unrelated form leftovers from the prior invite.
- Added source guards in `src/pages/publicRouteDraftReset.test.ts`.

## 2026-05-19 PT - event share route reset cleanup

- Fixed `src/pages/EventHub.tsx` so guest-hub route/access context no longer freezes on first render:
  - search params now track router changes
  - invite/access-derived public state resets when the slug or query context changes
  - old opt-in/share/travel/announcement/handoff state no longer lingers while the next hub context loads
- Fixed `src/pages/EventRecap.tsx` so recap route/access context now resets cleanly when the slug or query context changes:
  - search params now track router changes
  - recap data, opt-in draft state, and share/copy state reset before the next recap context loads
- Added source guards in `src/pages/publicShareRouteReset.test.ts`.

## 2026-05-19 PT - auth and payment route reset cleanup

- Fixed `src/pages/VendorProfileCreate.tsx` so vendor seed params now come from live router search params, and route changes reset stale draft/publish/share state instead of leaving the previous vendor context open.
- Fixed `src/pages/Signup.tsx` so collaborator-invite route changes now rebuild the invite email draft and clear stale password/error/loading state instead of carrying the last invite attempt forward.
- Fixed `src/pages/Login.tsx` so invite-driven sign-in state now resets cleanly when the invite route context changes, including the current view, password draft, reset-email draft, and stale auth feedback.
- Fixed `src/pages/PaymentSuccess.tsx` so checkout confirmation now restarts polling from a clean baseline when the `session_id` in the URL changes instead of staying attached to the first checkout context it saw.
- Added source guards in `src/pages/publicAuthRouteReset.test.ts`.

## 2026-05-19 PT - public invite route reset cleanup

- Fixed `src/pages/PaymentRequired.tsx` so payment-route query changes now clear stale loading/check-status/error state instead of leaving the previous attempt’s billing message hanging around.
- Fixed `src/pages/GuestbookSubmit.tsx` so a changed guestbook invite/query context now resets the local guestbook draft and stale submit feedback before the next invite context is used.
- Fixed `src/pages/GuestContactUpdate.tsx` so invite/query changes now reset lookup state, selected record state, and the in-progress contact draft instead of carrying one guest’s search/update workspace into the next context.
- Fixed `src/pages/VaultContribute.tsx` so invite/query changes now reset file uploads, voice-recording state, submit errors, and the contribution draft, and vault reloads now follow the current `vaultQaOpen` query context.
- Added source guards in `src/pages/publicInviteRouteReset.test.ts`.

## 2026-05-19 PT - dashboard route flag sync cleanup

- Fixed `src/pages/dashboard/useOverviewDashboardData.ts` so overview detail mode now follows live router search params instead of freezing the first `details=1` value it saw.
- Fixed `src/pages/dashboard/messages/useMessageDashboardUiState.ts` so message sending details now stay synced to the current `details` route flag instead of only the initial URL.
- Fixed `src/pages/dashboard/Vault.tsx` so the anniversary-capsules deep link now follows the current route query instead of only the first `tool=anniversary-capsules` render.
- Fixed `src/pages/dashboard/Planning.tsx` and `src/pages/dashboard/useOverviewDashboardRouteSupport.ts` so planning QA mode and overview proof mode now derive from the current route query instead of stale first-render URL state.
- Added source guards in `src/pages/dashboard/dashboardRouteFlagReset.test.ts`.

## 2026-05-19 PT - QA route flag follow-through cleanup

- Fixed `src/pages/dashboard/Settings.tsx` so identity export QA mode now follows live router search params instead of freezing the first `identityExportsQa=1` value it saw.
- Fixed `src/pages/dashboard/planning/PlanningOverviewTab.tsx` so starter suite QA visibility now follows the current route query instead of the first render only.
- Fixed `src/pages/dashboard/useVaultDashboardData.ts` so Google Drive OAuth return handling now reads the live router search params for `error`, `google_drive_code`, `code`, and `state`.
- Fixed `src/pages/onboarding/QuickStart.tsx` so quick start debug/reset flags now follow live router search params instead of only the initial URL.
- Added source guards in `src/pages/dashboard/dashboardQaRouteSync.test.ts`.

## 2026-05-19 PT - public access helper route sync cleanup

- Fixed `src/pages/PhotoUpload.tsx` helper wiring so access and identity payload builders can accept the current router search params directly instead of always reaching back to `window.location.search`.
- Fixed `src/pages/EventRecap.tsx` helper wiring so recap guest-hub access helpers can accept the current router search params directly, including access header generation.
- Fixed `src/pages/EventHub.tsx` click tracking so it now reuses the current route-derived access payload instead of rebuilding access state from `window.location.search`.
- Added source guards in `src/pages/publicAccessHelperRouteSync.test.ts`.

## 2026-05-19 PT - guest dashboard storage scope cleanup

- Fixed `src/pages/dashboard/guests/guestDashboardStorage.ts` so guest follow-up presets, saved segments, follow-up tasks, and campaign logs can now be stored per wedding site instead of one global owner bucket.
- Fixed `src/pages/dashboard/guests/useGuestDashboardUiState.ts` so guest dashboard local storage now loads and writes against the active site scope, and clears back to defaults while no site is active.
- Fixed `src/pages/dashboard/Guests.tsx` so the guest dashboard UI state hook now receives the active `weddingSiteId`, preventing one site’s saved guest-ops workspace from bleeding into another.
- Added scoped-storage guards in `src/pages/dashboard/guests/guestDashboardStorage.test.ts` and updated source guards in `src/pages/dashboard/dashboardInteractionReset.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/lib/superNiceLaunchBacklogSafety.test.ts`.

## 2026-05-19 PT - guest photo storage scope cleanup

- Fixed `src/pages/dashboard/guestPhotoSharingUtils.ts` so remembered guest-photo bucket/upload links can now be stored per wedding site instead of one global owner bucket.
- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts` so guest-photo UI storage now hydrates from the active site scope and clears back to an empty link set while no site is active.
- Fixed `src/pages/dashboard/GuestPhotoSharing.tsx` so the guest-photo dashboard writes remembered links back through the active `siteId` scope and avoids recreating the old global key during unloaded states.
- Added scoped-storage guards in `src/pages/dashboard/guestPhotoSharingUtils.test.ts` and updated source guards in `src/pages/dashboard/dashboardWorkspaceReset.test.ts`, `src/lib/dashboardDataBoundary.test.ts`, and `src/lib/superNiceLaunchBacklogSafety.test.ts`.

## 2026-05-19 PT - message photo link scope cleanup

- Fixed `src/pages/dashboard/messages/messageDashboardUtils.ts` so stored photo-link suggestions can now be read per wedding site instead of one global message helper bucket.
- Fixed `src/pages/dashboard/Messages.tsx` so message composer photo-link counts and `[PHOTO LINK]` prefill now use the active `weddingSite.id`, preventing one site’s remembered photo link from preloading another site’s message draft.
- Added scoped-link guards in `src/pages/dashboard/messages/messageDashboardUtils.test.ts` and `src/pages/dashboard/dashboardMessagePhotoScope.test.ts`.

## 2026-05-19 PT - public section route sync cleanup

- Fixed `src/sections/interactiveSectionService.ts` so shared interactive-section public actions can accept current router search params instead of always reaching into `window.location.search`.
- Fixed `src/sections/variants/contact/interactiveHub.tsx` and `src/sections/variants/music/requestForm.tsx` so poll, quiz, and suggestion actions now pass the live router search params through the shared public helper layer.
- Fixed `src/sections/components/RsvpSection.tsx` and `src/sections/variants/rsvp/multiEvent.tsx` so public RSVP sections now derive slug/access context from live router location/search params instead of frozen `window.location` reads.
- Added route-sync guards in `src/sections/publicSectionRouteSync.test.ts` and updated `src/sections/interactiveSectionService.test.ts`.

## 2026-05-19 PT - public access helper follow-through cleanup

- Fixed `src/pages/GuestbookSubmit.tsx`, `src/pages/GuestContactUpdate.tsx`, and `src/pages/VaultContribute.tsx` so guestbook/contact/vault access helper builders now accept live router search params from the page instead of re-reading `window.location.search` internally.
- Fixed `src/pages/VaultContribute.tsx` so invite-token capture and contribution access payloads now stay aligned with the current router search params all the way through config loads and submit flows.
- Added route-sync guards in `src/pages/publicAccessPayloadRouteSync.test.ts`.

## 2026-05-19 PT - public registry purchase memory scope cleanup

- Fixed `src/sections/components/RegistrySection.tsx` so guest-side remembered registry purchase memory is now stored per wedding site instead of one global public bucket.
- Fixed the public registry cards so remembered purchase state now rehydrates from the active `weddingSiteId` scope and updates through that same scope after a purchase.
- Added scoped-memory guards in `src/sections/components/RegistrySection.test.tsx` and `src/sections/publicRegistryMemoryScope.test.ts`.

## 2026-05-19 PT - public guest language scope cleanup

- Fixed `src/lib/guestLanguagePreference.ts` so stored guest language preferences can now be read and written per public route scope instead of one global language bucket.
- Fixed `src/pages/RSVP.tsx`, `src/pages/EventHub.tsx`, `src/pages/EventRecap.tsx`, and `src/pages/PhotoUpload.tsx` so guest-language memory now follows the active invite/site context instead of reusing a different wedding's remembered language choice.
- Fixed `src/pages/SiteView.tsx` so the site default language only applies when there is no stored guest-language preference for the active `resolvedSlug`.
- Added scoped-language guards in `src/lib/guestLanguagePreference.test.ts` and `src/pages/publicLanguageScope.test.ts`.

## 2026-05-19 PT - public quote guestbook scope cleanup

- Fixed `src/sections/variants/quotes/guestbook.tsx` so local public guestbook memory is now scoped by `siteSlug` instead of only the guestbook headline, preventing two weddings with the same headline from sharing remembered notes in one browser.
- Fixed the quote guestbook component so changing `siteSlug` now rehydrates the local guestbook entries from the active site scope instead of carrying the previous site's in-memory notes forward.
- Added scoped-memory coverage in `src/sections/variants/quotes/publicQuotes.test.tsx`.

## 2026-05-19 PT - RSVP continuity scope cleanup

- Fixed `src/pages/rsvpTypes.ts` so RSVP continuity storage keys can now be scoped per wedding site instead of relying on one global browser heartbeat key.
- Fixed `src/pages/RSVP.tsx`, `src/pages/EventRSVP.tsx`, and `src/pages/runRsvpGuestLookup.ts` so guest RSVP continuity refreshes now track the active site slug and only react to continuity updates for that same wedding context.
- Fixed `src/pages/dashboard/messages/useMessageDashboardContinuitySync.ts` and `src/pages/dashboard/Messages.tsx` so the owner message dashboard now listens for RSVP continuity updates only from the active `site_slug`, instead of any wedding's RSVP storage pulse.
- Added scoped-continuity guards in `src/pages/rsvpContinuityStorage.test.ts` and `src/pages/rsvpContinuityScope.test.ts`.

## 2026-05-19 PT - public interactive state reset cleanup

- Fixed `src/sections/variants/contact/interactiveHub.tsx` so site-scoped poll/quiz counters now rehydrate when the active `siteSlug` changes instead of carrying the previous site's in-memory counts forward.
- Fixed the interactive hub so selected poll/quiz answers, open-prompt suggestions, draft input, and suggestion feedback now reset when the public site context changes.
- Fixed `src/sections/variants/music/requestForm.tsx` so song-request draft state, success/error feedback, and recent local suggestions now clear when the active `siteSlug` or prompt context changes.
- Added public-state reset guards in `src/sections/publicInteractiveStateReset.test.ts`.

## 2026-05-19 PT - public section selection reset cleanup

- Fixed `src/sections/components/ScheduleSection.tsx` and `src/sections/variants/schedule/dayTabs.tsx` so the selected schedule day now resets to the current first available day when the rendered schedule groups change, instead of clinging to a stale first-render choice.
- Fixed `src/sections/variants/music/playlist.tsx` and `src/sections/variants/menu/tabs.tsx` so the active playlist/course tab now resets when the underlying section data changes.
- Fixed `src/sections/variants/faq/accordion.tsx` so the open FAQ item and active tabbed category now rebuild from the current FAQ data instead of carrying the previous section's selection state forward.
- Added public-selection reset guards in `src/sections/publicSelectionReset.test.ts`.

## 2026-05-19 PT - public gallery and quotes selection reset cleanup

- Fixed `src/sections/variants/gallery/carousel.tsx` so the active gallery slide now resets when the image collection changes instead of pointing at a stale index from the previous set.
- Fixed `src/sections/variants/gallery/filmStrip.tsx` so the hero image, lightbox selection, and glide pause state now reset when the filmstrip image collection changes.
- Fixed `src/sections/variants/gallery/polaroid.tsx` so the open lightbox selection now closes when the polaroid image collection changes.
- Fixed `src/sections/variants/quotes/carousel.tsx` so the active quote resets when the quote list changes instead of carrying the previous carousel position forward.
- Added public gallery/quotes reset guards in `src/sections/publicGallerySelectionReset.test.ts`.

## 2026-05-19 PT - public media and FAQ state reset cleanup

- Fixed `src/sections/components/FaqSection.tsx` so local FAQ search, open question state, and active category now reset when the visible FAQ set changes instead of carrying stale filters forward.
- Fixed `src/sections/variants/gallery/grid.tsx` and `src/sections/variants/gallery/masonry.tsx` so open gallery lightboxes now close when the underlying image collection changes.
- Fixed `src/sections/variants/video/full.tsx` and `src/sections/variants/video/inline.tsx` so local video playback state now resets when the backing video URL, thumbnail, or layout context changes.
- Added public media/FAQ reset guards in `src/sections/publicMediaStateReset.test.ts`.

## 2026-05-19 PT - public RSVP state reset cleanup

- Fixed `src/sections/components/RsvpSection.tsx` so inline RSVP confirmation state now resets when the site slug, route search params, or displayed RSVP context changes, instead of keeping the previous success state alive across a new public context.
- Fixed `src/sections/variants/rsvp/multiEvent.tsx` so the multi-event RSVP draft, submission status, and error state now clear when the public RSVP context changes.
- Added public RSVP reset guards in `src/sections/publicRsvpStateReset.test.ts`.

## 2026-05-19 PT - public prop-seeded state reset cleanup

- Fixed `src/sections/components/RegistrySection.tsx` so the public purchase modal now clears purchaser name, loading state, and success state when the active registry item changes, instead of reusing the previous item's modal workspace.
- Fixed `src/sections/variants/countdown/simple.tsx` so countdown time recomputes immediately when the target date changes, instead of waiting for the next interval tick to catch up.
- Fixed `src/sections/variants/quotes/grid.tsx` so quote reveal animation state now resets when quote content changes, instead of treating updated quote cards like the old cards that were already revealed.
- Fixed `src/sections/variants/custom/customSection.tsx` so custom-block reveal state now resets when block content changes, instead of carrying the previous block's in-view state forward.
- Added prop-seeded public-state guards in `src/sections/publicPropSeededStateReset.test.ts`.

## 2026-05-19 PT - modal transient reset cleanup

- Fixed `src/pages/dashboard/messages/MessageDetailModal.tsx` so retry/send-now/reschedule/cancel-schedule busy state now resets when the active message changes, instead of carrying action progress from the previous message into the next detail view.
- Fixed `src/components/billing/BillingModal.tsx` so checkout loading and error state now reset when the active user or current plan changes, instead of leaving the previous modal attempt stuck on the next billing context.
- Added modal transient-state guards in `src/pages/dashboard/modalTransientReset.test.ts`.

## 2026-05-19 PT - builder route sync cleanup

- Fixed `src/builder/components/BuilderShell.tsx` so builder route flags now follow live router search params instead of frozen `window.location.search` reads from the first render.
- Auto-publish, travel-route focus, template-gallery open, design-panel open, coachmark-tour open, and publish-checklist open now all key off the current builder route context.
- Added builder route-sync guards in `src/builder/components/builderRouteSync.test.ts`.

## 2026-05-19 PT - builder and planning route follow-through cleanup

- Fixed `src/builder/components/BuilderTopBar.tsx` so photo tips and publish checklist helper surfaces now reopen from live route changes instead of only honoring their first-render querystring state.
- Fixed `src/pages/dashboard/Planning.tsx` so planning tab sync now reads live router search params instead of direct `window.location.search`, which keeps tab selection aligned with the current dashboard route context.
- Removed the obsolete planning history patching path now that tab sync is router-driven, so the dashboard no longer carries custom global location-event plumbing it does not need.
- Added follow-through guards in `src/pages/dashboard/planningRouteSync.test.ts` and extended `src/builder/components/builderRouteSync.test.ts`.

## 2026-05-19 PT - dashboard route default recovery cleanup

- Fixed `src/pages/dashboard/Planning.tsx` so removing the `tab` query now returns the planning workspace to `overview` instead of leaving the last forced tab stuck on screen.
- Fixed `src/pages/dashboard/Settings.tsx` so removing route-tab overrides now returns settings to the default `account` tab instead of leaving the previously forced tab hanging around.
- Fixed `src/pages/dashboard/Guests.tsx` so route-driven guest modes now fall back to normal defaults when query overrides disappear, including guests tab, view mode, filter status, insights visibility, and ops menu state.
- Extended `src/pages/dashboard/planningRouteSync.test.ts` with default-recovery guards across planning, settings, and guests.

## 2026-05-19 PT - overview intelligence dismissal scope cleanup

- Fixed `src/pages/dashboard/useOverviewDashboardRouteSupport.ts` and `src/pages/dashboard/overviewUtils.ts` so overview intelligence dismissals now scope to the active site instead of one global browser bucket.
- That means dismissing readiness/intelligence prompts for one wedding no longer hides those prompts for a different active wedding in the same browser.
- Added coverage in `src/pages/dashboard/overviewUtils.test.ts` and route-support guards in `src/pages/dashboard/overviewDismissalScope.test.ts`.

## 2026-05-19 PT - message composer template scope cleanup

- Fixed `src/pages/dashboard/messages/messageDashboardUtils.ts` so saved composer templates now store per wedding site instead of one global browser bucket, while still migrating legacy global templates into the active site scope.
- Fixed `src/pages/dashboard/messages/useMessageDashboardUiState.ts` so the message dashboard now rehydrates saved composer templates from the current wedding-site context whenever the active site changes.
- Fixed `src/pages/dashboard/messages/useMessageComposerDraftActions.ts` so saving and deleting reusable composer templates now writes back through the active wedding-site scope instead of a shared global key.
- Fixed `src/pages/dashboard/useVaultDashboardData.ts` and `src/pages/dashboard/vaultReleaseNoticeStorage.ts` so vault unlock notices now scope to the active wedding site instead of one global browser bucket, which keeps one wedding's anniversary notice memory from suppressing another wedding's unlock toasts.
- Added scoped template storage, legacy migration, and vault notice scope guards in `src/pages/dashboard/messages/messageDashboardUtils.test.ts`, `src/pages/dashboard/vaultReleaseNoticeStorage.test.ts`, and `src/pages/dashboard/vaultService.test.ts`.

## 2026-05-19 PT - dashboard pin and name-change preference scope cleanup

- Fixed `src/pages/dashboard/dashboardToolLibrary.ts`, `src/components/dashboard/DashboardLayout.tsx`, `src/pages/dashboard/MoreTools.tsx`, and `src/pages/dashboard/OverviewDashboardLiveContent.tsx` so dashboard sidebar pins and Home shortcuts now scope to the active wedding site instead of one global browser bucket.
- That means one wedding's pinned-tool layout no longer bleeds into another wedding's dashboard when the same owner switches active sites in the same browser.
- Fixed `src/pages/dashboard/planning/nameChangePlannerUi.ts`, `src/pages/dashboard/planning/NameChangePlannerTab.tsx`, and `src/pages/dashboard/planning/PlanningDashboardTabContent.tsx` so name-change admin visibility and collapsed-section preferences now scope to the active planning site and rehydrate when the active wedding changes.
- Added scoped dashboard pin and name-change preference guards in `src/pages/dashboard/dashboardToolLibrary.test.ts` and `src/pages/dashboard/planning/nameChangePlannerUi.test.ts`.

## 2026-05-19 PT - scoped preference migration and vendor meta cleanup

- Fixed `src/pages/dashboard/dashboardToolLibrary.ts` so scoped dashboard pin storage now falls back to legacy global pins and migrates them into the active wedding-site bucket the first time that site reads them.
- Fixed `src/pages/dashboard/planning/nameChangePlannerUi.ts` so scoped name-change admin and collapsed-section preferences now fall back to legacy global prefs and migrate them into the active site scope instead of dropping the owner's existing planner layout.
- Fixed `src/pages/dashboard/planning/vendorMetaStorage.ts` so vendor reminder metadata storage now has a scoped key path available for per-site usage instead of assuming one global browser bucket forever.
- Added migration and scoped-storage guards in `src/pages/dashboard/dashboardToolLibrary.test.ts`, `src/pages/dashboard/planning/nameChangePlannerUi.test.ts`, and `src/pages/dashboard/planning/vendorMetaStorage.test.ts`.

## 2026-05-19 PT - scoped storage migration cleanup across guests, photos, and overview

- Fixed `src/pages/dashboard/guests/guestDashboardStorage.ts` so site-scoped RSVP campaign presets, follow-up tasks, saved segments, and campaign logs now fall back to legacy global storage and migrate that data into the active wedding-site bucket instead of appearing to vanish after scope cleanup.
- Fixed `src/pages/dashboard/guestPhotoSharingUtils.ts` so site-scoped guest-photo bucket links now pick up legacy global stored links and migrate them into the active wedding-site bucket on first read.
- Fixed `src/pages/dashboard/overviewUtils.ts` so site-scoped overview intelligence dismissals now pick up legacy global dismissal memory and migrate it into the active site scope.
- Added migration guards in `src/pages/dashboard/guests/guestDashboardStorage.test.ts`, `src/pages/dashboard/guestPhotoSharingUtils.test.ts`, and `src/pages/dashboard/overviewUtils.test.ts`.

## 2026-05-19 PT - scoped storage migration cleanup across messages, vault, and vendor reminders

- Fixed `src/pages/dashboard/messages/messageDashboardUtils.ts` so site-scoped stored photo album links now fall back to legacy global stored links and migrate them into the active wedding-site bucket on first read.
- Fixed `src/pages/dashboard/vaultReleaseNoticeStorage.ts` so site-scoped vault release notices now pick up legacy global unlock-notice memory and migrate it into the active wedding-site bucket.
- Fixed `src/pages/dashboard/planning/vendorMetaStorage.ts` so site-scoped vendor reminder metadata now falls back to legacy global reminder storage and migrates it into the active planning-site bucket instead of appearing empty after the scope cleanup.
- Added migration guards in `src/pages/dashboard/messages/messageDashboardUtils.test.ts`, `src/pages/dashboard/vaultReleaseNoticeStorage.test.ts`, and `src/pages/dashboard/planning/vendorMetaStorage.test.ts`.

## 2026-05-19 PT - registry card state reset cleanup

- Fixed `src/pages/dashboard/registry/RegistryItemCard.tsx` so owner purchase-confirm state now resets when a different registry item is loaded into the same card instance instead of carrying the last item's confirm panel, quantity draft, or transient copy/delete state forward.
- Fixed `src/sections/components/RegistrySection.tsx` so guest cash-fund Zelle copy status now resets when the visible contribution target changes, which prevents a stale copied/downloaded state from lingering after the fund handle changes underneath the same card.
- Added focused regression coverage in `src/pages/dashboard/registry/RegistryItemCard.test.tsx` and `src/sections/components/RegistrySection.test.tsx`.

## 2026-05-19 PT - vault and guest-photo draft rehydration cleanup

- Fixed `src/pages/dashboard/VaultCard.tsx` so the owner vault entry form now rehydrates its default title and clears stale draft fields, save state, and error state when the active vault config changes instead of carrying the previous anniversary draft into the next vault card.
- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts` so route-seeded guest-photo event name, event id, and parent bucket draft state now follows the live query params instead of only resetting during broader site changes.
- Added source guards in `src/pages/dashboard/vaultService.test.ts` and `src/pages/dashboard/dashboardWorkspaceReset.test.ts`.

## 2026-05-19 PT - builder helper route cleanup

- Fixed `src/builder/components/BuilderShell.tsx` so `builderTour=1` now behaves like a one-shot route intent: it opens the coachmarks and then clears the route flag instead of leaving that special helper mode stuck in the URL.
- Fixed `src/builder/components/BuilderTopBar.tsx` so builder publish-helper route intents for `tool=share` and `tool=qr-codes` now open the publish checklist and then clear the route hint, which keeps those helper modes from lingering as sticky route leftovers.
- Added source guards in `src/builder/components/builderRouteSync.test.ts`.

## 2026-05-19 PT - dashboard tool route intent cleanup

- Fixed `src/pages/dashboard/Vault.tsx` so the `tool=anniversary-capsules` deep link now behaves like a one-shot helper intent: it scrolls to the anniversary tool and then clears the route hint instead of leaving that special mode stuck in the URL.
- Fixed `src/pages/dashboard/GuestPhotoSharing.tsx` so guest-photo helper route intents like `tool=guestbook`, `tool=recap`, and `tool=video` now scroll to the requested workspace and then clear the route hint instead of leaving those helper modes behind as sticky query leftovers.
- Added source guards in `src/pages/dashboard/dashboardToolRouteIntent.test.ts`.

## 2026-05-19 PT - guest dashboard route intent cleanup

- Fixed `src/pages/dashboard/Guests.tsx` so guest-dashboard helper route intents now behave like one-shot requests instead of sticky query leftovers: `tool=import-export`, `tool=address-collection`, `tool=guest-details`, `tool=thank-you-notes`, `tab=rsvp-settings`, and `tab=list` now apply the requested guest workspace mode and then clear the route hint.
- Extended the source guards in `src/pages/dashboard/dashboardToolRouteIntent.test.ts`.

## 2026-05-19 PT - builder helper intent follow-through cleanup

- Fixed `src/builder/components/BuilderShell.tsx` so the remaining builder helper route intents now behave like one-shot requests instead of sticky query leftovers: `openTemplates=1`, `panel=design`, `tool=travel`, and `tool=hotel-block` now open or focus the requested builder workspace and then clear the route hint.
- Extended the source guards in `src/builder/components/builderRouteSync.test.ts`.

## 2026-05-19 PT - router replace-state cleanup

- Fixed `src/builder/components/BuilderShell.tsx` so builder `publishNow` cleanup now goes back through React Router navigation instead of raw `window.history.replaceState`, which keeps router state aligned after consuming the publish helper query.
- Fixed `src/pages/onboarding/QuickStart.tsx` so the `resetQuickStart` cleanup now goes back through React Router navigation instead of raw history mutation, which keeps the onboarding route state in sync after resetting the draft.
- Fixed `src/pages/dashboard/useVaultDashboardData.ts` so Google Drive OAuth query cleanup now goes back through React Router navigation instead of raw history mutation, which keeps the vault dashboard’s router state aligned after connect/cancel/failure cleanup.
- Added source guards in `src/pages/routerReplaceStateCleanup.test.ts`.

## 2026-05-19 PT - dashboard internal navigation cleanup

- Fixed `src/pages/dashboard/planning/AddressCollectionTab.tsx` so address-collection messaging handoff now uses React Router navigation instead of forcing a full page reload when opening the prefilled message composer.
- Fixed `src/pages/dashboard/Seating.tsx` so the empty-state CTA now routes to `/dashboard/itinerary` through React Router instead of hard-reloading the dashboard.
- Fixed `src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts` and `src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx` so guest-photo message handoffs now route into the dashboard message composer without throwing away the current app shell.
- Fixed `src/pages/dashboard/ItineraryDashboardRouteContent.tsx` so itinerary album shortcuts now open the dashboard photo workspace through React Router instead of full-reloading into `/dashboard/photos`.
- Added source guards in `src/pages/dashboard/dashboardInternalNavigationCleanup.test.ts` and updated direct component coverage in `src/pages/dashboard/planning/AddressCollectionTab.test.tsx` and `src/pages/dashboard/Seating.test.tsx`.

## 2026-05-19 PT - planning hash route cleanup

- Fixed `src/pages/dashboard/planning/NameChangePlannerTab.tsx` so planner hash navigation now goes back through React Router instead of raw `window.history.replaceState`, and the hash-follow scroll sync now keys off router location instead of manual `hashchange` listeners.
- Fixed `src/pages/dashboard/planning/PlanningOverviewTab.tsx` so jumping from the planning overview into name-change milestones and reminders now updates the hash through React Router instead of mutating browser history directly.
- Extended source guards in `src/pages/dashboard/planningRouteSync.test.ts`.

## 2026-05-19 PT - onboarding and setup reset navigation cleanup

- Fixed `src/pages/onboarding/QuickStart.tsx` so the “Start over” action now uses React Router navigation instead of forcing a full document reload to append `resetQuickStart=1`.
- Fixed `src/pages/setup/SetupShell.tsx` so resetting the setup draft now routes back to `/setup/names` through React Router instead of hard-reloading the setup flow.
- Extended source guards in `src/pages/routerReplaceStateCleanup.test.ts` and `src/pages/setup/setupService.test.ts`.

## 2026-05-19 PT - public search-param helper hardening

- Added `src/lib/currentSearchParams.ts` so public access helpers can safely resolve current search params without assuming `window` is always available.
- Fixed `src/pages/GuestbookSubmit.tsx`, `src/pages/GuestContactUpdate.tsx`, `src/pages/VaultContribute.tsx`, `src/pages/PhotoUpload.tsx`, and `src/pages/EventRecap.tsx` so their access and identity payload helpers now flow through the shared resolver instead of directly defaulting to `new URLSearchParams(window.location.search)`.
- Fixed `src/sections/interactiveSectionService.ts` so interactive public access resolution now uses that same shared search-param helper.
- Added/updated guard coverage in `src/lib/currentSearchParams.test.ts`, `src/pages/publicAccessPayloadRouteSync.test.ts`, `src/pages/publicAccessHelperRouteSync.test.ts`, and `src/sections/interactiveSectionService.test.ts`.

## 2026-05-19 PT - dashboard anchor navigation cleanup

- Fixed `src/pages/dashboard/coordinator/CoordinatorModePanels.tsx` so coordinator cross-links into RSVP board, seating lookup, and planning now use React Router links instead of plain anchors that force dashboard reloads.
- Fixed `src/pages/dashboard/guests/GuestDashboardHeader.tsx` and `src/pages/dashboard/guests/GuestRsvpSettingsView.tsx` so RSVP review links now stay inside the app shell.
- Fixed `src/pages/dashboard/planning/PlanningDashboardShell.tsx` so the itinerary, guests, and day-of shortcuts now use router links instead of document-level anchors.
- Fixed `src/pages/dashboard/seating/SeatingDashboardRouteContent.tsx` so seating lookup and wedding-day cross-links now route internally without resetting the dashboard shell.
- Added source guards in `src/pages/dashboard/dashboardAnchorNavigationCleanup.test.ts`.

## 2026-05-19 PT - final internal anchor sweep

- Fixed `src/pages/SiteView.tsx` so the public coming-soon sign-in link now uses a router link instead of a plain anchor.
- Fixed `src/pages/dashboard/planning/VendorsTab.tsx` so the vendor template lab shortcut now routes internally without forcing a document reload.
- Added source guards in `src/pages/appInternalAnchorCleanup.test.ts`.

## 2026-05-19 PT - builder helper storage scoping

- Fixed `src/builder/components/builderCoachmarkStorage.ts` and `src/builder/components/BuilderShell.tsx` so builder coachmark memory is now scoped to the authenticated builder owner instead of one shared browser key, with legacy global values migrating forward into the scoped key on read.
- Fixed `src/builder/components/TemplateGalleryPanel.tsx` so template usage recommendations now read and write through a scoped storage key as well, instead of one shared browser bucket across owners.
- Fixed `src/builder/BuilderPage.tsx` so the builder passes authenticated user scope into the shell, which then threads that scope into coachmark and template helper memory.
- Added/updated coverage in `src/builder/components/builderCoachmarkStorage.test.ts`, `src/builder/components/TemplateGalleryPanel.test.ts`, and `src/builder/components/builderRouteSync.test.ts`.
- No deploy was run.

## 2026-05-19 PT - quick-start auth scope handoff recovery

- Fixed `src/lib/quickStartStateTransfer.ts` so quick-start drafts can now migrate between scopes instead of getting stranded when the auth context changes.
- Fixed `src/pages/onboarding/QuickStart.tsx` so authenticated quick-start loads now migrate any email-scoped pre-auth draft into the signed-in user scope before local restore runs.
- Added focused coverage in `src/lib/quickStartStateTransfer.test.ts` and `src/pages/onboarding/QuickStart.test.tsx` to pin the auth-boundary handoff.
- No deploy was run.

## 2026-05-19 PT - focused Vitest fail-fast runner

- Added `scripts/run-focused-vitest.mjs` and the `npm run test:focused` package script so constrained local focused proof runs fail fast with a useful worker-pool diagnosis instead of hanging indefinitely at the Vitest banner.
- The runner uses Vitest's hanging-process reporter, one worker, no file parallelism, and an explicit timeout. Timeout exits with code `124` and explains that the local worker pool failed to start.
- Added source guard coverage in `src/lib/focusedVitestRunner.test.ts`.
- Verification: `DAYOF_FOCUSED_VITEST_TIMEOUT_MS=12000 npm run test:focused -- src/lib/quickStartStateTransfer.test.ts` exited `124` with the intended fail-fast diagnostic in this constrained desktop session. No deploy was run.

## 2026-05-19 PT - builder storage scope audit

- Audited all remaining `src/builder` browser storage after the coachmark/template usage scoping batch. Remaining storage is now limited to version history, owner-scoped coachmarks, and owner-scoped template usage.
- Fixed `src/builder/services/versionHistory.ts` so builder revision storage now filters revisions by the requested `weddingId` as well as by the localStorage key. A corrupted or legacy `builder:revisions:<site-a>` envelope can no longer surface a revision whose embedded `weddingId` belongs to another site.
- Added coverage in `src/builder/services/versionHistory.test.ts` and source guard coverage in `src/builder/builderStorageScopeAudit.test.ts`.
- No deploy was run.

## 2026-05-19 PT - remaining internal navigation bypass audit

- Audited the remaining `window.location` and internal-anchor hits outside the already-cleaned route batches, leaving external checkout/OAuth redirects in place intentionally.
- Fixed `src/components/site/sections/RsvpSection.tsx` so the public RSVP CTA uses a React Router link instead of assigning `window.location.href`.
- Fixed `src/builder/components/BuilderShell.tsx`, `src/pages/dashboard/OverviewDashboardLiveContent.tsx`, and `src/pages/PaymentRequired.tsx` so privacy settings, draft preview fallback, and payment-bypass continuation now route through React Router instead of hard browser navigations.
- Added source guard coverage in `src/pages/internalNavigationBypassAudit.test.ts` and updated `src/components/dashboard/draftPreviewRouting.test.ts` so draft preview routing now expects router navigation.
- No deploy was run.

## 2026-05-19 PT - record-switching editor rehydration audit

- Audited the remaining record-seeded editor/modal surfaces after the registry and vault reset fixes.
- Fixed `src/pages/dashboard/seating/SeatingDashboardComponents.tsx` so switching the active seating table clears any pending inline-editor autosave timer before rehydrating the next table draft. The autosave effect is now keyed to the active `initial.id`, the current payload builder, and the current save callback instead of relying on a suppressed dependency list.
- Extended source guard coverage in `src/pages/dashboard/registry/registryItemFormRecovery.test.ts` so the seating table editor must cancel stale autosaves on record switch.
- No deploy was run.

## 2026-05-19 PT - public continuity key audit

- Audited the remaining public/guest browser-memory surfaces after the RSVP, language, quote guestbook, registry purchase, and photo-link scoping fixes.
- Fixed `src/lib/guestHubOfflineSnapshot.ts` so guest-hub offline snapshots now normalize their embedded `siteSummary.slug` to the requested storage scope on write and reject/remove snapshots whose embedded site summary belongs to a different wedding on read.
- Extended coverage in `src/lib/guestHubOfflineSnapshot.test.ts` so stale/corrupt cross-wedding offline fallback payloads cannot quietly render another couple's guest-hub summary.
- No deploy was run.

## 2026-05-19 PT - route-intent proof guard refresh

- Audited the remaining route-intent and route-helper proof guards after the public access and dashboard route-sync batches.
- Fixed stale source guards in `src/lib/publicGuestSurfaceBoundary.test.ts` so public RSVP and interactive helpers now expect router-provided `searchParams` / `resolveCurrentSearchParams` instead of the old `new URLSearchParams(window.location.search)` pattern.
- Fixed stale source guards in `src/lib/dashboardDataBoundary.test.ts` so dashboard message details and overview proof flags now expect `useSearchParams` instead of direct global location reads.
- External checkout/OAuth redirects and public token URL cleanup remain intentionally documented as browser-level exits; no deploy was run.

## 2026-05-19 PT - onboarding continuation cleanup scope audit

- Audited the remaining onboarding/auth continuation storage keys after the quick-start, setup draft, signup return, and onboarding draft scoping work.
- Fixed `src/lib/onboardingDraftCleanup.ts` so `clearAllOnboardingDraftStorage(storageScope)` now clears the signup return-path continuation for the same scope instead of only clearing the legacy/global key.
- Extended `src/lib/onboardingDraftCleanup.test.ts` so scoped full-cleanup must remove onboarding draft, quick-start draft, guided setup draft, scoped signup return path, and the legacy signup return sibling together.
- No deploy was run.

## 2026-05-19 PT - live proof spec freshness refresh

- Refreshed `tests/e2e/live-smoke.spec.ts` so the homepage, product, and trust smoke checks assert the current public copy and route shape instead of relying on retired May 1 wording fragments.
- Added `src/lib/liveProofSpecFreshness.test.ts` to pin live-smoke expectations to current `Home`, `Product`, and `Trust` source copy and reject older proof-note wording as current public-copy truth.
- Full live canonical proof still needs an approved normal/live run of `npm run proof:v1:board:freshness` and `npm run proof:v1:canonical-smoke` before moving this item from Fixed to Verified. No deploy was run.

## 2026-05-19 PT - Quick Start onboarding surface split

- Split route-independent Quick Start question copy, UI tokens, and processing-step timing from `src/pages/onboarding/QuickStart.tsx` into `src/pages/onboarding/quickStartContent.ts`.
- Split Guided Setup route-state defaults and step ordering from `src/pages/onboarding/GuidedSetup.tsx` into `src/pages/onboarding/guidedSetupContent.ts`.
- Split legacy onboarding concierge question copy, optional-question keys, and quick-step mapping from `src/pages/Onboarding.tsx` into `src/pages/onboarding/onboardingConciergeContent.ts`.
- Reduced `QuickStart.tsx` from 837 lines to 754 lines, `GuidedSetup.tsx` from 1171 lines to 1113 lines, and `Onboarding.tsx` from 1193 lines to 1174 lines while keeping behavior-focused route code in place.
- Added `src/pages/onboarding/quickStartContent.test.ts` and `src/pages/onboarding/onboardingSurfaceContent.test.ts` so the extracted question order, theme tokens, step defaults, and step mapping stay covered outside the route components.
- Proof passed: `npm run guard:file-size`, `npm run test:focused -- src/pages/onboarding/quickStartContent.test.ts src/pages/onboarding/onboardingSurfaceContent.test.ts`, and `git diff --check` for the touched onboarding split files. `npm run typecheck -- --pretty false` was attempted and failed on pre-existing unrelated dashboard/photos/registry/settings/test type errors outside this onboarding split. No deploy was run.

## 2026-05-19 PT - architecture cleanup proof drift closeout

- Rechecked the P1/P2 architecture cleanup concern around moved dashboard message files. The current `proof:v1:client-write-inventory` and `proof:v1:ast-security` scripts no longer hardcode the retired `src/pages/dashboard/messages/MessageDashboardComponents.tsx` path and both scan tracked existing runtime files.
- Tightened `src/lib/clientWriteInventoryProofScript.test.ts` and `src/lib/astSecurityProofScript.test.ts` so future proof-script edits keep the tracked-existing-file scan behavior and do not reintroduce that stale messages component path.
- Current status for this architecture slice: the deleted-path proof blocker is closed; remaining broader architecture cleanup should be tracked as smaller feature-specific slices rather than one amorphous launch blocker.
- Proof passed: `npm run proof:v1:client-write-inventory`, `npm run proof:v1:ast-security`, and scoped source guard coverage for the two proof scripts. No deploy was run.

## 2026-05-19 PT - builder template usage storage split

- Split template-usage browser storage from `src/builder/components/TemplateGalleryPanel.tsx` into `src/builder/components/templateUsageStorage.ts`, keeping scoped key construction, legacy migration, stale envelope cleanup, and bounded usage counts in a focused helper.
- Updated `TemplateGalleryPanel` so it only reads and bumps template usage through the helper while the gallery component stays focused on filtering, previewing, and applying templates.
- Tightened `src/builder/builderStorageScopeAudit.test.ts` and `src/builder/components/TemplateGalleryPanel.test.ts` so storage scope proof follows the extracted module and still verifies the panel passes `storageScope` through.
- Reduced `TemplateGalleryPanel.tsx` from 1360 lines to 1262 lines while preserving the 98-line storage helper as a separately testable boundary.
- Proof passed: `npm run test:focused -- src/builder/components/TemplateGalleryPanel.test.ts src/builder/builderStorageScopeAudit.test.ts`, `npm run guard:file-size`, and `git diff --check` for the touched builder split files. No deploy was run.

## 2026-05-19 PT - non-SMS launch proof rerun closeout

- Re-ran the active non-SMS launch proof set after the dashboard hardening pass and fixed the collaborator-access proof blocker that surfaced during the full run.
- Fixed `src/pages/dashboard/planning/BudgetTab.test.tsx` and `src/pages/dashboard/planning/VendorsTab.test.tsx` so the planning financial read-only proof no longer depends on undeclared `@testing-library/user-event`, wraps component interactions in `act`, and renders the real Toast/Router providers required by the components.
- Verified the earlier hardening fixes remained green in the same full proof: preview runtime early-exit diagnostics, Guests RSVP route-intent cleanup, Messages demo persistence/scheduled state handling, scoped photo-album link storage, and the focused comms proof harness.
- Proof passed: `npm test -- --run src/pages/dashboard/planning/BudgetTab.test.tsx src/pages/dashboard/planning/VendorsTab.test.tsx`, `npm run proof:v1:collaborator-access`, and full `npm run dayof:proof` through board freshness, board, guests/RSVP ops, comms center, registry, seating continuity, coordinator day-of, and collaborator access. No deploy was run.

## 2026-05-19 PT - route-intent router consistency verification closeout

- Verified the remaining route-intent and router-consistency source guards in a normal Vitest worker after refreshing stale expectations for search-param-aware public access payloads, route split copy, dashboard timeout wrappers, and dedicated route-support hooks.
- Fixed `src/pages/dashboard/planning/planningService.ts` so vendor and budget item reads use explicit projections instead of `select('*')`, with missing-column fallbacks for older live schema shapes.
- Updated `src/pages/dashboard/planning/planningService.test.ts` so planning service coverage now asserts explicit projections and the optional-column normalization behavior.
- Proof passed: `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts src/lib/dashboardDataBoundary.test.ts` and `npm test -- --run src/pages/dashboard/planning/planningService.test.ts src/pages/dashboard/planning/BudgetTab.test.tsx src/pages/dashboard/planning/VendorsTab.test.tsx`. No deploy was run.

## 2026-05-19 PT - scoped onboarding storage runtime proof closeout

- Re-ran the scoped onboarding/setup/auth storage migration runtime proof and fixed the Quick Start test harness blockers it exposed.
- Updated `src/pages/onboarding/QuickStart.test.tsx` so Quick Start renders with router context and a mocked auth hook that follows the test `authUser`, preserving the email-scope to user-scope draft migration assertion against the current route component.
- Proof passed: `npm test -- --run src/lib/onboardingScopedStorageMigration.test.ts src/pages/Login.test.tsx src/pages/Signup.test.tsx src/pages/onboarding/QuickStart.test.tsx` and `git diff --check -- src/pages/onboarding/QuickStart.test.tsx docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - builder helper storage runtime proof closeout

- Re-ran the builder coachmark and template-usage storage scoping runtime proof.
- Refreshed `src/builder/components/builderRouteSync.test.ts` so its source guard accepts the current combined `useLocation` / `useNavigate` React Router import while still requiring route hints to flow through live router location and scoped coachmark/template storage helpers.
- Proof passed: `npm test -- --run src/builder/components/builderCoachmarkStorage.test.ts src/builder/components/TemplateGalleryPanel.test.ts src/builder/components/builderRouteSync.test.ts` and `git diff --check -- src/builder/components/builderRouteSync.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - builder browser memory audit verification closeout

- Re-ran the focused builder version-history and browser-storage audit proof after the version-history scoping fix.
- Verified builder revision storage rejects cross-wedding embedded revisions, migrates active legacy revision arrays, drops malformed envelopes, and keeps builder local storage limited to scoped helpers.
- Proof passed: `DAYOF_FOCUSED_VITEST_TIMEOUT_MS=12000 npm run test:focused -- src/builder/services/versionHistory.test.ts src/builder/builderStorageScopeAudit.test.ts` and `git diff --check -- src/builder/services/versionHistory.ts src/builder/services/versionHistory.test.ts src/builder/builderStorageScopeAudit.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - internal navigation bypass verification closeout

- Re-ran the focused internal-navigation bypass proof after the React Router navigation fixes.
- Refreshed `src/components/dashboard/draftPreviewRouting.test.ts` so it protects the current derived `previewShareHref` / `previewShareExternal` contract instead of the retired inline JSX ternary, while still requiring draft preview CTAs to route internally to the builder.
- Verified the literal bypass search has no matches for the retired internal `window.location` assignments in RSVP, builder privacy, dashboard draft-preview fallback, or payment-bypass continuation code.
- Proof passed: `npm test -- --run src/pages/internalNavigationBypassAudit.test.ts src/components/dashboard/draftPreviewRouting.test.ts`, the focused `rg` bypass search returned no matches, and `git diff --check -- src/components/site/sections/RsvpSection.tsx src/builder/components/BuilderShell.tsx src/pages/dashboard/OverviewDashboardLiveContent.tsx src/pages/PaymentRequired.tsx src/components/dashboard/draftPreviewRouting.test.ts src/pages/internalNavigationBypassAudit.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - focused Vitest runner verification closeout

- Re-ran the focused Vitest runner proof that originally motivated the fail-fast runner.
- Verified `npm run test:focused` now starts Vitest workers and completes the scoped Quick Start transfer suite cleanly in this desktop session instead of hanging at the banner.
- Proof passed: `DAYOF_FOCUSED_VITEST_TIMEOUT_MS=12000 npm run test:focused -- src/lib/quickStartStateTransfer.test.ts` and `git diff --check -- scripts/run-focused-vitest.mjs package.json docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - non-SMS scope guard closeout

- Kept SMS/Telnyx and other external-dependency lanes explicitly out of the active non-SMS execution board until those dependencies are intentionally reopened.
- Closed the Notion scope-guard item as a deferred dependency rather than a launch-readiness blocker; this preserves the active queue for locally fixable and verifiable non-SMS work.
- Proof command: documentation-only scope guard. No deploy was run.

## 2026-05-19 PT - launch tracker state rules closeout

- Normalized the working meaning of the Notion launch tracker states used during the non-SMS hardening loop.
- `New` means no current batch has owned the item yet, or the item is still real work with no landed fix.
- `Triaged` means the item is understood and scoped, but still represents an active risk or umbrella finding that must be reconciled before closeout.
- `In Progress` means exactly one current batch is actively owning the item; avoid opening parallel work on the same row unless the batch is abandoned or explicitly handed off.
- `Fixed` means code or documentation has landed locally, but the required runtime/source/browser/live proof has not completed yet.
- `Verified` means the item has passed its stated proof in the current context, the evidence and proof command are recorded, and readiness impact should be reduced to `No impact` unless the row documents a broader remaining caveat.
- `Deferred` means the item is intentionally outside active non-SMS scope because it depends on SMS/Telnyx, live/provider setup, deploy timing, service-role credentials, or another explicit external gate.
- Closeout rule: do not use `Verified` for documentation-only scope exclusions or external dependency lanes; use `Deferred` when the correct action is to keep the item out of the active board.
- Closeout rule: do not leave code-landed items in `New` or `Triaged`; move them to `Fixed` with the missing proof called out, or to `Verified` only after the proof actually passes.
- Proof command: documentation-only state-definition guard plus `git diff --check -- docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - dashboard layout site-context service extraction

- Moved dashboard layout owned/collaborator site membership loading, active-site resolution, public slug readiness shaping, and privacy-state shaping out of `src/components/dashboard/DashboardLayout.tsx` into `src/components/dashboard/dashboardLayoutSiteContext.ts`.
- `DashboardLayout` now applies the loaded site context through a small state-applier and no longer imports Supabase, resolves active sites directly, or owns the wedding-sites/collaborator queries inline.
- Added `src/lib/dashboardDataBoundary.test.ts` coverage to pin the new helper boundary and updated `src/components/dashboard/draftPreviewRouting.test.ts` so preview routing still follows the derived slug contract after the extraction.
- Proof passed: `npm test -- --run src/lib/dashboardDataBoundary.test.ts src/components/dashboard/draftPreviewRouting.test.ts`, `npm run guard:file-size`, and `git diff --check -- src/components/dashboard/DashboardLayout.tsx src/components/dashboard/dashboardLayoutSiteContext.ts src/lib/dashboardDataBoundary.test.ts src/components/dashboard/draftPreviewRouting.test.ts docs/feature-verification-notes-2026-05-18.md`.
- `npm run typecheck -- --pretty false` was attempted and still fails on pre-existing unrelated dashboard/photos/registry/settings/test type errors outside this layout extraction. No deploy was run.

## 2026-05-19 PT - name-change planner focused proof stabilization

- Re-ran the name-change planner focused proof and fixed the router-boundary failure that made all 41 tests fail at `useLocation()` before the suite could provide useful runtime signal.
- Added a route-aware test harness for `NameChangePlannerTab.test.tsx` that keeps `useLocation`, `useNavigate`, route hash changes, and existing `window.location.hash` assertions aligned without wrapping every render manually.
- Restored production status-vault anchoring with `#target-status-tracking`, plus the extracted panel behaviors that the suite exposed as regressions: readiness-specific account update copy labels, copied/downloaded fallback labels, status-vault step counts, proof/reminder/timing summary labels, secondary reminder/milestone timestamps, invalid-reminder timestamp filtering, and the payroll copy error label.
- Proof passed: `DAYOF_FOCUSED_VITEST_TIMEOUT_MS=120000 npm run test:focused -- src/pages/dashboard/planning/NameChangePlannerTab.test.tsx` completed 41/41 in 24.26s, and `git diff --check -- src/pages/dashboard/planning/NameChangePlannerTab.tsx src/pages/dashboard/planning/NameChangePlannerTab.test.tsx src/pages/dashboard/planning/NameChangePlannerWorkspacePanels.tsx src/pages/dashboard/planning/NameChangePlannerOperationalPanels.tsx src/pages/dashboard/planning/NameChangePlannerPanelTypes.ts docs/feature-verification-notes-2026-05-18.md` passed. No deploy was run.

## 2026-05-19 PT - editor and modal rehydration proof closeout

- Re-ran the normal Vitest worker proof for the record-switching editor/modal rehydration audit.
- Tightened `src/pages/dashboard/registry/registryItemFormRecovery.test.ts` so the link-import feedback guard verifies the actual field-edit reset contract without depending on JSX neighbor order from the registry modal UI reshaping.
- Verified registry, vault, and seating record-seeded editor guards still reset/re-hydrate local state on record changes, including the seating autosave timer cancel/keying assertion for active table switches.
- Proof passed: `npm test -- --run src/pages/dashboard/registry/registryItemFormRecovery.test.ts` and `git diff --check -- src/pages/dashboard/registry/registryItemFormRecovery.test.ts src/pages/dashboard/registry/RegistryItemForm.tsx src/pages/dashboard/seating/SeatingDashboardComponents.tsx docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - onboarding auth continuation cleanup proof closeout

- Re-ran the normal Vitest worker proof for the onboarding/auth continuation key cleanup.
- Verified scoped full onboarding draft cleanup clears onboarding, Quick Start, Guided Setup, and scoped signup return-path continuation state while also removing the legacy/global sibling state.
- Proof passed: `npm test -- --run src/lib/onboardingDraftCleanup.test.ts` and `git diff --check -- src/lib/onboardingDraftCleanup.ts src/lib/onboardingDraftCleanup.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - public continuity session-key proof closeout

- Re-ran the normal Vitest worker proof for guest-hub offline snapshot scoping.
- Verified guest-hub offline fallback writes normalize the embedded site summary slug to the requested storage scope, reject stale snapshots whose embedded summary belongs to another wedding, and remove stale or malformed offline snapshots from local storage.
- Proof passed: `npm test -- --run src/lib/guestHubOfflineSnapshot.test.ts` and `git diff --check -- src/lib/guestHubOfflineSnapshot.ts src/lib/guestHubOfflineSnapshot.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - live proof spec freshness verification closeout

- Re-ran the canonical smoke proof against `https://dayof.love` after the live-smoke spec refresh.
- Verified the refreshed live proof specs match the current Home/Product/Trust/public-route behavior: build passed, Playwright live smoke passed 35/35, and site lookup smoke passed for the canonical demo site.
- Proof passed: `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` and `git diff --check -- tests/e2e/live-smoke.spec.ts src/lib/liveProofSpecFreshness.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.

## 2026-05-19 PT - builder template-gallery split verification closeout

- Re-ran the focused builder proof for the TemplateGalleryPanel template-usage storage extraction.
- Verified template usage stays behind the scoped `templateUsageStorage` helper, active legacy usage maps migrate into scoped timestamped envelopes, stale/malformed storage clears, and builder local storage remains limited to scoped helpers.
- Proof passed: `DAYOF_FOCUSED_VITEST_TIMEOUT_MS=120000 npm run test:focused -- src/builder/components/TemplateGalleryPanel.test.ts src/builder/builderStorageScopeAudit.test.ts`, `npm run guard:file-size`, and `git diff --check -- src/builder/components/TemplateGalleryPanel.tsx src/builder/components/templateUsageStorage.ts src/builder/components/TemplateGalleryPanel.test.ts src/builder/builderStorageScopeAudit.test.ts docs/feature-verification-notes-2026-05-18.md`. No deploy was run.
