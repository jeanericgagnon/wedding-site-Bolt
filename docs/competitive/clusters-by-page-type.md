# Cluster Map by Page Type

Data sources:
- `captures/wedding-builders/20260302-120333/*/manifest.json`
- `captures/zola/20260302-120031/manifest.json`
- `captures/theknot/20260302-131715/manifest.json`
- `captures/appycouple/20260302-132141/manifest.json`

## A) Homepage / top-level value pages
**Strongly represented:** withjoy.com, appycouple.com, zola.com, theknot.com, minted.com

Common traits:
- all-in-one framing (website + registry + guest ops)
- immediate primary CTA
- adjacent trust/evidence strips

## B) Builder flow pages
**Captured screenshots/manifests:**
- `.../zola/.../builder-full.png`
- `.../theknot/.../builder-full.png`
- `.../appycouple/.../builder-full.png`
- plus multi-site `*/builder-full.png`

Common traits:
- guided editing language over raw controls
- progress cues and publishing confidence signals
- quick-start entry from template selection

## C) Template gallery / designs hub
**Most complete data:** Zola (60 template links in deep run)

Artifacts:
- `.../zola/.../designs-full.png`
- `.../zola/.../manifest.json` (60 links)
- `.../theknot/.../designs-full.png` (links blocked)
- `.../appycouple/.../designs-full.png` (links blocked)

Common traits:
- high visual density of cards
- style/tag-based discovery surfaces
- conversion path: preview -> pick -> start editing

## D) Template detail pages
**Strongly represented:** Zola deep links
- Example source list in `.../zola/.../manifest.json` (template_links)

Common traits:
- template-specific branding + style confidence
- included sections/features shown before commitment
- direct “use this design” CTA

## E) Registry pages
Artifacts:
- `.../zola/.../registry-full.png`
- `.../theknot/.../registry-full.png`
- `.../appycouple/.../registry-full.png`
- multi-site `*/registry-full.png` where available

Common traits:
- “all registry modes” framing (physical gifts + funds/experiences)
- trust copy around guest ease / fees / reliability
- cross-linking into website and guest workflows

## F) RSVP / guest management
Direct capture depth is weaker than builder/template/registry in this run.
Inference from product copy + known feature framing:
- smart RSVP and guest segmentation are used as practical value anchor
- strongest products frame RSVP as operational control, not just form collection

## DayOf impact summary
Priority leverage points from cluster comparison:
1. Make template discovery feel larger + easier (cards, tags, filtering).
2. Keep builder simple but visibly guided (checklist/progress + next-step automation).
3. Package day-of operations as top-level differentiator.
4. Treat registry reliability and trust copy as conversion surface, not a utility afterthought.
