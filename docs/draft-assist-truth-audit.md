# Draft-assist Truth Audit

Date: 2026-04-12

## Scope
Audit the new drafting helpers currently in product:
- FAQ draft helper
- welcome note draft helper
- RSVP reminder draft helper
- day-of update draft helper

## Core truth
These are grounded drafting helpers, not autonomous AI features.
They currently:
- use known wedding/setup data
- generate a draft
- require explicit user insertion/editing
- do not auto-send or auto-overwrite content

## Verified product truth

### FAQ draft helper
Status: truthful
- suggestions are derived from venue/travel/RSVP/use-case details
- user must explicitly insert them
- user can edit after insertion

### Welcome note draft helper
Status: truthful
- uses couple names, location/venue, and use-case direction
- produces starter copy only
- user must explicitly insert/edit it

### RSVP reminder draft helper
Status: truthful
- uses audience + venue + RSVP deadline context
- loads into the composer as a draft
- does not send autonomously

### Day-of update draft helper
Status: truthful
- uses venue + audience context
- generates a short practical message draft
- still requires human review/send

## Current safe language
Prefer:
- grounded draft help
- suggested draft
- uses your current wedding details
- insert and edit

Avoid:
- AI writes this for you
- smart assistant sends this automatically
- autonomous message generation
- one-click AI communication

## Recommendation
Keep the current framing grounded until a real server-backed generation/review system exists.
