# Launch Main P0 Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/codex/launch-main-p0`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a low-friction PR branch.

Best next move:

1. start from fresh `main`
2. salvage the still-desired pieces intentionally
3. validate each piece against current runtime and proof lanes

## Why It Is Worth Preserving

- only 3 unique commits beyond `origin/main`
- carries meaningful launch/auth/RSVP hardening
- includes a small tip commit that looks portable

Branch commits:

1. `abdd07091` `harden launch P0: RSVP, billing gate, sender safety, demo gating`
2. `05bdd9520` `harden launch proofs and legal links on auth/payment surfaces`
3. `413f1093f` `fix dashboard/builder site state mismatch for publish visibility`

## Why It Is Not PR-Ready

- total scope is still broad: `32` files changed
- diff size is still heavy: about `4300` insertions / `1246` deletions
- launch proof and smoke surfaces overlap with current `main`
- edge-function behavior would need a fresh live review, not just merge confidence

Known overlap zones:

- `scripts/playwright-owner-create-invite-and-claim.mjs`
- `tests/e2e/live-smoke.spec.ts`
- `tests/e2e/collaborator-permission-rls.spec.ts`

## Salvage Buckets

### 1. Strongest salvage candidate

Commit:

- `413f1093f` `fix dashboard/builder site state mismatch for publish visibility`

Touched files:

- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/Overview.tsx`

Why this is attractive:

- compact
- product-facing
- easier to re-implement on top of current `main`

Recommended approach:

- re-read the current `main` versions of those two files
- port only the publish-visibility/site-state fix
- add a narrow regression test if the current surface supports one

### 2. Medium-confidence salvage candidate

Commit:

- `05bdd9520` `harden launch proofs and legal links on auth/payment surfaces`

Touched files:

- `scripts/rsvp_smoke.js`
- `scripts/site_lookup_smoke.js`
- `src/pages/Login.tsx`
- `src/pages/PaymentRequired.tsx`
- `src/pages/Signup.tsx`
- `tests/e2e/live-smoke.spec.ts`

Why this needs care:

- part runtime wording
- part smoke expectation drift
- part auth/legal link surface

Recommended approach:

- split UI/legal-link changes from smoke-script changes
- keep only wording or link-hardening that still matches the shipped product
- treat `tests/e2e/live-smoke.spec.ts` as a fresh rewrite target, not a cherry-pick target

### 3. Large salvage bucket

Commit:

- `abdd07091` `harden launch P0: RSVP, billing gate, sender safety, demo gating`

Touched areas:

- auth gating
- home/product surfaces
- RSVP/session validation
- email and SMS edge functions
- collaborator permissions
- live smoke and collaborator RLS proof coverage
- deployment/env guidance

Why this should not be transplanted wholesale:

- too many behavior surfaces moved together
- includes edge-function contract changes
- includes proof/test/docs changes mixed with product logic
- likely contains pieces already solved differently on `main`

Recommended approach:

- mine this commit for specific ideas, not direct patch application
- if revived, split into separate work items:
  - auth/payment gate behavior
  - RSVP/session validation behavior
  - sender safety / messaging edge-function behavior
  - collaborator permission proof coverage

## Files Worth Revisiting First

If someone resumes this branch, start here:

- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/Overview.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `supabase/functions/validate-rsvp-token/index.ts`
- `supabase/functions/_shared/emailSender.ts`
- `tests/e2e/live-smoke.spec.ts`

## Suggested Revival Path

1. create a fresh branch from `main`
2. re-implement the dashboard publish-visibility fix from `413f1093f`
3. decide whether auth/legal-link wording from `05bdd9520` still matters
4. open separate follow-up tickets for any surviving pieces from `abdd07091`
5. ignore the idea of merging `origin/codex/launch-main-p0` directly

## Summary

`origin/codex/launch-main-p0` belongs in the "careful salvage" bucket.

Preserve the branch.
Do not merge it directly.
Use it as a source branch for small, current, intentional follow-up work.
