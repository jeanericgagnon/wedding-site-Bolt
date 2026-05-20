# The Knot Template Audit - 2026-05-19

Competitive research workbench for DayOf template strategy.

This folder is for internal product/design reference only. Do not clone The Knot templates, artwork, copy, or screenshots into production templates. Use the findings here to design original DayOf template systems with stronger page architecture, better guest logistics, and more useful builder controls.

## What Was Captured

- Public design catalog URL: `https://www.theknot.com/gs/wedding-websites/designs`
- Public multi-page/single-page help article: `https://helpcenter.theknot.com/hc/en-us/articles/39380380162580-What-is-the-difference-between-the-multi-page-and-single-page-layout`
- Public wedding-site example used for page/section vocabulary: `https://www.theknot.com/us/kristen-mathews-and-cody-ballard-apr-2026/things-to-do/155133714`
- Authenticated The Knot wedding website dashboard/editor screenshots from the burner account session.
- Public template detail-preview screenshots for all 551 captured public preview URLs.
- Current DayOf builder/template code paths under `src/types/builder`, `src/builder`, `src/templates`, `src/lib/publicSiteRenderModel.ts`, and `src/pages/SiteView.tsx`

## Files

- `the-knot-template-audit.md` - competitor findings, design taxonomy, page/section patterns, and repo fit.
- `dayof-template-blueprint.md` - concrete DayOf product/implementation blueprint for multi-page templates, anchors, and dedicated pages.
- `dayof-builder-gap-analysis-2026-05-19.md` - current DayOf builder gaps, lessons from The Knot, and recommended implementation order.
- `capture-backlog.md` - remaining authenticated capture checklist once a usable browser session is available.
- `authenticated-screenshot-index.md` - index of logged-in builder screenshots captured from the account session.
- `template-preview-screenshot-index.md` - index and verification notes for the 551 public template-preview screenshots.
- `theknot-template-preview-links.json` - 551 public design-detail URLs and names extracted from the rendered catalog.
- `theknot-template-preview-screenshot-manifest.json` - manifest for cropped public template-preview screenshots.
- `theknot-template-preview-screenshot-errors.json` - capture error list, verified empty after the completed pass.
- `capture-template-previews.mjs` - repeatable Playwright capture script for the public preview screenshots.
- `theknot-design-names-public-full.json` - 225 public design names extracted from the catalog.
- `theknot-design-taxonomy.csv` - inferred style/color taxonomy for the 225 extracted public designs.
- `theknot-design-taxonomy-counts.json` - aggregate counts from the inferred taxonomy.
- `theknot-design-filter-text.json` - public filter options for style, color, and season.
- `screenshots/` - clean public catalog screenshots, filter screenshots, scroll screenshots, and one design-detail screenshot.
- `authenticated-screenshots/` - logged-in dashboard, editor, page manager, design, privacy, custom page, travel, story, and RSVP screenshots.
- `template-preview-screenshots/` - 551 cropped public template preview screenshots.

## Capture Notes

- The provided credentials were not written to disk.
- The in-app browser connection became available on the follow-up pass, and authenticated builder screenshots were captured from the active account session.
- Public Playwright capture did work outside the sandbox and produced usable design catalog evidence.
- Public catalog capture extracted design naming, filter taxonomy, preview structure, and a design-detail start flow.
- Public preview capture saved 551 cropped template screenshots at 680 x 560 with 0 missing files and 0 capture errors.
- Authenticated capture confirmed The Knot exposes multi-page/single-page layout switching, custom pages, page visibility toggles, page reorder, per-page content/settings tabs, page-level add-block menus, privacy controls, and RSVP setup.
