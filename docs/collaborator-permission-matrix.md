# Collaborator permission matrix

Date: 2026-04-13

## Roles
- owner
- planner
- coordinator
- viewer

## Matrix

| Surface | owner | planner | coordinator | viewer |
|---|---|---:|---:|---:|
| Guests read | yes | yes | yes | yes |
| Guests write | yes | yes | yes | no |
| RSVP assist / overrides | yes | yes | yes | no |
| Messages read | yes | yes | yes | yes |
| Messages compose/send | yes | yes | no | no |
| Itinerary read | yes | yes | yes | yes |
| Itinerary write | yes | yes | yes | no |
| Event invitations read | yes | yes | yes | yes |
| Event invitations write | yes | yes | yes | no |
| Planning tasks read | yes | yes | yes | yes |
| Planning tasks write | yes | yes | yes | no |
| Vendors read | yes | yes | yes | yes |
| Vendors write | yes | yes | no | no |
| Budget read | yes | yes | yes | yes |
| Budget write | yes | yes | no | no |
| Seating read | yes | yes | yes | yes |
| Seating write | yes | yes | yes | no |
| Coordinator mode read | yes | yes | yes | yes |
| Coordinator mode write/live ops | yes | yes | yes | no |
| Audit log read | yes | yes | yes | no |
| Collaborator management | yes | no | no | no |
| Site settings / ownership settings | yes | limited | no | no |

## Notes
- planner is broader than coordinator
- coordinator can run live ops but should not own budget/vendor/message-authoring scope by default
- viewer is read-only everywhere
- collaborator management remains owner-only

## Why this is the right split
- matches the current product language
- preserves clear difference between planner and coordinator
- prevents coordinator from quietly becoming full admin
- keeps owner as final authority

## Next step
- use this matrix to drive backend planner-role migration and frontend permission cleanup
