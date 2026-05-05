# Template Truth Matrix

Date: 2026-05-04 3:15 PM PT

Purpose: launch-quality template truth source for the 10/10 pass. This matrix separates the public launch catalog from older saved-site-compatible templates so the product does not promise designs that have not been promoted through the rich public renderer.

Source of truth:

- Launch tier code: `src/builder/constants/templateLaunchQuality.ts`
- Launch catalog: `getLaunchTemplatePacks()`
- Hidden/saved-site compatibility: `getTemplatePack(id)` still returns hidden legacy packs with `launchTier: hidden`
- Renderer truth: builder-backed public pages prefer the rich section registry through `src/builder/components/SectionRenderer.tsx`

## Launch Catalog

| Template | Tier | Status | Notes |
| --- | --- | --- | --- |
| `modern-luxe` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses left-aligned black-tie full-bleed hero; travel defaults are Sayulita-safe. |
| `editorial-romance` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses split editorial hero; travel defaults are Sayulita-safe. |
| `timeless-classic` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses formal minimal invitation hero; travel defaults are Sayulita-safe. |
| `destination-minimal` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses travel-forward hero; travel/accommodations defaults are Sayulita-safe. |
| `bold-contemporary` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses countdown hero; travel defaults are Sayulita-safe. |
| `photo-storytelling` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses lighter photo-led hero; travel defaults are Sayulita-safe. |
| `floral-garden` | Flagship | Launch visible | Rich-renderer proof green; first viewport uses botanical hero; travel defaults are Sayulita-safe. |
| `editorial-romance-ivory` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |
| `editorial-romance-midnight` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |
| `floral-garden-sage` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |
| `floral-garden-rose` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |
| `modern-luxe-ivory` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |
| `timeless-classic-navy` | Secondary | Launch visible | Rich-renderer proof green; derivative of flagship family; travel defaults are Sayulita-safe. |

## Hidden Legacy Compatibility Set

These templates are intentionally hidden from launch choice surfaces until a later visual/truth promotion pass. They remain addressable for saved sites and direct compatibility paths.

| Template | Tier | Status |
| --- | --- | --- |
| `editorial-impact` | Hidden | Saved-site compatible only |
| `cinematic-immersion` | Hidden | Saved-site compatible only |
| `romantic-dreamy` | Hidden | Saved-site compatible only |
| `playful-celebration` | Hidden | Saved-site compatible only |
| `coastal-breeze` | Hidden | Saved-site compatible only |
| `garden-escape` | Hidden | Saved-site compatible only |
| `modern-clean` | Hidden | Saved-site compatible only |
| `luxury-opulent` | Hidden | Saved-site compatible only |
| `destination-adventure` | Hidden | Saved-site compatible only |
| `minimal-essentials` | Hidden | Saved-site compatible only |
| `magazine-narrative` | Hidden | Saved-site compatible only |
| `bold-statement` | Hidden | Saved-site compatible only |
| `artistic-expression` | Hidden | Saved-site compatible only |
| `refined-elegance` | Hidden | Saved-site compatible only |
| `rustic-charm` | Hidden | Saved-site compatible only |
| `moody-dramatic` | Hidden | Saved-site compatible only |
| `contemporary-fusion` | Hidden | Saved-site compatible only |
| `floating-elements` | Hidden | Saved-site compatible only |
| `full-featured-classic` | Hidden | Saved-site compatible only |
| `full-featured-modern` | Hidden | Saved-site compatible only |
| `full-featured-luxury` | Hidden | Saved-site compatible only |
| `full-featured-playful` | Hidden | Saved-site compatible only |
| `full-featured-minimal` | Hidden | Saved-site compatible only |
| `guest-experience-first` | Hidden | Saved-site compatible only |
| `wedding-party-showcase` | Hidden | Saved-site compatible only |
| `timeline-narrative` | Hidden | Saved-site compatible only |
| `registry-wish-focused` | Hidden | Saved-site compatible only |
| `ultra-compact-mobile` | Hidden | Saved-site compatible only |
| `immersive-experience` | Hidden | Saved-site compatible only |
| `elopement-intimate` | Hidden | Saved-site compatible only |
| `bold-typography-driven` | Hidden | Saved-site compatible only |
| `split-screen-modern` | Hidden | Saved-site compatible only |
| `experience-collection` | Hidden | Saved-site compatible only |

## Proof

- `npm test -- --run src/builder/components/SectionRenderer.public.test.tsx src/builder/constants/templateLaunchQuality.test.ts src/sections/registry.test.ts`: PASS, 44/44.
- `npm test -- --run src/lib/setupDraftRecommendations.test.ts src/builder/constants/templateLaunchQuality.test.ts src/builder/components/SectionRenderer.public.test.tsx`: PASS, 19/19.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS with the known Browserslist update notice and empty `vendor-react` chunk.
- Local Playwright launch-visible template proof against `http://127.0.0.1:4210`: PASS, 26/26 template/viewport checks across 13 templates and desktop/mobile, with no missing-section fallback text, unsafe technical terms, console/page errors, or horizontal overflow.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4212 npx playwright test --workers=1 tests/e2e/launch-template-flagship-visual.spec.ts`: PASS, 2/2 for seven flagship templates on desktop and mobile. Proof confirmed the full-preview route starts with the public hero, hides proof metadata by default, has no console errors, has no broken images, and has no meaningful horizontal overflow.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4214 npx playwright test --workers=1 tests/e2e/launch-template-flagship-visual.spec.ts`: PASS, 3/3 for flagship first-viewport proof plus all 13 launch-visible templates on desktop and mobile. Proof confirmed no stale New York logistics, no proof metadata, no unsafe technical terms, no broken images, no console errors, and no meaningful horizontal overflow.

No deploy was run for this matrix.
