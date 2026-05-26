# DayOf AI Product Audit

Audited: 2026-05-03 8:14 AM PT
Updated: 2026-05-04 2:41 PM PT

## Current status note

This audit captures the AI launch-scope hardening review and detailed lane-by-lane reasoning.

For current canonical launch truth, pair this audit with:
- [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- [docs/PRODUCTION_HARDENING_REPORT.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_REPORT.md)
- [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)

The durable product claim remains narrow on purpose: model-backed server routes for Quick Start orchestration, photo vision, and owner site translation; deterministic helpers elsewhere unless a separately proven server route is added.

Scope: quick-start/onboarding AI, generated wedding-site copy, clarifying questions, planner/invisible-intelligence suggestions, photo organization and vision analysis, owner site translation, vendor profile generation, registry product preview, customer-visible AI output, provider/key/spend secrecy, public-source fetching, fallbacks, and proof coverage.

Status: **AI/photo column-privilege blocker cleared; secure model-backed AI proof cleared; AI launch scope is explicit**. The browser-visible provider-key path has been closed locally, the dormant frontend provider client has been removed, raw provider response-body handling has been tightened in audited AI paths, avoidable provider/model metadata has been removed from key browser responses/queries, AI/photo sensitive columns have a live-applied database privilege migration plus regression guard, rollout guard, and executable exposure proof, and secure live model proof now passes for retained model-capable routes. Latest production deploy `dpl_BUWMeVETBxxuuuATpuv6XQJpby9p` is aliased to `https://dayof.love`; postdeploy passed 8/8. The current marketable AI launch scope is: model-backed server routes for Quick Start orchestration, photo vision, and owner site translation; deterministic browser launch lanes for generated wedding-site copy, legacy onboarding extraction, photo organizer planning, and planner suggestions. Current launch-truth flow follows the shared proof-board contract too: `npm run proof:v1:board:freshness` must pass before either board output is treated as canonical, while `ci-hardpass` and `Release Launch Gate` stay freshness-only and do not regenerate the board outputs. `npm run proof:v1:ai-product-readiness` codifies this scope and passed 23/23; `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` passed 17/17 at 2:41 PM PT without printing secret values.

## Executive Summary

- AI is product-useful in several lanes: quick-start follow-up decisions, starter site copy, photo organization, photo vision analysis, and vendor profile drafting all have deterministic fallbacks or server-side alternatives.
- Customer-facing output has received real hardening: copy guards, launch wording guards, photo-analysis sanitizers, provider/model stripping in clarifying persistence, and safer Quick Start error copy are present.
- The prior browser-key architecture risk has been locally remediated: `src/lib/openai.ts` no longer contains a direct provider endpoint/key path, `.env.example` no longer documents browser provider keys, AI Edge Functions read only server-side secrets, and `src/lib/aiProviderKeySecurity.test.ts` guards against regression.
- The prior secure-env proof risk is cleared for the retained model-capable launch routes: Quick Start orchestration, photo vision, and owner site translation now have live model-backed proof plus protected internal usage/readback evidence. The older browser helpers remain deterministic launch lanes unless a server route is added. The AI/photo column-privilege migration is applied and readback-green; keep `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` green after future deploys or schema changes.
- Photo vision is the strongest server-side AI lane. It can still store provider/model/raw result fields internally for service-side processing, but regular authenticated browser roles now have a migration that limits selectable columns away from provider/model/raw result/raw usage/raw EXIF/exact GPS/internal cost fields.

## AI Surface Inventory

| Surface | Current implementation | Current hardening | Launch status |
| --- | --- | --- | --- |
| Quick Start follow-up orchestration | Client calls Supabase Edge Function `onboarding-ai-orchestrate`; server uses OpenAI when configured, deterministic fallback otherwise. | Loop cap, fallback decision, normalized questions/draft outputs, safe Quick Start error copy, provider/model no longer returned to the browser response, unexpected failures now return safe retry copy. | Model-backed server route; secure live proof passed with internal usage readback and no provider/model keys returned. |
| Generated wedding-site copy | `generateDraftFromWeddingProfile` is deterministic in the browser launch scope. | Deterministic fallback, critic/guard rails kept for any future server route, copy scoring, placeholder/generic rejection, punctuation normalization, browser-key regression guard. | Launch scope explicit: deterministic, not marketed as live model-backed. |
| Clarifying questions | Current customer path uses `onboarding-ai-orchestrate`; legacy `generateClarifyingQuestionDecision` has no browser provider-key path. | Structured schema, small question cap, persistence stripping, provider/model metadata stripped from stored meta. | Launch scope explicit: use Edge orchestration for model-capable Quick Start; do not rely on the legacy browser helper for model-backed behavior. |
| Photo organizer plan | `buildAiPhotoOpsPlan` uses deterministic metadata planner in browser-facing runtime. | Deterministic duplicate/moment/bucket fallback, displayed summaries/reasons/captions sanitized in Memories UI, browser-key regression guard. | Launch scope explicit: deterministic organizer; model-backed lane needs a server route if later marketed. |
| Photo vision analysis | Supabase Edge Function `photo-analyze-batch`; signed storage URLs, OpenAI or Gemini provider, metadata-only fallback, usage logging. | Auth required, site/collaborator access check, GPS withheld from AI prompt, no face-name identification instruction, owner UI sanitizes display copy, raw provider errors no longer saved to the owner-facing analysis row, Photos dashboard and live photo proof no longer select provider/model, and migration `20260503100000_harden_ai_photo_column_privileges.sql` removes regular browser SELECT access to sensitive AI/photo internals. The function now also returns safe browser-facing errors for audited backend/storage/save failure paths. | Model-backed server route; secure live proof passed with OpenAI analysis row readback and internal usage event. |
| Owner site translation | Settings invokes Supabase Edge Function `translate-site-content`; server uses OpenAI to translate supported public-site JSON into Spanish, French, Italian, German, or Portuguese. | Owner auth/site ownership gate, server-only provider key, provider/configuration failure marks translation failed with safe retry copy, database load/save/unexpected errors now return fixed customer-safe messages instead of raw Supabase/exception text. | Model-backed owner route; secure live proof passed with ready translation row readback. |
| Planner/invisible intelligence | Deterministic suggestions and planning assistant outputs. | Existing tests assert no visible AI spend/token/cost leakage in suggestions. | Needs product labeling review because it may be called AI while deterministic. |
| Vendor profile generation | Supabase Edge Function fetches bounded public website/social metadata and creates a profile draft; no LLM found in current path. | Public submission rate limit when service-role env is present; public URL validation blocks private/local hosts and credentials, social links are host-bounded, fallback profile draft, safe error copy. | Not model-backed AI; static public-source safety proof is green. |
| Registry preview | Supabase Edge Function fetches product pages and metadata for registry cards. | Auth required, rate limited, product URLs now reject private/local/credentialed/non-HTTP(S) hosts, canonical URL is used for fetch/cache, and fallback errors no longer return raw exception details. | Not model-backed AI; static public-source safety proof is green. |

## Critical Findings

### Closed Locally: Browser-facing OpenAI key path

`src/lib/openai.ts` no longer contains a direct frontend provider endpoint or key path, `.env.example` no longer documents browser provider keys, and the AI Edge Functions now read only the server-side `OPENAI_API_KEY` secret. `src/lib/aiProviderKeySecurity.test.ts` guards the key path.

Remaining follow-up:

- Rotate the previously shared OpenAI key before broad traffic.
- Add server-side routes if generated copy, clarifying questions, or photo organizer planning need model-backed production behavior instead of deterministic fallback.

### Locally Hardened: Raw provider response-body handling in audited AI paths

`runOpenAiStructuredPrompt`, `onboarding-ai-orchestrate`, and `photo-analyze-batch` no longer throw or persist raw upstream response bodies in the audited failure paths. Photo analysis now stores a safe fallback message when model-backed review fails.

Remaining follow-up: internal rows can still store provider/model/raw result fields for usage and analysis. The live migration now restricts regular browser SELECT access to those fields; secure service-role proof remains recommended for deep storage/cross-table integrity.

Required launch fix:

- Keep raw provider payloads in internal-only logs/tables with strict access, or omit them.
- Keep live RLS/API readback green after future deploys or schema changes, proving regular couples/collaborators cannot read sensitive usage/raw error fields unless intentionally allowed.

### Closed: Secure-env model-backed end-to-end proof

`V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` passed 17/17 on 2026-05-04 at 2:41 PM PT. It proves server-side secret configuration by name only, owner auth without token printing, live model-backed Quick Start with internal usage readback, live owner translation with ready-row readback, live photo vision with OpenAI analysis and internal usage readback, safe missing-auth failures, provider-failure source fallback contracts, invalid-output source fallback contracts, and temporary photo proof cleanup.

Ongoing requirement:

- Keep the secure AI smoke suite green after future AI Edge Function, model, or secret changes, without printing key values.
- Keep generated copy, legacy onboarding extraction, photo organizer, and planner suggestions documented and tested as deterministic launch lanes unless server routes are added.
- Rotate the previously shared external OpenAI key before broad traffic.

## 2026-05-03 5:15 PM PT AI/Product Public-Source And Translation Gap Fix Batch

- Fixed a retained AI route gap in `translate-site-content`: owner site translation no longer returns raw Supabase load/save errors or unexpected exception messages. It logs internal failure codes and returns fixed translation retry/save/load copy to the owner.
- Fixed a public-source fetch gap in `registry-preview`: product URL normalization now rejects private/local/credentialed/non-HTTP(S) URLs, blocks IPv6/private/local hostnames conservatively, fetches/cache-normalizes the canonical public URL, and stops returning raw `details` from caught exceptions.
- Fixed a first-run setup trust gap in `setup-bootstrap`: missing config, auth, site load, site save, and unexpected setup failures now return fixed customer-safe copy instead of raw environment/auth/database/exception messages.
- Expanded `npm run proof:v1:ai-product-readiness` to include owner site translation as a model-capable server route and registry preview as a bounded public-source route. It now passes 23/23 checks.
- Updated the proof board wording so secure-env model proof includes Quick Start/onboarding, photo vision, and site translation; deterministic browser lanes remain unchanged.
- Verification passed:
  - `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/aiProviderKeySecurity.test.ts`: PASS after rerunning past the known Vite temp-file permission issue, 17/17.
  - `npm run proof:v1:ai-product-readiness`: PASS, 23/23.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run proof:v1:board:freshness`: PASS.
  - `npm run proof:v1:board`: PASS.
  - `npm run proof:v1:board:md`: PASS.
  - `npm test -- --run src/lib/proofBoardFreshness.test.ts`: PASS after rerunning past the known Vite temp-file permission issue, 1/1.
  - `npm run build`: PASS after rerunning past the known Vite temp-file permission issue.
  - `git diff --check`: PASS.
- Launch status did not change: no active ungated AI/product/setup blocker was found in the no-secret local scope. Remaining AI/product-market caveats are secure-env model success/failure/invalid-output proof for Quick Start/photo vision/site translation, secure service-role deep integrity proof, external OpenAI key rotation, and the known approved-deployment warning for hardened `photo-upload` readiness.

## 2026-05-03 5:10 PM PT AI Product-Readiness Deep Audit/Fix Batch

- Fixed a public-source fetching gap in `vendor-profile-preview`: the function now has readiness and method guards, rejects private/local/credentialed/non-HTTP(S) URLs, host-bounds social profile URLs, and returns safe vendor-preview error copy instead of raw exception text.
- Expanded `npm run proof:v1:ai-product-readiness` to include the vendor/public-source draft guard. It now passes 20/20 checks.
- Updated the proof board wording so secure-env model proof is required for the current server model-capable routes, Quick Start and photo vision, while generated copy, legacy onboarding extraction, photo organizer, and planner suggestions remain deterministic launch lanes unless server routes are added.
- Verification passed:
  - `npm run proof:v1:ai-product-readiness`: PASS, 20/20.
  - `npm run proof:v1:ai-exposure`: PASS static-only, 53 checks.
  - `npm test -- --run src/lib/launchEdgeFunctions.test.ts src/lib/aiProviderKeySecurity.test.ts`: PASS after rerunning past the known Vite temp-file permission issue, 14/14.

## 2026-05-03 5:04 PM PT AI Product-Readiness Audit/Fix Batch

- Fixed a concrete AI trust gap: `onboarding-ai-orchestrate` no longer returns raw unexpected exception messages to the browser. It logs a server-side internal message and returns safe setup-draft retry copy on `INTERNAL_ERROR`.
- Added `scripts/v1-proof-ai-product-readiness.mjs` plus `npm run proof:v1:ai-product-readiness`. The proof codifies the current AI launch contract: server model-capable Quick Start and photo vision; deterministic browser launch lanes for generated copy, legacy onboarding extraction, photo organizer, and planner suggestions; no browser provider-key path; no provider/model Quick Start response; safe onboarding/photo errors; no exact GPS/face identity prompt leakage; customer-copy leakage guards; and AI/photo column-privilege proof wiring.
- Updated the proof board generator so the AI product audit command is part of the named AI proof lane.
- Verification passed:
  - `node --check scripts/v1-proof-ai-product-readiness.mjs`: PASS.
  - `npm run proof:v1:ai-product-readiness`: PASS, 19/19.
  - `npm test -- --run src/lib/aiProviderKeySecurity.test.ts src/lib/aiDraftGenerator.test.ts src/lib/aiPhotoOps.test.ts src/lib/photoAnalysisCustomerCopy.test.ts src/lib/aiOnboarding.test.ts src/lib/aiOnboardingClarifyingAdapter.test.ts`: PASS after rerunning past the known Vite temp-file permission issue, 37/37.
  - `npm run proof:v1:ai-exposure`: PASS static-only, 53 checks.
  - `npm run typecheck -- --pretty false`: PASS.
  - `npm run lint -- --quiet`: PASS.
  - `npm run build`: PASS after rerunning past the known Vite temp-file permission issue.
- Launch status did not change: no new ungated blocker was found. Remaining AI/product-market caveats are secure-env model success/failure/invalid-output proof, secure service-role deep integrity proof, external OpenAI key rotation, and approved deployment of the hardened `photo-upload` readiness function when Eric chooses to clear that warning.

## Important Findings

### P2: Some model-backed lanes now need explicit server routes or deterministic-only launch scope

Onboarding orchestration and photo vision are server-side. Generated copy, clarifying questions, and photo organizer planning no longer have a browser-key path, so they either run deterministically from the browser or need dedicated server routes if model-backed behavior is required in production.

Recommended direction: one server-side AI gateway for all model-backed work, with feature IDs, rate limits, usage logging, safe errors, and deterministic fallback contracts.

### P2: Provider/model metadata can still exist in internal storage

`onboarding-ai-orchestrate` no longer returns provider/model to the browser response, and the Photos dashboard no longer selects provider/model for owner review. Photo analysis rows and internal usage rows can still store provider/model server-side.

Recommended direction: do not return provider/model to browser clients unless an internal admin-only debug mode is explicitly enabled.

Local hardening added at 9:00 AM PT:

- `supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql` revokes broad regular SELECT access and grants only safe browser-readable columns on `photo_upload_ai_analysis`, `photo_upload_metadata`, and `photo_ai_bucket_corrections`; `internal_ai_usage_events` remains non-readable to anon/authenticated roles.
- `src/lib/aiProviderKeySecurity.test.ts` now guards regular client-readable AI/photo selects and the sensitive-column migration.
- `tests/e2e/photo-upload-write-read.spec.ts` now validates visible/product analysis output without selecting provider/model implementation fields.
- `scripts/v1-proof-ai-rollout.mjs` and `npm run proof:v1:ai-rollout` now prove the local browser/client AI-photo select lists are compatible with the sensitive-column migration before production deploy or live DB rollout. Live mode with `V1_AI_ROLLOUT_LIVE=1` inspects deployed JavaScript assets before the migration is applied.
- `scripts/v1-proof-ai-exposure.mjs` and `npm run proof:v1:ai-exposure` now provide a no-secret static proof plus optional live Supabase readback mode.
- `scripts/v1-proof-ai-clearance.mjs` and `npm run proof:v1:ai-clearance` now summarize local rollout/static exposure, deployed bundle rollout, and live Supabase exposure into one launch-clearance report.
- `scripts/v1-postdeploy-proof.mjs` now includes the AI rollout and static exposure gates so the next approved production proof cannot skip the AI hardening lane.

Live readback result at 9:11 AM PT:

- `V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure` failed because sensitive columns on `photo_upload_ai_analysis`, `photo_upload_metadata`, `photo_ai_bucket_corrections`, and `internal_ai_usage_events` were still selectable in the connected live Supabase environment.
- Safe product columns remained readable for authenticated owner proof, which means the intended post-migration split is feasible.
- `V1_AI_ROLLOUT_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-rollout` failed at 9:44 AM PT because current production `GuestPhotoSharing-BoYiuXTT.js` still selects `provider,model` from `photo_upload_ai_analysis`.
- `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` failed at 9:49 AM PT with the same production-bundle blocker plus the live Supabase sensitive-column readback blocker in one report.
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:postdeploy` passed at 10:02 AM PT on deploy `dpl_DA4qHExgPuKhvTHiXu2Ejb3kgNGs`; the live AI rollout subproof inspected 129 assets and passed with `GuestPhotoSharing-DPRkd9Ml.js`.
- Launch-clear blocker: apply `20260503100000_harden_ai_photo_column_privileges.sql` only with explicit approval, then rerun `V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure` until it passes, followed by live photo analysis proof.

### P2: Photo privacy posture needs explicit proof

Photo vision prompts include good privacy language: exact GPS is withheld from AI and the model is told not to identify people by face. The code also stores private metadata such as hash, EXIF flags, and GPS-derived labels.

Current proof:

- Static guard verifies photo vision prompts include only `hasPrivateGps`/withheld-location labeling and do not include exact GPS/raw EXIF fields.
- Live readback proves public/regular browser roles cannot read raw GPS/EXIF/provider/model/token/cost fields after the column-privilege migration.
- Customer-copy tests sanitize provider/storage/backend wording from captions, tags, warnings, and analysis text. Continue live model success/failure proof before marking the whole AI product audit complete.

## 2026-05-03 10:58 AM PT AI/Photo Privacy And Proof-Gap Batch

- `photo-analyze-batch` now returns safe browser-facing messages for audited site lookup, bucket lookup, upload lookup, save, and unexpected failure paths instead of returning raw Supabase/storage/backend exception messages.
- Added a focused static guard in `src/lib/aiProviderKeySecurity.test.ts` proving OpenAI/Gemini photo prompts expose `hasPrivateGps` plus withheld-location wording, but not exact GPS/raw EXIF fields.
- Updated `scripts/v1-proof-prereqs.mjs` so live prereqs no longer tell operators to apply the AI/photo migration after the protected table state is already visible; it now says to keep live AI clearance green after future deploys/schema changes.
- Verification passed: focused AI/photo privacy tests, AI exposure static proof, prereqs with live REST protection visible, and focused Edge/proof-script tests. Local-only `npm run proof:v1:ai-clearance` still exits not-clear by design because live mode is required for launch clearance.

### P3: “AI” labeling may overclaim deterministic features

Planner/invisible-intelligence suggestions are deterministic in the inspected code. Product copy should avoid implying model-backed magic where the current implementation is rule-based.

Recommended direction: keep customer copy focused on helpful suggestions and reviewable drafts, not provider/model claims.

## What Is Already Hardened

- Browser-facing code no longer contains a direct provider endpoint or provider-key path, and AI Edge Functions now require server-side `OPENAI_API_KEY`.
- Audited AI failure paths no longer throw or save raw provider response bodies.
- Onboarding AI responses and Photos dashboard analysis queries no longer include avoidable provider/model metadata.
- Regular browser-role SELECT grants for AI/photo tables now exclude provider/model/raw result/raw usage/raw EXIF/exact GPS/internal cost fields in the local migration.
- `npm run proof:v1:ai-rollout` proves the local frontend/proof paths no longer depend on columns the migration revokes.
- `npm run proof:v1:ai-exposure` proves the local migration/source guards, and live AI clearance/readback is green on production after the migration.
- Quick Start has safe user-facing error copy and hides debug details unless the debug query parameter is used.
- Clarifying persistence strips provider/model before saving customer-facing metadata.
- Onboarding orchestration has deterministic fallback, max loop count, normalized outputs, and usage logging when server-side model calls run.
- Generated copy has deterministic fallback, a critic pass, schema validation, placeholder/generic copy rejection, copy scoring, and human punctuation cleanup.
- Photo owner UI passes displayed analysis labels, captions, reasons, warnings, tags, and organizer output through `photoAnalysisCustomerCopy` sanitizers.
- Photo vision Edge Function requires authentication and checks owner/collaborator access before analysis.
- Photo vision prompt withholds exact GPS coordinates and tells the provider not to identify people by face.
- Launch wording guards include provider/key/spend/token leakage patterns.

## Required AI Bug-Test Matrix

- Quick Start: model success, model unavailable, invalid schema, slow response, follow-up loop cap, save/readback, signup handoff, mobile flow, debug hidden by default.
- Generated site copy: rich profile, sparse profile, impossible dates, unsafe/generic model output, fallback output, public renderer no-leak.
- Clarifying questions: ask mode, draft mode, repeated follow-up answers, skipped answers, event expansion, provider failure, no provider/model persistence.
- Photo organizer: no key fallback, model success, duplicate detection, album moves, slideshow draft, unsafe generated captions/tags/reasons sanitized.
- Photo vision: image upload, video skip, metadata-only trust path, provider success, provider failure fallback, high-confidence move, rejected suggestion, no face identity, no GPS leakage.
- Planner suggestions: deterministic output, no AI spend/provider/token wording, mobile layout, empty state.
- Vendor profile: public source fetch, invalid URL, rate limit, profile publish, inquiry submit, no provider/technical error leakage.
- Error states: network failure, auth expired, forbidden collaborator, missing site, empty data, repeated click, retry after failure.

## Launch-Clear Exit Bar

- No production frontend can access or bundle an OpenAI/Gemini/provider API key.
- All model-backed work runs server-side with rate limits, usage accounting, safe errors, and deterministic fallback.
- Live secure-env proof passes for every AI surface without printing secret values.
- Customer-visible UI and browser console do not expose provider names, raw model names, key names, token counts, cost/spend, service-role terms, raw provider errors, or Supabase internals.
- Photo AI privacy proof confirms exact GPS/private EXIF and raw provider payloads are not visible to public guests or normal collaborators after the migration is applied.
- Bug-testing matrix above is complete on desktop and mobile, with no unresolved critical/high AI bugs.

## Current Decision

AI is **launch-scope hardened but still gated on secure-env proof**. The browser-key path is guarded, the safe frontend is deployed, the AI/photo sensitive-column migration is applied, live readback passes, public-source fetchers have bounded URL/error handling, and audited AI routes now avoid raw provider/database exception copy. The remaining launch-critical AI gap is secure live model-backed success/failure/invalid-output proof for Quick Start/onboarding, photo vision, and owner site translation, plus service-role deep integrity proof in a secure environment.
