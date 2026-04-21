# V1 Smoke Proof Log

_Date:_ 2026-04-19
_Status:_ Pending first hard run
_Owner:_ Product finish lane

## Purpose
This is the hard proof artifact for whether DayOf can credibly claim **v1 / done-enough**.

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
- Status: PENDING
- Notes:
- Blockers:

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
- Status: PENDING
- Notes:
- Blockers:

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
- Blockers:

---

## Tier 3 — Valuable but not v1-defining

### 8) Memories / guest photo sharing
**Done-enough bar**
Helpful and credible if used, but should not be carrying the v1 claim.

**Pass / Fail**
- Status: OPTIONAL
- Notes:
- Blockers:

### 9) Name-change planner
**Done-enough bar**
Useful if stable, but should not distort the wedding-core launch decision.

**Pass / Fail**
- Status: OPTIONAL
- Notes:
- Blockers:

---

## Severity rules
- **P0** — kills v1 claim outright
- **P1** — must be fixed before launch unless promise is reduced immediately
- **P2** — survivable if clearly outside the v1 line

## Active blocker list
- P0: none logged yet
- P1: no canonical smoke run captured yet
- P1: role-aware collaborator/coordinator proof still missing
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

## Verification notes
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

## Highest-value next proof seam
- Guest-level RSVP and event-specific RSVP are both materially stronger now, but the next likely continuity seam is how newly created or removed event invitations affect downstream event attendance interpretation in itinerary/seating without a fresh explicit event response. That should be the next runtime proof target rather than more copy or permission cleanup.

## Finish-lane read right now
- Public promise is much cleaner than before.
- The repo is now closer to **truthful** than **proven**.
- The main finish risk is no longer fake copy; it is missing proof on the must-ship flows.
