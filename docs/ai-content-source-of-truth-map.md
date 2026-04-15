# AI content source-of-truth map

## Purpose
Pin down exactly where AI-generated content is written, what should be treated as canonical, and where public rendering still has fallback/split-brain risk.

## Canonical write path (current)

### 1. Concierge intake state
- **Source:** `wedding_sites.onboarding_answers`
- **Written by:** `src/pages/Onboarding.tsx`
- **Role:** canonical structured profile / concierge brief
- **Why it matters:** this is the durable AI intake artifact and the source for draft regeneration

### 2. Generated draft artifact
- **Source:** `generateDraftFromWeddingProfile(...)`
- **Code:** `src/lib/aiDraftGenerator.ts`
- **Role:** transient derived AI draft object
- **Canonical?** no — derived, not stored alone as truth

### 3. Durable merged wedding data
- **Source:** `wedding_sites.wedding_data`
- **Written by:** refresh flow in `src/pages/dashboard/Overview.tsx`
- **Role:** durable non-builder content + metadata container
- **Important field:** `wedding_data.meta.aiDraft`
- **Canonical?** partially; useful durable mirror, but not the primary text truth for builder-owned homepage sections

### 4. Builder-owned homepage content
- **Source:** `wedding_sites.site_json`
- **Written by:** refresh flow in `src/pages/dashboard/Overview.tsx`
- **Patch helper:** `src/lib/aiBuilderProjectPatch.ts`
- **Role:** canonical builder project and canonical source for builder-managed public section copy
- **Canonical?** yes, for builder-managed sections like hero/story/footer-cta

## Public render path (current intended truth)

### Builder sections
- **Entry:** `src/pages/SiteView.tsx`
- **Current intended source:** `site_json`
- **Important guardrails already added:**
  - prefer canonical `site_json`
  - prefer builder sections over persisted DB sections when builder pages exist
  - normalize unsupported saved variants on public render

### Public section components with provenance-safe reads
- **Hero:** `src/sections/components/HeroSection.tsx`
- **Story:** `src/sections/components/StorySection.tsx`
- **Footer CTA:** `src/sections/components/FooterCtaSection.tsx`
- **Pattern:** `readBuilderValue(...)`
- **Why it matters:** allows `{ value, source }` envelopes to render correctly instead of silently falling back

## Current canonical ownership by AI-touched section

### Hero
- **Canonical render source:** `site_json.pages[].sections[].settings.headline/subtitle/title`
- **AI write path:** `aiBuilderProjectPatch.ts`
- **Manual edit ownership:** `source: user-edited`
- **Status:** proven end-to-end

### Story
- **Canonical render source:** `site_json.pages[].sections[].settings.storyText/title`
- **AI write path:** `aiBuilderProjectPatch.ts`
- **Manual edit ownership:** `source: user-edited`
- **Status:** proven end-to-end

### Footer CTA
- **Canonical render source:** `site_json.pages[].sections[].settings.headline/subtext/buttonLabel/rsvpUrl/footerNote`
- **AI write path:** `aiBuilderProjectPatch.ts`
- **Manual edit ownership:** `source: user-edited`
- **Status:** proven end-to-end after using stable section-rail selection + back-to-sections flow in builder runtime

## Still non-canonical / fallback-heavy surfaces

### wedding_data-derived text fallbacks
- Many sections still fall back to `wedding_data` / `couple` / `event` values when builder settings are absent
- This is acceptable as a fallback, but those sections should not silently override explicit builder-owned AI text

### legacy / alternate section renderer paths
- `SectionRenderer` and registry-driven parsing still require care because parsed/schema paths can drift from legacy component reads
- This is the biggest remaining split-brain risk class even after recent fixes

### itinerary / relational event surfaces
- Venue/schedule content can also come from relational tables like `itinerary_events`
- These are not builder-owned AI copy paths and should be treated separately from builder-managed homepage text

## Practical rule going forward

For AI-generated homepage copy:

- `onboarding_answers` = canonical structured intake truth
- `generateDraftFromWeddingProfile(...)` = derived draft object
- `wedding_data.meta.aiDraft` = durable metadata mirror
- `site_json.pages[].sections[].settings.*` = canonical public render truth for builder-owned sections

## Remaining risks to kill later
1. Any public component still reading wrapped builder values as plain strings
2. Any parsed/schema renderer path that can override explicit builder settings with fallback data
3. Any unsupported saved variant that falls into the wrong renderer path
4. Any AI refresh path writing meaningful homepage copy somewhere other than canonical builder section settings
