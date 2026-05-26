# V1 Proof Runbook

This is the execution bridge between the v1 finish board and the smoke/test harness already in the repo.

It is not a marketing artifact.
It is the shortest path from **"we think this is close"** to **"we have actual proof or an exact blocker."**

## Current status note

This file describes the proof framework and the meaning of each lane. It is not, by itself, the canonical live readiness verdict.

For current launch status and latest exact proof state, use:
- [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- [docs/PRODUCTION_HARDENING_REPORT.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_REPORT.md)
- [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)

Older blocker notes below should be read as lane semantics and historical examples unless they are restated in those current-truth docs.

## Rule

A slice is **not** good enough because:
- the route exists
- demo mode looks polished
- the build passes
- a doc says it should work
- someone remembers testing it once

A slice only counts when the proof below is captured in `docs/v1-smoke-proof-log.md`.

---

## Fast command bundle

Low-friction proof commands already available in this repo:

```bash
npm run build
npm run proof:v1:canonical-smoke
npm run test:e2e:live
npm run smoke:site
npm run smoke:rsvp:strict
npm run smoke:csvmapper
npm run smoke:checkin
npm run smoke:messages
npm run smoke:registry
npm run proof:v1:guests-rsvp-ops
npm run proof:v1:collaborator-access
npm run proof:v1:collaborator-runtime
npm run proof:v1:comms-center
npm run proof:v1:coordinator-dayof
npm run proof:v1:registry
npm run proof:v1:seating-continuity
npm test -- src/pages/dashboard/registry/registryService.test.ts
npm run proof:v1:board:freshness
npm run proof:v1:board
npm run proof:v1:board:md
```

Run `npm run proof:v1:board:freshness` before treating either board output as current truth.
Workflow gates are intentionally narrower: `ci-hardpass` and `Release Launch Gate` enforce `npm run proof:v1:board:freshness`, but they do not regenerate `npm run proof:v1:board` or `npm run proof:v1:board:md`.
That board now also carries the explicit real v1 line plus the ruthless next-3 queue, so the next finish move is executable instead of buried in prose.

---

## Slice-by-slice proof map

### 1) Public site / launch path / trust surface
**Exit bar**
Home -> auth/demo -> onboarding/builder -> site -> RSVP feels coherent, and privacy/access/publish behavior matches the copy.

**Automated support**
- `npm run proof:v1:canonical-smoke`
- underlying bundle:
  - `npm run build`
  - `npm run test:e2e:live`
  - `npm run smoke:site`

**Manual proof still required**
- route notes for Home -> signup/demo/auth -> onboarding/builder -> public site
- privacy/access/publish behavior notes against actual runtime

---

### 2) Guests / RSVP ops
**Exit bar**
Guest list, householding, public RSVP, assisted RSVP, and downstream dashboard truth stay aligned enough for real planning.

**Automated support**
- `npm run proof:v1:guests-rsvp-ops`
- underlying bundle:
  - `npm run smoke:rsvp:strict`
  - `npm run smoke:csvmapper`
  - `npm run smoke:checkin`

**Manual proof still required**
- create/edit/review guest + household state
- submit/update RSVP and verify dashboard/event readback

**Blocker semantics**
- this bundle now distinguishes a real product failure from an environment blocker
- if RSVP strict smoke is blocked by anon auth / external fixture access, the output will mark the slice as `blocked` instead of pretending the app logic itself failed

---

### 3) Planner / collaborator access
**Exit bar**
Invite flow feels safe, collaborator lands in a role-aware surface, and at least one forbidden action is actually blocked per non-owner role tested.

**Automated support**
- `npm run proof:v1:collaborator-access`
- underlying bundle:
  - `npm test -- src/pages/acceptCollaboratorInviteUtils.test.ts`
  - `npm test -- src/lib/plannerAccess.test.ts`
  - `npm run build`

**Manual proof still required**
- owner invite -> accept -> planner/coordinator dashboard framing
- one forbidden action attempt per non-owner role tested

**Runtime collaborator proof gate**
- `npm run proof:v1:collaborator-runtime`
- this bundle turns the invite/accept runtime path into a pass/fail/blocked gate
- if owner/collaborator proof credentials are missing, it reports a structured blocker instead of pretending the slice itself failed

---

### 4) Coordinator / day-of
**Exit bar**
Queue/check-in/timeline/Q&A feel calmer under realistic use and do not collapse into role or state confusion.

**Automated support**
- `npm run proof:v1:coordinator-dayof`
- underlying bundle:
  - `npm test -- src/lib/coordinatorRoleAccess.test.ts`
  - `npm test -- src/lib/coordinatorCheckInQueue.test.ts`
  - `npm test -- src/lib/coordinatorTimelineState.test.ts`
  - `npm run smoke:checkin`
  - `npm run build`

**Manual proof still required**
- coordinator mode queue/check-in/timeline/Q&A smoke
- verify a coordinator can answer who is here / what is next / what needs action

---

### 5) Comms center
**Exit bar**
Draft -> schedule/send -> history state reads trustworthy enough that core wedding messaging can stay inside DayOf.

**Automated support**
- `npm run proof:v1:comms-center`
- underlying bundle:
  - `npm test -- src/lib/messageDeliveryState.test.ts`
  - `npm run smoke:messages`
  - `npm run build`

**Manual proof still required**
- create or inspect a draft
- schedule or send a message
- verify believable history state for draft/scheduled/sent/partial/failed

---

### 6) Seating
**Exit bar**
RSVP-backed seating assignment, lookup, and counts stay coherent without embarrassing event-level drift.

**Automated support**
- `npm run proof:v1:seating-continuity`
- underlying bundle:
  - `npm test -- src/pages/dashboard/seating/seatingService.test.ts`
  - `npm run smoke:checkin`
  - `npm run build`

**Manual proof still required**
- assign guests using RSVP-backed data
- use seating lookup/export and verify counts/eligibility match event truth

---

### 7) Registry
**Exit bar**
Add/import/edit/repair plus purchased-state handling survives one realistic smoke without trust drift.

**Automated support**
- `npm run proof:v1:registry`
- underlying bundle:
  - `npm test -- src/pages/dashboard/registry/registryService.test.ts`
  - `npm test -- src/pages/dashboard/registry/registryTypes.test.ts`
  - `npm run smoke:registry`
  - `npm run build`

**Manual proof still required**
- add/import/edit a registry item
- run repair/cleanup if needed
- verify internal/public purchased-state behavior

---

### 8) Onboarding truth / first-run continuity
**Exit bar**
Entry -> onboarding -> usable draft site/dashboard state is fast, honest, and does not oversell launch-readiness.

**Automated support**
- `npm run build`

**Manual proof still required**
- entry -> onboarding -> dashboard/site first-run smoke
- verify starter-draft wording matches actual first-run output

---

## Current finish-lane read

- public claim cleanup is now largely done
- the repo is closer to **truthful** than **proven**
- the main blocker is no longer copy drift
- the main blocker is captured proof on the must-ship flows

## Ruthless next 3

1. **Canonical v1 smoke run**
   - why first: it is the top cross-product truth gate; until one real couple path is captured, readiness is still argued instead of proven
   - commands: `npm run proof:v1:canonical-smoke`
   - exit bar: one clean logged canonical path or one exact blocker in `docs/v1-smoke-proof-log.md`
2. **Guest -> RSVP -> ops continuity proof**
   - why second: guest truth feeds seating, messaging, and event counts
   - commands: `npm run proof:v1:guests-rsvp-ops`
   - current blocker: `validate-rsvp-token` anon auth 401 in this environment
   - exit bar: one guest can move through dashboard and public RSVP without trust drift
3. **Collaborator runtime forbidden-action proof**
   - why third: planner/coordinator support is a core differentiator and the easiest slice to overclaim if runtime boundaries are not captured
   - commands: `npm run proof:v1:collaborator-access && npm run proof:v1:collaborator-runtime`
   - runtime dependency: disposable owner/collaborator proof credentials
   - exit bar: one planner and one coordinator runtime path logged with at least one blocked forbidden action each
