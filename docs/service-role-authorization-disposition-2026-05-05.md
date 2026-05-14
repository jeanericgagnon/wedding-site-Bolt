# Service-Role Authorization Disposition - 2026-05-05

_Batch time:_ 2026-05-04 5:48 PM PT
_Scope:_ Static service-role inventory and launch-risk disposition. No deploy or migration.

## Disposition

Every Edge Function that reads `SUPABASE_SERVICE_ROLE_KEY` is intentionally classified below. This document is not a substitute for live RLS proof, but it prevents unreviewed service-role expansion and records which paths are public-token scoped, owner/collaborator scoped, scheduler/internal scoped, webhook scoped, or still requiring deeper live proof.

## Owner / Collaborator Auth Required

- `generate-token`
- `google-drive-auth-callback`
- `google-drive-auth-start`
- `google-drive-health`
- `photo-album-create`
- `photo-album-manage`
- `photo-analyze-batch`
- `photo-export-manifest`
- `photo-upload-moderate`
- `queue-guest-followups`
- `registry-preview`
- `send-bulk-message`
- `send-wedding-email`
- `setup-bootstrap`
- `stripe-create-checkout`
- `stripe-create-sms-credits`
- `stripe-create-subscription`
- `stripe-verify-checkout-session`
- `translate-site-content`
- `vault-resolve-entry-link`

## Public Token / Public Submission Scoped

- `guest-contact-lookup`
- `guest-contact-submit`
- `guest-hub-config`
- `guest-hub-track`
- `guest-prospect-submit`
- `guest-recap-config`
- `guestbook-submit`
- `interactive-section-public`
- `photo-upload`
- `public-itinerary-by-slug`
- `public-registry-items`
- `public-site-access`
- `public-site-rsvp-submit`
- `registry-barcode-lookup`
- `submit-contact-request`
- `submit-rsvp`
- `validate-rsvp-token`
- `vault-contribution-public`
- `vault-entry-submit`
- `vault-upload-google-drive`
- `vendor-profile-inquiry-submit`

## Public Or Optional-Auth Rate-Limited Helpers

- `log-client-error` - public-safe error logging with optional bearer inference and durable public-submission rate limiting before service-role writes.
- `onboarding-ai-orchestrate` - public onboarding draft helper with deterministic fallback, optional site context, and durable public-submission rate limiting before model-backed service-role work.
- `vendor-profile-preview` - public vendor-preview helper with public-source fetch hardening and durable public-submission rate limiting before preview work.

## Internal / Scheduler / Provider Scoped

- `process-email-queue` - now requires service-role bearer auth before reading pending email queue rows.
- `sms-rsvp-inbound` - provider/webhook scoped; SMS remains out of launch scope.
- `stripe-webhook` - provider webhook scoped.

## Fixed In This Pass

- `process-email-queue` now rejects non-service-role callers before creating the service-role client.
- `public-site-access` now selects and enforces private gate fields server-side, rate-limits password unlock, and keeps private fields out of public payloads.
- `public-itinerary-by-slug` and `public-registry-items` now enforce public/password/invite access before returning subresource data.
- `validate-rsvp-token` no longer issues sessions from broad name lookup or guest ID alone.
- `registry-preview` now has both in-memory and durable rate limiting plus A/AAAA public-target checks.
- Public/session flows now use `PUBLIC_SITE_SESSION_SECRET_V1` / `PUBLIC_SITE_SESSION_SECRET` for signed public sessions instead of reusing `SUPABASE_SERVICE_ROLE_KEY`.

## Current Live Proof Baseline

- `npm run proof:v1:guest-lookup-scope`
  - anonymous guest-contact lookup denies partial and mismatched names
  - exact-match lookup returns only a signed contact session
  - signed contact update stays scoped to the intended household rows
- `npm run proof:v1:guests-rsvp-ops`
  - strict RSVP smoke proves the guest-facing token and RSVP flow still behaves correctly in production
  - `submit-rsvp` now routes capacity decisions through `public.apply_public_rsvp_capacity_decision(...)`
  - the serialized function definition is visible in `supabase/migrations/20260511170500_serialize_submit_rsvp_capacity.sql`
- `npm run proof:v1:collaborator-runtime`
  - owner invite creation and collaborator claim are live-proven
  - viewer direct message write is denied
  - planner/coordinator allowed-action runtime proof is green
  - guest-scoped collaborators can directly mutate guest rows
  - planner-scoped collaborators can directly write planning tasks, itinerary events, and dashboard messages while registry writes stay denied
  - settings-scoped collaborators can patch wedding-site settings and write sections while registry writes stay denied
  - registry-scoped collaborators can write registry items and refresh policy while dashboard message/section writes stay denied
  - photos-scoped collaborators can write vault config and patch vault providers while dashboard message writes stay denied
  - coordinator-scoped collaborators can directly write seating events/tables, Q&A, check-in, and builder media while dashboard message writes stay denied
  - direct timeline writes and ungranted wedding-site settings writes stay denied without the matching permission set
- `LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix`
  - broader direct client-facing RLS matrix is live-green across guest, planning, itinerary, settings, sections, registry item/policy, seating, coordinator, message, photo, and vault RPC lanes
  - the guest-dashboard settings RPC lane is already deployed and proven
  - regular collaborators cannot query `admin_users` directly while admin access stays behind the deployed server-side `admin_access_check()` path
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - public site / itinerary / guest-facing baseline is live-green

## Still Needs Expanded Live Proof

- When future non-guest write surfaces are introduced, add them to `npm run proof:v1:client-rls-matrix` and rerun the live matrix.
- When future runtime write surfaces are introduced, rerun `npm run proof:v1:client-write-inventory` so the no-direct-client-write claim stays current.
- Live postdeploy proof is now mandatory in `scripts/deploy_prod_guarded.mjs`; rerun it after any newly redeployed public-site, RSVP, registry, or itinerary runtime changes.
- SMS/Telnyx provider callback proof remains deferred.
