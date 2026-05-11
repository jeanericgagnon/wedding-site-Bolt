# Website Launch Backlog

| Field | Current State |
| --- | --- |
| Current readiness score | `9.6 / 10` |
| Current launch verdict | `HOLD` |
| Production-ready | `NO` |
| Latest branch | `codex/v1-finish-hard-gates` |
| Latest commit | `223cba93` (current working tree includes additional uncommitted launch-closeout changes) |
| Latest deploy status | Web app is `LIVE PASS` at [dayof.love](https://dayof.love) via Vercel deployment `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`; `public-site-access` was redeployed; `20260511113000_remove_public_sections_visible_read.sql` was pushed remotely with `supabase db push` |
| Current blockers | Secure service-role queue/storage deep proof and secure email queue-processing deep proof are still `NOT RUN` in this workspace because `SUPABASE_SERVICE_ROLE_KEY` is absent |
| Current proof state | Public DTO/leak tests, `proof:v1:public-access-coverage`, `typecheck`, `lint`, `build`, `guard:assets`, `guard:file-size`, `performance-budget`, `proof:v1:board:md`, `git diff --check`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, `collaborator-access`, `coordinator-dayof`, `seating-continuity`, `registry`, `comms-center`, `prereqs`, `data-integrity` (anon-limited), `ai-product-readiness`, and live `ai-clearance` are green; unauthenticated denial lanes for service-role/email authorization are green; `proof:v1:launch-closeout` was executed and blocked cleanly on the missing secure secret |
| Current next actions | 1) set `SUPABASE_SERVICE_ROLE_KEY` in the secure proof env, 2) run `npm run proof:v1:launch-closeout`, 3) record outputs in the report/smoke log, 4) flip launch verdict only if the closeout bundle is green |

## Launch Question

- Can we safely launch today? `NO` from this workspace.
- Why not:
  - The repo-side public boundary work is now live and re-proved.
  - The only honest launch blocker left is the secure secret-backed authorization lane that cannot run here without `SUPABASE_SERVICE_ROLE_KEY`.

## Current Canonical Status

- `public-site-access` is now the single public site resolver used by the browser.
- The public `sections` browser-read side door was removed from `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/SiteView.tsx`.
- Persisted published-section fallback now happens server-side inside `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/functions/public-site-access/index.ts`.
- `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/migrations/20260511113000_remove_public_sections_visible_read.sql` drops the anonymous/public `sections_public_visible_read` policy, and that migration was applied remotely.
- The public DTO no longer returns raw `site_json`, `published_json`, `wedding_data`, or `layout_config`.
- The public DTO also strips `wedding.meta`, `customCss`, `customClassName`, and `styleRecipeCss`.
- Public render shaping, persisted-section fallback shaping, and browser-side sanitization now use the same least-privilege contract.
- Local gate is green, live public proof is green, and remaining launch risk is now entirely in the secure-env proof lane.

## Current Launch Blockers

### Secure Service-Role Queue/Storage Deep Proof

- Status: `BLOCKED ON SECURE ENV`
- Severity: `CRITICAL`
- Why it matters:
  - Final launch sign-off still requires a fresh runtime proof that service-role guarded queue/storage/media flows cannot mutate arbitrary sites or cross privacy boundaries.
- Current truth:
  - `npm run proof:v1:service-role-authorization` already passes the unauthenticated denial lane.
  - `SUPABASE_SERVICE_ROLE_KEY` is empty in this workspace (`wc -c = 0`), so the secure deep lane cannot run here.
- Required environment:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - authenticated Supabase CLI access if control-plane inspection becomes necessary
- Required proof:
  - `npm run proof:v1:service-role-authorization`
  - bundled closeout: `npm run proof:v1:launch-closeout`
- Must prove:
  - unauthorized actors are denied
  - limited collaborators stay scoped
  - queue processors cannot mutate arbitrary sites
  - no cross-site mutation path exists
  - storage/media boundaries hold
  - no insecure fallback auth path exists
- Exit bar:
  - The secure runtime lane is green and recorded in the backlog, report, and smoke log.

### Secure Email / Queue-Processing Deep Proof

- Status: `BLOCKED ON SECURE ENV`
- Severity: `HIGH`
- Why it matters:
  - The unauthenticated denial lane is green, but launch sign-off still needs the secret-backed queue-processing proof.
- Current truth:
  - `npm run proof:v1:email-messaging-authorization` already passes the unauthenticated denial lane.
  - The secure queue-processing lane is still `NOT RUN` here because `SUPABASE_SERVICE_ROLE_KEY` is absent.
- Required proof:
  - `npm run proof:v1:email-messaging-authorization`
  - bundled closeout: `npm run proof:v1:launch-closeout`
- Must prove:
  - queue authorization
  - send authorization
  - recipient scoping
  - collaborator restrictions
  - queue isolation
  - public abuse resistance
- Exit bar:
  - Secure queue-processing proof is green and recorded under the same secure launch lane.

## Critical Resolved This Wave

### Public `sections` Browser-Read Side Door

- Status: `RESOLVED`
- What changed:
  - Removed `fetchPublishedSections(...)` from the public `SiteView` flow.
  - Removed `PageRendererFromDB` from the public render path.
  - Moved persisted published-section fallback into the server-side `public-site-access` resolver.
  - Added a migration to drop `sections_public_visible_read` and pushed it to the linked remote database.
- Proof:
  - focused public boundary tests: `PASS`
  - `npm run proof:v1:public-access-coverage`: `PASS`
  - live public proof rerun: `LIVE PASS`

### Strict Public DTO Minimization

- Status: `RESOLVED`
- What changed:
  - `public-site-access` remains the only public resolver.
  - The server DTO now omits `wedding.meta`.
  - Public style escape hatches `customCss`, `customClassName`, and `styleRecipeCss` were removed from the public contract.
  - Browser-side sanitizer mirrors the stricter contract as defense-in-depth.
  - Persisted-section fallback is converted through the same allowlisted page/section builder as normal public pages.
- Proof:
  - public DTO/leak tests: `PASS`
  - `proof:v1:public-access-coverage`: `PASS`
  - live `public-quality`: `LIVE PASS`

### Deploy And Live Public Proof Alignment

- Status: `RESOLVED`
- What changed:
  - `public-site-access` was redeployed.
  - Production web app was redeployed to [dayof.love](https://dayof.love) as `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`.
  - The `sections_public_visible_read` removal migration was pushed to the remote database.
- Proof:
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: `LIVE PASS`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: `LIVE PASS`
  - `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`

## Non-Critical Before Launch

### Asset / CDN Tightening

- Status: `DEFERRED UNLESS BUDGETS FAIL`
- Current truth:
  - `npm run guard:assets`: `PASS`
  - `npm run guard:file-size`: `PASS`
  - `npm run proof:v1:performance-budget`: `PASS`
- Do only if new proof fails or a new public payload regression appears.

### Repo Cleanup / Artifact Pruning

- Status: `DEFERRED`
- Current truth:
  - There are duplicate docs, screenshot folders, and test-result directories in the worktree.
  - They are noisy, but they are not website launch blockers.
- Do after the secure proof lane or as a separate cleanup pass.

### Runtime Operator Notes For Literal 10/10 Confidence

- Status: `PENDING NOTES`
- Current truth:
  - `registry`, `comms-center`, `collaborator-access`, `coordinator-dayof`, and `seating-continuity` are green in automation.
  - Their proof outputs still call for real runtime notes on owner/collaborator/day-of usage if we want fully human-validated confidence beyond automated coverage.
  - Those runtime-note tasks are now centralized in `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-runtime-operator-notes-checklist.md`.
- Why it matters:
  - This is no longer “known breakage” territory.
  - It is the gap between strong automation and literal top-end launch confidence.
- Do if time and credentials are available:
  - log a real registry import/edit/purchase-state pass
  - log a real messaging draft/send/history pass
  - log a real collaborator invite/claim/forbidden-action pass
  - log a real coordinator runtime pass
  - log a real seating assignment/lookup/counts pass

## Non-Critical After Launch / Deferred

- broader dashboard extraction
- cosmetic refactors
- duplicate artifact cleanup
- historical screenshot pruning
- optional maintainability decomposition outside launch/security proof

## Current Validation Matrix

| Command / Proof | Status | Notes |
| --- | --- | --- |
| focused public DTO / leak / boundary tests | `PASS` | `publicSiteRenderModel`, `publicSiteAccess`, `publicGuestSurfaceBoundary`, `publicAccessCoverageProofScript`, `launchEdgeFunctions`, `SiteView`, and `siteViewService` |
| `npm run proof:v1:public-access-coverage` | `PASS` | static proof covers single-source public resolver and no browser `sections` reads |
| `npm run typecheck -- --pretty false` | `PASS` | local |
| `npm run lint -- --quiet` | `PASS` | local |
| `npm run build` | `PASS` | local |
| `npm run guard:assets` | `PASS` | local |
| `npm run guard:file-size` | `PASS` | local |
| `npm run proof:v1:performance-budget` | `PASS` | local |
| `npm run proof:v1:board:md` | `PASS` | backlog-driven proof board now matches the current launch-control doc |
| `git diff --check` | `PASS` | trailing whitespace fixed after doc refresh |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | rerun after deploy and DB policy removal |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | rerun escalated after sandbox-only Playwright restriction |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | rerun escalated after sandbox DNS restriction |
| `npm run proof:v1:collaborator-access` | `PASS` | automation green; runtime invite/claim notes still advisable |
| `npm run proof:v1:coordinator-dayof` | `PASS` | automation green; real event-flow notes still advisable |
| `npm run proof:v1:seating-continuity` | `PASS` | automation green; assignment/lookup notes still advisable |
| `npm run proof:v1:registry` | `PASS` | automation green; runtime import/edit/purchase-state notes still advisable |
| `npm run proof:v1:comms-center` | `PASS` | automation green after proof-guard refresh; runtime draft/send/history notes still advisable |
| `npm run proof:v1:prereqs` | `PASS` | required migrations/functions/tables/edge endpoints reachable when run with network access |
| `npm run proof:v1:data-integrity` | `PASS` | anon-limited mode; full cross-table integrity still benefits from service-role proof |
| `npm run proof:v1:ai-product-readiness` | `PASS` | static AI product readiness green |
| `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` | `LIVE PASS` | `migration_applied_and_readback_green` |
| `npm run proof:v1:runtime-note-checklist` | `PASS` | canonical advisory checklist exists for final human runtime notes |
| `npm run proof:v1:service-role-authorization` | `PASS` | unauthenticated denial lane only |
| secure service-role queue/storage deep proof | `NOT RUN` | blocked on missing `SUPABASE_SERVICE_ROLE_KEY` |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | unauthenticated denial lane only |
| secure email queue-processing deep proof | `NOT RUN` | blocked on missing `SUPABASE_SERVICE_ROLE_KEY` |
| `npm run proof:v1:launch-closeout` | `NOT RUN` | final secure closeout bundle was executed and reported only the expected `missing_service_role_key` blockers |

## Deployment Status

| Surface | State | Notes |
| --- | --- | --- |
| web app | `LIVE PASS` | [dayof.love](https://dayof.love) on Vercel deployment `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx` |
| `public-site-access` | `LIVE PASS` | redeployed with `--no-verify-jwt`; covered by `canonical-smoke` and `public-quality` |
| `20260511113000_remove_public_sections_visible_read.sql` | `DEPLOYED` | remote DB policy removal applied with `supabase db push` |
| `interactive-section-public` | `DEPLOYED` | unchanged in this wave; covered by current public gate inventory |
| `vault-contribution-public` | `DEPLOYED` | unchanged in this wave; covered by current public gate inventory |
| `public-itinerary-by-slug` | `DEPLOYED` | unchanged in this wave; still part of public route surface inventory |
| `process-email-queue` | `DEPLOYED` | secure queue-processing deep proof still `NOT RUN` |
| `photo-upload` | `DEPLOYED` | secure storage/media deep proof still `NOT RUN` |
| shared public DTO helpers / tests | `LOCAL ONLY` | repo-only support code bundled into web/function deploys |

## Next 10 Tasks

1. Provide `SUPABASE_SERVICE_ROLE_KEY` in the secure proof environment.
2. Run `npm run proof:v1:launch-closeout`.
3. Confirm the bundled `service-role-authorization` lane is green for unauthorized denial, collaborator scoping, queue/storage isolation, cross-site mutation, and storage/media containment.
4. Confirm the bundled `email-messaging-authorization` lane is green for queue authorization, recipient scoping, collaborator restriction, queue isolation, and abuse resistance.
5. Confirm the bundled `proof:v1:board:md` step is green.
6. Confirm the bundled `git diff --check` step is green.
7. Update `BACKLOG.md`, `docs/PRODUCTION_HARDENING_REPORT.md`, and `docs/v1-smoke-proof-log.md` with the secure proof outputs.
8. If the bundle is green, promote the launch verdict to `GO`.
9. If the bundle is green, promote `Production-ready` to `YES`.
10. Only then spend time on non-critical cleanup or follow-on hardening.

## Resolved Work Summary

- Removed public browser `sections` reads from `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/SiteView.tsx`.
- Moved persisted published-section fallback into `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/functions/public-site-access/index.ts`.
- Tightened `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/lib/publicSiteRenderModel.ts` and `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/lib/publicSiteAccess.ts` so the public network payload is smaller and stricter.
- Added regression coverage for persisted-section fallback leakage, direct-browser-read regressions, and public DTO field drift.
- Redeployed `public-site-access`, redeployed the production web app, pushed the `sections` policy removal migration, and reran the live public proof lane successfully.
