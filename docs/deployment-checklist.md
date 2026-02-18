# Deployment Checklist

Run this before every production deployment.

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
| `SiteView.tsx` | `is_published` confirmed as sole gate — no draft fallback |
| `publishProject` | Confirmed atomic `site_json → published_json` snapshot |
| `Vault.tsx` | Replaced fake interactive controls with clean "Coming Soon" page |
| `Messages.tsx` | Honest "Queued" delivery language, background processing note |
| Builder TopBar | 5 distinct save/publish states with accurate visual indicators |
| Registry | `increment_registry_purchase` RPC wired, `hide_when_purchased` enforced |
| Itinerary | Time overlap conflict detection added |
| Guests | Two-click delete with inline confirm state |

### Launch Recommendation

**GO with one known caveat**

The application is functionally ready for launch:
- All automated gates pass cleanly
- No broken routes or dead-end controls
- Product truth model is deterministic (`is_published` sole gate)
- Registry purchases are safe and rate-limited
- All "coming soon" features are clearly labeled with no fake controls

**Known caveat:** Messages in the `messages` table are inserted with `status='sent'` but no background email delivery worker is running. Guests will not receive actual emails at this time. The UI is honest about this ("queued for delivery"), but the delivery infrastructure is not yet wired. This is an accepted pre-launch state — the feature is usable for scheduling and drafting; live delivery requires connecting an email service (Resend, SendGrid, etc.).
