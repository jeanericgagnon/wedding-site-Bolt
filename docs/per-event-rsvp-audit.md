# Per-Event RSVP Audit

Date: 2026-04-13

## Scope
Audit how DayOf currently handles RSVP truth across multiple events (ceremony, reception, welcome party, brunch, etc.).

## Current truth

### What exists
- guests can carry invited-event linkage from import
- RSVP/event flows already understand event-specific attendance in parts of the system
- RSVP Board and guest operations can surface some event-aware behavior

### What is still weak
- per-event RSVP handling is not yet fully first-class across all operational surfaces
- some flows still flatten RSVP truth into a guest-level status too early
- reminder/follow-up logic is not yet deeply shaped around event-specific non-response states
- household and plus-one complexity can make multi-event truth harder to read quickly

## Main risk
The product can look more per-event-aware than it actually is if we overread the current invited-event linkage as a full multi-event RSVP system.

## Recommendation
Next work should focus on:
1. clarifying the response structure for ceremony / reception / extra events
2. making RSVP Board reflect that structure more explicitly
3. shaping reminders/follow-up around per-event truth instead of just top-level RSVP status


## Follow-on proof
- per-event RSVP structure is now visible in guest ops and RSVP board
- event-specific reminder drafting now exists in Messages
- remaining weakness: deeper event-by-event operational logic is still incomplete
