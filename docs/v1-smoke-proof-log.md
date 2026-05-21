# V1 Smoke Proof Log

_Date:_ 2026-04-21
_Status:_ Canonical smoke automation covers public, setup, onboarding, and dashboard route continuity; manual runtime notes still needed
_Owner:_ Product finish lane
_Public v1 claim status:_ Not clear to claim yet
_Launch call right now:_ NO-GO for public v1 claim
_Why no-go:_ critical trust proof is still missing on the canonical couple path and runtime wording truth
_Highest-risk trust gap:_ guests / RSVP ops proof is still blocked by anon-auth 401 on `validate-rsvp-token`
_Secondary trust gap:_ canonical couple-path truth notes, runtime wording verification, and starter-draft wording verification are still missing
_Automation caveat:_ passing canonical smoke is not launch clearance by itself
_Truth gate summary:_ automation is green, launch truth is still red
_Grounded status line:_ `manualProofSummary` is still `requiredCount: 3`, `missingCount: 3`, `blockingCount: 3`
_Grounded next-step line:_ `manualProofSummary.blockingNextSteps` still points to the canonical couple-path truth pass, runtime wording verification, and starter-draft wording verification in that order
_What must change before GO:_ close the anon-auth RSVP blocker, log the canonical couple-path truth pass, verify privacy/access/publish plus marketing/settings/billing runtime wording, and verify starter-draft wording against live runtime behavior
_False-positive avoided:_ a green canonical smoke run no longer reads like public launch approval
_Externally blocked proof seam:_ `npm run proof:v1:guests-rsvp-ops` is `external_fixture_required` until anon-callable auth exists for `validate-rsvp-token`
_Launch-critical blocker command:_ `npm run proof:v1:guests-rsvp-ops`
_Launch decision depends on:_ a logged manual truth pass, not automation alone
_Machine-readable guardrail:_ canonical smoke JSON now encodes the no-go launch call and the blocked RSVP proof command
_Highest-risk trust gap key:_ `guests_rsvp_ops_and_manual_truth_pass`
_Secondary trust gap key:_ `canonical_couple_path_runtime_wording_and_starter_draft_verification_missing`
_Machine-readable flag:_ `runtimeWordingVerificationMissing: true`
_Machine-readable flag:_ `starterDraftWordingVerificationMissing: true`
_Machine-readable requirement:_ `manualProofRequirements.canonicalCouplePath`
_Machine-readable requirement:_ `manualProofRequirements.runtimeWordingVerification`
_Machine-readable requirement:_ `manualProofRequirements.onboardingStarterDraftWording`
_Machine-readable status:_ `manualProofSummary.requiredCount: 3`
_Machine-readable status:_ `manualProofSummary.missingCount: 3` (`canonicalCouplePath`, `runtimeWordingVerification`, `onboardingStarterDraftWording`)
_Machine-readable status:_ all three missing manual-proof requirements are currently blocking, so `manualProofSummary.missingCount` still matches `manualProofSummary.blockingCount`
_Machine-readable status:_ `manualProofSummary.blockingCount: 3`
_Machine-readable status:_ `manualProofSummary.blockingKeys: canonicalCouplePath, runtimeWordingVerification, onboardingStarterDraftWording`
_Grounded status line:_ every current `manualProofSummary.blockingKey` is still represented in `publicV1ClaimBlockers`, so the no-go call remains fully backed by named proof gaps
_Machine-readable status:_ `manualProofSummary.blockingNextSteps` mirrors the remaining runtime-proof actions in order
_Machine-readable next-step order:_ `manualProofSummary.blockingNextSteps[0]` = canonical couple-path truth pass
_Machine-readable next-step order:_ `manualProofSummary.blockingNextSteps[1]` = privacy/access/publish plus marketing/settings/billing runtime wording verification
_Machine-readable next-step order:_ `manualProofSummary.blockingNextSteps[2]` = onboarding + first-run starter-draft runtime wording verification
_Machine-readable evidence log:_ `manualProofSummary.evidenceLogPath: docs/v1-smoke-proof-log.md`
_Machine-readable blocker:_ `manualProofBlockingReasons[canonicalCouplePath]` = no logged human route-note pass yet
_Machine-readable next step:_ `manualProofBlockingReasons[canonicalCouplePath].nextStep` = run and log the Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP truth pass here
_Machine-readable blocker:_ `manualProofBlockingReasons[runtimeWordingVerification]` = privacy/access/publish and marketing/settings/billing runtime wording not yet verified
_Machine-readable next step:_ `manualProofBlockingReasons[runtimeWordingVerification].nextStep` = verify those surfaces in runtime and log pass/fail notes here
_Machine-readable blocker:_ `manualProofBlockingReasons[onboardingStarterDraftWording]` = onboarding and first-run starter-draft wording not yet verified
_Machine-readable next step:_ `manualProofBlockingReasons[onboardingStarterDraftWording].nextStep` = verify onboarding + first-run draft wording in runtime and log pass/fail notes here

## Purpose
This is the hard proof artifact for whether DayOf can credibly claim **v1 / done-enough**.

Current v1 line for this proof pass:
- couples can create and launch a polished wedding site
- guests can use the public site and RSVP flows reliably
- couples can run the core ops layer: guests, RSVP, messages, seating, registry, itinerary, settings
- planner/collaborator support exists in a real usable form
- marketing, settings, and billing surfaces describe the product honestly
- partial features are framed honestly instead of padded into fake completeness

Source of truth: `docs/finish-board-2026-04-19.md`
Last aligned from source: 2026-04-21
Alignment scope: current v1 line bullets only
Verification gate for this log: `npm run proof:v1:canonical-smoke`
Environment-specific blocker gate: `npm run proof:v1:guests-rsvp-ops`
Current automated proof status: canonical smoke passing, guests/RSVP ops environment-blocked
Known blocker message: `validate-rsvp-token function is not callable with current anon credentials (401).`
Blocked proof owner action: provide anon-callable function auth in this environment or run with credentials that can invoke the function.
Blocked proof classification: `external_fixture_required`
Remaining manual proof: one human canonical couple-path route-note pass plus runtime wording verification, including starter-draft wording truth.
Protected route smoke inventory is automated; remaining proof work is now manual truth validation, not route reachability.
Last canonical smoke confirmation: 2026-04-21 via `npm run proof:v1:canonical-smoke`
Latest published-site lookup confirmation: `alex-jordan-demo`
Latest live smoke breadth: 31 Playwright checks passing
Latest canonical smoke result: `ok: true`, `blocked: false`
Latest site lookup statuses: list 200, bySlug 200, byUrl 200
Canonical manual-proof scope: route-note pass plus privacy/access/publish, marketing/settings/billing, and starter-draft wording verification
Starter-draft manual-proof scope: onboarding and first-run dashboard/site draft wording verification
Starter-draft wording proof scope: onboarding plus first-run dashboard/site draft wording still needs explicit runtime-truth verification

This is **not** a generic QA checklist.
This is the must-ship truth gate.

A slice only counts if it:
- works in the live flow that matters
- is actually useful under real wedding pressure
- feels trustworthy
- is not obviously brittle or embarrassing
- is strong enough to claim publicly

## Go / No-Go Standard

### GO only if all Tier 1 slices pass
- public site / launch path / trust surface
- guests / RSVP ops
- planner / collaborator access
- coordinator / day-of

### Soft GO only if Tier 2 has minor contained issues
- comms center
- seating
- registry

### NOT required for v1 claim if honestly demoted
- memories / guest photo sharing
- name-change planner

---

## Tier 1 — Must-pass to claim v1

### 1) Public site / launch path / trust surface
**Why it matters**
If the product cannot be shown, shared, and trusted publicly, the v1 claim is dead before the wedding ops layer matters.

**Flow to prove**
1. Land on Home
2. Move to signup/demo/auth
3. Reach onboarding or builder without confusing dead ends
4. Reach a usable site draft / live site state
5. Open public site
6. Open guest-facing RSVP entry

**Done-enough bar**
- flow feels coherent end to end
- trust/legal/privacy wording matches actual behavior
- nothing obviously fake, placeholder-ish, or misleading remains in the path

**Evidence to capture**
- route list touched
- screenshots or route notes if available
- exact failure point if broken

**Pass / Fail**
- Status: AUTOMATED_PASS / MANUAL_NOTES_PENDING
- Notes:
  - 2026-05-20 17:50 PDT manual live truth pass found a launch blocker on the public site route: `https://dayof.love/site/alex-jordan-demo` and `https://alex-jordan-demo.dayof.love/` rendered `Something went wrong` / `Failed to load wedding site`, even though the Supabase slug lookup smoke resolved `alex-jordan-demo`.
  - Root cause isolated locally: public site runtime selected secret privacy fields (`site_password_hash`, `guest_access_token`) and the wedding-data parser assumed an empty `wedding_data` object had a `couple` shape before `normalizeWeddingData` could repair it.
  - Local fix verified on production preview at `http://127.0.0.1:4177/site/alex-jordan-demo`: the route rendered public site content with RSVP available, no `Something went wrong` state, and no failed Supabase responses.
  - Fix is not live until its PR is merged and deployed; live production still needs a post-deploy recheck of `/site/alex-jordan-demo`.
  - 2026-04-21 automated canonical smoke passed via `npm run proof:v1:canonical-smoke`.
  - `npm run test:e2e:live` passed across Home, Product, Trust, Login, RSVP entry, and collaborator invite route load.
  - Canonical route smoke now also covers signup load, payment gate auth fallback, quick-start preview reachability, and login fallback behavior across protected onboarding, setup, and dashboard surfaces when auth is missing.
  - Protected fallback coverage now explicitly includes `/payment-required`, `/onboarding`, `/onboarding/status`, `/onboarding/guided`, `/onboarding/celebration`, `/setup`, `/setup/celebration`, `/dashboard`, `/dashboard/builder`, `/dashboard/overview`, `/dashboard/guests`, `/dashboard/rsvp-board`, `/dashboard/planning`, `/dashboard/settings`, `/dashboard/messages`, `/dashboard/itinerary`, `/dashboard/registry`, `/dashboard/seating`, `/dashboard/seating-lookup`, `/dashboard/vault`, `/dashboard/photos`, `/dashboard/coordinator`, and `/dashboard/audit-logs`.
  - `npm run smoke:site` passed and resolved a real published slug + site_url (`alex-jordan-demo`) from Supabase.
  - `npm run build` passed in the same proof batch.
- Blockers:
  - Still need one logged human route-note pass for Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP, focused on UX quality rather than route availability.
  - Still need explicit manual verification that privacy/access/publish wording matches live runtime behavior in the canonical couple path.
  - Still need explicit manual verification that marketing, settings, and billing wording stays honest against the live runtime behavior.
  - Still need explicit manual verification that onboarding and the first-run dashboard/site draft wording stay honest against the live starter-draft runtime behavior.

---

### 2) Guests / RSVP ops
**Why it matters**
This is the operational spine. If guest state is weak, messages, seating, and final counts are all suspect.

**Flow to prove**
1. Open guests dashboard
2. Add/edit or review guest + household structure
3. Confirm plus-one / event visibility behavior is credible
4. Submit or update RSVP through guest-facing flow
5. Verify RSVP status flows back into operational state
6. Verify meal/dietary / exception visibility is usable

**Done-enough bar**
- guest data feels safer than spreadsheet chaos
- RSVP state is trustworthy enough to plan against
- fallback/manual intervention does not make the product feel broken

**Evidence to capture**
- guest/household test state used
- RSVP result observed
- any mismatch between public and dashboard state

**Pass / Fail**
- Status: BLOCKED_ON_ENV
- Notes:
  - Current automated target remains `npm run proof:v1:guests-rsvp-ops`.
  - The known blocker in this pass is environment auth on the RSVP validation seam, not a newly observed product-flow regression.
  - Block reproduced under `scripts/v1-proof-guests-rsvp-ops.mjs` with anon credentials in the current environment.
- Blockers:
  - `npm run proof:v1:guests-rsvp-ops` is currently blocked because `validate-rsvp-token` is not callable with anon auth in this environment (401), so guest -> RSVP -> downstream ops proof cannot complete.

---

### 3) Planner / collaborator access
**Why it matters**
This is a major differentiator. If it feels fake or sloppy, the product looks half-built.

**Flow to prove**
1. Open Settings planner access flow
2. Create or review named invite
3. Check role preset and permissions preview
4. Open collaborator invite acceptance path
5. Confirm collaborator lands in a believable role-aware dashboard surface

**Done-enough bar**
- invite flow feels safe and intentional
- collaborator role does not feel like a generic owner clone
- planner/coordinator access is useful without making ownership sloppy

**Evidence to capture**
- role tested
- route after accept
- visible permission differences / framing observed

**Pass / Fail**
- Status: PENDING
- Notes:
  - `npm run test:e2e:live` now covers collaborator invite route load with token param as part of canonical smoke.
  - Accept-path proof is still route-load only; role-aware landing behavior still needs a dedicated finish pass.
- Blockers:

---

### 4) Coordinator / day-of
**Why it matters**
This is where the product either reduces event-day chaos or gets exposed as pretty software with no nerve.

**Flow to prove**
1. Open coordinator mode
2. Review queue / live event focus
3. Search or locate guest situation
4. Use check-in / arrival handling path
5. Review timeline / Q&A / alert action surfaces

**Done-enough bar**
- a real coordinator could use it under pressure
- interface reduces confusion instead of adding it
- role framing and available actions feel coherent

**Evidence to capture**
- role tested
- queue/check-in/timeline action observed
- any browser-local persistence or trust caveat seen

**Pass / Fail**
- Status: PENDING
- Notes:
  - Protected route smoke now covers `/dashboard/coordinator` auth fallback as part of canonical live smoke.
  - Protected route smoke now also covers `/dashboard/audit-logs` auth fallback as part of canonical live smoke.
- Blockers:

---

## Tier 2 — Must be believable before launch, but can survive narrow caveats

### 5) Comms center
**Why it matters**
If this is weak, couples bounce back to external tools and the ops story collapses.

**Flow to prove**
1. Open messages
2. Create or inspect a draft
3. Verify recipient logic / segmentation is credible
4. Send or schedule if possible
5. Verify message history state feels real

**Done-enough bar**
- message lifecycle reads as trustworthy
- core wedding messaging can happen without tool-jumping
- no fake success language

**Pass / Fail**
- Status: PENDING
- Notes:
  - Protected route smoke now covers `/dashboard/messages` auth fallback as part of canonical live smoke.
- Blockers:

---

### 6) Seating
**Why it matters**
Seating is where guest state must become actionable, fast.

**Flow to prove**
1. Open seating
2. Create or inspect event seating state
3. Assign guests / move table state
4. Use lookup or export path
5. Confirm drift / exception handling is intelligible

**Done-enough bar**
- helps a real couple or staff member answer seating questions quickly
- does not create more confusion than it resolves

**Pass / Fail**
- Status: PENDING
- Notes:
  - Protected route smoke now covers `/dashboard/seating` and `/dashboard/seating-lookup` auth fallback as part of canonical live smoke.
- Blockers:

---

### 7) Registry
**Why it matters**
Not the spine of the product, but still part of a credible all-in-one wedding platform claim.

**Flow to prove**
1. Open registry dashboard
2. Add/import/edit a link or item
3. Inspect cleanup/repair behavior
4. Verify purchased-state management on internal side

**Done-enough bar**
- import / cleanup / repair workflow feels practical
- public promise stays narrower than unproven merchant parity

**Pass / Fail**
- Status: PENDING
- Notes:
  - Protected route smoke now covers `/dashboard/registry` auth fallback as part of canonical live smoke.
  - `npm run proof:v1:registry` is intentionally still automation-green / manual-red until this log contains runtime notes for owner import/edit persistence, repair cleanup, and guest-visible purchase truth.
- Blockers:
  - Still need one logged runtime pass for owner add/import/edit persistence on a real registry item.
  - Still need one logged runtime pass for repair or cleanup on a weak imported item.
  - Still need one logged runtime pass confirming guest-visible purchase state stays aligned after owner-side edits.

---

## Tier 3 — Valuable but not v1-defining

### 8) Memories / guest photo sharing
**Done-enough bar**
Helpful and credible if used, but should not be carrying the v1 claim.

**Pass / Fail**
- Status: OPTIONAL
- Notes:
  - Canonical smoke already covers `/dashboard/photos` auth fallback, so this slice is explicitly outside the current v1 claim rather than unguarded.
- Blockers:

### 9) Name-change planner
**Done-enough bar**
Useful if stable, but should not distort the wedding-core launch decision.

**Pass / Fail**
- Status: OPTIONAL
- Notes:
  - The planner alias fix is covered by `src/lib/nameChange/documentKinds.test.ts`, but this slice remains explicitly outside the current wedding-core v1 claim.
- Blockers:

---

## Severity rules
- **P0** — kills v1 claim outright
- **P1** — must be fixed before launch unless promise is reduced immediately
- **P2** — survivable if clearly outside the v1 line

## Active blocker list
- P0: none logged yet
- P1: canonical smoke automated gate now passes, but the manual canonical couple-path route-note proof is still missing
- P1: role-aware collaborator/coordinator proof still missing
- P1: guests / RSVP ops proof remains environment-blocked by `validate-rsvp-token` anon auth 401
- P2: optional memories and name-change slices are now explicitly scoped outside the current wedding-core v1 claim
- P2: marketing/settings/billing honesty is narrowed in copy, but still awaiting one logged runtime wording pass
- P1: guest-state continuity across RSVP -> messages -> seating still unproven in one run

## Proof notes from current inspection
- Collaborator invite claim already enforces invited-email match in both the Accept Collaborator Invite UI flow and the `claim_collaborator_invite` RPC. That older gap should no longer be treated as an active v1 blocker.
- The collaborator proof gap is now narrower and more concrete: role behavior and permission boundaries still need executed QA, not speculative trust-copy cleanup.

## Canonical run order
1. **Public site / launch path / trust surface**
   - this is the first truth gate because it controls whether the product can even be shown honestly
2. **Guests / RSVP ops**
   - this is the operational spine and the highest-likelihood downstream drift source
3. **Planner / collaborator access**
   - this proves DayOf is not faking multi-role support
4. **Coordinator / day-of**
   - this proves the event-week story is useful instead of decorative
5. **Comms center**
6. **Seating**
7. **Registry**

## Evidence standard per slice
For each slice, capture:
- routes touched
- role/account context used
- test data or guest state used
- exact pass/fail call
- exact blocker if failed
- whether the issue is P0, P1, or P2

A slice does **not** count as passed because:
- code looks right
- build passes
- demo mode looks polished
- a doc says it should work
- Concrete finish gap found and fixed: major collaborator-facing ops surfaces were still defaulting to `owner` until a local role override existed. Planning, Guests, Messages, and Coordinator Mode now bootstrap from the active site role first, then allow a saved per-surface override.
- Concrete finish gap found and fixed: the dashboard shell knew the active-site role but still showed a too-broad owner-shaped navigation map. The shell now filters nav affordances by real role so viewers/coordinators do not get the wrong product shape presented up front.
- Concrete finish gap found and fixed: collaborator-facing role selectors on Planning, Messages, and Coordinator Mode could still let non-owners locally impersonate a stronger role. Those selectors are now owner-only, and collaborators see their real role as read-through state instead.
- Concrete finish gap found and fixed: nav hiding alone still allowed deep-link access to pages outside a collaborator's visible role map. The dashboard shell now redirects hidden current pages back to overview, so shell-level role gating is enforced on navigation as well as display.
- Concrete finish gap found and fixed: Guests still allowed read-only collaborator roles to start the import flow. Guest import is now gated behind the same edit permission as other guest-management actions, with a handler-level guard as backup.
- Concrete finish gap found and fixed: Messaging still exposed scheduled-send execution controls to non-compose roles. Running due sends, sending scheduled campaigns now, and moving scheduled campaigns back to draft are now gated by compose permission in both the UI and handler paths.
- Concrete finish gap found and fixed: Coordinator Mode still relied too heavily on UI disable states for day-of alerts and Q&A creation. Handler-level guards now block unauthorized alert sending/scheduling and guest-question creation for weaker collaborator roles.
- Concrete finish gap found and fixed: Planning write paths still trusted tab-level disable states too much. Task, budget, and vendor create/update/delete handlers now hard-stop based on the collaborator’s actual planning permissions, including total-budget updates and milestone generation.
- Concrete finish gap found and fixed: Guests bulk follow-up handlers still trusted menu/button disable states too much. Read-only collaborator roles can no longer trigger thank-you updates, clear all check-ins, or send bulk/due reminders through handler paths.
- Concrete finish gap found and fixed: Guests individual high-impact actions still trusted button disable states too much. Read-only collaborator roles can no longer trigger invitation sends, check-in changes, or thank-you state changes through direct handler paths.
- Concrete finish gap found and fixed: a few remaining Coordinator/Guests edge paths still skipped the new permission wall. Undo-last-check-in, coordinator check-in, door escalation, and Q&A answer saves now hard-stop on the collaborator’s actual permission level instead of relying on surrounding UI state.
- Concrete finish gap found and fixed: assisted RSVP was still one of the remaining manual-ops paths outside the new guest permission wall. Read-only collaborator roles can no longer record assisted RSVPs through the handler path.
- Concrete finish gap found and fixed: assisted RSVP could leave stale attending-only RSVP detail behind when a guest was manually marked declined. The manual RSVP path now clears meal and plus-one detail on decline so guest-ops views do not keep showing stale attending-state data.
- Concrete finish gap found and fixed: the demo/manual proof path for assisted RSVP still preserved stale attending-only detail on declines even after the persisted path was corrected. Demo guest state now clears meal and plus-one detail on manual declines too, so proof behavior matches the real path.
- Concrete finish gap found and fixed: assisted/manual RSVP was still drifting from the public RSVP contract on ceremony/reception attendance flags. Manual RSVP now updates `attending_ceremony` and `attending_reception` alongside top-level attendance so per-event state does not go stale after manual changes.
- Concrete finish gap found and fixed: first-time event-specific RSVP submissions were not stamping `responded_at`, while updates were. Event RSVP now records a response timestamp on insert as well, so fresh event responses and edited event responses behave consistently in downstream itinerary/seating reads.
- Concrete finish gap found and fixed: guest edit rollback restored deleted event invitations but not the deleted `event_rsvps` rows behind them. Failed guest invitation edits now restore both invitations and their prior event-specific RSVP snapshots instead of silently losing per-event response history.
- Concrete finish gap found and fixed: event seating counters were mixing in guest-level declined/pending counts without first restricting to guests actually invited to the event. Event counters now derive invited/attending/declined/pending/seated from the event-invited subset, so event dashboards stop bleeding in unrelated site-wide RSVP state.
- Concrete finish gap found and fixed: seating/event eligibility was still inheriting global RSVP acceptance when an event invitation existed but no explicit `event_rsvp` response had been recorded yet. Event-specific attendance now requires an explicit positive event RSVP instead of silently treating global wedding acceptance as event attendance.
- Concrete finish gap found and fixed: Seating Lookup was still loading stale invalid assignments, which could give staff wrong live table/seat answers even after assignment drift was already marked invalid elsewhere. Lookup now restricts itself to `is_valid = true` assignments.
- Concrete finish gap found and fixed: the Seating demo/proof path was still computing counters from looser guest-level assumptions than the hardened runtime path. Demo counters now mirror invited/attending/seated math more closely so proof behavior stops teaching the wrong event-scoped model.
- Concrete finish gap found and fixed: itinerary pending counts were derived from raw `rsvp_count`, which could undercount pending guests whenever an `event_rsvp` row existed but `attending` was still null. Pending is now derived from invitation count minus explicit yes/no counts, so itinerary progress stops overstating resolved event responses.
- Concrete finish gap found and fixed: Coordinator Mode's “Next arrivals” list was still showing any unchecked-in guest, including people already flagged for review. That diluted the live fast-path with edge cases. The list now shows only unchecked-in guests whose door status is actually `ready`.
- Concrete finish gap found and fixed: after narrowing “Next arrivals” to ready guests, the empty-state message could still falsely claim everyone was checked in even when review-needed guests were waiting. The empty state now distinguishes between “no ready arrivals” and “everyone checked in.”
- Concrete finish gap found and fixed: Messaging retry still trusted button disable state instead of the handler path. Non-compose roles can no longer retry failed or partial campaign sends by reaching the retry action directly.
- Concrete finish gap found and fixed: Messaging reschedule still trusted UI state instead of the handler path. Non-compose roles can no longer move scheduled campaigns by reaching the reschedule action directly.
- Concrete finish gap found and fixed: public site lookup was not selecting privacy/access fields that the public SiteView actually depends on. Password/invite-only/search-visibility/default-language gating now receives the real row fields instead of silently degrading toward public defaults.
- Concrete finish gap found and fixed: the public site path could still fall back to section-based rendering even for unpublished/private-preview access when preview JSON was missing, which risked showing an ambiguous stale render path instead of the actual preview state. Section fallback is now gated to published sites only.
- Concrete finish gap found and fixed: ambiguous RSVP guest selection still depended on a second token lookup and could drop already-known RSVP config if that follow-up lookup failed. Picked guests now retain the already-loaded deadline/questions/meal/household context instead of degrading to a weaker form state.
- Concrete finish gap found and fixed: selecting a guest with no RSVP after viewing one who already had an RSVP could leave stale `existingRsvp` state in memory. The guest-facing RSVP form now explicitly clears prior RSVP state when a newly selected guest has not responded yet.
- Concrete finish gap found and fixed: the RSVP deadline was mostly enforced through UI state, but the submit handler itself did not hard-stop a brand-new RSVP after deadline. The guest-facing submit path now blocks new post-deadline responses unless the guest already has an RSVP on file.
- Concrete finish gap found and fixed: EventRSVP used a module-global `hasEventRsvpsTable` flag, so one site/session falling into the unsupported path could disable event-specific RSVP for unrelated guests until reload. Event RSVP support is now scoped to component state instead of leaking across guests/pages.
- Concrete finish gap found and fixed: invite-only public site access could still accept any non-empty token when the site row was missing `guest_access_token`, because the gate only compared tokens when a saved token existed. Invite-only now requires a real stored access token and an exact match instead of silently degrading to “any token works.”
- Concrete finish gap found and fixed: password-protected public access could still degrade to open if the site row was missing `site_password_hash`, because the gate only blocked when a hash existed. Password mode now blocks whenever the site is marked password-protected unless a real hash exists and the site has already been unlocked for the current session.
- Concrete finish gap found and fixed: RSVP search/lookup could leave the prior guest context hanging around while a new lookup was in flight or after it failed, because the handler did not clear guest/RSVP/household state before searching again. Fresh lookups now reset the prior guest context before the next lookup runs.
- Concrete finish gap found and fixed: RSVP token auto-load had the same stale-state problem as manual search. A bad or changed token could leave the last guest/RSVP/household context hanging behind the error state. Token-driven lookups now clear prior guest context before loading.
- Concrete finish gap found and fixed: SiteView could start a new slug load while still carrying the prior site’s privacy gate, error, or coming-soon state until the next fetch resolved. Public site loads now reset those gate/error fields up front so one site’s state does not bleed into another site view attempt.
- Concrete finish gap found and fixed: the public Home/Product story was still giving post-wedding memory layers near-equal billing with the hard wedding-core v1 slices. Home now centers the feature carousel on must-ship wedding execution work, swaps the archive/memory panel out for day-of coordination, and explicitly demotes archive/photo/name-change language into an adjacent-not-core lane instead of letting the launch claim blur.
- Concrete finish gap found and fixed: onboarding and setup completion copy still blurred “starter draft created” with “site is ready,” and one RSVP tip still implied stronger live-response proof than the current v1 bar earns. Onboarding now frames the output as a starter draft, points couples back to dashboard refinement before launch, removes the stale “real-time responses” promise, and replaces “preview privately” wording with access-mode language that matches the actual product truth better.
- Concrete finish gap found and fixed: the Trust page still framed the high-level v1 line, but did not expose the per-slice reality of what is done enough vs still missing vs proof-needed. Trust now carries the current slice-by-slice v1 read so the public truth surface cannot quietly flatten partially-proven slices into one equally-earned launch claim.
- Concrete finish gap found and fixed: feature marketing pages for Messaging, Registry, and RSVP still had a few “everything,” “complete,” and “real-time” phrases that oversold slices the finish board still marks as proof-needed or must-prove. Those pages now frame the offer as strong practical cores, not fully-earned comprehensive systems, and RSVP analytics now points to the latest saved responses instead of implying harder live-state guarantees than the current proof bar supports.
- Concrete finish gap found and fixed: the remaining Guests, Seating, Travel, and RSVP summary blocks still reused the same blanket “Everything you need, already together” framing that made partially-proven slices sound equally comprehensive. Those pages now describe practical cores instead of total completeness, and RSVP summary language now says “current” visibility instead of implying harder live-state guarantees than the finish board has earned.
- Concrete finish gap found and fixed: two small but still real launch-claim leaks remained outside the main feature-page pass — RSVP still labeled its visibility block as “Real-Time Analytics,” and the billing modal still promised “Everything you need for a beautiful wedding website.” Those surfaces now use narrower wording that matches the current proven core instead of implying harder live-state guarantees or blanket completeness.
- Concrete finish gap found and fixed: the existing Playwright "live smoke" was too weak to support the current v1 proof gate. It only checked that the homepage, login page, and invite page loaded. The public smoke now asserts the narrowed v1 story on Home, Product, and Trust, including must-ship / should-ship / cut framing and per-slice reality markers, so the executable smoke better matches the actual launch-truth bar.
- Concrete finish gap found and fixed: the canonical public/onboarding smoke still existed as three loose commands instead of one slice-level gate. There is now a dedicated `proof:v1:canonical-smoke` bundle that runs build integrity, the public v1 Playwright smoke, and the site lookup smoke together, and returns one structured pass/fail/blocked result for the top cross-product truth gate.
- Concrete finish gap found and fixed: the Guests / RSVP / ops slice still depended on three separate smoke commands with no single slice-level proof entry point. That made the board harder to execute and easier to hand-wave. There is now a dedicated `proof:v1:guests-rsvp-ops` command that runs and summarizes the RSVP strict smoke, CSV mapper guard, and check-in guard as one proof bundle, while still calling out the manual dashboard/public continuity proof that remains required.
- Concrete finish gap found and fixed: the new Guests / RSVP / ops proof bundle initially treated an environment auth blocker the same as a product failure. That was muddy and would have hidden the real issue. The bundle now classifies blocker-vs-failure explicitly, surfaces blocker details/recommendation in its JSON output, and only exits non-zero for actual required-step failures.
- Concrete finish gap found and fixed: collaborator access still lacked automated proof for the actual role-permission matrix. Invite utilities were lightly tested, but the owner/planner/coordinator/viewer boundaries themselves were not locked. There is now a dedicated collaborator-access proof bundle plus plannerAccess role-matrix tests that assert the current v1 boundaries for editing, budget/vendors, dashboard message composition, coordinator updates, and preset-to-role derivation.
- Concrete finish gap found and fixed: seating continuity still relied on event-scoped attendance and counter math buried inside the service layer without direct proof. That left the highest-risk seating truth seam under-locked. Seating now exposes pure helpers for event attendance interpretation and invited-only counter derivation, has direct tests for explicit event RSVP vs top-level RSVP fallback behavior, and ships with a dedicated seating-continuity proof bundle.
- Concrete finish gap found and fixed: the human finish board and machine-readable proof board had drifted behind the actual finish lane. They still pointed at outdated next steps and older raw commands even after proof bundles existed. The board now reflects the current executable gates, the real env blocker on RSVP strict smoke, and the fact that the next highest-leverage work is runtime proof capture, not more claim cleanup.
- Concrete finish gap found and fixed: collaborator runtime proof was still sitting in the runbook as a manual intention, even though the repo already had an invite/create/claim Playwright script. There is now a dedicated `proof:v1:collaborator-runtime` gate that executes that runtime path when disposable proof credentials are available, and reports a structured blocker when those credentials are missing instead of leaving the lane stuck in vague “manual later” language.
- Concrete finish gap found and fixed: comms center still relied too much on surface plausibility. The core message-state truth and non-compose permission boundaries were not captured in an executable slice-level proof gate. There is now a dedicated comms-center proof bundle, direct tests for delivery-state labeling, and a messaging guard smoke that asserts compose/send/retry/reschedule/run-due actions stay permission-gated in the dashboard surface.
- Concrete finish gap found and fixed: registry was still lagging the other major slices in proof structure. It had service coverage, but no slice-level proof gate for metadata/repair attention truth or dashboard guardrails. There is now a dedicated registry proof bundle, direct tests for blocked retailer messaging + repair-state attention logic, and a registry guard smoke that asserts the dashboard still routes through quantity sanitation, duplicate review, and attention-state helpers.
- Concrete finish gap found and fixed: coordinator/day-of proof was stronger than the board implied, but its checks were scattered. The slice now has a dedicated coordinator-dayof proof bundle that groups role-access boundaries, check-in queue behavior, single-live-event timeline state, the check-in guard smoke, and build integrity into one executable gate.

## Verification notes
- `npm run proof:v1:board` now gives a machine-readable view of the current v1 proof gate.
- `npm run proof:v1:board:md` now gives a human-readable proof-board export for quick review.
- `npm run build` passes after the guest-import permission fix.
- `npm run build` passes after the Messaging scheduled-send permission fix.
- `npm run build` passes after the Coordinator Mode permission fix.
- `npm run build` passes after the Planning handler permission fix.
- `npm run build` passes after the Guests bulk-action permission fix.
- `npm run build` passes after the Guests individual-action permission fix.
- `npm run build` passes after the Coordinator/Guests edge-path permission fix.
- `npm run build` passes after the assisted-RSVP permission fix.
- `npm run build` passes after the assisted-RSVP continuity fix.
- `npm run build` passes after the demo/manual assisted-RSVP continuity fix.
- `npm run build` passes after the assisted/manual event-selection continuity fix.
- `npm run build` passes after the event-RSVP response-timestamp continuity fix.
- `npm run build` passes after the guest-invitation rollback continuity fix.
- `npm run build` passes after the event counter invitation-scope fix.
- `npm run build` passes after the event-specific attendance interpretation fix.
- `npm run build` passes after the Seating Lookup validity fix.
- `npm run build` passes after the Seating demo/proof-path alignment fix.
- `npm run build` passes after the itinerary pending-count truth fix.
- `npm run build` passes after the coordinator next-arrivals focus fix.
- `npm run build` passes after the coordinator next-arrivals empty-state truth fix.
- `npm run build` passes after the Messaging retry permission fix.
- `npm run build` passes after the Messaging reschedule permission fix.
- `npm run build` passes after the public site lookup field fix.
- `npm run build` passes after the public preview fallback gating fix.
- `npm run build` passes after the RSVP picked-guest fallback fix.
- `npm run build` passes after the RSVP stale-existing-state fix.
- `npm run build` passes after the RSVP handler-level deadline enforcement fix.
- `npm run build` passes after the EventRSVP support-scoping fix.
- `npm run build` passes after the invite-only token enforcement fix.
- `npm run build` passes after the password-mode gating fix.
- `npm run build` passes after the RSVP fresh-lookup state reset fix.
- `npm run build` passes after the RSVP token-auto-load state reset fix.
- `npm run build` passes after the SiteView stale-gate reset fix.
- `npm run typecheck && npm run build` passes after the Home/Product v1-story tightening pass.
- `npm run build` passes after the onboarding first-run truth-copy tightening pass.
- `npm run build` passes after the Trust-page per-slice v1 truth pass.
- `npm run build` passes after the feature-page v1 truth pass for Messaging, Registry, and RSVP.
- `npm run build` passes after the remaining feature-page completeness-language cleanup for Guests, Seating, Travel, and RSVP.
- `npm run build` passes after the final RSVP/billing truth-copy cleanup.
- `npm run proof:v1:board && npm run build` passes after the v1 proof-board/runbook pass.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:live` passes against local preview after the public v1 trust smoke hardening pass.
- `npm run proof:v1:canonical-smoke` passes, returning one structured result for build integrity, public v1 Playwright smoke, and site lookup truth.
- `npm run proof:v1:guests-rsvp-ops` passes after the Guests / RSVP / ops proof-bundle pass.
- `npm run proof:v1:guests-rsvp-ops` now returns a structured blocked-state summary when RSVP strict smoke is environment-blocked, instead of collapsing blocker vs failure.
- `npm run proof:v1:collaborator-access` passes after the collaborator-access proof-bundle + role-matrix test pass.
- `npm run proof:v1:seating-continuity` passes after the seating continuity proof-bundle pass.
- `npm run proof:v1:board && npm run proof:v1:board:md` pass after syncing the finish/proof boards to the current executable lane reality.
- `npm run proof:v1:collaborator-runtime` now returns a structured blocked-state summary when runtime proof credentials are missing, instead of leaving collaborator runtime proof as vague manual work.
- `npm run proof:v1:comms-center` passes after the comms-center proof-bundle pass.
- `npm run proof:v1:registry` passes after the registry proof-bundle pass.
- `npm run proof:v1:coordinator-dayof` passes after the coordinator/day-of proof-bundle pass.

## Highest-value next proof seam
- Guest-level RSVP and event-specific RSVP are both materially stronger now, but the next likely continuity seam is how newly created or removed event invitations affect downstream event attendance interpretation in itinerary/seating without a fresh explicit event response. That should be the next runtime proof target rather than more copy or permission cleanup.

## Finish-lane read right now
- Public promise is much cleaner than before.
- The repo is now closer to **truthful** than **proven**.
- The main finish risk is no longer fake copy; it is missing proof on the must-ship flows.
