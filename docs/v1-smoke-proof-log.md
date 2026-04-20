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
- Concrete finish gap found and fixed: major collaborator-facing ops surfaces were still defaulting to `owner` until a local role override existed. Planning, Guests, Messages, and Coordinator Mode now bootstrap from the active site role first, then allow a saved per-surface override.
- Concrete finish gap found and fixed: the dashboard shell knew the active-site role but still showed a too-broad owner-shaped navigation map. The shell now filters nav affordances by real role so viewers/coordinators do not get the wrong product shape presented up front.
- Concrete finish gap found and fixed: collaborator-facing role selectors on Planning, Messages, and Coordinator Mode could still let non-owners locally impersonate a stronger role. Those selectors are now owner-only, and collaborators see their real role as read-through state instead.
- Concrete finish gap found and fixed: nav hiding alone still allowed deep-link access to pages outside a collaborator's visible role map. The dashboard shell now redirects hidden current pages back to overview, so shell-level role gating is enforced on navigation as well as display.
- Concrete finish gap found and fixed: Guests still allowed read-only collaborator roles to start the import flow. Guest import is now gated behind the same edit permission as other guest-management actions, with a handler-level guard as backup.
- Concrete finish gap found and fixed: Messaging still exposed scheduled-send execution controls to non-compose roles. Running due sends, sending scheduled campaigns now, and moving scheduled campaigns back to draft are now gated by compose permission in both the UI and handler paths.
- Concrete finish gap found and fixed: Coordinator Mode still relied too heavily on UI disable states for day-of alerts and Q&A creation. Handler-level guards now block unauthorized alert sending/scheduling and guest-question creation for weaker collaborator roles.
- Concrete finish gap found and fixed: Planning write paths still trusted tab-level disable states too much. Task, budget, and vendor create/update/delete handlers now hard-stop based on the collaborator’s actual planning permissions, including total-budget updates and milestone generation.

## Verification notes
- `npm run build` passes after the guest-import permission fix.
- `npm run build` passes after the Messaging scheduled-send permission fix.
- `npm run build` passes after the Coordinator Mode permission fix.
- `npm run build` passes after the Planning handler permission fix.
- `npm run typecheck` is currently failing because of unrelated name-change lane churn (`src/lib/nameChange/*`, `src/pages/dashboard/planning/NameChangePlannerTab.tsx`), not because of the guest-import change.

## Finish-lane read right now
- Public promise is much cleaner than before.
- The repo is now closer to **truthful** than **proven**.
- The main finish risk is no longer fake copy; it is missing proof on the must-ship flows.
