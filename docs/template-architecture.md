# Template Architecture

This document describes the template system architecture implemented in the wedding site application.

## Overview

The template system provides a flexible, data-driven approach to generating and managing wedding sites. It separates content from presentation, making it easy to add new templates in the future.

## Core Concepts

### 1. SiteConfig Schema (`src/types/siteConfig.ts`)

The `SiteConfig` is the single source of truth for all wedding site data. It includes:

- **Version**: Schema version for future migrations
- **Template ID**: Which template to use for rendering
- **Couple Data**: Partner names and display name
- **Event Data**: Wedding date and timezone
- **Locations**: Venue information with optional coordinates
- **RSVP Settings**: Deadline and enabled status
- **Sections**: Ordered array of page sections with enable/disable flags
- **Content**: Structured content for each section (hero, details, schedule, etc.)
- **Theme**: Color scheme and design tokens
- **Metadata**: Creation and update timestamps

### 2. Template Registry (`src/templates/registry.ts`)

A registry of available templates. Currently contains:

- **base**: Default template with standard sections
  - Defines default section order
  - Sets default theme
  - Future templates can be added here

### 3. Site Generator (`src/lib/siteGenerator.ts`)

Converts onboarding form data into a complete `SiteConfig` object:

- Maps user inputs to structured content
- Generates placeholders for missing data
- Creates section configurations based on template
- Ensures consistent data shape across all couples

### 4. Database Schema

New columns in `wedding_sites` table:

- `template_id` (text): Template identifier (default: "base")
- `site_json` (jsonb): Complete SiteConfig object
- `site_slug` (text, unique): URL-friendly identifier for public site
- Auto-generates slugs from couple names + unique ID

## Data Flow

```
Onboarding Forms → Site Generator → SiteConfig → Database
                                                      ↓
                                              Builder (Edit)
                                                      ↓
                                              Site Renderer → Public Site
```

### Onboarding Flow

1. User completes Quick Start or Guided Setup
2. `generateSiteConfig()` creates SiteConfig from form data
3. SiteConfig saved to database as `site_json`
4. User redirected to dashboard

### Builder Flow

1. Load `site_json` from database
2. Display sections with toggle/reorder controls
3. User modifies section visibility or order
4. Save updated `site_json` back to database

### Public Site Flow

1. Request `/site/:slug`
2. Load `site_json` by slug
3. Validate config with `validateSiteConfig()`
4. Render sections dynamically based on config
5. Only enabled sections are displayed in specified order

## Section Components

Each section type has a dedicated component in `src/components/site/sections/`:

- **HeroSection**: Welcome banner with couple name and date
- **DetailsSection**: Venue, time, and attire info
- **ScheduleSection**: Timeline of events
- **TravelSection**: Hotels, parking, transportation
- **RegistrySection**: Gift registry links
- **FaqSection**: Common questions and answers
- **RsvpSection**: RSVP call-to-action
- **GallerySection**: Photo gallery (placeholder for now)

All sections receive their content from the `SiteConfig.content` object via the `props_key` field.

## Adding New Templates (Future)

To add a new template:

1. Add entry to `TEMPLATE_REGISTRY` in `src/templates/registry.ts`
2. Define section order and default theme
3. Optionally create variant section components
4. Template picker UI can switch between templates

No changes to data model required - all templates use the same `SiteConfig` structure.

## Pricing

Unified pricing: **$49 one-time**
- Configured in `src/config/pricing.ts`
- All references updated throughout the app

## Future Enhancements

The architecture supports:

- Content editor for each section
- Template switcher in builder
- Custom color themes
- Photo uploads for gallery
- Section variants (e.g., different hero layouts)
- Template marketplace
- Custom CSS overrides
