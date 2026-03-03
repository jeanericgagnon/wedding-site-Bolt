# Preview Pipeline Audit — PREVIEW-PLAN-01

## Current preview source path(s)
- Preview assignment logic: `src/builder/constants/templateCatalog.ts` (`previewImage: PREVIEW_POOL[idx % PREVIEW_POOL.length]`)
- `/templates` list renderer: `src/pages/Templates.tsx` (`<img src={tpl.previewImage} />`)
- Template detail page uses same catalog source: `src/pages/TemplateDetail.tsx`

## 35-template mapping (`template_id -> preview asset/render source`)

| template_id | preview source | mismatch |
|---|---|---|
| `editorial-impact` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `cinematic-immersion` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `romantic-dreamy` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `playful-celebration` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `timeless-classic` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |
| `coastal-breeze` | `https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg` | YES (generic pooled image, not canonical template render) |
| `garden-escape` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `modern-clean` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `luxury-opulent` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `destination-adventure` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `photo-storytelling` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |
| `minimal-essentials` | `https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg` | YES (generic pooled image, not canonical template render) |
| `magazine-narrative` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `bold-statement` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `artistic-expression` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `refined-elegance` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `rustic-charm` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |
| `moody-dramatic` | `https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg` | YES (generic pooled image, not canonical template render) |
| `contemporary-fusion` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `floating-elements` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `full-featured-classic` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `full-featured-modern` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `full-featured-luxury` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |
| `full-featured-playful` | `https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg` | YES (generic pooled image, not canonical template render) |
| `full-featured-minimal` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `guest-experience-first` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `wedding-party-showcase` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `timeline-narrative` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `registry-wish-focused` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |
| `ultra-compact-mobile` | `https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg` | YES (generic pooled image, not canonical template render) |
| `immersive-experience` | `https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg` | YES (generic pooled image, not canonical template render) |
| `elopement-intimate` | `https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg` | YES (generic pooled image, not canonical template render) |
| `bold-typography-driven` | `https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg` | YES (generic pooled image, not canonical template render) |
| `split-screen-modern` | `https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg` | YES (generic pooled image, not canonical template render) |
| `experience-collection` | `https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg` | YES (generic pooled image, not canonical template render) |

**Mismatch summary:** 35/35 templates are mismatched (all templates currently use pooled stock photos rather than template-specific canonical renders).

## Proposed fix strategy (3 bullets max)
- Build deterministic generator (Playwright) that renders each template by id using a fixed fixture dataset and captures `public/template-previews/<template-id>.webp` (single viewport + wait-for-stable rule).
- Replace pooled `PREVIEW_POOL` logic with direct map to generated assets (`/template-previews/<template-id>.webp`) and fallback placeholder only when file missing.
- Add regression check script (`npm run check:template-previews`) that fails when registry ids and preview assets diverge; run in CI + pre-merge verify.
