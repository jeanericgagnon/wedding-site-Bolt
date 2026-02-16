# Template Architecture

This document describes the template system architecture implemented in the wedding site application.

## Overview

The template system provides a flexible, data-driven approach to generating and managing wedding sites. It separates **canonical content** from **presentation layer**, enabling template switching while preserving user data.

## Core Concepts

### 1. Canonical Data (`WeddingDataV1`)

Located in `src/types/weddingData.ts`, this is the single source of truth for wedding content:

- **Couple Info**: Partner names, story, display name
- **Event Details**: Wedding date, timezone
- **Venues**: Array of venue objects with names, addresses, coordinates
- **Schedule**: Timeline items with start/end times and venue references
- **RSVP**: Settings and deadline
- **Registry**: Gift registry links
- **FAQ**: Questions and answers
- **Theme**: Color scheme and tokens
- **Media**: Hero image and gallery photos
- **Metadata**: Creation and update timestamps

This data is **template-agnostic** - the same wedding data works with any template.

### 2. Layout Configuration (`LayoutConfigV1`)

Located in `src/types/layoutConfig.ts`, this defines how content is presented:

- **Template ID**: Which template is active
- **Pages**: Array of pages (currently just "home")
- **Sections**: Ordered array of section instances with:
  - **Type**: hero, story, venue, schedule, etc.
  - **Variant**: "default" or future variants like "split", "cards"
  - **Enabled**: Show/hide toggle
  - **Bindings**: Which data items to display (e.g., which venues, schedule items)
  - **Settings**: Title overrides, display options
  - **Metadata**: Timestamps

This layer is **regenerable** - you can switch templates and get a new layout while keeping all your wedding data.

### 3. Template Registry

Located in `src/templates/registry.ts`, defines available templates:

- **Base**: Traditional layout with all sections
- **Modern**: Gallery-first contemporary design
- **Editorial**: Story-focused with elegant typography

Each template defines:
- Default section order
- Default theme preset
- Default section variants
- Initial bindings and settings

### 4. Section Registry

Located in `src/sections/sectionRegistry.tsx`, maps section types to React components:

- **Hero**: Welcome banner
- **Story**: Couple's story
- **Venue**: Location details
- **Schedule**: Timeline of events
- **Travel**: Accommodation info
- **Registry**: Gift links
- **RSVP**: Response form
- **FAQ**: Questions and answers
- **Gallery**: Photo gallery

Each section component receives:
- `data`: Full `WeddingDataV1` object
- `instance`: Section configuration with bindings

## Database Schema

Columns in `wedding_sites` table:

- `wedding_data` (jsonb): Complete WeddingDataV1 object
- `layout_config` (jsonb): Complete LayoutConfigV1 object
- `active_template_id` (text): Current template
- `site_slug` (text, unique): Public URL identifier
- Legacy columns preserved for backward compatibility

## Data Flow

```
Onboarding → Generate Wedding Data → Generate Layout → Database
                                                           ↓
                                                   Builder (Edit)
                                                     ↓         ↓
                                            Edit Data    Edit Layout
                                                     ↓         ↓
                                                    Database
                                                       ↓
                                              Site Renderer → Public Site
```

### Onboarding Flow

1. User completes Quick Start or Guided Setup
2. `fromOnboarding()` creates WeddingDataV1 from form inputs
3. `generateInitialLayout()` creates LayoutConfigV1 from template defaults
4. Both saved to database with site_slug
5. User redirected to dashboard

### Builder Flow (Two Modes)

**Guided Mode:**
- Edit canonical wedding data directly
- Forms for couple info, dates, story, etc.
- Updates saved to `wedding_data`

**Canvas Mode:**
- Drag/drop to reorder sections
- Toggle section visibility
- Change section variants
- Updates saved to `layout_config`

### Template Switching

Located in Settings → Site Settings:

1. User selects new template
2. `regenerateLayout()` creates new LayoutConfigV1 using:
   - New template's defaults
   - Existing wedding_data
   - Preserved customizations (enabled state, order)
3. Saves new layout_config and active_template_id

**Key Feature**: Wedding content is never lost during template changes.

### Public Site Rendering

1. Request `/site/:slug`
2. Load `wedding_data` and `layout_config` by slug
3. Validate versions
4. Render enabled sections in order using section registry
5. Each section component reads from wedding_data using bindings

## Helper Functions

### Data Generation

- `fromOnboarding()` (`src/lib/generateWeddingData.ts`)
  - Converts form inputs to WeddingDataV1
  - Creates venue and schedule objects
  - Generates FAQs and registry links

- `generateInitialLayout()` (`src/lib/generateInitialLayout.ts`)
  - Creates LayoutConfigV1 from template definition
  - Sets up bindings to wedding data IDs
  - Assigns default variants and settings

- `regenerateLayout()` (`src/lib/generateInitialLayout.ts`)
  - Preserves user customizations during template switch
  - Maps sections by type to maintain order
  - Keeps enabled state and settings

### URL Generation

- `generateWeddingSlug()` (`src/lib/slugify.ts`)
  - Creates URL-safe slug from couple names
  - Format: "partner1-and-partner2"
  - Fallback to timestamp if names invalid

## Configuration

### Pricing

Unified at **$49 one-time** in `src/config/pricing.ts`

### Demo Mode

Located in `src/config/env.ts`:

- `DEMO_MODE`: Enable/disable demo functionality
- `SUPABASE_CONFIGURED`: Check if Supabase is set up

Demo credentials only work when `VITE_DEMO_MODE=true` in environment.

## Adding New Templates

To add a template:

1. Add to `TEMPLATE_REGISTRY` in `src/templates/registry.ts`:
   ```typescript
   const newTemplate: TemplateDefinition = {
     id: 'my-template',
     name: 'My Template',
     description: 'A beautiful new layout',
     defaultThemePreset: 'elegant',
     defaultLayout: {
       sections: [/* section configs */]
     }
   };
   ```

2. Define section order and variants
3. No data model changes needed
4. Users can switch to it in Settings

## Adding New Sections

To add a section type:

1. Add type to `SectionType` in `src/types/layoutConfig.ts`
2. Create component in `src/sections/components/`
3. Register in `SECTION_REGISTRY` in `src/sections/sectionRegistry.tsx`
4. Add to template default layouts

## Future Enhancements

Supported by architecture:

- Section variants (e.g., hero layouts: "centered", "split", "full-image")
- Rich text editor for story and FAQ
- Photo uploads and galleries
- Custom CSS per section
- A/B testing of variants
- Template preview before switching
- Export/import wedding data
- Collaboration features
