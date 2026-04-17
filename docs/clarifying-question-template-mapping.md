# Clarifying Question Template Mapping

Goal:
Turn `draftOutputs` from the clarifying AI contract into template-seed fields the site can actually use.

## Current template-seed targets
- `heroSubtitle`
- `scheduleIntro`
- `scheduleSummary`
- `faqGuidance[]`
- `travelIntro`
- `storyIntro`
- `dressCode`
- `childrenPolicy`
- `lodgingGuidance`
- `transportGuidance`
- `siteToneSummary`

## Mapping principle
`mode = draft` should give us structured, reusable content that can be mapped into template-friendly seed fields.

This is not yet the full final render layer.
It is the bridge between:
- AI draft outputs
- canonical onboarding/clarifying truth
- template population

## Why this matters
Without this bridge, `draftOutputs` are still just structured data.
With this bridge, they become immediately usable inputs for:
- hero
- schedule
- FAQ
- travel
- story
- guest guidance
- site tone
