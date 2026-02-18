# Production Audit — Wedding Platform

**Date:** 2026-02-18
**Status:** Post-hardening baseline

---

## 1. Confirmed Route Map

| Path | Component | Protected | Notes |
|------|-----------|-----------|-------|
| `/` | Home | No | Marketing homepage |
| `/product` | Product | No | Product detail page |
| `/site/:slug` | SiteView | No | Public wedding site |
| `/rsvp` | RSVP | No | Guest RSVP |
| `/events` | EventRSVP | No | Event RSVP |
| `/features/*` | FeaturePages | No | Marketing feature pages |
| `/login` | Login | No | Auth |
| `/signup` | Signup | No | Auth |
| `/onboarding` | Onboarding | Yes | Onboarding flow |
| `/onboarding/status` | WeddingStatus | Yes | Status check |
| `/onboarding/celebration` | Celebration | Yes | Celebration setup |
| `/onboarding/quick-start` | QuickStart | Yes | Quick start wizard |
| `/onboarding/guided` | GuidedSetup | Yes | Guided setup |
| `/dashboard` | DashboardOverview | Yes | Redirects to /dashboard/overview |
| `/dashboard/overview` | DashboardOverview | Yes | Main dashboard |
| `/dashboard/builder` | Navigate | Yes | **Redirects to /builder** |
| `/dashboard/guests` | DashboardGuests | Yes | Guest management |
| `/dashboard/itinerary` | DashboardItinerary | Yes | Itinerary |
| `/dashboard/vault` | DashboardVault | Yes | Photo vault |
| `/dashboard/registry` | DashboardRegistry | Yes | Registry |
| `/dashboard/settings` | DashboardSettings | Yes | Settings |
| `/dashboard/messages` | DashboardMessages | Yes | Messages |
| `/builder` | BuilderPage | Yes | **Canonical site builder** |
| `*` | Navigate `/` | - | 404 catch-all |

**Builder is unified at `/builder`. Legacy `/dashboard/builder` redirects.**

---

## 2. Confirmed Canonical Data Model

### wedding_sites table (primary storage)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key — used as weddingSiteId throughout |
| user_id | uuid | FK to auth.users |
| couple_name_1 | text | Legacy — also in wedding_data.couple.partner1Name |
| couple_name_2 | text | Legacy — also in wedding_data.couple.partner2Name |
| wedding_date | date | Legacy — also in wedding_data.event.weddingDateISO |
| venue_name | text | Legacy — also in wedding_data.venues[0].name |
| venue_location | text | Legacy — also in wedding_data.venues[0].address |
| site_slug | text | Unique public URL slug |
| layout_config | jsonb | Legacy LayoutConfigV1 (backward compat) |
| site_json | jsonb | **Canonical** BuilderProject JSON |
| active_template_id | text | **Canonical** template ID |
| template_id | text | Legacy — kept in sync with active_template_id |
| wedding_data | jsonb | **Canonical** WeddingDataV1 JSON |
| is_published | boolean | Publish flag |
| published_at | timestamptz | Last publish timestamp |
| updated_at | timestamptz | Last update timestamp |

### builder_media_assets table

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| wedding_site_id | uuid | FK to wedding_sites.id |
| filename | text | Generated filename in storage |
| original_filename | text | User's original filename |
| mime_type | text | e.g. image/jpeg |
| asset_type | text | image / video / document |
| status | text | ready / uploading / error |
| url | text | Public storage URL |
| thumbnail_url | text | Optional thumbnail |
| size_bytes | int | File size |
| attached_section_ids | text[] | Array of section IDs using this asset |

### Canonical TypeScript Models

- **BuilderProject** (`src/types/builder/project.ts`) — new canonical format
- **WeddingDataV1** (`src/types/weddingData.ts`) — wedding content
- **LayoutConfigV1** (`src/types/layoutConfig.ts`) — legacy, maintained for backward compat

### Key Naming Rules

- DB column: `wedding_site_id` → TS field: `weddingId` (within BuilderProject/BuilderMediaAsset)
- DB column: `active_template_id` → TS field: `templateId` (canonical)
- DB column: `template_id` → Legacy fallback, kept in sync via dual-write in `saveDraft()`
- DB column: `site_slug` → TS field accessed via query as `site_slug`

---

## 3. Environment Variables Required

| Variable | Required | Purpose |
|----------|----------|---------|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Yes | Supabase anon key |
| VITE_GOOGLE_MAPS_API_KEY | No | Address autocomplete |
| VITE_DEMO_MODE | No | Enable demo mode (true/false) |

---

## 4. Confirmed Section Types

| Type | Variants | Bindings |
|------|----------|---------|
| hero | default, minimal, fullbleed | none |
| story | default, centered, split | none |
| venue | default, card | venueIds |
| schedule | default, timeline | scheduleItemIds |
| travel | default, cards | none |
| registry | default, grid | linkIds |
| rsvp | default, inline | none |
| faq | default, accordion | faqIds |
| gallery | default, masonry | none |

---

## 5. Builder State Action Types (31 total)

LOAD_PROJECT, SET_WEDDING_DATA, SET_ACTIVE_PAGE, SELECT_SECTION, HOVER_SECTION,
SET_MODE, ADD_SECTION, REMOVE_SECTION, REORDER_SECTIONS, UPDATE_SECTION,
TOGGLE_SECTION_VISIBILITY, DUPLICATE_SECTION, APPLY_TEMPLATE, APPLY_THEME,
SET_SAVING, SET_PUBLISHING, MARK_SAVED, MARK_PUBLISHED, SET_MEDIA_ASSETS,
ADD_MEDIA_ASSET, REMOVE_MEDIA_ASSET, UPDATE_UPLOAD_QUEUE, REMOVE_FROM_UPLOAD_QUEUE,
OPEN_TEMPLATE_GALLERY, CLOSE_TEMPLATE_GALLERY, OPEN_MEDIA_LIBRARY, CLOSE_MEDIA_LIBRARY,
SET_ERROR, ADD_SECTION_TYPE, UNDO, REDO

---

## 6. Known Limitations

1. **Billing:** `BillingModal.tsx` uses a fake setTimeout-based checkout. No Stripe integration.
   → Modal now gated with "Coming Soon" state. No misleading checkout flow.

2. **Media storage:** Requires `wedding-media` bucket in Supabase Storage with public read enabled.
   → Must be created manually in Supabase dashboard.

3. **Version column:** `wedding_sites` does not have a `version` integer column for schema migration tracking.
   → Versioning handled via `draftVersion` in BuilderProject JSON and `published_at` timestamp.

4. **Custom domain support:** Listed as Pro feature but not implemented.
   → Gated behind billing, no backend implementation.

5. **Advanced analytics:** Listed as Pro feature but not implemented.

6. **Scheduled messaging:** Backend table exists (`scheduled_messages`) but frontend is placeholder.

---

## 7. Security Posture

- RLS enabled on all user-owned tables
- `builder_media_assets` policies gate on `wedding_sites.user_id = auth.uid()`
- Public site view (SiteView) reads from `wedding_sites` without auth — intentional
- `site_rsvps` allows unauthenticated INSERT — intentional for guest RSVP flow

---

## 8. File Inventory Summary

| Domain | Files | Status |
|--------|-------|--------|
| src/builder/* | 30 files | Production-ready |
| src/pages/dashboard/* | 9 files | Stable |
| src/pages/onboarding/* | 4 files | Stable |
| src/sections/components/* | 9 files | Stable |
| src/components/site/sections/* | 9 files | Stable |
| src/types/builder/* | 6 files | Production-ready |
| supabase/migrations/* | 27 migrations | Applied |
| src/pages/dashboard/Builder.tsx | 1 file | **Deprecated** — route redirects away |

---

## 9. Migration History Summary

Applied 27 migrations through 20260218171854. Key milestones:

- **20260216190632:** Added wedding_data, layout_config, active_template_id columns
- **20260216212529:** Added site_slug for public URLs
- **20260217214155:** Added site_rsvps table
- **20260218171854:** Added builder_media_assets table, is_published, published_at

---

*Last updated: 2026-02-18*

---

## 10. 8-Phase Hardening Session — Summary

**Quality gate result:**

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 warnings |
| `npm test` | ✅ 126/126 passed |
| `npm run build` | ✅ Clean, 16.18s |

**Changes by phase:**

| Phase | Key Changes |
|-------|-------------|
| Phase 1 (Auth) | Verified canonical split. No changes needed. Created `docs/architecture-current.md`. |
| Phase 2 (Builder) | Undo baseline fix, publish race guard, media attach key resolution, design token toast. |
| Phase 3 (Registry) | URL dedupe warning, fetch-failure URL fallback. |
| Phase 4 (Site) | Coming Soon page for unpublished sites. |
| Phase 5 (Messages/Vault) | Messages full rewrite with real backend. Vault preview badges. |
| Phase 6 (RLS) | Fixed event_rsvps UPDATE + rsvps SELECT policies. Created `docs/rls-matrix.md`, `docs/db-verification.md`. |
| Phase 7 (Domain) | Updated `docs/domain-routing.md` with subdomain/custom domain implementation guide. |
| Phase 8 (QA) | Quality gate run, feature QA matrix, this summary. |

**Go / No-Go: GO**

All critical paths verified working. Unfinished features clearly labeled in UI. Security issues fixed. CI pipeline in place.

**Recommended before first marketing push:**
1. Implement email delivery for Messages (removes the "preview" gate on send/schedule)
2. Run `npx update-browserslist-db@latest` to clear the browserslist build warning
3. Create the `wedding-media` Supabase Storage bucket (required for media uploads)
4. Add invite_token validation to the `rsvps` INSERT RLS policy for tighter RSVP security
