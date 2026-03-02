# RBAC + SMS Inbound RSVP Rollout Checklist

## Scope

This runbook covers rollout and verification for:

1. Backend-enforced collaborator RBAC policies
2. Inbound SMS RSVP processing + audit logging

## Migrations to apply

Apply in order:

1. `20260302073000_add_wedding_site_collaborator_rbac.sql`
2. `20260302080000_add_sms_inbound_rsvp_events.sql`

## Edge functions to deploy

- `sms-rsvp-inbound`

## Required external configuration

- Twilio inbound webhook URL → deployed `sms-rsvp-inbound` endpoint
- Ensure Twilio sends `From`, `To`, `Body`, `MessageSid`

## RBAC verification

Test with users in each role (`owner`, `coordinator`, `viewer`):

- Guests
  - owner/coordinator can add/edit/delete/check-in/actions
  - viewer cannot perform write actions
- Messages
  - owner/coordinator can compose/send/retry
  - viewer sees read-only mode
- Planning
  - owner/coordinator can mutate tasks/budget/vendors
  - viewer cannot mutate
- Coordinator Mode
  - owner/coordinator can update timeline/check-in/alerts/Q&A
  - viewer cannot mutate

## SMS inbound RSVP verification

Test real inbound SMS to Twilio number from known guest phone:

1. Reply `YES`
   - guest `rsvp_status` → `confirmed`
   - `responded_at` updated
   - `sms_inbound_rsvp_events` row inserted with `process_result = updated`
2. Reply `NO`
   - guest `rsvp_status` → `declined`
   - audit row inserted
3. Reply ambiguous text (`maybe later`)
   - TwiML asks for YES/NO clarification
   - event row inserted with `process_result = needs_clarification`
4. Unknown phone
   - no guest mutation
   - event row inserted with `process_result = unmatched`

## Smoke gate (must pass)

- `npm run typecheck`
- `npm run build`
- `npm run smoke:rsvp:strict`
- `npm run smoke:csvmapper`
- `npm run smoke:checkin`
- `npm run smoke:site testandkaras`
- `npm run smoke:web`

## Rollback notes

If rollback needed:

- Revert app commits introducing RBAC/sms-inbound logic.
- Revert policy migration by restoring previous policies (keep data tables unless explicit cleanup requested).
- Disable Twilio webhook endpoint temporarily to stop inbound processing.

## Post-rollout monitoring

For first 24 hours:

- Monitor `sms_inbound_rsvp_events` for error spikes
- Sample check `messages`/`message_deliveries` telemetry for failures
- Confirm no role escalation issues in dashboard write paths
