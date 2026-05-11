# V1 Final Gated Unblock Runbook

Status: only the externally gated launch items remain. This runbook is the source of truth for what to do after approval or secure access exists.

Rules:
- Do not deploy or apply migrations without explicit approval.
- Do not print, paste, commit, screenshot, or log secret values.
- Keep SMS/Telnyx sending deferred until LLC, compliance, sender identity, provider setup, and billing SKUs are ready.
- Preserve payment bypass for QA.
- After any approved deploy, rerun postdeploy proof before updating launch status.

## 1. `photo-upload` Readiness Warning

Gate: explicit approval for Supabase function deploy.

Why it remains: the source-level `photo-upload` readiness contract is hardened, but production prereqs still report the deployed function readiness as `deployed_with_runtime_error` until the current function source is deployed.

Approved path:

```bash
supabase functions deploy photo-upload --project-ref atuzuobpprjstfmdnwso
npm run proof:v1:prereqs
LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts
```

Exit bar:
- `npm run proof:v1:prereqs` reports no live `photo-upload` readiness runtime warning.
- Live photo upload plus analysis proof passes.
- No raw storage, provider, database, bucket, service-role, or runtime error text appears in guest UI.

## 2. Secure-Env Model-Backed AI Proof

Gate: secure server-side provider access for proof, without exposing secret values.

Why it remains: browser/provider exposure and live AI/photo readback are green, but retained server model-capable lanes still need secure-env success, failure, invalid-output, and fallback proof before broad market AI claims.

Approved path:

```bash
npm run proof:v1:ai-product-readiness
npm run proof:v1:ai-clearance
V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance
```

Manual proof checklist:
- Quick Start/onboarding succeeds with server-side model configured.
- Photo vision succeeds with server-side model configured.
- Site translation succeeds with server-side model configured.
- Provider failure falls back safely.
- Invalid/schema-bad output falls back safely.
- Customer UI and browser console hide provider, model, key, token, spend, raw provider error, service-role, raw EXIF, and exact GPS details.

Exit bar:
- Secure-env proof passes without printing secret values.
- Deterministic launch lanes remain explicit unless server routes are added: generated site copy, legacy onboarding extraction, photo organizer planning, and planner suggestions.

## 3. Secure Service-Role Storage/Cross-Table Integrity Proof

Gate: secure `SUPABASE_SERVICE_ROLE_KEY` or `V1_SUPABASE_SERVICE_ROLE_KEY` proof environment.

Why it remains: anon-limited data integrity is green, but private storage bucket inspection and full orphan/stale cross-table sweeps require service-role access.

Approved path:

```bash
npm run proof:v1:prereqs
npm run proof:v1:data-integrity
```

Exit bar:
- `npm run proof:v1:prereqs` directly inspects all required storage buckets in service-role mode.
- `npm run proof:v1:data-integrity` reports `proofMode: "service_role_full"`.
- No orphan/stale storage, photo, vault, RSVP, seating, guest, or public-submission failures remain.

## 3A. Secure Service-Role And Queue Closeout Bundle

Gate: secure `SUPABASE_SERVICE_ROLE_KEY` or `V1_SUPABASE_SERVICE_ROLE_KEY` proof environment.

Why it remains: the launch board should flip only after the two remaining authorization lanes and the final board refresh run as one closeout package.

Approved path:

```bash
npm run proof:v1:launch-closeout
```

What it runs:
- `npm run proof:v1:service-role-authorization`
- `npm run proof:v1:email-messaging-authorization`
- `npm run proof:v1:board:md`
- `git diff --check`

Exit bar:
- The bundle returns `ok: true`.
- No `missing_service_role_key` blocker remains.
- Launch docs are ready to promote from `HOLD` to `GO`.

## 4. External OpenAI Key Rotation

Gate: external account/security action outside repo automation.

Why it remains: a previous provider key was shared in chat. Even if current exposure checks are green, broad public traffic should use a rotated key.

Approved path:

```bash
npm run proof:v1:ai-product-readiness
V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance
V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure
```

Exit bar:
- Provider key is rotated externally.
- Server-side configuration is confirmed by secret name only, not by value.
- AI exposure/readback remains green after rotation.
- No frontend bundle or customer-readable row exposes provider key material.

## Final Status Update After Unblock

After any gated item is cleared:

```bash
npm run proof:v1:board:md
npm test -- --run src/lib/proofBoardFreshness.test.ts
git diff --check
```

Then update:
- `docs/v1-smoke-proof-log.md`
- `docs/full-suite-launch-backlog-2026-04-30.md`
- any deploy/postdeploy state docs if a deploy was approved and completed
