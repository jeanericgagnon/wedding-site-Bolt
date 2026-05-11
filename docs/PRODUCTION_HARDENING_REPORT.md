# Production Hardening Report

_Updated:_ 2026-05-11 08:36 AM PT
_Branch carrying current local launch-control truth:_ `codex/v1-finish-hard-gates`
_Latest commit on branch:_ `223cba93`
_Latest verified web deploy:_ `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx` at [dayof.love](https://dayof.love)
_Important note:_ the current working tree includes additional launch-closeout changes that are deployed and proven but not yet committed

## Current Verdict

- **Readiness score:** `9.6 / 10`
- **Launch verdict:** `HOLD`
- **Production-ready:** `NO`

The public boundary work that previously blocked launch is now live, re-proved, and materially tighter. The guest/public browser no longer reads `sections` directly, persisted published-section fallback now stays server-side, and the anonymous `sections_public_visible_read` policy has been removed from the remote database. The only remaining honest launch blocker is the secure secret-backed proof lane that cannot run here because `SUPABASE_SERVICE_ROLE_KEY` is absent.

## What Closed In This Wave

### 1. Public route is now single-source again

- `SiteView` no longer falls back to browser `sections` reads.
- `PageRendererFromDB` was removed from the public path.
- Persisted published-section fallback now happens inside `public-site-access`, using the same public allowlist contract as normal published pages.

### 2. Public DTO is tighter at the network boundary

- `public-site-access` still returns a minimized public render model rather than raw top-level blobs.
- The server DTO now omits `wedding.meta`.
- Public style escape hatches `customCss`, `customClassName`, and `styleRecipeCss` were removed from the public contract.
- Browser-side sanitization now mirrors the server contract as defense-in-depth instead of carrying the main minimization burden.

### 3. Remote policy and deploy state are aligned

- `public-site-access` was redeployed.
- Production web app was redeployed and is live at [dayof.love](https://dayof.love).
- `20260511113000_remove_public_sections_visible_read.sql` was pushed remotely, removing the anonymous public `sections` read path that made the old fallback unsafe.

## Proof That Is Green

### Local / repo proof

- focused public DTO / leak / boundary tests: `PASS`
- `npm run proof:v1:public-access-coverage`: `PASS`
- `npm run typecheck -- --pretty false`: `PASS`
- `npm run lint -- --quiet`: `PASS`
- `npm run build`: `PASS`
- `npm run guard:assets`: `PASS`
- `npm run guard:file-size`: `PASS`
- `npm run proof:v1:performance-budget`: `PASS`
- `npm run proof:v1:board:md`: `PASS`
- `git diff --check`: `PASS`

### Live public proof

- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`

### Security proof already green in this workspace

- `npm run proof:v1:service-role-authorization`: `PASS` for the unauthenticated denial lane
- `npm run proof:v1:email-messaging-authorization`: `PASS` for the unauthenticated denial lane
- `npm run proof:v1:launch-closeout`: executed and blocked cleanly only on the expected missing `SUPABASE_SERVICE_ROLE_KEY`

### Additional launch-surface proof now green

- `npm run proof:v1:collaborator-access`: `PASS`
- `npm run proof:v1:coordinator-dayof`: `PASS`
- `npm run proof:v1:seating-continuity`: `PASS`
- `npm run proof:v1:registry`: `PASS`
- `npm run proof:v1:comms-center`: `PASS`
- `npm run proof:v1:prereqs`: `PASS` when rerun with network access
- `npm run proof:v1:data-integrity`: `PASS` in anon-limited mode
- `npm run proof:v1:ai-product-readiness`: `PASS`
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`: `LIVE PASS`

## What Still Blocks Launch

### 1. Secure service-role queue/storage deep proof

- `SUPABASE_SERVICE_ROLE_KEY` is not available in this workspace.
- The remaining proof still needs to show:
  - queue/storage containment
  - no arbitrary cross-site mutation
  - storage/media boundary integrity
  - no insecure fallback auth path

### 2. Secure email queue-processing deep proof

- The denial lane is already green.
- The remaining proof still needs to show:
  - queue authorization
  - send authorization
  - recipient scoping
  - collaborator restrictions
  - queue isolation
  - public abuse resistance

## Remaining Confidence Gaps That Are Not Current Code Failures

- `registry`, `comms-center`, `collaborator-access`, `coordinator-dayof`, and `seating-continuity` all have green automation now.
- Their proof outputs still recommend real runtime notes if we want literal 10/10 operator confidence for owner/collaborator/day-of usage, rather than only automated confidence.
- `data-integrity` is green in anon-limited mode, but full cross-table integrity still naturally belongs with the secure service-role lane.
- Those advisory runtime-note tasks are now centralized in `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-runtime-operator-notes-checklist.md`.

## Deployment Status

| Surface | State | Notes |
| --- | --- | --- |
| web app | `LIVE PASS` | Vercel deployment `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`, aliased to [dayof.love](https://dayof.love) |
| `public-site-access` | `LIVE PASS` | redeployed; covered by live public proof |
| public `sections` policy removal migration | `DEPLOYED` | applied remotely with `supabase db push` |
| `process-email-queue` | `DEPLOYED` | secure deep proof still pending |
| `photo-upload` | `DEPLOYED` | secure deep proof still pending |

## Exact Finish Path

1. Run `npm run proof:v1:service-role-authorization` in a secure environment that has `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `npm run proof:v1:email-messaging-authorization` in that same environment.
3. Prefer the bundled final lane:
   - `npm run proof:v1:launch-closeout`
4. Record the secure proof outputs in:
   - `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md`
   - `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_REPORT.md`
   - `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md`
5. The bundle also reruns:
   - `npm run proof:v1:board:md`
   - `git diff --check`
6. Only after those secure proofs are green should launch status move from `HOLD` to `GO`.

## Bottom Line

We are no longer stuck on public payload architecture or deploy ambiguity. The website is now in a narrow finish state: repo-side hardening is live and proven, and the remaining launch block is the secure secret-backed authorization proof lane.
