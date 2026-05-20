# Template Preview Screenshot Index

Public The Knot template preview screenshots captured on 2026-05-19 for internal DayOf competitive research.

These are reference screenshots only. Do not copy The Knot artwork, layout, copy, or screenshots into production DayOf templates. Use them to understand category breadth, preview mechanics, naming patterns, page expectations, and visual gaps DayOf can answer with original page-aware template systems.

## Capture Summary

- Source catalog: `https://www.theknot.com/gs/wedding-websites/designs`
- Source detail pattern: `https://www.theknot.com/gs/wedding-websites/designs/{designId}`
- Preview links captured: `551`
- Screenshots captured: `551`
- Screenshot dimensions: `680 x 560`
- Screenshot mode: cropped public template preview area with desktop preview, mobile preview, template name, and colorway dots.
- Logged-in account mutation: none. These captures use public preview/detail pages, not applied builder themes.

## Files

- `theknot-template-preview-links.json` - public preview/detail URLs and template names.
- `theknot-template-preview-screenshot-manifest.json` - screenshot manifest with index, design id, name, source URL, absolute screenshot path, capture mode, and timestamp.
- `theknot-template-preview-screenshot-errors.json` - current error list. Verified empty after the completed pass.
- `template-preview-screenshots/` - all cropped preview screenshots.
- `capture-template-previews.mjs` - repeatable Playwright capture script.

## Verification

Completed verification on 2026-05-19:

- Manifest entries: `551`
- PNG files: `551`
- Missing screenshot files: `0`
- Capture errors: `0`
- Non-PNG file signatures: `0`
- Secret scan for the burner email/password strings in this audit folder: no matches.

## Example Screenshots

- `template-preview-screenshots/001-547-romantic-calligraphy-grey.png` - Romantic Calligraphy - Grey.
- `template-preview-screenshots/031-3598-flourishing-love-white-and-gold.png` - Flourishing Love - White & Gold.
- `template-preview-screenshots/551-734-elegant-industrial.png` - Elegant Industrial.

## Re-run Command

```sh
node docs/competitive/the-knot-template-audit-2026-05-19/capture-template-previews.mjs 1 551 --concurrency=6
```

Use `--force` to overwrite existing screenshots.

## Product Notes

- The preview pattern itself is strong: desktop plus mobile previews are visible together, which helps couples trust a template before starting.
- The public preview emphasizes full-site expectations, not just a hero card. The visible nav often includes Home, Our Story, Travel, Things to Do, Photos, Wedding Party, Registry, and RSVP.
- DayOf should use this reference set to build original template families around page architecture: single-page, multi-page, hybrid, travel-first, weekend, story/photo-heavy, cultural/multi-event, and RSVP-first templates.
- A logged-in applied-template screenshot pass is possible, but should be treated separately because applying themes inside the builder may mutate the account.
