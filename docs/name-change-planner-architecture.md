# Name Change Planner Architecture

## Goal

Add an engine-first US name change planner inside Dayof with launch scope limited to:

- federal sequencing
- California resident workflows
- guidance and workflow generation only
- optional document intake as an accelerator, not a dependency

## Foundation shipped in this phase

### Data model

New Supabase tables:

- `name_change_cases` — canonical structured profile and workflow state per wedding site
- `name_change_documents` — masked metadata only for optional intake artifacts
- `name_change_extracted_fields` — structured extracted/manual fields the engine reads
- `name_change_plan_snapshots` — generated workflow payloads for audit/history

### Engine modules

- `src/lib/nameChange/types.ts` — shared domain contracts
- `src/lib/nameChange/registry.ts` — seeded federal + California form registry and institution library
- `src/lib/nameChange/engine.ts` — eligibility + sequencing engine

### Product surface

Inside `Dashboard > Planning > Name change`:

- case setup input
- optional intake metadata toggles
- structured fields editor
- generated workflow plan
- simple admin/review panel for seeded forms and institution rules

## Product rules enforced

- planner is guidance, not legal filing automation
- structured fields outrank raw uploads
- raw docs are represented as masked metadata only in this phase
- engine is registry-driven and modular, not hardcoded checklist-only UI
- federal-first / California-second ordering is explicit
- minimum-data posture: no raw file storage dependency, no sensitive unmasked values in planner UI defaults

## Engine behavior in v1

### Eligibility

- California marriage path is supported for straightforward surname adoption / hyphenation patterns tied to spouse surname
- custom changes outside that narrow path are routed to the California court-order path

### Sequencing

1. legal proof readiness
2. SSA update
3. California DMV update
4. passport if relevant
5. employer / institutions / downstream accounts

## Known gaps after this batch

- collaborator-aware RLS parity is not yet added for planner/coordinator roles on name change tables
- no OCR/file ingestion pipeline yet; only masked metadata + structured field capture
- no public-facing marketing route or onboarding entry yet beyond dashboard planning
- registry overrides are code-seeded, not DB-editable
- no county-specific court packet variants yet beyond California-wide packet guidance
