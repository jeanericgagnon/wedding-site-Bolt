# DayOf V1 Done Gap List

Date: 2026-04-28
Repo: `jeanericgagnon/wedding-site-Bolt`
Working branch inspected: `codex/v1-finish-hard-gates`

## Current Launch Call

V1 is much closer, but it should not be called fully done yet.

The local engineering hard gates are now green: install, typecheck, tests, build, and the repo's board-freshness plus proof-board commands all pass. `ci-hardpass` and `Release Launch Gate` intentionally stay freshness-only for the board contract; the helper/local proof paths are the ones that regenerate the raw and markdown board outputs. The remaining work is no longer the original launch blocker set; it is broader proof coverage, environment/runtime trust, and security/dependency decisions.

## Verification Snapshot

- `npm ci`: passes, but reports 12 vulnerabilities.
- `npm run build`: passes.
- `npm run typecheck -- --pretty false`: passes.
- `npm run test -- --run`: passes, 371 files / 2,388 tests.
- `npm run proof:v1:board:freshness`: passes.
- `npm run proof:v1:board`: passes and reports the current v1 proof map.
- `npm run proof:v1:board:md`: passes and renders the current markdown launch board.
- `npm run smoke:csvmapper`: passes.
- `npm run smoke:checkin`: passes.
- `npm audit --audit-level=moderate`: fails with 12 vulnerabilities, 7 high.

## P0: Fixed In This Pass

- [x] Restored green `npm run typecheck -- --pretty false`.
- [x] Restored green `npm run test -- --run`.
- [x] Preserved green `npm run build`.
- [x] Preserved green `npm run proof:v1:board`.
- [x] Preserved green `npm run proof:v1:board:md`.
- [x] Added and preserved green `npm run proof:v1:board:freshness`.
- [x] Hardened legacy/demo wedding data compatibility enough for shipped sections and templates to render under current types.
- [x] Fixed quick-start resume and auth handoff normalization tests.
- [x] Fixed registry alias/template isolation and section-definition clone safety.
- [x] Fixed name-change reminder/execution/status-vault drift.
- [x] Fixed starter-draft/onboarding expectation drift in tests.

## P0: Must Prove Before Any Full V1 Claim

- [x] Resolve the repo's own v1 proof blocker: guests / RSVP ops proof.
  - This older blocker is closed; the repo has since moved through non-SMS feature verification and into broader full-suite / cleanup work.
  - Keep using the current proof board, smoke log, and feature-verification notes for live status instead of this archived gap list.

- [ ] Capture the manual canonical couple-path proof.
  - Required route: Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP.
  - Evidence target already named by repo: `docs/v1-smoke-proof-log.md`.
  - This must include UX notes, not just route availability.

- [ ] Verify runtime wording truth.
  - Privacy/access/publish copy must match actual runtime behavior.
  - Marketing/settings/billing copy must avoid stronger claims than the runtime supports.
  - Onboarding and first-run starter draft wording must match the real generated output.

## P1: Must Prove Or Cut From V1 Promise

- [ ] Planner/collaborator runtime proof.
  - Automated proof exists for role matrix, but runtime proof still depends on disposable owner/collaborator credentials.
  - Must prove owner invite -> accept -> role-aware dashboard -> forbidden action blocked for at least planner and coordinator/viewer roles.

- [ ] Coordinator/day-of runtime proof.
  - Need one realistic run through queue, check-in, timeline, alerts, and Q&A.
  - Must answer: can a coordinator quickly tell who is here, what is next, and what needs action?

- [ ] Comms center proof.
  - Need draft -> schedule/send -> history proof.
  - Message status must distinguish draft, scheduled, sent, partial, failed, retried, and blocked states without fake success language.
  - SMS credit purchase/send remains a separate setup gap in `docs/LATER_TODO_MESSAGING_AND_CONTACT_CAPTURE.md`.

- [ ] Seating proof.
  - Need RSVP-backed assignment, lookup/export, and count verification.
  - Special attention: event-specific attendance must not drift from global RSVP state.

- [ ] Registry proof.
  - Need add/import/edit persistence proof on a real registry item.
  - Need repair/cleanup proof for a weak imported item.
  - Need owner purchased-state changes to align with guest-visible behavior.

- [ ] Onboarding first-run continuity proof.
  - Need entry -> onboarding -> dashboard/site starter-draft proof.
  - Must confirm the starter draft is useful without implying publish-ready completeness.

## P1: Deployment And Environment Gaps

- [ ] Confirm Supabase migrations are applied in the target environment.
  - Release notes repeatedly call out migration parity as a caveat.
  - Especially relevant for RBAC, SMS inbound RSVP, registry refresh, vault Drive, and RSVP token validation.

- [ ] Confirm Supabase functions are deployed and auth-callable as intended.
  - `setup-bootstrap`
  - `send-bulk-message`
  - `validate-rsvp-token` / RSVP token validation seam
  - `sms-rsvp-inbound`
  - registry refresh functions
  - vault Google Drive functions

- [ ] Configure and smoke test SMS billing/delivery secrets.
  - `STRIPE_SMS_PRICE_ID_100`
  - `STRIPE_SMS_PRICE_ID_500`
  - `STRIPE_SMS_PRICE_ID_1000`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
  - Verify Stripe webhook and `checkout.session.completed`.
  - Verify credit purchase, credit deduction, Twilio send, and delivery rows.

- [ ] Confirm Vault Google Drive production path.
  - OAuth redirect URI exact match.
  - Provider switch and health check.
  - Contribution upload.
  - Locked entries remain unreadable pre-unlock.
  - Rotate any previously exposed Google OAuth secret.

- [ ] Confirm registry scheduler production path.
  - Daily scheduler works.
  - `dryRun=false` succeeds.
  - Failure rate stays below launch threshold.
  - Conservative cap remains tuned for first 14 days.

## P1: CI / Release Gate Gaps

- [ ] Main CI should be rerun on this branch.
  - Local typecheck, tests, build, `smoke:csvmapper`, `smoke:checkin`, and `proof:v1:board` now pass.

- [ ] Update Preview QA workflow or remove stale branch targeting.
  - `.github/workflows/preview-pages.yml` only triggers on `fix/typecheck-hardening-safe-pass` pushes plus manual dispatch.
  - It still uses `actions/checkout@v4`, `actions/setup-node@v4`, and Node 20 while main CI has moved to v6/Node 24.

- [ ] Decide whether CI should run `proof:v1:*` gates before v1.
  - Current CI hardpass now runs the canonical launch-chain gates plus `proof:v1:board:freshness`; it intentionally does not regenerate `proof:v1:board` / `proof:v1:board:md`, and it still does not run every broader `proof:v1:*` slice by default.
  - Keep the explicit release/manual proof bundles for the wider slice matrix instead of pretending hardpass alone covers every v1 lane.

## P1: Security / Dependency Gaps

- [ ] Fix or explicitly accept the 12 npm audit findings.
  - High: `flatted`.
  - High: `minimatch`.
  - High: `picomatch`.
  - High: `rollup`.
  - High: `undici`.
  - High: `xlsx`, no fix available.
  - Moderate: `ajv`.
  - Moderate: `brace-expansion`.
  - Moderate: `esbuild` via Vite; force fix jumps to Vite 8.
  - Moderate: `postcss`.
  - Moderate: `yaml`.

- [ ] Replace or isolate `xlsx` before launch if untrusted spreadsheet uploads are accepted.
  - Audit reports prototype pollution and ReDoS with no fix available.
  - If kept for v1, constrain usage to trusted/admin-only paths, document accepted risk, and sanitize/size-limit inputs.

- [ ] Review public RLS tradeoffs before public launch.
  - `docs/rls-matrix.md` notes anonymous access policies for public rendering and RSVP.
  - The current policy model may be acceptable for v1, but the public copy must not overstate secrecy or invite-only guarantees.

## P2: Product Scope To Demote Unless Proven

- [ ] External custom domains.
  - Do not claim support.
  - Current safe claim is DayOf URL / slug only.

- [ ] Advanced analytics.
  - Keep language to measured product signals only.
  - Avoid funnel/conversion language unless real tracking exists.

- [ ] Fully automated migration, reminders, or merchant sync.
  - Frame as guided workflows and practical repair support.

- [ ] Enterprise planner governance.
  - Planner collaboration can be claimed only as role-aware collaboration, not full approval/governance software.

- [ ] Memories / guest photo sharing.
  - Useful if stable, but not part of the core v1 claim.

- [ ] Name-change planner.
  - Useful if stable, but not part of the wedding-core v1 claim.
  - Current local tests are green, so this is now a scope/promise decision rather than a local gate failure.

## Open GitHub Items To Triage

- [ ] PR #1: guests toolbar wrapping.
  - Stale, open since 2026-02-23, `mergeable: false`.
  - Rebase or close.

- [ ] PR #2: RSVP custom questions live.
  - Stale, open since 2026-02-23, `mergeable: false`.
  - Rebase, retest, or close.

- [ ] Issue #47: Builder V2 Execution Tracker.
  - Still open, all checklist items appear unchecked in the tracker.
  - Reconcile with actual shipped work and close/update completed child issues.

- [ ] Issues #25-#35 and #36-#46.
  - Many P0/R0 tracker items remain open in GitHub metadata.
  - Either complete, close as superseded, or update status so the backlog reflects reality.

## Suggested Execution Order

1. Fix or isolate high-risk audit findings, especially `xlsx`.
2. Unblock RSVP token validation in the proof environment.
3. Run and log canonical couple-path proof.
4. Run and log guests -> RSVP -> dashboard/event readback proof.
5. Run planner/coordinator role proof with forbidden actions.
6. Run comms, seating, and registry slice proofs.
7. Reconcile GitHub tracker/PRs so launch state is readable.
8. Run final v1 release gate and update `docs/v1-smoke-proof-log.md`.

## Final Done Bar

V1 can be called done only when:

- `npm run typecheck` passes. Current local status: passing.
- `npm run test` passes. Current local status: passing.
- `npm run build` passes. Current local status: passing.
- Security findings are fixed, isolated, or explicitly accepted.
- Tier 1 proof slices have logged runtime evidence.
- Tier 2 proof slices either pass or are narrowed in the public promise.
- GitHub tracker and stale PRs no longer contradict the release story.
