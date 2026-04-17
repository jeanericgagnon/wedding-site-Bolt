# AI Follow-Up Category Map

Use categories instead of raw missing fields when deciding the next question.

## Categories
### wedding-anchor
Missing or weak:
- date clarity
- location clarity
- venue certainty

Ask when:
- place/date is too vague to ground the site
- venue is still unclear and materially affects the guest picture

### event-structure
Missing or weak:
- what events exist
- which ones matter to guests
- where guests actually need to go

Ask when:
- the weekend exists only as vague freeform text
- the draft would confuse guests without one more pass

### guest-ops
Missing or weak:
- plus-one policy
- RSVP deadline
- meal collection
- guest count roughness when it impacts tone/ops

Ask when:
- RSVP or guest setup would otherwise be weak or misleading

### guest-feel
Missing or weak:
- emotional tone
- what the weekend should feel like
- social posture / hospitality posture

Ask when:
- copy would otherwise feel generic
- one question could improve multiple sections

### story-depth
Missing or weak:
- how they met
- one usable detail
- what feels distinct about them

Ask when:
- story copy would otherwise be flat
- there is no stronger operational question to ask first

### travel-logistics
Missing or weak:
- travel expectation
- lodging posture
- transport/getting around context

Ask when:
- destination or travel-heavy wedding
- guests need one more useful clue

### registry-tone
Missing or weak:
- whether gifts/cash/none is the posture
- how soft/no-pressure the wording should feel

Ask when:
- registry is present but the tone is unclear
- it affects guest-facing wording enough to matter

## Priority rules
- prefer categories that unblock multiple site sections
- prefer categories that help guests operationally
- prefer categories that paint the picture cleanly
- do not ask category questions if the draft is already strong enough

## Prompting rule
Generate follow-up wording from the category intent, not from raw user strings.

Bad:
- "Where is definitely welcome dinner, wedding Saturday, maybe something Sunday if people stay happening?"

Better:
- "Walk me through the wedding weekend. What’s happening, and where are guests actually going?"
