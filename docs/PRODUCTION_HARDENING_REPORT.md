# Production Hardening Report

_Updated:_ `2026-05-11 10:46 AM PT`

## Current Score

- Readiness score: `9.5 / 10`
- Launch verdict: `HOLD`
- Production-ready: `NO`

## Exact Blockers

1. `layout_config` fallback is now narrowed to one explicit published flag, but live dependency on that flag path is not yet inventoried.
2. Public section DTO minimization is stronger, but still needs per-family final review to confirm no unnecessary guest-facing keys remain.
3. Secure service-role queue/storage proof is not freshly rerun in a secure environment.
4. Secure email queue-processing proof is not freshly rerun in a secure environment.
5. Deployment truth is much better, but not yet canonical for every launch surface.

## Exact Proof Gaps

- Missing final per-family review of the new explicit public section settings contract.
- Missing live inventory of whether any production sites still rely on the single explicit `legacyLayoutPublished` fallback flag path, even though repo proof now shows the app is not authoring new flagged rows.
- Missing fresh secure-env runtime proof for:
  - service-role queue/storage/media isolation
  - cross-site mutation denial
  - email queue-processing containment
  - recipient and collaborator scoping
- `npm run proof:v1:launch-closeout` was rerun on `2026-05-11` and confirmed those are the only remaining blocked steps; board refresh and `git diff --check` still pass inside that bundle.

## Exact Deployment State

- Frontend:
  - Last locally evidenced verified Vercel deployment `dpl_AjQ94iVAXhPutmegQbvjtawUUjUx`
  - live at [dayof.love](https://dayof.love)
  - deployed from Git SHA `1723a79f`
- Supabase project:
  - `atuzuobpprjstfmdnwso`
- Freshly redeployed function:
  - `public-site-access` with `--no-verify-jwt`
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
- A new legacy-layout flag audit now proves the repo does not author `legacyLayoutPublished` anywhere except the explicit public-render consumer and its focused tests, which narrows the remaining risk to live data inventory rather than fresh app writes.
- New focused server/client leak tests now prove nested interactive contact payloads like `poll`, `quiz`, `suggestionPlaceholder`, and contact side-data do not survive into the public DTO, which closes a richer-settings proof gap without widening the guest payload.
- New launch-control guard tests now prove the backlog’s validation matrix, deployment matrix, and proof-board derivation stay complete and canonical, which tightens operational truth without pretending the secure-env lanes are closed.
- Deployment and validation matrices are now being treated as canonical launch-control artifacts rather than soft narrative summaries.

## What Is Already Proven

- No top-level raw `site_json`, `published_json`, `wedding_data`, or `layout_config` is returned to the browser.
- Browser now receives a `render_model` DTO.
- Public browser `sections` read path was removed.
- Public section settings, bindings, and style overrides now flow through a shared explicit public render contract used by both server and client sanitizers.
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

## What Remains Before 10/10

1. Finish the remaining per-family public DTO review from the allowlisted DTO builders already in place.
2. Inventory or remove the remaining explicit `legacyLayoutPublished` fallback flag path.
3. Finish the per-family review of public section DTO fields.
4. Rerun secure service-role proof with `SUPABASE_SERVICE_ROLE_KEY`.
5. Rerun secure email queue-processing proof with `SUPABASE_SERVICE_ROLE_KEY`.
6. Finish canonical deployment truth for every launch surface.
7. Rerun board validation and preserve one final canonical truth set.

## Current Validation Snapshot

| Check | Status |
| --- | --- |
| `npm run proof:v1:board:md` | `PASS` |
| `git diff --check` | `PASS` |
| `npm run typecheck -- --pretty false` | `PASS` |
| `npm run lint -- --quiet` | `PASS` |
| `npm run build` | `PASS` |
| `npm run proof:v1:launch-closeout` | `SECURE ENV REQUIRED` |

## Bottom Line

We are closer to a real launch-safe system than the old board suggested, but we are not done. The app is hardened enough to stop pretending the remaining work is cosmetic. The remaining work is specific, security-relevant, and finite. Until those P1 items are fixed and the secure proof lanes are freshly recorded, this is not a 10/10 launch and not production-ready.
