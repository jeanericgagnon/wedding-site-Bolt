# Builder V2 Cutover Checklist

Status: draft (post-lab hardening)

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
- [ ] selecting section from preview focuses rail
- [ ] selecting from rail scrolls preview to section
- [ ] toggling enabled/hidden preserves block stack
- [ ] deleting selected section reselects nearest valid section

### Block-level
- [ ] add block respects section catalog constraints
- [ ] duplicate block respects global/per-type limits
- [ ] collapse/expand state is isolated by block id
- [ ] move up/down updates preview and preserves data
- [ ] remove block updates preview and validations immediately
- [ ] required-field warnings clear when fixed

### Command/toolbar-level
- [ ] command palette actions are idempotent
- [x] import failures are non-destructive
  - Import preview/validation now resolves through `src/pages/builderV2DocumentIo.ts` before any document apply step runs
  - Invalid JSON and unusable drafts fail in preview state without producing a prepared import document
- [x] export output is valid JSON and re-importable
  - Export and import preview now share the same helper contract in `src/pages/builderV2DocumentIo.ts`
  - Round-trip coverage proves exported Builder V2 JSON re-enters the import pipeline cleanly

## 3) Regression Guardrails

- [x] unit tests for `toBuilderV2Document` and default block mapping
- [x] unit tests for import sanitization fallback (`unknown block -> text`)
- [ ] smoke test script path for `/dashboard/builder` primary route plus `/dashboard/builder-guide` fallback guide
  - Dedicated command paths now exist:
    - `npm run proof:v1:builder-v2-cutover`
    - `npm run test:e2e:builder-cutover`
  - Keep this open until a current signed browser run is logged against both routes.
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

- [ ] typecheck/build green
- [ ] QA checklist fully green
- [ ] import/export stable across 3 sample documents
- [ ] no P1 issues after canary window
- [ ] explicit sign-off
