# AI Onboarding Orchestration Spec

## Purpose
Turn the current onboarding experience from a rigid guided setup into a high-trust conversational concierge that gets couples to a strong first draft fast, without feeling gimmicky.

This spec is intentionally **not** a full scripted conversation tree. It defines the rails, goals, actions, data requirements, and handoff logic so the AI can steer intelligently.

---

## Product promise
**Tell us about your wedding and we’ll turn it into a polished wedding website fast.**

The experience should feel like:
- a smart wedding producer
- a tasteful concierge
- fast and confident
- opinionated, but not pushy
- calm, not gimmicky

It should not feel like:
- a novelty chatbot
- a long intake form in disguise
- “AI magic” theater
- generic software setup

---

## What exists today
Current onboarding lives in:
- `src/pages/Onboarding.tsx`

Current structured intake already captures:
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

Current onboarding modes:
- quick setup
- one-click starter
- manual setup

Current flow already does:
- create wedding site record
- hand off to dashboard/builder
- checklist-style setup framing

### Keep from current system
- site creation plumbing
- structured data capture pattern
- setup checklist concept
- builder handoff concept

### Replace / evolve
- rigid 3-step quick setup
- static input-first flow
- generic onboarding feel
- weak template/starter recommendation logic

---

## Core orchestration model
The onboarding system should operate as:

### Layer 1 — Conversational intake
Collect only the most important next information.

### Layer 2 — Structured wedding profile
Persist everything into a canonical profile model.

### Layer 3 — Draft generation + recommendations
Use what we know to generate:
- homepage draft
- section defaults
- schedule starter
- RSVP starter
- design direction
- template shortlist

### Layer 4 — Visual handoff
Send the user into a strong prefilled builder/editor state.

---

## AI orchestration goals
The AI should optimize for:
1. reducing overwhelm
2. asking fewer questions
3. getting to visible value fast
4. saving structured data cleanly
5. knowing when enough info exists to draft
6. only going deeper when the user is willing / the data matters
7. handing off before conversation becomes tedious

---

## Required information for first draft
The system should try to collect these minimum fields before generating a strong first draft:

### Required core fields
- partner names
- wedding date (or at least month/season if date unknown)
- city / location
- overall vibe / style direction

### Strongly helpful fields
- venue name (if known)
- whether they have photos already
- whether they want RSVP online
- whether they want a planner/team invited

### Optional for first draft
- story
- registry
- travel details
- accommodations
- dress code
- weekend schedule

The AI should not block on optional data if it can already produce a strong first draft.

---

## Optional enrichment areas
These can be asked only when relevant or after a first draft exists:
- story/about us
- weekend events
- travel/accommodations
- registry
- RSVP nuance (meal choices, shuttle, plus-ones, kids)
- dress code
- local recommendations
- FAQ
- planner/team access
- photo uploads

---

## AI actions
The concierge must be able to do more than talk.

### Data actions
- save wedding basics
- save couple identity details
- save event location/date details
- save content snippets
- save theme/style preferences
- save RSVP preferences
- save collaborator/team choices

### Generation actions
- generate homepage hero copy
- generate short story/about-us copy
- generate schedule starter copy
- generate travel section starter copy
- generate FAQ starter content
- generate RSVP helper copy

### Recommendation actions
- recommend best-fit templates
- recommend section layout based on profile
- recommend next missing info to collect
- recommend whether to invite planner/coordinator now

### Builder actions
- create draft site structure
- prefill site sections
- set style/theme defaults
- hand off to builder/editor with state already filled

### Team actions
- invite planner/coordinator/viewer
- assign permissions via natural language or structured presets

---

## Stop / generate conditions
This is critical.

The AI should stop asking and generate a first meaningful draft when it has:
- partner names
- wedding date or rough date signal
- location signal
- style/vibe signal

Once that threshold is met, the AI should:
1. show 2–4 tailored site directions
2. preview a draft homepage direction
3. optionally ask one or two high-value follow-ups
4. let the user pick a direction and continue

Do not force long intake before generating value.

---

## Visible progress moments
The user should see concrete progress early and often.

### Progress moment 1
After basics:
- “We’ve got enough to start your site.”
- show names/date/location/vibe summary
- recommend site directions

### Progress moment 2
After style + a little content:
- show prefilled hero and visual directions
- recommend templates

### Progress moment 3
After logistics:
- schedule/travel/RSVP sections take shape

### Progress moment 4
After assets/team:
- photos placed
- planner/team added
- site is ready for refinement

---

## Voice and tone rules
The concierge voice should be:
- calm
- stylish
- competent
- warm
- concise
- opinionated when useful

Avoid:
- fake excitement
- over-apologizing
- robotic neutral phrasing
- chatbot cliches
- “I’m your AI assistant” nonsense

### Good example tone
- “Got it — modern and romantic. I’d start with a cleaner editorial layout.”
- “You probably don’t need to overbuild travel if most guests are local.”
- “We have enough to draft a strong first version now.”

---

## Design principles to avoid gimmick feel
- no flashy AI chrome
- no fake typing theatrics
- no over-branded chatbot visuals
- no giant survey form disguise
- no unnecessary options explosion
- visible progress > long conversation
- recommendation confidence > generic neutrality

The interface should feel like a premium guided setup, not a bot novelty.

---

## Recommended user journey

### Stage 1 — Start
Prompt:
- “Let’s build your wedding website.”
- gather names/date/location/vibe quickly

### Stage 2 — Draft quickly
Generate:
- homepage direction
- 2–4 tailored templates/themes
- initial section structure

### Stage 3 — Fill the meaningful gaps
Ask only high-value next questions based on what’s missing.

### Stage 4 — Team & logistics
Offer:
- RSVP setup
- schedule refinement
- planner/team invite
- media/photo upload

### Stage 5 — Handoff
Open the builder/editor with a strong, prefilled draft.

---

## MVP scope recommendation

### MVP should include
- conversational intake for core basics
- structured wedding profile persistence
- template/style recommendation
- homepage + site draft generation
- handoff to builder

### MVP should not try to include everything
Defer if needed:
- full planner/team invite in conversation
- deep media auto-placement
- advanced multilingual support
- deep itinerary logic
- all edge-case RSVP logic

---

## System data model direction
The AI should write into a canonical onboarding / wedding profile layer with fields for:

### Identity
- couple names
- display names
- pronouns if relevant

### Event basics
- wedding date
- venue name
- venue location
- city/region
- ceremony/reception times
- RSVP deadline

### Style
- vibe keywords
- theme preference
- formality
- aesthetic direction
- photo availability

### Content
- story/about us
- welcome message
- FAQ items
- dress code
- travel notes
- registry links
- local recommendations

### Operations
- RSVP settings
- guest communication preferences
- collaborator/team setup

### Assets
- photos
- logos/monograms if any
- branding accents if any

---

## Builder handoff requirements
The AI onboarding is not complete until it hands off cleanly to the builder.

The builder handoff should include:
- selected template or shortlist choice
- generated homepage content
- prefilled section content
- theme/style selection
- event basics already populated
- obvious next actions in editor

The user should never feel like they answered everything only to land in a blank builder.

---

## Recommended first implementation plan

### Phase 1
Convert current onboarding from rigid stepper into orchestrated intake shell.

### Phase 2
Create canonical wedding profile object / persistence layer.

### Phase 3
Add generation layer for:
- homepage
- section defaults
- template recommendations

### Phase 4
Add polished handoff into builder.

### Phase 5
Expand into planner/team invitation and deeper enrichment.

---

## Key success criteria
This AI onboarding is working if:
- users reach a meaningful draft in minutes
- they feel helped, not surveyed
- the site looks surprisingly good fast
- they can still edit visually afterward
- the experience feels premium, not gimmicky
- marketing can honestly say: “this is way faster and smarter than a normal wedding builder”

---

## Short version
We are not designing a chatbot.
We are designing:

**conversation → structured profile → generated draft → builder handoff**

That is the system to build.
