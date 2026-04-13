# Runtime permission QA plan

Date: 2026-04-13

## Goal
Move from code-level confidence to real multi-account runtime verification.

## Test accounts needed
- owner account
- planner account
- coordinator account
- viewer account
- wrong-email account for invite mismatch test

## Flows to verify

### Collaborator invite flow
- owner creates invite
- owner copies/resends invite
- wrong-email account cannot claim
- correct-email account can claim
- expired invite cannot claim
- revoked invite cannot claim

### Role behavior
#### Owner
- full settings access
- collaborator management access
- guest/planning/message/seating/coordinator full access

#### Planner
- can edit guests
- can edit planning, vendors, budget
- can send messages
- cannot take ownership-level settings actions

#### Coordinator
- can operate live/event-day tools
- can edit guests/seating/itinerary tasks
- cannot edit budget/vendors
- cannot manage collaborators

#### Viewer
- read-only everywhere
- cannot mutate any core surface

## What counts as success
- UI gating matches role
- backend enforcement matches role
- invite safety checks work as intended
- no privilege leaks

## Next step
- P1 closeout: mark collaborator safety batch done enough after runtime QA is scheduled or executed
