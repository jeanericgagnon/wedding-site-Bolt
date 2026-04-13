# Archive mode audit

Date: 2026-04-13

## What exists already

### Core logic
- `src/lib/archiveMode.ts`
- clear states:
  - planning
  - live-week
  - post-wedding
  - archived

### Existing product surfacing
- Overview already shows archive-mode framing
- Vault already changes tone when post-wedding
- Guest photo sharing already imports archive-mode context
- public site / product copy already talks about archive + anniversary layer

## What is actually good
- the product has the right *idea*
- post-wedding is not treated like a dead-end
- vaults and memory framing already support the keepsake direction

## What is still weak

### 1. Archive mode is mostly messaging, not product behavior
Right now archive mode mostly changes:
- labels
- prompts
- guidance copy

It does **not** yet strongly change the actual interface structure.

### 2. No clear private-couple archive home
There is no single obvious archive dashboard that says:
- here is the memory layer
- here are the best photos
- here are anniversary prompts
- here is what still matters after the wedding

### 3. Old ops surfaces still feel too available
The product understands that planning urgency should cool down, but it does not appear to aggressively demote:
- RSVP operations
- planning tasks
- setup urgency
- other pre-wedding admin pressure

## Safe conclusion
Archive mode is **partially real**.
The framing is there, but the behavioral shift is still too soft.

## Recommended private archive v1
A real archive-mode v1 should:
- create a clearer post-wedding home state
- prioritize:
  - anniversary vaults
  - guest photo memory
  - revisit public site
  - recap / keepsake actions
- demote pre-wedding operations instead of pretending they are still equally urgent

## Next step
- 8.3.2 define private couple archive v1
