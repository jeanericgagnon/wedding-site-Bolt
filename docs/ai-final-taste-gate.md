# AI final taste gate

## Goal
Finish taste refinement by setting explicit pass/fail standards for the last weak fields instead of continuing broad prompt thrash.

## Final weak fields
- `storyBody`
- `registryIntro`
- `countdownMessage`
- `heroSubtitle`

---

## Global pass rules
A line passes if it is:
- first person when emotionally appropriate
- practical with emotional undertone
- not corporate
- not brochure / concierge / etiquette-blog voice
- not Hallmark / wedding-template mush
- concrete when facts exist
- simple instead of poetic when facts are sparse

A line fails if it contains:
- corporate helper language
- sentimental shorthand
- “special day” style filler
- etiquette-blog registry phrasing
- generic couple-summary voice
- vague emotional abstractions with no facts

---

## `storyBody`
### Good
- `We met at the Library in San Luis Obispo, CA.`
- `We met in college and have kept choosing each other through every season since.`
- `Our journey began in a way I never expected — at a wedding!`

### Bad
- `We knew we wanted to spend the rest of our lives together from the very start.`
- `This moment is a quiet continuation of our commitment.`
- `We’re grateful to share this moment with those who matter most.`

### Pass rules
- should sound like a person telling the story
- should start concrete if any real detail exists
- should not sound like a summary written by a wedding copywriter

---

## `registryIntro`
### Good
- `Many of you are traveling across the globe to celebrate with us, so your presence means the world to us and is all we ask for.`
- `If you’ve asked about gifts, we’ve put a few ideas in one place.`
- `Your presence and prayers on our big day are all we ask for.`

### Bad
- `Your presence is the greatest gift.`
- `We appreciate your thoughtfulness.`
- `Your presence is truly enough.`

### Pass rules
- should feel calm and optional
- should not sound like etiquette copy
- should not repeat the same canned gratitude line every time

---

## `countdownMessage`
### Good
- `We can’t wait to celebrate with you soon.`
- `See you soon.`
- `We’re excited to have everyone together.`

### Bad
- `Looking forward to celebrating together soon.`
- `Our special day is getting closer.`
- `We look forward to sharing this moment with you.`

### Pass rules
- should be short
- should feel like a human sentence, not decorative filler
- should not get poetic

---

## `heroSubtitle`
### Good
- `We can’t wait to celebrate with you in San Diego.`
- `We’re getting married in Ojai on October 4, 2026.`
- `Join us in Tuscany for a weekend of celebration.`

### Bad
- `Celebrating our wedding with those we love most.`
- `A joyful gathering of family and friends.`
- `A celebration of love and togetherness.`

### Pass rules
- should orient guests fast
- should prefer place/date clarity when available
- should not sound like invitation marketing copy

---

## Finish rule
Taste refinement is done when these four fields consistently pass this gate across:
- rich
- medium
- sparse

If they pass, stop.
Do not keep tuning forever.
