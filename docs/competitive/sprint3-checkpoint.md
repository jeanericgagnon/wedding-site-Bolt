# Sprint 3 Checkpoint (in-progress)

## Shipped in Sprint 3 so far

### Builder publish unblock depth
- Added publish issue kind plumbing from shell -> topbar checklist.
- For `no-enabled-sections` blockers, checklist now provides direct **Go to section** action.

### Template compare depth
- Quick compare mode improved with section-order diff logic.
- Diff readability upgraded with grouped chip sections:
  - Shared
  - Only in A
  - Only in B
- Mobile-friendly compare diff layout and orientation labels.
- Compare panel includes direct preview/use actions and clean reset behavior.

## Validation status (checkpoint)
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run smoke:rsvp:strict` ✅
- `npm run smoke:checkin` ✅
- `npm run smoke:csvmapper` ✅

## Remaining Sprint 3 partials (priority)
1. Extend blocker deep-link behavior beyond no-enabled-sections where issue metadata allows.
2. Add optional side-by-side section-order lane visualization (order rank chips) for compare panel.
3. Manual UX pass on builder blocked-publish path + template compare mobile flow.

## Next big batch target
- Implement #1 and #2 together, then run full gate sweep again.
