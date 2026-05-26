# V1 Finish Hard Gates Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/codex/v1-finish-hard-gates`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a realistic merge candidate anymore.

Best next move:

1. preserve it as a hardening-history branch
2. mine it for narrow security and validation ideas only when needed
3. avoid broad resurrection work unless there is a very explicit launch-hardening project

## Why It Is Worth Preserving

- still has `29` unique patch-visible commits beyond `origin/main`
- captures a coherent hardening era focused on public safety, RSVP/public gates, registry preview safety, and launch-proof work
- contains a lot of deploy-proof and verification context that explains why later protections were added

Representative commit themes:

- launch hardening and production proof
- public and RSVP gate hardening
- registry preview image proxying and image sanitization
- public link host and QR URL hardening
- vendor inquiry and shared email CTA safety
- Stripe return URL hardening
- client error log redaction
- photo upload and guest email validation tightening

## Why It Is Not A Revival Branch

- merge-base diff is enormous: about `2211` files
- rough diff size is massive: about `131490` insertions / `26129` deletions
- branch contains a large mixture of:
  - code changes
  - workflow changes
  - migration changes
  - proof screenshots
  - backlog/docs/history artifacts
- current `main` has moved far enough that direct resurrection would create more archaeology than progress

Important nuance:

- this branch is still valuable as a source of hardening patterns
- it is not valuable as a single unit of work to replay

## Salvage Buckets

### 1. Narrow security-pattern bucket

These are the kinds of changes most worth mining:

- public link host guards
- QR URL hardening
- vendor inquiry email validation
- shared CTA URL validation
- Stripe checkout return URL safety
- client error log redaction
- registry preview image sanitization

Recommended approach:

- if one of these surfaces regresses or needs extension, inspect the relevant commit and re-implement the idea on top of current `main`
- do not cherry-pick broad commit ranges

### 2. Proof and launch-history bucket

The branch also contains a lot of proof-era artifacts:

- launch proof docs
- backlog snapshots
- screenshot captures
- runbook-like historical context

Why this matters:

- it helps explain the launch-hardening sequence
- it is useful for forensic context
- it should not drive current product architecture directly

Recommended approach:

- treat these materials as historical evidence
- use them to answer "why was this tightened?" questions, not "what should we merge?" questions

### 3. Large mixed hardening bucket

The oldest and biggest commits mix too many concerns together:

- auth/public gate behavior
- registry safety
- vendor/public inquiry safety
- proof expectations
- docs and launch-history notes

Recommended approach:

- only extract tiny, current needs
- create fresh focused patches on `main`
- never try to replay the branch as a bundle

## Files And Areas Worth Revisiting First

If someone needs to mine this branch, start with the surface closest to the problem at hand:

- `src/sections/publicLinks.ts`
- registry preview/image safety files
- vendor inquiry and public email validation surfaces
- Stripe return URL handling
- error-log redaction surfaces
- the matching focused e2e or proof scripts around that exact area

## Suggested Revival Path

This branch should almost never be "revived" directly.

If work must be resumed:

1. identify one narrow current problem
2. find the matching historical hardening commit/theme here
3. re-implement only that idea on fresh `main`
4. validate it with current tests and proof scripts
5. leave the rest of the branch preserved as history

## Summary

`origin/codex/v1-finish-hard-gates` belongs in the "preserve as hardening history" bucket.

Preserve the branch.
Do not merge it directly.
Use it as a historical source for targeted hardening ideas only.
