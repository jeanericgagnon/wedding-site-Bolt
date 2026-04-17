# Clarifying End-to-End Flows

Goal:
Show how the new clarifying system should behave from AI decision through persistence and template seeding.

## Flow 1 — draft immediately
### Input
Strong destination baseline with date, venue, weekend events, guest count, story, and guest guidance already good enough.

### AI result
- `mode = draft`
- `questions = []`
- `draftOutputs` present

### Persistence
- `clarifying.mode = draft`
- no pending questions
- `draftOutputs` stored

### Template bridge
- `mapDraftOutputsToTemplateSeed(...)`
- hero/schedule/faq/travel/story/tone fields seeded

## Flow 2 — ask, then map answer
### Input
Child policy + dress code unclear.

### AI result
- `mode = ask`
- one question object with:
  - `targetFields = ['faq.dressCode', 'faq.childrenPolicy']`

### User answer
- `Black tie optional and adults only.`

### Persistence
- question status becomes `answered`
- answer stored on the question object

### Mapping
- `mapClarifyingAnswerToFieldPatch(...)`
- result:
  - `faq.dressCode = ...`
  - `faq.childrenPolicy = ...`

## Flow 3 — ask broad guest-clarity question
### Input
Messy weekend structure / unclear guest invitations.

### AI result
- `mode = ask`
- one broad guest-clarity question
- question targets schedule/faq/travel related fields

### User answer
- answer explains which events happen and who each is for

### Persistence + mapping
- status updated to `answered`
- answer patch merged into canonical clarifying field patch set
- downstream template population can use updated schedule/faq/travel guidance
