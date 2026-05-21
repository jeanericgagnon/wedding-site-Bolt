# Deployment Checklist

Run this before every production deployment.

## P0 Launch Proof Sequence

Run these in order:

1. `npm run typecheck -- --pretty false`
2. `npm run build`
3. `npm test`
4. `npm run smoke:rsvp:strict`
5. `npm run smoke:csvmapper`
6. `npm run smoke:checkin`
7. `npm run smoke:web`
8. `npm run proof:v1:collaborator-runtime`
9. `npm run proof:v1:service-role-authorization`
10. `npm run proof:v1:email-messaging-authorization`

Required env for this gate:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (email send lanes)
- `FROM_EMAIL` or `FROM_EMAIL_DOMAIN` (prod-like mode)
- `TWILIO_AUTH_TOKEN` (inbound SMS signature verification)
- optional `TWILIO_WEBHOOK_URL` (if validating against a fixed webhook URL)
- `ENABLE_GUEST_NAME_LOOKUP` should stay unset/false for token-only RSVP lookup mode

## Pre-Deploy Quality Gate

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — clean build, no warnings

## Environment Variables (Vercel / Netlify / Cloudflare Pages)

Set in your hosting dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | From Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | From Supabase → Settings → API |
| `VITE_GOOGLE_MAPS_API_KEY` | From Google Cloud Console (optional) |

Do **not** set `VITE_DEMO_MODE=true` in production.

## Database Migrations

- [ ] All migrations in `supabase/migrations/` have been applied in order
- [ ] RLS is enabled on all tables
- [ ] Edge functions are deployed (`registry-preview`)

## Edge Functions

- [ ] `registry-preview` is deployed and verified:
  ```
  POST https://<project>.supabase.co/functions/v1/registry-preview
  { "url": "https://amazon.com/dp/B001" }
  ```
  Expected: `{ title, price_label, ... }` or `{ error: "..." }`

## Post-Deploy Smoke Test

See `docs/smoke-test-checklist.md` for the manual QA matrix.

---

## Release Gate Pass — 2026-02-18

### Automated Gate Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run build` | Clean, no warnings |
| `npm test` | 126/126 passing |

### Key Fixes Applied This Pass

| Area | Fix |
|------|-----|
| `Guests.tsx` | Removed unused `AlertCircle` import (typecheck error) |
| `SiteView.tsx` | Published state is preferred, but draft/preview behavior still needs clearer truth-model wording |
| `publishProject` | Confirmed atomic `site_json → published_json` snapshot |
| `Vault.tsx` | Replaced fake interactive controls with clean "Coming Soon" page |
| `Messages.tsx` | Honest "Queued" delivery language, background processing note |
| Builder TopBar | 5 distinct save/publish states with accurate visual indicators |
| Builder publish attempts | Failed publish state keeps the latest attempt time visible so support is not guessing |
| Registry | `increment_registry_purchase` RPC wired, `hide_when_purchased` enforced |
| Itinerary | Time overlap conflict detection added |
| Guests | Two-click delete with inline confirm state |

### Launch Recommendation

**GO with one known caveat**

The application is functionally ready for launch:
- All automated gates pass cleanly
- No broken routes or dead-end controls
- Product truth now uses clearer Draft / Private Preview / Published language, but the underlying visibility model still deserves a stricter future refactor so product truth and runtime access behavior match completely
- Registry purchases are safe and rate-limited
- All "coming soon" features are clearly labeled with no fake controls

**Known caveat:** Message drafting and queueing exist, but delivery truth should always reflect the real configured send path, retry behavior, and current provider state.
