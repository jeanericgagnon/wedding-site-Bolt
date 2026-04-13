# Registry Repair / Broken Item Recovery Audit

Date: 2026-04-13

## Current real strengths
- Registry already has a visible “clean up imported gifts” action.
- Old bad imports are explicitly called out in item cards.
- Manual edit remains available as a fallback.
- Registry item form already supports refetching preview data and manual completion.

## Current weak points

### 1. Recovery flow is still too implicit
Right now the system has pieces of repair support, but the operator still has to infer:
- what is actually broken
- whether refresh is likely to help
- when manual edit is the better move

### 2. Item repair states are not explicit enough
The product can show weak-item symptoms, but it does not yet strongly distinguish:
- import looked partial
- import looks stale
- import looks broken
- manual cleanup completed
- needs re-import

### 3. Bulk cleanup is useful but still blunt
“Clean up imported gifts” helps, but it is still coarse.
It does not yet feel like a guided bulk recovery workflow with:
- candidate review
- likely success/failure expectation
- merchant-aware repair guidance

### 4. Re-import path is still weakly framed
Refetch exists, but “repair vs re-import vs edit manually” is not yet a very clear decision tree.

## Product-safe truth
Safe claim:
- DayOf supports repair and cleanup for weak registry imports, with manual editing as a fallback.

Unsafe claim:
- DayOf already provides a fully guided broken-item recovery workflow.

## Recommended next moves
1. Add explicit repair states
2. Add clearer repair vs re-import guidance
3. Improve merchant-aware repair messaging
4. Make bulk cleanup feel more reviewable and less blind
