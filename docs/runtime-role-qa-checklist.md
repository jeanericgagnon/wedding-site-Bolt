# Runtime role QA checklist

Date: 2026-04-13

## Goal
Verify real runtime behavior for owner, planner, coordinator, and viewer accounts across the main dashboard surfaces.

## Roles
- owner
- planner
- coordinator
- viewer

## Surfaces
- Settings / collaborator management
- Guests
- Planning
- Budget
- Vendors
- Messages
- Seating
- Coordinator mode

## Owner expectations
- full access everywhere
- can manage collaborators
- can change sensitive settings
- can send messages

## Planner expectations
- can edit guests
- can edit planning tasks
- can edit budget
- can edit vendors
- can send messages
- can use coordinator/event-day tools
- cannot perform owner-only collaborator/settings actions

## Coordinator expectations
- can edit guests
- can use seating / itinerary / coordinator mode
- can perform live ops
- cannot edit budget
- cannot edit vendors
- cannot manage collaborators
- cannot take owner-level settings actions

## Viewer expectations
- read-only everywhere
- no guest/planning/message/live-ops mutation
- no collaborator/settings mutation

## Output template
For each role + surface:
- PASS
- FAIL
- Unexpected access leak
- Expected action blocked
- Notes

## Recommended execution order
1. owner
2. planner
3. coordinator
4. viewer
5. compare against matrix and file any mismatches
