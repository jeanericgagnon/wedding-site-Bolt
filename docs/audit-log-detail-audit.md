# Audit log detail audit

Date: 2026-04-13

## Current audit log UI
Current guest audit log UI shows:
- action type
- guest id
- changed_at timestamp
- raw actor id (or unknown)

## Current weakness
This is enough for v1 existence, but not enough for strong operator clarity.

### Missing detail
- no friendly actor identity
- no guest name context
- no before/after change summary
- no clearer event phrasing like:
  - "Guest RSVP updated"
  - "Guest record created"
  - "Guest removed"

## Highest-value next improvement
Do not build a giant diff engine.
The best next step is:
1. resolve guest id to guest name where possible
2. improve action labels into human-readable descriptions
3. optionally show actor email/name later if data is available

## Honest conclusion
Audit-log detail is worth one more polish pass.
That will make it feel much less like a raw table dump.

## Next step
- B1.2 add human-readable action + guest context to audit log view
