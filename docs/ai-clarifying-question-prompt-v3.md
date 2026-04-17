# AI Clarifying Question Prompt v3

## Goal
Decide whether to ask 0–3 clarifying questions before drafting the first wedding website version.

The model is not trying to complete intake.
It is trying to improve the draft only when a follow-up would have clear leverage.

## What changed from v2
- much stronger 0-question bias when the site is already draftable
- stronger preference for 1 question over stacking 2–3 mediocre ones
- clearer rule that missing fields alone do not justify follow-ups
- explicit rejection of overlapping guest/event questions
- clearer gating for story questions: only when ops are already coherent
- stronger distinction between broad framing questions vs narrow cleanup

## Recommended system prompt
Use `buildClarifyingQuestionSystemPrompt()` from `src/lib/aiClarifyingQuestions.ts`.

Core behavior:
- ask 0 if the current intake is already coherent enough to draft a believable, useful site
- ask only the smallest number of questions that materially improve the final site
- prefer one broad question over two overlapping ones
- ask story/emotional questions only when operational clarity is already good enough

## Decision framework
### Ask 0 questions when
- the couple already has a believable site skeleton
- missing details are narrow, tentative, or normal TBDs
- a follow-up would mostly satisfy completeness rather than improve guest experience or site quality

### Ask 1 question when
- one broad answer could noticeably improve homepage + FAQ + schedule framing
- guest expectation or weekend shape is still fuzzy
- there is a single meaningful decision gap like gifts/registry posture

### Ask 2 questions when
- there are two distinct, non-overlapping gaps with real leverage
- example: broad guest clarity + gift guidance
- not example: guest clarity + event clarity when one broader guest/weekend question would cover both

### Ask 3 questions only when
- the intake is genuinely thin or confused
- each question improves a different important dimension
- each question would still feel reasonable to a real couple

## Priority order
1. guest clarity
2. event structure
3. emotional depth
4. decision clarity
5. location meaning

## Good question patterns
- What should guests expect from the weekend overall?
- What events are actually happening across the weekend, even if rough?
- Is there anything guests might be confused about or need extra guidance on?
- What’s one thing that feels very “you two” that you’d want reflected on the site?
- Do you want to guide guests at all on gifts or keep it open?
- Why did you pick this location?

## Bad question patterns
- highly specific timeline cleanup when the couple may not know yet
- multiple overlapping questions about the same weekend structure problem
- first-date-detail mining when guest clarity is still weak
- questions that improve only one tiny sentence
- asking for completeness instead of leverage

## Output shape
```json
{
  "shouldAskFollowUps": true,
  "questions": [
    "What should guests expect from the weekend overall?"
  ],
  "whyTheseQuestions": [
    "Improves homepage framing, FAQ usefulness, and overall guest guidance."
  ]
}
```

## Practical expectation
A good result is often:
- 0 questions for a solid baseline
- 1 question for a medium or slightly fuzzy baseline
- 2 questions only when the gaps are clearly different and both high-value

If the model keeps asking 2–3 questions on already usable intakes, it is still being too completion-oriented.