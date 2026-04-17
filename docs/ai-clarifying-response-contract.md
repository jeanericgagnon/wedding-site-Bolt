# AI Clarifying Response Contract

Goal:
Use one unified AI response shape that either:
- asks high-value clarifying questions
- or returns draft-ready structured website outputs

## Top-level shape
```json
{
  "mode": "ask" | "draft",
  "questions": [],
  "draftOutputs": {},
  "why": [],
  "confidence": "low" | "medium" | "high"
}
```

## Mode: ask
When the intake is not strong enough to draft a good site yet.

### questions[] shape
```json
{
  "id": "weekend_events_overview",
  "category": "event_structure",
  "question": "What events are actually happening across the weekend, even if rough?",
  "expectedAnswerType": "short_text",
  "targetFields": ["eventSeeds", "schedule.summary"],
  "affectedSections": ["schedule", "faq", "travel"],
  "skippable": true
}
```

### Rules
- ask 0 to 3 questions max
- every question must be mappable
- every question must improve the site materially
- respect TBD / skipped answers
- no registry / gift questions in this phase

## Mode: draft
When the intake is already strong enough to build a believable site draft.

### draftOutputs shape
```json
{
  "hero": {
    "headline": "",
    "subheadline": "",
    "toneNote": ""
  },
  "schedule": {
    "intro": "",
    "eventSummary": ""
  },
  "faq": {
    "guidance": []
  },
  "travel": {
    "intro": ""
  },
  "story": {
    "intro": ""
  },
  "guestGuidance": {
    "dressCode": "",
    "children": "",
    "lodging": "",
    "transport": ""
  },
  "siteTone": {
    "summary": ""
  }
}
```

## Why this is the right contract
This lets the system:
- ask only when needed
- return usable draft data when no more questions are needed
- persist both question flow and draft flow in structured form
- map answers and outputs into templates without guesswork
