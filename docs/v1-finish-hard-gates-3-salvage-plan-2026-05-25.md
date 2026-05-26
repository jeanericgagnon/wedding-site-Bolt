# V1 Finish Hard Gates 3 Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/codex/v1-finish-hard-gates-3`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a practical merge or revival branch.

Best next move:

1. preserve it as a major hardening-and-extraction history branch
2. mine it for narrow patterns when needed
3. avoid replaying it as a single resurrection effort

## Why It Is Worth Preserving

- still has `879` unique patch-visible commits beyond `origin/main`
- captures a major later hardening line after the earlier `v1-finish-hard-gates` branch
- contains both:
  - launch/public safety tightening
  - a broad wave of service extraction and route/view decomposition

Representative themes:

- public, RSVP, vault, and registry safety tightening
- bounded query fan-out and dashboard read limits
- auth/session/helper service extraction
- guest dashboard extraction into services, panels, overlays, and route views
- settings/dashboard shell extraction
- live proof narrowing and collaborator authorization proof updates
- coordinator, messaging, seating, guest-photo, and planning service decomposition

## Why It Is Not A Revival Branch

- merge-base diff is enormous: about `2734` files
- rough diff size is massive: about `221349` insertions / `41494` deletions
- this branch mixes at least four different classes of work:
  - hardening and safety
  - architectural extraction/refactoring
  - proof and launch-history artifacts
  - schema and RPC evolution
- current `main` has moved far beyond the point where replaying this branch as a unit would make sense

Important nuance:

- unlike `v1-finish-hard-gates`, this branch is not only a hardening-history branch
- it is also a historical snapshot of a very large decomposition effort
- that makes it valuable for ideas and patterns, but even worse as a direct merge target

## Salvage Buckets

### 1. Service-boundary pattern bucket

This branch is especially useful for studying extraction patterns such as:

- auth service extraction
- guest dashboard route/view decomposition
- message and itinerary service extraction
- settings panel extraction
- vault and guest photo function transport extraction

Recommended approach:

- if a current file feels too large or too entangled, inspect the matching extraction here for ideas
- port patterns, not patches

### 2. Narrow safety-and-bounds bucket

The branch also contains many focused hardening ideas:

- bounded dashboard and workspace reads
- query fan-out caps
- public/client safety tightening
- collaborator and service-role proof narrowing

Recommended approach:

- use this branch when a current performance or safety issue matches one of those themes
- re-implement only the narrow fix needed on top of current `main`

### 3. Proof and launch-history bucket

Like the older hard-gates branch, this one also includes:

- proof screenshots
- production hardening docs
- launch and audit notes
- residual audit/history context

Recommended approach:

- treat these as historical reference only
- use them to explain why earlier protections or refactors happened

## Files And Areas Worth Revisiting First

If someone needs to mine this branch, start with the closest matching surface:

- guest dashboard route/service files
- settings dashboard shell and panel extraction files
- auth service extraction files
- bounded query or dashboard read helpers
- collaborator proof and public safety surfaces

## Suggested Revival Path

This branch should not be revived as a branch.

If work must be resumed from it:

1. identify one current problem or one oversized current module
2. find the matching extraction or hardening theme in this branch
3. re-implement that idea in a fresh focused branch from `main`
4. validate it with current tests and proof flows
5. leave the rest of this branch preserved as history

## Summary

`origin/codex/v1-finish-hard-gates-3` belongs in the "preserve as major hardening and extraction history" bucket.

Preserve the branch.
Do not merge it directly.
Use it as a historical source for narrow hardening ideas and service-boundary patterns only.
