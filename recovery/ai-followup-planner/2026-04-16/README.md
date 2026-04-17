# AI Follow-Up Planner Recovery Bundle

Saved before shifting from the current deterministic/heuristic planner toward a more prompt-driven hybrid question-selection approach.

## Why this exists
We may want to restore or compare against the current local planner work instead of losing the iteration history.

## What is captured
### Key code
- `src/lib/aiFollowUpPlanner.ts`
- `src/lib/aiFollowUpPlanner.debug.test.ts`

### Key docs
- `docs/ai-followup-ranking-rubric.md`
- `docs/ai-followup-category-map.md`
- `docs/ai-non-event-followup-policy.md`
- `docs/ai-followup-deep-dive.md`
- `docs/ai-followup-three-pass-plan.md`
- `docs/ai-followup-iteration-plan.md`
- `docs/ai-followup-expected-output-table.md`
- `docs/ai-impact-gap-scorer-plan.md`

## Current state summary
The planner now supports:
- clustered event follow-ups
- skip / TBD posture
- a primitive lane-based round composer
- a local eval bank with expected non-event winners
- passing expected winners for:
  - null
  - first-detail
  - guest-feel
  - location-why
  - registry-posture
- one remaining uncovered intended category:
  - meeting-city

## Reason for shift
The current planner is getting brittle and heuristic-heavy.
The next likely better architecture is:
- structured intake + rails locally
- prompt-guided selection of 0–3 highly refined follow-up questions
- strong token discipline and skip rules
