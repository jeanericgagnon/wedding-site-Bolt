# Builder V2 Setup Route Skeleton Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/feat/builder-v2-setup-route-skeleton`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a direct merge candidate after sitting this long.

Best next move:

1. preserve it as a compact feature seed
2. revive it from fresh `main` when there is product appetite for the setup funnel
3. re-implement selectively rather than merging the branch wholesale

## Why It Is Worth Preserving

- only `4` files changed in the merge-base diff
- only about `402` insertions total
- the feature scope is coherent: a builder setup funnel for users with no site yet
- the commit stack tells a clean product story

Branch commits:

1. `82128724b` `feat(builder-v2): add canonical /setup route skeleton and step placeholders`
2. `ba4ec0c3e` `feat(builder-v2): implement DF-002 names step with local draft persistence`
3. `afcd507e5` `feat(builder-v2): implement DF-003 wedding date step with undecided option`
4. `e8ec0242d` `feat(builder-v2): implement DF-004 location step in setup funnel`
5. `f5a040594` `feat(builder-v2): implement DF-005 guest estimate and DF-006 style/review setup steps`
6. `f458be7b9` `feat(builder-v2): wire setup draft into builder load and route no-site to /setup`

## Why It Is Not A Straight Merge Candidate

- the branch is old relative to current `main`
- `main` has moved substantially around builder, dashboard, onboarding, and proof surfaces since this branch was cut
- a direct branch merge would bring old assumptions along with the feature

Important nuance:

- the branch scope itself is still small and well-bounded
- this is closer to a "good reimplementation source" than a "dangerous legacy branch"

## Salvage Buckets

### 1. Strongest salvage candidate

Commit:

- `f458be7b9` `feat(builder-v2): wire setup draft into builder load and route no-site to /setup`

Touched file:

- `src/builder/BuilderPage.tsx`

Why this is attractive:

- compact and specific
- captures the most important route/control-flow idea in the branch
- likely the best place to start if the setup funnel is revived

Recommended approach:

- reread current `src/builder/BuilderPage.tsx`
- port only the no-site routing and draft-load ideas that still fit current builder architecture

### 2. Core feature bucket

Files:

- `src/App.tsx`
- `src/pages/setup/SetupShell.tsx`
- `src/pages/setup/index.ts`

Why these matter:

- they hold the actual setup-funnel shell and route structure
- they are small enough to study directly
- they define the setup product shape more than any deep shared library contract

Recommended approach:

- treat `SetupShell.tsx` as a product prototype, not a drop-in patch
- re-implement the step flow in current UI patterns when the feature is revived

### 3. Low-risk product concepts worth preserving

The branch still gives good guidance on:

- routing site-less users into an onboarding/setup path
- collecting names first
- handling undecided wedding dates
- collecting location
- gathering guest estimate
- capturing style/review inputs before full builder entry

These concepts are more durable than the exact code.

## Files Worth Revisiting First

If someone resumes this branch, start here:

- `src/builder/BuilderPage.tsx`
- `src/pages/setup/SetupShell.tsx`
- `src/App.tsx`
- `src/pages/setup/index.ts`

## Suggested Revival Path

1. create a fresh branch from `main`
2. decide whether site-less users should still be routed into `/setup`
3. rebuild the route shell and persistence flow against current builder state
4. reintroduce setup steps one by one instead of replaying all six historical commits
5. add modern tests only after the current product shape is settled

## Summary

`origin/feat/builder-v2-setup-route-skeleton` belongs in the "compact feature seed" bucket.

Preserve the branch.
Do not merge it directly after this much time.
Use it as a clean source of product intent when the setup funnel is ready to be revived.
