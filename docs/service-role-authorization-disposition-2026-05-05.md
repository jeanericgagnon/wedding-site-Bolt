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

## Current Live Proof Baseline

- `npm run proof:v1:guest-lookup-scope`
  - anonymous guest-contact lookup denies partial and mismatched names
  - exact-match lookup returns only a signed contact session
  - signed contact update stays scoped to the intended household rows
- `npm run proof:v1:guests-rsvp-ops`
  - strict RSVP smoke proves the guest-facing token and RSVP flow still behaves correctly in production
- `npm run proof:v1:collaborator-runtime`
  - owner invite creation and collaborator claim are live-proven
  - viewer direct message write is denied
  - planner/coordinator allowed-action runtime proof is green
  - guest-scoped collaborators can directly mutate guest rows
  - direct timeline writes and direct wedding-site settings writes stay denied without the matching permission set
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`
  - public site / itinerary / guest-facing baseline is live-green

## Still Needs Expanded Live Proof

- Broader direct client-table RLS matrix across planning, seating, and other non-guest dashboard write surfaces.
- Live postdeploy proof that any newly redeployed public-site, RSVP, registry, or itinerary Edge Function runtime still matches this disposition.
- SMS/Telnyx provider callback proof remains deferred.
