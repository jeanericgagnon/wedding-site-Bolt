# Check-in and Day-of Edge Case Audit

MVP note:
- This audit captures realism gaps, not the full product contract.
- The current competitor-informed MVP bar and build gaps live in [feature-mvp-gap-research-2026-05-13.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/feature-mvp-gap-research-2026-05-13.md).

Date: 2026-04-13

## Current real strengths
- Guests page has active check-in mode with quick toggles, undo-last-check-in, and bulk clear support.
- Seating supports arrival marking inside the seating workflow.
- Seating lookup gives staff a fast answer path for table and seat questions.
- Coordinator mode gives a live, simplified command surface for day-of support.

## Current realism gaps

### 1. Check-in truth is mostly binary
Current product truth:
- checked in
- not checked in

Missing realism:
- wrong event checked in
- duplicate arrival attempts
- guest arrived but seat not ready
- walk-in or unlisted guest handling
- redirected guest / sent to help desk
- “needs manager decision” state

### 2. Lookup is good for answers, weak for live exception handling
Current lookup tells staff where someone sits.
It does not yet clearly handle:
- guest not found
- guest found but unassigned
- guest found but RSVP unresolved
- guest found with a household mismatch
- guest swap / substitute attendee

### 3. Coordinator mode is useful but still light
It helps with:
- timeline
- alerts
- check-in
- guest scanning by list

It does not yet act like a deeper day-of command center for:
- front-desk exception triage
- arrivals that conflict with RSVP truth
- escalation buckets
- staffing handoff states

### 4. Event-specific arrival truth is not explicit enough
For multi-event weddings, current check-in behavior does not clearly distinguish:
- checked in for welcome party
- checked in for ceremony
- checked in for reception
- checked in for brunch

That can create false confidence if one arrival state is treated as universal.

## Product-safe truth
Safe claim:
- DayOf supports day-of guest lookup, seating answers, and basic check-in tracking.

Unsafe claim:
- DayOf already provides complete event-day exception management or advanced arrival ops.

## Recommended next moves
1. Add explicit check-in exception states
2. Add not-found / unassigned / unresolved arrival handling in lookup flows
3. Make event-specific arrival truth more visible
4. Add escalation-oriented actions for live ops
