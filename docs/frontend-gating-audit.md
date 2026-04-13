# Frontend surface gating audit

Date: 2026-04-13

## Surfaces checked
- Guests
- Planning
- Messages
- Coordinator mode

## Current alignment

### Guests
- viewer is read-only
- owner/planner/coordinator can edit
- matches matrix well

### Planning
- planner/coordinator split is already respected
- coordinator can work tasks but not budget/vendors
- matches matrix well

### Messages
- planner can compose/send
- coordinator has reduced role
- viewer is read-only
- matches matrix well

### Coordinator mode
- viewer is read-only
- owner/planner/coordinator can operate
- broadly matches matrix

## Remaining frontend gaps
- settings/collaborator management still needs owner-only hardening in real persisted mode
- audit-log UI surface not yet audited because it is not fully productized
- seating-specific write/read checks should still be explicitly verified in a later pass

## Honest conclusion
Frontend gating is actually in better shape than backend RBAC right now.
The biggest remaining permissions problem is backend alignment, not local surface intent.

## Next step
- 10.4.3 prepare backend RBAC migration update for planner role + matrix alignment
