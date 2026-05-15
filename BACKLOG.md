# Production Hardening Backlog

## Quick Read

- Last updated: `2026-05-15 10:44 AM PDT`
- Latest shipped batch: `8e2fda53` `Clarify guest-hub detail status chips`
- Latest backlog-cleanup state: top-of-file scan is current through the latest shipped registry launch-readiness wording batch
- Open backlog lanes: `7`
- Current session blocker: focused Vitest runs are still silently stalling in this saturated session, so `git diff --check` plus `npm run proof:v1:board:md` remain the reliable fast proof path
- Current transport blocker: none active right now
- Blocked this session:
  - `npx vitest run src/pages/dashboard/registry/RegistryDashboardRouteContent.test.tsx` still stalls without producing useful output in this session
- Work source-code next:
  - `registry polish beyond barcode`: rerun owner add/import/edit persistence proof
  - `registry polish beyond barcode`: rerun guest-visible purchase-state assertions on production
- First code retry after the current registry copy batch:
  - keep moving the registry owner summary lane while files stay readable
  - then return to live production proof on the same lane
- Best place to scan after each batch:
  - `Quick Read` for the newest timestamp and latest shipped batch
  - `Recent Shipped Work` for the most recent visible progress by lane
  - `What's Left Now` for the real open work

## Recent Shipped Work

- `Latest batch list`
  - `8e2fda53` `Clarify guest-hub detail status chips`
  - `07c10204` `Clarify travel guest-path status chips`
  - `f67be865` `Clarify memory flow status chips`
  - `f8b9d4fd` `Clarify registry top-strip labels`
  - `372aa01a` `Clarify registry empty-state readback`
  - `7a7fea5a` `Clarify registry cleanup-tools summaries`
  - `9c7f3dba` `Clarify registry duplicate-review summaries`
  - `4be3b652` `Clarify registry cleanup-queue summaries`
  - `68ffcdc6` `Clarify registry share-readiness card`
  - `58c399a5` `Clarify registry launch-readiness wording`
  - `fb108199` `Clarify registry cleanup all-clear`
  - `9a90e9a1` `Clarify registry thank-you quiet state`
  - `4a819edd` `Clarify registry zero-state analytics rows`
  - `ff15d92e` `Clarify registry snapshot summaries`
  - `dcc3d69c` `Clarify registry quick-check summaries`
  - `913b7124` `Clarify registry supporting-card clean states`
  - `a0eb64d4` `Clarify registry supporting-card summaries`
  - `0f0b061e` `Clarify registry notes lead summary`
  - `540da41a` `Clarify registry analytics wording`
  - `969dadbf` `Clarify registry note labels`
  - `522524ca` `Clarify registry supporting cards`
  - `2d3bdc56` `Clarify registry guest and review summaries`
  - `3aa83255` `Clarify registry quiet summary cards`
  - `838be5c8` `Clarify registry zero-state summaries`
  - `b2ed7c14` `Clarify registry clean-state readback`
  - `86748b72` `Clarify memory flow lead summaries`
  - `4e419d60` `Clarify travel all-clear summaries`
  - `79e76e63` `Clarify RSVP and travel all-clear follow-through`
  - `c59192e0` `Record backlog session blocker` `local only`
  - `28c413f6` `Add backlog next-step scan`
  - `fe751e70` `Tighten backlog latest batch scan`
  - `80a1ff75` `Clean backlog top scan`
  - `ddcaa550` `Clarify RSVP optional all-clear`
  - `fd613b37` `Clarify memory step all-clear`
  - `7a272467` `Clarify memory lane all-clear`
  - `7be6bf11` `Clarify memory no-gap badge`
  - `8c59e667` `Clarify travel badge all-clear`
  - `132d89cd` `Clarify travel no-gap badge`
- `RSVP access modes and question templates`
  - latest shipped: the optional RSVP setup summary now also says `0 optional improvements still open` and `No optional layers need action` in the all-clear state
- `premium no-app guest photo and memory flow`
  - latest shipped: the no-app memory-flow card now also labels every lane and step chip explicitly as `Lane ready`, `Lane needs action`, `Step ready`, `Step planned`, or `Step empty`, so the detailed checklist no longer falls back to abstract generic status pills after the stronger lead summary
- `destination/travel guest portal`
  - latest shipped: the guest-hub travel path now labels each detail card explicitly as `Travel step ready` or `Travel step needs setup`, so the detailed mobile path no longer falls back to vague generic pills after the stronger summary readback
- `status-based messaging and invitation tracking`
  - latest shipped: owner messaging summaries, thread strips, review/history rows, and detail surfaces now keep targeting, delivery, cleanup, and engagement truth explicit across pre-send, zero-state, and partial-send cases
- `registry polish beyond barcode`
  - latest shipped: the top registry status strip now uses clearer owner labels like `Weekly refresh running`, `Refresh budget 12/100 this month`, `Worth checking`, `Cleanup queue`, and `Duplicate review groups`, so the first scan reads like product truth instead of older internal utility labels

## Work This Next

- `guest-specific preview and visibility confidence`
  - rerun the guest preview strip/drawer on the shipped runtime
  - prove wrong-guest/right-guest visibility on live auth flows
- `unified QR guest hub`
  - latest shipped: the guest-hub detail cards now label day-of mode and hub-status items explicitly as `Mode ready`, `Mode needs info`, `Mode planned`, `Hub item ready`, `Hub item needs info`, or `Hub item planned`, so the details drawer no longer falls back to generic status labels after the stronger summary copy
  - rerun mobile live proof for public vs guest-specific QR landings
- `RSVP access modes and question templates`
  - rerun owner RSVP settings proof on the shipped runtime
- `status-based messaging and invitation tracking`
  - add authenticated live browser proof for composing and saving each segment on the shipped runtime
  - keep live-row delivery and failure grouping proof moving
- `registry polish beyond barcode`
  - rerun owner add/import/edit persistence proof
  - rerun guest-visible purchase-state assertions on production
- `premium no-app guest photo and memory flow`
  - continue the no-app guest photo flow lane from the current owner-readback cleanup
- `destination/travel guest portal`
  - continue guest-hub and owner travel runtime proof after the current all-clear readback cleanup

## What's Left Now

These are the active product-completion lanes still open after the current launch-hardening scope:

- Total open lanes: `7`

1. `guest-specific preview and visibility confidence`
   - production reruns are still open for the newer guest preview strip and drawer on the shipped runtime
   - deeper route-level personalization proof is still open
   - wrong-guest/right-guest live visibility proof is still open
   - authenticated mobile live proof is still open
2. `unified QR guest hub`
   - latest shipped: the guest-hub detail cards now label day-of mode and hub-status items explicitly as `Mode ready`, `Mode needs info`, `Mode planned`, `Hub item ready`, `Hub item needs info`, or `Hub item planned`, so the details section keeps the same guest-safe truth style as the newer travel-path and link-access cleanup
   - live production mobile proof is still open for public versus guest-specific QR landing behavior
3. `RSVP access modes and question templates`
   - latest shipped: the optional RSVP setup summary now also says `0 optional improvements still open` and `No optional layers need action` in the all-clear state, so the optional lane closes with both the same count-based language and the same all-clear wording family it uses when optional layers still need work
   - production rerun is still open for the owner RSVP settings proof on the shipped runtime
   - any future move of code/password/open RSVP beyond `planned` still needs real guest-facing runtime proof
4. `status-based messaging and invitation tracking`
   - top-level delivery follow-through and per-channel delivery summaries now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the highest-level owner messaging summaries stay aligned with the newer modal and thread follow-through wording
   - recent owner-surface cleanup now keeps row-level pre-send and zero-state targeting, coverage, cleanup, and engagement truth explicit in review/history lists too
   - campaign-thread rollups plus history/review rows now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the remaining list surfaces stay aligned with the newer summary, thread, and modal follow-through wording
   - messaging summaries now also read `needs contact details` and `not reached yet` back against the full targeted audience, so contact-cleanup and unreached follow-through truth uses the same audience-scaled language as delivered and cleanup states
   - message-detail header, review-plan chips, and footer now also read `needs contact details` and `not reached yet` back against the full targeted audience, so the modal no longer mixes audience-scaled delivery/cleanup truth with raw contact-cleanup counts
   - condensed history-row metadata now uses the same explicit `need contact details` wording as the broader messaging summaries, so the compact list view no longer falls back to a slightly different contact-cleanup phrase
   - active campaign thread and latest-message strips now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so those summary surfaces stay aligned with the newer modal follow-through language instead of reverting to raw-count-only cleanup truth
   - message-detail header readback now mirrors the same explicit targeting and follow-through truth instead of hiding it below the fold
   - message-detail recipient snapshot now also reads delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the first modal screenful no longer switches back to raw-count-only follow-through language
   - message-detail footer now keeps targeted and cleanup truth explicit too, so the bottom summary no longer drops those lanes in quiet or pre-send cases
   - message-detail review buckets now read back review/contact counts against the total targeted audience, not just as isolated raw counts
   - message-detail `Next-send review plan` now also reads delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so modal follow-through truth no longer mixes raw counts with audience-scaled review buckets
   - keep extending normalized delivery and engagement truth across real/live rows
   - prove customer-safe failure grouping against live rows
   - add authenticated live browser proof for composing and saving each operational segment on the shipped runtime
   - keep SMS/Telnyx live-send behavior deferred until provider/compliance setup is ready
5. `registry polish beyond barcode`
  - latest shipped: `Registry quick check` now stays explicit in both mixed and all-clear states with lead readback like `1 next-step fix · 1 polish cleanup worth a quick pass.` or `No quick registry fixes worth flagging right now.`, so that last big registry card now scans like a summary first instead of a raw prompt list
   - live owner add/import/edit persistence proof is still open
   - stronger owner repair/cleanup runtime proof on production is still open
   - guest-visible purchase-state assertions on production are still open
   - broader claim-state depth and richer public fund-card polish are still open
6. `premium no-app guest photo and memory flow`
   - latest shipped: the no-app memory-flow card now also labels every lane and step chip explicitly as `Lane ready`, `Lane needs action`, `Step ready`, `Step planned`, or `Step empty`, so the detailed checklist keeps the same owner-facing truth style as the stronger lead summary instead of falling back to generic pills
   - this lane remains active and unfinished
7. `destination/travel guest portal`
   - latest shipped: the guest-hub travel path now labels each detail card explicitly as `Travel step ready` or `Travel step needs setup`, so the detailed mobile flow keeps the same owner-safe truth style as the newer travel summary readback instead of dropping back to generic pills
   - this lane remains active and unfinished

Archive for deferred/history detail:
- [BACKLOG_ARCHIVE.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG_ARCHIVE.md)

Use this file for active launch truth, active hardening items, proof matrices, and next actions.

## Launch Question

Is the current repo a clean launch baseline today?

Yes. The launch-critical hardening lane is closed, the blocker-fix runtime is live, and the release gate now enforces the Supabase-backed RSVP proof lane.

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-15 10:39 AM PDT` |
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

Paused handoff marker for this broader backlog:
- 2026-05-14 PT: backlog implementation is paused here after the messaging reach-snapshot delivery-follow-through pass and the vendor-system backlog intake below
- when backlog work resumes, treat the new vendor lane below as planning scope until a specific phase is explicitly activated; do not silently turn it into a default dashboard tab
- default couple nav should stay calm: `Home`, `Website`, `Guests`, `Registry`, `Messages`, `Memories`, `More Tools`
- vendor discovery belongs in `More Tools` as `Find Vendors`; only pinned couples should see the top-level nav label `Vendors`

Paused next-priority bucket when backlog work resumes:
- guest-specific preview and visibility confidence
- unified QR guest hub
- RSVP access modes and question templates
- status-based messaging and invitation tracking
- registry polish beyond barcode
- premium no-app guest photo and memory flow
- destination/travel guest portal
- keep these seven lanes ahead of later-value work, vendor-planning work, and keep-green-only lanes unless a new launch blocker reorders the queue

### Highest-Leverage Open Lanes

1. `ACTIVE`: guest-specific preview and visibility confidence
   - this batch shipped: guest itinerary drawer now exposes private RSVP and guest-update QR surfaces that render locally, keep raw token URLs out of normal UI copy, and give owners concrete guest-path artifacts from the dashboard instead of only plain links
   - this batch shipped: the public guest hub now preserves guest invite identity, exposes a real guest-update action when a private guest path exists, and carries that guest-specific path without printing raw token URLs in the hub UI
   - this batch shipped: owner preview context now follows through on guest-facing contact update, photo upload, guestbook, vault, and recap routes instead of stopping at the site or RSVP shell
   - this batch shipped: guest-specific hub links now carry private guest identity into photo upload, guestbook, vault, and recap routes, and those routes now capture and preserve that identity instead of dropping back to purely public context on the next click
   - this batch shipped: owner guest preview now exposes direct guest-surface links for photo upload, guestbook, recap, travel, and registry instead of limiting preview confidence to RSVP, contact update, or the top-level site shell
   - this batch shipped: the main Guests dashboard list and household views now expose direct guest-view preview actions, so owners can jump into the real guest-facing site path without opening the itinerary drawer first
   - this batch shipped: guest rows in the main Guests table now carry their own in-cell `Events` and `Guest view` preview strip, so the preview controls stay visible even when the far-right action cluster gets cramped in the dashboard shell
   - this batch shipped: the guest visibility drawer now includes the anniversary-vault guest path alongside RSVP, guest update, photos, guestbook, recap, travel, and registry so preview confidence covers another real private guest surface
   - this batch shipped: the guest visibility drawer now also reads back total preview-route coverage plus how many of those routes are invite-only, so owners can tell at a glance whether guest-specific preview confidence covers just the public shell or the fuller private path set too
   - this batch shipped: the guest visibility drawer now also reads back how many preview routes stay in the public site shell, so owners can tell whether preview confidence is mostly private guest-path coverage, mostly public-shell coverage, or a healthy mix of both
   - this batch shipped: the guest visibility drawer now also surfaces guest-specific versus public-shell coverage percentages, so owners can judge the route mix at a glance instead of mentally converting raw route counts into confidence
   - this batch shipped: the guest visibility drawer now also calls out visible-event and hidden-event counts beside route coverage, so owners can judge guest-preview confidence across both route depth and event visibility without opening every preview link one by one
   - this batch shipped: the guest visibility drawer now also normalizes event-visibility coverage as a percentage, so owners can see how much of the event set this guest can actually see without translating only visible and hidden counts
   - this batch shipped: the guest visibility drawer now also reads back the still-hidden event share when a guest only sees part of the itinerary, so owners can judge partial event visibility without mentally inferring the hidden percentage from the visible coverage line
   - this batch shipped: the guest visibility drawer now always reads back the hidden-event count, including an explicit `0 hidden events` state when the guest can see everything, so full visibility is confirmed instead of merely implied
   - this batch shipped: the guest visibility drawer now also keeps the hidden-event percentage visible in the fully visible case as `0% still hidden`, so the visibility rate line confirms the all-clear state instead of going quiet when nothing is hidden
   - this batch shipped: the guest-preview header summary now also carries the hidden-event count beside the visible-event count, so owners can read the itinerary split immediately from the top summary instead of only from the deeper route and coverage lines
   - this batch shipped: the guest visibility drawer now also spells out whether this guest actually has a private event path ready versus only public-shell preview coverage, so owners can tell the difference between “preview exists” and “private guest access is really ready”
   - this batch shipped: the guest visibility drawer now also gives that preview state a plain-language readiness label like `Private guest path ready`, `Public shell only`, or `Visible events without private link`, so owners can read the route state without decoding only counts and warning copy
   - this batch shipped: the guest visibility drawer now also calls out the main preview gap in plain language, like inviting the guest to a visible event or rotating/creating a private RSVP link, so owners can see the next fix immediately instead of deriving it from route counts and warnings
   - this batch shipped: the guest visibility drawer now labels private preview-route coverage as `guest-specific` instead of the looser `invite-only`, so owners can tell which preview links really carry per-guest identity rather than only private/public shell context
   - this batch shipped: the guest visibility drawer now also says how many preview routes are still missing, so owners can judge remaining preview-path completeness without mentally subtracting live route counts from the fuller guest-surface set
   - this batch shipped: the guest visibility drawer now also normalizes preview-route coverage as a percentage, so owners can judge overall preview completeness at a glance instead of translating only raw ready and missing route counts
   - this batch shipped: the guest visibility drawer now also reads back the concrete ready preview-route count beside preview-route coverage and missing-route totals, so owners can tell how much of the guest-facing path set is already live without backing into it from percentages alone
   - this batch shipped: the guest visibility drawer now also names the events that are visible to the guest, so owners can read both sides of itinerary visibility directly in the preview drawer instead of inferring the visible set from counts alone
   - this batch shipped: the guest visibility drawer now repeats the visible-event readback beside the event chips lower in the panel, so the detailed preview section stays explicit about what this guest can actually see without making owners jump back up to the coverage copy
   - this batch shipped: the guest visibility drawer now keeps the hidden-event all-clear explicit with `No hidden events for this guest.` in the detailed preview section, so full itinerary visibility is confirmed there too instead of only in the counts row
   - this batch shipped: demo/local guest preview proof now includes structured visible-versus-hidden itinerary variation, routes the drawer through the real guest-specific event set, carries demo site context into guest preview links, and proves in a real browser that owners can open the public-site preview plus the exact guest RSVP route for a hidden-event guest without raw-token UI leakage
   - this batch shipped: coordinator door-check and seating-lookup surfaces now expose direct guest-view preview actions, so owners/planners can jump from live ops tools into the real guest-facing RSVP/site path without losing event context or exposing raw token copy in the UI
   - this batch shipped: a dedicated `proof:v1:guest-preview-confidence` lane now reruns preview-route generation, guest drawer token-safe QR surfaces, the real desktop drawer flow, and a new mobile drawer flow that opens photo upload, travel, registry, and public-site guest views from the owner drawer without raw-token leakage
   - this batch shipped: the guest-preview proof lane now has a real authenticated live desktop spec for the shipped owner runtime instead of trying to reuse the localhost-only demo-auth drawer flow as production evidence
   - 2026-05-14 authenticated production rerun on `https://dayof.love` now reaches the real owner Guests surface, but the shipped runtime is still on the older Guests list layout for the proof account, so desktop/mobile live preview proof stays open until the new in-cell preview strip is deployed and rerun on production
   - finish true route-level personalization beyond the owner preview banner, guest-update path, and demo/local preview proof
   - rerun the new authenticated guest-preview desktop proof plus the photo, registry, travel, and public-site guest drawer flow against the shipped production runtime after the live guests dashboard route matches the proven local runtime again
   - add cross-surface live tests proving private event visibility is hidden from the wrong guest and visible to the right guest
   - add authenticated mobile live click proof for the Guests drawer preview flow on the shipped runtime once the live guests dashboard shell exposes the expected owner QA controls again

2. `ACTIVE`: unified QR guest hub
   - this batch shipped: QR share surfaces now support private DayOf payloads through local SVG generation instead of the public QR vendor, and the private guest QR path is now wired into both RSVP and guest-update owner surfaces
   - this batch shipped: the guest hub action model now supports a guest-specific update path that can ride the same private guest identity captured from the link instead of falling back to only public hub actions
   - this batch shipped: guest-specific QR/hub flows now preserve private guest identity across the next-step guest routes instead of only into the first contact-update page
   - this batch shipped: the guest hub action model now includes the anniversary-vault guest path when a private guest invite path exists, so the shared QR/hub surface covers another real private guest workflow without exposing it in the generic public hub
   - this batch shipped: the shared guest hub now includes a direct `Latest update` action when day-of cards are present, and that deep link preserves private guest invite + language context all the way into the in-hub day-of update/status/access section instead of forcing guests to hunt for the current update after scanning or opening a private QR path
   - this batch shipped: owner guest drawers now expose rotate/revoke controls for private RSVP access, so private guest QR/link sharing is no longer effectively permanent once created
   - this batch shipped: a dedicated `proof:v1:guest-hub-qr` lane now reruns safe public QR asset generation, dashboard print-card readiness, and a browser-triggered export capture that verifies the saved guest-hub print pack is nonblank HTML with safe public QR payloads and no private token leakage
   - this batch shipped: the guest-hub QR proof lane now also guards the shared guest-hub action model and the EventHub live-content route anchor for the `Latest update` deep link, so day-of routing cannot silently drift out of the QR hub model
   - this batch shipped: private RSVP and guest-update QR panels now save owner-controlled printable HTML cards that keep raw token URLs out of normal visible copy while still rendering the local private QR artifact
   - this batch shipped: the guest-hub QR proof lane now has a real authenticated live export spec for the shipped owner runtime instead of relying on the localhost-only demo-auth dashboard harness for production evidence
   - 2026-05-14 authenticated production rerun on `https://dayof.love` passed for the owner photos dashboard print-pack export, confirming the shipped owner runtime saves a nonblank token-safe guest-hub QR HTML pack on the real site
   - this batch shipped: the guest-hub `Link access` card now also spells out how many guest actions the current link unlocks and which actions those are, so QR/day-of link truth no longer stops at `Public`, `Invite-only`, or `Guest-specific`
   - this batch shipped: the guest-hub `Link access` card now also reads back core day-of coverage from that exact link, including what is still missing from RSVP, schedule, travel, and photo follow-through, so couples can tell whether a QR path is merely private or actually complete enough to rely on
   - this batch shipped: the guest-facing `Link access` card and owner `Guest hub status` summary now also normalize core day-of link coverage as a percentage, so couples can judge QR/day-of completeness at a glance instead of translating `2 of 4` or `3 of 4` coverage by hand
   - this batch shipped: the guest-hub `Link access` card now also reads back how many of the four core day-of actions are already ready, so guests can pair the QR/day-of coverage percentage with a concrete ready-action count instead of translating the link math by hand
   - this batch shipped: the owner-facing `Guest hub status` board now also reads back which guest actions the current link unlocks when link-access truth is connected, so the day-of readiness summary stays aligned with the guest-facing QR/hub access card
   - add live production mobile proof that public and guest-specific QR modes land on the right actions without private leakage

3. `ACTIVE`: status-based messaging and invitation tracking
   - this batch shipped: message audience segmentation now hydrates meal-choice truth from canonical RSVP rows instead of trusting possibly stale guest-table meal fields, so `Missing meal` targeting follows the real RSVP record
   - this batch shipped: owner messaging surfaces now use slightly stricter delivery wording (`delivered`, `queued`, `sending`) instead of flatter “sent or ready” phrasing on the reach snapshot
   - this batch shipped: the comms dashboard now runs a single owner-facing delivery-state model across badges and message detail headers, so `scheduled`, `queued`, `sending`, `partial`, `failed`, and `sent` stay visibly distinct instead of collapsing into “sent or ready” language
   - this batch shipped: message detail review now supports focused retry for reviewed failed recipients and next-send exclusions for recipients still missing contact details, backed by explicit recipient filters instead of provider-specific operator steps
   - this batch shipped: dashboard delivery reads now carry `guest_id`, so follow-up review can target or exclude real guest rows without printing raw provider internals in the UI
   - this batch shipped: review buckets now collapse raw provider noise into customer-safe labels like `Missing contact details`, `Phone number needs review`, `Email address needs review`, `Blocked or unsubscribed`, and `Temporary delivery issue`, with the comms proof lane expanded to cover the new workflow
   - this batch shipped: `proof:v1:comms-center` now includes a real local browser pass for the comms dashboard, proving owners can load each operational starting point, save drafts for save-the-date / RSVP reminder / week-of / photo request / day-of / thank-you flows, and create a scheduled campaign without hand-waving over the composer
   - this batch shipped: message-detail review now uses a shared customer-safe delivery-bucket summary for failed and skipped recipients, so owners see the same normalized review reasons in the detail modal that analytics and telemetry already use instead of slightly different ad hoc groupings
   - this batch shipped: focused proof is green for shared failed/skipped delivery bucket derivation plus the detail-modal readback of those grouped review reasons
   - this batch shipped: safe engagement counts for `opened`, `viewed`, `clicked`, `replied`, and `bounced` now persist through demo message storage and read back through the shared messaging helpers instead of disappearing after a local save/reload
   - this batch shipped: owner history, active campaign thread, latest campaign message, and detail modal surfaces now show the same normalized engagement truth when those counts exist, rather than leaving review-only surfaces stuck on delivered/failed totals
   - focused proof is green for engagement-count normalization in demo storage plus shared helper readback and detail-modal rendering
   - this batch shipped: the top-level guest-reach snapshot now reads the same normalized engagement totals from completed campaigns, so owners can see opens, clicks, replies, page views, and bounces without drilling into thread history first
   - focused proof is green for completed-campaign engagement rollup math plus the updated snapshot wiring staying aligned with the shared messaging helper
   - this batch shipped: the top-level guest-reach snapshot now also separates `Sent`, `Active`, and `Needs follow-up` campaign counts instead of flattening queued/sending work into one opaque total beside sent campaigns
   - this batch shipped: the top-level guest-reach snapshot now also includes `Needs review` in that campaign-state rollup, so failed campaigns stay visible in the highest-level messaging readback instead of disappearing until owners drill into history or review queues
   - this batch shipped: the top-level guest-reach snapshot now also surfaces delivered, needs-review, needs-contact, and not-reached-yet recipient counts from the same normalized delivery helper truth used elsewhere, so owners no longer need to drill into history to understand high-level follow-through gaps
   - this batch shipped: recent campaign-thread rollups now surface opens, views, clicks, replies, and bounces when those counts exist, so owners do not have to open the active thread or latest message detail just to see whether a campaign is getting traction
   - this batch shipped: the per-channel history summary now keeps queued/sending campaigns visible as `Active` instead of flattening those in-flight email/SMS sends out of the channel readback while other messaging surfaces still show them
   - this batch shipped: the per-channel history summary now also surfaces delivered, needs-review, needs-contact, and not-reached-yet recipient counts for completed email/SMS campaigns, so owners can compare delivery follow-through by channel without drilling into message detail or the top-level snapshot
   - this batch shipped: recent campaign-thread rollups now also keep needs-contact and not-reached-yet recipient truth together in the same compact warning line, so owners can judge whether a thread needs cleanup or a second send without mentally merging separate badges
   - this batch shipped: active campaign thread chips, latest campaign message chips, and review-queue rows now also surface not-reached-yet recipient counts, so follow-up judgment stays aligned from the summary panels into the thread and review views instead of hiding one delivery gap until deeper message detail
   - this batch shipped: the message-detail `Next-send review plan` now also reads delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so modal follow-through truth no longer mixes raw counts with audience-scaled review buckets
   - this batch shipped: the message-detail recipient snapshot now also reads delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the first modal screenful stays aligned with the deeper follow-through plan instead of switching back to raw-count-only language
   - this batch shipped: active campaign thread and latest-message strips now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so owner summary surfaces stay aligned with the newer modal follow-through wording instead of stopping at raw counts
   - this batch shipped: the top-level delivery follow-through summary and per-channel delivery summaries now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the highest-level owner messaging summaries stay aligned with the newer modal and thread follow-through wording
   - this batch shipped: campaign-thread rollups plus history/review rows now also read delivered, closed-out, and still-needs-cleanup states back against the full targeted audience, so the remaining list surfaces stay aligned with the newer summary, thread, and modal follow-through wording
   - this batch shipped: messaging summaries now also read `needs contact details` and `not reached yet` back against the full targeted audience, so contact-cleanup and unreached follow-through truth uses the same audience-scaled language as delivered and cleanup states
   - this batch shipped: the message-detail header, review-plan chips, and footer now also read `needs contact details` and `not reached yet` back against the full targeted audience, so the modal no longer mixes audience-scaled delivery/cleanup truth with raw contact-cleanup counts
   - this batch shipped: condensed history-row metadata now uses the same explicit `need contact details` wording as the broader messaging summaries, so the compact list view no longer falls back to a slightly different contact-cleanup phrase
   - this batch shipped: the `View needs review` and `View needs follow-up` shortcuts now reset stale thread/search context and carry the right delivery-filter intent into history, so owners land on the queue they meant to inspect instead of a confusing leftover filter combination
   - this batch shipped: the message detail modal now turns the next-send review plan into a concrete follow-through snapshot with delivered, needs-review, needs-contact, and not-reached counts plus cleanup guidance, so owners can choose retry vs exclusion from one place instead of stitching the answer together across separate modal sections
   - this batch shipped: the per-channel history summary now also surfaces normalized opens, clicks, replies, views, and bounces for completed email/SMS campaigns instead of making owners drill into thread cards or message detail to see channel-level traction
   - this batch shipped: guest-reach, per-channel history, and recent campaign-thread rollups now also show normalized open/click/reply rates against delivered recipients, so engagement traction is no longer only raw totals without any readback of relative performance
   - this batch shipped: the latest campaign message card and the message detail modal now also surface normalized open/click/reply rates beside engagement counts, so owners do not lose relative-performance readback as soon as they drill past the summary rollups
   - this batch shipped: per-channel history summaries, recent campaign-thread rollups, and the latest campaign message summary now also surface delivered coverage rates, so follow-through coverage stays visible beside engagement rates instead of making owners infer delivery health from raw counts alone
   - this batch shipped: the active campaign thread badge row now also surfaces delivered coverage, so owners keep delivery-completeness readback when they focus a thread instead of dropping back to counts-only chips
   - this batch shipped: the top-level guest-reach snapshot and the message detail next-send plan now also surface review and unreached coverage percentages beside delivered coverage, so owners can judge cleanup effort from the main snapshot and the drilldown modal without mentally converting raw counts into follow-through risk
   - this batch shipped: the top-level guest-reach snapshot, per-channel history, active campaign thread, latest campaign summary, and message detail review plan now also surface needs-contact coverage, so contact cleanup no longer disappears from the normalized follow-through story once owners move between summary and drilldown surfaces
   - this batch shipped: per-channel history and campaign-thread drilldowns now also surface review and unreached coverage percentages beside delivered and needs-contact coverage, so follow-through truth stays consistent as owners move from the top snapshot into channel and thread-level readback
   - this batch shipped: the per-channel history cards now also surface targeted-recipient count inside delivery follow-through, so channel-level coverage and cleanup readback says what audience base those numbers actually describe instead of leaving it implied
   - this batch shipped: the top-level guest-reach snapshot, recent campaign-thread rollups, active campaign thread, and message detail review plan now also call out the dominant cleanup burden (`delivery review`, `contact cleanup`, or `unreached guests`), so owners can tell what to fix first without scanning four separate counts every time
   - this batch shipped: the per-channel history cards and latest campaign message summary now also call out the dominant cleanup burden and keep review/unreached coverage visible, so owners do not lose the “what should I fix first?” readback when they move from the top messaging snapshot into channel cards or the latest-send drilldown
   - this batch shipped: messaging summaries now also surface one total `cleanup still pending` coverage signal across review, needs-contact, and unreached recipients, so owners can gauge the full follow-through burden without adding the separate percentages by hand
   - this batch shipped: the guest-reach snapshot, channel summaries, campaign thread readback, latest campaign summary, and detail modal now also surface one combined cleanup-recipient count, so owners can see the absolute follow-through burden alongside the cleanup percentage instead of translating it from split counts alone
   - this batch shipped: the guest-reach snapshot and message detail review plan now also surface `follow-through ready` coverage beside `cleanup still pending`, so owners can see how much of a send is already closed out instead of only how much work remains
   - this batch shipped: the guest-reach snapshot and message detail review plan now also surface how many recipients are already fully closed out, so owners can pair follow-through-ready percentages with a concrete completed-recipient count instead of translating it from the cleanup math
   - this batch shipped: per-channel history, campaign-thread rollups, the active campaign thread, and the latest campaign summary now also surface follow-through-ready percentages plus already-closed-out recipient counts, so the closed-out side of follow-through truth stays visible beyond the top snapshot and detail modal
   - this batch shipped: campaign-thread rollups, the active thread, the latest campaign summary, and the detail modal now also surface explicit targeted-recipient counts beside follow-through percentages, so owners can tell what base the delivery and cleanup coverage numbers are actually describing
   - this batch shipped: the top-level `Guest reach` snapshot now also surfaces targeted-recipient count inside delivery follow-through, so the first messaging summary answers what audience base the coverage percentages and cleanup counts are actually describing
   - this batch shipped: the latest campaign summary now also surfaces plain `targeted recipients` readback alongside its existing `Targeted` chip, so the most recent-send follow-through row uses the same audience-base language as the top snapshot and channel/thread summaries
   - this batch shipped: the message detail `Next-send review plan` now also surfaces plain `targeted recipients` readback alongside its `Targeted` chip, so the deepest follow-through drilldown uses the same audience-base language as the rest of the messaging lane
   - this batch shipped: the active campaign thread, latest campaign summary, and message detail review plan now also surface plain delivered-recipient readback alongside their `Delivered` chips, so the delivery side of follow-through stays as concrete as the targeting side in the messaging drilldowns
   - this batch shipped: the top-level guest-reach snapshot, per-channel history cards, and recent campaign-thread rollups now also surface plain delivered-recipient readback alongside their existing delivered summaries, so the delivery side of messaging follow-through stays in the same concrete language across the older summary surfaces too
   - this batch shipped: the guest-reach snapshot, channel summaries, campaign thread views, latest-send summary, and message detail review plan now keep the cleanup lane explicit even when it is fully closed out, so owners now see `No recipients still need cleanup` instead of having to infer the all-clear from missing text
   - this batch shipped: the same guest-reach, channel, campaign-thread, latest-send, and detail follow-through surfaces now also keep the dominant cleanup line explicit when the lane is fully closed out, so owners see `Main cleanup: all clear` instead of the main-cleanup summary silently disappearing
   - this batch shipped: the guest-reach snapshot, channel summaries, campaign thread views, latest-send summary, and message detail review plan now also keep the closed-out side explicit when it is still zero, so owners now see `No recipients are already closed out` instead of having to infer that from the absence of a completion count
   - this batch shipped: the message detail review plan now also keeps the delivery side explicit when it is still zero, so owners now see `0 recipients delivered` instead of having to infer that from the absence of a delivered chip
   - this batch shipped: the message detail modal's top recipient snapshot now also keeps `need contact details` and `not reached yet` explicit when those counts are zero, so the modal header no longer relies on missing text to imply an all-clear
   - this batch shipped: the latest campaign message summary now also keeps the delivery side explicit when it is still zero, so owners now see `0 recipients delivered` there too instead of having to infer it from a missing chip
   - this batch shipped: the active campaign thread summary now also keeps the delivery side explicit when it is still zero, so owners now see `0 recipients delivered` there too instead of having to infer it from a missing chip
   - this batch shipped: recent campaign-thread rollups now also keep the delivery side explicit when it is still zero, so owners now see `0 recipients delivered` there too instead of having to infer it from a missing line
   - this batch shipped: recent campaign-thread rollups and the active campaign thread now also keep delivered-coverage readback explicit when zero recipients were delivered, so failed sends now still read back `0% delivered coverage` instead of hiding the whole coverage line
   - this batch shipped: recent campaign-thread rollups now also keep the engagement-count line explicit when a send delivered nothing, so failed sends still read back `0 opened · 0 viewed · 0 clicked · 0 replied` instead of losing engagement truth entirely
   - this batch shipped: the active campaign thread now also keeps zero engagement chips explicit, so failed sends still show `Opened 0`, `Viewed 0`, `Clicked 0`, and `Replied 0` instead of dropping that engagement row entirely
   - this batch shipped: the latest campaign summary now also keeps zero engagement chips explicit, so failed sends still show `Opened 0`, `Viewed 0`, `Clicked 0`, and `Replied 0` there too instead of dropping engagement detail out of the latest-send strip
   - this batch shipped: the message detail modal now also keeps zero engagement readback explicit, so failed or fully quiet sends still show `0 opened`, `0 viewed`, `0 clicked`, and `0 replied` instead of dropping that engagement line entirely
   - this batch shipped: the message detail modal now also keeps the follow-up guidance line explicit in the clean case, so fully closed-out sends read back `No extra follow-up cleanup is needed for this send.` instead of dropping that guidance row entirely
   - this batch shipped: the active campaign thread, latest campaign summary, and message detail modal now also keep bounce readback explicit at zero, so those drilldowns show `Bounced 0` or `0 bounced` instead of making the last engagement field disappear
   - this batch shipped: message history rows now also keep zero engagement readback explicit, so older failed sends still show `0 opened`, `0 viewed`, `0 clicked`, `0 replied`, and `0 bounced` instead of dropping engagement detail out of the history list
   - this batch shipped: message history rows now also keep follow-up counts explicit at zero, so older failed sends still show `0 need contact details` and `0 not reached yet` instead of dropping the cleanup side of the row entirely
   - this batch shipped: the top-level engagement summary and per-channel engagement summaries now also keep zero bounce readback explicit, so those overview rows show `0 bounced` instead of letting bounce truth disappear whenever there were views but no bounces
   - this batch shipped: the top-level engagement summary and per-channel engagement summaries now also stay explicit before any tracked campaigns land, so owners still see `0 opened`, `0 viewed`, `0 bounced`, and zero-rate readback instead of placeholder silence on not-yet-tracked lanes
   - this batch shipped: the top-level delivery follow-through summary and channel delivery summaries now also stay explicit before any recipient delivery readback lands, so owners still see `0 delivered`, `0 targeted recipients`, zero coverage, and `Main cleanup: all clear` instead of placeholder silence on pre-send or not-yet-read lanes
   - this batch shipped: the latest campaign message strip and the message-detail review plan now also fall back to the saved audience size before any delivery readback lands, so queued or not-yet-sent messages still read back real targeted coverage and all-clear follow-through instead of hiding those chips until after a send
   - this batch shipped: the message-detail footer and older history rows now also keep zero delivery-review summaries explicit, so the deepest modal footer and the older list view still show `0 delivered` / `0 need review` style truth instead of dropping those summary badges when quiet
   - this batch shipped: queued or scheduled messages with a saved audience now also keep the older history-row delivery summary and the detail footer visible before delivery counters land, so pre-send messages still read back `0 delivered` / `0 need review` instead of looking like that lane is simply missing
   - this batch shipped: the message-detail footer gate now also respects saved audience size for queued or scheduled messages, so that pre-send footer truth actually renders instead of only existing in tests and higher-level summary copy
   - this batch shipped: the active campaign thread now also falls back to the latest message audience before delivery counters land, so queued threads still read back targeted coverage and all-clear follow-through instead of hiding the targeting side until after the first send result
   - this batch shipped: pre-send thread, latest-message, and detail-review surfaces now also keep engagement-rate readback explicit at `0% open · 0% click · 0% reply`, so owner messaging truth no longer drops that rate lane just because nothing has been delivered yet
   - this batch shipped: recent campaign rollups and the message detail review plan now also keep zero review/contact/unreached counts explicit, so owners can distinguish a true all-clear from hidden chips when those follow-through lanes are at `0`
   - this batch shipped: the RSVP optional-setup card now speaks more plainly in both directions, calling out `All optional RSVP upgrades are ready` and `All core templates are live` when that lane is complete, while also spelling out how many templates are still available when it is not
   - this batch shipped: the RSVP access section now also says how many access paths are already ready today in plain language, so owners can read the launch-ready side without mentally translating the supported-versus-planned split
   - this batch shipped: the RSVP access section now also says how many access paths are still planned in the same plain language, so the ready-versus-planned split reads as a balanced pair instead of only one side being spelled out
   - keep extending normalized delivery/open/view/bounce/replied truth across channels and real live rows
   - prove customer-safe delivery-failure grouping against live rows
   - add authenticated live browser proof for composing/saving each operational segment on the shipped owner runtime
   - keep SMS/Telnyx live-send behavior deferred until provider/compliance setup is ready

4. `ACTIVE`: RSVP access modes and question templates
   - this batch shipped: owner RSVP access mode is now persisted and hydrated as real site truth instead of staying planner-only copy, with supported primary modes (`private_link`, `name_lookup`) saved through `wedding_data.rsvp_access`, demo storage, the guest RSVP settings UI, and the owner proof checklist
   - this batch shipped: the RSVP settings surface now shows the active primary mode and explicit name-lookup backup truth, while unsupported code/password/open modes remain visibly planned instead of pretending to be launch-ready
   - this batch shipped: focused proof is green for planner normalization, demo-storage migration, service persistence, owner-facing selection UI, the broader guest RSVP ops smoke lane, and the standard local gate
   - this batch shipped: RSVP access planning now uses real guest, household, and event counts to spell out household-scope readiness plus the exact recovery, bad-code, and wrong-event blockers that keep unique-code, password, and open RSVP out of the launch-ready path
   - this batch shipped: `proof:v1:guests-rsvp-ops` now includes a dedicated RSVP access-truth lane for planner/checklist/settings proof, so household scope and blocked future modes are enforced beyond the old smoke-only strict token lane
   - this batch shipped: RSVP setup truth now models phone/email recovery inputs from real guest contact counts, with owner-facing verification planning that shows when a safer recovery step can be designed without replacing private guest links or overstating unsupported code/password/open modes
   - this batch shipped: `proof:v1:guests-rsvp-ops` now also includes a real browser pass for the owner RSVP settings route, proving supported primary-mode switching, persisted name-lookup backup truth, template add/readback continuity, and the continued `planned` status of code/password/open modes instead of relying only on planner-unit truth
   - this batch shipped: owner RSVP checklist truth now keeps optional question templates and meal collection in a `planned` state instead of falsely treating them as launch blockers, and the settings view now summarizes added templates, remaining reusable coverage, custom questions, and meal-choice readiness in one calm readback block
   - this batch shipped: the RSVP settings readback now also surfaces required-question, event-specific-question, and choice-question counts, so owners can sanity-check how demanding or event-scoped their live RSVP form feels before publishing changes
   - this batch shipped: the RSVP settings readback now also surfaces question-template coverage and meal-choice readiness percentages, so owners can gauge optional RSVP setup completeness at a glance instead of inferring it from raw counts alone
   - this batch shipped: the RSVP settings readback now also calls out the total live question count beside custom-question totals, so owners can judge overall RSVP form weight at a glance instead of mentally adding structured counts together
   - this batch shipped: the RSVP settings readback now also labels the current form weight as lightweight, balanced, or detailed based on the live question set, so owners can sanity-check how demanding the RSVP feels before they publish changes
   - this batch shipped: the RSVP settings readback now also surfaces one combined optional-setup coverage card across templates and meal choices, so owners can judge the shape of the optional RSVP lane in one glance instead of mentally combining separate percentages
   - this batch shipped: the RSVP optional-setup card now also calls out the first optional gap directly, so owners can see whether the next non-blocking improvement is question templates or meal choices without treating optional work like a launch blocker
   - this batch shipped: the RSVP optional-setup card now also reads back how many optional improvements are still open, so owners can judge the remaining optional workload without translating template and meal signals by hand
   - this batch shipped: the RSVP form-weight summary now also calls out event-specific follow-up count, so owners can tell whether a form that looks lightweight at first glance still carries meaningful per-event follow-up underneath
   - this batch shipped: the RSVP recovery-plan card now also surfaces saved recovery-input totals plus separate email and phone readiness readback, so owners can tell whether safer misplaced-invite recovery is grounded in real guest contact data instead of inferring that from prose alone
   - this batch shipped: the RSVP recovery-plan card now also normalizes recovery-channel readiness across email and text, so owners can tell in one glance whether safer misplaced-invite recovery is grounded in both contact paths or only one
   - this batch shipped: the RSVP setup proof checklist now also calls out the main real setup blocker in plain language while leaving planned/optional items calm, so owners can see the next RSVP fix immediately without misreading optional templates or meal collection as launch blockers
   - this batch shipped: the RSVP setup proof checklist now also normalizes setup coverage plus real blocker count, so owners can tell how close the RSVP lane is before publishing instead of reading only the first blocker line item
   - this batch shipped: the RSVP optional-setup card now also reads back how many optional layers are already ready, so owners can see whether templates and meal choices are both in place or only partly covered without relying on percentages alone
   - this batch shipped: the RSVP optional-setup card now also surfaces the concrete template count beside optional-layer readiness, so owners can tell how much reusable RSVP question coverage is actually live instead of reading only percentages and gap labels
   - this batch shipped: the RSVP meal-choices card now also reads back how many launch-ready meal options are already in place and whether more are still recommended, so the optional RSVP lane stays as explicit on the meal side as it is on the template side
   - this batch shipped: the RSVP access section now also states how many access paths are actually supported today versus still planned, so owners can judge launch-ready RSVP path coverage without scanning every mode card by hand
   - rerun the same owner RSVP-settings browser flow against the shipped production runtime after the next approved guests deploy so the local proof stays matched to the live dashboard shell
   - if code/password/open RSVP ever moves beyond planned status, add real guest-facing bad-code/password/open runtime proof before any of those modes is marked ready

5. `ACTIVE`: wedding identity exports
   - this batch shipped: wedding identity exports now include a real downloadable story-graphic SVG, a downloadable/copyable style-kit text export, and a `share-graphic` readiness state that turns ready when the public site URL is safe
   - this batch shipped: the settings site panel now exposes owner actions for `Copy style kit` and `Save story graphic` alongside the existing manifest and print-pack surfaces
   - this batch shipped: a dedicated `proof:v1:wedding-identity-exports` lane now reruns readiness/unit coverage plus a real browser capture of manifest copy, style-kit copy, print-pack download, and story-graphic download without private token leakage
   - this batch shipped: owner export actions now save real rendered SVG + PNG assets for both the print pack and the story graphic instead of stopping at HTML-only print output for those surfaces
   - this batch shipped: the wedding-identity browser proof now verifies nonblank HTML/SVG/PNG downloads and still confirms no private token leakage in the captured export files
   - this batch shipped: the print/export lane now saves a first-party PDF artifact alongside HTML/SVG/PNG, with browser proof verifying the PDF download is nonblank and token-safe
   - this batch shipped: identity-export proof now includes explicit long-name text-fit assertions plus multi-theme contrast checks for the story-graphic palette, so readability is no longer implied only by one default-theme screenshot
   - rerun the same copy/download flow against the shipped production runtime after the next approved identity-export deploy

### Strong-Differentiator Lanes Still Open

6. `ACTIVE`: premium no-app guest photo and memory flow
   - the top-level photo-memory badge row now also says how many active blockers remain before sharing, so owners can catch sharing risk from the first scan instead of only down in the blocker panel
   - the no-app memory-flow card now keeps the `Main gap` line explicit even in the all-clear state, so owners get a plain “none right now” readback instead of inferring it from a missing label
   - the no-app memory-flow blocker panel now also says how many active blockers remain before sharing broadly, so owners can size the remaining setup burden without counting the bullet list by hand
   - the no-app memory-flow card now keeps the `Before sharing broadly` panel visible in the all-clear state, so owners get an explicit “no active blockers” readback instead of having to infer it from a missing warning box
   - the no-app memory-flow card’s top-right readiness chip now says `memory steps ready` explicitly, so the very first glance matches the badge-row wording instead of leaving the readiness denominator implicit
   - the top-level photo-memory badge row now also calls out how many memory steps are still planned, so owners can tell which gaps are intentionally deferred versus actively broken or still empty without opening the deeper checklist
   - the top-level photo-memory badge row now also calls out how many memory steps still need action, so owners can separate “active cleanup work” from “still empty setup gaps” without opening the deeper checklist
   - the top-level photo-memory badge row now also calls out how many memory steps are still completely empty, so owners can distinguish “lane needs action” from “specific memory-flow steps still have no real setup at all” without opening the deeper checklist
   - this batch shipped: owners can now save a real full-resolution photo download job from the dashboard, backed by the refreshed owner photo manifest instead of stopping at the CSV handoff sheet
   - this batch shipped: the no-app memory-flow readiness card no longer claims full-resolution packaging is merely planned once reviewed uploads exist; it now reflects the shipped download-job path honestly
   - this batch shipped: focused proof is green for full-resolution job payload generation plus the updated memory-flow readiness truth
   - this batch shipped: local/demo photo memory state is now persisted and hydrated as real dashboard truth, including recap settings, uploads, albums, analyses, guestbook, prospects, and upload links instead of an empty placeholder snapshot
   - this batch shipped: the demo owner export path now saves a real full-resolution download job locally, and recap-status saves now read back correctly after reload instead of collapsing when the owner proof uses demo state
   - this batch shipped: a dedicated `proof:v1:photo-memory-flow` lane is now green for memory-flow readiness, owner slideshow preview, owner full-resolution export download, recap-status save/reload continuity, and the mobile guest upload route without raw-token leakage
   - this batch shipped: the local/browser photo proof now covers owner moderation readback too, proving a recap-story moderation toggle survives reload instead of stopping at one-session UI state
   - this batch shipped: the guest-facing recap route now has a QA-only local fallback from the saved demo photo state, so the photo proof lane can verify a published recap page with real shared-moment content instead of only trusting the owner status chip
   - this batch shipped: the photo proof lane now covers the real owner `Preview recap` handoff plus guest-facing published recap readback for featured picks, story picks, and the saved video moment caption, so the slideshow/recap lane no longer stops at owner-draft readiness or a direct URL-only guest check
   - this batch shipped: the QA guest upload route now persists new photo/video files into the same demo memory-flow state the owner dashboard reads, and browser proof now drives a real guest video upload before verifying the owner dashboard video count updates on reload
   - this batch shipped: the local proof now promotes that newly uploaded guest clip through owner moderation too, proving the exact upload can be featured and added to story, survives reload, and appears in both owner recap preview and the guest-facing recap with the saved guest attribution
   - this batch shipped: the no-app memory-flow checklist now keeps guestbook notes as an optional `planned` step when that control is intentionally off, so couples using uploads, recap, moderation, and export without guestbook do not see a false blocker in the launch readback
   - this batch shipped: the no-app memory-flow card now exposes top-level `Collection`, `Curation`, `Sharing`, and `Handoff` summaries before the deeper checklist, so owners can tell whether guest uploads, recap sharing, and handoff/export are truly ready without mentally stitching together nine separate tiles
   - this batch shipped: the top-level memory-flow `Sharing` summary now also calls out saved story-pick coverage when recap sharing is ready, so recap readback no longer flattens every published/private-link recap into one generic curated-pick count
   - this batch shipped: the memory-flow recap summary now also shows story-pick coverage percentage when recap sharing is ready, so owners can tell whether the recap has enough story shaping to feel intentional instead of only seeing a raw story-pick count
   - this batch shipped: the top-level memory-flow `Handoff` summary now explicitly says when both the owner export and the full-resolution download path are ready, so couples do not have to infer that the download handoff is unlocked from the deeper checklist alone
   - this batch shipped: the no-app memory-flow card now also surfaces top-level summary badges for live uploads, recap share mode, handoff readiness, and captured follow-up opt-ins, so owners can judge the overall shape of the photo lane before scanning the deeper collection/curation/sharing/handoff tiles
   - this batch shipped: those top-level photo-memory badges now also surface story-pick coverage and concrete moderation burden, so owners can tell whether the recap is story-shaped and whether review cleanup is still blocking handoff without opening the deeper tiles
   - this batch shipped: the no-app memory-flow card now also calls out the main gap in plain language, so owners can see whether collection, curation, sharing, or handoff is the next fix without translating the lane tiles by hand
   - this batch shipped: the top-level photo-memory badge row now also surfaces the first real blocker, so owners can tell whether the first operational fix is the guest hub, moderation, album activation, or another blocked step without scanning the full memory checklist
   - this batch shipped: the top-level photo-memory badge row now also reads back how many of the four memory lanes are ready versus still needing action, so owners can judge overall lane closure without scanning every collection/curation/sharing/handoff panel
   - this batch shipped: the top-level photo-memory badge row now also calls out how many memory lanes are still completely empty, so owners can distinguish “needs cleanup” from “not built yet” without opening the deeper tiles
   - this batch shipped: the top-level photo-memory badge row now also says how many active blockers remain before sharing, so owners can catch sharing risk from the first scan instead of only down in the blocker panel
   - this batch shipped: the no-app memory-flow card now keeps the `Main gap` line explicit even in the all-clear state, so owners get a plain “none right now” readback instead of inferring it from a missing label
   - this batch shipped: the no-app memory-flow blocker panel now also says how many active blockers remain before sharing broadly, so owners can size the remaining setup burden without counting the bullet list by hand
   - this batch shipped: the no-app memory-flow card now keeps the `Before sharing broadly` panel visible in the all-clear state, so owners get an explicit “no active blockers” readback instead of inferring it from a missing warning box
   - this batch shipped: the no-app memory-flow card’s top-right readiness chip now says `memory steps ready` explicitly, so the first glance matches the badge-row wording instead of leaving the denominator implicit
   - this batch shipped: the top-level photo-memory badge row now also calls out how many memory steps are still planned, so owners can tell which gaps are intentionally deferred versus actively broken or still empty without opening the deeper checklist
   - this batch shipped: the top-level photo-memory badge row now also calls out how many memory steps still need action, so owners can separate “active cleanup work” from “still empty setup gaps” without opening the deeper checklist
   - this batch shipped: the top-level photo-memory badge row now also calls out how many memory steps are still completely empty, so owners can distinguish “lane needs action” from “specific memory-flow steps still have no real setup at all” without opening the deeper checklist
   - this batch shipped: the top-level photo-memory badge row now also normalizes overall step coverage, so owners can judge how much of the no-app memory flow is truly wired up without converting raw ready-step counts by hand
   - this batch shipped: the top-level photo-memory badge row now also reads back the concrete ready-step count beside step coverage, so owners can see how many memory steps are actually wired without converting the percentage by hand
   - this batch shipped: the top-level photo-memory upload badge now also reads back the active-album count beside live upload volume, so owners can tell whether upload momentum is concentrated in one album or spread across the real active capture surface
   - add live guest video upload browser proof
   - rerun the strengthened owner preview plus guest-facing published recap proof against the shipped production runtime after the next approved deploy
   - prove owner moderation readback after real live uploads

7. `ACTIVE`: destination/travel guest portal
   - the guest-hub `Travel quick plan` now keeps the `Main gap` line explicit even in the all-clear state, so guests get a plain “none right now” readback instead of inferring it from a missing label
   - the owner travel-portal readiness summary now also says when there are no active blockers, so the fully ready state reads like a complete all-clear instead of only “ready with no gaps”
   - the owner travel-portal readiness badges now also say how many active blockers remain, so couples can size the live setup burden from the first scan instead of only from the longer summary sentence
   - the owner travel-portal readiness summary now keeps the all-clear explicit when travel is fully ready, so couples get a plain “no travel gaps right now” readback instead of a bare ready count
   - the owner travel-portal readiness card now keeps the `Main gap` line explicit even in the all-clear state, so couples get a plain “none right now” readback instead of inferring it from a missing label
   - the guest-hub `Travel quick plan` summary now also says how many of the three core travel layers still need setup when coverage is partial, so guests can tell whether the lane is missing one core layer or most of the travel flow without relying only on the badge row
   - this batch shipped: the public travel data contract now allowlists structured hotel, room-block, shuttle, visa-tip, and cultural-tip records instead of flattening the lane to a few generic strings
   - this batch shipped: public travel rendering now surfaces structured hotel options, room blocks, shuttle timing, and destination notes on the real guest-facing travel section instead of burying them in one travel paragraph
   - this batch shipped: travel portal readiness now recognizes structured lodging, shuttle, and destination guidance as real progress, and the guided-builder readiness card reflects those records instead of staying stuck on freeform copy only
   - this batch shipped: focused proof is green for structured travel sanitization, public render-model/public-access allowlisting, readiness logic, and the public travel section render path
   - this batch shipped: the guest hub now shows a structured `Travel quick plan` card with copyable guest-safe travel summary text, so invite-to-travel is no longer just a bare link list
   - this batch shipped: local/demo guest hub fallback now carries structured hotel, room-block, shuttle, and destination-tip data so the travel hub flow can be proven without hand-waving over empty state
   - this batch shipped: focused proof is green for the guest hub travel spotlight helper plus a real `EventHubLiveContent` render pass that proves the quick-plan card and copy action render in the hub
   - this batch shipped: guest-hub `travel`, `schedule`, `rsvp`, and `registry` actions now preserve private guest invite context and guest language instead of dropping travel/detail surfaces back to generic site-shell state
   - this batch shipped: the guest-hub travel quick plan now saves a real downloadable HTML travel guide instead of stopping at copy-only summary text
   - this batch shipped: the guest-hub travel spotlight now adds invite-scoped event timing and venue-direction cards when private guest context, schedule, and venue data are available instead of stopping at generic hotel/shuttle notes only
   - this batch shipped: the travel spotlight now carries multiple visible event windows plus multiple safe venue-route cards, and those route cards are clickable inside the guest hub instead of living only in the downloaded guide text
   - this batch shipped: the travel quick plan now carries first-party arrival notes, parking guidance, owner-written guest notes, and clickable hotel or room-block booking links into both the guest hub and the saved HTML guide instead of dropping those details once guests leave the main travel section
   - this batch shipped: the guest-hub `Travel quick plan` now exposes invite scope plus visible event-window, route-card, and booking-link coverage directly in the card and saved guide, so guests can tell whether this link carries real guest-specific travel context instead of a generic travel stub
   - this batch shipped: the guest-hub `Travel quick plan` now also flags when arrival or parking guidance is included, so guests can tell at a glance whether the link covers how to get there, not just where to stay or which route to tap
   - this batch shipped: the owner travel-portal readiness card now also surfaces guest-section coverage plus stay, weekend-routing, and arrival coverage badges, while the guest-hub `Travel quick plan` now also flags stay-ready and weekend-timing-ready coverage so both sides can judge whether the travel lane is actually usable without opening every card
   - this batch shipped: the guest-hub `Travel quick plan` now also calls out how many core travel layers are still missing when coverage is partial, so guests can tell whether the gap is one missing layer or most of the lane without decoding only badges and main-gap copy
   - this batch shipped: the owner travel-portal readiness badges now also call out how many guest-facing sections are still incomplete, so couples can gauge total travel-lane cleanup without parsing only the longer missing-sections sentence
   - this batch shipped: the guest-hub `Travel quick plan` summary line now also spells out whether it covers stay details, weekend timing, and arrival guidance, so guests do not have to rely only on the smaller coverage badges to understand what the travel plan actually includes
   - this batch shipped: the guest-hub travel journey card now reads back both ready and still-needs-setup steps, with per-step state labels, so the mobile guest path no longer looks complete when RSVP or photo follow-through is still missing
   - this batch shipped: the guest-hub `Travel quick plan` now also calls out the main missing travel layer in plain language, so guests can see whether stay details, weekend timing, or arrival guidance are the next fix instead of translating the badges by hand
   - this batch shipped: the guest-hub `Travel quick plan` summary now also says how many of the three core travel layers still need setup when coverage is partial, so guests can tell whether the lane is missing one core layer or most of the travel flow without relying only on the badge row
   - this batch shipped: the guest-hub `Travel quick plan` now keeps the `Main gap` line explicit even in the all-clear state, so guests get a plain “none right now” readback instead of inferring it from a missing label
   - this batch shipped: the owner travel-portal readiness summary now also says when there are no active blockers, so the fully ready state reads like a complete all-clear instead of only “ready with no gaps”
   - this batch shipped: the owner travel-portal readiness badges now also say how many active blockers remain, so couples can size the live setup burden from the first scan instead of only from the longer summary sentence
   - this batch shipped: the owner travel-portal readiness summary now keeps the all-clear explicit when travel is fully ready, so couples get a plain “no travel gaps right now” readback instead of a bare ready count
   - this batch shipped: the owner travel-portal readiness card now keeps the `Main gap` line explicit even in the all-clear state, so couples get a plain “none right now” readback instead of inferring it from a missing label
   - this batch shipped: the owner travel-portal readiness badges and the guest-hub `Travel quick plan` now also normalize travel completeness as percentages, so couples and guests can judge travel-lane coverage at a glance instead of translating raw `5 of 6` or layer-by-layer readiness by hand
   - this batch shipped: the owner travel-portal readiness badges now also read back the total travel-section count that is ready, so couples can see how much of the full travel lane is live alongside the guest-surface coverage numbers
   - this batch shipped: the guest-hub `Travel quick plan` now also reads back how many of the three core travel layers are already ready, so guests can pair the travel coverage percentage with a concrete ready-layer count instead of translating the badge math by hand
   - this batch shipped: the guest-hub `Travel quick plan` summary now also pulls route-card and booking-link counts into the lead sentence, so guests can tell whether the link actually includes directions and stay-booking surfaces without relying only on the badge row
   - this batch shipped: the guest-hub `Travel quick plan` summary now also carries the main missing travel layer in plain language when coverage is partial, so guests can see the next real fix directly in the lead readback instead of translating badges and the separate main-gap label
   - this batch shipped: the guest-hub travel journey card now also spells out which specific steps are already ready and which still need setup, so couples can tell whether the incomplete path is RSVP, photos, or travel itself without opening each action
   - this batch shipped: the owner travel-portal readiness card now summarizes ready, needs-info, empty, and planned setup in one line and names the missing sections directly, so couples can tell whether the gap is arrival, lodging, venue addresses, schedule, or local context without scanning every tile
   - this batch shipped: the owner travel-portal readiness summary now also calls out the first blocker directly, so couples can see whether the lane is first blocked on arrival guidance, lodging, or another missing travel section without scanning the full readiness grid
   - this batch shipped: the guest-hub fallback/runtime path now preserves the seeded couple summary and travel context strongly enough for real guest travel continuity proof instead of dropping the hub back to raw slug-only framing
   - this batch shipped: a dedicated `proof:v1:travel-guest-portal` lane now reruns travel helper/render tests plus a real mobile browser flow from invite-scoped guest hub to travel, RSVP, and photo-upload surfaces without raw-token body leakage
   - 2026-05-14 production rerun on `https://dayof.love` failed because the live invite-scoped guest hub did not render the proven `Travel quick plan` card, so live/mobile proof is still open until that shipped runtime picks up the structured travel spotlight
   - this batch shipped: the owner travel-portal readiness card now also calls out the main gap in plain language, so couples can see whether arrival, lodging, transport, venue addresses, schedule, or local context is the next fix without translating the full missing-section list by hand
   - rerun the same invite-scoped travel hub flow against the shipped production runtime for live/mobile proof after the live guest hub renders the structured travel card again

13. `ACTIVE`: app-like web day-of mode
   - this batch shipped: the no-app guest-hub readiness summary now reads back how many guest actions are actually live, and when the day-of lane is incomplete it names the missing core coverage (`schedule`, `directions and travel`, `photo upload`) instead of stopping at a generic “needs content” summary
   - this batch shipped: the guest-facing `Link access` card and owner `Guest hub status` board now also call out the main core day-of gap in plain language when a link is missing key actions, so couples and guests can see the next fix immediately instead of translating partial coverage by hand
   - this batch shipped: the owner-facing `Guest hub status` summary now also calls out the first blocker directly, so owners can see whether the next hold-up is announcements, saved fallback behavior, or another planned handoff without scanning the whole day-of status board
   - this batch shipped: the owner-facing `Guest hub status` summary now also surfaces core link-action coverage when private visibility is connected, so owners can tell from the summary itself whether the current guest link is fully day-of ready or only partly covering RSVP, schedule, travel, and photos

8. `ACTIVE`: reminders, digests, and notification preferences
   - persist digest cadence, planner audience, and quiet-state preferences across settings + overview digest preview
   - keep snooze/quiet controls backed by saved preference state instead of local-only UI
   - this batch shipped: the overview digest now pulls real message-review, open-task, due-payment, recent-photo-upload, and seating-gap counts from source-of-truth dashboard data instead of hardcoded zero placeholders
   - this batch shipped: digest preferences now persist next-send timing plus saved review/readback timestamps instead of stopping at readiness-only cadence toggles
   - this batch shipped: settings and overview now read back the same scheduled digest truth, including scheduled, paused, quiet, and last-review labels instead of collapsing everything into preview-only copy
   - this batch shipped: a dedicated owner/planner digest email render path now produces safe HTML + plain-text preview output without token/provider leakage
   - this batch shipped: digest preview status no longer hardcodes delivery as connected, so saved cadence and next-send windows stay explicitly in preview/readback mode until the real inbox delivery pipeline exists
   - this batch shipped: focused proof is green for settings, overview, and digest email readback staying honest about scheduled preview state versus actual delivery connectivity
   - this batch shipped: a dedicated `proof:v1:notification-digest` lane now reruns digest source-count unit coverage, overview snapshot-to-stats continuity, overview model continuity, settings readback, and build integrity so the digest lane is guarded beyond isolated copy assertions
   - this batch shipped: overview digest proof now explicitly guards that message review, task, payment, photo upload, and seating-gap counts continue coming from the real overview source tables/snapshot path instead of drifting back to placeholders
   - this batch shipped: demo/local overview snapshot state now derives digest review counts from the same persisted message, planning, photo, and seating stores that the owner flows mutate, and focused proof now mutates those stores directly before asserting digest readback continuity
   - prove live inbox delivery/readback behavior once the digest-delivery pipeline is connected beyond local schedule/readback truth

9. `ACTIVE`: guest language system
   - this batch shipped: guest records now persist `preferred_language`, owners can edit it in the guest form, and guest list/household views show the saved preference instead of hiding language state in storage-only guest flows
   - this batch shipped: messaging audience segments now include saved-language recipient groups, and composer language previews now derive from the actual selected audience plus the site default instead of a hardcoded `en/es/fr` preview set
   - this batch shipped: the household workspace can now apply one saved language to the current selected guest set in one action instead of forcing guest-by-guest edits
   - this batch shipped: settings now carry both the default public language and the owner-managed allowed guest-facing language set, saved into wedding data instead of living as an implied all-languages default
   - this batch shipped: generated site translations now carry RSVP custom questions and meal-choice wording into the guest RSVP lookup flow, so guests who arrive in an allowed translated language stop falling back to English-only prompts while owners keep a review reminder in RSVP settings
   - this batch shipped: a dedicated local continuity proof lane now reruns guest-language preference, owner messaging preview derivation, translated RSVP question/meal assets, and a real browser pass across RSVP, event hub, photo upload, and recap guest-language routes
   - this batch shipped: owner guest-preview links and guest-hub actions now carry each guest's saved language across RSVP, public-site, contact-update, photo, guestbook, vault, recap, travel, and registry routes instead of dropping back to the site default after the first click
   - this batch shipped: local browser proof now confirms the guest drawer resolves the correct guest-facing route set while those preview links preserve token-safe guest identity state and guest-language continuity
   - this batch shipped: authenticated live production proof is now green for owner messaging language previews plus guest-facing translated RSVP, event hub, photo upload, and recap continuity on [dayof.love](https://dayof.love), with explicit checks that raw invite tokens and untranslated i18n keys do not leak into the rendered UI
   - active remaining work: none beyond keeping this proof green on future deploys

### Later-Value Lanes Still Open

10. `ACTIVE`: registry polish beyond barcode
   - this batch shipped: registry owner edit state now includes purchased-quantity and purchaser tracking, so claim/purchase truth no longer depends on one-way “mark purchased” clicks alone
   - this batch shipped: owners now have a quick `Clear purchase state` workflow on purchased/partial items, with focused proof for owner-side purchase reset behavior
   - this batch shipped: registry thank-you follow-up is now a persisted site-backed ledger instead of preview-only copy, with save/readback/mark-sent/clear-sent behavior and focused route proof
   - this batch shipped: registry launch readiness and thank-you readiness now use the persisted task ledger honestly instead of claiming future follow-up work without saved state
   - this batch shipped: focused proof is green for owner purchase-state normalization, form save truth, thank-you ledger sync/toggle behavior, route rendering, and guest-facing registry purchase rendering
   - this batch shipped: demo/local registry owner state now persists purchase-state and thank-you follow-up across reloads instead of resetting to seed data, and `npm run proof:v1:registry` now includes a real browser continuity pass for that owner flow
   - this batch shipped: demo/local registry cleanup now performs a real owner repair flow for bad imported gifts, and the registry proof now verifies repaired titles/store truth survive reloads instead of staying as no-op toasts
   - this batch shipped: demo/local duplicate-group review now has real merge continuity proof, so the owner cleanup lane covers repeated-gift collapse/readback instead of only purchase-state continuity
   - this batch shipped: the public registry fund highlight now prefers the strongest real live cash-fund item when one exists, showing the actual fund title, note, goal, raised amount, funded progress, and only safe public contribution methods instead of falling back to a generic honeymoon placeholder
   - this batch shipped: focused proof is green for featured-fund selection, safe public Venmo/custom contribution method rendering, unsafe fund-link rejection, and de-duplicated guest-facing rendering so the highlighted fund does not repeat below the hero card
   - this batch shipped: the owner registry dashboard now distinguishes cash funds that are actually ready to share from funds that still need a payment path, so follow-through truth is no longer buried inside raw goal/received totals
   - this batch shipped: focused proof is green for fund follow-through derivation, counting only safe public contribution methods when deciding whether a cash fund is ready to share or still needs setup
   - this batch shipped: registry quick-check insights now include cash-fund setup and goal-tracking guidance, so owner analytics stop treating all funds as equally ready when some still lack a guest-ready payment path or a clear progress target
   - this batch shipped: focused proof is green for the new registry insight derivation, including fund-setup and fund-goal nudges that stay calm and specific instead of leaking import/metadata jargon into owner copy
   - this batch shipped: registry quick-check insights now also flag purchased gifts that still need purchaser attribution, so thank-you follow-up blockers show up earlier than the final thank-you list itself
   - this batch shipped: focused proof is green for purchaser-attribution insight derivation, keeping the owner nudge specific to real purchased/partial gifts without overclaiming that thank-you follow-up is already complete
   - this batch shipped: the owner registry dashboard now surfaces missing-purchaser thank-you readiness directly inside the thank-you summary and registry notes, so follow-up gaps are visible where owners actually send and review thank-yous instead of only through a quick-check insight card
   - this batch shipped: focused route proof is green for the thank-you summary chips, missing-purchaser readback, and `Review gift` owner action on gifts that still need purchaser attribution
   - this batch shipped: the owner registry dashboard now breaks cash-fund follow-through into tracked goals, missing goals, visible progress, and first-gift gaps, so fund analytics no longer collapse setup, fundraising progress, and “still waiting on the first gift” into one total
   - this batch shipped: focused route proof is green for missing-goal and awaiting-first-gift derivation, including mixed fund sets where only some cash funds are share-ready or actively progressing
   - this batch shipped: the public featured-fund card now shows guest-facing fund-state signals for contribution-method count, active progress, first-gift waiting state, and flexible no-goal funds instead of flattening every cash fund into the same honeymoon-style pitch
   - this batch shipped: focused proof is green for safe featured-fund signal derivation plus the live featured-fund render path, including correct safe-method counting when some contribution URLs are rejected
   - this batch shipped: owner registry analytics now distinguish share-ready funds that are already moving from share-ready funds still waiting on a first gift, and they separately call out flexible funds that are already receiving gifts without a fixed goal
   - this batch shipped: the public featured-fund card now uses clearer guest-facing progress chips like `25% funded` and `Already receiving gifts`, so fund momentum reads more honestly than the old generic “progress is underway” wording
   - this batch shipped: the public featured-fund status card now tells guests how much is still needed to reach a goal, when a goal is already complete, and when a flexible fund is already receiving gifts instead of only showing goal/raised totals without the simple remaining-progress readback
   - this batch shipped: the public featured-fund hero now only spotlights live cash funds that actually have a safe guest contribution path, so guests no longer see a real fund highlighted as if it is ready before the couple has added a usable public payment method
   - this batch shipped: the owner registry dashboard now surfaces claim-state analytics for claimed gifts, purchaser attribution, partial claims, claimed quantity, remaining quantity, and multi-quantity progress instead of leaving broader purchase-state truth buried across individual gifts and thank-you lists
   - this batch shipped: the owner registry dashboard now also surfaces thank-you follow-through analytics for sent vs pending notes, ready-to-send coverage, missing-purchaser blockers, attribution coverage, and follow-up completion rate instead of leaving broader thank-you status buried inside the saved list itself
   - this batch shipped: the top-level thank-you summary card now also reads back ready-to-send coverage plus blocked-by-purchaser follow-through, so owners do not have to drop into the deeper registry notes just to see how much of thank-you work is actually sendable
   - this batch shipped: the owner registry dashboard now also surfaces guest-visible inventory analytics for guest-ready gifts, currently visible gifts, available-vs-claimed public inventory, hidden purchased gifts, and guest-blocked broken imports instead of making couples infer the public registry state from individual cards
   - this batch shipped: the owner registry dashboard now also surfaces simple coverage rates for purchaser attribution, guest-ready vs guest-visible inventory, share-ready cash funds, and goal-tracked funds, so the higher-level registry readback answers “how complete is this lane?” instead of only listing raw counts
   - this batch shipped: registry launch-readiness details now call out guest-safe product-link coverage, share-ready fund coverage, and thank-you purchaser-attribution coverage directly in the helper readback instead of only listing raw “needs review” counts
   - this batch shipped: the top-level cash-fund summary now also calls out funds still missing a goal, so couples can spot share-ready-but-underdefined funds without dropping into the deeper registry notes first
   - this batch shipped: the fund summary and deeper analytics now also surface receiving-gift coverage, so couples can tell what share of their cash-fund lane is actually moving instead of only seeing raw “already receiving gifts” counts
   - this batch shipped: the top-level guest-view summary now also calls out guest-ready coverage alongside guest-visible coverage, so couples can tell the difference between items that are fundamentally guest-safe and the smaller subset currently visible right now
   - this batch shipped: the top-level thank-you summary card now also calls out blocked-by-purchaser coverage, so owners can judge how much of the follow-up lane is stalled by missing attribution instead of seeing only sendable and sent coverage
   - this batch shipped: the top-level thank-you summary card now also surfaces purchaser-attribution coverage, so couples can see how much of thank-you follow-up is still blocked by missing giver identity without dropping into the deeper analytics readback
   - this batch shipped: the top-level `Guest view`, `Thank-yous`, and `Cash funds` cards now also call out the main gap in plain language, so couples can tell whether the next fix is blocked guest visibility, missing purchaser attribution, or unfinished fund setup without translating percentages into action by hand
   - this batch shipped: the top-level `Claimed gifts` card now also calls out the main gap in plain language, so couples can see whether claim cleanup is blocked by missing purchaser attribution or unfinished partial claims without translating attribution and quantity counts by hand
   - this batch shipped: the top-level `Claimed gifts` card now also reads back how much of the claim lane is fully closed versus still partial, so couples can judge closure progress at a glance instead of translating raw fully-claimed and partial counts by hand
   - this batch shipped: the top-level `Claimed gifts` card now also normalizes partial-claim burden as a percentage, so couples can judge how much of the claim lane is still stuck in-between instead of reading only a raw partial count
   - this batch shipped: the top-level `Claimed gifts` card now also normalizes claimed-quantity coverage, so larger partial gift sets do not disappear into item-only claim summaries
   - this batch shipped: the top-level `Claimed gifts` card now also reads back the concrete claimed-quantity count beside claimed-quantity coverage, so couples can tell how much quantity is already spoken for without backing into it from the percentage alone
   - this batch shipped: the top-level `Claimed gifts` card now also calls out remaining unclaimed quantity, so multi-quantity gift drift stays visible in the top registry summary instead of only in the deeper analytics rows
   - this batch shipped: the top-level `Claimed gifts` card now also normalizes the still-unclaimed quantity share, so couples can see how much quantity remains untouched instead of reading only a raw leftover count
   - this batch shipped: the top-level `Claimed gifts` card now keeps the unclaimed-quantity side explicit even when it reaches zero, so a fully claimed quantity lane is confirmed with a visible `0% still unclaimed (0)` all-clear instead of going quiet
   - this batch shipped: the top-level `Fund gifts` card now also calls out the next gift-momentum gap in plain language, so couples can tell whether the hold-up is a missing goal, waiting on a first gift, or missing payment setup instead of translating fund momentum coverage by hand
   - add live owner add/import/edit persistence proof for broader registry workflows
   - rerun the stronger owner repair/cleanup runtime proof against the shipped production runtime after the next approved registry deploy
   - rerun the guest-visible purchase-state assertions against the live production runtime after the next approved registry deploy instead of only local/public-component proof
   - keep extending owner claim-state workflows beyond purchased/reset into broader live claim-state and registry analytics depth
   - add richer public fund-card polish and broader registry analytics

11. `ACTIVE`: seating and catering export polish
   - this batch shipped: catering packet rows now include richer structured household/group, dietary-restriction, allergy, and guest-note columns instead of flattening everything into one generic note field
   - this batch shipped: seating exports now include a dedicated kitchen-summary CSV that groups meal counts plus dietary/allergy highlights for catering prep beyond the existing row CSV, table summary, PDF, and image packet
   - this batch shipped: focused proof is green for the richer catering packet rows, grouped kitchen-summary export, and handoff review file inventory
   - this batch shipped: `proof:v1:seating-continuity` now captures real local browser downloads for seating CSV, kitchen-summary CSV, SVG image export, and printable PDF markup so packet truth is no longer implied only by helper-unit tests
   - this batch shipped: RSVP-backed seating drift proof now covers `invalidateDriftedAssignments`, so assignment invalidation after event RSVP changes is exercised directly instead of living only as a manual note
   - this batch shipped: demo/local seating lookup now reads the same persisted seating state as the seating board instead of placeholder rows, so lookup continuity can reflect real seat edits
   - this batch shipped: `proof:v1:seating-continuity` browser proof now covers a real seat assignment change followed by seating-lookup readback, closing the old gap where lookup continuity lived only as a board note
   - this batch shipped: seating eligible guests now promote explicit `Dietary:` and `Allergy:` note text into dedicated dietary/allergy fields before catering export, so kitchen summaries can count structured restrictions without flattening everything into one generic guest note
   - this batch shipped: focused proof is green for the new seating dietary/allergy extraction helper plus the existing catering-packet and kitchen-summary readback lanes
   - this batch shipped: seating eligible guests now also promote explicit `Meal:`, `Meal preference:`, `Meal choice:`, and `Entree:` note text into structured meal preference fields when the saved meal field is blank, so catering packets stop losing owner-entered meal picks that were flattened into notes upstream
   - this batch shipped: explicit `Dietary:` / `Dietary restrictions:` lines now populate structured dietary restriction fields, while `Allergy:` / `Allergies:` and labeled kitchen-note lines stay separated instead of collapsing into one generic dietary note string
   - this batch shipped: focused proof is green for the richer restriction/allergy/kitchen-note split plus the existing seating export/readiness lanes, so source-of-truth catering detail is less dependent on flattened guest-note text
   - this batch shipped: seating note parsing now also promotes explicit `Restrictions:`, `Meal restriction:`, `Food allergy:`, `Allergens:`, `Food note:`, `Catering note:`, `Meal selection:`, `Entrée choice:`, and `Protein:` labels into structured meal/dietary/allergy fields instead of leaving those RSVP-owner note variants stranded in generic text
   - this batch shipped: seating note parsing now also understands flattened semicolon-separated RSVP note blocks plus broader labels like `Diet:`, `Menu:`, `Dish:`, `Main:`, `Chef note:`, and `Service note:`, so meal and dietary detail survives common one-line owner note formats instead of dropping back to generic guest notes
   - this batch shipped: the main seating CSV export now carries structured meal choice, dietary restriction, allergy, and dietary-note columns, so exported seating packets preserve the richer recovered catering detail instead of limiting that truth to the kitchen summary only
   - this batch shipped: seating note parsing now also understands pipe-separated RSVP note blocks like `Meal choice: Fish | Dietary: Gluten-free | Allergy: Peanut`, so structured meal and catering detail survives another common flattened import/export format instead of dropping back to generic guest notes
   - this batch shipped: seating note parsing now also understands `=`-separated RSVP note blocks like `Meal choice=Fish; Dietary=Gluten-free; Allergy=Peanut`, so structured meal and catering detail survives another common flattened import/export format instead of dropping back to generic guest notes
   - add live production seating write/read with cleanup for packet/export flows
   - rerun the same packet export/download assertions against the shipped production runtime after the next approved seating deploy
   - rerun seating lookup readback after real assignment edits against the shipped production runtime after the next approved seating deploy instead of only local browser proof
   - keep extending source-of-truth meal/dietary fields wherever real RSVP schemas still flatten too much detail upstream

12. `ACTIVE`: budget and vendor ledger
   - this batch shipped: demo/local planning ledger state now persists total budget, budget rows, vendors, and vendor meta through a shared saved planning snapshot instead of resetting on reload, so local owner CRUD proof can read back the same ledger after browser refresh
   - this batch shipped: budget and vendor entry forms now have explicit label/input wiring plus named edit/delete controls, which makes the planning ledger UI accessible and lets the browser proof target real owner actions instead of brittle positional selectors
   - this batch shipped: `proof:v1:budget-vendor-ledger` now gives this lane a dedicated acceptance gate with focused model tests, build integrity, and a real browser add/edit/delete continuity run across page reloads for both vendor rows and budget rows
   - this batch shipped: focused proof is green for persisted demo planning state, malformed-storage fallback safety, and browser CRUD/readback continuity across reloads for vendor and budget ledger rows
   - add live owner add/edit/delete proof with cleanup for vendor/payment/budget rows
   - this batch shipped: `proof:v1:budget-vendor-ledger` now also includes a browser pass for read-only collaborator visibility plus a guest-facing public-site non-exposure check, so this lane no longer relies only on component tests to claim that financial details stay owner/planner-only
   - rerun the collaborator readback and guest non-exposure checks against the shipped production runtime after the next approved planning deploy
   - this batch shipped: budget and vendor tabs now show explicit owner/planner-only financial readback copy when editing is disabled, so read-only collaborator roles keep visibility without pretending they can mutate the ledger
   - this batch shipped: focused UI proof is green for read-only budget and vendor surfaces, including disabled mutation controls, preserved export/readback actions, and explicit guest non-exposure language
   - this batch shipped: `proof:v1:collaborator-access` now includes the planning financial read-only surface tests, so the collaborator gate proves these budget/vendor role boundaries instead of leaving them implied
   - this batch shipped: vendor follow-up metadata now persists as real site-backed planning state instead of local-only browser storage, including next follow-up date, reminder channel, lead time, and queued-readback timestamps
   - this batch shipped: vendor and payment ledger exports now include reminder preference/readback columns, and the planning ledger shows a real reminder-readiness summary instead of treating reminders as side notes
   - this batch shipped: focused proof is green for vendor reminder metadata normalization, site-meta persistence/readback through `wedding_site_settings_patch`, and reminder-readiness summary logic
   - this batch shipped: vendor meta now supports multiple saved contract/invoice/proposal files plus named payment milestones, all persisted in site-backed planning state instead of a single document field or handwritten notes
   - this batch shipped: vendors export now carries those richer file and milestone readbacks so owner/planner handoff packets preserve contract proof and payment schedule detail
   - this batch shipped: budget review now includes a real vendor reconciliation surface that compares vendor contract and paid totals against linked budget rows, flags mismatches, and shows whether files and milestones are saved
   - this batch shipped: focused proof is green for vendor-meta normalization, reconciliation math, and the expanded budget/vendor readback UI
   - this batch shipped: the combined budget/vendor ledger CSV now carries saved reminder timing, reminder channel, queued-readback timestamps, contract/invoice/proposal file summaries, and payment milestone summaries instead of dropping that owner/planner handoff context at export time
   - this batch shipped: the combined budget/vendor ledger CSV now also preserves internal vendor rating, shortlist status, and private rating notes so planner handoff exports keep the owner selection context already visible in the dashboard
   - this batch shipped: the combined budget/vendor ledger CSV now also preserves reconciliation readiness and blocker context, including contact-ready truth, due-date readiness, file/milestone counts, issue counts, and the exact reconciliation issues already shown in the dashboard instead of flattening the export back to raw amounts only
   - this batch shipped: the combined budget/vendor ledger CSV now also includes the numeric contract-gap and paid-gap deltas from reconciliation, so exported planner handoffs show not just that a vendor is mismatched but by exactly how many dollars
   - this batch shipped: the combined budget/vendor ledger CSV now also includes the linked budget estimated, actual, and paid totals behind each vendor reconciliation row, so handoff exports show both sides of the comparison instead of only the mismatch labels and deltas
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget line counts and line names for each vendor reconciliation row, so exported planner handoffs can trace every mismatch back to the exact budget entries involved
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget categories for each vendor reconciliation row, so exported planner handoffs preserve both the exact line names and their planning buckets when tracing mismatches
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget due dates for each vendor reconciliation row, so planner handoffs keep payment timing context alongside linked line names, categories, totals, and deltas
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget notes for each vendor reconciliation row, so planner handoffs keep the saved per-line context behind those linked payments instead of limiting the export to names, categories, and timing only
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget payment statuses for each vendor reconciliation row, so planner handoffs can see whether those linked lines are unpaid, partially paid, paid, or still only planned instead of inferring status from totals alone
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget open totals for each vendor reconciliation row, so planner handoffs can see the remaining linked budget balance directly instead of deriving it from actual-vs-paid totals by hand
   - this batch shipped: the combined budget/vendor ledger CSV now also includes linked budget timing states for each vendor reconciliation row, so planner handoffs can see when linked balances are overdue, due soon, upcoming, covered, or missing due dates instead of inferring urgency from raw dates alone
   - this batch shipped: the combined budget/vendor ledger CSV now also preserves vendor contact name, website, and document label so planner exports keep the same routing and document context already present in the dashboard and vendor-only export
   - this batch shipped: vendor reconciliation now flags open balances that still have no saved email or phone, so planner handoff review catches payment follow-through blockers instead of treating missing contact data like a separate, easy-to-miss surface
   - this batch shipped: vendor reconciliation now also flags open balances that still have no saved due date, so planner handoff review catches payment-timing gaps instead of leaving “money owed, timing unknown” buried outside the reconciliation surface
   - this batch shipped: reconciliation summary cards now expose contact-ready and due-date-ready counts alongside files and milestones, so the owner/planner readback reflects the newer payment follow-through blockers instead of keeping them hidden only inside per-vendor issue chips

13. `ACTIVE`: website and invite analytics
   - this batch shipped: owner overview analytics now read from the real `guest_hub_events` table instead of review-model-only placeholders, with a 30-day aggregate summary for website visits, private invite-link opens, QR entries, recap views, and guest-hub action clicks
   - this batch shipped: the guest-hub route now classifies public site visits, private invite opens, and QR-tagged entries into separate aggregate event targets without storing guest tokens, raw invite URLs, IPs, or exact device fingerprints
   - this batch shipped: public guest-hub QR assets now encode a safe `entry=qr` marker in the QR payload itself while keeping the visible printed copy clean, so owner QR analytics can distinguish QR-driven guest-hub entry from ordinary public-link traffic
   - this batch shipped: wedding overview baseline/readiness/funnel cards now show measured website visits, invite-link opens, and QR entries instead of claiming those lanes are still purely planned
   - this batch shipped: focused proof is green for analytics aggregation math, readiness/funnel state, overview model wiring, guest-hub QR safety, identity-export QR payload continuity, and the standard local type/lint/build gate
   - this batch shipped: owners now have saved aggregate-analytics policy controls inside Settings for enable/pause, retention window, and guest-facing disclosure note, and overview analytics read that policy back instead of acting like tracking is policy-less
   - this batch shipped: guest-hub tracking now respects the saved analytics policy server-side, so new aggregate guest-hub events stop writing when the owner pauses analytics collection
   - this batch shipped: overview analytics retention now follows the saved owner retention window instead of a hardcoded lookback
   - this batch shipped: private RSVP token routes now feed aggregate invite-open analytics too, so `/rsvp?token=...` and event RSVP invite routes no longer sit outside the measured invitation-open lane
   - this batch shipped: direct guest invite-entry routes now feed aggregate invite-open analytics too, so guest contact update, guestbook, photo upload, and vault contribution views no longer sit outside the measured invitation-open lane when guests skip the top-level hub
   - this batch shipped: focused proof is green for RSVP-route invite-open tracking, event RSVP invite-open tracking, and analytics summary aggregation for those new RSVP targets
   - this batch shipped: focused proof is green for direct guest-route invite-open instrumentation and analytics summary aggregation across those new guest-contact, guestbook, photo-upload, and vault targets
   - this batch shipped: direct public site routes now feed aggregate analytics too, so plain `/site/:slug` visits, invite-token site entries, and QR-tagged site entries no longer disappear from the owner funnel when guests land on the site shell before the hub
   - this batch shipped: direct recap invite entries now classify as aggregate invite opens while still preserving recap-view counts, so `/event/:slug/recap?token=...` no longer falls into a generic recap bucket outside the invite funnel
   - this batch shipped: focused proof is green for site-route analytics target classification plus summary aggregation across `/site`, `/site/invite`, and `/site/qr`
   - this batch shipped: focused proof is green for recap invite-route classification and analytics summary aggregation, and the dedicated website/invite analytics proof lane now includes the recap route tests
   - this batch shipped: a dedicated `proof:v1:website-invite-analytics` lane now reruns analytics aggregation/readiness tests, build integrity, a real public-route browser proof for `/site`, `/event`, RSVP, and photo upload privacy, and an authenticated live owner overview readback on [dayof.love](https://dayof.love)
   - this batch shipped: live production proof is now green that public and guest-facing routes still do not expose owner analytics detail while the owner overview still reads back the aggregate analytics card and guardrails on the shipped runtime
   - this batch shipped: audited invite-entry coverage is now codified in a shared aggregate-target list plus a source-backed route audit, so hub, site, RSVP, recap, guest contact, guestbook, photo upload, and vault invite entries cannot silently drift out of owner analytics coverage without breaking proof
   - active remaining work: none beyond keeping the live owner analytics and public-route privacy proof green on future deploys

14. `ACTIVE`: app-like web day-of mode
   - this batch shipped: guest-hub config now reads the latest owner day-of/event-reminder message into a guest-safe `Latest update` card, keeping `scheduled`, `queued`, `sending`, and `sent` visibly distinct instead of leaving announcements in planned-only status
   - this batch shipped: guest-scoped invite identity now hydrates RSVP/check-in readback in the guest hub, so invite-linked guests can see their own RSVP status and arrived/not-arrived state without exposing raw tokens in the UI
   - this batch shipped: the guest-hub status board now promotes announcement readback and guest-state readback to `ready` only when those live surfaces are actually connected, with focused proof green for the new guest-hub readback helpers and live content shell
   - this batch shipped: the guest hub now reads back the latest guest-safe coordinator handoff summary from the real coordinator handoff table, so guests can see current event staffing status, team names, and a scrubbed handoff note without exposing private tokens or internal operator noise
   - this batch shipped: travel spotlight route cards now track real direction/map deep-link clicks, including external map URLs, so the guest-facing day-of travel path is not treated like invisible traffic once guests leave the hub shell
   - this batch shipped: focused proof is green for guest-safe coordinator handoff scrubbing, guest-hub handoff rendering, and external directions-card click tracking inside the real travel quick-plan UI
   - this batch shipped: the guest hub now saves a guest-safe offline snapshot of settings, site summary, travel context, latest update, guest state, and coordinator handoff, then rehydrates that snapshot when the hub opens offline instead of dropping guests into an empty shell
   - this batch shipped: day-of web-mode readiness now distinguishes between simple retry fallback and a real cached offline shell/snapshot path, so the board only claims offline support when the snapshot and service-worker shell are actually present
   - this batch shipped: focused proof is green for offline snapshot sanitization/retention, EventHub snapshot read-write wiring, and the updated day-of readiness truth
   - this batch shipped: the service worker now caches a dedicated guest-safe offline event shell for `/event/...` navigations, so reopening the wedding hub offline returns a real hub fallback page instead of a dead browser error
   - this batch shipped: the offline event shell reads the saved guest-safe snapshot from local storage and shows couple, update, guest-status, coordinator, and travel summary readback without exposing invite tokens or private operator state
   - this batch shipped: focused proof is green for guest-hub navigation fallback rules inside the service worker and for the token-safe offline shell asset being part of the cached shell path
   - this batch shipped: a dedicated `proof:v1:dayof-web-mode` lane now reruns offline snapshot, readiness, service-worker, and EventHub render truth before a real browser pass, so this lane is no longer guarded only by unit/helper tests
   - this batch shipped: real browser proof is now green for the two distinct offline day-of guest paths: degraded-network `Showing the saved guest hub` fallback inside the live EventHub app and the cached `/event/...` offline shell returned by the service worker
   - this batch shipped: the new browser proof explicitly checks that both offline guest paths stay token-safe, mobile-safe, and still expose the travel/day-of hub actions guests need instead of collapsing into a blank error or raw-token fallback
   - this batch shipped: the guest hub now shows an explicit `Link access` status card so guests can tell whether the current hub link is public-only, invite-only, or guest-specific before relying on day-of schedule/travel details
   - this batch shipped: the day-of hub status board now treats private-event visibility as its own connected signal instead of leaving guests to infer public-vs-private access from surrounding copy
   - this batch shipped: the guest-hub `Link access` summary now explicitly says whether RSVP/check-in readback is included, so guests can tell the difference between public, invite-only, and fully guest-specific links without guessing from the badge alone
   - this batch shipped: the guest-hub `Link access` card now also spells out how many core day-of actions are still missing from the current link, so guests and owners can judge the remaining QR/day-of gap without translating only percentages and raw action lists
   - this batch shipped: the owner-facing guest-hub status summary now also reads back concrete ready-vs-missing core-link counts beside the percentage, so couples can judge QR/day-of completeness without backing into it from `50% ready` alone
   - this batch shipped: the owner-facing guest-hub status summary now also says how many total guest actions are unlocked from the current link, so the owner readback matches the guest-facing access card more closely instead of stopping at core-coverage math alone
   - this batch shipped: the owner-facing guest-hub status summary now also says how many core day-of actions are still missing from the current link when coverage is partial, so the top readback surfaces the remaining QR/day-of gap directly instead of leaving that count buried in the detail row
   - this batch shipped: the guest-hub `Link access` card now keeps the core day-of all-clear explicit with `0 missing` readback when a link is fully ready, so couples and guests no longer have to infer full QR/day-of coverage from a softer success sentence
   - this batch shipped: the owner-facing `Guest hub status` summary now keeps that same `0 missing` core day-of all-clear explicit when a link is fully ready, so owner and guest QR/day-of readback no longer drift in the clean case
   - this batch shipped: the no-app day-of readiness summary now calls out the first live guest actions when the lane is ready, so couples can tell what the shared mobile hub actually includes instead of only seeing a bare action count
   - this batch shipped: focused proof is green for guest-safe access-card helper truth, EventHub render wiring, and offline/mobile browser continuity for the new `Link access` surface
   - rerun live production proof for the new `Link access` surface after the next approved deploy so public vs guest-specific visibility is proven on `https://dayof.love`
   - add live production guest-hub write/read with cleanup after the day-of web-mode lane is finished

15. `PLANNED / PAUSED`: vendor discovery, directory SEO, claims, and distribution loop
   - status: backlog-added only; do not overbuild this lane until implementation is explicitly resumed
   - product direction:
     - vendor pages are primarily a distribution engine, but couples should still be able to find and save vendors they are considering
     - this should not clutter the main couple dashboard
     - vendors belong in `More Tools` by default, with an optional pin-to-nav path later
     - default couple nav should remain `Home`, `Website`, `Guests`, `Registry`, `Messages`, `Memories`, `More Tools`
     - the `More Tools` entry should read `Find Vendors`
     - `Find Vendors` description: `Browse and save wedding vendors you're considering.`
     - if a couple pins the area into main nav later, the nav label should become `Vendors`
   - backlog item: couple-facing `Find Vendors` area
     - add `Find Vendors` to `More Tools`
     - let logged-in couples browse vendor profiles from the existing vendor profile system or a vendor-directory query layer built on top of it
     - support search by vendor name, category, city, and service area
     - support category filters for `Photographer`, `Videographer`, `Venue`, `Planner`, `Coordinator`, `Florist`, `Caterer`, `DJ / Band`, `Beauty`, `Rentals`, `Transportation`, `Dessert / Cake`, `Stationery`, `Officiant`, and `Other`
     - support city/region filtering
     - show calm vendor cards with vendor name, category, city/service area, hero image, short description, website/Instagram links when available, claimed/unclaimed badge, and saved status
     - allow logged-in couples to save vendors, add private notes, and mark saved vendors as `Considering`, `Contacted`, `Booked`, or `Passed`
     - allow couples to add their own vendor manually when the vendor is not already in the directory
     - acceptance criteria:
       - `Find Vendors` appears in `More Tools`
       - the page can list vendors from the existing vendor profile data model or a new vendor directory query layer
       - users can search/filter vendors
       - users can save a vendor
       - saved vendors appear in a `Saved` tab
       - the page does not appear in default main nav unless pinned
   - backlog item: public vendor page routing and SEO directory
     - add public indexed routes for `/vendors`, `/vendors/:city`, `/vendors/:city/:category`, and `/vendors/:city/:category/:slug`
     - if the current vendor profile route differs, preserve backwards compatibility with redirects or canonical URLs
     - each directory/profile page should support a unique title, meta description, canonical URL, structured headings, internal links between city/category/vendor pages, related vendors, related categories, city/category intro copy, and an FAQ section on city/category pages
     - `/vendors` should show popular cities and categories
     - `/vendors/:city` should show all wedding vendors in that city
     - `/vendors/:city/:category` should show vendors for that category/city combination
     - vendor cards should link through to vendor profile pages
     - vendor profile pages should include breadcrumb links
     - acceptance criteria:
       - public vendor directory pages render without login
       - city/category pages are crawlable and internally linked
       - vendor profile pages have canonical URLs
       - existing vendor profile pages still work
   - backlog item: vendor profile page improvements for distribution
     - update the existing vendor profile page so it works for both couples and vendors without feeling like an ad
     - couple-facing CTAs should include `Visit website`, `View Instagram`, `Save vendor`, `Add to my wedding`, and `Send inquiry`
     - vendor-facing CTAs should include `Claim this profile`, `Share with a couple`, `Get your referral link`, and `Edit this profile` when the viewer is the approved owner
     - the profile should include vendor name, category, city/service area, description, hero image, gallery, services/packages, price/planning note when available, website, social links, testimonials, FAQ, related vendors, and claimed/unclaimed status
     - keep the Day of Love CTA visible but secondary to the vendor's own information
     - acceptance criteria:
       - logged-in couples can save the vendor from the profile page
       - unauthenticated users can still view the public profile
       - vendors see a clear claim CTA
       - the profile includes a Day of Love CTA without overpowering the vendor information
   - backlog item: saved vendors workspace
     - keep this inside the vendor area as `Discover` and `Saved` tabs by default
     - `Saved` should show all saved vendors, support status changes (`Considering`, `Contacted`, `Booked`, `Passed`), allow private notes, allow manual vendors, allow removing a saved vendor, and show vendor contact links
     - future-only optional follow-on: connect booked vendors into the wedding-day vendor schedule later
     - acceptance criteria:
       - couples can manage saved vendors without leaving the vendor area
       - manual vendors and directory vendors can coexist
       - saved vendors are private to that couple/wedding
   - backlog item: vendor claim flow
     - add `Claim this profile` to unclaimed public vendor profiles
     - build a manual-review-first claim request flow that captures vendor profile/name, claimant name, claimant email, business website or matching domain, and an optional message
     - store claim requests in Supabase
     - admin review/approval can come later, but the storage and state model should be ready for approve/reject flow
     - once approved, the vendor owner can edit the profile
     - acceptance criteria:
       - unclaimed vendor profiles show a claim CTA
       - claim requests are submitted and stored
       - claimed profiles show claimed status
       - claim flow does not expose private couple data
   - backlog item: vendor referral/distribution loop
     - each claimed vendor should eventually get a referral link, referral code, shareable copy, a badge/image asset or simple badge embed, referred-signup tracking, and a dashboard count of referred couples
     - vendor dashboard referral tools should include `Copy referral link`, `Copy recommended message to send couples`, `View referred signup count`, `Download/share badge`, and profile completeness suggestions
     - example vendor copy to keep around for later implementation: `Planning with us? We recommend Day of Love for wedding websites, RSVPs, guest updates, registry links, and photo sharing.`
     - acceptance criteria:
       - vendor has a unique referral code/link
       - referral attribution can be captured on signup
       - vendor dashboard shows basic referral activity
       - referral language is transparent and not spammy
   - backlog item: vendor owner dashboard
     - keep vendor owner surfaces separate from the couple dashboard, with routes such as `/vendor/login`, `/vendor/dashboard`, `/vendor/profile`, and `/vendor/referrals`
     - after claim approval, vendor owners should be able to edit business name, description, category, city/service area, website, social links, photos, services/packages, FAQ, and testimonials
     - vendor owners should also have access to referral/share tools, inquiries, and profile completeness
     - acceptance criteria:
       - vendor dashboard is not mixed into the couple dashboard
       - vendor ownership is enforced
       - vendor can edit only their own claimed profiles
   - backlog item: admin vendor management
     - internal admin tooling should support CSV import, manual profile creation, editing any vendor profile, approving/rejecting claim requests, marking profiles claimed/unclaimed, assigning category/city/service area, duplicate management, featured/recommended flags when needed, inquiry review, referral attribution review, and profile status management (`Draft`, `Published`, `Hidden`, `Needs review`)
     - acceptance criteria:
       - admin can manage vendor profiles without direct database edits
       - admin can approve/reject claims
       - admin can import vendors in bulk
       - admin can publish/unpublish vendor pages
   - backlog item: vendor data-model and migration evaluation
     - evaluate and add the schema needed for public vendor pages, saved vendors, claims, referrals, and inquiries
     - likely tables: `vendor_profiles`, `vendor_profile_claims`, `vendor_saved_by_couples`, `vendor_referrals`, `vendor_referral_events`, `vendor_profile_inquiries`, `vendor_categories`, and `vendor_service_areas`
     - saved-vendor relationships should support `wedding_id`, nullable `vendor_profile_id`, nullable manual-vendor fields, `status`, `notes`, `created_at`, and `updated_at`
     - claim records should support `vendor_profile_id`, `claimant_name`, `claimant_email`, `claimed_business_domain`, `message`, `status`, `reviewed_by`, and `reviewed_at`
     - referral records should support `vendor_profile_id`, `referral_code`, `referral_url`, `referred_signup_count`, and attribution events
     - acceptance criteria:
       - schema supports public vendor pages, saved vendors, claims, and referrals
       - RLS protects couple-private saved-vendor notes/statuses
       - public profile data remains readable without login
       - vendor owners can only edit their own approved profiles
   - backlog item: vendor UI/UX principles
     - vendor discovery should not make the main app feel cluttered
     - `More Tools` is the default entry point
     - couples can pin `Vendors` only if they want it
     - vendor pages should help couples, but the strategic purpose is distribution
     - avoid a spammy marketplace feel
     - do not use `sponsored` language unless paid placement exists and is clearly disclosed
     - prefer calm labels like `Find Vendors`, `Saved Vendors`, `Claim this profile`, and `Share with couples`
     - avoid SaaS-heavy labels like `Vendor CRM`, `Vendor Management System`, or `Marketplace Admin` outside internal admin tooling
     - public pages should be SEO-friendly and fast
     - couple-private notes and statuses must never appear publicly
     - vendor referral tools should be transparent
   - backlog item: recommended build phases
     - `Phase 1`: `More Tools` entry for `Find Vendors`, public vendor directory routes, search/filter vendor cards, vendor profile page improvements, save vendor, and the saved-vendors tab
     - `Phase 2`: manual saved vendors, notes/statuses, claim-this-profile flow, admin claim review, and basic admin vendor management
     - `Phase 3`: vendor dashboard, referral links/codes, referral attribution, vendor share kit, and profile completeness
     - `Phase 4`: bulk vendor import, city/category SEO scaleout, duplicate detection, ranking logic, vendor badges, and partner analytics
   - end-state reminder:
     - Day of Love should have a public vendor directory that supports SEO and vendor distribution while also giving couples a calm `More Tools` place to discover and save vendors without turning the core wedding dashboard into a marketplace

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
