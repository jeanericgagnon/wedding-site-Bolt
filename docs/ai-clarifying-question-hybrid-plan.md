# AI Clarifying Question Hybrid Plan

Saved after deciding to try a prompt-led approach instead of overfitting the current heuristic planner.

## Constraint
Research via `web_search` is currently blocked because the Gemini search tool is not configured (`missing_gemini_api_key`).

## Practical direction anyway
The hybrid approach should be:
- keep structured intake locally
- keep hard caps and skip/TBD rules locally
- ask the model to decide whether 0–3 clarifying questions are worth asking
- force the model to optimize for final-site impact, not field completeness

## Desired model instruction shape
### Inputs
- structured intake answers
- short summary of what the site needs to cover
- explicit ambiguity / uncertainty notes
- known unresolved/TBD notes

### Core instruction
Decide whether the current information is already strong enough to build a believable first draft of the wedding site.

If yes:
- return no follow-up questions

If no:
- ask up to 3 concise, high-leverage clarifying questions
- only ask questions whose answers would materially improve the final site
- prefer questions that improve multiple sections at once
- do not ask for details the couple likely has not finalized yet
- respect unresolved/TBD states as valid
- avoid biography/trivia questions unless they clearly improve the site

### Priority order
1. guest clarity
2. event structure
3. emotional depth
4. decision clarity
5. location meaning

### Output format
- `shouldAskFollowUps: boolean`
- `questions: string[]` (0–3)
- `whyTheseQuestions: string[]` (brief internal rationale, optional for debugging only)

## Suggested guardrails
- max 3 questions
- max ~20 words per question when possible
- no repeated stem wording
- no more than one story-oriented question
- allow questions to imply skip/TBD if relevant

## Why this may be better
This gives us:
- more flexible judgment than rigid heuristics
- fewer brittle hand-authored rules
- still limited token usage because the question count is capped
- better chance of picking the truly best next questions

## Keep from the current planner work
Retain these lessons as hard rails:
- skip/TBD is valid
- event questions should batch cleanly
- vague cases should get broader clarifiers, not nitpicks
- low-value cleanup should not consume turns
- if the intake is already strong enough, ask nothing
