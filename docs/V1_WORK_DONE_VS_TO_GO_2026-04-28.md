# DayOf V1 Work Done Vs To Go

Date: 2026-04-28
Branch: `codex/v1-finish-hard-gates`
Repo: `jeanericgagnon/wedding-site-Bolt`

## Read This First

This is the backlog for getting DayOf from "the repo builds and tests pass" to "a full wedding product that can be proudly shown, sold, and trusted."

Green unit tests do not mean the product is done. They mean the codebase is stable enough to finish deliberately.

Historical-note: this document preserves an older status snapshot from 2026-04-28. Current launch truth now lives in [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md), and the current proof-board contract requires `npm run proof:v1:board:freshness` before `npm run proof:v1:board` or `npm run proof:v1:board:md` is treated as canonical launch status. Workflow gates stay narrower on purpose: `ci-hardpass` and `Release Launch Gate` enforce freshness, but they do not regenerate the raw or markdown board outputs.

## Current Truth

### Done locally

- `npm ci` passes.
- `npm run typecheck -- --pretty false` passes.
- `npm run test -- --run` passes: 371 files, 2,388 tests.
- `npm run build` passes when run by itself.
- `npm run lint` now passes with 0 errors. Existing broad codebase debt remains as warnings.
- `npm audit --audit-level=moderate` now passes with 0 vulnerabilities after removing `xlsx`, applying non-breaking audit fixes, and upgrading Vite / the React plugin.
- `npm run proof:v1:board:freshness` now passes before either `npm run proof:v1:board` or `npm run proof:v1:board:md` is treated as current launch truth.
- `npm run proof:v1:board` passes.
- `npm run smoke:csvmapper` passes.
- `npm run smoke:checkin` passes.
- `npm run proof:v1:collaborator-access` passes.
- `npm run proof:v1:comms-center` passes when run alone.
- `npm run proof:v1:coordinator-dayof` passes.
- `npm run proof:v1:registry` passes after updating the stale registry source guard.
- `npm run proof:v1:seating-continuity` passes.
- `npm run proof:v1:prereqs` now exists and fails early with explicit missing runtime prerequisites instead of letting proof scripts fail later with unclear env errors.
- Playwright Chromium is installed locally and the prereq detector now verifies the actual browser executable.
- `npm run proof:v1:guests-rsvp-ops` now passes against the linked Supabase project after `validate-rsvp-token` was redeployed anon-callable.
- `npm run proof:v1:canonical-smoke` now passes, including Supabase-backed site lookup.
- `npm run test:e2e:live` passes against local preview: 31 Playwright checks.
- Dashboard overview now has a more polished command-center top section wired to real RSVP, publish, guest reach, and next-step state.
- Preview QA workflow now targets `main` and `codex/**` instead of the stale `fix/typecheck-hardening-safe-pass` branch, and uses Node 24 plus current checkout/setup-node actions.
- Payment bypass is still available for testing, but is now gated behind `VITE_ALLOW_PAYMENT_BYPASS` instead of always honoring `?bypassPayment=1`.
- Browser-side Excel parsing has been removed from guest imports. Guest import is CSV-only now, seating export still supports CSV/table-summary CSV, and the no-fix `xlsx` dependency is gone.
- Local production preview served the built app at `http://127.0.0.1:4173/` and returned HTTP 200.
- The app no longer throws a blank-page startup error when Supabase env vars are absent. Static/public routes can render locally, while Supabase-backed data calls remain visibly unconfigured until env exists.

### Not done

- `npm run proof:v1:collaborator-runtime` is blocked until disposable owner/collaborator proof credentials exist.
- Manual runtime proof is still missing for the full couple path and several core slices.
- Stripe/SMS billing exists in code, but the real purchase, webhook, credit, Twilio send, and delivery ledger flow has not been proven here.
- `npm run proof:v1:prereqs` currently reports the exact remaining runtime blockers: missing collaborator credentials and missing Stripe/Twilio billing proof secrets.

## Product Done Bar

DayOf is v1-done only when:

- A couple can enter setup, create a polished draft, edit it, publish it, and understand what is private/live.
- Guests can open the public site, RSVP, update where allowed, and not see stale or misleading state.
- The couple can run core wedding ops: guests, RSVP board, messages, seating, itinerary, registry, settings.
- Planner/coordinator collaboration is real: invites, role-aware navigation, runtime permission boundaries, no owner-shaped leaks.
- Messaging can actually send or schedule through configured providers, with honest delivery/history states.
- Stripe/SMS billing works end to end in the target environment.
- Security/audit choices are fixed, isolated, or explicitly accepted. Current dependency audit is clean.
- The public marketing story does not overclaim optional or partially proven features.
- The app feels excellent on desktop and mobile: fast, calm, visually cohesive, and hard to break.

## P0 Backlog: Launch-Blocking

### P0-01: Make proof execution reproducible

Current state: proof scripts exist, but local execution still depends on missing Playwright browsers, env vars, and runtime credentials.
Latest state: Playwright Chromium is installed locally and detected correctly. Remaining blockers are runtime env vars, provider secrets, and proof accounts.

To do:

- Install/configure Playwright Chromium for CI proof runs if CI does not already cache/install it.
- Document required proof env vars in one file.
- Provide or script disposable proof accounts for owner, planner/coordinator, and collaborator.
- Keep the "proof prerequisites" script failing early with clear missing-dependency output.
- Run proof bundles sequentially or isolate `dist` output to avoid concurrent build collisions. Sequential runs are currently proven locally.

Done when:

- A fresh checkout can run the full proof command list and get pass/blocked/product-fail output without laptop-specific surprises.

### P0-02: Canonical couple-path proof

Current state: automated coverage exists but manual runtime notes are missing.

To do:

- Run and log Home -> signup/demo/auth -> onboarding/quick-start or guided setup -> builder/dashboard -> public site -> RSVP.
- Verify no page feels like a dead end.
- Verify publish/private/search/password/invite-only wording matches runtime behavior.
- Verify onboarding "starter draft" language does not imply publish-ready completeness.
- Add screenshots or route notes to `docs/v1-smoke-proof-log.md`.

Done when:

- `docs/v1-smoke-proof-log.md` has one concrete pass/fail route note set for the full couple path.

### P0-03: Guests and RSVP ops proof

Current state: guest/RSVP code and tests are broad, and the strict proof gate now passes against the linked Supabase project.
Latest state: `validate-rsvp-token` was redeployed anon-callable, and `npm run proof:v1:guests-rsvp-ops` passes without fixture fallback.

To do:

- Prove dashboard guest create/edit/import, household grouping, plus-one state, meal/dietary state, custom questions, RSVP submit/update, and dashboard/event readback.
- Prove deadline handling and ambiguous guest lookup behavior in runtime.
- Prove event-specific RSVP state does not drift from seating/itinerary state.

Done when:

- `npm run proof:v1:guests-rsvp-ops` passes in the target proof environment.
- One real guest can move through dashboard -> public RSVP -> dashboard readback without trust drift.

### P0-04: Stripe, SMS credits, and billing truth

Current state: Stripe-related functions and `src/lib/stripeService.ts` exist, but live checkout/webhook/SMS credit flow is unproven.
Latest state: payment bypass is preserved for testing behind `VITE_ALLOW_PAYMENT_BYPASS`; production-like billing proof still requires Stripe/Twilio secrets.

To do:

- Confirm Stripe products/prices for core membership and SMS credits.
- Set required Supabase Function secrets:
  - `STRIPE_SMS_PRICE_ID_100`
  - `STRIPE_SMS_PRICE_ID_500`
  - `STRIPE_SMS_PRICE_ID_1000`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
- Confirm webhook endpoint and `checkout.session.completed`.
- Smoke test paid site checkout and payment-required cleanup.
- Smoke test SMS credit purchase and balance increment.
- Smoke test SMS send, credit deduction, Twilio send, and message delivery rows.
- Add legal/product copy for SMS credit expiry and refunds.

Done when:

- A real checkout session can be created, completed, verified, and reflected in app state.
- SMS credit purchase and send flow works in production-like runtime.

### P0-05: Security and dependency audit

Current state: audit is green locally after dependency cleanup.

To do:

- Keep `npm audit --audit-level=moderate` green in CI/release checks.
- Keep browser-side spreadsheet handling CSV-only unless a maintained parser with acceptable security posture is chosen.
- Re-review new advisories before launch freeze.

Done when:

- `npm audit --audit-level=moderate` passes, or every remaining advisory has a written launch risk decision.

### P0-06: Lint/CI hygiene

Current state: typecheck/build/tests/build/lint pass locally. Lint still emits warnings that should be managed as debt, but release-scope lint is no longer red.

To do:

- Decide warning cleanup order instead of letting warnings become background noise.
- Keep `imports/` and `recovery/` scope intentional in lint config.
- Keep `.github/workflows/preview-pages.yml` aligned with release branches and Node/action versions.

Done when:

- `npm run lint` passes for the intended release scope.
- CI and local quality gates match.

### P0-07: Supabase production parity

Current state: many migrations/functions exist; production parity is not proven in this pass.

To do:

- Confirm all migrations are applied in target project.
- Deploy and smoke all required functions:
  - `setup-bootstrap`
  - `send-bulk-message`
  - `submit-rsvp`
  - `validate-rsvp-token`
  - `sms-rsvp-inbound`
  - `registry-preview`
  - registry refresh/scheduler functions
  - vault Google Drive functions
  - Stripe checkout/subscription/webhook functions
- Confirm storage buckets and policies:
  - wedding media
  - vault media
  - public/private visibility rules
- Re-run RLS matrix against production-like data.

Done when:

- App runtime, DB schema, RLS, storage, and functions are in sync in the target environment.

## P1 Backlog: Core Product Must Feel Finished

### P1-01: Onboarding and AI quick start

Current state: built and tests green, but the finish level is not proven.

To do:

- Browser-proof strong case -> draft immediately.
- Browser-proof medium/messy case -> structured follow-up questions.
- Make final intake -> thinking -> ask-or-draft deterministic.
- Render event follow-ups as structured rows/cards, not generic textarea stacks.
- Support skip/TBD without repeated nagging.
- Prove final save -> dashboard/site/guests/photos continuation.
- Ensure OpenAI-unconfigured fallback is honest and useful.

Done when:

- First-run onboarding feels fast, magical, and trustworthy across 3-5 realistic couple profiles.

### P1-02: Builder and publish experience

Current state: builder exists; tests pass; polish plan remains.

To do:

- Unify save/publish states: Saved, Saving, Publishing, Published, Failed.
- Add clear ready-to-publish indicator once blockers clear.
- Keep blocker fixes visible without crowding mobile.
- Normalize section settings, media placement, and photo slot guidance.
- Verify template swap preserves user-entered data.
- Verify publish creates a stable public snapshot and does not leak draft-only state.
- Add browser proof for edit -> save -> publish -> public render.

Done when:

- A non-technical couple can confidently edit and publish without needing support.

### P1-03: Public site quality

Current state: public render path exists and build passes; runtime proof missing.

To do:

- Verify every shipped template renders with real data, sparse data, and no registry.
- Verify mobile layout for hero, schedule, travel, RSVP, registry, FAQ, gallery, story, wedding party.
- Confirm password and invite-only gates cannot degrade open.
- Confirm unpublished/private preview behavior is clear.
- Confirm public registry empty/live states do not fall back to stale template links.
- Add route screenshots for the canonical demo site.

Done when:

- Public site feels polished enough to send to guests without apology.

### P1-04: Planner/collaborator runtime

Current state: role matrix tests pass; runtime proof blocked by missing credentials.

To do:

- Create disposable owner and collaborator proof accounts.
- Prove owner invite -> collaborator create/sign-in -> claim -> dashboard.
- Attempt forbidden actions for planner, coordinator, and viewer.
- Finish permission-aware gating for Settings, Vault, Registry, Itinerary, Seating, Audit Logs, Photo Sharing.
- Add shared permission helpers instead of duplicated role approximations.
- Verify collaborators never hit owner billing prompts.
- Prove one planner across 2+ sites with clean active-site switching.
- Add a planner/client home if multiple sites exist.

Done when:

- Planner/coordinator collaboration feels like a real product, not a role-themed owner account.

### P1-05: Messaging and comms

Current state: proof bundle passes; real send/schedule/provider proof missing.

To do:

- Prove draft creation and recipient segmentation.
- Prove schedule/send path using configured provider.
- Prove retry/reschedule/unschedule/run-due controls are permission-safe.
- Improve failure reason surfacing with provider/carrier codes.
- Add SMS wallet ledger filters/export.
- Decide on click tracking/shortlink layer.
- Add guest self-service contact capture link:
  - tokenized expiring link
  - email/phone/SMS consent fields
  - audit log entry
  - optional immediate RSVP handoff
  - abuse/rate limits

Done when:

- Couples can run practical wedding messaging from DayOf and trust the history state.

### P1-06: Seating

Current state: proof bundle passes; runtime assignment/readback proof missing.

To do:

- Prove event select -> assign guests -> move seats -> lookup -> export.
- Verify event-invited subset drives counts.
- Verify lookup ignores invalid assignments.
- Verify pending/declined/attending counts stay aligned after RSVP changes.
- Mobile QA for seating lookup and event-day table answers.

Done when:

- Staff can answer "where is this guest sitting?" quickly and correctly.

### P1-07: Registry

Current state: automated registry proof passes; manual runtime proof still red.

To do:

- Add/import/edit real registry item as owner.
- Prove merchant preview works for supported merchants and fails gracefully for blocked merchants.
- Run repair/cleanup on weak import.
- Verify duplicate review and image issue review.
- Verify purchased/partial/hide-when-purchased behavior on dashboard and public site.
- Prove registry scheduler `dryRun=false` in target environment.
- Monitor first-week scheduler metrics and tune caps.

Done when:

- Registry feels practical and honest, even when merchant extraction is imperfect.

### P1-08: Coordinator/day-of

Current state: proof bundle passes; realistic event-day runtime pass missing.

To do:

- Run coordinator mode with realistic guest/event data.
- Verify check-in, next arrivals, review-needed guests, timeline, alerts, Q&A.
- Verify coordinator can answer:
  - who is here
  - what is next
  - who needs attention
  - where a guest is seated
- Verify local/session behavior does not create event-day trust issues.

Done when:

- A real coordinator could use it under pressure without fighting the UI.

### P1-09: Itinerary, planning, settings, and ops glue

Current state: surfaces exist; full cross-slice proof missing.

To do:

- Prove itinerary creation/edit/readback and event date/time truth.
- Prove planning tasks, budget, vendors, and milestones are permission-safe.
- Prove settings changes affect public runtime correctly.
- Verify audit/error logs capture useful operator state.
- Add connector health panel for registry, photo/vault, messaging, Stripe/SMS, Google Drive.

Done when:

- The dashboard feels like one coherent ops system instead of separate modules.

### P1-10: Vault, photos, and memories

Current state: meaningful feature work exists, but it is optional for the v1 claim.

To do:

- Prove guest photo upload.
- Prove moderation/rate limits.
- Prove event album creation from itinerary, both single and bulk.
- Prove Photos -> Messages contextual templates.
- Prove Vault Google Drive connect, health, provider switch, upload, lock/unlock, and link resolver.
- Rotate any previously exposed Google OAuth secret.
- Keep memories/archive language adjacent, not core v1.

Done when:

- Photo/vault feels like a credible bonus, not a launch-risk anchor.

## P2 Backlog: Kill-It Polish

### P2-01: Visual polish and product feel

- Normalize section heading scale, spacing, cards, chips, badges, and dashboard rhythm.
- QA all core pages on narrow mobile.
- Ensure toolbar controls wrap and do not clip.
- Improve empty states with useful next actions.
- Add tasteful loading/skeleton states for Supabase-heavy pages.
- Reduce "demo/product scaffolding" feel in settings, builder, registry, and onboarding.

### P2-02: Template and design breadth

- Verify all template previews and variant previews.
- Add stronger first-viewport visual assets for public templates.
- Deepen destination, bilingual, and interfaith use-case packs.
- Keep bilingual/interfaith claims narrower until behavior is proven.
- Avoid custom domains, white-label, full PWA, push notifications, and deep multilingual expansion until core is quiet.

### P2-03: Performance and reliability

- Update Browserslist database to remove build warning.
- Review large chunks: registry, name-change service, planning, builder.
- Add lazy loading where user-perceived performance suffers.
- Add error boundary coverage and user-safe retry states.
- Add observability for function errors, registry preview failures, message delivery, RSVP validation, and Google Drive retries.

### P2-04: Support/admin readiness

- Add or polish admin support tools for:
  - site lookup
  - payment state
  - RSVP token diagnostics
  - function error logs
  - message delivery logs
  - registry preview failures
- Make support runbooks short and current.
- Confirm privacy/security copy matches support reality.

## GitHub Backlog Reconciliation

Open GitHub PRs:

- PR #1: guests toolbar wrapping on narrow layouts. Rebase/merge if still useful, or close if superseded.
- PR #2: RSVP custom questions live. Rebase/merge if not already included locally, or close/update if superseded.

Open GitHub issues:

- #25-#30: setup funnel steps. Likely partially or mostly implemented locally; reconcile against current onboarding/setup routes.
- #31: setup -> builder bootstrap API. Verify `setup-bootstrap` function and runtime flow, then close/update.
- #32-#34: template metadata/index/detail. Verify current template catalog/pages, then close/update.
- #35-#37: builder defaults, section insertion, publish hardening. Verify against current builder and proof gaps.
- #38-#41: photo/message connectors and connector health panel. Some are still active backlog, especially connector health.
- #42-#46: token/auth utility, edge error contract, rate limits, Drive telemetry, partial failure UX. Still relevant reliability/security backlog.
- #47: Builder V2 Execution Tracker. Needs a full status edit; the checklist is currently misleading because several items exist locally while other parts remain unfinished.

Done when:

- GitHub issue/PR state matches product truth and no stale tracker implies the wrong launch status.

## Deferred Unless Customer/Revenue Forces It

- External custom domains.
- Advanced analytics claims.
- Fully automated migration from Zola/Joy/The Knot.
- Enterprise planner governance and approval workflows.
- White-label planner mode.
- Push notifications.
- Full PWA/install flow.
- Deep multilingual content platform.
- Name-change planner as a core wedding-v1 promise.
- Memories/archive as a core wedding-v1 promise.

## Recommended Execution Order

1. Make proof execution reproducible in target env: Supabase env, proof accounts, Stripe/Twilio secrets, sequential proof runner.
2. Prove canonical couple path and onboarding starter draft truth.
3. Unblock and prove guest -> RSVP -> dashboard/event readback.
4. Prove Stripe/SMS billing and message delivery.
5. Prove collaborator runtime with forbidden actions.
6. Prove registry, seating, coordinator, and comms runtime slices in the target environment.
7. Run public/mobile visual QA and polish high-friction screens.
8. Reconcile GitHub issues/PRs and update launch docs.

## One-Line Launch Call

The repo is now stable and cleaner: lint, typecheck, tests, build, and audit are green locally. The product is not fully launch-done until runtime proof, target-env Supabase/Stripe/Twilio setup, billing/SMS proof, and core slice manual QA are closed.
