# Admin & permissions audit

Date: 2026-04-13

## Current strengths

### UI / product layer
- planner access setup exists in Settings
- role presets exist:
  - planner
  - coordinator
  - viewer
- permissions preview copy exists
- multiple dashboard surfaces respect role mode locally:
  - planning
  - guests
  - messages
  - coordinator

### Data / backend layer
- collaborator RBAC migrations exist
- role-aware policies exist in Supabase migrations
- audit-log related migrations exist

## Current weaknesses

### 1. Planner invite flow is still mostly local-storage UI
- invite record in current product layer is stored locally
- this is not a robust multi-admin system yet
- feels more like structured demo/prototype behavior than finished account collaboration

### 2. Role model mismatch
Frontend role model includes:
- owner
- planner
- coordinator
- viewer

But DB migration truth appears more centered on:
- owner
- coordinator
- viewer

That mismatch is a real smell.

### 3. Audit log UI is not clearly finished
- migrations exist
- but roadmap item says audit log UI is still pending
- no strong evidence of a complete admin-facing audit trail surface yet

### 4. White-label planner mode still looks incomplete
- planner framing exists
- planner command surfaces exist
- but true white-label / planner-branded mode is not clearly complete

## Honest conclusion
Section 10 is **not done**.
It has good groundwork, but still looks like:
- strong role framing
- partial frontend gating
- partial backend RBAC
- incomplete real collaboration/admin system

## Recommended order
1. fix role-model truth mismatch
2. make planner/admin invite persistence real
3. ship audit log UI
4. decide whether white-label planner mode matters now or later

## Next step
- 10.2 fix access-model truth and persistence gaps
