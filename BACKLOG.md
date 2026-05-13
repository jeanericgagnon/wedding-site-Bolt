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
| Current date/time | `2026-05-13 12:41 PM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest verified Git SHA | `b6c0c715` |
| Latest verified commit message | `Ship registry duplicate merge depth` |
| Vercel deployment ID | `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | Live blocker-fix lane includes `submit-rsvp --no-verify-jwt` plus applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`. Same-day confirmed/live-proven: `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `validate-rsvp-token --no-verify-jwt`; `interactive-section-public --no-verify-jwt`; `vault-contribution-public --no-verify-jwt`; `vault-entry-submit --no-verify-jwt`; `translate-site-content`. Latest deploy wave also pushed `guest-contact-lookup --no-verify-jwt` and `guest-contact-submit --no-verify-jwt` with the stronger household verifier, guest invite-token support, and redacted public audit event live. |
| Current readiness score | `10 / 10` |
| Current launch verdict | `GO` |
| Production-ready | `YES` |
| Reason production-ready is not yet claimed | No active P0/P1 blockers remain. Production-ready is claimed for the current launch baseline. Remaining items are non-launch, deferred, or repo-rigor follow-up. |
| Current blockers | No coordinator ship blocker remains. The only active remaining product-depth work is the last `Universal Registry Barcode Scanner` expansion around provider/product-match breadth, retailer-refresh parity, and camera compatibility. |
| Current proof state | Launch-critical runtime proof is green on the current live runtime: `npm test`, `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `service-role-authorization`, `email-messaging-authorization`, `launch-closeout`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, `guest-lookup-scope`, `collaborator-runtime`, `client-rls-matrix`, `registry-preview-ssrf`, `coordinator-dayof`, `name-change-runtime`, and `registry`. The harder repo guardrails are also green: `proof:v1:client-write-inventory`, `proof:v1:ast-security`, `proof:v1:test-lanes`, `proof:v1:strict-pocket`, and `proof:v1:security-automation`. `Release Launch Gate` remains green and the repo now carries Semgrep, CodeQL, Gitleaks, and Dependabot automation. |
| Current deployment state | The latest deployed frontend runtime is [dayof.love](https://dayof.love) via verified Vercel production deploy `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank`. The coordinator migrations `20260513170000_coordinator_event_checkin_write.sql` and `20260513213000_coordinator_handoff_issue_depth.sql`, the name-change reminder compatibility migration `20260513193000_fix_name_change_reminders_replace_runtime.sql`, and the registry duplicate-merge migration `20260513195500_add_registry_duplicate_merge.sql` are now applied remotely. The deeper coordinator MVP lane, the broader name-change planner-depth lane, and the richer registry duplicate-merge lane are all live on the shipped runtime, while `registry-barcode-lookup --no-verify-jwt` remains live-proven inside the current registry flow. `submit-rsvp` remains live with the serialized capacity path, and the public-session-secret, admin route gate, guest-contact, route-module decomposition, vault contribution, and `.dayof.love` host-routing lanes all remain live-proven. External custom domains remain unsupported product scope, not an open proof lane. |
| Current next actions | Finish the remaining `Universal Registry Barcode Scanner` depth around provider/product-match breadth, retailer-refresh parity, and camera compatibility. Repo-wide TS/ESLint full-flip work remains explicitly future-only maintainability follow-up; detailed deferred/history context still lives in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md). |

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

No active launch-baseline blocker remains, but the product-depth lanes below are active and not done. The shipped runtime is strong enough to launch; it is not yet the finish line for the deeper scope now required on the board.

- launch-critical findings are closed and live-proven on the current deployed production runtime
- `Day-of / coordinator`
  - `MVP DEPTH SHIPPED / CURRENT ACTIVE GAP CLOSED`
  - current truth: the launch-baseline MVP batch and the deeper coordinator batch are both now shipped on the current production runtime with green dedicated live proof
  - dedicated live product-depth proof is green on the shipped deeper runtime: `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live`
  - deeper-batch proof is green locally and live: `npm run proof:v1:coordinator-dayof`, `npm run typecheck -- --pretty false`, targeted coordinator Vitest lane, `npm run build`, guarded Vercel postdeploy bundle
  - MVP bar now defined as: event-specific arrival truth, event-scoped counts, explicit exception states, lookup triage, and role-safe day-of routing
  - shipped now in this wave: event-scoped arrival writes + reads, per-event arrival counters, wrong-event / walk-in / help-desk / manager-decision / household-mismatch state handling, richer door routing, and no-match routing inside coordinator mode
  - shipped now in the deeper batch: multi-event staffing and handoff cards, persisted issue desk history, substitute-attendee / plus-one swap tracking with household context, and seating-change-at-door reassignment inside coordinator mode
  - deployed now: migrations `20260513170000_coordinator_event_checkin_write.sql` and `20260513213000_coordinator_handoff_issue_depth.sql` plus Vercel production deploy `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank`
  - live proof is green on the current production runtime for the deeper handoff / substitute / seat-change / issue-history batch
  - status: `MVP DEPTH SHIPPED / CURRENT ACTIVE GAP CLOSED`
- `Name change`
  - `MVP DEPTH SHIPPED / CURRENT ACTIVE GAP CLOSED`
  - current truth: the launch-baseline MVP batch and the broader planner-depth batch are both now shipped on the current production runtime with green authenticated live proof
  - dedicated live runtime proof is green on the current shipped depth slice: `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live`
  - local deeper-batch proof is green: `npm run proof:v1:name-change-runtime`, `npm run typecheck -- --pretty false`, focused planner/overview Vitest lanes, `npm run lint -- --quiet`, `npm run build`
  - MVP bar now defined as: US-first guided execution, honest sequencing, reminders, status vault, templates, and post-wedding dashboard placement
  - shipped now in this wave: explicit California-guided coverage framing, claim-safe dashboard/helper copy, marriage-state plus jurisdiction intake, generic state-license/document labels, verified post-wedding dashboard + planner resume placement, state playbooks for California plus expanded Nevada / New York / Texas / Florida / Washington guidance with generic fallback, institution coverage mapping from the downstream library, stronger dual-partner rollout surfaces, copy-or-download action/downstream/status/partner packets, live reminder-RPC compatibility, and planner load compatibility when legacy planning budget/vendor schemas are still present in production
  - deployed now: Vercel production deploy `dpl_5tPUrJk14bc91cCLZqAaf7B1T7qU` plus migration `20260513193000_fix_name_change_reminders_replace_runtime.sql`
  - live proof is green on the current production runtime for the richer planner-depth batch, including saved planner reload
  - status: `MVP DEPTH SHIPPED / CURRENT ACTIVE GAP CLOSED`
- `Universal Registry Barcode Scanner`
  - `ACTIVE EXPANSION / MVP BASELINE SHIPPED`
  - current truth: the competitor-informed MVP bar is shipped and live-proven, and the duplicate-merge depth lane is now also shipped on the current production runtime, but broader provider/product-match depth, refresh parity, and camera compatibility remain active scope
  - implemented now: scan/manual barcode entry UI, barcode normalization, cache-aware edge lookup, registry persistence fields, and focused tests
  - deeper shipped slice now also includes provider-path metadata, review-required match state, explicit `Use best price` / `Add without store` owner controls, Open Library fallback for ISBNs, optional `UPCITEMDB_API_KEY` ladder support, normalized retailer-option building, miss-cache attempt increments, structured duplicate suggestions, owner merge actions, merged quantity previews, duplicate warnings during barcode add, and richer refresh/review metadata on saved items
  - deployed now: migrations `20260513064500_add_registry_barcode_scanner_support.sql` and `20260513195500_add_registry_duplicate_merge.sql`, frontend runtime `dpl_21JQUT36gnfrE6i4qKF5yeghwRpB`, and live `registry-barcode-lookup --no-verify-jwt`
  - live proof is green on the current production runtime, including provider-path/review-required barcode lookup, duplicate merge collapse/readback, owner save/read flow, and public registry endpoint readability
  - deeper barcode batch proof is green locally: `npm run proof:v1:registry`, `npm run typecheck -- --pretty false`, `npm run build`, `git diff --check`
  - deeper barcode batch deploy/live proof status: deployed and live-proven in this wave
  - provider ladder currently ships with free/open coverage first and safe manual fallback when no confident match exists
  - active deeper scope now required: fuller broad-match provider coverage, stronger product-match depth, stronger retailer-sync and refresh parity, and a harder mobile/browser camera compatibility matrix
  - status: `ACTIVE EXPANSION / MVP BASELINE SHIPPED`
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
| `npm run typecheck -- --pretty false` | `PASS` | `local` | `2026-05-13` | Green after the coordinator handoff / issue-desk ship batch |
| `npm run lint -- --quiet` | `PASS` | `local` | `2026-05-13` | Green after the deeper local name-change claim/jurisdiction batch |
| `npm run build` | `PASS` | `local` | `2026-05-13` | Green after the coordinator handoff / issue-desk ship batch |
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
| `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated day-of runtime smoke now proves the shared coordinator board, check-in queue, staffing handoff, issue desk, timeline, message, and Q&A surfaces on the current live deploy |
| `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated name-change runtime smoke now proves the richer saved planner route end to end: authenticated save chain, planner reload, milestone board, templates, case setup, dual-partner rollout, and save affordance on the current live deploy |
| `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Registry runtime proof now covers owner import, duplicate merge collapse/readback, barcode-backed save, dashboard readback, and public registry endpoint readability on the current live deploy |
| `npm run proof:v1:registry` | `PASS` | `local` | `2026-05-13` | Full local registry proof lane is green after the richer duplicate-merge + barcode depth batch and matches the deployed runtime lane |
| `V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route -- --require-live` | `LIVE PASS` | `production` | `2026-05-12` | Dedicated `.dayof.love` host-routing proof is green for `testandkaras.dayof.love`; the live host resolves and fail-closes safely without wrong-site leakage |
| `npm run proof:v1:service-role-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Unauthenticated denial lane green; secure closeout rerun completed with provided key |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Queue-processing proof green; controlled invalid-recipient row fails safely |
| `npm run proof:v1:launch-closeout` | `PASS` | `secure env + production` | `2026-05-11` | Secure closeout bundle green with provided key |
| `npm run proof:v1:collaborator-runtime` | `LIVE PASS` | `production` | `2026-05-12` | Owner invite/accept flow, viewer deny + planner/coordinator allow runtime proof, direct guest/planning/itinerary/settings/section/registry/photos/coordinator/seating write allow-deny coverage, and the guest-dashboard settings RPC lane are green |
| `npm run proof:v1:ai-product-readiness` | `PASS` | `local` | `2026-05-11` | `25/25` AI product-readiness checks passed |
| `npm run proof:v1:data-integrity` | `PASS` | `production` | `2026-05-13` | Anon-limited integrity proof green in the guarded postdeploy bundle; no hard launch corruption found |
| `npm run proof:v1:prereqs` | `PASS` | `production + local env` | `2026-05-13` | Required migrations/functions/runtime readiness green in the guarded postdeploy bundle; deferred provider/AI env notes remain non-launch |
| `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Live AI/photo column exposure and rollout readiness are green |
| `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Translation route plus live AI/photo model-backed lanes are green |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle against Vercel deploy `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle against Vercel deploy `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank`; `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle after the coordinator ship deploy; strict smoke green |
| `GitHub Actions Release Launch Gate` | `PASS` | `GitHub Actions + repo secrets` | `2026-05-11` | Branch-triggered workflow is green on run `25705683563`; strict RSVP smoke is mandatory |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-12` | Public vault contribution save, owner-scoped readback, and cleanup/delete are green after the live inventory/deploy rerun; `ALLOW_VAULT_QA_OPEN` was reset to `false` immediately after proof |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-13` | Current working tree is clean of whitespace errors after the richer registry duplicate-merge + barcode depth batch |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `current production deploy` | `yes` | `Vercel production dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank` | `--prod` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`; guarded postdeploy bundle | green on the latest production deploy | None | `LIVE PASS` |
| `registry-barcode-lookup` | `same-day 2026-05-13 deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `node scripts/v1-proof-registry.mjs --require-live`; `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | green including the richer provider/review/store-choice batch plus duplicate merge collapse/readback on the live owner flow | None on the current duplicate-merge/save/read lane | `LIVE PASS` |
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

1. `ACTIVE`: deepen `Universal Registry Barcode Scanner` provider coverage and richer product-match parity beyond the shipped duplicate-merge lane.
2. `ACTIVE`: deepen `Universal Registry Barcode Scanner` retailer-sync and refresh parity so registry items stay credible after the first save.
3. `ACTIVE`: deepen `Universal Registry Barcode Scanner` mobile/browser camera compatibility so the scan-first flow stays reliable across the real support matrix.
4. `CONDITIONAL / NO-CODE UNTIL REOPENED`: keep the live client-RLS matrix current only if future non-guest write surfaces are added.
5. `CONDITIONAL / NO-CODE UNTIL REOPENED`: keep the no-direct-client-write inventory current only if future runtime write surfaces are added.
6. `CONDITIONAL`: keep the board synced as future deploys change the truth for `Day-of / coordinator`.
7. `CONDITIONAL / NO-CODE`: reopen `Name change` only if the competitor-informed depth bar expands beyond the shipped planner/playbook/export scope.
8. `FUTURE-ONLY`: keep repo-wide TS/ESLint full-flip work future-only unless it is explicitly reactivated.

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
