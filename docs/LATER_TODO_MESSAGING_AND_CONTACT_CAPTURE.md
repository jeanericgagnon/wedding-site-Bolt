# Later TODO — Messaging + Contact Capture

## SMS Credits / Billing (remaining setup)

- [ ] Set Supabase Function secrets:
  - `STRIPE_SMS_PRICE_ID_100`
  - `STRIPE_SMS_PRICE_ID_500`
  - `STRIPE_SMS_PRICE_ID_1000`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
- [ ] Confirm Stripe webhook endpoint still points to:
  - `https://atuzuobpprjstfmdnwso.functions.supabase.co/stripe-webhook`
- [ ] Confirm Stripe events include `checkout.session.completed`
- [ ] Smoke test credit purchase (100 pack) and verify:
  - `wedding_sites.sms_credits_balance` increments
  - `sms_credit_transactions` purchase row created
- [ ] Smoke test SMS send and verify:
  - credits are deducted
  - Twilio sends
  - delivery rows are created in `message_deliveries`
- [ ] Add legal copy in pricing/checkout/help:
  - “SMS credits expire 12 months after purchase; non-refundable.”

## Messaging product gaps still open

- [ ] SMS open/click tracking equivalent decision (SMS usually delivery-focused; click tracking requires shortlink layer)
- [ ] Better failure reason surfacing in UI (carrier/code-level)
- [ ] Optional credit wallet ledger filters/export in Messages

## New feature idea (requested)

### Guest self-service contact capture link

Allow couple to send a secure guest link so guest can provide missing contact details and RSVP context.

Proposed MVP:

- [ ] Add “Request contact details” action per guest and bulk for missing-email/phone guests
- [ ] Generate tokenized link (guest-specific, expiring)
- [ ] Public form fields:
  - email (optional)
  - phone (optional)
  - consent checkbox for SMS (if phone provided)
- [ ] Save to guest record + write guest audit log entry
- [ ] Optional immediate RSVP handoff CTA after submit
- [ ] Rate-limit + basic abuse protection

Nice-to-have:

- [ ] Reminder automation to re-send contact request to unresolved guests
- [ ] “Contact completion rate” KPI in Guests dashboard
