# AI Clarifying Question Local Findings v1

Local-only prompt iteration findings so far.

## Strong patterns
### 1. guest clarity is more important than we first weighted
Questions like these are often higher leverage than story-detail questions:
- What should guests expect from the weekend overall?
- Is there anything guests might be confused about or need extra guidance on?

### 2. broad event clarification beats precise event prompting in messy cases
When weekend input is vague or blended, the better move is:
- What events are actually happening across the weekend, even if rough?

not a highly specific event-by-event cleanup question.

### 3. story questions should be broader
Better:
- What’s one thing that feels very “you two” that you’d want reflected on the site?

Worse:
- What was one specific detail from that first date you still remember?

unless the case is already clean and just needs texture.

### 4. registry and location meaning are real secondary winners
These matter in specific cases and should stay available:
- Do you want to guide guests at all on gifts or keep it open?
- Why did you pick this location?

## Weak patterns
### 1. over-precise event cleanup
Too easy to ask for details the couple may not know yet.

### 2. overusing biography / first-date detail
This can feel low-value relative to guest clarity.

### 3. trying to force rare categories like meeting-city
It may be legitimate occasionally, but it is not a top-tier default winner.

## Current prompt direction
Best current direction:
- impact-based
- broader guest-clarity first
- broader event-structure when messy
- emotional-depth question only when it truly improves the site
- allow 0 questions when the site is already strong enough
