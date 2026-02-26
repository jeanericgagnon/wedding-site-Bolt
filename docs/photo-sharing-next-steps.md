# Photo Sharing — Next Steps (Phase 3 backlog)

## High-impact product additions

1. **Per-album cover + title lock**
   - Let couples choose a cover image from uploads
   - Freeze title after sharing to avoid guest confusion

2. **Moderation controls**
   - Soft-hide uploads from dashboard
   - Mark flagged uploads
   - Optional delete from Drive action

3. **Guest UX polish**
   - Drag/drop upload area
   - Better progress bars + retry per file
   - Success page with "Upload more" and event context

4. **Analytics**
   - Uploads per album over time
   - Unique contributors
   - Peak upload windows

5. **Abuse controls**
   - Token/IP upload velocity limits
   - Optional CAPTCHA toggle for public uploads
   - Optional domain allowlist for uploader emails

## Technical hardening

- Move token hashing into shared helper used by all photo functions
- Add structured error codes from edge functions
- Add end-to-end smoke script for upload flow
- Add migration sanity guard to verify required tables before dependent migrations

## Nice-to-have integrations

- Auto-create album links when itinerary events are created
- Message template gallery for photo-sharing announcements
- Optional thank-you auto-reply email to uploader (if email provided)
