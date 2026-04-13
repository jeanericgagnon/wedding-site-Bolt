# Frontend role truth map

Date: 2026-04-13

## Canonical product role set
- owner
- planner
- coordinator
- viewer

## Product meaning
- **owner**: couple with final control
- **planner**: broad operational collaborator across planning, guests, seating, messages, and coordination
- **coordinator**: day-of / live-ops focused collaborator
- **viewer**: read-only visibility

## Current frontend truth
Frontend already uses the 4-role model in product language and access helpers.
That is the correct product truth and should stay.

## Current backend mismatch
Current backend RBAC migration truth appears narrower:
- owner
- coordinator
- viewer

So planner is currently under-modeled at the backend level.

## Safe frontend alignment rule
Until backend catches up:
- keep `planner` as canonical frontend/product truth
- do not collapse planner into coordinator in the UI
- do not claim backend-enforced planner persistence is fully complete
- document that backend bridging is still required

## Required bridge work later
- backend collaborator role support for planner
- persisted collaborator invite/activation flow
- frontend/backend permission matrix reconciliation

## Conclusion
Frontend should stay aligned to the 4-role canonical product truth.
The mismatch should be solved by lifting backend truth up, not by dumbing frontend truth down.
