# Deploy Runbook — Address / Reminders / Check-In Batch

## 1) Apply DB migrations

Run in order (oldest first):

1. `20260302010000_add_guest_mailing_address_fields.sql`
2. `20260302013000_add_guest_reminder_last_sent_at.sql`
3. `20260302014500_add_wedding_site_reminder_settings.sql`
4. `20260302020000_add_guest_checkin_fields.sql`

## 2) Verify app health gate before deploy

- `npm run hardpass:rsvp`

This includes:
- unit tests
- build
- strict RSVP smoke
- CSV mapper guard
- check-in guard

## 3) Deploy

- `npm run deploy:prod`

## 4) Post-deploy smoke

- `npm run smoke:web`
- `npm run smoke:site testandkaras`

## 5) Feature verification checklist

### Address collection
- Guest contact page accepts mailing address
- Missing Address filter decreases after submission
- Export addresses CSV includes new fields

### Reminder cadence
- Cadence preset persists (1/3/7)
- Auto reminders toggle persists
- Due Reminder segment updates by cadence
- Send due reminders updates `reminder_last_sent_at`

### Check-in mode
- Check-in mode toggle active
- Unchecked guests sorted first
- Check-in timestamp shown in-row
- Undo last check-in works
- Export checked-in guests works
- Clear all check-ins works with confirmation

## 6) Rollback (fast)

If UI issue appears, revert app code to pre-batch commit while keeping additive DB columns.
