# Finish Board — 2026-04-19

## Must ship soon
- Trust-critical public surface cleanup: no fake footer placeholders, live trust page, real privacy/terms/contact paths.
- End-to-end publish + guest-facing smoke on the canonical wedding-site flow.
- Final truth pass on marketing copy vs actual behavior (URLs, privacy, messaging, migration, registry claims).
- Core launch QA for guest ops: RSVP, messaging, seating lookup, planner/collaborator access.

## Should ship if time
- Better empty/error states on public sections that still feel thin.
- Tighten support / trust page copy across product and landing surfaces.
- One-click internal QA checklist for pre-release smoke runs.

## Cut / defer
- Broad aesthetic polish that does not change launch credibility.
- Net-new major feature work.
- Deep analytics storytelling beyond measured counts.
- Anything deploy-shaped or infra-heavy for this lane.

## Batch landed
- Added a real `/trust` page.
- Replaced footer “coming soon” placeholders with live links to Trust, Privacy Policy, and Terms of Service.
- Fixed footer brand/contact from placeholder-ish values to DayOf + `support@dayof.love`.
- Fixed raw `SITE_TRUST_COPY` placeholder leaks that were rendering literal template text in marketing/onboarding copy.

## Why this batch mattered
Leaving fake footer placeholders on a product this close to the line makes the whole thing feel less real than it is. This batch removes obvious trust debt from the public surface.

## Most urgent next
- Run and fix a hard guest-facing smoke pass on homepage → signup/demo → builder/site → RSVP → dashboard core routes.
- Do a brutal marketing truth sweep for any remaining placeholder or overclaim copy on Home/Product/features pages.
