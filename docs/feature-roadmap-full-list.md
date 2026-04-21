# V1 Product Slice Ledger — 2026-04-20

This replaces the old broad competitive wishlist as the working truth for finish.

The question is no longer "how many wedding-platform boxes exist?"
It is: **what can DayOf credibly claim as v1 / done-enough right now, what is missing, and what still needs proof?**

## Hard v1 line
A credible DayOf v1 means:
- a couple can get from setup to a polished live wedding site without obvious trust breaks
- guests can access the site correctly and RSVP without weird state drift
- the couple can run the core ops layer in one place: guests, RSVP, messages, seating, registry, itinerary, settings
- a planner/coordinator can be invited into a role-aware version of the product without fake permissions
- the public story stays inside what the runtime can actually defend

## Ship / cut split

### Must-ship to claim v1
1. Public site / launch path / trust surface
2. Guests / RSVP ops
3. Planner / collaborator access
4. Coordinator / day-of
5. Comms center
6. Seating
7. Registry
8. Onboarding truth / first-run continuity

### Should-ship if stable, but cannot drag launch
1. Memories / guest photo sharing
2. Name-change planner
3. Secondary route cleanup / thin-state cleanup

### Cut from the launch promise unless proof improves
1. Archive / anniversary story as a major product promise
2. External custom domains
3. Advanced analytics language
4. Fully automated migration / reminders / merchant sync language
5. Enterprise planner workflow governance
6. Full event-control-suite language

---

## Per-slice v1 ledger

### 1) Public site / launch path / trust surface
**Done-enough bar**
- Home -> signup/demo -> onboarding/builder -> site -> RSVP feels coherent
- privacy/access/publish behavior matches what the UI claims
- nothing in the path feels stale, placeholder-ish, or misleading

**Done**
- trust/legal surfaces exist
- public privacy/access handling has been tightened repeatedly
- stale public-site gate state has already been cleaned up in recent finish passes

**Missing**
- one canonical end-to-end proof run
- one final pass that catches any remaining public claim blur

**Proof needed**
- route-by-route smoke notes for the full launch path

**Launch status**
- `PROOF-NEEDED`

### 2) Guests / RSVP ops
**Done-enough bar**
- guest list, households, plus-ones, RSVP state, event invites, meal/dietary, and exception handling are trustworthy enough to plan against
- admin/manual intervention can exist, but it must still feel calmer than spreadsheet chaos

**Done**
- strong guest + RSVP breadth exists
- multiple stale-state and continuity bugs were already fixed in public RSVP, event RSVP, and manual RSVP paths
- recent finish passes tightened event-specific response interpretation and dashboard continuity

**Missing**
- one canonical proof run from guest ops -> public RSVP -> dashboard/event readback
- maybe one last continuity fix after that proof run if a real drift seam still shows up

**Proof needed**
- add/edit/review guest, RSVP submit/update, dashboard readback, event-aware visibility

**Launch status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 3) Planner / collaborator access
**Done-enough bar**
- invite flow feels safe and intentional
- planner/coordinator/viewer roles land in a believable role-aware surface
- non-owner roles cannot quietly act like owner clones

**Done**
- collaborator invite/accept exists
- role-aware shell/nav shaping has been materially tightened
- handler-level permission walls were added across planning, guests, messages, and coordinator flows

**Missing**
- executed proof that role boundaries hold under real clicks, not just code inspection

**Proof needed**
- owner invite -> accept -> role-aware dashboard -> restricted action attempt

**Launch status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 4) Coordinator / day-of
**Done-enough bar**
- staff can answer “what is happening now, who is here, what needs action” fast
- check-in / arrivals / Q&A / alerts reduce chaos instead of adding it

**Done**
- dedicated coordinator mode exists
- several arrival-focus and permission truth fixes are in

**Missing**
- one realistic live-use proof run
- clearer proof that local/session behavior does not undercut trust on event day

**Proof needed**
- queue/check-in/timeline/alert smoke under a role-aware path

**Launch status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 5) Comms center
**Done-enough bar**
- couples can draft/segment/send or schedule core messaging without it feeling fake
- message history states are trustworthy enough to act on

**Done**
- message lifecycle surface exists
- scheduled-send and retry/reschedule permission truth has been tightened

**Missing**
- one believable proof that the core send flow can stay inside DayOf
- confidence that lifecycle states read as trustworthy under normal use

**Proof needed**
- draft -> scheduled or sent -> history verification

**Launch status**
- `PARTIAL / MUST-PROVE`

### 6) Seating
**Done-enough bar**
- couples/staff can assign, look up, and verify seating quickly
- event-scoped counts and seating truth do not drift in embarrassing ways

**Done**
- seating planner, lookup, and event-level logic exist
- several event counter/lookup truth seams have already been fixed

**Missing**
- one hard proof run using RSVP-backed guest state

**Proof needed**
- event select -> assign -> lookup/export -> count verification

**Launch status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 7) Registry
**Done-enough bar**
- couples can add/import/repair/edit registry items without babysitting every step
- public promise stays narrower than unproven merchant parity

**Done**
- real dashboard functionality exists
- add/edit/import/repair/internal purchased-state support is materially present

**Missing**
- cleaner proof that purchased-state and import/edit reliability are solid enough for launch trust

**Proof needed**
- add/import/edit + internal purchased-state smoke

**Launch status**
- `PARTIAL / MUST-PROVE`

### 8) Onboarding truth / first-run continuity
**Done-enough bar**
- onboarding gets the couple into a usable state fast
- it does not oversell automation, setup completeness, or preview semantics

**Done**
- onboarding and setup surfaces exist
- recent finish work already tightened onboarding to the real v1 setup bar

**Missing**
- one hard first-run proof pass
- confirmation that onboarding language matches downstream capability cleanly

**Proof needed**
- entry -> onboarding -> builder/dashboard/site smoke

**Launch status**
- `PARTIAL / MUST-PROVE`

### 9) Memories / guest photo sharing
**Done-enough bar**
- useful post-wedding value without pretending this is the core launch claim

**Done**
- meaningful guest-photo/memory surface exists

**Missing**
- deeper proof and tighter storage/provider truth in some flows

**Proof needed**
- optional bucket create/upload/moderation smoke

**Launch status**
- `OPTIONAL / SHOULD-SHIP-IF-STABLE`

### 10) Name-change planner
**Done-enough bar**
- useful structured helper/workspace, not fake legal automation

**Done**
- product depth exists here already

**Missing**
- still not part of the wedding-core launch bar
- proof is weaker than core wedding slices

**Proof needed**
- optional save/load/reminder/status smoke

**Launch status**
- `OPTIONAL / SHOULD-SHIP-IF-STABLE`

---

## Ruthless 2-week board

### Week 1 — prove the spine
1. Canonical v1 smoke pass
2. Guest-state continuity smoke + fix
3. Role-aware collaborator smoke + fix
4. Product truth tightening

### Week 2 — harden the must-ship layer
5. Comms center proof + first broken-path fix
6. Seating proof + first broken-path fix
7. Registry proof + first broken-path fix
8. Launch call prep

## Next finish move
Do not open new architecture projects.
Do not drift into random polish.
Do the next proof-backed finish slice that changes whether DayOf can credibly say **v1 / done-enough**.
