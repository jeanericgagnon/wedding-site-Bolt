# AI Follow-Up Three-Pass Plan

Goal:
Run planner refinement in deliberate three-pass cycles instead of one-off nudges.

## Pass 1 — logic pass
Purpose:
- adjust scoring / routing / category selection
- no concern for final wording polish yet

Questions:
- did the right category win?
- did the right slot win?
- did we suppress low-value cleanup?

Outputs to inspect:
- category winner per eval case
- event-only vs mixed rounds
- overused categories

## Pass 2 — phrasing pass
Purpose:
- improve the actual wording once the category winner is correct
- keep token discipline and skip language intact

Questions:
- does the prompt sound human?
- does it sound skippable when needed?
- does it sound too demanding / robotic / repetitive?

Outputs to inspect:
- ugly phrasing
- repeated prompt stems
- over-formal or too-long wording

## Pass 3 — regression / breadth pass
Purpose:
- rerun the eval bank after the logic + wording pass
- check breadth and failure modes

Questions:
- did we improve diversity of non-event categories?
- did any rich cases get worse?
- did vague cases stay broad instead of nitpicky?
- did token discipline survive?

Outputs to inspect:
- category distribution by case
- regressions in strong cases
- duplicate-style questions
- unnecessary two-question rounds

## Cycle rules
- do not judge a change after only one micro-pass
- every meaningful refinement should go through all three passes
- if pass 1 fails, do not waste time on pass 2 polish
- if pass 2 sounds better but pass 3 regresses coverage, reject it

## Done criteria for a cycle
A cycle is only good if:
- category choice improved
- wording did not get worse
- regression breadth did not get worse

## Practical use
For each next batch:
1. make logic change
2. inspect outputs
3. refine wording if the category winner is right
4. rerun eval bank
5. keep only the change if it survives the third pass
