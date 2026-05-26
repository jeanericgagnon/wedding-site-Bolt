# Multi-language audit

Date: 2026-05-22

## Current reality
DayOf now has real guest-facing language continuity in a few specific lanes:
- guest language preferences can be carried by invite links and stored for return visits
- guest-facing language packs exist for the audited guest surfaces
- owners can trigger supported public-site translations

That is materially better than manual bilingual copy alone, but it is still narrower than full product internationalization.

## What is real today
- guest-facing language handling
- localized public-site rendering in the supported translation flow
- translation resource coverage checks for the maintained guest-facing packs

## What is not yet proven
- a fully translated dashboard across planning, guests, registry, settings, and ops surfaces
- end-to-end owner workspace language switching as a launch-safe product claim
- broad claim parity that says the whole app is internationalized

## Honest conclusion
Language support is now **real but scoped**.

The safe product claim is:
- guest-facing language continuity
- owner-triggered public-site translation

The unsafe claim is:
- full dashboard i18n
- fully multilingual planning workspace

## Recommendation
Keep customer-facing language tightly scoped to the proven guest/site lanes until the full dashboard is covered by deeper tests and live proof.

## Next step
- keep claims aligned with `FEATURES.md`, `docs/claims-matrix.md`, and `docs/feature-truth-registry.md`
- only expand beyond guest/site translation after dashboard-wide runtime proof exists
