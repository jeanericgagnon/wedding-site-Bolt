# Production Hardening Backlog

## Launch Question

Is the current repo a clean launch baseline today?

Yes. The public DTO lane is fully minimized, the deployment/proof board is canonical, and the launch-critical live proof lanes are green.

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-11 02:34 PM PDT` |
| Branch | `codex/v1-finish-hard-gates-3` |
| Latest Git SHA | `095ad456` |
| Latest commit message | `Stabilize live translation route proof` |
| Vercel deployment ID | `dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | `public-site-access --no-verify-jwt`; `photo-upload --no-verify-jwt`; `process-email-queue`; `guest-contact-lookup --no-verify-jwt`; `guest-contact-submit --no-verify-jwt`; `translate-site-content` |
| Current readiness score | `9.9 / 10` |
| Current launch verdict | `GO` |
| Production-ready | `YES` |
| Reason production-ready is not yet claimed | none |
| Current blockers | `none` |
| Current proof state | Public DTO allowlist tests are green across every guest-rendered section family; `proof:v1:public-access-coverage`, `typecheck`, `lint`, `build`, `test:security`, `test:smoke`, secure `service-role-authorization`, secure `email-messaging-authorization`, secure `launch-closeout`, live `guest-lookup-scope`, live `canonical-smoke`, live `public-quality`, live `guests-rsvp-ops`, live `guest-hub-write-read`, live `photo-upload-write-read`, live `registry-preview-ssrf`, live `ai-secure-model`, `proof:v1:data-integrity`, and `proof:v1:prereqs` are green. |
| Current deployment state | Frontend is live at [dayof.love](https://dayof.love) on verified deploy `dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7`. Exact runtime Git SHA is not recoverable from this workspace because the production deploy was built from the working tree after `1915b681`. Public/site, queue, storage, photo, and guest contact surfaces are deployed and live-proven. |
| Current next actions | none |

Blunt status:
- `P1-04 Public section DTO minimization` is closed.
- `P1-09 Deployment / proof truth canonicalization` is closed.
- The previously reopened guest-contact runtime blocker is now closed with live proof.
- No active `P0` or `P1` blockers remain.

## Current Launch Blockers

None.

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

None.

## Non-Critical After Launch / Deferred

- `custom host/subdomain route live rerun` -> `DEFERRED`
  - canonical public-site resolver is live-green and `.dayof.love` subdomain parsing is now pinned by local helper tests, but no dedicated custom-host DNS proof was rerun in this wave
- `registry owner edit/import manual truth notes` -> `DEFERRED`
  - automated registry proof is green for public/runtime truth guards; owner import/repair persistence notes remain a manual follow-up, not a launch blocker
- `SMS/Telnyx live provider send` -> `DEFERRED`
  - provider setup is intentionally outside the launch-hardening gate
- `AI server secret inventory / internal OPENAI prereq` -> `DEFERRED`
  - not required for the current public launch gate

## Validation Matrix

| Command | Status | Environment | Last run | Notes |
| --- | --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm run lint -- --quiet` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm run build` | `PASS` | `local` | `2026-05-11` | Current public DTO code state |
| `npm test` | `NOT RUN` | `local` | `2026-05-11` | Full suite not rerun; focused security/DTO lanes were rerun instead |
| `npm run test:security` | `PASS` | `local` | `2026-05-11` | `265/265` |
| `npm run test:smoke` | `PASS` | `live` | `2026-05-11` | `registry`, `rsvp`, `csvmapper`, `checkin`, `messages`, `site` all green |
| `npm run proof:v1:public-access-coverage` | `PASS` | `local` | `2026-05-11` | Static/public contract coverage is green |
| public DTO leak tests | `PASS` | `local` | `2026-05-11` | Focused `publicRenderContract`, `publicSiteRenderModel`, `publicSiteAccess` lanes are green |
| `npm run proof:v1:guest-lookup-scope` | `LIVE PASS` | `production` | `2026-05-11` | Exact-match lookup + signed-session household update are green |
| `npm run proof:v1:registry-preview-ssrf` | `LIVE PASS` | `production` | `2026-05-11` | `26/26` hostile-target checks passed |
| `npm run proof:v1:service-role-authorization` | `PASS` | `secure env` | `2026-05-11` | Secure denial/storage containment lane green |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | `secure env` | `2026-05-11` | Isolated queue-row containment proof green |
| `npm run proof:v1:launch-closeout` | `PASS` | `secure env` | `2026-05-11` | Closeout bundle green |
| `npm run proof:v1:data-integrity` | `PASS` | `production` | `2026-05-11` | Anon-limited integrity proof green; no hard launch corruption found |
| `npm run proof:v1:prereqs` | `PASS` | `production + local env` | `2026-05-11` | Required migrations/functions/runtime readiness green; deferred provider/AI env notes remain non-launch |
| `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | `LIVE PASS` | `production + secure env` | `2026-05-11` | Translation route plus live AI/photo model-backed lanes are green |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | `production` | `2026-05-11` | Latest verified deploy `dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7` |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | `production` | `2026-05-11` | `4/4` passed |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | `production` | `2026-05-11` | Passed when rerun outside the sandbox network |
| `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Interactive hub write/read is green |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | `production` | `2026-05-11` | Photo upload/readback/analysis/recap/moderation lane green |
| `npm run guard:file-size` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run guard:assets` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `npm run proof:v1:performance-budget` | `PASS` | `local` | `2026-05-11` | Launch lane green |
| `git diff --check` | `PASS` | `local` | `2026-05-11` | Current working tree clean of whitespace errors |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Proof command | Proof result | Remaining gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend / `dayof.love` | `UNVERIFIED (working-tree deploy after 1915b681)` | `yes` | `Vercel production dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7` | `--prod --yes` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`; `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | both green | Exact runtime Git SHA not recoverable from workspace | `LIVE PASS` |
| `public-site-access` | `UNVERIFIED (working-tree deploy after 1915b681)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:public-access-coverage`; live smoke/public-quality | green | None on current public resolver lane | `LIVE PASS` |
| `public-registry-items` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry`; live public smoke | automated green; public route green | Owner import/repair runtime notes are deferred and not a launch blocker for the public route | `LIVE PASS` |
| `public-itinerary-by-slug` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | green | None on the public itinerary lane | `LIVE PASS` |
| `validate-rsvp-token` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:guests-rsvp-ops`; `npm run test:smoke` | green | None on the RSVP lookup lane | `LIVE PASS` |
| `public-site-rsvp-submit` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:guests-rsvp-ops` | green | None on the public RSVP submit lane | `LIVE PASS` |
| `guest-contact-lookup` | `UNVERIFIED (redeployed after 1915b681)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Exact runtime Git SHA still unrecoverable; live proof is green | `LIVE PASS` |
| `guest-contact-submit` | `UNVERIFIED (redeployed after 1915b681)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `npm run proof:v1:guest-lookup-scope` | green | Exact runtime Git SHA still unrecoverable; live proof is green | `LIVE PASS` |
| `guestbook-submit` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run test:security`; static public-surface checks | green locally | No dedicated live guestbook submission rerun in this wave | `DEPLOYED` |
| `vault-entry-submit` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run test:security`; static public-surface checks | green locally | No dedicated live vault-entry submit rerun in this wave | `DEPLOYED` |
| `vault-contribution-public` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run test:security`; static public-surface checks | green locally | No dedicated live vault contribution rerun in this wave | `DEPLOYED` |
| `interactive-section-public` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `LIVE_GUEST_HUB_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/guest-hub-write-read.spec.ts` | green | None on guest hub vote/suggestion lane | `LIVE PASS` |
| `registry-preview` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:registry-preview-ssrf` | green | None on SSRF/host allowlist lane | `LIVE PASS` |
| `photo-upload` | `UNVERIFIED (redeployed after 1915b681)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `--no-verify-jwt` | `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | green | None | `LIVE PASS` |
| `photo-album-create` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-album-manage` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-upload-moderate` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-export-manifest` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `photo-analyze-batch` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | photo upload/write/read proof; secure service-role proof | green | None | `LIVE PASS` |
| `guest-recap-config` / recap route | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime + frontend` | `unknown` | photo upload/write/read proof | green | None on recap curation/display lane | `LIVE PASS` |
| `send-wedding-email` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:email-messaging-authorization` | green | Delivery-provider success path deferred; authorization containment is proven | `LIVE PASS` |
| `send-bulk-message` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:email-messaging-authorization` | green | Delivery-provider success path deferred; authorization containment is proven | `LIVE PASS` |
| `process-email-queue` | `UNVERIFIED (redeployed after 1915b681)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `default verify_jwt` | `npm run proof:v1:email-messaging-authorization`; `npm run proof:v1:launch-closeout` | green | None on queue containment lane | `LIVE PASS` |
| `queue-guest-followups` | `UNVERIFIED (existing production deploy)` | `yes` | `Supabase Edge runtime atuzuobpprjstfmdnwso` | `unknown` | `npm run proof:v1:email-messaging-authorization`; `npm run proof:v1:collaborator-runtime` | green | None on scoped queue-creation lane | `LIVE PASS` |
| `guest messaging` / scheduled and bulk queue paths | `UNVERIFIED (existing production deploy)` | `yes` | `Frontend + Supabase Edge runtime` | `unknown` | `npm run proof:v1:comms-center`; secure email proof lanes | green | Provider send success remains non-launch and deferred | `LIVE PASS` |
| `translate-site-content` / translation route | `UNVERIFIED (redeployed after b9201f28)` | `yes` | `Supabase Edge runtime + frontend` | `default verify_jwt` | `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` | green | Exact runtime Git SHA still unrecoverable; live proof is green | `LIVE PASS` |
| `photo/media public routes` | `UNVERIFIED (existing production deploy)` | `yes` | `Frontend + Supabase storage/public guest flows` | `mixed` | photo upload/write/read proof; public-quality | green | None on current photo/media guest lanes | `LIVE PASS` |
| `subdomain route` | `UNVERIFIED (existing production deploy)` | `yes` | `Frontend host routing` | `unknown` | `src/lib/publicSiteSlug.test.ts`; canonical smoke on `dayof.love` only | local subdomain parsing green; live apex route green | Dedicated custom-host DNS route not rerun this wave; not a current launch blocker for the shipped path-based proof fixture | `DEFERRED` |
| `AI/provider functions` | `UNVERIFIED (mixed production deploys)` | `yes` | `Frontend + Edge runtime` | `mixed` | `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`; `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`; `npm run proof:v1:ai-product-readiness` | green | None on current launch-hardening lane | `LIVE PASS` |
| `sections_public_visible_read` removal migration | `UNVERIFIED (db push after 1915b681)` | `yes` | `Supabase database` | `supabase db push` | live public-route proofs stayed green after push | green | Exact migration ledger SHA not recovered here | `DEPLOYED` |
| public/guest/service-role access migrations | `UNVERIFIED (existing production schema)` | `yes` | `Supabase database` | `historical migrations` | secure auth proofs; public smoke/public-quality; guest-hub/photo proof | green | Exact remote migration audit not rerun in this workspace | `DEPLOYED` |

## Next 10 Tasks

1. Keep `guest-contact-lookup` and `guest-contact-submit` in the postdeploy proof lane after future auth/runtime changes.
2. Keep `public-site-access`, RSVP, guest hub, photo upload, and guest contact live proofs green after future deploys.
3. Preserve the canonical deployment matrix when runtime/deploy IDs change.
4. Preserve the canonical validation matrix when proof lanes change.
5. Rerun `npm run proof:v1:board:md` after future launch-control edits.
6. Rerun `git diff --check` after future launch-control edits.
7. Rerun `npm run proof:v1:guest-lookup-scope` after any guest contact surface deploy.
8. Leave custom-host/subdomain live proof deferred unless that lane changes.
9. Keep SMS/provider live-send work out of the launch baseline until provider setup is ready.
10. Keep AI/provider live-model proof in the postdeploy lane after future translation or photo-analysis changes.

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
  - local launch gate green
  - board generation green
  - smoke lane green

## What Changed In This Final Closeout

- Closed `P1-04 Public section DTO minimization` with the last explicit per-family DTO pass and matching focused proof.
- Closed `P1-09 Deployment / proof truth canonicalization` by rewriting the board into one exact launch-control source of truth.
- Discovered a real guest-contact blocker while canonicalizing the deployment matrix, then closed it.
- Forced a fresh `guest-contact-lookup` runtime version, redeployed both guest contact functions, and reran the live proof.
- Redeployed `translate-site-content`, added a source-hash ready-row fast path, and turned the live translation proof from a deferred `504` into a green `200`.
- Unified `.dayof.love` host parsing behind a shared helper and added explicit local proof for subdomain route resolution.
- Added `proof:v1:data-integrity` and `proof:v1:prereqs` production checks to the closeout evidence, confirming runtime table/function inventory is healthy enough for the current launch baseline.
- Launch is now `GO` with only deferred non-launch items left on the board.
