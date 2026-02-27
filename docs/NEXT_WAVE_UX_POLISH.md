# Next Wave — UX Polish Execution Plan

## Goal
Close the remaining quality gap to The Knot by improving perceived polish and reducing user friction in three places:

1. Builder top bar clarity (save/publish state confidence)
2. Section-level visual consistency (spacing, typography rhythm)
3. Media placement guidance (Hero / Story / Gallery mapping cues)

## Batch A — Builder Confidence (High impact)
- [ ] Unify status language across save/publish flows (`Saved`, `Saving…`, `Publishing…`, `Published vN`).
- [ ] Add explicit “ready to publish” indicator when blockers clear.
- [ ] Keep “Fix blockers” visible on desktop and compact on mobile.
- [ ] Ensure success/error notices never overlap critical controls.

## Batch B — Visual Rhythm (High impact)
- [ ] Normalize section heading scale + margin spacing defaults.
- [ ] Normalize card spacing in overview/checklist surfaces.
- [ ] Reduce inconsistent chip/badge styling variants.
- [ ] QA on narrow mobile breakpoints for text wrapping.

## Batch C — Media Guidance (High impact)
- [ ] Add upload-slot helper labels in Builder where photos are expected.
- [ ] Add helper hints for recommended aspect ratio per slot.
- [ ] Add fallback ordering guidance for first-time users.
- [ ] Add short “photo placement” doc link from Builder top area.

## QA Gates per batch
- `npm run -s typecheck`
- `npm run -s build`
- targeted tests when logic changes
- desktop + mobile manual pass

## Completion standard
- No regressions in publish flow
- No regressions in setup->builder hydration
- all checks green before push
