# Current Architecture

## Auth Context

### Module Topology

```
src/contexts/authContext.ts     — Types, context object, useAuth hook (no JSX)
src/contexts/AuthContext.tsx    — AuthProvider component (JSX, Supabase session management)
src/hooks/useAuth.ts            — Re-export barrel: exports useAuth + AuthContextType
```

### Canonical Import Pattern

| Consumer | Import from |
|---|---|
| Root app wrapper | `./contexts/AuthContext` → `AuthProvider` |
| All pages/components | `../../hooks/useAuth` → `useAuth` |
| Type consumers | `../../hooks/useAuth` → `AuthContextType` |

There is **one source of truth per concern**:
- `authContext.ts` owns the type contract and the hook implementation
- `AuthContext.tsx` owns the session lifecycle (sign-in, sign-out, Supabase subscription)
- `hooks/useAuth.ts` is a pure re-export barrel for consumer convenience

No consumer imports directly from `AuthContext.tsx` except `App.tsx` for the provider.

---

## Builder Architecture

### State Management

```
BuilderShell (useReducer + BuilderContext.Provider)
  ├── builderStore.ts     — State interface, initial state, context, action union type
  ├── builderReducer.ts   — Pure reducer handling all 28 action types
  ├── builderActions.ts   — Typed action creator functions
  └── builderSelectors.ts — Pure selector functions (memoized via useMemo in shell)
```

### History / Undo-Redo

- History is a `BuilderHistoryState` with `entries[]`, `currentIndex`, `maxEntries: 50`
- `currentIndex` starts at `-1` (no entries)
- First mutation pushes entry 0; `canUndo` becomes true when `currentIndex > 0` (entry 1+)
- This means: **the first edit IS undoable after the second edit** — undo returns to the initial snapshot stored at index 0
- `UNDO` decrements index and restores `entries[currentIndex - 1].snapshot`
- `REDO` increments index and restores `entries[currentIndex + 1].snapshot`
- Any new mutation after undo truncates forward history: `entries.slice(0, currentIndex + 1)`

**Note:** The initial project state is NOT pre-loaded into history. This means undo from the very first edit has no prior state to return to (`currentIndex <= 0` guard prevents it). This is a known limitation, not a bug — see Phase 2 hardening for the baseline snapshot approach.

### Save / Autosave

- `handleSave` uses `stateRef.current` to always access latest state
- `SET_SAVING → await saveDraft → MARK_SAVED` or `SET_SAVING(false)` on error
- Autosave interval fires every `BUILDER_AUTOSAVE_INTERVAL_MS` only if `isDirty && !isSaving`
- Race protection: interval checks `isSaving` flag before triggering → no overlapping writes

### Template Apply

- `TemplateGalleryPanel.preserveContentAcrossTemplate()`:
  - Builds `Map<sectionType, firstExistingSection>` from current page
  - For each new template section, merges existing settings/bindings/styleOverrides if type matches
  - First-match-by-type: if two sections of same type exist, only first is preserved
  - New section types in template that don't exist in current page get default content

### Media Attach

- Media picker opened via `OPEN_MEDIA_LIBRARY` with `sectionId` as `mediaPickerTargetSectionId`
- On asset select: `UPDATE_SECTION` patch sets `settings.imageUrl = asset.url`
- The key `imageUrl` is hardcoded — sections with different image key names won't receive the value
- After attachment, `mediaService.attachAssetToSection` records the section association in DB

### Publish Flow

1. `handlePublish` auto-saves first if dirty
2. `publishService.publish()` calls `saveDraft()` then `publishProject()`
3. `publishProject()` fetches current `site_json`, writes `published_json` snapshot
4. Sets `is_published = true`, `published_at`
5. `MARK_PUBLISHED` updates local state with version/timestamp

---

## Public Site Rendering

### Data Priority (SiteView.tsx)

```
published_json  → preferred (production snapshot)
    ↓ fallback
site_json       → draft (builder working copy)
    ↓ fallback
layout_config   → legacy V1 format (pre-builder sites)
    ↓ fallback
"Still being set up" error page
```

### Not-Published Behavior

A site is publicly accessible if it has either `published_json` OR `site_json`. The `is_published` flag is only checked by registry item RLS (must be published for public purchases). The site view itself does NOT gate on `is_published` — any site with a `site_slug` and JSON data is visible.

This is intentional: draft preview works for couples sharing links before formal publish.

---

## Routing

| Path | Auth | Destination |
|---|---|---|
| `/` | Public | Home (marketing) |
| `/site/:slug` | Public | Public wedding site |
| `/login`, `/signup` | Public | Auth pages |
| `/dashboard` | Protected | Dashboard overview |
| `/dashboard/builder` | Protected | Redirects to `/builder` |
| `/builder` | Protected | Site builder |
| `/dashboard/*` | Protected | Dashboard sub-pages |
| `*` | Any | Redirect to `/` |

---

## Database Layer

### Key Tables

| Table | Purpose |
|---|---|
| `wedding_sites` | Core wedding record (couples, dates, JSON blobs) |
| `guests` | Guest list with RSVP status |
| `registry_items` | Gift registry with purchase tracking |
| `site_rsvps` | Public RSVP form submissions |
| `messages` | Email message history (draft/scheduled/sent) |
| `itinerary_items` | Wedding day timeline events |
| `builder_media_assets` | Uploaded media with storage paths |

### RLS Posture Summary

- All tables have RLS enabled
- Owners can CRUD their own data (`auth.uid() = user_id` or via `wedding_site_id`)
- Public anonymous read: `wedding_sites` by slug, `registry_items` for published sites
- Public anonymous write: `site_rsvps` INSERT, registry `increment_registry_purchase` RPC
- Registry purchase is SECURITY DEFINER function — bypasses RLS safely with explicit published-site check

---

## Registry System

### URL Import Flow

```
User pastes URL → normalizeUrl() → isValidUrl() check
  → fetchUrlPreview(url) → Edge Function registry-preview
    → Fetch HTML with 8s timeout
    → Extract: OG tags → Twitter cards → JSON-LD → <title>
    → Return: { title, price_label, price_amount, image_url, merchant, canonical_url }
  → Pre-fill form fields
  → User reviews/edits → Save
```

### Purchase Flow (Public)

```
Guest clicks "I'll buy this" → PurchaseModal
  → publicIncrementPurchase(itemId, purchaserName)
    → RPC increment_registry_purchase()
      → SELECT FOR UPDATE (row lock)
      → Verify published site
      → Increment + cap at quantity_needed
      → Recompute purchase_status
      → RETURNING updated row
  → Optimistic UI update
```

### Rate Limiting

The Edge Function has an in-memory rate limiter (20 req/60s per IP). This is sufficient for preview fetch abuse prevention. The public purchase RPC has no rate limiting — relies on Supabase anon key rate limits and the quantity cap (cannot purchase more than needed).
