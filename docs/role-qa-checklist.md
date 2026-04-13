# Role QA checklist

Date: 2026-04-13

## Roles to test
- owner
- planner
- coordinator
- viewer

## Surfaces to test
- Guests
- Planning
- Messages
- Seating
- Coordinator mode
- Settings / collaborator access
- Invite accept flow

## Expected behavior

### Owner
- full access everywhere
- can manage collaborators
- can change sensitive settings

### Planner
- can edit guests
- can edit planning tasks
- can edit budget
- can edit vendors
- can compose/send messages
- can use coordinator/event-day tools
- cannot take ownership settings away from couple

### Coordinator
- can edit guests and live ops surfaces
- can work itinerary / seating / coordinator tools
- can work planning tasks tied to execution
- cannot edit budget
- cannot edit vendors
- cannot compose full campaign messaging
- cannot manage collaborators

### Viewer
- read-only everywhere
- cannot mutate guest/planning/message/coordinator surfaces
- can inspect but not act

## Remaining QA gap
This checklist is now defined, but still needs an actual executed test pass.

## Next step
- 10.4.9 execute role QA pass and log any mismatches
