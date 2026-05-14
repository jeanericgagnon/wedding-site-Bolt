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
| Current date/time | `2026-05-13 05:34 PM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest verified Git SHA | `branch head` |
| Latest verified commit message | `branch head` |
| Vercel deployment ID | `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | Live blocker-fix lane includes `submit-rsvp --no-verify-jwt` plus applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`. Same-day confirmed/live-proven: `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `validate-rsvp-token --no-verify-jwt`; `interactive-section-public --no-verify-jwt`; `vault-contribution-public --no-verify-jwt`; `vault-entry-submit --no-verify-jwt`; `translate-site-content`. Latest deploy waves also pushed `guest-contact-lookup --no-verify-jwt`, `guest-contact-submit --no-verify-jwt`, and the final `registry-barcode-lookup --no-verify-jwt` fuller-suite provider/repair/fallback batch live. |
| Current readiness score | `10 / 10 for the active three-lane full-suite bar` |
| Current launch verdict | `FULL-SUITE READY FOR THE ACTIVE THREE-LANE SCOPE` |
| Production-ready | `YES FOR DAY-OF / COORDINATOR, NAME CHANGE, AND REGISTRY BARCODE` |
| Reason production-ready is claimed | The reopened coordinator scanner/event-awareness lane, the name-change dependency matrix lane, and the aggregate full-suite gate have all rerun green locally and live on production, including a fresh authenticated name-change runtime rerun that closes the last named proof risk with the board and research doc aligned again. |
| Current blockers | None for the active three-lane full-suite scope. Broader repo-completion work remains open in the backlog below. |
| Current proof state | Fresh green proof now covers the reopened hardening bar honestly: focused shared-foundation/scanner/name-change/coordinator Vitest lanes, `npm run proof:v1:qr-scanner`, `npm run proof:v1:coordinator-dayof`, `npm run proof:v1:full-suite-features`, a fresh `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live` rerun, `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live`, `V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate -- --require-live`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `git diff --check`, and `npm run build`. |
| Current deployment state | The latest deployed frontend runtime is [dayof.love](https://dayof.love) via verified Vercel production deploy `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW`. The coordinator migrations `20260513170000_coordinator_event_checkin_write.sql` and `20260513213000_coordinator_handoff_issue_depth.sql`, the name-change reminder compatibility migration `20260513193000_fix_name_change_reminders_replace_runtime.sql`, and the registry duplicate-merge migration `20260513195500_add_registry_duplicate_merge.sql` remain applied remotely. This runtime now has current-production green proof for coordinator QR/manual validation, event-aware day-of routing, name-change dependency/runtime truth, registry live write/read, the responsive three-lane surface check, and collaborator permission boundaries. `submit-rsvp` remains live with the serialized capacity path, and the public-session-secret, admin route gate, guest-contact, route-module decomposition, vault contribution, and `.dayof.love` host-routing lanes remain live-proven. External custom domains remain unsupported product scope, not an active proof lane. |
| Current next actions | Keep the three-lane truth synced as future deploys change it. Use the broader product-completion backlog below for unfinished feature work outside the current hard-claimed scope. |

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

The shipped runtime remains a strong launch baseline, but the stricter full-suite bar is open again and active work remains.

Runtime operator-note checklist:
- `docs/v1-runtime-operator-notes-checklist.md`
- `npm run proof:v1:runtime-note-checklist`

- launch-critical findings are closed and live-proven on the current deployed production runtime
- `Day-of / coordinator`
  - `ACTIVE FULL-SUITE LANE`
  - current truth: launch-baseline coordinator behavior, deeper ops depth, and the reopened full-suite QR/event-awareness bar are now all closed on the current production runtime
  - dedicated live coordinator proof is green on the latest shipped runtime: `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live`
  - coordinator full-suite batch proof is green locally and live: `npm run proof:v1:coordinator-dayof`, `npm run typecheck -- --pretty false`, focused coordinator Vitest lane, `npm run lint -- --quiet`, `git diff --check`, `npm run build`, Vercel production deploy `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW`
  - MVP bar now defined as: event-specific arrival truth, event-scoped counts, explicit exception states, lookup triage, and role-safe day-of routing
  - shipped now in this wave: event-scoped arrival writes + reads, per-event arrival counters, wrong-event / walk-in / help-desk / manager-decision / household-mismatch state handling, richer door routing, and no-match routing inside coordinator mode
  - shipped now in the deeper batch: multi-event staffing and handoff cards, persisted issue desk history, substitute-attendee / plus-one swap tracking with household context, and seating-change-at-door reassignment inside coordinator mode
  - shipped now in the fuller-suite batch: explicit incident owner + next-action + resolved-outcome lifecycle fields, runner/escort task workflow with completion log, guest continuity panel across touched wedding moments, and copy/print shift snapshot surfaces for coordinator handoff
  - deployed now: migrations `20260513170000_coordinator_event_checkin_write.sql` and `20260513213000_coordinator_handoff_issue_depth.sql` plus Vercel production deploy `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW`
  - live proof is green on the current production runtime for QR/manual validation, handoff save, incident lifecycle, runner workflow completion, guest continuity, shift snapshot copy/print export, and event-aware day-of routing
  - full-suite ship checklist:
    - `DONE`: incident ownership lifecycle with explicit assignee, owner, status, next action, and resolved outcome for every coordinator issue
    - `DONE`: runner / escort task workflow that can assign mobile-friendly guest-moving tasks, mark en route / done, and preserve the completion log
    - `DONE`: cross-event guest continuity panel that shows a guest's movement, exceptions, seat changes, and handoff trail across wedding moments
    - `DONE`: handoff/export surfaces that generate a printable or copyable shift snapshot for the next coordinator without losing unresolved work
    - `DONE`: proof expansion so `proof:v1:coordinator-dayof` covers incident lifecycle, runner workflow, cross-event continuity, and handoff export on the shipped runtime
  - this batch fixed now:
    - operational-event helper added and wired into coordinator selection and seating defaults
    - seating lookup no longer uses latest-created seating event globally
    - coordinator check-in now retries after auth refresh like seating check-in
    - bulk seating arrival updates now require confirmation when more than five visible guests would be affected
  - active remaining work:
    - none inside the current full-suite bar
  - status: `FULL-SUITE READY FOR THIS LANE`
- `Name change`
  - `ACTIVE FULL-SUITE LANE`
  - current truth: the planner depth, passport alias normalization, dependency matrix proof, and stricter reminder/template/blocker acceptance are now rerun and aligned on the current production runtime
  - dedicated live runtime proof is green on the current shipped fuller-suite slice: `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live`
  - local fuller-suite proof is green: `npm run proof:v1:name-change-runtime`, `npm run typecheck -- --pretty false`, focused planner/overview/full-suite Vitest lanes, `npm run lint -- --quiet`, `npm run build`
  - MVP bar now defined as: US-first guided execution, honest sequencing, reminders, status vault, templates, and post-wedding dashboard placement
  - shipped now in this wave: explicit California-guided coverage framing, claim-safe dashboard/helper copy, marriage-state plus jurisdiction intake, generic state-license/document labels, verified post-wedding dashboard + planner resume placement, state playbooks for California plus expanded Nevada / New York / Texas / Florida / Washington guidance with generic fallback, institution coverage mapping from the downstream library, stronger dual-partner rollout surfaces, copy-or-download action/downstream/status/partner packets, live reminder-RPC compatibility, and planner load compatibility when legacy planning budget/vendor schemas are still present in production
  - shipped now in the fuller-suite batch: a full 50-state + DC operational matrix, institution handoff packets across government/banking/work-benefits/coverage/home-digital/travel clusters, deeper travel/residency/court-order/combination-name branches, and proof-gap plus institution-handoff export surfaces for real execution handoff
  - deployed now: current Vercel production deploy `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW` carries the fuller-suite planner runtime plus migration `20260513193000_fix_name_change_reminders_replace_runtime.sql`
  - dedicated live proof reran green on the current deploy for authenticated save/reload, state playbook depth, institution packets, dual-partner rollout, export/handoff surfaces, and the refreshed dependency/template/runtime truth
  - full-suite ship checklist:
    - `DONE`: all-state playbook coverage now ships as a full 50-state + DC operational matrix instead of a partially expanded state set plus generic fallback
    - `DONE`: institution-specific follow-through now covers the major downstream clusters with clearer requirements, sequencing, and completion expectations inside the planner
    - `DONE`: special-case execution now covers identity, travel, residency, hyphenation/combination, and court-order edge paths without forcing the user into generic fallback
    - `DONE`: packet/export/collaboration surfaces now support real execution handoff, including proof-gap summaries and institution-ready action packets
    - `DONE`: proof expansion so `proof:v1:name-change-runtime` covers the broadened state matrix, special-case branching, and packet/export handoff surfaces on the shipped runtime
  - this batch fixed now:
    - canonical passport-flag normalization now accepts `has_us_passport`, `hasUsPassport`, and legacy `hasPassport` truth consistently
    - focused regression tests were added for legacy/current passport flag mapping
  - active remaining work:
    - none inside the current full-suite bar
  - status: `FULL-SUITE READY FOR THIS LANE`
- `Universal Registry Barcode Scanner`
  - `FULL-SUITE LANE CLOSED`
  - current truth: the competitor-informed MVP bar, the reopened deeper product-depth bar, and the fuller-suite barcode/reconciliation/repair batch remain shipped on the current production runtime; the dedicated live proof is green on the current deploy and the aggregate full-suite gate reran it in this wave
  - implemented now: scan/manual barcode entry UI, barcode normalization, cache-aware edge lookup, registry persistence fields, and focused tests
  - deeper shipped slice now also includes provider-path metadata, review-required match state, explicit `Use best price` / `Add without store` owner controls, Open Library fallback for ISBNs, optional `UPCITEMDB_API_KEY` ladder support, normalized retailer-option building, miss-cache attempt increments, structured duplicate suggestions, owner merge actions, merged quantity previews, duplicate warnings during barcode add, richer refresh/review metadata on saved items, merged provider/product-match depth across the current lookup ladder, shared retailer refresh parity that keeps selected merchant/url/price state aligned after refresh, and compatibility camera/photo fallback using the broader browser-safe scan path
  - fuller-suite shipped slice now also includes the broader Open Products Facts / Open Beauty Facts / Open Pet Food Facts provider ladder, retailer-drift and proxy-image repair detection, a prioritized owner cleanup queue with refresh/reimport/review actions, stronger camera-permission recovery UX, and proof expansion that keeps live registry cleanup/readback behavior honest
  - deployed now: migrations `20260513064500_add_registry_barcode_scanner_support.sql` and `20260513195500_add_registry_duplicate_merge.sql`, current frontend runtime `dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW`, and live `registry-barcode-lookup --no-verify-jwt`
  - dedicated live proof is green on the current deploy, including broader provider-path barcode lookup, duplicate merge collapse/readback, cleanup-queue truth, retailer reconciliation, compatibility camera/photo fallback, owner save/read flow, and public registry endpoint readability
  - fuller-suite barcode batch proof is green locally and live: `npm run proof:v1:registry`, `LIVE_REGISTRY_WRITE_READ=1 npm run proof:v1:registry -- --require-live`, `npm run typecheck -- --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`
  - fuller-suite barcode batch deploy/live proof status: deployed and live-proven in this wave
  - provider ladder currently ships with free/open coverage first and safe manual fallback when no confident match exists
  - full-suite ship checklist:
    - `DONE`: provider catalog depth broadened beyond the earlier ladder so more real-world barcodes land on confident matches without dropping straight to manual cleanup
    - `DONE`: retailer-sync and reconciliation now support post-save drift handling, selected-retailer repairs, and stronger re-sync truth when prices, URLs, or merchants change
    - `DONE`: device/browser scanning now covers a harder support matrix with permission recovery, compatibility fallbacks, and photo/manual recovery that feel first-class
    - `DONE`: owner repair/review workflow now gives a real cleanup queue for stale, partial, conflicting, and broken imports instead of one-item-at-a-time guesswork
    - `DONE`: proof expansion now covers provider breadth, reconciliation depth, repair/review queue behavior, and device fallback behavior on the shipped runtime
  - status: `FULL-SUITE READY FOR THIS LANE`
  - full concept, architecture, provider ladder, cache tables, and risk notes live in [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md)
- `Cross-feature full-suite exit gate for these 3`
  - `FULL-SUITE EXIT GATE CLOSED`
  - final gate proof is green locally and live: `npm run proof:v1:full-suite-exit-gate`, `V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate -- --require-live`
  - full-suite readiness is now claimable because all three lanes above are shipped and the following are also true:
    - `DONE`: desktop, tablet, and mobile workflows are proven for the final shipped surfaces that matter in real use
    - `DONE`: empty, error, retry, and manual-fallback states are covered through the dedicated coordinator, name-change, and registry proof lanes that the exit gate aggregates
    - `DONE`: saved-data continuity is proven, including reload, legacy-row compatibility where applicable, and real repair/recovery flows
    - `DONE`: role and permission boundaries are proven wherever owners, collaborators, planners, or coordinators touch these features
    - `DONE`: export, handoff, packet, repair, or review flows are complete anywhere the feature depends on them to be operationally usable, with lane-specific proof and a responsive cross-check at the gate
    - `DONE`: dedicated local and live proof lanes cover the final shipped behavior for all newly added full-suite surfaces
  - status: `FULL-SUITE READY FOR THESE 3`
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
| `npm run typecheck -- --pretty false` | `PASS` | `local` | `2026-05-13` | Green after the name-change full-suite matrix / institution-packet / edge-branch batch |
| `npm run lint -- --quiet` | `PASS` | `local` | `2026-05-13` | Green after the name-change full-suite matrix / institution-packet / edge-branch batch |
| `npm run build` | `PASS` | `local` | `2026-05-13` | Green after the coordinator QR scanner + proof batch |
| `npm run proof:v1:qr-scanner` | `PASS` | `local` | `2026-05-13` | QR parsing/security, duplicate-scan debounce, manual fallback, and build integrity are green |
| `npm run proof:v1:full-suite-features` | `PASS` | `local` | `2026-05-13` | Real acceptance gate is green: typecheck, quiet lint, build, name-change runtime proof, coordinator/day-of proof, QR scanner proof, and `smoke:checkin` all pass in one chain |
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
| `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated day-of runtime proof now saves a real handoff, drives issue ownership + runner lifecycle through completion, confirms guest continuity, and verifies shift snapshot copy/print export on the current live deploy |
| `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Dedicated name-change runtime smoke now proves the fuller-suite saved planner route end to end: authenticated save chain, planner reload, milestone board, state playbook matrix, institution handoff packets, dual-partner rollout, and export/handoff surfaces on the current live deploy |
| `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | `LIVE PASS` | `production + browser runtime` | `2026-05-13` | Registry runtime proof now covers owner import, duplicate merge collapse/readback, merged provider/product-match behavior, barcode-backed save, dashboard readback, refresh parity, compatibility camera/photo fallback, and public registry endpoint readability on the current live deploy |
| `npm run proof:v1:registry` | `PASS` | `local` | `2026-05-13` | Full local registry proof lane is green after the final provider-merge + refresh-parity + compatibility-camera batch and matches the deployed runtime lane |
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
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle against Vercel deploy `dpl_4TCWmUaSfuV3MJysqcYJUCyKTWJs` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle against Vercel deploy `dpl_4TCWmUaSfuV3MJysqcYJUCyKTWJs`; `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-13` | Fresh rerun in the guarded postdeploy bundle after the final registry depth deploy; strict smoke green |
| `GitHub Actions Release Launch Gate` | `PASS` | `GitHub Actions + repo secrets` | `2026-05-11` | Branch-triggered workflow is green on run `25705683563`; strict RSVP smoke is mandatory |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-12` | Public vault contribution save, owner-scoped readback, and cleanup/delete are green after the live inventory/deploy rerun; `ALLOW_VAULT_QA_OPEN` was reset to `false` immediately after proof |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-13` | Current working tree is clean of whitespace errors after the name-change full-suite batch proof reruns |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `current production deploy` | `yes` | `Vercel production dpl_EgkU34BQxP2sibkgpcwaqiZTUJNW` | `--prod` | Current three-lane full-suite runtime deployed; coordinator, name-change, registry, responsive cross-device, and collaborator-permission proof all reran green against this production runtime | green for the active three-lane full-suite scope on the current production deploy | None inside the active three-lane full-suite scope | `LIVE PASS` |
| `registry-barcode-lookup` | `same-day 2026-05-13 deploy` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `node scripts/v1-proof-registry.mjs --require-live`; `LIVE_REGISTRY_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts` | green including merged provider/product-match behavior, retailer refresh parity, compatibility camera/photo fallback, and duplicate merge collapse/readback on the live owner flow | None on the current registry barcode lane | `LIVE PASS` |
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

## Next Tasks

1. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: broader registry provider catalog depth and stronger confident-match coverage shipped live.
2. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: registry retailer-sync / reconciliation depth plus owner repair/review queue surfaces shipped live.
3. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: registry hard device/browser fallback coverage and proof expansion shipped live.
4. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: desktop/tablet/mobile full-suite workflows are proven for the final shipped coordinator, name-change, and registry surfaces.
5. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: empty/error/retry/manual-fallback gaps are closed across the final shipped coordinator, name-change, and registry surfaces.
6. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: saved-data continuity, repair/recovery, and legacy compatibility are proven across the final shipped coordinator, name-change, and registry surfaces.
7. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: final role/permission boundaries plus export/handoff/packet/review readiness are proven across the three lanes.
8. `DONE IN CURRENT FULL-SUITE CLOSEOUT`: dedicated local and live proof lanes now cover the final full-suite surfaces before ready was claimed.
9. `CONDITIONAL / NO-CODE UNTIL REOPENED`: keep the live client-RLS matrix current only if future non-guest write surfaces are added.
10. `CONDITIONAL / NO-CODE UNTIL REOPENED`: keep the no-direct-client-write inventory current only if future runtime write surfaces are added.
11. `CONDITIONAL / NO-CODE UNTIL FUTURE DEPLOYS`: keep the board synced as future deploys change the truth for coordinator, name-change, or registry depth.
12. `FUTURE-ONLY`: keep repo-wide TS/ESLint full-flip work future-only unless it is explicitly reactivated.

## Broader Product Completion Backlog

This section is the honest backlog for product surface that is still not fully made, even though the current launch baseline and the active three-lane hard claim are closed.

Execution rule for this section:
- a lane is only `DONE` when runtime behavior, local proof, live proof where applicable, and board truth all agree
- do not promote planned/readiness cards to done just because copy or static UI exists
- keep `DEFERRED` items clearly separate from true product gaps

### Highest-Leverage Open Lanes

1. `ACTIVE`: guest-specific preview and visibility confidence
   - this batch shipped: guest itinerary drawer now exposes private RSVP and guest-update QR surfaces that render locally, keep raw token URLs out of normal UI copy, and give owners concrete guest-path artifacts from the dashboard instead of only plain links
   - this batch shipped: the public guest hub now preserves guest invite identity, exposes a real guest-update action when a private guest path exists, and carries that guest-specific path without printing raw token URLs in the hub UI
   - this batch shipped: owner preview context now follows through on guest-facing contact update, photo upload, guestbook, vault, and recap routes instead of stopping at the site or RSVP shell
   - this batch shipped: guest-specific hub links now carry private guest identity into photo upload, guestbook, vault, and recap routes, and those routes now capture and preserve that identity instead of dropping back to purely public context on the next click
   - this batch shipped: owner guest preview now exposes direct guest-surface links for photo upload, guestbook, recap, travel, and registry instead of limiting preview confidence to RSVP, contact update, or the top-level site shell
   - this batch shipped: the main Guests dashboard list and household views now expose direct guest-view preview actions, so owners can jump into the real guest-facing site path without opening the itinerary drawer first
   - this batch shipped: the guest visibility drawer now includes the anniversary-vault guest path alongside RSVP, guest update, photos, guestbook, recap, travel, and registry so preview confidence covers another real private guest surface
   - finish true route-level personalization beyond the owner preview banner and guest-update path
   - wire planner/coordinator role preview controls from dashboard flows
   - extend preview confidence to photo, registry, and travel surfaces
   - add cross-surface tests proving private event visibility is hidden from the wrong guest and visible to the right guest
   - add live/mobile click proof for the Guests drawer preview flow

2. `ACTIVE`: unified QR guest hub
   - this batch shipped: QR share surfaces now support private DayOf payloads through local SVG generation instead of the public QR vendor, and the private guest QR path is now wired into both RSVP and guest-update owner surfaces
   - this batch shipped: the guest hub action model now supports a guest-specific update path that can ride the same private guest identity captured from the link instead of falling back to only public hub actions
   - this batch shipped: guest-specific QR/hub flows now preserve private guest identity across the next-step guest routes instead of only into the first contact-update page
   - this batch shipped: the guest hub action model now includes the anniversary-vault guest path when a private guest invite path exists, so the shared QR/hub surface covers another real private guest workflow without exposing it in the generic public hub
   - add guest-specific QR mode that never prints private invite access in public assets
   - add QR revocation/rotation model for guest-specific QR links
   - finish day-of update deep links and any remaining private guest-surface routing in the shared hub model
   - prove generated print-pack assets are nonblank and route correctly after real download
   - add live production mobile proof that public and guest-specific QR modes land on the right actions without private leakage

3. `ACTIVE`: status-based messaging and invitation tracking
   - normalize delivery/open/view/bounce/replied truth across channels
   - add recipient retry and exclusion workflow without exposing provider internals
   - pull full meal-choice source truth into segment logic instead of partial RSVP-row assumptions
   - prove customer-safe delivery-failure grouping against live rows
   - add live browser proof for composing/saving each operational segment
   - keep SMS/Telnyx live-send behavior deferred until provider/compliance setup is ready

4. `ACTIVE`: RSVP access modes and question templates
   - persist owner-selected RSVP access mode instead of leaving code/password/open modes as planned-only
   - implement recovery rules for unique-code/password flows
   - design and prove phone/email verification without breaking existing private-link behavior
   - add household-specific access proof beyond the current strict token lane
   - add full bad-code/password/open-RSVP proof before any non-private mode is marked ready

5. `ACTIVE`: wedding identity exports
   - implement real PNG/PDF rendering rather than HTML-only print-pack output
   - add mobile story graphic export plus monogram/palette/type kit export
   - prove print text-fit and contrast against multiple themes
   - add live browser proof for copying/downloading manifest and print-pack assets

### Strong-Differentiator Lanes Still Open

6. `ACTIVE`: premium no-app guest photo and memory flow
   - ship true full-resolution export/download jobs
   - add live guest video upload browser proof
   - add live slideshow publish/display proof beyond owner-draft readiness
   - add mobile guest upload proof for the checklist/no-app flow
   - prove owner moderation readback after real live uploads

7. `ACTIVE`: destination/travel guest portal
   - add structured hotel, room-block, shuttle, visa, and cultural-tip records
   - add guest-specific room/shuttle/travel guidance instead of generic travel copy
   - reuse event/household visibility rules across travel detail surfaces
   - add export/share views and richer public travel-route content
   - add live mobile guest-path proof from invite to travel to RSVP/photo surfaces

8. `ACTIVE`: reminders, digests, and notification preferences
   - persist digest cadence and real notification preferences
   - add snooze/quiet controls backed by saved preference state
   - add scheduled email delivery instead of readiness-only framing
   - connect digest counts to real source-of-truth task/payment/message/photo/seating state
   - prove owner/planner email rendering and safe delivered-readback behavior

9. `ACTIVE`: guest language system
   - persist guest/household language fields
   - add owner controls for default and allowed languages
   - add true per-recipient language targeting in message sends
   - translate RSVP custom questions and review workflows for translated builder/site content
   - add live production proof for owner messaging previews and guest-facing language continuity

### Later-Value Lanes Still Open

10. `ACTIVE`: registry polish beyond barcode
   - add live owner add/import/edit persistence proof for broader registry workflows
   - add owner repair/cleanup runtime proof outside the barcode lane
   - prove guest-visible purchase-state truth after real edits
   - persist thank-you task generation/readback instead of preview-only readiness
   - add owner claim-state workflows, richer public fund-card polish, and broader registry analytics

11. `ACTIVE`: seating and catering export polish
   - add live production seating write/read with cleanup for packet/export flows
   - inspect real downloaded CSV/PDF/image packets against RSVP source data
   - prove seating lookup readback after assignment edits and itinerary/seating drift after RSVP changes
   - persist richer structured meal/dietary/venue-note fields where schema is still thin
   - add catering-specific exports beyond the current CSV/PDF/image packet set

12. `ACTIVE`: budget and vendor ledger
   - add live owner add/edit/delete proof with cleanup for vendor/payment/budget rows
   - prove collaborator/planner allowed-view readback and guest non-exposure for financial details
   - persist reminder delivery/preferences for the ledger
   - add richer contract/invoice file storage and payment-schedule subtasks
   - reconcile vendor contract balances against budget line balances

13. `ACTIVE`: website and invite analytics
   - add privacy-safe site-visit, invite-open/view, and QR-scan event instrumentation
   - define event storage and aggregation contracts
   - add event-backed funnel charts instead of review-model-only analytics
   - prove public/guest non-exposure of analytics data
   - add live production analytics readback plus owner retention/consent controls

14. `ACTIVE`: app-like web day-of mode
   - implement true offline caching/service-worker behavior
   - tie guest-hub announcements to owner messaging instead of planned-only status
   - add guest-specific RSVP/check-in state on the hub
   - prove directions/map deep links, coordinator/guest handoff, and private-event visibility on the hub
   - add live production guest-hub write/read with cleanup after the day-of web-mode lane is finished

### Deferred / Outside This Backlog

- `DEFERRED`: live SMS/Telnyx sending and SMS credit purchase proof until LLC, compliance, sender setup, and provider billing are ready
- `DEFERRED`: native Instagram/TikTok direct story posting until native/app share integration exists
- `DEFERRED`: external custom domains until the custom-domain lane is explicitly reopened
- `DEFERRED`: face recognition / identity clustering unless explicit privacy controls are added first

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
