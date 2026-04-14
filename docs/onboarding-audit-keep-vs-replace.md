# Onboarding audit — keep vs replace

## Goal
Evaluate the current onboarding flow and define what should be preserved versus replaced as we move toward an AI-guided concierge onboarding system.

## Source audited
- `src/pages/Onboarding.tsx`

---

## What exists today
Current onboarding provides three starting options:
- Quick Setup
- One-click starter
- Manual Setup

Current structured fields captured:
- partner names
- wedding date
- venue name
- venue location
- story
- ceremony time
- reception time
- RSVP deadline
- registry link
- theme

Current behaviors:
- setup checklist
- step-based guided setup
- one-click starter creates a wedding site fast
- manual path jumps to builder/dashboard
- quick setup eventually creates a wedding site and completes onboarding

---

## What to keep

### 1. Structured setup fields
Keep the underlying structured fields and evolve them into a canonical wedding profile.
These fields are already useful and align with the concierge direction.

Keep:
- partner names
- wedding date
- venue name
- venue location
- story
- ceremony time
- reception time
- RSVP deadline
- registry link
- theme

### 2. Existing site creation plumbing
Keep the wedding site creation behavior and reuse it.
We should not reinvent site creation if the existing flow already inserts a site record correctly.

### 3. Setup checklist concept
Keep the idea of visible progress / setup milestones.
This is useful as a quiet progress mechanism behind the conversational experience.

### 4. One-click starter idea
Keep the concept of a fast-start path.
This should evolve into “we have enough to draft” rather than a blunt starter button, but the underlying principle is correct.

### 5. Builder handoff
Keep the idea that onboarding eventually hands off to the builder/editor.
That handoff is still the right product shape.

---

## What to replace

### 1. Rigid stepper structure
Replace the fixed `quick-1 / quick-2 / quick-3` step system.
It is too form-like and too static for the concierge direction.

### 2. Generic setup framing
Replace the current “choose quick setup vs manual setup” framing with a more premium guided entry.
The current flow feels more like software setup than wedding concierge.

### 3. Static question order
Replace the hardcoded form progression with orchestration that asks only the next best question.

### 4. Weak output moments
Replace the current delayed-value model.
The new flow should produce visible results earlier:
- draft homepage direction
- style/template recommendations
- starter sections

### 5. Form-first interaction model
Replace the multi-field form feel with a conversation-led shell that still writes structured data underneath.

---

## What to evolve rather than fully replace

### 1. Quick setup
Current quick setup should evolve into:
- concierge-guided intake
- one high-value question at a time
- visible draft generation once enough is known

### 2. One-click starter
Current one-click starter should evolve into:
- auto-draft when minimum required fields are met
- not a blind shortcut, but a confident “we can build this now” state

### 3. Manual setup path
Manual setup can remain as an escape hatch, but it should be secondary.
The primary product should be the concierge path.

---

## Gaps relative to the concierge vision
Current onboarding is missing:
- dynamic branching
- template recommendation based on profile
- generated draft content
- progressive enrichment
- collaborator/team invitation in flow
- calm messaging-style UI
- strong “holy shit this is fast” moment

---

## Risks in current onboarding if left as-is
- feels like generic software setup
- too much form energy
- insufficient wow factor
- too little visible progress too late
- weak differentiation versus basic site builders

---

## Recommended next move
Now that the audit is clear, the next micro-batch should be:

### Next step
**A2 — create the new message-style onboarding shell structure while keeping the existing structured data fields underneath.**

That means:
- keep current field model temporarily
- replace the visual shell / interaction model first
- avoid rewriting data plumbing and UI shell at the same time

---

## Summary
### Keep
- structured data fields
- site creation plumbing
- checklist/progress concept
- fast-start principle
- builder handoff

### Replace
- rigid stepper
- generic setup framing
- static question order
- delayed output
- form-first experience

### Evolve
- quick setup -> concierge intake
- one-click starter -> enough-to-draft trigger
- manual setup -> secondary fallback path
