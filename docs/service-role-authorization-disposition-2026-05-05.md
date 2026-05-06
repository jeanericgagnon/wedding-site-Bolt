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
- `photo-upload`
- `public-itinerary-by-slug`
- `public-registry-items`
- `public-site-access`
- `public-site-rsvp-submit`
- `submit-contact-request`
- `submit-rsvp`
- `validate-rsvp-token`
- `vault-entry-submit`
- `vault-upload-google-drive`
- `vendor-profile-inquiry-submit`

## Public Or Optional-Auth Rate-Limited Helpers

- `log-client-error` - public telemetry submission scoped by rate limiting, sanitization, and derived user/site context; it must not trust browser-supplied user or site IDs.
- `onboarding-ai-orchestrate` - public onboarding helper with optional authenticated usage attribution; rate-limit site context and `internal_ai_usage_events.wedding_site_id` must use only a verified owner/collaborator site ID.
- `vendor-profile-preview` - public vendor preview helper scoped by URL normalization, public-target fetch checks, and durable rate limiting.

## Internal / Scheduler / Provider Scoped

- `process-email-queue` - now requires service-role bearer auth before reading pending email queue rows.
- `sms-rsvp-inbound` - provider/webhook scoped; SMS remains out of launch scope.
- `stripe-webhook` - provider webhook scoped.

## Fixed In This Pass

- `process-email-queue` now rejects non-service-role callers before creating the service-role client.
- `onboarding-ai-orchestrate` now verifies owner/collaborator access before attaching a requested site ID to rate-limit context or internal usage rows.
- `google-drive-auth-start` now signs OAuth state with HMAC, and `google-drive-auth-callback` verifies that signed state before service-role token writes.
- `public-site-access` now selects and enforces private gate fields server-side, rate-limits password unlock, and keeps private fields out of public payloads.
- `public-itinerary-by-slug` and `public-registry-items` now enforce public/password/invite access before returning subresource data.
- `validate-rsvp-token` no longer issues sessions from broad name lookup or guest ID alone.
- `registry-preview` now has both in-memory and durable rate limiting plus A/AAAA public-target checks.

## Still Needs Live Proof

- Full Supabase RLS policy proof for anonymous and authenticated client access.
- Live postdeploy proof that public-site, RSVP, registry, and itinerary Edge Function deployments match this source.
- SMS/Telnyx provider callback proof remains deferred.
