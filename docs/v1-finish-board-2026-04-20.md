# V1 Finish Board — 2026-04-20

## What v1 actually means now
A credible **DayOf v1 / done-enough** claim is not “wedding everything.”
It is this narrower, harder line:

- a couple can get from setup to a polished live wedding site without obvious trust breaks
- guests can find the site, access it correctly, and RSVP without weird state drift
- the couple can run the core wedding ops layer from one product: guests, RSVP, messages, seating, registry, itinerary, settings
- a planner/coordinator can be invited into a role-aware version of the product without it collapsing into fake permissions
- the public story matches the real runtime closely enough that launch does not feel dishonest

If that line holds, the product can credibly say **website first, calm execution underneath**.
If that line fails, the rest is noise.

## Ruthless scope split

### Must ship to claim v1
1. Public site / launch path / trust surface
2. Guests / RSVP ops
3. Planner / collaborator access
4. Coordinator / day-of
5. Comms center
6. Seating
7. Registry
8. Onboarding truth / first-run continuity

### Should ship if stable, but cannot be allowed to drag launch
1. Memories / guest photo sharing
2. Name-change planner
3. Extra thin-state cleanup or secondary route polish

### Cut from the promise immediately unless proof gets stronger
1. Anniversary / archive as a major product story
2. Advanced analytics language
3. External custom domains
4. Full automation language around migration, reminders, merchant sync, or legal flows
5. Enterprise planner workflow governance
6. Full event-day control-suite language

## Per-slice done-enough bars

### 1) Public site / launch path / trust surface
**Must be true**
- Home -> signup/demo -> onboarding/builder -> site view -> RSVP feels coherent
- privacy, access mode, and publish state behave exactly as implied
- nothing in the path feels placeholder-ish, stale, or ambiguous

**Done enough already**
- trust/legal surfaces exist
- several launch/privacy/runtime trust seams were fixed
- SiteView stale-state and privacy gating are materially tighter

**Still missing**
- one hard captured canonical smoke across the full path
- proof that the final public-facing product story is narrower than product ambition everywhere that matters

**Proof needed**
- route-by-route smoke log with failure notes or pass notes

**Launch read**
- **Done:** launch/privacy mechanics are mostly there
- **Missing:** one canonical proof run and final claim discipline across public pages
- **Proof-needed:** end-to-end route smoke with screenshots/log notes

**Status**
- `PROOF-NEEDED`

### 2) Guests / RSVP ops
**Must be true**
- guest list is safer than spreadsheet chaos
- household/plus-one/event invite state is believable
- public RSVP and assisted/manual RSVP stay aligned enough for real planning
- meal/dietary/exception state is visible where couples need it

**Done enough already**
- strong guest + RSVP surface breadth exists
- many continuity seams have already been fixed
- public RSVP state handling is much tighter than before

**Still missing**
- one clear proof run from guest ops -> public RSVP -> back to dashboard truth
- harder proof that event-specific RSVP state survives common admin edits cleanly

**Proof needed**
- one evidence run covering create/edit/review guest, RSVP submit/update, dashboard readback, event-aware visibility

**Launch read**
- **Done:** feature breadth + several trust fixes are in
- **Missing:** one canonical continuity proof and maybe one last admin-edit drift fix
- **Proof-needed:** guest edit -> RSVP submit/update -> dashboard/event readback

**Status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 3) Planner / collaborator access
**Must be true**
- invite flow feels safe
- collaborator lands in a believable role-aware surface
- non-owner roles cannot quietly behave like owner clones

**Done enough already**
- invite/accept flow exists
- shell/nav/handler permission truth is much tighter than before
- collaborator framing is visibly more real than fake

**Still missing**
- hard executed role smoke proving owner vs planner vs coordinator boundaries in live surfaces

**Proof needed**
- role-aware smoke over settings invite -> accept -> dashboard -> restricted action attempt

**Launch read**
- **Done:** collaborator path exists and reads substantially more honest
- **Missing:** proof that roles break cleanly under real clicks, not just code inspection
- **Proof-needed:** owner/planner/coordinator smoke with one forbidden action each

**Status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 4) Coordinator / day-of
**Must be true**
- staff can answer “what is happening now, who is here, what needs action” fast
- check-in / arrivals / Q&A / alerts feel calmer, not busier

**Done enough already**
- dedicated coordinator mode exists
- several arrival/permission truth fixes are in

**Still missing**
- one hard realistic live-use proof run
- clearer proof that browser-local/session-local behavior does not undercut trust for actual event usage

**Proof needed**
- queue/check-in/timeline/alert smoke under a role-aware path

**Launch read**
- **Done:** the surface exists and is pointed at real event-day questions
- **Missing:** proof that it is calm under actual usage, not just feature-complete looking
- **Proof-needed:** timed check-in/timeline/Q&A smoke

**Status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 5) Comms center
**Must be true**
- couples can draft/segment/send or schedule core wedding messaging without it feeling fake
- message history states are trustworthy enough to act on

**Done enough already**
- message lifecycle and dashboard surface exist
- permission truth is tighter than before

**Still missing**
- harder proof that a real core send flow can stay inside DayOf
- proof that state transitions read as trustworthy under normal usage

**Proof needed**
- draft -> scheduled or sent -> history verification

**Launch read**
- **Done:** surface area and core lifecycle are present
- **Missing:** confidence that send/schedule/history are actually dependable enough to promise
- **Proof-needed:** one real end-to-end message lifecycle smoke

**Status**
- `PARTIAL / MUST-PROVE`

### 6) Seating
**Must be true**
- couples/staff can assign, look up, and verify seating quickly
- event-scoped counts and seating truth do not drift in embarrassing ways

**Done enough already**
- seating planner, lookup, and event-level logic exist
- several event-truth seams were fixed

**Still missing**
- one hard proof run of create/assign/lookup/export or day-of lookup

**Proof needed**
- real seating smoke tied to actual RSVP-backed guest state

**Launch read**
- **Done:** the core planner/lookup shape is there
- **Missing:** proof that seating truth follows RSVP truth without drift
- **Proof-needed:** RSVP-backed seating assign + lookup verification

**Status**
- `MOSTLY-DONE / PROOF-NEEDED`

### 7) Registry
**Must be true**
- couples can add/import/repair/edit registry items without babysitting every step
- public promise stays narrower than unproven parity

**Done enough already**
- strong dashboard functionality exists
- import/repair/public-alignment work is materially present

**Still missing**
- cleaner proof around purchased-state consistency and import/edit reliability in a launch-critical read

**Proof needed**
- add/import/edit + internal purchased-state smoke

**Launch read**
- **Done:** couples can do real registry work already
- **Missing:** proof that item-state reliability is good enough for public trust
- **Proof-needed:** add/import/edit/purchased-state smoke

**Status**
- `PARTIAL / MUST-PROVE`

### 8) Onboarding truth / first-run continuity
**Must be true**
- onboarding gets the couple into a usable state fast
- it does not oversell automation or private-preview semantics

**Done enough already**
- first-run/setup surfaces exist
- trust-copy cleanup has already happened in several places

**Still missing**
- one hard first-run proof pass
- tighter confirmation that onboarding language matches real downstream capability

**Proof needed**
- first-run smoke from entry to usable builder/dashboard/site state

**Launch read**
- **Done:** first-run flow exists and is directionally right
- **Missing:** proof that it is fast, honest, and lands people in a usable state consistently
- **Proof-needed:** entry -> onboarding -> builder/dashboard/site smoke

**Status**
- `PARTIAL / MUST-PROVE`

## Whole-product read right now

### Credibly done enough
- product breadth exists across the full wedding workflow
- public/runtime trust is much better than it was
- collaborator permission truth is no longer obviously fake
- RSVP and event-state continuity are materially stronger

### Not credibly done enough yet
- hard proof coverage
- one captured canonical couple/guest path
- one captured role-aware collaborator/coordinator path
- one captured guest-state continuity path into downstream ops surfaces

## Real blockers

### P0 blockers
- none currently identified in code review after the latest trust/continuity fixes

### P1 blockers
1. No canonical v1 smoke run is logged yet
2. No executed role-aware collaborator proof is logged yet
3. No executed guest -> RSVP -> ops continuity proof is logged yet
4. Comms/registry still rely more on surface plausibility than recent finish proof

### P2 blockers
1. Memories slice still reads bigger than its hard proof
2. Name-change slice is still a should-ship sidecar, not core launch evidence

## Ruthless 2-week finish board

### Week 1 — prove the spine
1. **Canonical v1 smoke pass**
   - Home -> auth/demo -> onboarding/builder -> site -> RSVP -> guests/settings
   - output goes into `docs/v1-smoke-proof-log.md`
   - owner: finish lane
   - exit bar: one clean pass log + exact failures called out, not hand-waved
2. **Guest-state continuity smoke + fix**
   - prove or fix guest edits, RSVP updates, event-level visibility, downstream reads
   - exit bar: one guest can move through public and dashboard surfaces without trust drift
3. **Role-aware collaborator smoke + fix**
   - owner invite -> collaborator accept -> role-aware dashboard -> restricted action attempts
   - exit bar: one planner and one coordinator boundary proven with evidence
4. **Product truth tightening**
   - public product/marketing surfaces must show core v1 vs surrounding product direction cleanly
   - exit bar: public story only promises what the current core can defend

### Week 2 — harden the must-ship layer
5. **Comms center proof + first broken-path fix**
   - exit bar: draft -> schedule/send -> history state reads trustworthy
6. **Seating proof + first broken-path fix**
   - exit bar: RSVP-backed seating assign/lookup works without count drift
7. **Registry proof + first broken-path fix**
   - exit bar: add/import/edit/purchased-state path survives one realistic smoke
8. **Launch call prep**
   - re-read the board, cut any unproven promise language, call go/no-go honestly
   - exit bar: every remaining launch claim maps to proof or a consciously accepted gap

## Ship / cut call by slice right now
- **Must-ship now:** public trust path, guests/RSVP, planner access, coordinator/day-of, comms, seating, registry, onboarding truth
- **Should-ship if stable:** memories/photo return path, name-change planner, extra route cleanup
- **Cut from launch claim unless proven:** archive/anniversary story as a major promise, external domains, advanced analytics, “fully automated” anything, enterprise governance language

## Next highest-leverage concrete task
The next best cross-product finish task is:

**Make the public product story show the real v1 split clearly.**

Reason:
- this shapes what the product is allowed to claim before deeper proof arrives
- it reduces launch dishonesty risk across multiple slices at once
- it turns the finish board from internal truth into external truth

What that means concretely:
- keep the marketing story centered on website + guest ops + execution
- demote archive/anniversary/name-change language out of the core launch claim
- make must-ship vs should-ship vs not-in-v1 visible enough that launch copy cannot quietly blur it
