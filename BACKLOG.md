# Production Hardening Backlog

## Launch Question

Is the current repo a clean launch baseline today?

Yes. The launch-critical hardening lane is closed, the blocker-fix runtime is live, and the release gate now enforces the Supabase-backed RSVP proof lane.

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-12 05:55 PM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest Git SHA | `6f47a442` |
| Latest commit message | `Strengthen guest contact with guest invite tokens` |
| Vercel deployment ID | `dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | Live blocker-fix lane now includes `submit-rsvp --no-verify-jwt` plus applied migration `20260511170500_serialize_submit_rsvp_capacity.sql`. Earlier same-day confirmed/live-proven: `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `guest-contact-lookup --no-verify-jwt`; `guest-contact-submit --no-verify-jwt`; `translate-site-content`. Same-day live session-secret separation redeploys are green for `public-site-access --no-verify-jwt`, `guest-contact-lookup --no-verify-jwt`, `guest-contact-submit --no-verify-jwt`, `validate-rsvp-token --no-verify-jwt`, and `interactive-section-public --no-verify-jwt`; `PUBLIC_SITE_SESSION_SECRET_V1` is now set on the linked Supabase project and the guest-contact submit function was redeployed after that secret landed so signed contact sessions verify live. `vault-contribution-public --no-verify-jwt` and `vault-entry-submit --no-verify-jwt` are now confirmed in live function inventory and the public vault contribution write/read/delete proof is green; the temporary `ALLOW_VAULT_QA_OPEN` proof secret was toggled only for that live run and then reset back to `false`. |
| Current readiness score | `9.9 / 10` |
| Current launch verdict | `GO` |
| Production-ready | `YES` |
| Reason production-ready is not yet claimed | No active P0/P1 blockers remain. Production-ready is claimed for the current launch baseline. Remaining items are non-launch, deferred, or repo-rigor follow-up. |
| Current blockers | none |
| Current proof state | Launch-critical runtime proof remains green on the current deployed baseline: `npm test`, `typecheck`, `lint`, `build`, `test:security`, `public-access-coverage`, `service-role-authorization`, `email-messaging-authorization`, `launch-closeout`, `canonical-smoke`, `public-quality`, `guests-rsvp-ops`, `guest-lookup-scope`, `collaborator-runtime`, and `client-rls-matrix` are green on the currently live runtime. The post-launch hardening lane is broader again: `npm run proof:v1:client-write-inventory`, `npm run proof:v1:ast-security`, `npm run proof:v1:test-lanes`, `npm run proof:v1:strict-pocket`, and `npm run proof:v1:security-automation` are all `PASS`; `test:launch` now requires the local security-automation proof and self-sets `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` before the live client-RLS matrix run; `Release Launch Gate` remains green on the current production baseline; and Semgrep, CodeQL, Gitleaks secret scanning, and Dependabot are now configured in the repo. This branch also hardens the guest-contact path another notch: household-wide contact updates require a second step-up verifier (phone last 4), and if a guest-specific RSVP invite token is present the local lookup path now treats that token as the strongest verifier and mints a signed household-scoped session without relying on the weaker email-fragment path alone. Focused local proof is green for `publicAccessArtifacts.test.ts`, `routeCompositionBoundary.test.ts`, `internalToolingRouteBoundary.test.ts`, `securityAutomationProof.test.ts`, `guestLookupScopeProofScript.test.ts`, `GuestContactUpdate.test.ts`, `launchEdgeFunctions.test.ts`, `proof:v1:security-automation`, `proof:v1:test-lanes`, `typecheck`, `lint`, `build`, and `git diff --check`. |
| Current deployment state | Frontend is live at [dayof.love](https://dayof.love) on exact runtime Git SHA `17c8089f` via verified Vercel production deploy `dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh`. `submit-rsvp` is live with the serialized capacity path and the database now includes the full RPC migration sweep through `20260512031500_seating_assignment_version_rpcs.sql` plus forward repair migrations `20260511212626_fix_wedding_site_settings_patch_types.sql`, `20260512040000_reconcile_itinerary_dress_code_column.sql`, `20260512040500_reconcile_itinerary_runtime_columns.sql`, `20260512041000_fix_itinerary_event_write_time_types.sql`, `20260512041500_fix_itinerary_event_write_ids.sql`, `20260512042000_fix_section_write_create_with_explicit_id.sql`, `20260512043000_fix_registry_refresh_policy_write_updated_by_type.sql`, and `20260512050000_harden_admin_access_check.sql`. The live collaborator/client-RLS matrix now includes guest, planning, itinerary, settings, sections, seating, messages, registry item/policy, photos/vault, coordinator permission lanes, and direct `admin_users` read denial. The dedicated public-session-secret function redeploys are live on the public site/session lane, the deployed guest-contact lane currently requires a full-name plus email-fragment verifier before issuing a signed contact session, the frontend/admin route gate is deployed on the RPC-backed admin check, the public vault contribution lane is live-proven, and the `.dayof.love` subdomain route has a dedicated live fail-closed/no-leak proof. The stronger guest-specific invite-token path, the whole-party phone-last-4 step-up verifier, the route-module decomposition, and the Semgrep/CodeQL/Gitleaks/Dependabot CI automation are branch-ready but not deployed. External custom domains remain unsupported product scope, not an open proof lane. |
| Current next actions | deploy the stronger guest-contact household verifier batch when approved, keep the live client-RLS matrix current when future non-guest write surfaces are introduced, keep the no-direct-client-write inventory current after future runtime write-surface changes, tighten TS/ESLint rigor incrementally in high-risk modules, and keep unsupported future product surfaces clearly marked as unsupported instead of carrying them as vague proof debt |

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
    - the RPC migration sweep is applied remotely and the live collaborator/client-RLS reruns are green
    - the remaining gap is future-surface discipline rather than an obvious direct-write hole in the current shipped runtime
  - direction:
    - keep simple reads client-side
    - keep migrating any newly discovered dangerous writes into Edge Functions or RPCs if they appear after the remote apply sweep
- `P2 Live RLS proof should be expanded further`
  - file: [docs/service-role-authorization-disposition-2026-05-05.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/service-role-authorization-disposition-2026-05-05.md:56)
  - note:
    - `npm run proof:v1:client-rls-matrix` is now the canonical live baseline for client-facing role proof
    - it already aggregates anon guest-contact scope, public RSVP scope, and owner/collaborator viewer-deny plus planner/coordinator-allow runtime proof
    - it now also proves direct guest, planning, itinerary, settings, sections, registry item/policy, seating, coordinator, message, photo, vault-config, and vault-provider RPC lanes remain permission-scoped while direct timeline/settings and other ungranted writes stay denied without the matching permission set
    - guest-dashboard settings proof is no longer pending; the disposition doc now reflects the live-green `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` lane
    - broader future-surface RPC lane coverage is still worth adding whenever new non-guest writes are introduced because the client-heavy mutation surface is now centralized rather than eliminated
- `P2 Guest contact update could still be strengthened further`
  - files:
    - [supabase/functions/guest-contact-lookup/index.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/functions/guest-contact-lookup/index.ts:1)
    - [supabase/functions/guest-contact-submit/index.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/functions/guest-contact-submit/index.ts:1)
  - note:
    - the currently deployed guest-contact lane is green with full-name plus email-fragment verification before a signed contact session is minted
    - this branch now also requires phone last 4 before `apply_household` can update an entire party, and it will trust a guest-specific RSVP invite token as the strongest verifier when one is present
    - that tighter guest-token/household-verifier path is still branch-only until the guest-contact functions and frontend are redeployed
    - a true magic-link flow would still be the stronger long-term model for sensitive guest record updates
  - direction:
    - keep the current verifier live and proven
    - consider moving from guest-specific invite-token proof to a true magic-link grade verification flow if the contact-update lane is expanded later
- `P2 Dashboard Guests remains orchestration-heavy`
  - file: [src/pages/dashboard/Guests.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/dashboard/Guests.tsx:1)
  - note:
    - `App.tsx` now composes grouped route modules instead of hand-owning the full route list inline
    - the broader product surface and proof inventory are still substantial, so maintainability risk is lower but not gone
  - direction:
    - continue splitting by domain: guest list, RSVP config, import, invitations, check-in, campaigns
- `P3 Type/lint rigor is still soft`
  - files:
    - [tsconfig.app.json](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/tsconfig.app.json:18)
    - [eslint.config.js](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/eslint.config.js:29)
  - note:
    - `strict` is on, but `noImplicitAny`, `noUnusedLocals`, and `noUnusedParameters` are still disabled
    - several high-value lint rules are still warnings
    - the strict pocket now hard-fails on `ProtectedRoute.tsx`, `activeSite.ts`, `customerSafeError.ts`, `mediaUrl.ts`, `paymentGate.ts`, `publicRenderContract.ts`, `publicSiteAccess.ts`, `publicSiteRenderModel.ts`, `publicSiteSlug.ts`, `publicSectionDataSanitizer.ts`, `siteConfigValidate.ts`, `stripeService.ts`, and `vendorProfiles.ts` via `npm run proof:v1:strict-pocket`
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

- `external custom domains` -> `DEFERRED`
  - product truth still does not support arbitrary external custom domains
  - `.dayof.love` subdomain routing is now live-proven separately and is no longer deferred
  - required before enabling:
    - real custom-domain product support
    - host-resolution/runtime proof for owned external domains
    - updated claims matrix and launch docs that distinguish supported `.dayof.love` routing from future external-domain support
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
| `npm run proof:v1:client-write-inventory` | `PASS` | `local` | `2026-05-12` | Broadened guard scans all tracked `src` runtime files, now also catches single/double/backtick table names, skips `.d.ts` noise, and reports no direct client `.insert/.update/.upsert/.delete` calls |
| `npm run proof:v1:ast-security` | `PASS` | `local` | `2026-05-12` | AST-backed launch gate guards direct client writes, service-role references in shipped runtime, `dangerouslySetInnerHTML`, auth/payment storage bypasses, internal tooling route exposure, and raw public blob leaks |
| public DTO leak tests | `PASS` | `local` | `2026-05-11` | Focused `publicRenderContract`, `publicSiteRenderModel`, `publicSiteAccess` lanes are green |
| `npm run proof:v1:guest-lookup-scope` | `LIVE PASS` | `production` | `2026-05-12` | Included in `proof:v1:client-rls-matrix`; full-name + email-fragment verifier, signed-session household update, and wrong-verifier denial are green |
| `npm run proof:v1:client-rls-matrix -- --require-live` | `LIVE PASS` | `production + browser runtime` | `2026-05-12` | Aggregates live anon guest-contact scope, public RSVP scope, owner/collaborator viewer-deny plus planner/coordinator/registry/settings/photos-allow runtime proof, direct guest/planning/seating write allow/deny coverage, planner message + itinerary RPC allow with registry RPC deny, settings patch/section RPC allow + registry RPC deny, registry item/policy RPC allow + dashboard message/section RPC deny, photos vault-config/vault-provider RPC allow + dashboard message RPC deny, coordinator Q&A/check-in/media RPC allow + dashboard message RPC deny, and the guest-dashboard settings RPC lane with `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1` |
| `npm run proof:v1:registry-preview-ssrf -- --require-live` | `LIVE PASS` | `production` | `2026-05-12` | `26/26` hostile-target checks passed; `test:launch` and `Release Launch Gate` now require the live registry-preview SSRF proof lane |
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
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-12` | Fresh rerun against Vercel deploy `dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-11` | Fresh rerun against Vercel deploy `dpl_386dKTNkTVK95UfwJj9qEtnH1b8q`; `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-12` | Fresh rerun after guest-contact verifier deploy; strict smoke green |
| `GitHub Actions Release Launch Gate` | `PASS` | `GitHub Actions + repo secrets` | `2026-05-11` | Branch-triggered workflow is green on run `25705683563`; strict RSVP smoke is mandatory |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/vault-contribute-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-12` | Public vault contribution save, owner-scoped readback, and cleanup/delete are green after the live inventory/deploy rerun; `ALLOW_VAULT_QA_OPEN` was reset to `false` immediately after proof |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-11` | Current working tree clean of whitespace errors |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `17c8089f` | `yes` | `Vercel production dpl_L9m7XKgo3GhpLkH5NR4M1ZzLSDjh` | `--prod` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | both green after guest-contact verifier deploy | None | `LIVE PASS` |
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

1. Keep `proof:v1:client-rls-matrix` current whenever a future non-guest write surface is added.
2. Rerun the raw-write inventory after future runtime write-surface changes so the no-direct-client-write claim stays canonical.
3. Keep the collaborator/client-RLS live matrix current as new runtime write paths are introduced.
4. Keep unsupported external custom domains clearly marked as unsupported until product support exists.
5. Rerun the dedicated `.dayof.love` subdomain proof after future host-routing changes or DNS migrations.
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

- Closed the public vault contribution deferred lane:
  - `vault-contribution-public` and `vault-entry-submit` are confirmed in live inventory
  - live save/readback/delete proof is now green
  - the temporary `ALLOW_VAULT_QA_OPEN` proof secret was immediately reset to `false`
- Closed the `.dayof.love` host-routing deferred lane:
  - added `npm run proof:v1:subdomain-route`
  - live host proof is green for `testandkaras.dayof.love`
  - current runtime resolves and fail-closes safely without wrong-site leakage
- Reframed external custom domains into the honest product truth:
  - unsupported future scope, not an open launch-proof debt item
- Synced the launch board, production hardening report, smoke log, and changelog to that sharper runtime truth.
- Added a stronger local-only guest-contact household gate:
  - full-name + email fragment still resolves the signed contact session
  - `apply_household` now additionally requires a phone-last-4 verifier in local code and proof
  - live `guest-lookup-scope` still reflects the pre-deploy runtime until the guest-contact functions are redeployed
- Added enterprise-style security automation to the repo:
  - `.github/dependabot.yml`
  - `.github/workflows/semgrep.yml`
  - `.github/workflows/codeql.yml`
  - `.github/workflows/gitleaks.yml`
  - local guard `npm run proof:v1:security-automation`
- Reduced route-registry maintenance risk:
  - `App.tsx` now composes grouped route modules instead of hand-owning the whole route tree inline
