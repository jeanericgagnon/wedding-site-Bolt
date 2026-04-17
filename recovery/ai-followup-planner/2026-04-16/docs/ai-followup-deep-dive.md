# AI Follow-Up Deep Dive

Current state after local planner iteration.

## What is working
### 1. event questions are no longer dumb
We moved from literal raw-event garbage to clustered event prompts.

Current better shape:
- asks about two events together
- allows skipping unknown details
- sounds more like a real product prompt

Example:
- `For welcome drinks and wedding, what time and location do you already know? Feel free to skip anything that is not finalized yet.`

### 2. TBD is treated more sanely
We now explicitly account for:
- TBD
- maybe
- still deciding
- if it works out
- probably

That reduced the chance of treating undecided details like defects.

### 3. round structure exists now
We now have a primitive round composer:
- event lane
- non-event lane

That is meaningfully better than pure ranking.

### 4. local eval discipline is real
This work has been refined locally with fixture-driven tests, not by burning live AI calls.

That matters because we are tuning planner behavior, not model creativity.

## What is not working well enough yet
### 1. non-event diversity is weak
The non-event lane still mostly resolves to:
- `first-detail`
- sometimes `guest-feel`

It rarely chooses:
- `location-why`
- `meeting-city`
- `registry-posture`

That means section coverage is still narrower than it should be.

### 2. event lane still dominates too often
Even with clustering, many cases still collapse to event-only.

That is acceptable for some strong operational cases, but not all of them.

### 3. story prompt is overused
`What was one specific detail from that first date you still remember?`

This is a decent prompt, but it should not be the default fallback for every thin-profile case.

### 4. vague cases still need smarter handling
Messy or vague cases like:
- destination but not locked
- weird freeform event bundles
- low-confidence venue language

still tend to stay too event-centric.

## Desired planner behavior
A good round should usually look like one of these:

### Pattern A — event-only round
Use when:
- event structure/logistics is the main real missing piece
- other gaps are low leverage

### Pattern B — event + emotional/tone round
Use when:
- event structure matters
- one answer about guest feel would improve multiple sections

### Pattern C — event + story round
Use when:
- event structure matters
- story is clearly absent or too flat
- guest feel is already obvious enough

### Pattern D — non-event-only round
Use when:
- there are no usable event details yet
- broad event-structure ask is enough
- second question should shape tone / story / meaning

## What should drive non-event selection
### choose guest-feel when
- style words are generic
- story is absent but emotional direction matters more than one anecdote
- the answer would improve hero + schedule + FAQ + travel tone

### choose location-why when
- destination/location is known
- location meaning would improve hero + travel + story together
- guests would naturally ask “why here?”

### choose story-detail when
- logistics are decent enough
- the site has no memorable personal texture
- one detail would unlock warmth without requiring a long story

### choose meeting-city when
- digital/long-distance origin is clear
- first in-person place would sharpen the relationship story materially

### choose registry-posture when
- gifts language is genuinely unclear
- there is no better tone/story/location question first

## Token discipline principle
When live AI is involved, the planner should behave like tokens are expensive.

Meaning:
- do not spend a question on low-impact cleanup
- do not ask what the couple probably does not know yet
- do not ask two small questions when one broad one would do
- do not spend the non-event slot on a weak curiosity question

## Best current next move
Do not keep micro-tuning prompt weights.

Instead:
1. formalize non-event category competition
2. define triggers for each category
3. run the eval bank again
4. compare which category wins per case
5. keep only changes that improve section breadth without adding fluff
