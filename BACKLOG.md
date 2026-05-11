# Production Hardening Backlog

## Current Canonical Status

| Field | Current State |
| --- | --- |
| Current date/time | `2026-05-11 10:49 AM PT` |
| Branch | local: `codex/v1-finish-hard-gates`; pushed launch branch: `codex/v1-finish-hard-gates-2` |
| Latest Git SHA | `1723a79f` |
| Latest commit message | `Harden public launch boundary and close out proof board` |
| Vercel deployment ID | `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx` |
| Supabase project ID | `atuzuobpprjstfmdnwso` |
| Supabase functions deployed | freshly redeployed: `public-site-access`; launch-relevant but not freshly redeployed this wave: `public-itinerary-by-slug`, `interactive-section-public`, `vault-contribution-public`, `process-email-queue`, `photo-upload`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`, `registry-preview` |
| Current readiness score | `9.55 / 10` |
| Launch verdict | `HOLD` |
| Production-ready | `NO` |
| Reason production-ready is not yet claimed | Public section DTO minimization is improved but not fully proven per section family, `layout_config` fallback is now narrowed to one explicit published flag but still needs live inventory confirmation, secure service-role proof is not freshly rerun in a secure env, secure email queue-processing proof is not freshly rerun in a secure env, and deployment truth is not yet canonical down to every launch surface |
| Current top blockers | `P1-03 Layout config fallback removal or hard gate`; `P1-04 Public section DTO minimization`; `P1-06 Service-role queue/storage runtime proof`; `P1-07 Secure email queue-processing proof`; `P1-09 Deployment/proof truth canonicalization` |
| Current proof state | Focused public DTO tests, `proof:v1:public-access-coverage`, `proof:v1:registry-preview-ssrf`, `typecheck`, `lint`, and `build` were rerun green after the explicit public render contract batch; the legacy layout fallback alias was removed, translated legacy-layout payloads are now explicitly covered by focused tests, unused public toggles (`showIcons`, `showParking`, `expandAll`) were removed from the guest-facing contract with focused proof green, section bindings are now scoped by section family instead of being carried generically, focused client-side contract tests now explicitly prove that same binding rule, footer CTA aliases now normalize into the actual guest-renderer fields (`buttonLabel`, `rsvpUrl`) while stale alias keys stay out of the public payload, `contact` form payloads now normalize `title` / `subtitle` into the actual resolved-renderer fields `headline` / `subheadline` while dropping stale and interactive-only keys for non-interactive variants, a new manifest-anchored public contract test now proves every allowlisted public settings key is either a real builder-manifest field or an explicit documented alias, a new repo audit now proves the app does not author `legacyLayoutPublished` outside the explicit public render consumer/tests, new focused server/client leak tests now prove nested interactive contact payloads (`poll`, `quiz`, placeholder/contact side data) do not survive into the public DTO, launch-control matrix completeness/freshness tests now prove the validation/deployment tables and proof-board derivation stay canonical, and `proof:v1:launch-closeout` confirms the only remaining blocked steps are the secure service-role and secure email queue proofs because `SUPABASE_SERVICE_ROLE_KEY` is missing |
| Current deployment state | Frontend is live on [dayof.love](https://dayof.love) with last locally evidenced verified deploy `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`; `public-site-access` is freshly deployed; the `sections_public_visible_read` removal migration was pushed; `registry-preview` hostile-target proof is freshly green against production; several other launch surfaces are deployed but not freshly revalidated from this SHA |

Blunt status:
- The app is no longer in obvious public-blob trouble.
- It is also not yet a 10/10 launch-safe system.
- The main remaining risk is not dashboard extraction. It is DTO precision plus secure runtime containment proof.

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
- Why it matters: current render-model shaping still depends on blacklist-style stripping of sensitive-looking keys instead of constructing public DTOs from exact allowed fields.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `src/lib/publicSiteAccess.ts`, `supabase/functions/public-site-access/index.ts`, `src/render/publicSectionDataSanitizer.ts`
- Current evidence: `src/lib/publicRenderContract.ts` now defines explicit section-settings allowlists, section-scoped binding allowlists, and style override allowlists shared by server and client; `src/lib/publicRenderContract.test.ts` now proves every allowlisted settings key is tied either to a real builder-manifest field or a documented alias exception; wedding, venue, schedule, registry, FAQ, media, and theme DTO shaping is explicit in `publicSiteRenderModel.ts`.
- Missing proof: a final per-section-family review to confirm no public renderer still depends on broader settings than the new contract.
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
- Status: `PARTIAL`
- Why it matters: `layout_config` is still a raw legacy blob fallback when builder pages are unavailable.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `supabase/functions/public-site-access/index.ts`, `src/lib/publicSiteRenderModel.test.ts`
- Current evidence: `layout_config` fallback now requires one explicit published payload flag (`legacyLayoutPublished`) and still flows through the strict public section/page DTO path; the looser `allowLegacyLayoutFallback` alias was removed and covered by focused tests; `publicLegacyLayoutFlagAudit.test.ts` now proves the repo does not author the explicit legacy flag outside the public render consumer/tests.
- Missing proof: production inventory showing which live sites, if any, still rely on the explicit legacy flag path.
- Acceptance criteria:
  - remove `layout_config` fallback entirely, or
  - allow it only for explicitly legacy-published sites, or
  - transform it through strict section allowlists with no broad passthrough.
- Exact next action: inventory live sites that still depend on explicit legacy layout fallback and decide whether the flag can be removed entirely.

### P1-04 Public section DTO minimization

- Priority: `P1`
- Status: `PARTIAL`
- Why it matters: section DTOs still carry broad `settings`, `bindings`, `styleOverrides`, `locked`, and `meta` data.
- Files/functions involved: `src/lib/publicSiteRenderModel.ts`, `src/render/publicSectionDataSanitizer.ts`, `src/types/builder/section.ts`, `src/lib/publicSiteRenderModel.test.ts`
- Current evidence: `locked` and public meta timestamps are removed from the output contract; bindings are now both reduced to minimal public arrays and scoped by section family (`venue`, `schedule`, `registry`, `faq`) instead of being passed generically; style overrides are reduced to explicit public style keys; settings now flow through explicit section-type allowlists shared by server and client; footer CTA aliases are normalized into the actual guest-renderer fields instead of shipping stale `ctaLabel` / `ctaHref` keys; `contact` form payloads now normalize `title` / `subtitle` into the actual resolved-renderer fields `headline` / `subheadline` while dropping interactive-only keys for non-interactive variants; nested interactive contact payloads (`poll`, `quiz`, placeholder/contact side data) are now explicitly proven absent from the public DTO on both server and client contract tests; and obviously unused guest-facing toggles (`showIcons`, `showParking`, `expandAll`) were removed from the public contract with focused regression coverage.
- Missing proof: per-section-family review for all guest-rendered families beyond the focused leak tests now in place.
- Acceptance criteria:
  - `bindings` removed unless strictly required; if required, replace with minimal `PublicBindingDTO`.
  - `locked` removed unless publicly needed.
  - meta timestamps removed unless publicly needed.
  - `styleOverrides` reduced to explicit public style keys.
  - per-section allowlists exist for hero, story, schedule, venue, registry, gallery, FAQ, travel, countdown, RSVP, contact, dress-code, wedding-party, and footer.
- Exact next action: finish the per-family review and trim any leftover keys that are not clearly used by the public renderer.

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
- Status: `SECURE ENV REQUIRED`
- Why it matters: service-role functions bypass RLS; any scope bug can cause cross-site mutation or data leakage.
- Files/functions involved: `scripts/v1-proof-service-role-authorization.mjs`, service-role Edge Functions, queue/storage flows
- Current evidence: unauthenticated denial lane passes; secure env rerun is still missing because `SUPABASE_SERVICE_ROLE_KEY` is absent here.
- Missing proof: fresh secure-env runtime proof for queue/storage/media isolation and role scoping.
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
- Exact next action: set `SUPABASE_SERVICE_ROLE_KEY`, run `npm run proof:v1:service-role-authorization`, then record the output in the board/report/log.

### P1-07 Secure email queue-processing proof

- Priority: `P1`
- Status: `SECURE ENV REQUIRED`
- Why it matters: queue scoping bugs can leak guest data or send unauthorized email.
- Files/functions involved: `scripts/v1-proof-email-messaging-authorization.mjs`, `process-email-queue`, `send-wedding-email`, `send-bulk-message`, `queue-guest-followups`
- Current evidence: unauthenticated denial lane passes; secure queue-processing proof is not freshly rerun in a secure env.
- Missing proof: fresh secure-env proof of enqueue/process/recipient/site scoping.
- Acceptance criteria:
  - queue processor only sends scoped site emails
  - recipients belong to the correct wedding site
  - collaborators cannot queue or send outside role
  - bulk or scheduled sends cannot cross site boundaries
  - queued payloads are validated before send
  - HTML and URLs are escaped or sanitized
  - runtime proof is recorded
- Exact next action: run `npm run proof:v1:email-messaging-authorization` in the same secure env and record the output.

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
| No draft page fallback for published public sites | `PARTIAL` |
| No current/draft `row.wedding_data` precedence for published sites | `PASS` |
| No broad `layout_config` fallback | `PARTIAL` |
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
| `process-email-queue` | Yes | service role env + internal trigger | queued site-owned rows | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |
| `send-wedding-email` | Yes | owner/collaborator auth + server checks | request site context | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `send-bulk-message` | Yes | owner/collaborator auth + server checks | request site context | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `queue-guest-followups` | Yes | owner/collaborator auth + scheduler path | request site context | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |
| `photo-upload` | Yes | guest/public upload flow + signed server path | site/album lookup | `SECURE ENV REQUIRED` | n/a | `SECURE ENV REQUIRED` | `OPEN` |
| `vault-contribution-public` | Likely limited | public gate | slug/site gate | `PARTIAL` | n/a | n/a | `PARTIAL` |
| `interactive-section-public` | Likely limited | public gate | slug/site gate | `PARTIAL` | n/a | n/a | `PARTIAL` |
| storage/media helper flows | Yes | function-owned service credentials | bucket path + site ownership | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |

## Email/Queue Proof Matrix

| Flow | Enqueue auth | Process auth | Recipient scope | Cross-site denial | Abuse proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `send-wedding-email` | `PARTIAL` | n/a | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `send-bulk-message` | `PARTIAL` | n/a | `PARTIAL` | `PARTIAL` | `PARTIAL` | `OPEN` |
| `process-email-queue` | n/a | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |
| `queue-guest-followups` | `PARTIAL` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `SECURE ENV REQUIRED` | `OPEN` |
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
| photo/media public routes | `photo-upload`, public gallery routes | guest/public gate | sanitized media payload | `NO` top-level | `PARTIAL` | `PARTIAL` |
| translation route | translated public render path | public site gate | translated DTO | `NO` top-level | `PASS` | `PARTIAL` |
| recap route | public site route | public site gate | DTO-derived route state | `NO` top-level | `PARTIAL` | `PARTIAL` |
| subdomain route | dayof subdomain/public slug route | host + slug gate | DTO | `NO` top-level | `LIVE PASS` | `PARTIAL` |

## Validation Matrix

| Command | Status | Environment | Last run | Notes |
| --- | --- | --- | --- | --- |
| `npm run typecheck -- --pretty false` | `PASS` | local | `2026-05-11` | rerun green after legacy layout gate tightening |
| `npm run lint -- --quiet` | `PASS` | local | `2026-05-11` | current local gate |
| `npm run build` | `PASS` | local + deploy build | `2026-05-11` | also passed during Vercel deploy |
| `npm test` | `NOT RUN` | local | current wave | full suite not freshly run |
| `npm run test:security` | `PASS` | local | `2026-05-11` | part of `test:launch` |
| `npm run test:smoke` | `NOT RUN` | local | current wave | not freshly rerun as one bundle |
| `npm run proof:v1:public-access-coverage` | `PASS` | local | `2026-05-11` | rerun green after shared explicit public render contract |
| public DTO leak tests | `PASS` | local | `2026-05-11` | focused rerun now covers translated payloads, innocent-looking sensitive fields, translated legacy-layout payloads, stricter legacy layout gating, and removal of unused guest-facing toggles |
| `npm run proof:v1:guest-lookup-scope` | `NOT RUN` | local/live | current wave | not freshly rerun |
| `npm run proof:v1:registry-preview-ssrf` | `LIVE PASS` | production | `2026-05-11` | hostile-target matrix passed against the live `registry-preview` endpoint |
| `npm run proof:v1:service-role-authorization` | `SECURE ENV REQUIRED` | secure env | `2026-05-11` | denial lane green; deep proof not freshly rerun |
| `npm run proof:v1:email-messaging-authorization` | `SECURE ENV REQUIRED` | secure env | `2026-05-11` | denial lane green; deep proof not freshly rerun |
| `npm run proof:v1:launch-closeout` | `SECURE ENV REQUIRED` | secure env | `2026-05-11` | board refresh and `git diff --check` pass inside the bundle; only blocked steps are the secure service-role and secure email proof lanes because `SUPABASE_SERVICE_ROLE_KEY` is missing |
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
| Vercel frontend | `1723a79f` | Yes | production | standard Vercel prod deploy | `canonical-smoke`, `public-quality`, `guests-rsvp-ops` against last locally evidenced verified deploy `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx` | `LIVE PASS` |
| `public-site-access` | `1723a79f` | Yes | Supabase prod | `--no-verify-jwt` | `canonical-smoke`, `public-quality` | `LIVE PASS` |
| `public-registry-items` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `public-itinerary-by-slug` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | indirectly covered only | `UNVERIFIED` |
| `validate-rsvp-token` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `guests-rsvp-ops` | `PARTIAL` |
| `public-site-rsvp-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `guests-rsvp-ops` | `PARTIAL` |
| `guest-contact-lookup` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `guestbook-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `photo-upload` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | secure proof not fresh | `UNVERIFIED` |
| `vault-entry-submit` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `interactive-section-public` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `vault-contribution-public` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | not freshly rerun | `UNVERIFIED` |
| `registry-preview` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | `proof:v1:registry-preview-ssrf` | `LIVE PASS` |
| `send-wedding-email` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | secure proof not fresh | `UNVERIFIED` |
| `send-bulk-message` | exact deployed SHA unknown | Yes | Supabase prod | unknown from this workspace | secure proof not fresh | `UNVERIFIED` |
| `process-email-queue` | exact deployed SHA unknown | Yes | Supabase prod | internal/queue path | secure proof not fresh | `UNVERIFIED` |
| `queue-guest-followups` | exact deployed SHA unknown | Yes | Supabase prod | internal/queue path | secure proof not fresh | `UNVERIFIED` |
| storage/media functions | exact deployed SHA unknown | Yes | Supabase prod | function-specific | secure proof not fresh | `UNVERIFIED` |
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

1. Inventory live sites that still depend on explicit legacy `layout_config` fallback and remove the flag path if none do; repo proof now shows the app is not creating new flagged rows.
2. Finish the per-section-family review and trim any public settings keys not clearly required by the guest renderer.
3. Finish secure service-role queue/storage proof.
4. Finish secure email queue-processing proof.
5. Canonicalize exact per-surface Git/Vercel/Supabase deployment truth.
6. Rerun final live proof after any remaining launch-surface code changes.
7. Refresh backlog/report/smoke log with secure-env outputs.
8. Promote `HOLD` only if all remaining P1 lanes are either green or explicitly secret-blocked with no code gaps.
9. Decide whether any remaining asset/CDN follow-up is launch-critical or can stay deferred.
10. Only then spend time on non-critical cleanup.

## Resolved Work Summary

- Public access fail-closed: top-level raw public blobs no longer cross the browser boundary; public browser `sections` reads were removed.
- Public DTO first pass: shared explicit public render contract now covers section settings, bindings, and style overrides; deeper per-family review still remains.
- Legacy public read quarantine: public `sections_public_visible_read` policy was removed and persisted fallback moved server-side.
- RSVP/session hardening: RSVP live proof and protected-route smoke are green.
- Public subresource gating: public guest/public route proof is green after deploy.
- Rate limiting: password/public gate rate limiting remains in place.
- Service-role initial proof: unauthenticated denial lane is green; deep secure proof is still open.
- Email/message initial proof: unauthenticated denial lane is green; deep queue-processing proof is still open.
- SSRF initial hardening: exact-host registry preview hardening is in place and the hostile-target matrix is freshly green against production.
- Service worker cache safety: prior guardrails remain green.
- Validation/CI: local launch gate and postdeploy bundle are green, and focused public DTO tests were rerun green after this batch.
- Asset guardrails: file-size, asset budget, and performance-budget checks are green.

## Historical Changelog

Long chronological notes belong in:
- `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_CHANGELOG.md`

This backlog stays operational.
