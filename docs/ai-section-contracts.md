# AI section contracts

## Purpose
Define how AI should behave for each section:
- what inputs are needed
- what AI may generate
- when the section should be skipped
- what the canonical write path is

Core rule:
**skip is a valid output** when the section lacks enough signal.

---

## Status vocabulary
- **fill** = generate meaningful copy now
- **light-fill** = generate only a short intro/title safely
- **skip** = do not generate section copy yet

---

## Core homepage sections

### Hero
- Inputs:
  - couple names
  - date (recommended)
  - venue/location (recommended)
- AI may generate:
  - title
  - subtitle
- Minimum threshold:
  - names only for basic fill
- If sparse:
  - fill
- Canonical write path:
  - `site_json.pages[].sections[].settings.headline`
  - `site_json.pages[].sections[].settings.subtitle`

### Story
- Inputs:
  - story summary or enough emotional context
- AI may generate:
  - story title
  - story paragraph
- Minimum threshold:
  - names + emotional context
- If sparse:
  - light-fill or skip depending on lack of story signal
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.storyText`

### Countdown
- Inputs:
  - date
  - optional location
- AI may generate:
  - title
  - message
- Minimum threshold:
  - date
- If sparse:
  - skip message or light-fill only
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.message`

### Venue
- Inputs:
  - venue name and/or location
- AI may generate:
  - title
  - intro/subtitle
- Minimum threshold:
  - venue name or location
- If sparse:
  - skip intro, maybe keep title only
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.subtitle`

### Schedule
- Inputs:
  - ceremony time, reception time, or itinerary details
- AI may generate:
  - title
  - intro/subtitle
- Minimum threshold:
  - at least one event-time signal
- If sparse:
  - title only or skip intro
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.subtitle`

### Gallery
- Inputs:
  - couple vibe / emotional context
  - optional real media presence
- AI may generate:
  - title
  - intro/subtitle
- Minimum threshold:
  - emotional context only is enough for light-fill
- If sparse:
  - title only
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.subtitle`

### RSVP
- Inputs:
  - RSVP section enabled
  - optional deadline
- AI may generate:
  - title
  - intro/subtitle
  - CTA line (via footer/RSVP push)
- Minimum threshold:
  - section exists
- If sparse:
  - light-fill
- Canonical write path:
  - `site_json.pages[].sections[].settings.title`
  - `site_json.pages[].sections[].settings.subtitle`

### Footer / RSVP Push
- Inputs:
  - RSVP state
  - event framing
- AI may generate:
  - headline
  - supporting line
- Minimum threshold:
  - section exists
- If sparse:
  - fill with restrained CTA
- Canonical write path:
  - `site_json.pages[].sections[].settings.headline`
  - `site_json.pages[].sections[].settings.subtext`

---

## Guest-helpful secondary sections

### Travel / accommodations
- Inputs:
  - travel support level
  - destination context
  - hotel/block info if available
- AI may generate:
  - short intro only
- Minimum threshold:
  - destination/travel context
- If sparse:
  - skip
- Canonical write path:
  - section intro/subtitle field where applicable

### FAQ
- Inputs:
  - FAQ tone
  - at least some actual FAQ entries
- AI may generate:
  - section intro only
- Minimum threshold:
  - real FAQ entries exist
- If sparse:
  - skip
- Canonical write path:
  - section intro/subtitle field where applicable

### Registry
- Inputs:
  - registry status or link
- AI may generate:
  - short gratitude / framing intro
- Minimum threshold:
  - registry exists
- If sparse:
  - skip
- Canonical write path:
  - section intro/subtitle field where applicable

### Wedding party / people
- Inputs:
  - real people entries exist
- AI may generate:
  - short intro
- Minimum threshold:
  - people section populated
- If sparse:
  - skip
- Canonical write path:
  - section intro/subtitle field where applicable

### Post-wedding / memories / thank-you
- Inputs:
  - post-wedding mode or gallery/archive context
- AI may generate:
  - thank-you / memories intro
- Minimum threshold:
  - post-wedding section exists and is active
- If sparse:
  - skip
- Canonical write path:
  - section intro/subtitle field where applicable

---

## Product rule going forward
For any section not backed by enough signal:
- prefer **skip** over fake filler
- prefer **light-fill** over generic mush
- only full-fill when enough context exists

That is the rule that keeps the AI from making the site feel fake.
