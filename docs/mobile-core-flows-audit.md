# Mobile core flows audit

Date: 2026-04-13

## Flows checked
- public site surfaces
- RSVP
- registry
- guest photo upload

## Current read

### RSVP
- now in good shape
- multiple cleanup passes already landed
- readable, better spaced, more touch-friendly

### Registry
- public registry surfaces look decent structurally
- likely still some room for polish, but not screaming as the main mobile problem

### Guest photo upload
- functional, but likely the next best mobile cleanup target
- photo upload flows usually need extra care on phones:
  - file picking
  - progress states
  - post-upload confirmation clarity

### Public site
- broad mobile support exists, but this still likely needs targeted spot-checking rather than guessing

## Honest conclusion
The highest-value mobile cleanup target now is probably:
- **guest photo upload flow**

Not RSVP anymore.
That one already got the love.

## Next step
- A4.2 do focused mobile pass on guest photo upload flow
