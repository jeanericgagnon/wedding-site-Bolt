# Photo Sharing Phase 2 Notes

## What changed

- Public upload form now accepts optional `guestEmail`
- Upload edge function validates email format and stores `guest_email`
- `photo_uploads` schema includes optional `guest_email` column
- Dashboard shows guest email in recent upload rows
- Dashboard supports per-album CSV export

## CSV columns

- `filename`
- `guest_name`
- `guest_email`
- `uploaded_at` (ISO)

## Operational status

- Migration: `20260226121000_add_guest_email_to_photo_uploads.sql`
- Function redeployed: `photo-upload`

## Manual QA quick pass

1. Open `/photos/upload?t=<token>` and upload with email
2. Verify upload appears in album recent list with email
3. Click **Export CSV** and confirm values match upload entries
