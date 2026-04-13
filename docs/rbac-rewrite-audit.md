# RBAC rewrite audit

Date: 2026-04-13

## Exact tables / policy groups still needing planner-aware rewrites

### From collaborator RBAC foundation migration
`20260302073000_add_wedding_site_collaborator_rbac.sql`

Needs concrete planner-aware updates for:
- guests read/write
- messages read/write
- itinerary_events read/write
- event_invitations read/write
- planning_tasks read/write
- planning_vendors read/write
- planning_budget_items read/write

## Additional later migrations needing planner-aware updates

### Guest Q&A board
`20260302084500_add_guest_qna_board.sql`
Needs planner in:
- read policy
- write policy

### RSVP waitlist
`20260302091500_add_rsvp_capacity_waitlist.sql`
Needs planner in:
- read policy
- write policy

## Exact policy pattern problem
Current policy arrays repeatedly use:
- `['owner','coordinator','viewer']`
- `['owner','coordinator']`

These are the concrete rewrite targets.

## Safe conclusion
The planner-RBAC migration is not abstract anymore.
We now know exactly which migrations and policy blocks need updating.

## Next step
- 10.4.6 write the first concrete planner-aware policy migration pass
