# Clarifying Question Answer Mapping

Goal:
Map answered clarifying questions back into canonical target fields so the answers are useful beyond chat.

## Current simple rule
For each answered clarifying question:
- read its `targetFields`
- write the answer into each target field

## Example
Question:
- `What should guests know about dress code and whether children are welcome?`

Question metadata:
- `targetFields = ['faq.dressCode', 'faq.childrenPolicy']`

Answer:
- `Black tie optional and adults only.`

Patch result:
```json
{
  "faq.dressCode": "Black tie optional and adults only.",
  "faq.childrenPolicy": "Black tie optional and adults only."
}
```

## Next refinement later
This first version is intentionally simple.
Later we can improve it to support:
- split answers across multiple target fields
- typed values
- partial/TBD storage
- better per-field parsing

## Why this matters now
Even a simple answer-to-field patcher is enough to prove the clarifying-question path can become canonical, not just conversational.
