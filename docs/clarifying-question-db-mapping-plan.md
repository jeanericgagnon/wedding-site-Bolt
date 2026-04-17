# Clarifying Question DB Mapping Plan

Goal:
Take the unified ask-or-draft clarifying response and make it persistable and template-mappable.

## If mode = ask
Store each structured question object with:
- `id`
- `category`
- `question`
- `expectedAnswerType`
- `targetFields`
- `affectedSections`
- `skippable`
- `round`
- `status` (`pending` | `answered` | `skipped` | `unresolved`)
- `answer`

## If mode = draft
Store structured draft outputs with:
- hero
- schedule
- faq
- travel
- story
- guestGuidance
- siteTone

## Suggested persistence shape
```json
{
  "clarifying": {
    "mode": "ask",
    "questions": [],
    "history": []
  },
  "draftOutputs": {}
}
```

## Canonical flow
1. initial setup answers
2. clarifying question objects
3. clarifying answers / skipped / TBD states
4. draftOutputs
5. template population

## Mapping rules
### ask path
When a question is answered:
- update the matching `targetFields`
- persist answer status
- keep original question object for traceability

### draft path
When `mode = draft`:
- persist `draftOutputs`
- map them into canonical template-population inputs
- allow template switching to remap from structured outputs, not raw chat strings

## Benefits
- AI questions become automappable
- skipped/TBD states stay explicit
- draft-ready outputs can populate templates directly
- future template remap becomes cleaner
