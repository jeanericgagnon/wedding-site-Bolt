# Access model truth

Date: 2026-05-22

## Current shipped truth
DayOf collaboration is no longer a local-only or demo-only concept.

The current product and runtime model both recognize:
- owner
- planner
- coordinator
- viewer

The owner remains the only role that can manage collaborators and ownership-sensitive settings. Planner, coordinator, and viewer are real collaborator roles with live runtime proof behind the mainstream shared-site surfaces.

## What is proven now
- DB-backed collaborator invites exist.
- Invite claim is backed by a real accept flow, not just local UI state.
- Collaborator membership is persisted after claim.
- Planner and coordinator are not just cosmetic labels; their allowed and denied actions are covered by the live collaborator runtime proof.
- Viewer remains read-only in the shared-site surfaces covered by the current matrix.

Evidence:
- `docs/collaborator-flow-qa.md`
- `docs/collaborator-permission-matrix.md`
- `scripts/v1-proof-collaborator-runtime.mjs`
- `docs/PRODUCTION_HARDENING_REPORT.md`
- `docs/v1-smoke-proof-log.md`

## Current role truth
### Owner
- full control
- manages collaborators
- owns billing, site ownership, and final settings authority

### Planner
- broad shared-site editing scope
- can work across guests, planning, itinerary, messages, registry/photo/settings lanes where the collaborator permission matrix and runtime proof allow it
- broader than coordinator

### Coordinator
- focused operational/day-of collaborator role
- can run the narrower coordination and support surfaces without silently becoming full owner/admin

### Viewer
- read-only collaborator
- can review data but not make changes in the proven shared-site surfaces

## What was stale before
Older docs said:
- backend RBAC only modeled owner/coordinator/viewer
- planner was only a product-layer preset
- planner persistence was local/demo-like unless backed by collaborator records

That is no longer the right launch truth. The live proof bundle now covers owner invite creation, collaborator claim, viewer deny, and planner/coordinator runtime allow/deny behavior.

## Remaining honest caveats
These are still real, but they are polish and breadth gaps rather than fake-collaboration gaps:
- collaborator management is still concentrated in the Settings area rather than a fuller admin center
- resend/expiry UX is not deeply polished
- future shared-site surfaces still need the client-RLS/runtime matrix kept current as new write lanes are added
- owner-only governance remains intentionally tighter than collaborator lanes

## Source of truth
If this doc and an older planning note disagree, trust the runtime proof and current production hardening docs:
- `scripts/v1-proof-collaborator-runtime.mjs`
- `docs/PRODUCTION_HARDENING_REPORT.md`
- `docs/v1-smoke-proof-log.md`
