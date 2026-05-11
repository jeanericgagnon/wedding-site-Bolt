# V1 Runtime Operator Notes Checklist

Status: advisory for literal `10 / 10` launch confidence. This checklist does **not** replace the launch blockers in `BACKLOG.md`. It exists to keep the remaining human-validation passes explicit, scoped, and evidence-backed.

Evidence destination:
- `docs/v1-smoke-proof-log.md`

Rules:
- Do not log secrets, bearer tokens, invite tokens, or raw internal IDs unless they are already public-safe proof fixtures.
- Keep notes short and factual: what path was exercised, what matched expectation, what did not.
- If a runtime note finds a real product bug, move it into `BACKLOG.md` as a blocker or non-critical item based on impact.

## Canonical Couple Path + Runtime Wording

Goal:
- confirm the live route/copy truth still matches the current launch claim after approved frontend deploys

Paths:
- Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP
- privacy/access/publish wording
- marketing/settings/billing wording
- onboarding + first-run starter-draft wording

Record:
- exact path tested
- any wording mismatch
- whether the current `HOLD` / `GO` launch claim still reads honestly

## Guests / RSVP Ops

Goal:
- verify runtime guest edits and guest-facing RSVP changes still read back correctly

Paths:
- create/edit/review guest + household state in dashboard
- submit or update RSVP through guest-facing flow
- verify dashboard/event readback stays aligned after the RSVP change

Record:
- what changed
- whether guest-facing state and dashboard state matched
- any stale cache, count drift, or event mismatch

## Collaborator Access

Goal:
- confirm runtime invite acceptance and role scoping feel correct with real proof accounts

Paths:
- owner invite -> accept flow with a real pending invite
- role-aware landing surface after claim
- one forbidden action attempt for a non-owner role

Record:
- claimed role
- landing surface reached
- forbidden action tested
- whether denial copy stayed safe and clear

## Coordinator Day-Of

Goal:
- confirm the day-of operator surface feels calm and truthful with realistic event data

Paths:
- coordinator queue/check-in/timeline/Q&A usage
- answer: who is here, what is next, what needs action

Record:
- event context used
- whether queue/check-in/timeline felt coherent
- any confusion, drift, or missing action state

## Registry

Goal:
- confirm runtime registry edits and guest-visible purchase truth stay aligned

Paths:
- add or import a real registry item
- run a repair or cleanup path on a weak import
- verify internal/public purchased-state behavior after runtime edits

Record:
- item source
- repair/cleanup action
- owner-visible state
- guest-visible purchased state

## Comms Center

Goal:
- confirm a real draft/send/history path reads credibly in runtime

Paths:
- create or inspect a real draft
- schedule or send a real message
- verify history state after runtime delivery attempt

Record:
- draft or send path used
- resulting delivery state
- whether history and status copy matched expectation

## Seating Continuity

Goal:
- confirm seating truth stays aligned with RSVP-backed guest state

Paths:
- assign RSVP-backed guests to tables in a real seating event
- verify seating lookup matches table/seat truth after assignment changes
- verify itinerary/seating counts stay aligned after invitation or RSVP changes

Record:
- guest or household sample used
- table assignment change
- lookup result
- whether counts stayed aligned

## Exit Condition

This checklist is complete when:
- each relevant section has a short note logged in `docs/v1-smoke-proof-log.md`, or
- the team explicitly decides that the current automated proof is sufficient and marks the section intentionally skipped for launch day

This checklist does **not** override the secure launch blockers:
- `SUPABASE_SERVICE_ROLE_KEY` is still required for `npm run proof:v1:launch-closeout`
- launch stays `HOLD` until that secure closeout bundle is green
