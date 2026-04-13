# Planner backend expansion plan

Date: 2026-04-13

## Goal
Lift backend RBAC to match canonical product roles:
- owner
- planner
- coordinator
- viewer

## Current backend blockers
Current backend collaborator role enum is:
- owner
- coordinator
- viewer

Current policies and helper functions repeatedly hardcode:
- `ARRAY['owner','coordinator','viewer']`
- `ARRAY['owner','coordinator']`

That means planner backend support requires systematic policy expansion, not one tiny patch.

## Minimal migration path

### 1. Expand enum
- add `planner` to `collaborator_role`

### 2. Preserve role function shape
- `dayof_role_for_site(site_id)` can keep returning text
- no conceptual redesign needed there

### 3. Update read policies
Where current read access is:
- owner / coordinator / viewer

Change to:
- owner / planner / coordinator / viewer

### 4. Update write policies
Where current write access is:
- owner / coordinator

Decide per surface whether planner should also write.
Default likely should be:
- owner / planner / coordinator for ops surfaces
- owner / planner only for more sensitive planning/budget/message-authoring surfaces

### 5. Build explicit permission matrix
Before touching migrations, define per-surface truth for:
- guests
- messages
- itinerary
- invitations
- planning tasks
- vendors
- budget
- seating
- coordinator mode
- audit logs

## Safe recommendation
Do **not** patch migrations blind.
Next real move should be:
1. create permission matrix
2. then write one planner-RBAC migration
3. then test every affected surface

## Next step
- 10.3.1 create collaborator + permission matrix before migration work
