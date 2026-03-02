# Rollout Checklist — Address Collection + Reminder Cadence + Check-In Lite

## Scope commits

- `ae068b0` address collection fields + guest self-service form
- `9beeb0c` mailing address export in Guests actions
- `e52c0b0` missing-address segment + quick copy address link
- `53397fc` due-reminder segment + cadence presets
- `aac17ad` reminder_last_sent_at + send-due-now action
- `28d7f33` persisted reminder cadence/auto settings
- `7f5a516` check-in fields + checked-in segment + quick toggle
- `4424c67` check-in mode toolbar + larger check-in action
- `a192826` checked-in export + clear-all check-ins
- `a4d0846` undo last check-in helper/banner

## Required migrations (in order)

1. `20260302010000_add_guest_mailing_address_fields.sql`
2. `20260302013000_add_guest_reminder_last_sent_at.sql`
3. `20260302014500_add_wedding_site_reminder_settings.sql`
4. `20260302020000_add_guest_checkin_fields.sql`

## Pre-deploy checks

- `npm run typecheck`
- `npm run build`
- `npm run hardpass:rsvp`

## Post-deploy verification

### Address collection

1. Open guest contact update link
2. Submit mailing address fields
3. Confirm guest row now has mailing fields in DB
4. In Guests, confirm:
   - Missing Address count decreases
   - Export addresses (mailing) includes submitted values

### Reminder cadence

1. Set cadence to 1/3/7 days in Guests actions
2. Refresh page; confirm cadence persists
3. Toggle auto reminders on/off; refresh and confirm persisted
4. Confirm Due Reminder segment count changes with cadence logic
5. Use Send due reminders now and verify reminder_last_sent_at updates

### Check-in mode

1. Toggle Check-in mode ON
2. Check in multiple guests
3. Confirm Checked In filter count updates
4. Use Undo last check-in and verify status rollback
5. Export checked-in guests CSV and validate checked_in_at column
6. Run Clear all check-ins and confirm all statuses reset

## Rollback plan

- Revert app to commit prior to `ae068b0`
- If needed, keep migrations (non-breaking additive columns)
- Disable new actions in UI by reverting Guests.tsx only (fast mitigation)

## Notes

- All changes are additive and isolated to existing Guests/GuestContact flows.
- UI modernization from earlier batches remains untouched in this rollout.
