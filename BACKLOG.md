# Production Hardening Control Board

| Field | Current State |
| --- | --- |
| Current readiness score | `8.2 / 10` |
| Current launch verdict | `HOLD` |
| Production-ready | `NO` |
| Latest branch | `codex/v1-finish-hard-gates-2` |
| Latest commit | `71cd556c` `Land launch hardening worktree` |
| Latest deploy status | Preview web deploy `READY` for `71cd556c`; `public-site-access`, `interactive-section-public`, `vault-contribution-public`, `process-email-queue`, `public-itinerary-by-slug`, and `photo-upload` deployed to Supabase on `2026-05-08` |
| Current blockers | Secure service-role queue/storage proof; email queue-processing proof |
| Current proof state | Local proof is green for public payload minimization and public-access coverage; guests/RSVP ops proof is green; email and service-role authorization proofs are green for live unauthenticated denial; canonical production smoke is green after the deploy alignment pass; Vercel production env inventory confirms no secure proof secret is present there; secure deep proof is still blocked by missing secure proof environment and missing Supabase control-plane auth |
| Current next actions | Run secure service-role queue/storage proof in a secure environment with `SUPABASE_SERVICE_ROLE_KEY`; run secure email queue-processing proof in a secure environment with `SUPABASE_SERVICE_ROLE_KEY`; if secret inventory is needed, provide Supabase control-plane auth via `SUPABASE_ACCESS_TOKEN` or an authenticated CLI session |

## Current Canonical Status

- Production launch status remains `NO`.
- The highest-risk public payload lane has been refactored locally, deployed for `public-site-access`, and guarded by local leak tests.
- Canonical live smoke is green and is now aligned with the deployed `public-site-access` change.
- Guests / RSVP ops proof is green on the live runtime.
- The residual public-access audit is documented and the public functions touched in this wave are deployed.
- Broad dashboard extraction is out of the active launch lane unless it directly removes a blocker below.

## Current Launch Blockers

1. **Secure service-role queue/storage proof**
   - Status: `OPEN`
   - Current truth: authorization proof script is green for unauthenticated denial, but the secure queue/storage integrity sub-proof still requires `SUPABASE_SERVICE_ROLE_KEY`.
   - External blocker detail: Vercel production env inventory shows no secure proof secret there, and Supabase secret inventory cannot be checked from this workspace because `SUPABASE_ACCESS_TOKEN` / authenticated CLI access is unavailable.

2. **Email queue-processing proof**
   - Status: `OPEN`
   - Current truth: email authorization proof script is green for unauthenticated denial, but secure queue-processing proof is still blocked by missing `SUPABASE_SERVICE_ROLE_KEY`.
   - External blocker detail: same secure-env / control-plane auth gap as above.

## P0

### P0-01 Secure service-role queue/storage proof
- Status: `OPEN`
- Why it blocks: launch sign-off cannot claim real private-data safety without the secure proof environment run.
- Acceptance criteria:
  - `npm run proof:v1:service-role-authorization` is rerun with the required secure environment.
  - Queue/storage integrity proof passes without widening read/write scope.
  - Output is recorded without leaking secret values.

### P0-02 Deployment/proof alignment for Edge Functions
- Status: `PASS`
- Why it blocks: launch cannot rely on mixed local code and partially deployed function behavior.
- Acceptance criteria:
  - Each changed launch-relevant Edge Function is labeled `deployed`, `pushed but not deployed`, `local only`, or `unverified`.
  - Launch claims reference a single aligned runtime state.

### P0-03 Final live postdeploy proof rerun
- Status: `PASS`
- Why it blocks: local green status does not replace live runtime truth.
- Acceptance criteria:
  - Canonical smoke is rerun after deploy alignment.
  - Remaining live launch-critical proof lanes are rerun once against the aligned runtime.
  - Any failures are triaged into bug, deploy mismatch, outdated proof, or accepted non-launch issue.

## P1

### P1-01 Raw public-site JSON payload minimization
- Status: `PASS`
- Description: `public-site-access` previously returned raw `site_json`, `published_json`, `wedding_data`, and `layout_config` blobs to the browser.
- Risk: nested draft/private/stale/internal fields can leak even if top-level sensitive fields are stripped.
- Current state:
  - Browser now receives a server-built `render_model` instead of raw blobs.
  - `SiteView` now consumes that minimal model.
  - Nested fake sensitive-field leak tests exist locally.
  - `public-site-access` is deployed.
- Remaining closure conditions:
  - Keep guarded by residual-audit and launch-board regression checks.
- Acceptance criteria:
  - Browser receives only a minimal server-built public render model.
  - `site_json` is never returned directly to public guest routes.
  - `published_json` is sanitized server-side.
  - `wedding_data` and `layout_config` are minimized to only required public render fields.
  - Nested fake sensitive fields are injected in tests and proven not to reach the browser.
  - `SiteView` still renders public/password/invite sites correctly.

### P1-02 Centralized public-access residual audit
- Status: `PASS`
- Acceptance criteria:
  - Public routes and public server functions are inventoried in one place.
  - Legacy direct reads or oversized public reads are removed or quarantined.
  - Residual public data exposures are either eliminated or explicitly documented as safe.
  - Current evidence: [docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PUBLIC_ACCESS_RESIDUAL_AUDIT_2026-05-08.md)

### P1-03 Email queue-processing proof
- Status: `OPEN`
- Acceptance criteria:
  - `npm run proof:v1:email-messaging-authorization` is rerun with the required secure proof environment.
  - Queue write, queue process, and bounded failure behavior are proven on the aligned runtime.

### P1-04 Canonical validation cleanup
- Status: `PASS`
- Acceptance criteria:
  - Validation matrix uses only `PASS`, `FAIL`, `NOT RUN`, `LOCAL ONLY`, and `LIVE PASS`.
  - Board, report, and smoke log agree on launch state and blocker interpretation.

### P1-05 Asset footprint / CDN migration
- Status: `PASS`
- Acceptance criteria:
  - Heaviest public assets are identified and reduced or moved behind the intended CDN/media strategy.
  - Remaining large assets are explicitly justified.

## P2

### P2-01 Final operator sign-off packet
- Status: `OPEN`
- Scope: publish only after P0/P1 blockers are closed or formally accepted.

### P2-02 Resume lower-risk extraction work
- Status: `DEFERRED`
- Scope: only after launch blockers are closed or downgraded.

## Deferred

- Additional dashboard extraction that does not remove a live blocker
- Non-launch UI polish
- Native social/share expansion
- Live SMS/Telnyx activation beyond current launch-critical scope

## Current Validation Matrix

| Command / Proof | Status | Scope | Notes |
| --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | `LOCAL ONLY` | Green after public render-model change |
| `npm run lint -- --quiet` | `PASS` | `LOCAL ONLY` | Green after public render-model change |
| `npm run build` | `PASS` | `LOCAL ONLY` | Green after public render-model change |
| `npm run proof:v1:public-access-coverage` | `PASS` | `LOCAL ONLY` | Confirms `public-site-access` safe render-model path and shared public gate coverage |
| `npm test -- --run src/lib/publicSiteRenderModel.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicAccessCoverageProofScript.test.ts src/lib/publicGuestSurfaceBoundary.test.ts src/pages/SiteView.test.ts src/lib/launchEdgeFunctions.test.ts` | `PASS` | `LOCAL ONLY` | Nested leak tests and public route regression checks green |
| `npm run proof:v1:service-role-authorization` | `PASS` | `LOCAL ONLY` | Unauthenticated denial lane green; secure queue/storage sub-proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY` |
| `npm run proof:v1:email-messaging-authorization` | `LIVE PASS` | `PRODUCTION` | Unauthenticated denial lane green after deploying `process-email-queue`; secure queue-processing sub-proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY` |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `PRODUCTION` | Green on `2026-05-08` after refreshing the CSV/check-in guard scripts to match the current route ownership |
| `npm run proof:v1:canonical-smoke` | `LIVE PASS` | `PRODUCTION` | Green on `2026-05-08` after `public-site-access` deploy |
| `npm run proof:v1:service-role-authorization` | `LIVE PASS` | `PRODUCTION` | Unauthenticated denial lane green after deploying `photo-upload`; secure deep proof still blocked by missing `SUPABASE_SERVICE_ROLE_KEY` |
| Preview web deploy for `71cd556c` | `LIVE PASS` | `PREVIEW` | Vercel preview is `READY`; not production launch evidence by itself |
| `npm run proof:v1:performance-budget` | `PASS` | `LOCAL ONLY` | No asset budget failures; three large JS chunks remain in review only |
| `npm run proof:v1:board:md` | `PASS` | `LOCAL ONLY` | Must be rerun after board/report updates |
| `git diff --check` | `PASS` | `LOCAL ONLY` | Must stay green after doc updates |
| Remaining secure service-role deep proof with secure env | `NOT RUN` | `N/A` | Blocked by missing secure proof environment |
| Remaining secure email queue-processing deep proof with secure env | `NOT RUN` | `N/A` | Blocked by missing secure proof environment |
| Remaining live function-specific launch proofs after full deploy alignment | `PASS` | `PRODUCTION` | Current wave completed one aligned live pass for canonical smoke and guests/RSVP ops; remaining open proof is secure-env only |

## Deployment Status

### Web App

- Preview deploy: `LIVE PASS`
  - Commit: `71cd556c`
  - URL: [dayof-deploy-6e5577ea-n2hc93q07-eric-gagnons-projects.vercel.app](https://dayof-deploy-6e5577ea-n2hc93q07-eric-gagnons-projects.vercel.app)

- Production web deploy: `UNVERIFIED` against current local hardening changes
  - Current launch call still depends on the aligned proof board, not on preview readiness.

### Supabase Edge Functions

#### Deployed
- `public-site-access` — deployed on `2026-05-08`
- `interactive-section-public` — deployed on `2026-05-08`
- `vault-contribution-public` — deployed on `2026-05-08`
- `process-email-queue` — deployed on `2026-05-08`
- `public-itinerary-by-slug` — deployed on `2026-05-08`
- `photo-upload` — deployed on `2026-05-08`

#### Pushed but not deployed
- No additional launch-critical public functions from this wave remain in this bucket

#### Local only
- `supabase/functions/_shared/publicAccessGate.ts`
- `supabase/functions/_shared/signedSession.ts`
- `supabase/functions/_shared/emailSafety.ts`
- `supabase/functions/_shared/collaboratorPermissions.ts`
- `supabase/functions/registry-preview/urlNormalizer.ts`

#### Unverified
- No additional launch-critical function behavior from the current wave remains unverified

## Next 10 Tasks

1. Replace any remaining raw public-site blobs with the final minimal public render model everywhere public guests can read site data.
2. Add or extend nested sensitive-field leak tests for any remaining high-risk public render paths beyond `public-site-access`.
3. Remove or quarantine legacy public site direct reads and oversized public payload paths.
4. Finish secure service-role queue/storage proof in a secure proof environment.
5. Finish email queue-processing proof in a secure proof environment.
6. Produce the final canonical validation matrix with one launch interpretation.
7. Reduce heavy public assets and finalize the CDN/media strategy.
8. Only then continue lower-risk extraction work.
9. Keep production wording/manual truth proofs fresh after future approved deploys.
10. Keep the live route and guest/RSVP proof lanes green as code changes.

## Resolved Work Summary

- `public-site-access` no longer returns raw `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs to the browser in the current implementation.
- Public site rendering now uses a server-built `render_model` contract.
- Nested fake sensitive-field leak tests now exist for the main public site payload lane.
- Public-access coverage proof is green locally.
- Guests / RSVP ops proof is green live.
- Service-role and email authorization proof lanes are green for unauthenticated denial checks.
- `public-site-access` has been deployed and canonical live smoke is green after that deploy.
- `interactive-section-public`, `vault-contribution-public`, `process-email-queue`, `public-itinerary-by-slug`, and `photo-upload` were deployed in this wave.
