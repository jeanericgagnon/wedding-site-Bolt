# DayOf Launch Backup And Export Runbook

Last updated: 2026-05-03

## Purpose

This is the operator checklist for customer-data backup, export, and release readiness before a launch deploy.

## Customer Data Export

Use dashboard exports first when available:

- Guests: guest list, households, RSVP status, meal choices, custom answers, event attendance, and check-in state.
- Photos: media manifest, bucket links, share kit, recap curation state, and hosted media paths.
- Registry: registry items, merchant/source labels, purchased state, and owner-visible purchase metadata.
- Planner: tasks, budget rows, vendors, payments, song requests, address collection, and timeline events.
- Vault: vault entries and hosted attachment metadata. Drive remains optional backup, not primary storage.

## Backend Backup Check

Before launch-clear:

- Run `npm run proof:v1:data-integrity`.
- Run `npm run proof:v1:prereqs`.
- In a secure environment with `SUPABASE_SERVICE_ROLE_KEY`, rerun data-integrity and prereqs so storage bucket and deep orphan checks are included.
- Confirm no direct public-write table path exists for public guest/vendor forms unless it is intentionally protected by RLS and rate-limit logging.

## Release Checklist

- `npm run lint -- --quiet` passes.
- `npm run typecheck -- --pretty false` passes.
- `npm run build` passes.
- Core proof bundles pass: prereqs, canonical smoke, guests/RSVP ops, registry, seating continuity, comms center, coordinator/day-of.
- Postdeploy proof now includes canonical smoke, prereqs, AI rollout, static AI exposure, runtime wording truth, public quality, Guests/RSVP ops, and anon-limited data integrity.
- Browser proof passes for public site quality, launch wording, mobile core, vendor templates, photo upload, RSVP, vault, and settings.
- Payment bypass is preserved for test flows.
- SMS sending remains locked while Telnyx/LLC/A2P setup is deferred.
- No customer-facing UI exposes AI spend, token counts, provider names, or model details.
- Provider keys stay server-side only.
- Run `npm run proof:v1:ai-rollout` before any approved deploy while AI/photo column privileges are staged.
- The guarded production deploy runs `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:postdeploy` automatically after Vercel deploy completion, and `SKIP_POSTDEPLOY_PROOF` is no longer accepted. Do not treat a production deploy as complete unless that postdeploy proof passes.
- Before applying the AI/photo column migration, run `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-migration-ready`; it must report `safeToApplyMigration: true` and `state: frontend_ready_migration_pending`.
- Run `V1_AI_ROLLOUT_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-rollout` after an approved deploy and before applying the AI/photo column migration if you need to isolate the deployed-bundle check outside the full postdeploy proof.
- Use `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` as the single AI launch-clearance gate; it must pass before AI is marked launch-cleared.
- For AI/photo column hardening, deploy or explicitly order-coordinate the safe frontend before applying `supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql`.
- Exact AI/photo column migration apply path, after explicit approval only:
  1. `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-migration-ready`
  2. Confirm it reports `safeToApplyMigration: true`, `state: frontend_ready_migration_pending`, and `migrationAlreadyApplied: false`.
  3. `supabase migration list --linked`
  4. Confirm `20260503100000` is local-only/pending.
  5. `supabase migration up --linked`
  6. `supabase migration list --linked`
  7. Confirm `20260503100000` appears on both Local and Remote.
- After applying that migration, run `V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure`, `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance`, and `LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts` before launch-clear.
- New Supabase migrations and Edge Functions are deployed before code that depends on them is released.
- Vercel deploy happens only after the local proof batch is green and deploy is explicitly approved.

## Rollback Notes

- If a frontend deploy regresses, roll back the Vercel deployment before changing data.
- If an Edge Function deploy regresses, redeploy the previous function bundle or temporarily route the affected client action to a disabled/safe state.
- If an RLS migration blocks legitimate owner access, restore owner/team read policies before reopening public writes.
