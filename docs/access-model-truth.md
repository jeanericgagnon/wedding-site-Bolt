# Access model truth

Date: 2026-04-13

## Safe 10.2 decision
Do not mutate backend RBAC yet.
First, make frontend truth match the current backend truth and stop implying more persistence than actually exists.

## Current backend truth
Backend RBAC migration currently models:
- owner
- coordinator
- viewer

## Current frontend mismatch
Frontend product language currently models:
- owner
- planner
- coordinator
- viewer

That means `planner` is currently a product-layer role concept, not a proven backend-enforced role.

## Safe path
### Keep for now
- planner as UI-facing invite label / preset
- local access-mode UX for demos and product framing

### Clarify now
- planner should map to coordinator-level backend truth until real backend planner role exists
- planner invite persistence is currently local/demo-like unless backed by collaborator records

## What to change safely now
1. document that planner is a product preset layered over current RBAC truth
2. reduce misleading persistence language in settings if needed
3. avoid claiming full multi-admin persistence is done

## What NOT to change in safe 10.2
- do not rewrite DB role enums yet
- do not silently widen backend permissions
- do not fake real collaboration persistence if it is still local-only

## Next move after safe 10.2
- either:
  - implement real collaborator persistence
  - or relabel planner access more honestly until that exists
