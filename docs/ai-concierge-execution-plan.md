# AI concierge onboarding execution plan

## Goal
Build a production-grade AI-guided onboarding and draft-generation system for DayOf.Love that:
- collects wedding context conversationally
- maintains a canonical structured profile
- knows when enough information exists to draft
- generates a strong initial site draft
- supports safe refresh/regenerate flows
- protects hand-edited content
- is measurable, testable, and production-safe

---

## Current state
### Already working
- concierge-style onboarding shell exists
- canonical `weddingProfile` exists
- onboarding can persist `onboarding_answers`
- Overview can surface a saved brief
- refresh-from-brief exists
- refresh can write into `wedding_data`
- public site can visibly reflect refreshed brief data

### Not done
- no full AI orchestration layer
- no robust extraction engine
- no clean enough-to-draft policy
- no polished generation system
- no complete overwrite-protection coverage
- no full evaluation / rollout framework

---

## Phase 0 — stabilization
### 0.1 Runtime/schema cleanup
- reconcile live schema drift on `wedding_sites`
- make public/dashboard queries safe against optional legacy columns
- remove one-column-at-a-time runtime breakage

### 0.2 QA environment cleanup
- create dedicated AI onboarding QA account/site
- remove junk QA copy from public-facing test site
- fix or suppress broken media/storage refs that create false negatives

### 0.3 Foundation sanity pass
- verify build, overview, onboarding, builder, public site all load
- verify current concierge brief save/load/refresh loop still passes after cleanup

**Acceptance criteria**
- no runtime schema failures in core onboarding/dashboard/public routes
- one clean QA site/account exists for repeatable tests

---

## Phase 1 — canonical profile hardening
### 1.1 Expand `weddingProfile`
Define the full shape for:
- couple
- event
- venue
- guestExperience
- registry
- design
- content
- planner/orchestration metadata

### 1.2 Add field metadata
For AI-touched fields support:
- `value`
- `source`
- `confidence`
- `updatedAt`
- `confirmedAt` (where useful)

### 1.3 Define validation semantics
Per field define:
- required / optional / inferred
- draftable if missing?
- display usage
- formatting rules
- conflict behavior

**Acceptance criteria**
- canonical profile contract documented in code and/or docs
- no ambiguous duplicate sources of truth for onboarding data

---

## Phase 2 — extraction layer
### 2.1 Extraction contract
Build a service that accepts:
- latest user message
- current profile
- onboarding session context

Returns:
- extracted field updates
- inferred values
- confidence scores
- missing critical fields
- recommended next question
- draft readiness state

### 2.2 Extraction prompt / rails
Create explicit rules for:
- allowed fields
- non-hallucination
- when to infer
- when to confirm
- how to ask follow-ups

### 2.3 Merge + conflict handling
- merge extracted values into canonical profile
- preserve confirmed user fields
- detect conflicts
- require confirmation before destructive overwrites

**Acceptance criteria**
- profile extraction works on fixture inputs
- conflicting facts are surfaced instead of silently overwritten

---

## Phase 3 — orchestration
### 3.1 Onboarding session state
Persist conversation/orchestration state:
- current goal
- asked questions
- answered questions
- unresolved ambiguities
- readiness score
- recommended next move

### 3.2 Enough-to-draft policy
Implement `enoughToDraft(profile)` with:
- minimum required fields
- confidence threshold
- optional overrides when user explicitly wants a draft now

### 3.3 Question policy
Decide next action:
- ask critical missing field
- confirm low-confidence inference
- offer draft generation
- allow skip/continue momentum

**Acceptance criteria**
- deterministic enough-to-draft helper exists
- orchestration state can resume cleanly after interruption

---

## Phase 4 — draft generation
### 4.1 Generation contract
From canonical profile, generate:
- `wedding_data` patch
- section content suggestions
- theme/default recommendations
- FAQ/travel/registry starter content when applicable

### 4.2 First real generator
Generate clean copy for:
- hero
- subheadline
- story
- event details
- RSVP framing
- registry block
- optional FAQ/travel starter content

### 4.3 Guardrails
- no fake specifics
- elegant TBD behavior
- avoid generic wedding fluff
- distinguish inferred vs user-confirmed facts

**Acceptance criteria**
- generator outputs structured patches
- generated copy quality passes fixture review

---

## Phase 5 — renderer/builder integration
### 5.1 Real mapping audit
Map generated output into actual live-rendered fields:
- `wedding_data`
- persisted sections
- active builder paths
- any legacy fallbacks still used in production

### 5.2 Safe patch application
- merge only intended fields
- preserve custom section order/layout
- avoid wiping unrelated content

### 5.3 Section provisioning rules
If draft needs missing sections:
- enable hidden existing section
- or insert recommended section
- or leave actionable suggestion instead of forcing destructive changes

**Acceptance criteria**
- generated draft visibly changes live/public site where intended
- builder/project structure survives refresh intact

---

## Phase 6 — overwrite protection
### 6.1 Provenance everywhere important
Expand provenance markers across AI-touched fields:
- generated
- user-edited
- imported
- inferred

### 6.2 Builder edit integration
Ensure major edit paths mark content as user-edited automatically:
- inline text edits
- inspector edits
- gallery captions/alts
- custom block text
- high-traffic builder content paths

### 6.3 Refresh rules
Refresh/regenerate should:
- update generated fields
- not overwrite user-edited fields
- support future selective refresh UI

**Acceptance criteria**
- refresh-from-brief does not stomp protected user edits in key test cases

---

## Phase 7 — AI UX
### 7.1 Full conversation shell
- assistant messages
- user replies
- quick replies
- progress state
- review summary
- draft readiness checkpoint

### 7.2 Review summary
Before generating:
- what we know
- what we inferred
- what is still TBD
- generate now vs refine first

### 7.3 Post-draft refine mode
Support natural refine requests like:
- more romantic
- more editorial
- shorter story
- simplify travel info

**Acceptance criteria**
- user can go from conversation to draft to refine loop without leaving the experience

---

## Phase 8 — persistence + observability
### 8.1 Store onboarding sessions
Persist:
- conversation/session state
- profile snapshots
- generation outputs
- refresh/regenerate actions

### 8.2 Add analytics/logging
Track:
- completion rate
- abandonment point
- draft generation success rate
- regenerate success rate
- overwrite conflicts
- average time to first usable draft

**Acceptance criteria**
- enough telemetry exists to know whether this is actually better than current onboarding

---

## Phase 9 — evaluation and rollout
### 9.1 Evaluation fixtures
Create fixture scenarios:
- sparse couple
- detailed couple
- venue unknown
- date unknown
- planner acting on behalf of couple
- migration/import refinement

### 9.2 Runtime/browser QA
Automate flows for:
- onboarding save
- overview brief render
- refresh-from-brief
- visible public-site update
- hand-edit survives refresh

### 9.3 Rollout plan
- feature flag
- internal test
- opt-in launch
- compare completion + quality vs current onboarding

**Acceptance criteria**
- rollout is measurable and reversible

---

## Immediate next 10 tasks
1. finalize canonical `weddingProfile` expansion
2. define field metadata and confidence model
3. implement `enoughToDraft(profile)`
4. create extraction service contract
5. scaffold AI orchestration session state
6. clean brief -> `wedding_data` mapping
7. finish provenance coverage on high-traffic builder edits
8. create clean QA site/account for AI onboarding
9. add runtime test for save -> refresh -> visible site change
10. add runtime test for user edit surviving refresh

---

## Definition of done
AI concierge is "fully built" only when:
- conversation flow is production-usable
- canonical profile is reliable
- enough-to-draft logic is explicit and correct
- draft generation is high quality
- refresh/regenerate is safe
- user edits are protected
- metrics exist
- runtime/browser QA passes on clean test scenarios
