# Non Registry Live Fixes Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/codex/non-registry-live-fixes`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a practical merge or revival branch.

Best next move:

1. preserve it as a broad non-registry hardening and extraction history branch
2. mine it for narrow patterns or targeted ideas only when needed
3. avoid replaying it as one giant rescue effort

## Why It Is Worth Preserving

- still has `906` unique patch-visible commits beyond `origin/main`
- contains the later `hard-gates` history plus an even broader non-registry extraction wave
- captures a lot of product-facing decomposition and live-fix reasoning that may still be useful as reference

Representative themes:

- public, RSVP, guest, vault, messaging, and settings safety tightening
- bounded reads and capped fan-out across dashboard and guest surfaces
- major service extraction across auth, itinerary, guest dashboards, guest photo, vault, RSVP, and messaging
- route-view and shell decomposition for dashboard and public flows
- live proof narrowing and collaborator/public authorization proof updates
- coordinator, seating, planning, name-change, and media write-path evolution

## Why It Is Not A Revival Branch

- merge-base diff is enormous: about `3749` files
- rough diff size is massive: about `304284` insertions / `44822` deletions
- the branch mixes too many layers of change together:
  - hardening and safety
  - service extraction and architectural decomposition
  - route/view/component extraction
  - schema and RPC evolution
  - proof, docs, and launch-history context
- current `main` has moved far enough that direct resurrection would be all archaeology and almost no clean momentum

Important nuance:

- this branch is not just "old fixes"
- it is a historical snapshot of how a huge amount of non-registry product surface was being broken apart and hardened at once
- that makes it useful for patterns, but almost impossible to merge or revive wholesale

## Salvage Buckets

### 1. Service and route decomposition bucket

This branch is especially useful for studying:

- guest dashboard route/view extraction
- settings panel and dashboard shell extraction
- RSVP flow shell and view extraction
- event hub, event recap, and public-route shell decomposition
- auth/service helper extraction
- itinerary, planning, guest photo, and vault service boundaries

Recommended approach:

- if a current module is too large or too entangled, inspect the matching extraction here for ideas
- port patterns, not patches

### 2. Narrow live-fix and safety bucket

The branch also contains many smaller hardening ideas:

- bounded reads and fan-out controls
- public and preview copy/contract tightening
- guest contact lookup, RSVP lookup, and helper-copy hardening
- public registry and client safety refinements
- collaborator and service-role proof narrowing

Recommended approach:

- use this branch when a current bug or safety issue resembles one of those themes
- re-implement only the narrow current fix on top of `main`

### 3. Proof and operating-history bucket

Like the hard-gates branches, this one also contains:

- production hardening docs
- launch and audit notes
- proof captures and residual review context

Recommended approach:

- treat these as operating history
- use them to understand why certain live-fix or safety decisions were made

## Files And Areas Worth Revisiting First

If someone needs to mine this branch, start with the closest matching surface:

- guest dashboard route and workspace shell files
- settings dashboard shell and extracted settings panels
- RSVP flow shell and live content views
- event hub and event recap extracted live-content files
- bounded read helpers and service extraction files around the exact failing area

## Suggested Revival Path

This branch should not be revived as a branch.

If work must be resumed from it:

1. identify one narrow current problem or one oversized current surface
2. find the matching extraction or hardening theme here
3. re-implement that idea in a fresh focused branch from `main`
4. validate it with current tests and proof flows
5. leave the rest of this branch preserved as history

## Summary

`origin/codex/non-registry-live-fixes` belongs in the "preserve as broad non-registry hardening and extraction history" bucket.

Preserve the branch.
Do not merge it directly.
Use it as a historical source for narrow hardening ideas and decomposition patterns only.
