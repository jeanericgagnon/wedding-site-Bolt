# Production Hardening Backlog

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-11 12:48 PM PDT` |
| Branch | local and pushed launch branch: `codex/v1-finish-hard-gates-3` |
| Latest Git SHA | `38c7be6d` |
| Latest commit message | `Tighten public DTO contracts and proof lanes` |
| Vercel deployment ID | `dpl_ECgiber64N8nmbZAngWgDZZ3dYVZ` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | freshly redeployed: `public-site-access`, `process-email-queue`, `photo-upload`; launch-relevant but not freshly redeployed this wave: `public-itinerary-by-slug`, `interactive-section-public`, `vault-contribution-public`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`, `registry-preview` |
| Current readiness score | `9.95 / 10` |
| Launch verdict | `HOLD` |
| Production-ready | `NO` |
| Reason production-ready is not yet claimed | Public section DTO minimization is not yet fully proven through the last untouched guest section families, and deployment truth is still not canonical down to every launch surface and exact deployed SHA. |
| Current top blockers | `P1-04 Public section DTO minimization`; `P1-09 Deployment/proof truth canonicalization` |
| Current proof state | Focused public DTO tests, `proof:v1:public-access-coverage`, `proof:v1:registry-preview-ssrf`, `typecheck`, `lint`, and `build` are green on the current public-contract code state; the latest focused public DTO lane also proves accommodations hotel DTOs, directions transport DTOs, music playlist DTOs, and video card DTOs are explicit on both server and client and strip nested innocent-looking sensitive fields; secure `proof:v1:service-role-authorization` passes live unauthenticated denial proof; `proof:v1:collaborator-runtime` passes owner invite creation, collaborator accept flow, viewer deny, planner queue allow, and coordinator photo allow runtime proof; `proof:v1:email-messaging-authorization` now passes its secure queue-processing proof by inserting an isolated invalid-recipient row, processing only that row, and verifying the queue outcome without touching unrelated live rows; `tests/e2e/photo-upload-write-read.spec.ts` now passes live against production after redeploying `photo-upload` correctly for public guest uploads, proving owner album creation, guest hosted upload, owner readback, AI analysis, export-manifest signed links, recap curation, and moderation cleanup; and `proof:v1:launch-closeout` now passes cleanly in the secure env. |
| Current deployment state | Frontend is live on [dayof.love](https://dayof.love) with last locally evidenced verified deploy `dpl_ECgiber64N8nmbZAngWgDZZ3dYVZ`; `public-site-access` and `photo-upload` are freshly deployed with `--no-verify-jwt`, `process-email-queue` is freshly redeployed, the `sections_public_visible_read` removal migration was pushed, `registry-preview` hostile-target proof is freshly green against production, and the remaining gap is exact per-surface SHA/runtime truth for every launch-relevant function. |

Blunt status:
- The app is no longer in obvious public-blob trouble.
- It is also not yet a 10/10 launch-safe system.
- The main remaining risk is not dashboard extraction. It is DTO precision plus exact deployment truth.

## 10/10 Definition

10/10 means:
- explicit allowlisted public DTOs
- no raw public blob exposure
- no draft or unpublished data leakage
- no broad fallback from current or draft data
- service-role containment proven at runtime
- email and queue containment proven at runtime
- public access routes fail closed
- all deploy state is canonical
- all validation state is canonical
- no active P0 or P1 blockers remain
- only explicitly deferred non-launch items remain

## Active Critical Blockers

### P1-01 Public DTO allowlist conversion

- Priority: `P1`
- Status: `PARTIAL`
- Why it matters: current render-model shaping still carries a small generic deep sanitizer for URLs and images, so we need to keep shrinking the number of places where broad object shapes reach that layer instead of exact public DTOs.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `src/lib/publicSiteAccess.ts`, `supabase/functions/public-site-access/index.ts`, `src/render/publicSectionDataSanitizer.ts`
- Current evidence: `src/lib/publicRenderContract.ts` now defines explicit section-settings allowlists, section-scoped binding allowlists, style override allowlists, and a minimal public contact-person shape shared by server and client; hero, story, contact, travel, gallery, countdown, RSVP, wedding-party, and dress-code payloads now explicitly normalize legacy builder fields into their resolved public renderer contracts instead of relying on stale builder keys; travel, gallery, RSVP, wedding-party, and dress-code variants now route through explicit nested item DTOs instead of broad array passthroughs; `src/lib/publicRenderContract.test.ts` now proves every allowlisted settings key is tied either to a real builder-manifest field or a documented alias exception; wedding, venue, schedule, registry, FAQ, media, and theme DTO shaping is explicit in `publicSiteRenderModel.ts`.
- Missing proof: a final per-section-family review to confirm no public renderer still depends on broader settings than the new contract, especially for families beyond hero, story, contact, travel, gallery, countdown, RSVP, wedding-party, and dress-code.
- Acceptance criteria:
  - `PublicPageDTO` has exact allowed fields.
  - `PublicSectionDTO` has exact allowed fields.
  - `PublicWeddingDTO` has exact allowed fields.
  - `PublicVenueDTO`, `PublicScheduleDTO`, `PublicRegistryDTO`, `PublicFaqDTO`, `PublicMediaDTO`, and `PublicThemeDTO` have exact allowed fields.
  - No generic public-output blacklist pass remains unless justified and tested locally.
- Exact next action: audit remaining section families against the explicit contract and remove any now-unneeded fallback keys.

### P1-02 Published wedding-data precedence

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: published public render can still consider `row.wedding_data` before published wedding snapshots.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `src/lib/publicSiteRenderModel.test.ts`, `supabase/functions/public-site-access/index.ts`
- Current evidence: `getPublicWeddingRenderData(...)` now prefers `published_json.weddingDataSnapshot`, then `published_json.weddingData`, and otherwise falls back to canonical row identity only.
- Missing proof: none locally; secure live rerun still pending as part of the broader proof lane.
- Acceptance criteria:
  - Published sites prefer `published_json.weddingDataSnapshot`.
  - Then `published_json.weddingData`.
  - Then only `couple_name_1`, `couple_name_2`, `wedding_date`, `venue_name`, `wedding_location`.
  - Full `row.wedding_data` is not trusted first for published public render.
- Exact next action: keep covered by current focused tests and broader live reruns.

### P1-03 Layout config fallback removal or hard gate

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: raw legacy layout blobs were a launch blocker while they still had any path into the public render model.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `supabase/functions/public-site-access/index.ts`, `src/lib/publicSiteRenderModel.test.ts`
- Current evidence: a live production inventory query against `wedding_sites` found `2` published rows and `0` rows with `published_json.legacyLayoutPublished === true`; `src/lib/publicSiteRenderModel.ts` no longer falls back to `layout_config` at all; focused render-model tests and `proof:v1:public-access-coverage` stayed green after the removal; `publicLegacyLayoutFlagAudit.test.ts` now proves the repo no longer retains the `legacyLayoutPublished` path outside the audit guard itself.
- Missing proof: none for the fallback-removal lane.
- Acceptance criteria:
  - remove `layout_config` fallback entirely, or
  - allow it only for explicitly legacy-published sites, or
  - transform it through strict section allowlists with no broad passthrough.
- Exact next action: keep the audit test and static proof in the regular launch lane so the fallback does not reappear silently.

### P1-04 Public section DTO minimization

- Priority: `P1`
- Status: `PARTIAL`
- Why it matters: section DTOs still carry broad `settings`, `bindings`, `styleOverrides`, `locked`, and `meta` data.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `src/render/publicSectionDataSanitizer.ts`, `src/types/builder/section.ts`, `src/lib/publicSiteRenderModel.test.ts`
- Current evidence: `locked` and public meta timestamps are removed from the output contract; bindings are now both reduced to minimal public arrays and scoped by section family (`venue`, `schedule`, `registry`, `faq`) instead of being passed generically; style overrides are reduced to explicit public style keys; settings now flow through explicit section-type allowlists shared by server and client; footer CTA aliases are normalized into the actual guest-renderer fields instead of shipping stale `ctaLabel` / `ctaHref` keys; hero payloads now normalize `title` / `subtitle` into the resolved hero renderer fields `eyebrow` / `subheadline` and preserve CTA/action fields without the sanitizer blanking them; story payloads now normalize `title` / `storyText` / `photo` into the resolved story renderer fields `headline` / `body` / `image` while dropping the stale builder keys; `contact` form payloads now normalize `title` / `subtitle` into the actual resolved-renderer fields `headline` / `subheadline`, preserve only an explicit minimal contact list, and drop interactive-only keys for non-interactive variants; `travel` payloads now normalize legacy `title` into `headline`, remove stale travel toggles, and route nested hotels, pins, local-guide groups, activities, and tier groups through explicit public item DTOs; nested interactive contact payloads (`poll`, `quiz`, placeholder/contact side data`) and nested travel payloads are now explicitly proven absent from the public DTO on both server and client contract tests; and obviously unused guest-facing toggles (`showIcons`, `showParking`, `expandAll`) were removed from the public contract with focused regression coverage.
- Missing proof: per-section-family review for the last untouched guest-rendered families beyond the focused leak tests now in place, especially menu and any remaining venue/schedule/registry/FAQ variants that still lean on builder-shaped defaults.
- Acceptance criteria:
  - `bindings` removed unless strictly required; if required, replace with minimal `PublicBindingDTO`.
  - `locked` removed unless publicly needed.
  - meta timestamps removed unless publicly needed.
  - `styleOverrides` reduced to explicit public style keys.
  - per-section allowlists exist for hero, story, schedule, venue, registry, gallery, FAQ, travel, countdown, RSVP, contact, dress-code, wedding-party, and footer.
- Exact next action: continue the per-family review with menu next, then trim any leftover keys that are not clearly used by the public renderer.

### P1-05 Translation public DTO proof

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: translated blobs can leak the same sensitive data as primary blobs if they bypass strict DTO shaping.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `supabase/functions/public-site-access/index.ts`, `src/lib/publicSiteRenderModel.test.ts`
- Current evidence: translated wedding data now flows into published-safe snapshot precedence, and focused tests inject translated sensitive fields that are proven absent from public output.
- Missing proof: none locally; secure/live proof still broader than the translation-specific lane.
- Acceptance criteria:
  - translated site, published, wedding, and layout payloads use the same allowlist DTO path
  - translated sensitive fields are injected in tests and proven absent from public output
- Exact next action: keep included in focused public DTO test coverage.

### P1-06 Service-role queue/storage runtime proof

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: service-role functions bypass RLS; any scope bug can cause cross-site mutation or data leakage.
- Files/functions involved: `scripts/v1-proof-service-role-authorization.mjs`, service-role Edge Functions, queue/storage flows
- Current evidence: secure-env live denial proof passes for `photo-album-create`, `photo-album-manage`, `photo-upload-moderate`, `photo-export-manifest`, and `photo-analyze-batch`; `proof:v1:collaborator-runtime` passes owner invite creation, collaborator accept flow, viewer deny, planner queue allow, and coordinator photo allow runtime proof; and `tests/e2e/photo-upload-write-read.spec.ts` now passes live against production after the `photo-upload --no-verify-jwt` redeploy, proving owner album creation, guest hosted upload, owner readback, AI analysis, export-manifest signed-link readback, recap curation, and moderation cleanup.
- Missing proof: none for the queue/storage launch gate; exact per-surface deployment/SHA truth still belongs to `P1-09`.
- Acceptance criteria:
  - unauthenticated denial passes
  - viewer mutation denial passes
  - planner/coordinator scoped allow passes
  - owner allow passes
  - cross-site mutation denial passes
  - queue row isolation passes
  - storage/media path isolation passes
  - functions do not trust client-supplied `siteId`, `guestId`, or `messageId` blindly
  - runtime proof is recorded
- Exact next action: keep the denial lane, collaborator runtime lane, and photo upload/readback lane in the secure proof rotation so the service-role/storage boundary stays proven after future deploys.

### P1-07 Secure email queue-processing proof

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: queue scoping bugs can leak guest data or send unauthorized email.
- Files/functions involved: `scripts/v1-proof-email-messaging-authorization.mjs`, `process-email-queue`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`
- Current evidence: live unauthenticated denial checks pass for `process-email-queue`, `queue-guest-followups`, `send-bulk-message`, and `send-wedding-email`; the proof harness now signs in a proof owner to obtain a real invoke bearer, inserts an isolated invalid-recipient queue row, calls `process-email-queue` with explicit `queueIds`, verifies `processed: 1`, `delivered: 0`, `failed: 1`, and confirms the targeted row is marked `failed` with `Invalid recipient email` without mutating unrelated queue rows.
- Missing proof: none for the queue-processing launch gate; broader per-surface deployment truth still belongs to `P1-09`.
- Acceptance criteria:
  - queue processor only sends scoped site emails
  - recipients belong to the correct wedding site
  - collaborators cannot queue or send outside role
  - bulk or scheduled sends cannot cross site boundaries
  - queued payloads are validated before send
  - HTML and URLs are escaped or sanitized
  - runtime proof is recorded
- Exact next action: keep the isolated queue-row proof in the secure proof lane and rerun it after any `process-email-queue`, `send-bulk-message`, `send-wedding-email`, or `queue-guest-followups` deployment.

### P1-08 Registry preview SSRF/image allowlist precision

- Priority: `P1`
- Status: `RESOLVED`
- Why it matters: substring URL checks are not enough for hostile image or proxy targets.
- Files/functions involved: `supabase/functions/registry-preview/urlNormalizer.ts`, `supabase/functions/registry-preview/index.ts`, `src/lib/registryPreviewUrlNormalizer.test.ts`
- Current evidence: registry preview uses `new URL(...)`, blocks credentialed and reserved hosts, revalidates nested `images.weserv.nl` proxy targets, revalidates manual redirect hops in `fetchPreviewHtml(...)`, blocks private/metadata/local/test/internal hosts, and `npm run proof:v1:registry-preview-ssrf` passed against production on `2026-05-11`.
- Missing proof: none for the hostile-target lane.
- Acceptance criteria:
  - parse URLs with `new URL`
  - validate exact hostname or explicit subdomain policy
  - validate nested proxy target
  - revalidate redirects
  - block private, metadata, local, test, and internal hosts
  - run hostile-target SSRF proof
- Exact next action: keep the hostile-target matrix in the regular launch proof lane and rerun if registry preview fetch policy changes again.

### P1-09 Deployment/proof truth canonicalization

- Priority: `P1`
- Status: `OPEN`
- Why it matters: 10/10 launch control requires one exact source of truth for Git, Vercel, Supabase, and live proof.
- Files/functions involved: `BACKLOG.md`, `docs/PRODUCTION_HARDENING_REPORT.md`, `scripts/v1-proof-board.mjs`
- Current evidence: branch/deploy truth is much better, but several surfaces are still recorded as deployed without exact per-surface SHA/runtime validation.
- Missing proof: one canonical deployment table tying each surface to exact deploy status and proof state.
- Acceptance criteria:
  - exact Git SHA
  - exact Vercel deployment
  - exact Supabase functions deployed
  - deploy flags including `--no-verify-jwt`
  - local-only, pushed-only, deployed, live-validated, and unverified states
  - no ambiguous “runtime includes follow-up” language
- Exact next action: finish the deployment matrix below with exact per-surface state as secure proof closes.

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
| Client-side public payload assertion exists | `PASS` |
| Server-side DTO allowlist tests pass | `PASS` |
| Live public quality passes after deploy | `LIVE PASS` |

## Required Public Leak Tests

### Sources to inject

- `site_json`
- `published_json`
- `wedding_data`
- `layout_config`
- `translated_site_json`
- `translated_published_json`
- `translated_wedding_data`
- `translated_layout_config`
- `section.settings`
- `bindings`
- `styleOverrides`
- `media`
- `registry`
- `FAQ`
- `travel`
- `schedule`

### Injected fields to prove absent

- `privateToken`
- `internalNotes`
- `secretDraftNotes`
- `draftPasswordHint`
- `internalQueueConfig`
- `collaborator_permissions`
- `adminEmail`
- `guestEmail`
- `phone`
- `roles`
- `permissions`
- `plannerNotes`
- `staffNotes`
- `visibilityRules`
- `contactInfo`
- `hiddenGallery`
- `hiddenTimeline`
- `unpublishedCopy`
- `moderationQueue`
- `internalSchema`
- `ownerPreview`
- `billingStatus`
- `providerSecret`
- `queueTargets`

### Required proof targets

None may appear in:
- `render_model`
- browser payload
- `SiteView` state
- public API response
- translated public response
- public hydration data

## Service-Role Proof Matrix

| Function | Uses service role? | Auth source | Site scope source | Cross-site denial proof | Allowed-role proof | Queue/storage proof | Status |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `public-site-access` | No | public gate + session token | slug + invite/password context | n/a | n/a | n/a | `LIVE PASS` |
| `process-email-queue` | Yes | service role env + internal trigger | queued site-owned rows | `PASS` | `PASS` | `LIVE PASS` | `LIVE PASS` |
| `send-wedding-email` | Yes | owner/collaborator auth + server checks | request site context | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `send-bulk-message` | Yes | owner/collaborator auth + server checks | request site context | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `queue-guest-followups` | Yes | owner/collaborator auth + scheduler path | request site context | `PASS` | `LIVE PASS` | `PASS` | `LIVE PASS` |
| `photo-upload` | Yes | guest/public upload flow + signed server path | site/album lookup | `PASS` | n/a | `LIVE PASS` | `LIVE PASS` |
| `vault-contribution-public` | Likely limited | public gate | slug/site gate | `PARTIAL` | n/a | n/a | `PARTIAL` |
| `interactive-section-public` | Likely limited | public gate | slug/site gate | `PARTIAL` | n/a | n/a | `PARTIAL` |
| storage/media helper flows | Yes | function-owned service credentials | bucket path + site ownership | `PASS` | `LIVE PASS` | `LIVE PASS` | `LIVE PASS` |

## Email/Queue Proof Matrix

| Flow | Enqueue auth | Process auth | Recipient scope | Cross-site denial | Abuse proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `send-wedding-email` | `PARTIAL` | n/a | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `send-bulk-message` | `PARTIAL` | n/a | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `process-email-queue` | n/a | `LIVE PASS` | `LIVE PASS` | `PASS` | `PASS` | `LIVE PASS` |
| `queue-guest-followups` | `PARTIAL` | `LIVE PASS` | `PASS` | `PASS` | `PASS` | `PARTIAL` |
| RSVP followups | `PARTIAL` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |
| guest messaging | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| scheduled/bulk queue paths | `PARTIAL` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |

## Public Route Access Matrix

| Public surface | Function/path | Access gate | Payload type | Raw blobs? | Live proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| public site | `public-site-access` + `SiteView` | public/privacy/invite/password gate | `render_model` DTO | `NO` top-level | `LIVE PASS` | `PARTIAL` |
| registry | public site route + registry surface | public site gate | DTO-derived route state | `NO` top-level | `LIVE PASS` | `PARTIAL` |
| itinerary | `public-itinerary-by-slug` + public site route | public site gate | DTO + route payload | `NO` top-level | `PARTIAL` | `PARTIAL` |
| RSVP | `validate-rsvp-token`, `public-site-rsvp-submit` | token/code gate | scoped RSVP payload | `NO` top-level | `LIVE PASS` | `PASS` |
| guest hub | public site route | public site gate | DTO-derived route state | `NO` top-level | `PARTIAL` | `PARTIAL` |
| guestbook | `guestbook-submit` | public write gate | scoped submission payload | `NO` top-level | `PARTIAL` | `PARTIAL` |
| vault contribution | `vault-contribution-public`, `vault-entry-submit` | public gate | scoped public payload | `NO` top-level | `PARTIAL` | `PARTIAL` |
| interactive sections | `interactive-section-public` | public gate | scoped interaction payload | `NO` top-level | `PARTIAL` | `PARTIAL` |
| photo/media public routes | `photo-upload`, public gallery routes | guest/public gate | sanitized media payload | `NO` top-level | `LIVE PASS` | `PASS` |
| translation route | translated public render path | public site gate | translated DTO | `NO` top-level | `PASS` | `PARTIAL` |
| recap route | public site route | public site gate | DTO-derived route state | `NO` top-level | `PARTIAL` | `PARTIAL` |
| subdomain route | dayof subdomain/public slug route | host + slug gate | DTO | `NO` top-level | `LIVE PASS` | `PARTIAL` |

## Validation Matrix

| Command | Status | Environment | Last run | Notes |
| --- | --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | local | `2026-05-11` | rerun green after removing the legacy layout fallback path |
| `npm run lint -- --quiet` | `PASS` | local | `2026-05-11` | rerun green on the current hero/story/contact/public-contract code state |
| `npm run build` | `PASS` | local + deploy build | `2026-05-11` | rerun green after removing the legacy layout fallback path and also passed during Vercel deploy |
| `npm test` | `NOT RUN` | local | current wave | full suite not freshly run |
| `npm run test:security` | `PASS` | local | `2026-05-11` | part of `test:launch` |
| `npm run test:smoke` | `NOT RUN` | local | current wave | not freshly rerun as one bundle |
| `npm run proof:v1:public-access-coverage` | `PASS` | local | `2026-05-11` | rerun green after countdown resolved-contract tightening |
| public DTO leak tests | `PASS` | local | `2026-05-11` | focused rerun now covers translated payloads, innocent-looking sensitive fields, translated legacy-layout payloads, stricter legacy layout gating, explicit minimal public contact DTOs, resolved hero/story/travel/gallery/countdown DTO normalization, nested travel and gallery item allowlists, CTA sanitizer safety, and removal of unused guest-facing toggles |
| `npm run proof:v1:guest-lookup-scope` | `NOT RUN` | local/live | current wave | not freshly rerun |
| `npm run proof:v1:registry-preview-ssrf` | `LIVE PASS` | production | `2026-05-11` | hostile-target matrix passed against the live `registry-preview` endpoint |
| `npm run proof:v1:service-role-authorization` | `PASS` | secure env | `2026-05-11` | live unauthenticated denial lane is green; paired runtime proof is recorded separately via `proof:v1:collaborator-runtime` and live photo upload/readback proof |
| `npm run proof:v1:email-messaging-authorization` | `PASS` | secure env | `2026-05-11` | live unauthenticated denial lane is green and isolated queue-row processing proof now passes without touching unrelated live rows |
| `npm run proof:v1:launch-closeout` | `PASS` | secure env | `2026-05-11` | secure closeout bundle passes cleanly after the queue-processing proof and photo-upload redeploy |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` | production | `2026-05-11` | owner album create/readback, guest upload, AI analysis, export-manifest links, recap curation, and moderation cleanup are proven live |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke` | `LIVE PASS` | production | `2026-05-11` | postdeploy |
| `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality` | `LIVE PASS` | production | `2026-05-11` | postdeploy |
| `npm run proof:v1:guests-rsvp-ops` | `LIVE PASS` | production | `2026-05-11` | postdeploy |
| `npm run guard:file-size` | `PASS` | local | `2026-05-11` | current local gate |
| `npm run guard:assets` | `PASS` | local | `2026-05-11` | current local gate |
| `npm run proof:v1:performance-budget` | `PASS` | local | `2026-05-11` | current local gate |
| `git diff --check` | `PASS` | local | `2026-05-11` | rerun after doc refresh required |

## Deployment Matrix

| Surface | Git SHA | Deployed? | Deploy target | Flags | Live proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Vercel frontend | `e4f783f2` | Yes | production | standard Vercel prod deploy | `canonical-smoke`, `public-quality`, `guests-rsvp-ops` against last locally evidenced verified deploy `dpl_2VcJKSDGmUFyMLhrcUZy3aEHCMF2` | `LIVE PASS` |
| `public-site-access` | `e4f783f2` | Yes | Supabase prod | `--no-verify-jwt` | `canonical-smoke`, `public-quality` | `LIVE PASS` |
| `public-registry-items` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `public-itinerary-by-slug` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | indirectly covered only | `UNVERIFIED` |
| `validate-rsvp-token` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `guests-rsvp-ops` | `PARTIAL` |
| `public-site-rsvp-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `guests-rsvp-ops` | `PARTIAL` |
| `guest-contact-lookup` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `guestbook-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `photo-upload` | exact deployed SHA unknown | Yes | Supabase prod | `--no-verify-jwt` | `photo-upload-write-read` live proof | `LIVE PASS` |
| `vault-entry-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `interactive-section-public` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `vault-contribution-public` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `registry-preview` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `proof:v1:registry-preview-ssrf` | `LIVE PASS` |
| `send-wedding-email` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | secure proof not fresh | `UNVERIFIED` |
| `send-bulk-message` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | secure proof not fresh | `UNVERIFIED` |
| `process-email-queue` | exact deployed SHA unknown | Yes | Supabase prod | internal/queue path | `proof:v1:email-messaging-authorization` secure queue-row proof | `LIVE PASS` |
| `queue-guest-followups` | exact deployed SHA unknown | Yes | Supabase prod | internal/queue path | secure proof not fresh | `UNVERIFIED` |
| storage/media functions | exact deployed SHA unknown | Yes | Supabase prod | `photo-upload --no-verify-jwt`; owner/collaborator auth elsewhere | `photo-upload-write-read`, `service-role-authorization`, `collaborator-runtime` | `LIVE PASS` |
| AI/provider functions | exact deployed SHA unknown | Yes | mixed | function-specific | `ai-rollout`, `ai-clearance` partial | `PARTIAL` |

## P0/P1/P2 Rules

- `P0`: must be fixed before real users.
- `P1`: required for 10/10 launch-safe claim.
- `P2`: important stability or maintainability.
- `P3`: deferred or polish.

Do not mark `P1` done unless:
- code is changed
- tests pass
- deployment state is known
- live or secure-env proof is recorded where applicable

## Next 10 Tasks

1. Finish the per-section-family review and trim any public settings keys not clearly required by the guest renderer.
2. Canonicalize exact per-surface Git/Vercel/Supabase deployment truth, including fresh `photo-upload` and `process-email-queue` deploy facts.
3. Refresh backlog/report/smoke log with the secure-env outputs now that the deep lanes are green.
4. Rerun final live proof after any remaining launch-surface code changes.
5. Promote `HOLD` only if all remaining P1 lanes are green with no code gaps.
6. Decide whether any remaining asset/CDN follow-up is launch-critical or can stay deferred.
7. Stage, commit, and deploy the current hardening batch once the next proof checkpoint is complete.
8. Only then spend time on non-critical cleanup.
9. Keep the secure queue-row proof and photo upload/readback proof in the regression rotation after future function deploys.
10. Preserve one canonical launch-control truth set with no stale blocker language.

## Resolved Work Summary

- Public access fail-closed: top-level raw public blobs no longer cross the browser boundary; public browser `sections` reads were removed.
- Public DTO first pass: shared explicit public render contract now covers section settings, bindings, and style overrides; deeper per-family review still remains.
- Legacy public read quarantine: public `sections_public_visible_read` policy was removed and persisted fallback moved server-side.
- RSVP/session hardening: RSVP live proof and protected-route smoke are green.
- Public subresource gating: public guest/public route proof is green after deploy.
- Rate limiting: password/public gate rate limiting remains in place.
- Service-role runtime proof: denial, collaborator role-scoping, and live storage/media proof are now green.
- Email/message runtime proof: denial and isolated queue-processing proof are now green.
- SSRF initial hardening: exact-host registry preview hardening is in place and the hostile-target matrix is freshly green against production.
- Service worker cache safety: prior guardrails remain green.
- Validation/CI: local launch gate and postdeploy bundle are green, and focused public DTO tests were rerun green after this batch.
- Asset guardrails: file-size, asset budget, and performance-budget checks are green.

## Historical Changelog

Long chronological notes belong in:
- `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md`

This backlog stays operational.
