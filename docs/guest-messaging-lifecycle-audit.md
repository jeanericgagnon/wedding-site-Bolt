# Guest Messaging Lifecycle Audit

Date: 2026-04-13

## Current real strengths
- Invite lifecycle states exist and are visible across guest ops and RSVP board.
- Reminder flows exist for pending replies, missing meal choices, plus-one follow-up, and due reminders.
- Draft helpers exist for RSVP reminders, event reminders, and day-of updates.
- Messages dashboard has clearer delivery-state reporting than before.

## Current lifecycle gaps

### 1. Lifecycle is still missing a few practical stages
Current shared flow:
- save the date
- invite
- reminder
- day-of

Missing or under-modeled stages:
- RSVP received confirmation / thanks
- final details / week-of note
- post-wedding thank-you communication
- manual handoff / family relay messaging

### 2. Messaging truth is split across surfaces
Some lifecycle truth lives in:
- Guests
- RSVP board
- Messages
- helper modules

That means operators still need to mentally stitch together:
- what stage this guest is actually in
- what was already sent
- what still needs a different message type

### 3. Manual/offline guest communication is still weakly modeled
The product now recognizes manual follow-up better than before, but still does not deeply support:
- “called and confirmed”
- “family contact handling this household”
- “text only, no email” as a first-class communication strategy
- guest-by-guest communication history with outcome truth

### 4. Thank-you communication is operationally present but not yet a full lifecycle layer
There is support for thank-you due tracking.
There is not yet a fuller communication layer for:
- thank-you drafted
- thank-you sent by channel
- gift acknowledgment follow-up

## Product-safe truth
Safe claim:
- DayOf supports invite, reminder, and day-of guest messaging with clearer operational follow-up.

Unsafe claim:
- DayOf already provides a complete end-to-end guest communications CRM.

## Recommended next moves
1. Add explicit week-of and post-wedding communication states
2. Add clearer manual/offline communication markers
3. Surface lifecycle stage more consistently across guest/message surfaces
4. Keep thank-you communication claims narrower than full CRM language
