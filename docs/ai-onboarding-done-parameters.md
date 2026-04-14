# AI onboarding done parameters

## Operating rule
Work in large batches. Do not report completion until the batch exit condition is fully met.
No scaffolding theater. No partial wins dressed up as done.

## Done parameters
### D1. Conversational onboarding works
- natural guided flow
- resume / skip / back works
- partial progress saves cleanly

### D2. Canonical profile is real
- one canonical `weddingProfile`
- onboarding / overview / refresh use same shape
- no duplicate competing sources of truth in the core flow

### D3. Enough-to-draft exists
- required vs optional fields defined
- readiness evaluator exists in code
- system knows when it can draft

### D4. AI extraction / orchestration exists
- extraction contract exists
- orchestration state exists
- next-question logic exists
- conflict / confidence handling exists

### D5. Draft generation works
- generates useful site content
- writes to real live-rendered data paths
- visible site output changes from generated draft

### D6. Refresh / regenerate is safe
- generated fields refresh safely
- user-edited content is protected

### D7. Dashboard / builder loop is complete
- brief visible
- refine / resume works
- refresh works
- site and builder stay in sync

### D8. Runtime QA is real
- browser-tested on clean QA site/account
- visible site changes confirmed

### D9. Production hardening exists
- no schema-drift landmines in core path
- graceful failures
- telemetry/logging exists

## Batch plan
### Batch A — Foundation lock
- finalize onboarding shell
- finalize canonical `weddingProfile`
- add readiness / enough-to-draft rules
- clean save / load / resume / profile truth

#### Batch A exit condition
1. canonical `weddingProfile` is expanded and stable
2. required / optional / inferred fields are defined
3. readiness / enough-to-draft logic exists in code
4. onboarding save / load / resume all use the same truth cleanly
5. no obvious duplicate truth layers remain in this flow
6. typecheck / build pass
7. runtime sanity check passes for Batch A scope

### Batch B — AI brain
- extraction contract
- orchestration state
- next-question logic
- conflict / confidence handling

### Batch C — Draft generation
- generate hero / story / event / RSVP starter content
- map to real live-rendered paths
- visible site change from profile

### Batch D — Safe regeneration
- provenance coverage
- user-edited protection
- safe refresh / regenerate behavior

### Batch E — Hardening
- clean QA site
- schema/runtime cleanup
- browser QA matrix
- telemetry/logging
