# AI answer-to-section impact map

## Goal
Turn incoming user answers into website-building signals instead of treating them as generic chat.

## Core rule
Each answer should be evaluated for:
1. what it means
2. what structured field(s) it fills
3. what website section(s) it improves
4. whether it is enough to write from now
5. what the next best follow-up is, if any

---

## Intake orchestration rule
- ask follow-ups in small batches
- **max 5 follow-up questions total**
- each follow-up must be high leverage
- prefer stopping early if enough detail exists
- for each follow-up, prepare **3 wording renditions** so product can choose the one that fits tone/context best

---

## Signal model

```ts
{
  signal: string,
  extractedValue: string | string[] | Record<string, unknown>,
  affects: string[],
  strength: 'low' | 'medium' | 'high',
  writeReady: boolean,
  followUpCandidates: string[]
}
```

---

## Signal categories

### 1. Couple identity
**Examples:** names, display format, pronouns

**Affects:**
- hero
- RSVP
- registry
- wedding party
- public labels everywhere

**Write ready?**
- yes for identity surfaces
- not enough for rich emotional copy

**Follow-up candidates:**
- none unless display formatting is unclear

---

### 2. Wedding basics
**Examples:** date, city, venue, destination, venue type

**Affects:**
- hero subtitle
- event headline
- travel intro
- accommodations intro
- FAQ intro
- directions intro
- schedule framing

**Write ready?**
- yes for utility sections
- partially for hero

**Follow-up candidates:**
- why this location?
- what should guests know first?

---

### 3. How we met / relationship origin
**Examples:** Hinge, concert, mutual friend, work, wedding, college

**Affects:**
- story body
- hero tone
- possibly countdown tone

**Write ready?**
- often yes for baseline story copy
- stronger with one concrete detail

**High-leverage follow-ups:**
- what city were you in when you finally met?
- who messaged first?
- what concert was it?

---

### 4. Relationship vibe / adjectives
**Examples:** playful, grounded, easy, warm, funny

**Affects:**
- story tone
- hero tone
- RSVP tone
- wedding party intro tone

**Write ready?**
- yes as tone modifier
- no as story substance by itself

**Follow-up candidates:**
- what’s one thing that feels very “you two”?

---

### 5. Guest experience intent
**Examples:** relaxed, intimate, fun, full weekend, tropical, small wedding

**Affects:**
- hero subtitle
- FAQ intro
- travel intro
- schedule intro
- countdown

**Write ready?**
- yes for guest-facing framing

**Follow-up candidates:**
- what do you want guests to feel most when they arrive?

---

### 6. Weekend flow / events
**Examples:** welcome dinner, pickleball, rehearsal dinner, pool party

**Affects:**
- schedule intro
- FAQ
- travel framing
- countdown tone

**Write ready?**
- yes for schedule framing

**Follow-up candidates:**
- what event matters most besides the wedding itself?

---

### 7. Travel / logistics signals
**Examples:** room booking emails, transport help, destination stay length

**Affects:**
- travel intro
- accommodations intro
- FAQ intro
- directions intro

**Write ready?**
- yes for utility sections

**Follow-up candidates:**
- do guests need to book rooms through a block?
- should transport feel handled or DIY?

---

### 8. Registry posture
**Examples:** grateful, no pressure, honeyfund, traditional registry

**Affects:**
- registry intro

**Write ready?**
- yes

**Follow-up candidates:**
- do you want to mention travel as part of the registry note?

---

### 9. RSVP posture
**Examples:** deadline, direct/warm/playful tone

**Affects:**
- RSVP intro
- RSVP CTA

**Write ready?**
- yes if deadline exists

**Follow-up candidates:**
- none if deadline + tone already known

---

## High-leverage follow-up selector
Only ask a follow-up if it improves one of these priority sections:
1. storyBody
2. heroSubtitle
3. travel / FAQ / accommodations
4. registryIntro
5. RSVP CTA

---

## Max follow-up policy
### Hard cap
- maximum **5 follow-up questions total** per couple intake flow

### Stop early if:
- story is write-ready
- hero has date/place/tone
- guest logistics are clear enough
- registry posture is known
- RSVP deadline is known

---

## Three-rendition question pattern
Every follow-up should have 3 versions:

### Example: concert detail
1. `What concert was it?`
2. `What show did you end up going to together?`
3. `Do you remember which concert it was?`

### Example: location context
1. `What city were you in when you finally met in person?`
2. `Where were you both when that first real date happened?`
3. `What city did you finally meet up in?`

### Example: guest-feeling goal
1. `What do you want guests to feel most over the weekend?`
2. `If the weekend feels a certain way, what do you want that feeling to be?`
3. `What’s the main vibe you want guests to walk away with?`

---

## Practical implementation sequence
### Phase 1
Define answer signal types.

### Phase 2
Define section-impact map.

### Phase 3
Define follow-up ranking logic.

### Phase 4
Add per-question 3-rendition variants.

### Phase 5
Stop after max 5 total follow-ups or earlier when write-ready.
