# Collaborator persistence flow

Date: 2026-05-22

## Current state
The collaborator invite and claim flow is already DB-backed and shipped. This document now describes the live flow and the remaining maturity gaps instead of a future replacement plan for local-only behavior.

## Live flow

### 1. Owner creates invite
Owner enters:
- name
- email
- role

The system creates a persisted collaborator invite tied to:
- wedding site
- invite email
- target role
- invited by
- invite status
- claim path/token

### 2. Invite recipient accepts
Recipient opens the invite route, authenticates or creates an account, and claims the invite.

Current truth:
- token is validated against stored invite state
- invited email is enforced in both UI flow and backend acceptance

### 3. Activation
On successful claim:
- collaborator membership is created or updated
- membership links to the claiming user
- invite status is marked accepted
- the collaborator lands in the dashboard with role-aware runtime behavior

### 4. Ongoing management
Owner can currently:
- view collaborators
- create invites
- copy invite links
- revoke pending invites

## What is already proven
- DB-backed invite creation
- real invite claim route
- backend-enforced invite/email validation
- collaborator row persistence after accept
- invite status transition to accepted
- viewer deny plus planner/coordinator runtime allow/deny coverage in the live collaborator proof lane

Primary evidence:
- `docs/collaborator-flow-qa.md`
- `scripts/v1-proof-collaborator-runtime.mjs`
- `docs/PRODUCTION_HARDENING_REPORT.md`

## What is not fully mature yet
- no dedicated resend action
- no polished expiry management UX
- no broader collaborator management center outside Settings
- future write surfaces still need to be added to the role-matrix proof as product scope expands

## What to avoid claiming
Do not describe collaborator persistence as local-only, fake, or merely planned.

That language is stale now. The honest limitation is narrower: the flow is real and shipped, but still not the final polished admin experience.

## Recommended next step
- keep the collaborator permission matrix and runtime proof current as new shared-site write surfaces are added
- improve invite resend/expiry management without re-framing the core system as unshipped
