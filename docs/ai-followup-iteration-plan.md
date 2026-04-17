# AI Follow-Up Iteration Plan

Goal:
Finish the planner so it asks 1–2 high-leverage follow-ups, improves real site coverage, and stays token-cheap when eventually used with live AI.

## Phase 1 — planner logic finish
### Objective
Make category choice reliable.

### Tasks
1. add explicit non-event category competition
   - guest-feel
   - location-why
   - story-detail
   - meeting-city
   - registry-posture
2. add expected winners to the eval bank
3. tighten knowability rules
   - respect TBD / maybe / still deciding
   - avoid asking for things couples likely do not know yet
4. keep event lane and non-event lane structurally separate

### Exit condition
The local eval bank shows broader non-event diversity without breaking strong cases.

## Phase 2 — prompt phrasing finish
### Objective
Make follow-up wording sound natural and skippable.

### Tasks
1. shorten event-cluster prompts
2. reduce repetitive stems
3. make non-event prompts sound less generic / robotic
4. preserve token discipline and skip language

### Exit condition
The prompts read naturally across the eval bank and do not sound repetitive.

## Phase 3 — regression / breadth proof
### Objective
Prove the planner works across many couple shapes.

### Tasks
Run the local eval bank and inspect:
- rich
- medium
- sparse
- vague
- destination
- local
- venue TBD
- no story
- no events
- messy freeform

Check:
- event-only overuse
- story overuse
- guest-feel underuse
- location-why underuse
- weak or dumb prompts
- unnecessary second questions

### Exit condition
No obvious regressions and the planner feels broadly useful, not brittle.

## Phase 4 — quick-start integration proof
### Objective
Use the planner in the real onboarding flow without wasting tokens.

### Tasks
1. keep local planner as the main decision layer
2. cap rounds hard
3. ask at most one event question + one non-event question
4. preserve skip / unresolved states cleanly
5. keep AI calls minimal

### Exit condition
The in-browser flow asks cleaner follow-ups without weird detours.

## Phase 5 — local browser validation
### Objective
Prove the full experience locally before any deploy.

### Tasks
Validate:
- question progression
- follow-up rounds
- skip behavior
- guest import handoff
- photos handoff
- completion path

### Exit condition
Local proof is repeatable, not a one-off success.

## Working method
Every meaningful change should use the three-pass loop:

### Pass 1 — logic
Did the right category win?

### Pass 2 — phrasing
Does the question sound human and skippable?

### Pass 3 — regression
Did breadth improve without harming strong cases?

## Immediate next batch
1. add expected winners to the eval bank
2. keep refining non-event competition until diversity improves
3. rerun local eval
4. only then do wording polish
