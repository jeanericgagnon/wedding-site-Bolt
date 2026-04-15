# AI canonical section content model

## Goal
Define a template-agnostic AI content layer so generated section copy can be reused across templates instead of living only as active-template builder settings.

## Principle
Separate:
1. **content** — what the couple/site is saying
2. **mapping** — how a template/variant consumes that content
3. **presentation** — the visual/layout layer

---

## Proposed canonical AI content fields

### Hero
- `hero.title`
- `hero.subtitle`
- `hero.eventHeadline`

### Story
- `story.title`
- `story.body`

### Countdown
- `countdown.title`
- `countdown.message`

### Venue / details
- `venue.title`
- `venue.intro`

### Schedule
- `schedule.title`
- `schedule.intro`

### Gallery
- `gallery.title`
- `gallery.intro`

### RSVP
- `rsvp.title`
- `rsvp.intro`
- `rsvp.callToAction`

### Registry
- `registry.title`
- `registry.intro`

### FAQ
- `faq.title`
- `faq.intro`

### Travel
- `travel.title`
- `travel.intro`

### Accommodations
- `accommodations.title`
- `accommodations.intro`

### Wedding party
- `weddingParty.title`
- `weddingParty.intro`

### Dress code
- `dressCode.title`
- `dressCode.intro`

### Directions
- `directions.title`
- `directions.intro`

### Contact
- `contact.title`
- `contact.intro`

### Footer CTA
- `footerCta.headline`
- `footerCta.subtext`

---

## What should NOT live here
These are not canonical content fields; they are data or presentation:

### Data-layer facts
- event date
- venue address
- RSVP deadline
- registry URLs
- FAQ items
- travel logistics rows
- hotel lists
- contacts

These belong in canonical structured data, not AI copy fields.

### Presentation-layer choices
- section order
- template id
- variant id
- eyebrow visibility
- colors
- layout spacing
- media placement
- card/list/grid style

These belong in template/builder presentation config.

---

## Mapping layer concept
Each template/variant should map from canonical AI content into builder fields.

## Example mappings

### Registry section
Canonical:
- `registry.title`
- `registry.intro`

Builder mapping:
- `settings.title <- registry.title`
- `settings.message <- registry.intro`

### FAQ section
Canonical:
- `faq.title`
- `faq.intro`

Builder mapping:
- `settings.headline <- faq.title`
- `settings.subheadline <- faq.intro`

### Travel section
Canonical:
- `travel.title`
- `travel.intro`

Builder mapping:
- `settings.headline <- travel.title`
- `settings.intro <- travel.intro`

### Wedding party section
Canonical:
- `weddingParty.title`
- `weddingParty.intro`

Builder mapping:
- `settings.headline <- weddingParty.title`
- `settings.subheadline <- weddingParty.intro`

---

## Current mismatch/problem
Today, much of this content is effectively stored directly in active-template builder settings.

That works for the current template, but it means:
- content ownership is partly template-specific
- switching templates may require patch/remap logic
- some section fields are not yet clearly canonical outside builder state

---

## Better future write flow
1. save/update canonical structured profile (`onboarding_answers`)
2. generate canonical AI section content model
3. persist canonical AI section content model in reusable site-owned data
4. map canonical AI content into active template builder fields
5. render public site from mapped builder/project truth

---

## Storage options for canonical AI section content

### Option A — inside `wedding_data`
Pros:
- keeps reusable content near reusable site data
- simpler persistence model

Cons:
- can blur factual data vs generated copy unless namespaced carefully

### Option B — dedicated `ai_content` object inside `site_json` or row JSON
Pros:
- very explicit ownership
- easy to separate generated reusable copy from factual data and presentation

Cons:
- adds another truth container

### Recommended shape
Use a dedicated namespaced object, e.g.
- `wedding_data.aiContent`
or
- `site_json.meta.aiContent`

Best rule:
- factual canonical data stays separate from generated reusable copy

---

## Best next implementation path
### Phase 1
Define canonical AI content TS types.

### Phase 2
Generate AI output into canonical AI content fields first.

### Phase 3
Add explicit section mappers:
- canonical AI content -> builder section settings

### Phase 4
Use those mappers whenever:
- refreshing AI draft
- switching templates
- creating new builder projects from profile

---

## Definition of done
This layer is done when:
- AI-generated section copy exists in a template-agnostic canonical shape
- builder sections derive from it through explicit mappers
- template switching no longer depends on active-template-only text ownership
- content can be reused across templates without regeneration
