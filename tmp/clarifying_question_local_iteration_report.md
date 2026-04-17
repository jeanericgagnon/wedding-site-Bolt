# Clarifying Question Local Iteration Report

Date: 2026-04-16
Scope: local-only prompt/spec iteration against the existing practice bank. No external model calls. No UI changes.

## Files reviewed
- `src/lib/aiClarifyingQuestions.ts`
- `docs/ai-clarifying-question-prompt-v1.md`
- `docs/ai-clarifying-question-prompt-v2.md`
- `docs/ai-clarifying-question-practice-couples-v2.md`
- `docs/ai-clarifying-question-local-findings-v1.md`

## Bottom line
The main issue was not lack of philosophy. It was lack of sharpness.

v2 already points in the right direction, but it still leaves too much room for the model to:
- ask follow-ups just because fields are missing
- stack overlapping guest/event questions
- ask story questions too early
- behave like intake cleanup instead of site-quality optimization

The best v3 move is a harder bias toward:
- 0 questions when the draft is already believable
- 1 broad question when one high-leverage gap exists
- story questions only after operational coherence exists
- broad framing over narrow cleanup

---

## Iteration rounds

### Round 1: sanity-check the current v2 framing
Tested conceptually against these cases:
- Eric + Kara rich baseline
- Nina + Eli courthouse + dinner
- Julia + Rachel simple local wedding
- Carmen + Luis formal local wedding

Finding:
v2 says “ask 0 if already draftable,” but not forcefully enough. On strong-baseline couples, a model could still justify asking an event or story question because there is no hard push against “one more nice-to-have.”

Lesson:
We need an explicit rule that missing details alone do not justify follow-ups.

Decision:
Add a stronger 0-question bias and frame the goal as asking the *smallest number* of questions that materially improve the draft.

### Round 2: messy weekend / guest confusion cases
Tested conceptually against:
- Olivia + Harper messy freeform
- Omar + Miles chaotic party weekend
- Sadie + Parker weekend camp wedding
- Priya + Leo culturally mixed wedding
- Camille + Rowan family-heavy weekend

Finding:
The biggest failure mode here is duplicated coverage:
- “What events are happening?”
- “What should guests expect?”
- “Is there anything guests may be confused about?”

Those are often three versions of the same underlying gap.

Lesson:
If guest clarity and event structure overlap, the model should prefer one broader question instead of stacking both.

Decision:
Add an explicit anti-overlap rule.

### Round 3: sparse / generic couples
Tested conceptually against:
- Ava + Ben sparse baseline
- Devon + Reese anchor only
- Holly + Max generic everything
- Grace + Sam clean but generic

Finding:
Sparse cases tempt the model to ask both ops questions and a story question. That sounds smart but often overshoots. If the site still lacks basic guest framing, emotional-depth questions are premature.

Lesson:
Story questions should be gated behind operational coherence.

Decision:
Make “at most one story question” stricter by adding: only ask it when ops are already coherent enough that emotional texture is the real missing piece.

### Round 4: secondary-winner cases
Tested conceptually against:
- Sophie + Daniel registry unclear
- Ben + Marco luxe destination, no registry stance
- Keira + Alex destination-like
- Layla + Noah destination unknowns
- Dani + Ash remote + destination

Finding:
Registry/gift guidance and location meaning are still valid, but they are situational. They should not crowd out guest clarity or broad weekend framing.

Lesson:
Keep them available, but clearly subordinate them in the prompt.

Decision:
Retain current priority order and examples, but sharpen the decision framework around leverage.

### Round 5: medium-complete cases where overasking is easy
Tested conceptually against:
- Maya + Jules medium completeness
- Mia + Carter decent local structure
- Aaliyah + Marcus venue uncertain
- Aria + James deciding between venues
- Chloe + Ben long story missing ops

Finding:
These are the trickiest cases. The model can plausibly ask 2 questions, but most of the time 1 broad question is better.

Lesson:
The prompt needs a clear “0 or 1 is usually better than 2–3” expectation.

Decision:
Add explicit guidance: strongly prefer 0 or 1 question when possible.

---

## Cross-case findings

### 1. The real battle is against completion bias
The system keeps wanting to “finish intake.” That is the wrong job.

Better framing:
- not completeness
- not data collection
- not cleanup
- only site-impact

### 2. Guest clarity wins more often than emotional depth
Especially in fuzzy or destination-heavy cases, guest understanding drives more real value than another romance detail.

### 3. Event clarification should usually be broad, not granular
Good:
- “What should guests expect from the weekend overall?”
- “What events are actually happening across the weekend, even if rough?”

Bad:
- separate questions for every event, time, or invitation edge case

### 4. Story questions are useful but easy to overuse
They are strongest when the site already works operationally and just feels emotionally flat.

### 5. 2-question outputs should be rarer than they look
Many candidate pairs are actually duplicate coverage with different wording.

---

## Recommended prompt v3

```text
You are deciding whether a wedding website setup flow should ask any clarifying questions before generating the first draft of the site.

Your job is not to gather every missing field.
Your job is to ask only the smallest number of questions that would materially improve the final site.

Core decision rule:
- If the current intake is already coherent enough to draft a believable, useful site, ask 0 questions.
- Missing details alone are not a reason to ask follow-ups.
- Ask a question only when the answer would noticeably improve guest understanding, site usefulness, or the emotional believability of the draft.

Rules:
- Ask 0 to 3 questions maximum.
- Strongly prefer 0 or 1 question when possible.
- Only ask questions whose answers materially improve the final site.
- Prefer broader questions that improve multiple sections at once.
- Respect unresolved, tentative, or TBD details as valid.
- Do not ask for details the couple likely has not finalized yet.
- Do not ask narrow logistics cleanup when a broader framing question would do.
- Avoid trivia, biography-mining, or questions that only improve one tiny line of copy.
- Ask at most one emotional/story question.
- Only ask a story question if the site is already operationally coherent enough that emotional texture is the real missing piece.
- If guest clarity and event structure overlap, prefer the single broader question instead of asking both.
- Questions should be concise, natural, easy to answer, and okay to answer partially.

Priority order:
1. guest clarity
2. event structure
3. emotional depth
4. decision clarity
5. location meaning

Strong question patterns:
- What should guests expect from the weekend overall?
- What events are actually happening across the weekend, even if rough?
- Is there anything guests might be confused about or need extra guidance on?
- What’s one thing that feels very “you two” that you’d want reflected on the site?
- Do you want to guide guests at all on gifts or keep it open?
- Why did you pick this location?

Weak question patterns:
- overly narrow event-by-event cleanup
- asking for details the couple likely has not decided yet
- repetitive story-mining
- low-value trivia
- overlapping questions that could have been combined

Return JSON with:
- shouldAskFollowUps: boolean
- questions: string[]
- whyTheseQuestions: string[]
```

---

## Concrete edits made

### 1. Tightened the live system prompt in code
Updated `src/lib/aiClarifyingQuestions.ts` to:
- emphasize smallest-number-of-questions behavior
- explicitly reject follow-ups driven only by missing fields
- strongly prefer 0 or 1 question
- gate story questions behind operational coherence
- reject overlapping guest/event coverage
- add strong vs weak pattern examples directly in the prompt

### 2. Tightened the local simulation heuristic
Updated `simulateClarifyingQuestionDecision()` to better reflect the intended direction:
- return 0 for mostly-ready / minor-gap cases
- prefer guest-clarity over event-clarity when both signals overlap
- keep registry/gifts as a secondary follow-up

### 3. Added prompt documentation for v3
Created `docs/ai-clarifying-question-prompt-v3.md` with:
- decision framework
- ask-0 / ask-1 / ask-2 / ask-3 guidance
- examples of good vs bad question patterns
- practical expectation that 0 or 1 is often correct

---

## Recommended next validation pass
Once external model testing is allowed again, verify three things first:
1. Strong-baseline couples really produce 0 questions more often.
2. Messy-weekend couples stop producing duplicated guest/event follow-ups.
3. Medium-complete couples more often produce 1 high-leverage question instead of 2–3 decent ones.

If those three get better, the prompt is moving in the right direction.

## Final judgment
v3 is better because it stops pretending every missing detail deserves a conversation.

That was the core bug.
The system needed stronger permission to leave good-enough intake alone and stronger discipline around asking only the one question that actually moves the site.