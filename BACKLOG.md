# Production Hardening Backlog

Archive for deferred/history detail:
- [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md)

Use this file for active launch truth, active hardening items, proof matrices, and next actions.

## Launch Question

Is the current repo a clean launch baseline today?

Yes. The launch-critical hardening lane is closed, the blocker-fix runtime is live, and the release gate now enforces the Supabase-backed RSVP proof lane.

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-13 08:52 AM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest Git SHA | `4f623318` |
| Latest commit message | `Ship claim-safe name-change MVP framing` |
| Vercel deployment ID | `dpl_CRegyLrW91MBRXbkytcPZdy8g8BS` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | Live blocker-fix lane includes `submit-rsvp --no-verify-jwt` plus applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`. Same-day confirmed/live-proven: `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `validate-rsvp-token --no-verify-jwt`; `interactive-section-public --no-verify-jwt`; `vault-contribution-public --no-verify-jwt`; `vault-entry-submit --no-verify-jwt`; `translate-site-content`. Latest deploy wave also pushed `guest-contact-lookup --no-verify-jwt` and `guest-contact-submit --no-verify-jwt` with the stronger household verifier, guest invite-token support, and redacted public audit event live. |
| Current readiness score | `10 / 10` |
| Current launch verdict | `GO` |
| Production-ready | `YES` |
| Reason production-ready is not yet claimed | No active P0/P1 blockers remain. Production-ready is claimed for the current launch baseline. Remaining items are non-launch, deferred, or repo-rigor follow-up. |
| Current blockers | none |
| Current proof state | Launch-critical runtime proof is green on the current live runtime: `npm test`, `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `service-role-authorization`, `email-messaging-authorization`, `launch-closeout`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, `guest-lookup-scope`, `collaborator-runtime`, `client-rls-matrix`, `registry-preview-ssrf`, `coordinator-dayof`, `name-change-runtime`, and `registry`. The harder repo guardrails are also green: `proof:v1:client-write-inventory`, `proof:v1:ast-security`, `proof:v1:test-lanes`, `proof:v1:strict-pocket`, and `proof:v1:security-automation`. `Release Launch Gate` remains green and the repo now carries Semgrep, CodeQL, Gitleaks, and Dependabot automation. |
| Current deployment state | The latest deployed frontend runtime is [dayof.love](https://dayof.love) via verified Vercel production deploy `dpl_CRegyLrW91MBRXbkytcPZdy8g8BS`. The barcode scanner migration `20260513064500_add_registry_barcode_scanner_support.sql` is applied remotely, the richer barcode depth batch is now live on `registry-barcode-lookup --no-verify-jwt`, `submit-rsvp` is live with the serialized capacity path, and the public-session-secret, admin route gate, guest-contact, route-module decomposition, vault contribution, and `.dayof.love` host-routing lanes all remain live-proven. External custom domains remain unsupported product scope, not an open proof lane. |
| Current next actions | No active launch blocker remains for the current launch baseline. The ambiguous "full feature scope" wording for `Day-of / coordinator`, `Name change`, and `Universal Registry Barcode Scanner` is now replaced by the competitor-informed MVP bar in [feature-mvp-gap-research-2026-05-13.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/feature-mvp-gap-research-2026-05-13.md). `Day-of / coordinator` now has its deeper MVP build landed locally and green on local proof, but still needs deploy + live proof on the new runtime; `Name change` now also has its deeper claim-safe MVP build landed locally and green on local proof, but still needs deploy + live proof on the new runtime. `Universal Registry Barcode Scanner` now appears to meet that MVP bar and its remaining open work is explicitly post-MVP/deferred depth, not baseline MVP viability. Keep the live client-RLS matrix current and keep the no-direct-client-write inventory current only if future runtime write surfaces reopen. Repo-wide TS/ESLint full-flip work remains explicitly future-only maintainability follow-up; detailed deferred/history context still lives in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md). |

Blunt status:
- `P1-04 Public section DTO minimization` is still closed.
- `P1-09 Deployment / proof truth canonicalization` is still closed.
- The previously reopened guest-contact runtime blocker is still closed with live proof.
- The reopened billing, RSVP-capacity, and release-gate defects are fixed, deployed, and proven.
- No active `P0` / `P1` launch blockers remain.

## Current Launch Blockers

No active `P0` or `P1` launch blockers remain.

- `P0 Payment gate fail-open` -> `RESOLVED`
  - frontend runtime `f0cbf841` now fails closed to the billing-unavailable hold state
  - focused route proof is green and the blocker-fix frontend deploy is live on [dayof.love](https://dayof.love)
- `P1 RSVP capacity race` -> `RESOLVED`
  - migration `20260511170500_serialize_submit_rsvp_capacity.sql` is applied remotely
  - `submit-rsvp` is live on the serialized RPC path
  - `npm run proof:v1:guests-rsvp-ops` and strict RSVP smoke are green after deploy
- `P1 Release launch gate policy gap` -> `RESOLVED`
  - GitHub Actions `Release Launch Gate` now hard-fails without the Supabase RSVP secrets and passes with the focused launch-critical proof bundle
  - successful Actions evidence: runs `25705386070` and `25705683563`

## Additional Hardening Findings

No active baseline launch blocker remains, but the following items are active board work now.

- launch-critical findings are closed and live-proven on the current deployed production runtime
- `Day-of / coordinator`
  - `ACTIVE NOW`
  - current truth: the current production runtime still reflects the older launch-baseline slice, but the repo now has the deeper competitor-informed MVP build landed locally in [feature-mvp-gap-research-2026-05-13.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/feature-mvp-gap-research-2026-05-13.md)
  - dedicated live product-depth proof exists for the current shipped slice: `npm run proof:v1:coordinator-dayof -- --require-live`
  - local deeper-batch proof is green: `npm run proof:v1:coordinator-dayof`, `npm run typecheck -- --pretty false`, targeted coordinator Vitest lane, `npm run build`
  - live proof is green on the current production runtime for the older baseline slice only
  - MVP bar now defined as: event-specific arrival truth, event-scoped counts, explicit exception states, lookup triage, and role-safe day-of routing
  - locally shipped now in this wave: event-scoped arrival writes + reads, per-event arrival counters, wrong-event / walk-in / help-desk / manager-decision / household-mismatch state handling, richer door routing, and no-match routing inside coordinator mode
  - still missing against completion: deploy the deeper runtime and re-run live coordinator proof on the shipped runtime
  - status: `LOCAL MVP BUILD COMPLETE / DEPLOY + LIVE PROOF PENDING`
- `Name change`
  - `ACTIVE NOW`
  - current truth: the current production runtime still reflects the older launch-baseline slice, but the repo now has the deeper competitor-informed MVP build landed locally in [feature-mvp-gap-research-2026-05-13.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/feature-mvp-gap-research-2026-05-13.md)
  - dedicated live runtime proof exists for the current shipped slice: `npm run proof:v1:name-change-runtime -- --require-live`
  - local deeper-batch proof is green: `npm run proof:v1:name-change-runtime`, `npm run typecheck -- --pretty false`, focused planner/overview Vitest lanes, `npm run lint -- --quiet`, `npm run build`
  - live proof is green on the current production runtime for the older baseline slice only
  - MVP bar now defined as: US-first guided execution, honest sequencing, reminders, status vault, templates, and post-wedding dashboard placement
  - locally shipped now in this wave: explicit California-guided coverage framing, claim-safe dashboard/helper copy, marriage-state plus jurisdiction intake, generic state-license/document labels, and verified post-wedding dashboard + planner resume placement
  - still missing against completion: deploy the deeper runtime and re-run live name-change proof on the shipped runtime
  - status: `LOCAL MVP BUILD COMPLETE / DEPLOY + LIVE PROOF PENDING`
- `Universal Registry Barcode Scanner`
  - `MVP COMPLETE / POST-MVP DEFERRED`
  - current truth: the competitor-informed MVP bar is shipped and live-proven; remaining work is post-MVP parity and depth only
  - implemented now: scan/manual barcode entry UI, barcode normalization, cache-aware edge lookup, registry persistence fields, and focused tests
  - deeper shipped slice now also includes provider-path metadata, review-required match state, explicit `Use best price` / `Add without store` owner controls, Open Library fallback for ISBNs, optional `UPCITEMDB_API_KEY` ladder support, normalized retailer-option building, and miss-cache attempt increments
  - deployed now: migration `20260513064500_add_registry_barcode_scanner_support.sql`, frontend runtime, and live `registry-barcode-lookup --no-verify-jwt`
  - live proof is green on the current production runtime, including provider-path/review-required barcode lookup, owner save/read flow, and public registry endpoint readability
  - deeper barcode batch proof is green locally: `npm run proof:v1:registry`, `npm run typecheck -- --pretty false`, `npm run build`, `git diff --check`
  - deeper barcode batch deploy/live proof status: deployed and live-proven in this wave
  - provider ladder currently ships with free/open coverage first and safe manual fallback when no confident match exists
  - remaining gaps are explicitly post-MVP/deferred: fuller broad-match provider coverage, stronger duplicate/merge handling, stronger product-match depth, and richer universal-registry parity beyond barcode capture
  - status: `MVP COMPLETE / POST-MVP DEFERRED`
  - full concept, architecture, provider ladder, cache tables, and risk notes live in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md)
- repo-wide TS/ESLint full-flip work is `FUTURE-ONLY / MAINTAINABILITY`
  - the enforced strict pocket now also covers RSVP, SiteView, siteViewHelpers, QuickStart, route modules, and `nameChangeService`
  - the latest cleanup wave restored green `typecheck`, `lint`, `build`, `proof:v1:strict-pocket`, and focused proof tests after a broader dead-code/import sweep
  - the broader full-repo `noImplicitAny` / unused-enforcement flip is no longer treated as active board work; strict-only debt is reduced again (`238 -> 205` file-scoped findings) and the remaining sweep belongs in future maintainability work
- ongoing maintainability and future-surface rigor detail remain archived in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md)

## Public DTO 10/10 Checklist

| Check | Status |
| --- | --- |
| No top-level raw `site_json` in browser payload | `PASS` |
| No top-level raw `published_json` in browser payload | `PASS` |
| No top-level raw `wedding_data` in browser payload | `PASS` |
| No top-level raw `layout_config` in browser payload | `PASS` |
| No draft page fallback for published public sites | `PASS` |
| No current/draft `row.wedding_data` precedence for published sites | `PASS` |
| No broad `layout_config` fallback | `PASS` |
| No generic settings passthrough | `PASS` |
| No generic bindings passthrough | `PASS` |
| No generic `styleOverrides` passthrough | `PASS` |
| No public meta timestamps unless justified | `PASS` |
| No signed/private media URLs | `PASS` |
| Translation payloads tested | `PASS` |
| Sensitive innocent-name fields tested | `PASS` |
| Persisted section fallback rows tested | `PASS` |
| Client-side public payload assertion exists | `PASS` |
| Server-side DTO allowlist tests pass | `PASS` |
| Live public quality passes after deploy | `LIVE PASS` |

## Critical Resolved This Wave

Resolved-wave detail is archived in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md).

- `P1-04 Public section DTO minimization` -> `RESOLVED`
- `P1-09 Deployment / proof truth canonicalization` -> `RESOLVED`
- `P1-03 Layout config fallback removal or hard gate` -> `RESOLVED`
- `P1-06/P1-07 secure proof lanes` -> `RESOLVED`
- `P1-10 Guest contact update public runtime auth mismatch` -> `RESOLVED`

## Non-Critical Before Launch

None.

## Non-Critical After Launch / Deferred

Deferred detail is archived in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md).

- `external custom domains` -> `DEFERRED`
- `registry owner edit/import manual truth notes` -> `DEFERRED`
- `SMS/Telnyx live provider send` -> `DEFERRED`
- `AI server secret inventory / internal OPENAI prereq` -> `DEFERRED`
- `runtime operator-note checklist` -> `DEFERRED`

## Validation Matrix

| Command | Status | Environment | Last run | Notes |
| --- | --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | `local` | `2026-05-13` | Green after the deeper local name-change claim/jurisdiction batch |
| `npm run lint -- --quiet` | `PASS` | `local` | `2026-05-13` | Green after the deeper local name-change claim/jurisdiction batch |
| `npm run build` | `PASS` | `local` | `2026-05-13` | Green after the deeper local name-change claim/jurisdiction batch |
| `npm test` | `PASS` | `local` | `2026-05-11` | `537/537` files, `3321/3321` tests |
| `npm run test:security` | `PASS` | `local` | `2026-05-11` | `265/265` |
| `npm run test:smoke` | `PASS` | `production` | `2026-05-11` | `registry`, `rsvp`, `csvmapper`, `checkin`, `messages`, `site` all green after unrestricted-network rerun |
| `npm run proof:v1:public-access-coverage` | `PASS` | `local` | `2026-05-11` | Static/public contract coverage is green |
| `npm run proof:v1:client-write-inventory` | `PASS` | `local` | `2026-05-12` | Broadened guard scans all tracked `src` runtime files, now also catches single/double/backtick table names, skips `.d.ts` noise, and reports no direct client `.insert/.update/.upsert/.delete` calls |
| `npm run proof:v1:ast-security` | `PASS` | `local` | `2026-05-12` | AST-backed launch gate guards direct client writes, service-role references in shipped runtime, `dangerouslySetInnerHTML`, auth/payment storage bypasses, internal tooling route exposure, and raw public blob leaks |
| public DTO leak tests | `PASS` | `local` | `2026-05-11` | Focused `publicRenderContract`, `publicSiteRenderModel`, `publicSiteAccess` lanes are green |
| `npm run proof:v1:guest-lookup-scope` | `LIVE PASS` | `production` | `2026-05-12` | Live now reflects the stronger verifier lane: no exact-name match without verifier, email verifier alone stays household-denied, phone last 4 unlocks household scope, and guest invite tokens also unlock the scoped household path |
| `npm run proof:v1:client-rls-matrix -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-12` | Aggregates live anon guest-contact scope, public RSVP scope, owner/collaborator viewer-deny plus planner/coordinator/registry/settings/photos-allow runtime proof, direct guest/planning/seating write allow/deny coverage, planner message + itinerary RPC allow with registry RPC deny, settings patch/section RPC allow + registry RPC deny, registry item/policy RPC allow + dashboard message/section RPC deny, photos vault-config/vault-provider RPC allow + dashboard message RPC deny, coordinator Q&A/check-in/media RPC allow + dashboard message RPC deny, and the guest-dashboard settings RPC lane with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` |
| `npm run proof:v1:registry-preview-ssrf -- --require-live` | `LIVE PASS` | `production` | `2026-05-12` | `26/26` hostile-target checks passed; `test:launch` and `Release Launch Gate` now require the live registry-preview SSRF proof lane |
| `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated day-of runtime smoke now proves the shared coordinator board, check-in queue, timeline, message, and Q&A surfaces on the current live deploy |
| `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated name-change runtime smoke now proves the saved planner route, milestone board, templates, case setup, and save affordance on the current live deploy |
| `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Barcode lookup now proves through the shipped registry flow: provider-path/review-required match review, editable confirmation, owner save, dashboard readback, and public registry endpoint readability |
| `npm run proof:v1:registry` | `PASS` | `local` | `2026-05-13` | Full local registry proof lane is green after the richer barcode review/provider batch and matches the deployed runtime lane |
| `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live` | `LIVE PASS` | `production` | `2026-05-12` | Dedicated `.dayof.love` host-routing proof is green for `testandkaras.dayof.love`; the live host resolves and fail-closes safely without wrong-site leakage |
| `npm run proof:v1:service-role-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Unauthenticated denial lane green; secure closeout rerun completed with provided key |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Queue-processing proof green; controlled invalid-recipient row fails safely |
| `npm run proof:v1:launch-closeout` | `PASS` | `secure env + production` | `2026-05-11` | Secure closeout bundle green with provided key |
| `npm run proof:v1:collaborator-runtime` | `LIVE PASS` | `production` | `2026-05-12` | Owner invite/accept flow, viewer deny + planner/coordinator allow runtime proof, direct guest/planning/itinerary/settings/section/registry/photos/coordinator/seating write allow-deny coverage, and the guest-dashboard settings RPC lane are green |
| `npm run proof:v1:ai-product-readiness` | `PASS` | `local` | `2026-05-11` | `25/25` AI product-readiness checks passed |
| `npm run proof:v1:data-integrity` | `PASS` | `production` | `2026-05-11` | Anon-limited integrity proof green; no hard launch corruption found |
| `npm run proof:v1:prereqs` | `PASS` | `production + local env` | `2026-05-11` | Required migrations/functions/runtime readiness green; deferred provider/AI env notes remain non-launch |
| `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Live AI/photo column exposure and rollout readiness are green |
| `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Translation route plus live AI/photo model-backed lanes are green |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-12` | Fresh rerun against Vercel deploy `dpl_DQG5bU5yVbqT79Y6r4ZCx13nPtSU` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-11` | Fresh rerun against Vercel deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`; `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-12` | Fresh rerun after guest-contact verifier deploy; strict smoke green |
| `GitHub Actions Release Launch Gate` | `PASS` | `GitHub Actions + repo secrets` | `2026-05-11` | Branch-triggered workflow is green on run `25705683563`; strict RSVP smoke is mandatory |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-12` | Public vault contribution save, owner-scoped readback, and cleanup/delete are green after the live inventory/deploy rerun; `ALLOW_VAULT_QA_OPEN` was reset to `false` immediately after proof |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-13` | Current working tree is clean of whitespace errors after the richer local-only registry barcode review/provider batch |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `current production deploy` | `yes` | `Vercel production dpl_CRegyLrW91MBRXbkytcPZdy8g8BS` | `--prod` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`; guarded postdeploy bundle | green on the latest production deploy | None | `LIVE PASS` |
| `registry-barcode-lookup` | `same-day 2026-05-13 deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `node scripts/v1-proof-registry.mjs --require-live`; `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | green including the richer provider/review/store-choice batch | None on current barcode lookup/save/read lane | `LIVE PASS` |
| `public-site-access` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:public-access-coverage`; live smoke/public-quality | green | Dedicated public session secret path is live; no remaining public resolver gap | `LIVE PASS` |
| `public-registry-items` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry`; live public smoke/public-quality | green | Owner import/repair runtime notes are deferred and not a public-launch blocker | `LIVE PASS` |
| `public-itinerary-by-slug` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | green | None on the public itinerary lane | `LIVE PASS` |
| `validate-rsvp-token` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guests-rsvp-ops`; `npm run test:smoke` | green | Dedicated public session secret path is live; no remaining RSVP lookup gap | `LIVE PASS` |
| `public-site-rsvp-submit` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:guests-rsvp-ops` | green | None on the public RSVP submit lane | `LIVE PASS` |
| `guest-contact-lookup` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Dedicated public session secret path is live; no remaining guest lookup gap | `LIVE PASS` |
| `guest-contact-submit` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Dedicated public session secret path is live; no remaining guest submit gap | `LIVE PASS` |
| `guestbook-submit` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | green | Guestbook submission is covered through the guest-hub write/read lane | `LIVE PASS` |
| `vault-entry-submit` | `same-day 2026-05-12 live inventory version 1` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | green | None on the current public vault entry submit lane | `LIVE PASS` |
| `vault-contribution-public` | `same-day 2026-05-12 live inventory version 1` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | direct function probe; `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | live inventory + direct probe + write/read proof all green | None on the current public vault contribution lane | `LIVE PASS` |
| `interactive-section-public` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | green | Dedicated public session secret path is live; no remaining guest hub vote/suggestion gap | `LIVE PASS` |
| `registry-preview` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry-preview-ssrf` | green | None on SSRF/host allowlist lane | `LIVE PASS` |
| `photo-upload` | `same-day 2026-05-12 dedicated-session-secret deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | green | Dedicated public session secret path is live; no remaining photo public-upload gap | `LIVE PASS` |
| `photo-album-create` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-album-manage` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-upload-moderate` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-export-manifest` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-analyze-batch` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `guest-recap-config` / recap route | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime + frontend` | `unknown` | photo upload/write/read proof | green | None on recap curation/display lane | `LIVE PASS` |
| `send-wedding-email` | `live version 21` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | `npm run proof:v1:email-messaging-authorization` | green | Delivery-provider success path stays intentionally deferred and non-launch | `LIVE PASS` |
| `send-bulk-message` | `live version 38` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | `npm run proof:v1:email-messaging-authorization`; `npm run proof:v1:collaborator-runtime` | green | Delivery-provider success path stays intentionally deferred and non-launch | `LIVE PASS` |
| `process-email-queue` | `live version 4` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | `npm run proof:v1:email-messaging-authorization`; `npm run proof:v1:launch-closeout` | green | None on queue containment lane | `LIVE PASS` |
| `queue-guest-followups` | `live version 3` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | `npm run proof:v1:email-messaging-authorization`; `npm run proof:v1:collaborator-runtime` | green | None on scoped queue-creation lane | `LIVE PASS` |
| `guest messaging` / scheduled and bulk queue paths | `mixed live versions` | `yes` | `Frontend + Supabase Edge runtime` | `mixed` | `npm run proof:v1:comms-center`; secure email proof lanes | green | Provider send success remains non-launch and deferred | `LIVE PASS` |
| `translate-site-content` / translation route | `live version 5` | `yes` | `Supabase Edge runtime + frontend` | `default verify_jwt` | `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | green | None on current translation lane | `LIVE PASS` |
| `photo/media public routes` | `mixed live versions` | `yes` | `Frontend + Supabase storage/public guest flows` | `mixed` | photo upload/write/read proof; public-quality | green | None on current photo/media guest lanes | `LIVE PASS` |
| `subdomain route` | `17c8089f` frontend runtime; dedicated host proof `2026-05-12` | `yes` | `Frontend host routing for .dayof.love` | `n/a` | `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live`; `src/lib/publicSiteSlug.test.ts` | dedicated live host proof green; local parsing helpers green | External custom domains remain unsupported, but `.dayof.love` host routing no longer has an open proof gap | `LIVE PASS` |
| `AI/provider functions` | `mixed live versions` | `yes` | `Frontend + Edge runtime` | `mixed` | `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`; `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`; `npm run proof:v1:ai-product-readiness` | green | None on current launch-hardening lane | `LIVE PASS` |
| `SMS/Telnyx live send` | `not enabled in current launch` | `no` | `provider lane only` | `env + sender setup required` | none | not run | Remains intentionally outside the launch baseline until provider setup and live-send proof are ready | `DEFERRED` |
| `sections_public_visible_read` removal migration | `remote DB state only` | `yes` | `Supabase database` | `supabase db push` | live public-route proofs stayed green after push | green | Exact migration ledger SHA not recovered here; runtime evidence is green | `LIVE PASS` |
| public/guest/service-role access migrations | `remote DB state only` | `yes` | `Supabase database` | `historical migrations` | secure auth proofs; public smoke/public-quality; collaborator/guest-hub/photo proof | green | Exact remote migration audit not rerun here; runtime evidence is green | `LIVE PASS` |

## Next 10 Tasks

1. Deploy the deeper `Day-of / coordinator` batch.
2. Re-prove the deeper `Day-of / coordinator` lane on the deployed runtime.
3. Deploy the deeper `Name change` claim-safe coverage batch.
4. Re-prove the deeper `Name change` lane on the deployed runtime.
5. Keep `Universal Registry Barcode Scanner` post-MVP depth explicitly deferred unless it is reactivated as active scope.
6. keep the live client-RLS matrix current if future non-guest write surfaces are added.
7. keep the no-direct-client-write inventory current if future runtime write surfaces are added.
8. keep the board synced if deploy/live proof changes the active truth for `Day-of / coordinator`.
9. keep the board synced if deploy/live proof changes the active truth for `Name change`.
10. keep repo-wide TS/ESLint full-flip work future-only unless it is explicitly reactivated.

## Resolved Work Summary

Resolved-history detail is archived in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md).

- Public access fail-closed and DTO minimization are closed.
- RSVP/session, guest-contact, and public subresource hardening are closed.
- Service-role / queue / storage containment lanes are green.
- Validation / CI hardening is green on the current launch baseline.
- Internal tooling routes are production-gated.

## What Changed In This Final Closeout

Historical closeout detail is archived in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md).

- Public vault contribution is live-proven.
- `.dayof.love` host routing is live-proven.
- External custom domains are explicitly future scope.
- Guest-contact hardening, security automation, and route-module cleanup are recorded in the archive.
