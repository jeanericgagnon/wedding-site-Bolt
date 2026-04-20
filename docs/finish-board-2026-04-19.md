# Finish Board — 2026-04-19

## Current v1 line
A credible v1 / done-enough claim is:
- couples can create and launch a polished wedding site
- guests can use the public site and RSVP flows reliably
- couples can run the core ops layer: guests, RSVP, messages, seating, registry, itinerary, settings
- planner/collaborator support exists in a real usable form
- marketing, settings, and billing surfaces describe the product honestly
- partial features are framed honestly instead of padded into fake completeness

Not part of the v1 line:
- external custom domains
- advanced analytics as a major product promise
- fully automated migration
- full event-day operations software beyond practical coordination support
- enterprise-grade planner workflow governance
- perfect public/dashboard purchased-state parity everywhere

## Per-feature v1 bars

Real bar for every slice:
- not just present, but fully functioning in the live flow that matters
- actually useful under real wedding pressure
- trustworthy enough that couples/planners/coordinators would rely on it
- not obviously brittle or embarrassing outside demo mode
- strong enough that public claims feel earned

Things that do **not** count as done:
- route exists
- surface exists
- UI looks polished
- one happy path works once
- demo mode works
- docs claim it works

### 1) Comms center
**V1 bar**
- couples can reliably draft, segment, schedule, and send guest messages in a way that reduces manual follow-up chaos
- email-first is enough only if it feels dependable in a real guest workflow; SMS can stay partial if framed clearly
- delivery history must distinguish draft, scheduled, sent, partial, failed in a way users would actually trust

**Done**
- messages dashboard exists
- lifecycle states exist in UI
- draft helpers for RSVP/day-of/event reminders exist
- scheduled dispatch + bulk send paths exist in code

**Missing / partial**
- not a full communications CRM
- provider completeness and telemetry are only as good as delivery logs captured
- public claims were too strong on the messaging feature page and needed tightening

**Proof needed**
- one smoke showing draft -> scheduled or sent -> history state update with believable statuses
- proof that a couple could use this instead of bouncing to another email tool for the core wedding flow
- no vague fake-success wording in the UI or marketing copy

**Priority**
- must ship

**Ownership**
- likely active lane elsewhere for depth; finish lane should enforce truth/proof bar

### 2) Coordinator / day-of
**V1 bar**
- coordinator mode must help staff answer live questions, track arrivals, see what is happening next, and send/queue useful updates without confusion
- should make the event feel calmer in a live scenario, not just look like a dashboard

**Done**
- dedicated coordinator dashboard exists
- check-in, timeline, alert log, role-based coordination framing, and Q&A flows exist

**Missing / partial**
- some persistence is still local/browser-scoped
- not a complete event-day operations system

**Proof needed**
- role-aware smoke showing coordinator opens mode, sees guests/events, can toggle check-in, and use live queue credibly under realistic pressure
- enough confidence that a real coordinator would not immediately fall back to paper/text chaos
- copy must avoid claiming comprehensive event control

**Priority**
- must ship

**Ownership**
- mixed/shared

### 3) Name-change planner
**V1 bar**
- product can support a structured post-wedding name-change workflow that genuinely reduces confusion, missed steps, and manual tracking
- should be clearly framed as a structured helper/workspace, not a guaranteed legal automation engine

**Done**
- dedicated name-change planner tab exists in planning
- structured intake, plan engine, reminders, execution status, and document metadata support exist

**Missing / partial**
- niche slice relative to wedding-core v1
- proof of real end-to-end persistence/usefulness is weaker than wedding-core slices
- should not distort the core product claim if still partial

**Proof needed**
- manual smoke showing save/load of a case, reminders, and plan status in a way that would actually help someone finish the process
- copy should frame it as planning support, not legal completion automation

**Priority**
- should ship if stable; cut from top-level v1 promise if it creates launch drag

**Ownership**
- likely separate planning lane

### 4) Guests / RSVP ops
**V1 bar**
- guest list, householding, plus-one handling, RSVP status, event-level invites, meal/dietary capture, and exception visibility must hold up in a real wedding without creating more cleanup work than they save
- manual admin override/support is acceptable only if the workflow still feels calmer than spreadsheet chaos

**Done**
- substantial guests dashboard exists
- public RSVP and event RSVP flows exist
- household, plus-one, RSVP exception, meal/dietary, invite lifecycle helpers exist
- settings allow meal and custom RSVP question config

**Missing / partial**
- not every edge-case rule is automated everywhere
- reminder automation is phased / partial
- guests marketing copy had been overstating household automation, duplicate prevention certainty, export breadth, and "real-time" confidence beyond the proof bar
- RSVP marketing copy had been overstating household certainty, analytics language, and reminder/export maturity beyond what the live proof bar earns

**Proof needed**
- smoke covering guest import/edit, RSVP submit/update, event-aware status visibility, and exception surfacing
- confidence that a couple could trust the guest book for real decisions like seating, reminders, and counts
- no copy implying perfect automation

**Priority**
- must ship

**Ownership**
- core lane / shared

### 5) Seating
**V1 bar**
- couples can create tables, assign guests, detect drift, and answer "where is this person sitting?" fast enough that the feature actually reduces event-week stress
- day-of lookup and simple check-in tie-in should be practical under real usage, not just pretty in setup

**Done**
- seating planner exists
- drag/drop, auto-seat, exports, drift handling, and seating lookup exist

**Missing / partial**
- advanced optimization is not required
- no need to overclaim perfect auto-assignment intelligence
- seating marketing copy had been overstating real-time confidence, day-of check-in certainty, caterer-export polish, and auto-fill speed/automation beyond the proof bar

**Proof needed**
- smoke showing event selection, table creation, guest assignment, and export or lookup
- enough confidence that staff could actually use lookup/seating on wedding day without apologizing for the software

**Priority**
- must ship

**Ownership**
- likely active owned lane

### 6) Memories / guest photo sharing
**V1 bar**
- couples can create guest photo buckets, collect uploads, moderate visibility, and keep a credible memory path alive that feels worth using after the event
- archive/anniversary layer can be meaningful without pretending the post-wedding system is more mature than it is

**Done**
- guest photo sharing dashboard exists
- bucket management, moderation toggles, upload-link handling, and archive-mode framing exist
- vault/memory surfaces exist elsewhere

**Missing / partial**
- some flows depend on provider/storage setup
- anniversary/storytelling layer is more product direction than fully hardened proof everywhere

**Proof needed**
- one smoke showing bucket create/manage + upload/moderation path that would actually work for a real couple collecting guest photos
- avoid overclaiming fully magical archive intelligence

**Priority**
- should ship if stable; memories layer can be narrower in v1 promise than in vision copy

**Ownership**
- shared

### 7) Registry
**V1 bar**
- couples can add/edit/import registry items, repair weak imports, manage purchased state internally, and present a clean guest-facing registry without constant babysitting
- guided cleanup is enough; perfect merchant automation is not required

**Done**
- registry dashboard exists
- add/edit/delete, import preview fetch, duplicate and repair helpers, refresh policy controls, and internal purchased tracking exist

**Missing / partial**
- public purchased-state nuance still not fully proven
- multi-merchant save reliability still not proven as universal
- registry marketing copy had been stronger than the currently earned proof around merchant breadth and link maintenance

**Proof needed**
- smoke showing add/import/edit and internal purchased tracking in a way that would survive real usage
- public claims must stay narrower than internal capability where parity is unproven

**Priority**
- must ship

**Ownership**
- active lane likely

### 8) Planner / collaborator access
**V1 bar**
- couple can invite planner/coordinator/viewer access from settings, role framing appears in major operational surfaces, and permissions differ in a visible useful way that a real planner would trust
- does not need full enterprise approvals system

**Done**
- collaborator invite acceptance exists
- settings include planner invite flow and role preset
- planning/messages/coordinator surfaces reference planner roles

**Missing / partial**
- collaborator persistence and full boundaries are still being tightened
- some trust depends on role-aware smoke rather than clear consolidated proof
- collaborator invite/join flow had lingering brand inconsistency that made the trust surface feel half-migrated
- older QA notes overstated one gap: invited-email claim enforcement is already real; the live blocker is executed role/permission proof

**Proof needed**
- smoke showing invite flow and role-specific dashboard behavior that makes collaboration feel safe, not sloppy
- copy must say structured collaboration, not full workflow governance

**Priority**
- must ship

**Ownership**
- shared / likely active lane

### 9) Public site / launch path / trust surface
**V1 bar**
- marketing -> auth/onboarding -> builder -> publish/live site -> RSVP should feel real, honest, coherent, and safe to trust in front of guests
- trust/legal surfaces and launch/privacy wording must match actual runtime behavior closely enough that the product is not embarrassing in a real customer flow

**Done**
- public pages, builder, site view, trust page, privacy page, and terms page exist
- major public trust placeholders and several overclaims already cleaned up

**Missing / partial**
- still needs one hard smoke over the canonical couple/guest path
- any remaining misleading launch/privacy wording is a v1 blocker
- top-level Home/Product promise surfaces had still been slightly stronger than the earned v1 bar around guest scale, coordination shape, and archive ambition
- top-level export wording had still been broader than the current slice-by-slice proof around data portability
- Product grouping still risked blending a should-ship memories slice into the core must-ship usage story
- Product summary language still risked treating the whole current product shape as equally earned instead of separating core v1 from broader direction
- Product section framing still had one too-broad label that implied a fully earned bundle instead of a scoped current product shape
- Home feature-panel copy still risked selling archive/anniversary ambition harder than the current should-ship proof bar supports
- Home feature-panel labels still had a few hotter-than-earned phrases around messaging, planner collaboration, registry breadth, and seating automation

**Proof needed**
- brutal end-to-end smoke over real couple and guest path
- no misleading copy about private preview, private by default, custom domains, fake analytics certainty, or fake billing promises

**Priority**
- must ship

**Ownership**
- finish lane owns truth/bar enforcement

### 10) Onboarding (only as it affects product truth)
**V1 bar**
- onboarding gets couples into a real starting point fast and reduces first-run confusion instead of adding another fake setup layer
- migration/setup guidance must stay honest about guided vs automated behavior

**Done**
- onboarding flow exists with setup paths and continuation helpers
- onboarding trust-copy placeholder leak already fixed

**Missing / partial**
- not every onboarding promise is equal to runtime proof downstream
- migration/setup rhetoric still needs to stay disciplined

**Proof needed**
- smoke showing onboarding reaches usable builder/dashboard state
- copy must not overclaim private preview or automated migration

**Priority**
- must ship only insofar as it affects launch truth and first-run completion

**Ownership**
- shared

## Must ship summary
- public site / launch path / trust surface
- guests / RSVP ops
- comms center
- seating
- registry
- planner / collaborator access
- coordinator / day-of
- onboarding truth / first-run continuity

## Ruthless 2-week finish order

### Tier 1 — repo cannot credibly claim v1 without these
1. **Public site / launch path / trust surface**
   - Why first: if this is dishonest or broken, everything else is irrelevant because the product cannot be safely shown or sold.
   - Proof gap: no brutal canonical smoke log yet.
2. **Guests / RSVP ops**
   - Why second: this is the operational spine that feeds seating, messaging, and event counts.
   - Proof gap: still no hard proof that the live flow beats spreadsheet chaos in a real wedding scenario.
3. **Planner / collaborator access + coordinator/day-of together**
   - Why third: these are core differentiators, but also the easiest place for the product to feel fake-finished if role behavior is sloppy.
   - Proof gap: role-aware smoke is still missing; trust is still inferred from surfaces more than proven from flow.

### Tier 2 — must-ship slices that become believable once Tier 1 holds
4. **Comms center**
   - Why here: strong value, but depends on guest data and trustworthy message-state proof.
   - Proof gap: still needs evidence that a couple could stay inside DayOf for the core send flow.
5. **Seating**
   - Why here: clearly important, but downstream of trustworthy guest + RSVP state.
   - Proof gap: still no hard proof that lookup/assignment/export hold up under real event-week use.
6. **Registry**
   - Why here: important but less launch-fatal than guests/RSVP/launch/trust if it is honestly framed.
   - Proof gap: merchant/import/purchased-state proof is still narrower than full promise territory.

### Tier 3 — valuable, but should not distort the v1 claim
7. **Memories / guest photo sharing**
   - Why here: nice retention/story value, but not core to whether a couple can run the wedding.
   - Proof gap: still depends on storage/provider and post-event usefulness proof.
8. **Name-change planner**
   - Why here: useful niche workflow, but absolutely not launch-defining for wedding-core v1.
   - Proof gap: weak relative to core slices; should stay out of the top-level promise if unstable.

## Stronger must / should / cut read

### Must ship because they define whether DayOf is a real wedding product
- public site / launch path / trust surface
- guests / RSVP ops
- planner / collaborator access
- coordinator / day-of
- comms center
- seating
- registry
- onboarding truth / first-run continuity

### Should ship if solid, but do not let them drag the v1 line
- memories / guest photo sharing
- name-change planner
- extra polish around thin states and release checklisting

### Cut / demote from promise immediately if proof stays weak
- anniversary / archive ambition as a major product story
- any advanced analytics framing
- external custom domains
- full automation language around migration, reminders, or merchant handling
- anything that sounds like enterprise workflow governance or complete day-of control software

## Cross-product proof gaps that still matter most
- **No canonical v1 smoke log exists yet.** That is the biggest remaining finish blocker.
- **Role-aware trust is still under-proven.** Planner/coordinator value is plausible, but not yet proven in one clear flow.
- **Guest-state continuity is still under-proven.** Guests → RSVP → messages → seating still needs one coherent proof run.
- **The product promise is cleaner now, but readiness is still more argued than demonstrated.**

Primary proof artifact for this now exists at:
- `docs/v1-smoke-proof-log.md`

## Should ship if time
- memories / guest photo sharing as a stronger v1 slice
- name-change planner if stable and honestly framed
- cleaner empty/thin states and tighter release checklisting

## Cut / defer summary
- external custom domains
- advanced analytics as a launch promise
- full automated migration
- enterprise planner workflow governance
- full event-day control suite claims
- perfect rules-engine automation everywhere
- overblown archive/anniversary promises beyond current proof

## Batch landed
- Added a real `/trust` page.
- Replaced footer “coming soon” placeholders with live links to Trust, Privacy Policy, and Terms of Service.
- Fixed footer brand/contact from placeholder-ish values to DayOf + `support@dayof.love`.
- Fixed raw `SITE_TRUST_COPY` placeholder leaks that were rendering literal template text in marketing/onboarding copy.
- Fixed misleading public/billing trust claims:
  - changed Home from “Private by default” to “Hidden from search by default”
  - corrected Home FAQ privacy wording to match real search-vs-access behavior
  - removed Product copy implying a separate private-preview product shape
  - removed fake billing promises like custom domains / advanced analytics / scheduled messaging from the upgrade surface
- Tightened Settings privacy language so invite-only access is framed as a guest access link instead of a fake “private preview” product, and clarified search visibility text accordingly.
- Tightened the Messaging feature page so it no longer overclaims unlimited email certainty, overstates tracking confidence, or sells fully automatic RSVP reminders as already-solid reality.
- Tightened the Registry feature page so it no longer overclaims universal retailer support or proactive link-health guarantees, and instead frames registry strength as guided import, cleanup, repair, and clean presentation.
- Fixed collaborator invite flow branding from legacy `WeddingSite` to `DayOf` so the planner/coordinator join path now matches the product users think they were invited into.
- Tightened the Guests feature page so it no longer overclaims automatic household resolution, zero event leakage, fuzzy duplicate certainty, broad export-format guarantees, or generic "real-time" confidence that is not the real value bar.
- Tightened the RSVP feature page so it no longer overclaims household certainty, automatic reminder maturity, fake analytics precision, or broad export certainty beyond the current live product bar.
- Tightened the Seating feature page so it no longer overclaims real-time confidence, check-in certainty, perfect drift awareness, caterer-format polish, or automatic seating speed beyond what the product has actually earned.
- Tightened top-level Home/Product promise copy so the main marketing surfaces no longer overclaim unlimited guest scale, a too-magical planner command center, or oversized post-wedding platform maturity beyond the current v1 line.
- Tightened Product feature-group labels so post-wedding memory work and collaboration surfaces are framed in a way that matches the current v1 line instead of reading like a broader finished platform than the proof supports.
- Added `docs/v1-smoke-proof-log.md` as the hard must-ship proof gate so v1 readiness can be judged by flow evidence and blocker severity instead of scattered audits.
- Tightened Home FAQ export language so the top-level trust surface no longer promises a uniform export contract across every slice before that proof exists.
- Tightened Product grouping so a should-ship memories slice no longer reads like part of the core must-ship “what couples actually use” v1 story.
- Tightened Product summary language so the page now explicitly separates the core earned v1 line from broader surrounding product direction.
- Renamed the Product section header from `Everything you get` to `Current product shape` so the page framing matches the actual must-ship vs should-ship split.
- Tightened the Home archive/memory panel so it now frames that slice as post-wedding memory foundation instead of a more mature anniversary platform than the current proof supports.
- Tightened remaining Home feature-panel labels so the carousel no longer overclaims messaging blast maturity, planner command-center framing, universal registry breadth, or stronger seating automation than the current v1 proof supports.
- Corrected collaborator proof logging so the finish board and smoke-proof log no longer chase a stale email-match gap and instead focus on the real remaining blocker: executed role-aware permission proof.

## Why this batch mattered
This is real cross-product finish work. The v1 line dies if trust copy lies about privacy, launch state, billing, or access semantics. The board now defines hard done-enough bars per major slice instead of hand-wavy product optimism.

## Most urgent next
- Run and log one brutal smoke pass on the real v1 line: marketing entry -> auth/demo -> onboarding/builder -> public site -> RSVP -> guests/messages/seating/settings.
- Then fix the first failing route, state, or proof gap.
- Push role-aware proof on planner/collaborator + coordinator because those slices are real enough to sell, but still easiest to overclaim.
