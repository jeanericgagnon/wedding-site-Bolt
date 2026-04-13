# Mobile RSVP Audit

Date: 2026-04-13

## Current real strengths
- RSVP flow is already broken into 3 steps instead of one long wall.
- progress is visible
- existing RSVP / return-visit cues are better than before
- practical details like events, meal choice, plus-one, and notes are all present

## Mobile pain points still visible in code

### 1. Dense step 2
Step 2 still stacks a lot of things in one screen:
- event choices
- meal choice
- plus-one
- song requests
- custom questions
- notes

That is survivable on desktop, but can feel long and cognitively heavy on a phone.

### 2. Small utility text and weak hierarchy
A lot of important helper copy still sits in:
- `text-xs`
- low-contrast gray
- tight spacing

That can make the flow feel harder for older guests or anyone moving fast on mobile.

### 3. Household inheritance UI is useful but cramped
The household-selection block is practical, but on mobile it likely feels dense because it mixes:
- checkbox logic
- event-access chips
- select-all / clear actions
- expandable details

### 4. Review step may still feel too compressed
The review card is compact and efficient, but some guests may need stronger visual separation between:
- attendance
n- events
- meal
- plus-one
- inherited household responses

## Safe conclusion
The mobile RSVP flow is decent, but not finished.
The biggest remaining issue is **cognitive load and readability**, not missing features.

## Recommended next moves
1. Reduce step-2 density
2. increase mobile readability and spacing
3. make review step easier to scan quickly
4. keep old-person-safe readability as a hard requirement
