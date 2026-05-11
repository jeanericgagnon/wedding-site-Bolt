# Production Hardening Control Board

| Field | Current State |
| --- | --- |
| Current readiness score | `8.9 / 10` |
| Current launch verdict | `HOLD` |
| Production-ready | `NO` |
| Latest branch | `codex/v1-finish-hard-gates` |
| Latest commit | `9c976a26` `Tighten public site render boundary` |
| Latest deploy status | Production web deploy `LIVE` at [dayof.love](https://dayof.love) via Vercel deployment `dpl_68n9YLtWy67VxmqziaVYQAACKHqL`; `public-site-access` redeployed with `--no-verify-jwt` and `LIVE PASS`; canonical smoke, public-quality, and guests / RSVP ops are green on the live runtime |
| Current blockers | Secure service-role queue/storage deep proof still lacks a fresh secure-env runtime rerun; final launch-control closeout still needs the deployment/validation/asset tables tightened to current proof-board truth |
| Current proof state | Strict public render DTO is now `LIVE PASS`; nested leak tests, public-access coverage, typecheck, lint, build, and focused public regression tests are green locally; production canonical smoke is `LIVE PASS`; public-quality is `LIVE PASS`; guests / RSVP ops is `LIVE PASS`; unauthenticated denial lanes for email and service-role proofs are `LIVE PASS`; the only ungated launch blocker left in the repo proof board is secure service-role queue/storage proof, while deeper email queue processing proof remains folded into that secure lane until a secret-backed rerun is available |
| Current next actions | Finish secure service-role queue/storage proof in a secure env; tighten the launch-control docs to the final proof-board truth; close or downgrade the asset/CDN item with measured evidence |

## Current Canonical Status

- The app is materially safer than it was before the production deploy, but it is not at a true `10 / 10` launch state.
- The highest remaining product risk is public payload scope, not dashboard extraction, route decomposition, or cosmetic cleanup.
- Raw database blobs are no longer returned directly on the main `public-site-access` lane.
- The stricter render-only DTO is now deployed and live-validated, with the browser contract reduced to public `pages`, `wedding`, and `theme`.
- `public-site-access` also required runtime policy alignment and is now deployed with `--no-verify-jwt` so the public route can actually resolve under the publishable-key browser path.
- Production runtime proof improved meaningfully on `2026-05-09`: web is live, public-function deploy alignment is better, canonical smoke is green, public-quality is green, and guests / RSVP ops is green.
- Secure deep proof remains incomplete because this workspace does not have `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, or an authenticated Supabase CLI session.

## Current Launch Blockers

1. **Raw public-site payload minimization**
   - Status: `LIVE PASS`
   - Why it no longer blocks: the strict render-only DTO is now deployed, the public route resolves successfully in production, and the live public-quality suite proves the guest-visible path renders with canonical row identity instead of stale embedded snapshots.
   - Current evidence:
     - `site_json`, `published_json`, `wedding_data`, and `layout_config` are no longer returned directly by `public-site-access`.
     - `src/lib/publicSiteAccess.ts` now invokes the resolver through the shared Supabase client instead of a raw `Authorization` header path that production rejected.
     - `src/pages/SiteView.tsx` now hydrates from the reduced DTO and no longer branches over `builderProject` / `layoutConfig`.
     - `src/data/siteRepository.ts` legacy public read helper is quarantined to metadata-only columns.
     - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` is `LIVE PASS`.

2. **Secure service-role queue/storage proof**
   - Status: `OPEN`
   - Why it blocks: launch sign-off still needs a fresh secure-env runtime rerun proving queue/storage containment, no cross-site mutation paths, and no insecure fallback auth paths.
   - Current evidence:
     - historical secure proof was logged earlier in the hardening diary
     - current workspace cannot rerun the deep secure lane because `SUPABASE_SERVICE_ROLE_KEY` is unavailable

3. **Centralized public-access residual audit**
   - Status: `PARTIAL`
   - Why it remains active: the main public site lane is now minimized and live-validated, but the residual audit still needs one final closeout pass across adjacent public readers and deployment-table wording.

4. **Deployment/proof alignment for no-deploy and Edge Function surfaces**
   - Status: `PARTIAL`
   - Why it blocks: the production path is much clearer now, but final launch sign-off still needs one canonical table that makes local-only, deployed, live-validated, and unverified surfaces unambiguous across web, Supabase functions, and proof logs.

5. **Canonical validation cleanup**
   - Status: `PARTIAL`
   - Why it blocks: the board is closer to canonical, but the launch record still needs one final aligned interpretation after the remaining public-payload and secure-proof work closes.

6. **Asset footprint / CDN migration**
   - Status: `OPEN`
   - Why it blocks: asset guardrails improved, but the public asset strategy is still not fully closed to launch-signoff standard.

## P0

### P0-01 Launch-truth control board
- Status: `OPEN`
- Goal: keep the board, report, deployment table, and proof logs aligned to one current truth.
- Acceptance criteria:
  - The top of this file answers whether the app can safely launch today.
  - Active blockers reflect only current launch blockers.
  - Deployed runtime state, local code state, and proof state are not mixed ambiguously.

### P0-02 Production deploy consistency
- Status: `PARTIAL`
- Current truth:
  - Web production deploy is live.
  - `public-site-access`, `interactive-section-public`, and `vault-contribution-public` are deployed and live-validated.
  - Some supporting code is local-only by design, and the canonical table still needs final closeout wording.
- Acceptance criteria:
  - Every launch-relevant web/runtime/function surface is labeled `deployed`, `pushed only`, `local only`, `live validated`, or `unverified`.
  - Final launch call references one aligned runtime state.

## P1

### P1-01 Raw public-site payload minimization
- Status: `LIVE PASS`
- Description:
  `public-site-access` no longer returns raw top-level blobs directly, the browser consumes a strict render-only DTO, and the live public route now resolves through the intended public runtime path.
- Risk:
  Remaining risk is residual audit drift, not the main public-site payload contract.
- Acceptance criteria:
  - Browser receives only a minimal server-built public render payload.
  - `site_json` never reaches public guest routes directly.
  - `published_json` is sanitized server-side before exposure.
  - `wedding_data` is minimized to required public render fields only.
  - `layout_config` does not expose internal-only builder state.
  - Legacy draft-ish fallback behavior is removed or strictly sanitized.
  - Nested fake sensitive fields are injected in tests and proven not to reach browser payloads, public route state, or public API responses.
  - Public, password-protected, invite-only, translated, registry, itinerary, guest-hub, recap, and media/photo public routes still render correctly.
  - Live public-quality proof passes after deploy alignment.

### P1-02 Centralized public-access residual audit
- Status: `PARTIAL`
- Current evidence:
  - baseline audit exists at [docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md)
- Acceptance criteria:
  - remaining legacy public reads are removed or quarantined
  - residual public exposures are either eliminated or explicitly proven safe under the stricter render-model contract
  - deployed/runtime truth is recorded separately from local-only hardening
  - final audit wording reflects that the main public-site lane is already `LIVE PASS`

### P1-03 Secure service-role queue/storage proof
- Status: `OPEN`
- Acceptance criteria:
  - unauthorized actors are denied at runtime
  - limited collaborators prove scoped access only
  - queue processors cannot mutate arbitrary sites
  - storage/media boundaries hold
  - no insecure fallback auth paths remain
  - proof is rerun in a secure env and recorded canonically

### P1-04 Secure email / message proof
- Status: `PARTIAL`
- Acceptance criteria:
  - queue authorization proof passes
  - send authorization proof passes
  - recipient scoping proof passes
  - collaborator restrictions hold
  - queue isolation and public abuse resistance hold
  - secure queue-processing proof is rerun in a secure env and recorded canonically
  - until then, this stays folded under the open secure service-role queue/storage lane instead of being tracked as a separate ungated blocker

### P1-05 Deployment/proof alignment
- Status: `OPEN`
- Acceptance criteria:
  - every launch-relevant Edge Function has a canonical status
  - proof logs, backlog, report, and live deploy state agree
  - there are no lingering `No deploy was run` ambiguities on launch-critical changes

### P1-06 Canonical validation cleanup
- Status: `OPEN`
- Acceptance criteria:
  - validation matrix uses only `PASS`, `FAIL`, `LOCAL ONLY`, `LIVE PASS`, and `NOT RUN`
  - current failures are separated from historical failures
  - top-level launch verdict matches the matrix

### P1-07 Asset footprint / CDN migration
- Status: `OPEN`
- Acceptance criteria:
  - oversized public assets are reduced or moved behind the intended CDN/media strategy
  - preview and public render payloads do not quietly balloon
  - remaining large assets are explicitly justified

## P2

### P2-01 Final launch sign-off packet
- Status: `OPEN`
- Scope: only after all P0/P1 launch blockers are closed or formally downgraded.

### P2-02 Lower-risk architectural cleanup
- Status: `DEFERRED`
- Scope: dashboard extraction, route decomposition, and optional maintainability work resume only after launch/security blockers are cleared.

## Deferred

- broad dashboard extraction not tied to launch proof
- non-launch UI polish
- optional architectural cleanup
- new features outside the hardening mandate

## Current Validation Matrix

| Command / Proof | Status | Scope | Notes |
| --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | `LOCAL ONLY` | Green on current branch |
| `npm run lint -- --quiet` | `PASS` | `LOCAL ONLY` | Green on current branch |
| `npm run build` | `PASS` | `LOCAL ONLY` | Green on current branch |
| `npm run proof:v1:public-access-coverage` | `PASS` | `LOCAL ONLY` | Guards the stricter local DTO shape and the audited public gate inventory |
| `npm test -- --run src/lib/publicSiteRenderModel.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts` | `PASS` | `LOCAL ONLY` | Strict DTO + nested leak tests + public route regression checks green |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `PRODUCTION` | Green after the production deploy and public-function alignment |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `PRODUCTION` | Green after `public-site-access` browser client fix and `--no-verify-jwt` redeploy |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `PRODUCTION` | Green on the current live runtime |
| `npm run proof:v1:email-messaging-authorization` | `LIVE PASS` | `PRODUCTION` | Unauthenticated denial lane green; secure queue-processing deep proof still `NOT RUN` |
| `npm run proof:v1:service-role-authorization` | `LIVE PASS` | `PRODUCTION` | Unauthenticated denial lane green; secure queue/storage deep proof still `NOT RUN` |
| `npm run proof:v1:performance-budget` | `PASS` | `LOCAL ONLY` | Guardrail green; final asset/CDN closure still open |
| secure service-role queue/storage deep proof | `NOT RUN` | `SECURE ENV REQUIRED` | Blocked by missing `SUPABASE_SERVICE_ROLE_KEY` |
| secure email queue-processing deep proof | `NOT RUN` | `SECURE ENV REQUIRED` | Still not rerun; currently tracked as sub-scope of the secure service-role proof lane rather than a separate ungated blocker |
| `npm run proof:v1:board:md` | `PASS` | `LOCAL ONLY` | Must stay green after every board update |
| `git diff --check` | `PASS` | `LOCAL ONLY` | Must stay green after every board update |

## Deployment Status

### Web App

| Surface | Status | Current Truth |
| --- | --- | --- |
| Production web app | `LIVE PASS` | [dayof.love](https://dayof.love) is live from Vercel deployment `dpl_68n9YLtWy67VxmqziaVYQAACKHqL` |
| Strict public DTO hardening | `LIVE PASS` | Deployed and live-validated through canonical smoke plus public-quality |
| Latest local commit | `DEPLOYED EARLIER` | `9c976a26` is current `HEAD`; the production runtime also includes the newer uncommitted browser-client follow-up in this worktree, so commit/push still needs to catch up with live runtime truth |
| Preview deploy | `LIVE PASS` | Earlier preview evidence exists, but production runtime is the canonical launch signal now |

### Supabase Edge Functions

| Function / Surface | Status | Notes |
| --- | --- | --- |
| `public-site-access` | `LIVE PASS` | Deployed with strict DTO hardening and redeployed with `--no-verify-jwt`; live public-quality is green |
| `interactive-section-public` | `LIVE PASS` | Deployed in the same hardening wave |
| `vault-contribution-public` | `LIVE PASS` | Deployed in the same hardening wave |
| `process-email-queue` | `DEPLOYED` | Runtime deploy happened; deep secure proof remains open |
| `public-itinerary-by-slug` | `DEPLOYED` | Runtime deploy happened; no fresh route-specific live proof logged in this board |
| `photo-upload` | `DEPLOYED` | Runtime deploy happened; service-role deep proof still open |
| `_shared/publicAccessGate.ts` | `LOCAL ONLY` | Shared source, not a separately deployed function |
| `_shared/signedSession.ts` | `LOCAL ONLY` | Shared source, not a separately deployed function |
| `_shared/emailSafety.ts` | `LOCAL ONLY` | Shared source, not a separately deployed function |
| `_shared/collaboratorPermissions.ts` | `LOCAL ONLY` | Shared source, not a separately deployed function |
| `registry-preview/urlNormalizer.ts` | `LOCAL ONLY` | Local helper module, not a separately deployed function |

## Next 10 Tasks

1. Finish secure service-role queue/storage proof in a secure proof environment.
2. Finish secure email queue-processing proof in a secure proof environment.
3. Confirm canonical deployment state for every launch-relevant Edge Function.
4. Produce the final canonical validation matrix with one launch interpretation.
5. Reassess asset/CDN status against the current performance budget evidence.
6. Update the residual public-access audit from current live truth.
7. Record the final deployment-policy note for `public-site-access` so `--no-verify-jwt` is explicit in launch ops.
8. Rerun `npm run proof:v1:board:md` after each doc closeout step.
9. Commit and push the remaining launch-control truth updates.
10. Only then resume lower-risk extraction or maintainability work.

## Resolved Work Summary

- Production web deploy is live at [dayof.love](https://dayof.love).
- `public-site-access` no longer returns raw top-level `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs directly.
- Public-quality and canonical smoke are green on the live runtime.
- Guests / RSVP ops is green on the live runtime.
- Unauthenticated denial lanes for service-role and email authorization are green on the live runtime.
- Launch-control docs now center public/private boundaries, deployment truth, and proof state instead of extraction history.
- Strict public DTO hardening is live, with the public site path no longer hydrating from `builderProject` / `weddingData` / `layoutConfig`.
