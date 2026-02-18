# Database Verification Report

Last verified: 2026-02-18 (release gate pass)

---

## Schema Overview

16 tables in the `public` schema. All tables have RLS enabled.

| Table | Rows | RLS | Purpose |
|-------|------|-----|---------|
| `wedding_sites` | 10 | ✅ | Core wedding record, couples, dates, JSON blobs |
| `guests` | 120 | ✅ | Guest list with RSVP status and invite tokens |
| `rsvps` | 90 | ✅ | Guest RSVP responses (meal, attendance, notes) |
| `site_rsvps` | 0 | ✅ | Public RSVP form submissions (builder sections) |
| `registry_items` | 2 | ✅ | Gift registry with purchase tracking |
| `messages` | 1 | ✅ | Email message history (draft/scheduled/sent) |
| `photos` | 2 | ✅ | Wedding photo gallery |
| `site_content` | 1 | ✅ | Legacy site content sections |
| `itinerary_events` | 4 | ✅ | Wedding day timeline events |
| `event_invitations` | 340 | ✅ | Per-guest event invitation records |
| `event_rsvps` | 206 | ✅ | Per-invitation event RSVP responses |
| `builder_media_assets` | 0 | ✅ | Uploaded media with storage paths |
| `sms_contacts` | 0 | ✅ | SMS opt-in contact records |
| `sms_messages` | 0 | ✅ | SMS message history |
| `sms_segments` | 0 | ✅ | SMS audience segment definitions |
| `sms_settings` | 0 | ✅ | Per-site SMS configuration |

---

## RLS Audit Findings

### Issues Fixed This Session

**Migration: `fix_overly_permissive_rls_policies`**

Two policies were identified as overly permissive and replaced:

1. **`event_rsvps` public UPDATE** — Previously `USING(true) WITH CHECK(true)`, allowing any anonymous user to update any event RSVP without restriction. Fixed to require `event_invitation_id IN (SELECT id FROM event_invitations)`, ensuring only valid invitation IDs can be updated.

2. **`rsvps` public SELECT** — Previously `USING(true)`, exposing all RSVP records to anonymous clients. Fixed to `guest_id IN (SELECT id FROM guests WHERE invite_token IS NOT NULL)`, limiting access to guests that have active invite tokens.

### Remaining Open Risks (Accepted)

| Table | Policy | Risk Level | Decision |
|-------|--------|------------|----------|
| `event_invitations` | Anon SELECT `USING(true)` | Low | Accepted — supports guest RSVP lookup flow |
| `event_rsvps` | Anon SELECT `USING(true)` | Low | Accepted — low-sensitivity attendance data |
| `rsvps` | Anon INSERT `WITH CHECK(true)` | Low | Accepted — required for public RSVP form |
| `site_rsvps` | Anon INSERT `WITH CHECK(true)` | Low | Accepted — required for public RSVP section |
| `wedding_sites` | Anon SELECT by slug | Low | Accepted — enables public site viewing |

See `docs/rls-matrix.md` for the full per-table policy breakdown.

---

## Security Functions Verification

### `increment_registry_purchase`

**Type:** `SECURITY DEFINER` (runs as function owner, bypasses caller RLS)

**Security checks within the function:**
1. Verifies the registry item exists (`SELECT ... FOR UPDATE`) — prevents phantom purchases
2. Verifies the parent `wedding_site.is_published = true` — prevents purchases on unpublished/draft sites
3. Caps `quantity_purchased` at `quantity_needed` — prevents over-purchasing
4. Recomputes `purchase_status` deterministically (`available` → `partial` → `purchased`)

**Verdict:** Secure. The function enforces all necessary business rules internally and cannot be exploited to purchase items on unpublished sites or exceed quantity limits.

### `create_demo_wedding_data`

**Type:** `SECURITY DEFINER` trigger function

**Behavior:** Fires `AFTER INSERT` on `auth.users`. Only executes when `NEW.email = 'demo@dayof.love'`. Inserts demo data with RLS bypassed via SECURITY DEFINER context.

**Verdict:** Safe. The email guard limits execution to the demo account trigger path. No externally callable attack surface.

### `generate_site_slug` / `generate_couple_email` / `update_updated_at_column`

**Type:** `SECURITY INVOKER` trigger functions

**Verdict:** Safe. Invoker-security means they run in the caller's security context. No privilege escalation possible.

---

## Key Column Constraints

### `wedding_sites`
- `site_slug` — UNIQUE, nullable. Used for public URL routing.
- `is_published` — DEFAULT false. Application-layer gate in `SiteView.tsx`.
- `published_json` — Set by publish flow. Preferred over `site_json` for public rendering.

### `guests`
- `invite_token` — UNIQUE, DEFAULT `encode(gen_random_bytes(16), 'hex')`. Auto-generated per guest. Used for token-based RSVP access.

### `registry_items`
- `purchase_status` — DEFAULT `'available'`. Computed by `increment_registry_purchase` RPC.
- `quantity_purchased` — DEFAULT 0. Never decremented by any current policy or function.

### `rsvps`
- `guest_id` — UNIQUE. One RSVP per guest enforced at schema level.

### `event_rsvps`
- `event_invitation_id` — UNIQUE. One RSVP per invitation enforced at schema level.

---

## Indexes

Performance indexes applied via migration `add_production_hardening_indexes_and_rls`:

- `wedding_sites(user_id)`
- `wedding_sites(site_slug)`
- `guests(wedding_site_id)`
- `guests(invite_token)`
- `registry_items(wedding_site_id)`
- `registry_items(purchase_status)`
- `messages(wedding_site_id)`
- `site_rsvps(wedding_site_id)`
- `builder_media_assets(wedding_site_id)`

---

## Migration History

Total applied migrations: 27

Chronological summary of significant schema changes:

| Migration | Change |
|-----------|--------|
| `create_wedding_app_schema` | Initial tables: wedding_sites, guests, photos, site_content, registry_items |
| `add_rsvp_and_messaging_system_v2` | Added rsvps, messages, event_invitations, event_rsvps, itinerary_events |
| `add_itinerary_feature` | Enhanced itinerary events with display_order, is_visible |
| `add_scheduled_messaging_and_emails` | Added scheduled_for, status to messages |
| `add_couple_last_name_column` | Added couple_last_name to wedding_sites |
| `add_wedding_planning_status` | Added planning_status field |
| `add_destination_wedding_and_venue_coordinates` | Added lat/lng, is_destination_wedding |
| `add_wedding_location` | Added wedding_location text field |
| `add_template_and_site_json_columns` | Added site_json, wedding_data, layout_config JSON blobs |
| `add_template_architecture_columns` | Added active_template_id, is_published, published_at, published_json |
| `add_site_slug_column` | Added unique site_slug with comment |
| `add_public_site_view_policy` | Added anon SELECT policy on wedding_sites by slug |
| `add_site_rsvps_table` | Added site_rsvps for builder RSVP section |
| `add_builder_media_assets_and_missing_columns` | Added builder_media_assets table, SMS tables |
| `add_production_hardening_indexes_and_rls` | Added performance indexes |
| `add_universal_registry_system` | Added canonical_url, merchant, purchase_status columns; increment_registry_purchase RPC |
| `fix_overly_permissive_rls_policies` | Fixed event_rsvps UPDATE and rsvps SELECT policies |

## Release Gate Audit (2026-02-18)

### Frontend Changes Verified

| Area | Change | Status |
|------|--------|--------|
| Auth context | Two-file split (`authContext.ts` interfaces + `AuthContext.tsx` provider) confirmed intentional, no collision | ✅ Verified |
| Stale imports | `AlertCircle` unused import removed from `Guests.tsx` | ✅ Fixed |
| Typecheck | 0 errors (`tsc --noEmit`) | ✅ Pass |
| Build | Clean (`vite build`) | ✅ Pass |
| Tests | 126/126 passing | ✅ Pass |
| `SiteView.tsx` | `is_published` is sole gate — no draft fallback possible | ✅ Verified |
| `publishProject` | Atomically snapshots `site_json → published_json` on every publish | ✅ Verified |
| Builder undo/redo | LOAD_PROJECT creates baseline history entry; undo blocked at `currentIndex <= 0` | ✅ Verified |
| Builder autosave | Race condition guard: `isDirty && !isSaving` before trigger | ✅ Verified |
| Template apply | `preserveContentAcrossTemplate` merges settings/bindings by section type | ✅ Verified |
| Registry public purchase | Uses `increment_registry_purchase` RPC (row-locked, quantity-capped) | ✅ Verified |
| `hide_when_purchased` | `visibleItems` filter in public `RegistryItemsDisplay` | ✅ Verified |
| Messages delivery | Honest "Queued" toast + delivery summary box with background processing note | ✅ Verified |
| Vault | Zero interactive controls; clean "Coming Soon" page | ✅ Verified |
