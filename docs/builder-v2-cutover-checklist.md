# Builder V2 Cutover Checklist

Status: draft (post-lab hardening)

## 1) Data Contract

- [x] Define `BuilderV2Document` contract (`src/builder-v2/contracts.ts`)
- [x] Add adapter skeleton from `SectionInstance[]` (`src/builder-v2/adapter.ts`)
- [x] Add lab import/export JSON round-trip
- [x] Add strict runtime validator (shape + supported block types)
- [ ] Add version migration policy (`v2` -> future)

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
- [ ] import failures are non-destructive
- [ ] export output is valid JSON and re-importable

## 3) Regression Guardrails

- [x] unit tests for `toBuilderV2Document` and default block mapping
- [ ] unit tests for import sanitization fallback (`unknown block -> text`)
- [ ] smoke test script path for `/builder-v2-lab`
- [ ] CI gate includes typecheck + build + v2 adapter tests

## 4) Rollout Strategy

- [ ] add internal feature flag (`builderV2Enabled`) in builder entry path
- [ ] keep `/builder-v2-lab` as fallback for one release cycle
- [ ] canary rollout (internal/demo accounts first)
- [ ] capture telemetry: add/duplicate/remove/import/export failure rates
- [ ] document rollback procedure (`/builder` route hard switch)

## 5) Exit Criteria

Cutover to main `/builder` only when all are true:

- [ ] typecheck/build green
- [ ] QA checklist fully green
- [ ] import/export stable across 3 sample documents
- [ ] no P1 issues after canary window
- [ ] explicit sign-off
