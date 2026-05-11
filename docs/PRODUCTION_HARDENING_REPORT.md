# Production Hardening Report

_Updated:_ `2026-05-11 02:27 PM PDT`

## Current Score

- Readiness score: `9.9 / 10`
- Launch verdict: `GO`
- Production-ready: `YES`

## Exact Blockers

None.

## Exact Proof Gaps

- `npm run proof:v1:guest-lookup-scope` is green.
  - It covers both lookup scope and session-scoped submit.
  - After forcing a fresh `guest-contact-lookup` runtime version and redeploying both guest contact functions with `--no-verify-jwt`, exact-match lookup, signed-session issuance, and household-scoped submit all pass.
- `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` is green.
  - It covers the live owner-gated `translate-site-content` route, safe missing-auth failure, ready-row readback, and the current AI/photo model-backed proof lane.
  - `translate-site-content` now returns immediately when the same source hash already has a ready translation row, so repeated production proofs no longer hang into a `504`.
- Everything else required for the previous P1 lanes is green:
  - explicit public DTO tests across all section families
  - `npm run proof:v1:public-access-coverage`
  - `npm run test:security`
  - `npm run test:smoke`
  - `npm run proof:v1:service-role-authorization`
  - `npm run proof:v1:email-messaging-authorization`
  - `npm run proof:v1:launch-closeout`
  - `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`
  - `npm run proof:v1:guests-rsvp-ops`
  - live guest hub write/read
  - live photo upload/readback/analysis/recap/moderation
  - live registry-preview SSRF

## Exact Deployment State

- Frontend:
  - live at [dayof.love](https://dayof.love)
  - latest verified deploy: `dpl_5n7ybgjzFH6ewXM257SpYGDjUoy7`
  - exact runtime Git SHA is not recoverable from this workspace because the deploy was built from the working tree after `1915b681`
- Supabase project:
  - `atuzuobpprjstfmdnwso`
- Freshly deployed functions in this final lane:
  - `public-site-access --no-verify-jwt`
  - `photo-upload --no-verify-jwt`
  - `process-email-queue`
  - `guest-contact-lookup --no-verify-jwt`
  - `guest-contact-submit --no-verify-jwt`
  - `translate-site-content`
- Fresh DB/runtime truth already applied:
  - `sections_public_visible_read` removal migration is pushed

## What Changed Since Last Report

- Closed `P1-04 Public section DTO minimization`.
  - The final per-family allowlist pass is done.
  - Every `SectionType` now goes through explicit public DTO shaping.
- Closed `P1-09 Deployment / proof truth canonicalization`.
  - The backlog now records one canonical branch/SHA/deploy/proof table instead of mixed older claims.
- Canonical deployment truth surfaced a real guest-contact runtime blocker, and that blocker is now closed.
- Extended `scripts/v1-proof-guest-lookup-scope.mjs` so it now proves:
  - exact-match lookup
  - no-match / partial-name fail-closed behavior
  - session-scoped guest-contact submit
  - household update scope
- Forced a fresh `guest-contact-lookup` live version, redeployed `guest-contact-lookup` and `guest-contact-submit` with `--no-verify-jwt`, and reran the live guest contact proof to green.
- Redeployed `translate-site-content` with a source-hash ready-row fast path, then reran the live secure AI/translation proof to green.

## What Remains Before 10/10

Only deferred/non-launch items remain:
1. custom-host/subdomain live rerun if that lane changes
2. registry owner import/repair manual notes
3. SMS/provider live-send setup when provider work resumes
4. AI server secret inventory / internal OPENAI prereq documentation follow-up

## Bottom Line

The repo is now at a clean launch baseline. The public DTO lane is finished, the secure queue/storage lane is finished, the deployment matrix is canonical, the guest-contact public-flow blocker is closed, and the live translation route is green too. Launch can honestly be called `GO`, and production-ready is `YES`.
