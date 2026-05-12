# Production Hardening Backlog

## Launch Question

Is the current repo a clean launch baseline today?

Yes. The launch-critical hardening lane is closed, the blocker-fix runtime is live, and the release gate now enforces the Supabase-backed RSVP proof lane.

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-11 08:48 PM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest Git SHA | `511dc296` |
| Latest commit message | `Move builder, section, itinerary, and seating writes behind RPCs` |
| Vercel deployment ID | `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | Live blocker-fix lane now includes `submit-rsvp --no-verify-jwt` plus applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`. Earlier same-day confirmed/live-proven: `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `guest-contact-lookup --no-verify-jwt`; `guest-contact-submit --no-verify-jwt`; `translate-site-content`. Public vault contribution remains deferred/fail-closed because live inventory still does not confirm `vault-contribution-public`. |
| Current readiness score | `9.9 / 10` |
| Current launch verdict | `GO` |
| Production-ready | `YES` |
| Reason production-ready is not yet claimed | No active P0/P1 blockers remain. Remaining items are explicitly deferred and non-launch. |
| Current blockers | none |
| Current proof state | Launch-critical runtime proof remains green: `npm test`, `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `service-role-authorization`, `email-messaging-authorization`, `launch-closeout`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, `guest-lookup-scope`, `collaborator-runtime`, and `client-rls-matrix` are still green on the current live baseline. The post-launch hardening lane is now locally stronger: `npm run proof:v1:client-write-inventory` scans all tracked `src` runtime files and is back to `PASS`, confirming no direct client `.insert/.update/.upsert/.delete` calls remain in tracked shipped runtime code. The final raw-write sweep moved section, builder publish, itinerary, and seating assignment/version writes behind new local RPC batches, with focused proof green (`siteRepository.test.ts`, `builderProjectService.test.ts`, `itineraryService.test.ts`, `seatingService.test.ts`, `dashboardDataBoundary.test.ts`, `clientWriteInventoryProofScript.test.ts`, `typecheck`, `git diff --check`). GitHub Actions `Release Launch Gate` remains green on run `25705683563`. |
| Current deployment state | Frontend is live at [dayof.love](https://dayof.love) on exact runtime Git SHA `f0cbf841` via verified Vercel production deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`. The latest pushed branch head is now `511dc296`, which contains the final local raw-write RPC sweep but has not changed the live frontend runtime yet. `submit-rsvp` is live with the serialized capacity path and the migration is applied remotely. Local-only migrations now extend through `20260512031500_seating_assignment_version_rpcs.sql`; they are not applied remotely yet. Public vault contribution remains outside the launch baseline because the live route still fails closed and the function inventory does not confirm `vault-contribution-public`. |
| Current next actions | apply/deploy the pending local RPC batches, rerun `collaborator-runtime` / `client-rls-matrix` with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`, rerun `proof:v1:client-write-inventory` against the post-apply tree, and close any remote proof gaps that appear after the apply sweep |

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

- `P2 Client-side Supabase write surface is still too broad`
  - files:
    - [src/pages/dashboard/guests/guestService.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/dashboard/guests/guestService.ts:508)
    - [src/pages/dashboard/planning/planningService.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/dashboard/planning/planningService.ts:14)
    - [src/pages/dashboard/seating/seatingService.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/dashboard/seating/seatingService.ts:298)
  - note:
    - the tracked `src` runtime inventory is now locally clear of direct Supabase `.insert/.update/.upsert/.delete` calls
    - the remaining gap is that the new RPC batches are still local-only until migration apply/deploy and fresh live proof complete
  - direction:
    - keep simple reads client-side
    - keep migrating any newly discovered dangerous writes into Edge Functions or RPCs if they appear after the remote apply sweep
- `P2 Live RLS proof should be expanded further`
  - file: [docs/service-role-authorization-disposition-2026-05-05.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/service-role-authorization-disposition-2026-05-05.md:56)
  - note:
    - `npm run proof:v1:client-rls-matrix` is now the canonical live baseline for client-facing role proof
    - it already aggregates anon guest-contact scope, public RSVP scope, and owner/collaborator viewer-deny plus planner/coordinator-allow runtime proof
    - it now also proves direct guest, planning, and seating writes remain permission-scoped while direct timeline/settings writes stay denied without the matching permission set
    - guest-dashboard settings plus guest-core and planning/seating core writes are now routed through local-only RPC batches
    - deeper direct client-table write coverage is still worth adding for remaining non-guest dashboard surfaces beyond guest, planning, and seating because the client-heavy mutation surface remains broad
- `P2 Dashboard Guests remains orchestration-heavy`
  - file: [src/pages/dashboard/Guests.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/dashboard/Guests.tsx:1)
  - note:
    - decomposition improved, but this route still coordinates a large amount of domain behavior in one place
  - direction:
    - continue splitting by domain: guest list, RSVP config, import, invitations, check-in, campaigns
- `P3 Type/lint rigor is still soft`
  - files:
    - [tsconfig.app.json](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/tsconfig.app.json:18)
    - [eslint.config.js](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/eslint.config.js:29)
  - note:
    - `strict` is on, but `noImplicitAny`, `noUnusedLocals`, and `noUnusedParameters` are still disabled
    - several high-value lint rules are still warnings
  - direction:
    - tighten gradually, starting with new code and high-risk modules

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

- `P1-04 Public section DTO minimization` -> `RESOLVED`
  - every `SectionType` now flows through explicit public DTO construction in `src/lib/publicRenderContract.ts`
  - remaining guest families were finished in the final pass: `venue`, `schedule`, `registry`, `faq`, `menu`, `music`, `directions`, `video`, `quotes`, and `custom`
  - stale builder aliases are normalized into renderer-facing fields, then stripped from the public output
  - nested arrays/items are explicitly shaped for venues, schedule events/days, registry links/gifts, FAQ items, menu sections/courses/items, music songs/playlists, directions transport rows, video cards, quote entries, and custom blocks
  - broad `bindings`, `locked`, meta timestamps, and raw `styleOverrides` are no longer passed through generically
  - focused DTO tests are green on both server and client paths
- `P1-09 Deployment / proof truth canonicalization` -> `RESOLVED`
  - branch, commit, deploy, live-proof, and secure-proof truth are now recorded in one canonical board
  - contradictory old SHAs/deploy IDs are removed
  - each launch-relevant surface is now classified with an exact status, proof command, and remaining gap
  - exact runtime Git SHA is documented honestly as unrecoverable for the current working-tree production deploy instead of being guessed
- `P1-03 Layout config fallback removal or hard gate` -> `RESOLVED`
  - production inventory showed `0` published rows using the legacy flag
  - the public `layout_config` fallback path is gone
- `P1-06/P1-07 secure proof lanes` -> `RESOLVED`
  - secure service-role, storage/media, and queue containment are green
  - secure email queue-processing containment is green
- `P1-10 Guest contact update public runtime auth mismatch` -> `RESOLVED`
  - forced a real lookup function version bump
  - redeployed `guest-contact-lookup --no-verify-jwt`
  - `npm run proof:v1:guest-lookup-scope` now passes exact-match lookup, fail-closed mismatches, signed contact-session issuance, and household-scoped submit/update

## Non-Critical Before Launch

- `P2 Expanded client-RLS proof matrix`

## Non-Critical After Launch / Deferred

- `public vault contribution / anniversary vault guest route` -> `DEFERRED`
  - public vault contribution is not part of the current launch baseline
  - live route still fails closed with `This vault is not available right now`
  - direct function probe still returns `404 NOT_FOUND`
  - `supabase functions list` does not show `vault-contribution-public`, even though the deploy command reported success
  - required before enabling:
    - live function inventory must actually include `vault-contribution-public`
    - a proof site must have enabled `vault_configs`
    - `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` must pass
- `custom host/subdomain route live rerun` -> `DEFERRED`
  - canonical public-site resolver is live-green and `.dayof.love` subdomain parsing is now pinned by local helper tests, but no dedicated custom-host DNS proof was rerun in this wave
- `registry owner edit/import manual truth notes` -> `DEFERRED`
  - automated registry proof is green for public/runtime truth guards; owner import/repair persistence notes remain a manual follow-up, not a launch blocker
- `SMS/Telnyx live provider send` -> `DEFERRED`
  - provider setup is intentionally outside the launch-hardening gate
- `AI server secret inventory / internal OPENAI prereq` -> `DEFERRED`
  - not required for the current public launch gate
- `runtime operator-note checklist` -> `DEFERRED`
  - centralized in [docs/v1-runtime-operator-notes-checklist.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-runtime-operator-notes-checklist.md)
  - rerun with `npm run proof:v1:runtime-note-checklist` when the human operator note pack changes

## Validation Matrix

| Command | Status | Environment | Last run | Notes |
| --- | --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm run lint -- --quiet` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm run build` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm test` | `PASS` | `local` | `2026-05-11` | `537/537` files, `3321/3321` tests |
| `npm run test:security` | `PASS` | `local` | `2026-05-11` | `265/265` |
| `npm run test:smoke` | `PASS` | `production` | `2026-05-11` | `registry`, `rsvp`, `csvmapper`, `checkin`, `messages`, `site` all green after unrestricted-network rerun |
| `npm run proof:v1:public-access-coverage` | `PASS` | `local` | `2026-05-11` | Static/public contract coverage is green |
| `npm run proof:v1:client-write-inventory` | `PASS` | `local` | `2026-05-11` | Broadened guard scans all tracked `src` runtime files and now reports no direct client `.insert/.update/.upsert/.delete` calls |
| public DTO leak tests | `PASS` | `local` | `2026-05-11` | Focused `publicRenderContract`, `publicSiteRenderModel`, `publicSiteAccess` lanes are green |
| `npm run proof:v1:guest-lookup-scope` | `LIVE PASS` | `production` | `2026-05-11` | Included in `proof:v1:client-rls-matrix`; exact-match lookup + signed-session household update are green |
| `npm run proof:v1:client-rls-matrix` | `LIVE PASS` | `production + browser runtime` | `2026-05-11` | Aggregates live anon guest-contact scope, public RSVP scope, owner/collaborator viewer-deny plus planner/coordinator-allow runtime proof, and direct guest/planning/seating write allow/deny coverage |
| `npm run proof:v1:registry-preview-ssrf` | `LIVE PASS` | `production` | `2026-05-11` | `26/26` hostile-target checks passed |
| `npm run proof:v1:service-role-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Unauthenticated denial lane green; secure closeout rerun completed with provided key |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | `secure env + production` | `2026-05-11` | Queue-processing proof green; controlled invalid-recipient row fails safely |
| `npm run proof:v1:launch-closeout` | `PASS` | `secure env + production` | `2026-05-11` | Secure closeout bundle green with provided key |
| `npm run proof:v1:collaborator-runtime` | `LIVE PASS` | `production` | `2026-05-11` | Owner invite/accept flow, viewer deny + planner/coordinator allow runtime proof, and direct guest/planning/seating write allow/deny coverage are green; optional guest-settings RPC proof remains deploy-gated |
| `npm run proof:v1:ai-product-readiness` | `PASS` | `local` | `2026-05-11` | `25/25` AI product-readiness checks passed |
| `npm run proof:v1:data-integrity` | `PASS` | `production` | `2026-05-11` | Anon-limited integrity proof green; no hard launch corruption found |
| `npm run proof:v1:prereqs` | `PASS` | `production + local env` | `2026-05-11` | Required migrations/functions/runtime readiness green; deferred provider/AI env notes remain non-launch |
| `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Live AI/photo column exposure and rollout readiness are green |
| `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Translation route plus live AI/photo model-backed lanes are green |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-11` | Fresh rerun against Vercel deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-11` | Fresh rerun against Vercel deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`; `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-11` | Fresh rerun after serialized RSVP deploy; strict smoke green |
| `GitHub Actions Release Launch Gate` | `PASS` | `GitHub Actions + repo secrets` | `2026-05-11` | Branch-triggered workflow is green on run `25705683563`; strict RSVP smoke is mandatory |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | `FAIL` | `production` | `2026-05-11` | Route still fails closed with `This vault is not available right now`; lane is deferred/non-launch until live function inventory and enabled configs are fixed |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-11` | Current working tree clean of whitespace errors |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `f0cbf841` | `yes` | `Vercel production dpl_386dKTNkTVK95UfwJj9qEtnH1b8q` | `--prod` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | both green after blocker-fix deploy | None | `LIVE PASS` |
| `public-site-access` | `23bee092` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:public-access-coverage`; live smoke/public-quality | green | None on current public resolver lane | `LIVE PASS` |
| `public-registry-items` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry`; live public smoke/public-quality | green | Owner import/repair runtime notes are deferred and not a public-launch blocker | `LIVE PASS` |
| `public-itinerary-by-slug` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | green | None on the public itinerary lane | `LIVE PASS` |
| `validate-rsvp-token` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:guests-rsvp-ops`; `npm run test:smoke` | green | None on the RSVP lookup lane | `LIVE PASS` |
| `public-site-rsvp-submit` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:guests-rsvp-ops` | green | None on the public RSVP submit lane | `LIVE PASS` |
| `guest-contact-lookup` | `live version 32` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Not redeployed in the exact-SHA sweep, but fresh live proof is green | `LIVE PASS` |
| `guest-contact-submit` | `live version 37` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Not redeployed in the exact-SHA sweep, but fresh live proof is green | `LIVE PASS` |
| `guestbook-submit` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | green | Guestbook submission is covered through the guest-hub write/read lane | `LIVE PASS` |
| `vault-entry-submit` | `live list still shows version 6 from 2026-05-01` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | attempted `--no-verify-jwt` closeout redeploy | `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | fails closed on unavailable route | Public vault contribution is not part of the current launch baseline; rerun after live inventory and enabled-config fix | `DEFERRED` |
| `vault-contribution-public` | `not present in live function inventory` | `no confirmed live function` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | attempted `--no-verify-jwt` closeout redeploy | direct function probe; vault write/read proof | direct probe still `404 NOT_FOUND`; public route fails closed | Hard-disabled/deferred until the function exists in live inventory and a proof site has enabled vault configs | `DEFERRED` |
| `interactive-section-public` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | green | None on guest hub vote/suggestion lane | `LIVE PASS` |
| `registry-preview` | `older live version (not redeployed in exact-SHA sweep)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry-preview-ssrf` | green | None on SSRF/host allowlist lane | `LIVE PASS` |
| `photo-upload` | `live version 37` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | green | None | `LIVE PASS` |
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
| `subdomain route` | `23bee092` helper logic; live DNS not rerun | `yes` | `Frontend host routing for .dayof.love` | `n/a` | `src/lib/publicSiteSlug.test.ts`; canonical smoke on `dayof.love` | local subdomain parsing green; live apex route green | Dedicated subdomain DNS rerun remains deferred and non-launch | `DEFERRED` |
| `AI/provider functions` | `mixed live versions` | `yes` | `Frontend + Edge runtime` | `mixed` | `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`; `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`; `npm run proof:v1:ai-product-readiness` | green | None on current launch-hardening lane | `LIVE PASS` |
| `SMS/Telnyx live send` | `not enabled in current launch` | `no` | `provider lane only` | `env + sender setup required` | none | not run | Remains intentionally outside the launch baseline until provider setup and live-send proof are ready | `DEFERRED` |
| `sections_public_visible_read` removal migration | `remote DB state only` | `yes` | `Supabase database` | `supabase db push` | live public-route proofs stayed green after push | green | Exact migration ledger SHA not recovered here; runtime evidence is green | `LIVE PASS` |
| public/guest/service-role access migrations | `remote DB state only` | `yes` | `Supabase database` | `historical migrations` | secure auth proofs; public smoke/public-quality; collaborator/guest-hub/photo proof | green | Exact remote migration audit not rerun here; runtime evidence is green | `LIVE PASS` |

## Next 10 Tasks

1. Apply and deploy the pending local RPC batches (`20260511200000_guest_dashboard_settings_rpcs.sql`, `20260511211500_planning_seating_write_rpcs.sql`, `20260511220000_guest_core_write_rpcs.sql`, `20260511233000_guest_invitation_rsvp_rpcs.sql`, `20260511234500_registry_write_rpcs.sql`, `20260512001000_message_coordinator_write_rpcs.sql`, `20260512012000_settings_overview_write_rpcs.sql`, `20260512013000_vault_planning_write_rpcs.sql`, `20260512014500_onboarding_signup_write_rpcs.sql`, `20260512020000_name_change_write_rpcs.sql`, `20260512023000_media_audit_write_rpcs.sql`, `20260512024500_guest_photo_misc_write_rpcs.sql`, `20260512030000_builder_section_itinerary_write_rpcs.sql`, and `20260512031500_seating_assignment_version_rpcs.sql`), then rerun `proof:v1:collaborator-runtime` and `proof:v1:client-rls-matrix` with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1`.
2. Rerun the raw-write inventory after the local sweep and after remote apply so the no-direct-client-write claim stays canonical.
3. Expand live client-RLS coverage into any remaining non-guest direct-write surfaces that stay client-driven after the RPC apply sweep.
4. Resolve the deferred public vault contribution lane before enabling it.
5. Rerun dedicated custom-host/subdomain DNS proof if that launch surface becomes active.
6. Keep the deployment matrix current when runtime/deploy IDs change.
7. Keep the validation matrix current when proof lanes change.
8. Tighten TS/ESLint rigor for new code and high-risk modules.
9. Continue shrinking the dashboard Guests orchestration surface by domain.
10. Keep provider/SMS deferred until explicit setup and live-send proof are approved.

## Resolved Work Summary

- Public access fail-closed:
  - removed raw public blob exposure, removed public browser `sections` fallback, removed `layout_config` fallback
- Public DTO hardening:
  - explicit section-family allowlists for all `SectionType` values
  - explicit nested DTO shaping
  - section-scoped bindings only
  - explicit public style override keys only
- RSVP/session hardening:
  - published wedding snapshot precedence fixed
  - live RSVP lookup/submit proof green
- Public subresource gating:
  - guest hub write/read proof green
  - registry preview SSRF proof green
- Service-role / queue / storage containment:
  - secure service-role proof green
  - secure email queue-processing proof green
  - live photo upload/readback/analysis/recap/moderation proof green
- Validation / CI:
  - full `npm test` suite green
  - local launch gate green
  - board generation green
  - smoke lane green
- Internal tooling route hardening:
  - `/builder-v2-lab`, `/variant-preview-capture`, and `/template-scroll-capture` are now disabled in production unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
  - public template pages no longer advertise internal capture routes when that gate is off

## What Changed In This Final Closeout

- Reopened the launch board after a fresh code audit found a fail-open payment gate, an RSVP capacity race, and a release CI proof gap.
- Reclassified launch state from `GO` back to `HOLD` until those blockers are fixed and proven.
- Closed `P1-04 Public section DTO minimization` with the last explicit per-family DTO pass and matching focused proof.
- Closed `P1-09 Deployment / proof truth canonicalization` by rewriting the board into one exact launch-control source of truth.
- Discovered a real guest-contact blocker while canonicalizing the deployment matrix, then closed it.
- Forced a fresh `guest-contact-lookup` runtime version, redeployed both guest contact functions, and reran the live proof.
- Redeployed `translate-site-content`, added a source-hash ready-row fast path, and turned the live translation proof from a deferred `504` into a green `200`.
- Unified `.dayof.love` host parsing behind a shared helper and added explicit local proof for subdomain route resolution.
- Added `proof:v1:data-integrity` and `proof:v1:prereqs` production checks to the closeout evidence, confirming runtime table/function inventory is healthy enough for the current launch baseline.
- Reran live `ai-clearance` and local `ai-product-readiness`, keeping the AI/provider lane current instead of relying on earlier proof.
- Promoted production to exact frontend SHA `23bee092` on Vercel deploy `dpl_EusbfjAFUJPpU5fiLwEU5fR1nEb4` and reverified the core public/live proof bundle.
- Reran secure proof with the provided secure key; `service-role-authorization`, `email-messaging-authorization`, and `launch-closeout` are green again.
- Reran `collaborator-runtime`, `test:smoke`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, and `guest-lookup-scope` after the exact-SHA deploy.
- Expanded the live collaborator/client-RLS matrix so it now proves direct guest, planning, and seating writes stay permission-scoped while direct timeline/settings writes remain denied without permission.
- Moved guest-dashboard RSVP-config and reminder-settings writes behind guest-scoped RPCs in the working tree; migration apply, deploy, and `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` live proof are still pending.
- Moved guest core create/update/delete and bulk patch writes behind a third local RPC batch in the working tree; focused local proof is green, but migration apply, deploy, and fresh live proof are still pending.
- Moved core planning task and seating event/table writes behind local RPC batches in the working tree; migration apply, deploy, and fresh live proof are still pending.
- Fixed a collaborator payment-gate timing race in the working tree so planner/coordinator/viewer roles wait for role resolution before any payment redirect path is chosen; focused local proof is green, but the frontend deploy has not been refreshed yet.
- Moved remaining guest invitation/import/assisted-RSVP write paths behind a fourth local RPC batch in the working tree; focused local proof is green, but migration apply, deploy, and fresh live proof are still pending.
- Reused the new invitation RPCs from the itinerary dashboard so event-level guest invite/uninvite flows no longer depend on direct client `event_invitations` writes there either; focused local proof is green, but the already-pending RPC deploy/live proof still needs to happen.
- Moved registry owner-side item CRUD, reorder, and refresh-policy writes behind a fifth local RPC batch in the working tree; focused local proof is green, but migration apply, deploy, and fresh live proof are still pending.
- Tried to bring the public vault contribution lane into the same sweep, but the live route still fails closed and `vault-contribution-public` still does not appear in the live function inventory. That lane is now explicitly deferred/non-launch instead of vaguely “deployed”.
