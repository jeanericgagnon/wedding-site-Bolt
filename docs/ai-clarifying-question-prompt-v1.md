# AI Clarifying Question Prompt v1

## System prompt

Use `buildClarifyingQuestionSystemPrompt()` from `src/lib/aiClarifyingQuestions.ts`.

Intent:
- decide whether to ask 0–3 follow-up questions
- optimize for final-site impact, not field completeness
- respect TBD / unresolved states
- keep token usage disciplined

## User prompt shape

Use:
- structured intake summary
- resolved items
- unresolved/TBD items
- readiness summary

## Output shape
```json
{
  "shouldAskFollowUps": true,
  "questions": [
    "What should guests expect from the weekend overall?",
    "What events are actually happening across the weekend, even if rough?"
  ],
  "whyTheseQuestions": [
    "Improves homepage tone, FAQ usefulness, and schedule framing.",
    "Improves schedule/travel clarity without over-asking for finalized details."
  ]
}
```

## Guardrails
- max 3 questions
- if site is already good enough, ask 0
- no trivia collection
- no mandatory-finish pressure on unresolved logistics
- prefer broader questions that improve multiple sections
