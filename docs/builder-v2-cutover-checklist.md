# Builder V2 Cutover Checklist

Status: draft (post-lab hardening, tracker-aligned 2026-05-28 PT)

## Tracker Alignment

- 2026-05-28 11:41 PDT: reconciled the active Builder V2 tracker rows in `outputs/full-v2-tracker/dayof-full-v2-milestone-tracker.xlsx` against this checklist and the current verified commit history.
- Aligned rows:
  - `V2-03.06` -> `Done`
  - `V2-25.05` -> `In progress`
  - `V2-25.06` -> `In progress`
  - `V2-G03` -> `Done`
  - `V2-G14` -> `In progress`
- Remaining honest blockers did not change:
  - legacy photo/polish escapes still live in `/dashboard/builder-v1`
  - broader exit-bar gates (`G02`, `G04` through `G08`, canary-window evidence, explicit sign-off) remain open

## 1) Data Contract

- [x] Define `BuilderV2Document` contract (`src/builder-v2/contracts.ts`)
- [x] Add adapter skeleton from `SectionInstance[]` (`src/builder-v2/adapter.ts`)
- [x] Add lab import/export JSON round-trip
- [x] Add strict runtime validator (shape + supported block types)
- [x] Add version migration policy (`v2` -> future)
  - Builder V2 now accepts only the current `v2` document version plus the known `"2"` alias drift
  - Legacy `v1` inputs still migrate only through the explicit layout-config/builder-project adapters
  - Future or unknown Builder V2 version tokens fail honestly instead of being silently coerced

## 2) Editor Behavior QA

### Section-level
- [x] selecting section from preview focuses rail
  - `src/pages/builderV2SelectionInteraction.test.ts` proves preview selections always carry a rail-focus intent, including the first click before editor-open mode
- [x] selecting from rail scrolls preview to section
  - `src/pages/builderV2SelectionInteraction.test.ts` proves the primary rail selection path stays wired to preview scrolling
- [x] toggling enabled/hidden preserves block stack
  - `src/pages/builderV2SectionVisibilityState.test.ts` proves hide/show changes preserve the existing section block storage instead of rewriting or dropping block stacks
- [x] deleting selected section reselects nearest valid section
  - `src/pages/builderV2SectionLifecycle.test.ts` proves section removal preserves the nearest valid next selection instead of dropping the editor into an orphaned state

### Block-level
- [x] add block respects section catalog constraints
  - `src/pages/builderV2BlockEditorState.test.ts` proves both total-block and per-type section caps block unsafe adds before they mutate the document
- [x] duplicate block respects global/per-type limits
  - `src/pages/builderV2BlockOperations.test.ts` covers the blocked duplicate path when per-type section limits say no
- [x] collapse/expand state is isolated by block id
  - `src/pages/builderV2BlockEditorState.test.ts` proves collapse toggles only flip the targeted block id while preserving every other block's editor state
- [x] move up/down updates preview and preserves data
  - `src/pages/builderV2BlockOperations.test.ts` now proves reordered blocks keep their authored payloads intact while the sequence changes
- [x] remove block updates preview and validations immediately
  - `src/pages/builderV2BlockReviewModel.test.ts` now proves removing a warning block drops it out of the live review lane and clears the visible warning count immediately
- [x] required-field warnings clear when fixed
  - `src/pages/builderV2BlockValidation.test.ts` proves the live warning layer clears as soon as missing qna/contact data is restored

### Command/toolbar-level
- [x] command palette actions are idempotent
  - `src/pages/builderV2CommandPaletteExecution.test.ts` proves repeated triggers of the same command are ignored within one open palette session, while new sessions still allow the action again
- [x] import failures are non-destructive
  - Import preview/validation now resolves through `src/pages/builderV2DocumentIo.ts` before any document apply step runs
  - Invalid JSON and unusable drafts fail in preview state without producing a prepared import document
- [x] export output is valid JSON and re-importable
  - Export and import preview now share the same helper contract in `src/pages/builderV2DocumentIo.ts`
  - Round-trip coverage proves exported Builder V2 JSON re-enters the import pipeline cleanly

## 3) Regression Guardrails

- [x] unit tests for `toBuilderV2Document` and default block mapping
- [x] unit tests for import sanitization fallback (`unknown block -> text`)
- [x] smoke test script path for `/dashboard/builder` primary route plus `/dashboard/builder-guide` fallback guide
  - Dedicated command paths now exist:
    - `npm run proof:v1:builder-v2-cutover`
    - `npm run test:e2e:builder-cutover`
  - Localhost signed-owner coverage now has a dedicated spec:
    - `tests/e2e/builder-cutover-local-auth.spec.ts`
    - `scripts/playwright-builder-cutover-smoke.mjs` includes it automatically when `PLAYWRIGHT_BASE_URL` points at localhost
  - Current local execution note (2026-05-28 PT): `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:builder-cutover` passed `8/8`, including signed-local owner coverage for `/dashboard/builder`, `/dashboard/builder-guide`, `/dashboard/builder-v1`, auth-fallback coverage for unsigned access, and mobile viewport coverage.
  - This lane is now closed for local browser proof; remaining Builder V2 follow-up is public runtime parity and the legacy photo/polish cleanup tracked elsewhere.
- [x] CI gate includes typecheck + build + v2 adapter tests
  - Local/CI command: `npm run proof:v1:builder-v2-ci-gate`
  - Workflow hook: `.github/workflows/ci-hardpass.yml` -> `Builder V2 cutover gate`

## 4) Rollout Strategy

- [x] add internal feature flag (`builderV2Enabled`) in builder entry path
  - Env switch: `VITE_BUILDER_V2_ENABLED`
  - Default: `true` to preserve the promoted `/dashboard/builder` and `/builder` V2 behavior
  - Rollback/canary behavior: set `VITE_BUILDER_V2_ENABLED=false` to send the default builder entry routes back to the explicit guide path without rewriting links
- [x] keep `/builder-v2-lab` as fallback for one release cycle
  - The lab route stays available behind local-dev or `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
  - When tooling routes are off, `/builder-v2-lab` falls back to the explicit `/builder-guide` handoff instead of exposing the internal route by accident
- [x] canary rollout (internal/demo accounts first)
  - Audience switch: `VITE_BUILDER_V2_AUDIENCE=internal`
  - Internal audience currently means DayOf accounts (`@dayof.love`) plus demo-mode sessions
  - Default remains `all` so current promoted behavior does not change unless we intentionally narrow it
- [x] capture telemetry: add/duplicate/remove/import/export failure rates
  - Session-local internal rollout signal now lives in `src/pages/builderV2RolloutTelemetry.ts`
  - Builder V2 export review surfaces show the current browser-session failure-rate summary without claiming external analytics coverage
- [x] document rollback procedure (`/builder` route hard switch)
  - Set `VITE_BUILDER_V2_ENABLED=false` to move `/dashboard/builder` and `/builder` back to the explicit guide flow without rewriting links
  - If the issue only affects general audience traffic, set `VITE_BUILDER_V2_AUDIENCE=internal` first so DayOf and demo accounts can keep using V2 while everyone else sees the guide
  - Keep `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true` only for the limited fallback window where `/builder-v2-lab` still needs to stay reachable for internal recovery work
  - Rerun `npm run proof:v1:builder-v2-ci-gate` after the switch so the route contract, rollback behavior, and build stay verified

## 5) Exit Criteria

Cutover to main `/dashboard/builder` and `/builder` only when all are true:

- [x] typecheck/build green
- [x] QA checklist fully green
- [x] import/export stable across 3 sample documents
  - `src/pages/builderV2SampleDocuments.test.ts` proves native Builder V2, legacy layout-config, and legacy builder-project samples all stay usable after import, export, and re-import
  - `npm run proof:v1:builder-v2-cutover` now includes that three-sample round-trip lane
- [ ] no P1 issues after canary window
- [ ] explicit sign-off
