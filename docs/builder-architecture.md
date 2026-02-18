# Builder Architecture

The visual site builder (`/builder`) is a self-contained subsystem within the wedding platform.
It lets couples build and publish their wedding website using a drag-and-drop canvas.

---

## High-Level Flow

```
BuilderPage (loads data) → BuilderShell (manages state) → {
  BuilderTopBar        — save / publish / undo-redo
  BuilderSidebarLibrary — section palette + page list
  BuilderCanvas        — drag-and-drop canvas
  BuilderInspectorPanel — right panel: settings / style overrides
  TemplateGalleryPanel  — overlay modal for template switching
  MediaLibraryPanel     — overlay modal for image management
}
```

---

## Data Flow

### Load path (BuilderPage.tsx)

1. Authenticate → get `user.id`
2. Query `wedding_sites` by `user_id` → get `weddingSiteId`
3. In parallel:
   - `builderProjectService.loadProject(weddingSiteId)` → `BuilderProject`
   - `builderProjectService.loadWeddingData(weddingSiteId)` → `WeddingDataV1`
4. Render `BuilderShell` with `initialProject` + `initialWeddingData`

### Project loading precedence (`loadProject`)

```
site_json column exists + is valid BuilderProject  →  use it
   └─ otherwise
layout_config column exists + is valid LayoutConfigV1  →  convert via layoutAdapter
   └─ otherwise
createEmptyBuilderProject()  →  fresh start
```

### Save path (`builderProjectService.saveDraft`)

Writes atomically to `wedding_sites`:
- `site_json` — canonical BuilderProject JSON
- `layout_config` — legacy LayoutConfigV1 (kept for backward compat)
- `active_template_id` + `template_id` — both updated for compat
- `wedding_data` — if weddingData was passed
- `updated_at` — ISO timestamp

### Publish path (`builderProjectService.publishProject`)

1. Read current `site_json` from DB
2. Write `published_json = site_json` (snapshot at publish time)
3. Set `is_published = true`, `published_at = now()`

Public site (`/site/:slug`) reads `published_json` first, then falls back to `site_json`.

---

## State Management

The builder uses React's `useReducer` with a custom context. State lives in `BuilderShell`.

### Key state fields

| Field | Type | Purpose |
|-------|------|---------|
| `project` | BuilderProject \| null | The active project |
| `weddingData` | WeddingDataV1 \| null | Wedding content for section rendering |
| `activePageId` | string \| null | Currently visible page in canvas |
| `selectedSectionId` | string \| null | Section being inspected |
| `mode` | 'edit' \| 'preview' | Edit vs preview toggle |
| `isDirty` | boolean | Unsaved changes flag |
| `history` | BuilderHistoryState | Undo/redo snapshot stack |
| `mediaAssets` | BuilderMediaAsset[] | Loaded media for this wedding |
| `uploadQueue` | MediaUploadProgress[] | Active upload progress |
| `mediaPickerTargetSectionId` | string \| null | Set when media picker is open |

### History (undo/redo)

Snapshots are taken before every mutating action (add/remove/reorder/update section, apply template/theme).
Max 50 entries. Undo pops the stack; redo advances it. New actions clear the redo stack.

---

## Section Rendering

Section components live in `src/sections/components/` and `src/components/site/sections/`.
They accept `{ data: WeddingDataV1, instance: SectionInstance }` props.

The builder's `SectionRenderer.tsx` bridges from `BuilderSectionInstance` → `SectionInstance`
and wraps each render in a `SectionErrorBoundary` to prevent canvas crashes.

`SiteView.tsx` (public site) uses the same `SectionRenderer` for consistent rendering.

---

## Template System

Templates are defined in `src/builder/constants/builderTemplatePacks.ts`.
Each template is a list of `BuilderSectionInstance` definitions with pre-set variants.

When a template is applied:
1. Existing sections are indexed by type
2. For matching types in the new template, settings/bindings/styleOverrides are preserved
3. New section types use template defaults

---

## Media System

Files upload to Supabase Storage bucket `wedding-media` at path `{weddingId}/{timestamp}_{random}.{ext}`.
Metadata (URL, size, type, attached sections) is stored in `builder_media_assets`.

Picker mode: inspector `image` fields open the media library with `openMediaLibrary(sectionId)`.
Selecting an asset updates `section.settings.imageUrl` and closes the modal.

---

## File Map

```
src/builder/
├── BuilderPage.tsx                # Route entry point
├── adapters/
│   ├── layoutAdapter.ts           # BuilderProject ↔ LayoutConfigV1
│   └── weddingDataAdapter.ts      # WeddingDataV1 transformations
├── components/
│   ├── BuilderShell.tsx           # State + layout shell
│   ├── BuilderTopBar.tsx          # Save / Publish / Undo-Redo
│   ├── BuilderCanvas.tsx          # Drag-drop editing area
│   ├── BuilderDropZone.tsx        # DnD zone for sections
│   ├── BuilderSidebarLibrary.tsx  # Section palette
│   ├── BuilderInspectorPanel.tsx  # Right settings panel
│   ├── BuilderSectionFrame.tsx    # Individual section wrapper
│   ├── SectionRenderer.tsx        # Bridge → real section components
│   ├── TemplateGalleryPanel.tsx   # Template switching modal
│   └── MediaLibraryPanel.tsx      # Media upload/select modal
├── constants/
│   ├── builderCapabilities.ts     # Limits (max sections, file size, etc.)
│   ├── builderShortcuts.ts        # Keyboard shortcut definitions
│   └── builderTemplatePacks.ts    # Template definitions
├── registry/
│   ├── sectionManifests.ts        # Section type schemas + defaults
│   └── sectionRendererRegistry.ts # Maps types → renderer components
├── services/
│   ├── builderProjectService.ts   # Load/save to Supabase
│   ├── mediaService.ts            # Upload/list/delete wrapper
│   ├── mediaRepository.ts         # Raw Supabase media queries
│   └── publishService.ts          # Publish orchestration
└── state/
    ├── builderStore.ts            # Context + state type + action types
    ├── builderReducer.ts          # Reducer with history stack
    ├── builderActions.ts          # Action creators
    └── builderSelectors.ts        # Memoized selectors
```

---

## Security

- All builder write operations require authentication (Supabase RLS)
- `wedding_sites` rows are owned by `user_id = auth.uid()`
- `builder_media_assets` access is gated via JOIN to `wedding_sites.user_id`
- Public site reads (`/site/:slug`) are unauthenticated by design

---

*Last updated: 2026-02-18*
