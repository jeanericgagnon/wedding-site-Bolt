# Template Authoring & Variant Architecture

## Overview

The template system is built on three layers:

1. **Template Registry** (`src/templates/registry.ts`) — defines which sections appear, in what order, with which variant, and with which default settings.
2. **Section Registry** (`src/sections/sectionRegistry.tsx`) — maps section types to React components and registers all available variants.
3. **Theme Presets** (`src/lib/themePresets.ts`) — maps preset IDs to CSS custom property overrides applied at the `:root` element.

---

## Canonical Template IDs

| ID | Name | Theme Preset | Layout Focus |
|----|------|-------------|--------------|
| `base` | Base | romantic | All sections, standard order |
| `modern` | Modern | elegant | Gallery-first, minimal |
| `editorial` | Editorial | garden | Story-first, typographic |
| `classic` | Classic | classic | Traditional, ceremony-order |
| `rustic` | Rustic | *(alias for classic)* | Alias — resolves to classic |

### Aliases

Aliases are declared in `TEMPLATE_REGISTRY` as duplicate keys pointing to canonical `TemplateDefinition` objects:

```ts
export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  base: baseTemplate,
  modern: modernTemplate,
  editorial: editorialTemplate,
  classic: classicTemplate,
  rustic: classicTemplate, // alias
};
```

`getAllTemplates()` returns only canonical templates (not aliases), so the UI shows 4 options.

---

## Adding a New Template

1. Create a `TemplateDefinition` constant in `src/templates/registry.ts`:

```ts
const myTemplate: TemplateDefinition = {
  id: 'my-template',
  name: 'My Template',
  description: 'Short description for UI',
  defaultThemePreset: 'elegant', // one of the keys in THEME_PRESETS
  defaultLayout: {
    sections: [
      {
        type: 'hero',
        variant: 'fullbleed', // must match a key in SECTION_REGISTRY[type].variants
        enabled: true,
        bindings: {},
        settings: { showTitle: true },
      },
      // ... more sections
    ],
  },
};
```

2. Register it in `TEMPLATE_REGISTRY`:

```ts
export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  // ...existing
  'my-template': myTemplate,
};
```

3. Add it to `getAllTemplates()` return array.

---

## Section Variants Architecture

Each section type can have multiple **variants** — alternate React component implementations with different visual styles.

### Variant Naming Conventions

| Variant | Style |
|---------|-------|
| `default` | Standard baseline design |
| `minimal` | Stripped back, whitespace-heavy |
| `fullbleed` | Edge-to-edge imagery |
| `card` | Card-based layout |
| `grid` | Grid arrangement |
| `timeline` | Vertical timeline |
| `accordion` | Collapsible accordion |
| `split` | Two-column split layout |
| `masonry` | Masonry/column photo grid |
| `inline` | Compact inline design |
| `cards` | Multiple cards in a row |

### Adding a New Variant

1. Export a new component from the section file:

```tsx
// src/sections/components/HeroSection.tsx
export const HeroMyVariant: React.FC<Props> = ({ data, instance }) => {
  // ...
};
```

2. Register it in `SECTION_REGISTRY` in `src/sections/sectionRegistry.tsx`:

```ts
hero: {
  component: HeroSection,
  variants: {
    default: HeroSection,
    minimal: HeroMinimal,
    fullbleed: HeroFullbleed,
    myvariant: HeroMyVariant, // new
  },
  supportedBindings: [],
  supportedSettings: ['showTitle'],
},
```

3. Assign the variant in a template definition:

```ts
{ type: 'hero', variant: 'myvariant', enabled: true, bindings: {}, settings: { showTitle: true } }
```

### Variant Fallback Behavior

`getSectionComponent(type, variant)` falls back to the `component` (default) if the specified variant is not found. This ensures backward compatibility when variants are added or renamed.

---

## Theme Preset Mapping

Theme presets are defined in `src/lib/themePresets.ts`. Each preset maps semantic token names to hex color values.

### Tokens Available

| Token Name | CSS Variable |
|------------|-------------|
| `colorPrimary` | `--color-primary` |
| `colorPrimaryHover` | `--color-primary-hover` |
| `colorPrimaryLight` | `--color-primary-light` |
| `colorAccent` | `--color-accent` |
| `colorAccentHover` | `--color-accent-hover` |
| `colorAccentLight` | `--color-accent-light` |
| `colorSecondary` | `--color-secondary` |
| `colorBackground` | `--color-background` |
| `colorSurface` | `--color-surface` |
| `colorSurfaceSubtle` | `--color-surface-subtle` |
| `colorBorder` | `--color-border` |
| `colorTextPrimary` | `--color-text-primary` |
| `colorTextSecondary` | `--color-text-secondary` |

### Adding a New Theme Preset

```ts
export const THEME_PRESETS: Record<string, ThemePreset> = {
  // ...existing
  winter: {
    id: 'winter',
    name: 'Winter',
    description: 'Icy blues and crisp whites',
    tokens: {
      colorPrimary: '#5B8FA8',
      colorPrimaryHover: '#4A7A91',
      colorPrimaryLight: '#EBF3F8',
      // ... fill all 13 tokens
    },
  },
};
```

### How Themes are Applied

On `SiteView`, after loading `WeddingDataV1`, `applyThemePreset(data.theme.preset)` is called to inject CSS variables on `document.documentElement`. The cleanup function in the `useEffect` removes the overrides when the component unmounts.

---

## Template Switching & Binding Preservation

`regenerateLayout(newTemplateId, data, currentLayout)` in `src/lib/generateInitialLayout.ts` performs a **safe template switch**:

1. Generates a fresh layout from the new template.
2. For each section in the new layout, looks up any existing section of the same **type** in the current layout.
3. If found, preserves:
   - `enabled` state (visible/hidden)
   - `settings` (title, showTitle, subtitle, etc.) — new template defaults fill in any new settings keys
   - `bindings` (venueIds, scheduleItemIds, etc.)
4. New section types in the new template get fresh defaults.
5. Section types removed from the new template are discarded.

This ensures that:
- Custom titles and visibility toggles survive template changes.
- Data bindings are not reset.
- The section order follows the new template's opinionated sequence.

---

## Compatibility Notes

- `WeddingDataV1.version === '1'` — the only supported version; `SiteView` rejects anything else.
- `LayoutConfigV1.version === '1'` — same constraint.
- Variant `'default'` must always exist in every section's variant map; it is the fallback.
- Template IDs stored in `layout_config.templateId` and `wedding_sites.active_template_id` must resolve in `TEMPLATE_REGISTRY` or fall back to `'base'`.
- Alias template IDs (e.g., `'rustic'`) are valid in the DB but resolve to their canonical template at runtime.
