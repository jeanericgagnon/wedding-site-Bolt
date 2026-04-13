# Backend RBAC migration update plan

Date: 2026-04-13

## Goal
Prepare the migration work needed to align backend permissions with the collaborator matrix and canonical planner role.

## Required changes

### 1. Expand collaborator role enum
Current:
- owner
- coordinator
- viewer

Target:
- owner
- planner
- coordinator
- viewer

### 2. Update role-bearing tables
- `wedding_site_collaborators.role` must allow planner
- `wedding_site_collaborator_invites.role` should be constrained to canonical roles

### 3. Update helper functions
`dayof_role_for_site` can remain text-returning.
No redesign needed, but planner must flow through naturally.

### 4. Update read policies
Current read arrays often use:
- owner / coordinator / viewer

Target should generally be:
- owner / planner / coordinator / viewer

### 5. Update write policies by matrix
Default write target is **not** the same everywhere.

#### Guests / RSVP ops
- owner
- planner
- coordinator

#### Messages compose/send
- owner
- planner

#### Itinerary / invitations
- owner
- planner
- coordinator

#### Planning tasks
- owner
- planner
- coordinator

#### Vendors
- owner
- planner

#### Budget
- owner
- planner

#### Seating
- owner
- planner
- coordinator

#### Audit logs read
- owner
- planner
- coordinator

## Safe migration sequencing
1. add planner role support
2. patch helper-compatible policies
3. run role QA by surface
4. only then claim section 10 permissions are done

## Next step
- 10.4.4 write the actual planner-RBAC migration stub
