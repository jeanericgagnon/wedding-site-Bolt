# Name Change Form Population Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/codex/name-change-form-population-clean`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a clean PR branch.

Best next move:

1. preserve it as alternate history
2. salvage the core pipeline intentionally if name-change work resumes
3. avoid treating the later hardpass and smoke commits as the main value of the branch

## Why It Is Worth Preserving

- still has `7` unique patch-visible commits beyond `origin/main`
- contains a substantial name-change form population pipeline
- includes a large scripts-and-library buildout that was never reduced to small current slices

Branch commits:

1. `b3dec0bc8` `integrate name change form population pipeline`
2. `f93c8b13a` `align name change form population tests`
3. `c93a421fc` `fix pr type gate for name change integration`
4. `d0e898998` `fix hardpass drift for name change integration`
5. `8ab3a9273` `stabilize hardpass date expectations`
6. `e284967b5` `support rsvp session smoke contract`
7. `af4def680` `accept not-found RSVP invalid token blocks`

## Why It Is Not PR-Ready

- total branch surface is still broad: `119` files in the merge-base diff
- the core pipeline commit alone is enormous
- much of the later branch stack is test/CI/hardpass alignment wrapped around the main pipeline
- the branch overlaps heavily with current `main`, so a direct merge would be high-noise and low-confidence

Important nuance:

- `scripts/rsvp_smoke.js` is currently identical on `origin/main` and on this branch
- that means the last two RSVP smoke commits still matter historically, but they are not a current code delta to salvage directly

## Salvage Buckets

### 1. Core salvage candidate

Commit:

- `b3dec0bc8` `integrate name change form population pipeline`

Why this is the real value:

- it contains the actual product and workflow investment
- it introduces the bulk of the name-change scripts and `src/lib/nameChange/*` machinery
- it is the part most likely to matter if the feature is revived

High-value areas inside that commit:

- script pipeline for answer intake, draft output, review bundles, PDF adapter catalogs, FDF export, and runtime proofing
- `src/lib/nameChange/formPopulationPlan.ts`
- `src/lib/nameChange/formPopulationDraft.ts`
- `src/lib/nameChange/formPopulationIntakeAnswerApply.ts`
- `src/lib/nameChange/formPopulationIntakeAnswerResponse.ts`
- `src/lib/nameChange/formPdfAdapterTemplate.ts`
- `src/lib/nameChange/formPdfReviewPacket.ts`
- `src/lib/nameChange/formCompanion.ts`
- `src/lib/nameChange/formDraftReadiness.ts`

Recommended approach:

- treat this commit as a source archive, not a cherry-pick candidate
- if revived, split the pipeline into smaller current slices:
  - core library primitives
  - script entrypoints
  - planning/dashboard integration
  - proof/runtime validation

### 2. Integration and follow-up bucket

Commit:

- `c93a421fc` `fix pr type gate for name change integration`

Why this needs care:

- it mixes name-change integration with broader dashboard/planning and builder surfaces
- it also pulls in unrelated-looking helper/test adjustments

Files worth rereading if revival happens:

- `src/pages/dashboard/planning/usePlanningDashboardActions.ts`
- `src/pages/dashboard/planning/vendorMetaStorage.ts`
- `src/pages/dashboard/planning/nameChangeService.ts`
- `src/lib/nameChange/types.ts`

Recommended approach:

- salvage only the pieces that are clearly required by the current name-change user flow
- do not port the whole commit as a unit

### 3. Test and hardpass follow-up bucket

Commits:

- `f93c8b13a`
- `d0e898998`
- `8ab3a9273`
- `e284967b5`
- `af4def680`

Why these are secondary:

- they mostly stabilize expectations around the main pipeline work
- they are valuable as evidence of what hurt during integration
- they are poor anchors for a new implementation because current `main` has moved on

Recommended approach:

- use them as review notes after reviving core functionality
- do not start by replaying them

## Files Worth Revisiting First

If someone resumes this branch, start here:

- `src/lib/nameChange/formPopulationPlan.ts`
- `src/lib/nameChange/formPopulationDraft.ts`
- `src/lib/nameChange/formPopulationIntakeAnswerApply.ts`
- `src/lib/nameChange/formPopulationIntakeAnswerResponse.ts`
- `src/lib/nameChange/formPdfAdapterTemplate.ts`
- `src/lib/nameChange/formPdfReviewPacket.ts`
- `src/lib/nameChange/formCompanion.ts`
- `src/pages/dashboard/planning/nameChangeService.ts`
- `src/pages/dashboard/planning/usePlanningDashboardActions.ts`

## Suggested Revival Path

1. create a fresh branch from `main`
2. identify the smallest useful subset of the core name-change pipeline
3. reintroduce library primitives before script wrappers
4. reconnect planning/dashboard surfaces only after the core pipeline shape is proven
5. revisit hardpass and smoke expectations at the end, not the beginning

## Summary

`origin/codex/name-change-form-population-clean` belongs in the "preserve and salvage deliberately" bucket.

Preserve the branch.
Do not merge it directly.
Use it as a historical source for a future, much smaller name-change revival.
