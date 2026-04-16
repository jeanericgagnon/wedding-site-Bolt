# Builder canonical truth plan

## Batch A — current shape inventory

### Current structural truth split

1. `src/types/layoutConfig.ts`
- active builder/layout shape for page + section editing
- uses `settings`, `bindings`, `enabled`, `overrides`

2. `src/sections/types.ts`
- separate section instance contract for parsed section rendering
- uses `data`, `order`, `visible`, `schemaVersion`

3. `src/builder-v2/contracts.ts`
- separate block/section document model for builder-v2 lab
- uses `blocks[]` inside sections

### Why this matters
Right now the repo has multiple valid-looking structural contracts for sections/pages.
That means schema logic, defaults, validation, and renderer assumptions can drift.

## Canonical target

Use `src/lib/canonicalPageContract.ts` as the repo-wide structural target for migration.

### Canonical section
- `id`
- `type`
- `variant`
- `props`
- optional `bindings`
- optional `visible`
- optional `locked`
- optional `schemaVersion`
- optional `meta`

### Canonical page
- `id`
- optional `title`
- `sections[]`

### Canonical document
- `version: canonical-page-v1`
- optional `templateId`
- `pages[]`
- optional `meta`

## Migration intent

### Batch B
- centralize registry declarations around canonical section contracts
- schema/defaults/component/variant in one place

### Batch C
- add adapters:
  - layoutConfig -> canonical page
  - parsed section shape -> canonical section
  - builder-v2 document -> canonical page document

### Batch D
- validate templates against canonical contract + registry

### Batch E
- simplify renderer around canonical normalized sections
- keep compatibility adapters until live data is proven migrated

## Non-goal
Do **not** delete old paths just because a canonical contract now exists.
Migration must be additive first, destructive only after proof.
