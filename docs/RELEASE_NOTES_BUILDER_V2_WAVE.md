# Release Notes — Builder V2 Wave (Local, pre-push)

## Summary
This wave focuses on publish-flow reliability, setup-to-builder hydration quality, and test coverage hardening.

## Core improvements

### Publish flow reliability
- Centralized publish readiness checks in shared utilities.
- Added consistent blocker hints and route intent parsing helpers.
- `publishNow=1` handoff now uses explicit decision logic (`skip` / `fix-blockers` / `publish`).
- Builder top bar + shell use shared logic to reduce drift.

### Overview guidance quality
- Setup checklist and publish readiness mapping extracted to `overviewUtils`.
- Added helper-driven progress + first-blocker logic for Fix Next/Fix blockers actions.
- Reduced inline dashboard logic by relying on tested utility functions.

### Setup hydration + defaults
- Extracted setup draft hydration logic to a dedicated utility.
- Improved first-run copy defaults when setup has partial data:
  - story
  - wedding message
  - rsvp message
  - travel notes
- Preserves existing authored content (fills only missing fields).

### Docs and workflow
- Added engagement photo upload mapping doc.
- Added content defaults guide for first-run experience.
- Added local `.gitignore` patterns for raw photo intake folders.

## Testing additions
- `publishReadiness.test.ts`
- `publishUiHints.test.ts`
- `overviewUtils.test.ts` (expanded)
- `setupDraftHydration.test.ts`
- `publishNowFlow.test.ts`

All newly added utility suites pass locally, with typecheck/build green.

## Status
- Local commits only (no push in this wave unless explicitly requested).
