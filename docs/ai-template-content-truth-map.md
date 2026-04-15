# AI template/content truth map

## Goal
Make the post-AI data flow explicit so template switching and future multi-template rendering can be reasoned about cleanly.

## Current layered truth

### 1. Canonical intake truth
**Storage:** `wedding_sites.onboarding_answers`

**Role:**
- canonical structured wedding profile
- concierge / onboarding truth
- reusable source for AI generation

**Examples:**
- couple names
- event date/location
- story summary
- vibe / tone
- guest-experience preferences

---

### 2. Canonical content patch layer
**Storage:** `wedding_sites.wedding_data`

**Role:**
- canonical wedding content-ish layer derived from structured profile
- broad reusable content/data patch from AI + profile mapping
- template-agnostic-ish content source in principle

**Generated via:**
- `buildWeddingDataPatchFromProfile(...)`
- `mergeGeneratedDraftIntoWeddingData(...)`

**Risk:**
- not every AI-touched public section currently renders directly from this layer
- some live sections are builder-setting-owned instead

---

### 3. Canonical active-template render truth
**Storage:** `wedding_sites.site_json`

**Role:**
- canonical builder project
- canonical active-template section settings
- main public render truth for builder-owned sections

**Important shape:**
- `site_json.pages[].sections[].settings.*`

**Examples of AI-owned builder fields:**
- hero: `headline`, `subtitle`, `title`
- story: `title`, `storyText`
- registry: `title`, `message`
- FAQ/travel/accommodations/etc: section settings for active builder section instances

**Meaning:**
- this is the strongest current truth for what the live site actually says in the active template

---

## Current public rendering reality
Public rendering is intended to prefer canonical builder/public section settings from `site_json` for builder-owned sections.

So in practice:
- `onboarding_answers` = source profile truth
- `wedding_data` = canonical reusable content/data patch layer
- `site_json` = canonical active-template public copy/render truth

---

## What is already good
- AI does not just produce temporary text
- AI output is merged into durable site-owned state
- builder section settings are being used as canonical public section truth for many important sections
- overwrite protection / provenance exists for builder-owned content paths

---

## What is not fully solved yet
The system is **not yet a perfect universal content engine** where:
- one canonical section-content model
- maps automatically into every template variant
- with zero template-specific section ownership concerns

Current reality is closer to:
- one canonical structured profile
- one reusable wedding-data/content patch layer
- one canonical active builder project for the current template

That is good, but not yet perfect template-agnostic content abstraction.

---

## Best current mental model
### Template-agnostic truth
- `onboarding_answers`
- most of `wedding_data`

### Active-template truth
- `site_json.pages[].sections[].settings.*`

### Presentation truth
- per-template section variants / render components

---

## What a cleaner future state would be
For clean template switching, we ultimately want to separate:

### A. Canonical reusable content
Independent of template:
- story copy
- registry note
- FAQ intro
- travel intro
- RSVP CTA
- wedding party intro
- dress code note
- directions intro
- contact intro

### B. Template mapping layer
Maps canonical content into:
- template section ids
- template field names
- variant-specific layouts

### C. Template presentation layer
Purely visual / structural:
- section order
- variant choice
- styling
- layout behavior

---

## Current gap
Right now, some content is still effectively owned by active builder section settings rather than a fully abstract canonical section-content model.

That means:
- current active template is well supported
- template switching is directionally supported
- fully universal auto-population across all templates is not yet guaranteed cleanly

---

## Practical takeaway
If we want perfect template switching later, the next architecture pass should define:

1. canonical AI content fields by section
2. builder-field mapping per template/variant
3. what must live in `wedding_data` vs `site_json`
4. which fields are content vs presentation

That is the missing line between:
- **works for active template well**
- and
- **universal generate-once, use-everywhere content model**
