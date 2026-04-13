# Permission alignment plan

Date: 2026-04-13

## Goal
Align frontend permission behavior and backend RBAC rollout against the collaborator permission matrix.

## Frontend truth already exists
Frontend permission helpers already distinguish:
- planner
- coordinator
- viewer

Examples:
- planner can do more than coordinator in planning/messages
- viewer is read-only

## Backend truth still lags
Backend currently hardcodes mostly:
- owner
- coordinator
- viewer

That means permission alignment is currently split-brain.

## Alignment plan

### Phase A — source of truth
- collaborator-permission-matrix.md is canonical
- frontend should continue matching that matrix
- backend migrations must be updated to match it, not vice versa

### Phase B — surface audit
Audit each surface for frontend gating vs desired matrix:
- guests
- planning
- messages
- coordinator
- seating
- settings
- audit logs

### Phase C — backend RBAC upgrade
- add planner role to collaborator enum
- update read policies
- update write policies per surface
- verify helper functions still work

### Phase D — QA
Test each role:
- owner
- planner
- coordinator
- viewer

Across:
- guests
- planning
- messages
- seating
- coordinator mode
- collaborator settings

## Safe conclusion
The next useful work is not random code edits.
The next useful work is a per-surface permission audit using the matrix.

## Next step
- 10.4.2 audit frontend surface gating against matrix
