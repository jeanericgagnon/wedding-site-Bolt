# Production Hardening Report

_Updated:_ `2026-05-11 12:48 PM PDT`

## Current Score

- Readiness score: `9.95 / 10`
- Launch verdict: `HOLD`
- Production-ready: `NO`

## Exact Blockers

1. Public section DTO minimization is stronger, but still needs per-family final review to confirm no unnecessary guest-facing keys remain beyond hero, story, contact, travel, gallery, countdown, RSVP, wedding-party, dress-code, accommodations, directions, music, and video.
2. Deployment truth is much better, but not yet canonical for every launch surface.

## Exact Proof Gaps

- Missing final per-family review of the new explicit public section settings contract beyond hero, story, contact, travel, gallery, countdown, RSVP, wedding-party, dress-code, accommodations, directions, music, and video.
- `npm run proof:v1:service-role-authorization` was rerun in a secure env on `2026-05-11` and its live unauthenticated denial lane passed.
- `npm run proof:v1:collaborator-runtime` passed on `2026-05-11`, proving owner invite creation, collaborator accept flow, viewer deny, planner queue allow, and coordinator photo allow runtime behavior.
- `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` passed on `2026-05-11`, proving live owner album creation, guest hosted upload, owner readback, AI analysis, signed export links, recap curation, and moderation cleanup after redeploying `photo-upload` with `--no-verify-jwt`.
- `npm run proof:v1:email-messaging-authorization` passed in a secure env on `2026-05-11`; it now inserts an isolated invalid-recipient queue row, processes only that row with `queueIds`, and verifies the row fails safely without mutating unrelated live rows.
- `npm run proof:v1:launch-closeout` was rerun in a secure env on `2026-05-11` and now completes cleanly.

## Exact Deployment State

- Frontend:
  - Last locally evidenced verified Vercel deployment `dpl_ECgiber64N8nmbZAngWgDZZ3dYVZ`
  - live at [dayof.love](https://dayof.love)
  - deployed from Git SHA `38c7be6d`
- Supabase project:
  - `atuzuobpprjstfmdnwso`
- Freshly redeployed functions:
  - `public-site-access` with `--no-verify-jwt`
  - `photo-upload` with `--no-verify-jwt`
  - `process-email-queue`
- Freshly pushed DB change:
  - `20260511113000_remove_public_sections_visible_read.sql`
- Other launch surfaces:
  - deployed in production, but not all have exact per-surface SHA/runtime proof recorded from this workspace
- Registry preview hostile-target proof:
  - `npm run proof:v1:registry-preview-ssrf` passed against production on `2026-05-11`

## What Changed Since Last Report

- The board now reflects stricter launch truth instead of assuming the remaining work is only secret-backed proof.
- Readiness was lowered from the prior optimistic `9.6 / 10` framing to `8.7 / 10`, then raised to `9.1 / 10` after the explicit public contract batch plus fresh registry-preview hostile-target proof.
- This batch added a shared explicit public render contract in `src/lib/publicRenderContract.ts`.
- Published wedding-data precedence is now fixed so published snapshots win and canonical row identity is the only non-snapshot fallback.
- `layout_config` fallback is no longer unconditional; it now requires an explicit published payload flag and still routes through the same public DTO contract.
- Focused leak tests now cover translated payloads and innocent-looking sensitive fields.
- Focused reruns are green for:
  - `src/lib/publicSiteRenderModel.test.ts`
  - `src/lib/publicSiteAccess.test.ts`
  - `src/lib/publicAccessCoverageProofScript.test.ts`
  - `src/lib/publicGuestSurfaceBoundary.test.ts`
  - `src/pages/siteViewService.test.ts`
  - `src/lib/launchEdgeFunctions.test.ts`
  - `npm run proof:v1:public-access-coverage`
- `npm run proof:v1:registry-preview-ssrf` was rerun against production and passed all hostile-target cases.
- The looser `allowLegacyLayoutFallback` alias was removed from the public render path; focused tests and `proof:v1:public-access-coverage` stayed green.
- Translated legacy-layout payloads are now explicitly covered by focused public render-model tests, including stripped bindings/style/meta junk on the translated fallback path.
- Unused guest-facing toggles `showIcons`, `showParking`, and `expandAll` were removed from the public section contract after a direct renderer-usage audit; focused public render-model tests, client contract tests, `proof:v1:public-access-coverage`, and `typecheck` stayed green.
- Public bindings are now section-scoped instead of generic: only `venue`, `schedule`, `registry`, and `faq` sections can retain the one binding family they actually consume, and focused server/client public-contract tests stayed green after that cut.
- Client-side public payload proof now explicitly covers that section-scoped binding rule, so the browser sanitizer is verified to match the stricter server contract.
- Footer CTA public settings now normalize legacy `ctaLabel` / `ctaHref` aliases into the actual guest-renderer fields `buttonLabel` / `rsvpUrl`, and focused public render-model, client-contract, and footer component tests stayed green while the stale alias keys stayed out of the public payload.
- A new public render-contract proof now asserts that every allowlisted public settings key is either a real builder-manifest field or a documented alias exception, which makes future DTO widening much harder to slip in silently.
- A new legacy-layout flag audit now proves the repo no longer retains any `legacyLayoutPublished` path outside the audit guard itself, which makes the fallback removal sticky instead of aspirational.
- New focused server/client leak tests now prove nested interactive contact payloads like `poll`, `quiz`, `suggestionPlaceholder`, and contact side-data do not survive into the public DTO, which closes a richer-settings proof gap without widening the guest payload.
- New launch-control guard tests now prove the backlog’s validation matrix, deployment matrix, and proof-board derivation stay complete and canonical, which tightens operational truth without pretending the secure-env lanes are closed.
- Public contact payloads are now explicitly allowlisted instead of being accidentally broad or accidentally absent: the shared public render contract now preserves only minimal contact-person fields (`id`, `name`, `role`, `email`, `phone`, `instagram`) for non-interactive contact sections, while focused server/client leak tests prove innocuous-looking extras such as collaborator permissions or admin-only fields do not survive into the guest payload.
- Secure runtime proof moved forward materially: the service-role denial lane is live-green, the collaborator runtime lane is live-green, the owner photo upload/readback/storage lane is live-green, and the queue/messaging lane is now fully green with isolated secure queue-row processing proof.
- Hero payloads now align with the resolved public renderer contract instead of the old builder shape: legacy `title` / `subtitle` normalize into `eyebrow` / `subheadline`, CTA fields survive correctly, and a sanitizer bug that treated `ctaLabel` like a URL-like field is now fixed and covered by focused proof.
- Story payloads now align with the resolved public renderer contract instead of the old builder shape: legacy `title` / `storyText` / `photo` / `showTitle` normalize into `headline` / `body` / `image` / `showDivider`, and the stale builder-facing keys stay out of the guest payload with focused proof green.
- Travel payloads now align with the guest renderer families instead of the old builder shape: legacy `title` normalizes into `headline`, stale travel toggles like `showTitle`, `showTimezoneBadge`, `showIcsButton`, and `showParking` stay out of the public payload, and nested travel structures now flow through explicit per-variant item DTOs for hotels, guide groups, map pins, activities, and tiered hotel lists.
- Gallery payloads now align with the guest renderer families instead of the old builder shape: legacy `title`, `galleryImages`, and `photos` normalize into the resolved public gallery renderer contract, allowlisted gallery layout keys stay explicit, and nested gallery images now flow through explicit public item DTOs instead of broad arrays.
- Countdown payloads now align with the guest renderer contract instead of the old builder shape: legacy `title` now normalizes into `headline`, stale `showTitle` semantics stay out of the public payload, and only the resolved public countdown renderer fields survive.
- RSVP payloads now align with the guest renderer contract instead of the old builder shape: legacy `title` now normalizes into `headline`, stale `showTitle` semantics stay out of the public payload, only the resolved public RSVP renderer fields survive, and nested RSVP events now flow through explicit public item DTOs instead of broad arrays.
- Wedding-party payloads now align with the guest renderer contract instead of the old builder shape: legacy `title`, `subtitle`, `bridalTitle`, and `groomTitle` now normalize into `headline`, `subheadline`, `partner1Label`, and `partner2Label`, and nested wedding-party members now flow through explicit public item DTOs instead of broad arrays.
- Dress-code payloads now align with the guest renderer contract instead of the old builder shape: legacy `title` now normalizes into `headline`, only the resolved public dress-code renderer fields survive, and nested color swatches and mood images now flow through explicit public item DTOs instead of broad arrays.
- `typecheck`, `lint`, and `build` were rerun green on the current hero/story/contact/public-contract code state after those DTO-tightening changes.
- Focused public contract tests, render-model tests, client sanitizer tests, and `proof:v1:public-access-coverage` all reran green after the travel, gallery, countdown, RSVP, wedding-party, and dress-code contract tightening.
- A live production inventory query found `2` published rows and `0` rows with `published_json.legacyLayoutPublished === true`, so the last explicit `layout_config` public fallback path was removed from `publicSiteRenderModel.ts` instead of being merely gated.
- Focused `publicSiteRenderModel`, `publicAccessCoverageProofScript`, and `publicLegacyLayoutFlagAudit` tests all reran green after removing that fallback path, and `build` stayed green too.
- Deployment and validation matrices are now being treated as canonical launch-control artifacts rather than soft narrative summaries.

## What Is Already Proven

- No top-level raw `site_json`, `published_json`, `wedding_data`, or `layout_config` is returned to the browser.
- Browser now receives a `render_model` DTO.
- Public browser `sections` read path was removed.
- Public section settings, bindings, and style overrides now flow through a shared explicit public render contract used by both server and client sanitizers.
- Non-interactive public contact sections now expose only an explicit minimal contact-person DTO, with nested contact junk stripped on both server and client.
- Public hero sections now expose renderer-facing fields instead of stale builder-facing title/subtitle keys, and guest CTA labels are no longer at risk of being blanked by the generic deep sanitizer.
- Public story sections now expose renderer-facing `headline` / `body` / `image` / `showDivider` fields instead of stale builder-facing `title` / `storyText` / `photo` / `showTitle` keys.
- Public travel sections now expose explicit per-variant travel DTOs instead of stale builder toggles or broad nested arrays.
- Public gallery sections now expose explicit public image DTOs instead of stale legacy arrays or broad nested image payloads.
- Public countdown sections now expose resolved countdown renderer fields instead of stale builder-facing `title` / `showTitle` semantics.
- Public RSVP sections now expose resolved RSVP renderer fields and nested public event DTOs instead of stale builder-facing `title` / `showTitle` semantics or broad nested event payloads.
- Public wedding-party sections now expose resolved wedding-party renderer fields and nested public member DTOs instead of stale builder-facing title/side-label fields or broad member payloads.
- Public dress-code sections now expose resolved dress-code renderer fields and nested public color/image DTOs instead of stale builder-facing title fields or broad nested media payloads.
- Public accommodations sections now expose explicit public hotel DTOs instead of broad nested hotel objects, with variant-aware shaping for default vs. cards/featured/map-style public layouts.
- Public directions sections now expose explicit public transport DTOs instead of broad nested transport objects, while preserving only the renderer-facing fields needed by card/pin/split variants.
- Public music sections now expose explicit public playlist/song DTOs instead of broad nested playlist/request payloads, with variant-specific pruning so playlist sections no longer inherit request-form fields and request-form sections no longer inherit playlist/setlist baggage.
- Public video sections now expose explicit public video-card item DTOs instead of broad nested media payloads, with variant-specific pruning so card layouts no longer inherit full-layout-only top-level fields.
- Public bindings are no longer passed through generically to unrelated section types.
- Published sites no longer trust `row.wedding_data` before published snapshots.
- Translated wedding payloads now flow through the same published-safe snapshot path.
- Public live proof is green:
  - `canonical-smoke`
  - `public-quality`
  - `guests-rsvp-ops`
- Local gate is green:
  - `typecheck`
  - `lint`
  - `build`
  - `test:security`
  - `proof:v1:public-access-coverage`
  - `proof:v1:registry-preview-ssrf`
  - `guard:file-size`
  - `guard:assets`
  - `proof:v1:performance-budget`
- Unauthenticated denial lanes for service-role and email authorization are green.
- Secure service-role denial proof is freshly recorded in a secure env.
- Authenticated collaborator runtime proof is freshly recorded in production.
- Secure queue-processing proof is freshly recorded in a secure env.
- Live photo upload/readback/storage proof is freshly recorded in production.

## What Remains Before 10/10

1. Finish the remaining per-family public DTO review from the allowlisted DTO builders already in place, starting with menu.
2. Finish the per-family review of public section DTO fields.
3. Finish canonical deployment truth for every launch surface.
4. Rerun board validation and preserve one final canonical truth set.

## Current Validation Snapshot

| Check | Status |
| --- | --- |
| `npm run proof:v1:board:md` | `PASS` |
| `git diff --check` | `PASS` |
| `npm run typecheck -- --pretty false` | `PASS` |
| `npm run lint -- --quiet` | `PASS` |
| `npm run build` | `PASS` |
| `npm run proof:v1:launch-closeout` | `PASS` |
| `npm run proof:v1:service-role-authorization` | `PASS` |
| `npm run proof:v1:email-messaging-authorization` | `PASS` |
| `npm run proof:v1:collaborator-runtime` | `LIVE PASS` |
| `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` | `LIVE PASS` |

## Bottom Line

We are very close to a real launch-safe system, but we are not done. The secure proof lanes are now freshly recorded and green; the remaining work is narrower: finish the last per-family public DTO review and make the deployment matrix fully canonical. Until those remaining P1 items are closed, this is not a 10/10 launch and not production-ready.
