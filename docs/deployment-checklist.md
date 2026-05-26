# Deployment Checklist

Run this before every production deployment.

## Release Readiness Refresh — 2026-05-26

### Current Branch Truth

- `main` is clean and synced with `origin/main`
- latest merge on `main`: `151354afb` (`Merge pull request #94 from jeanericgagnon/codex-deploy-readiness-main-audit`)
- latest `main` hardpass GitHub run: `success`

### Current Audit Results

| Check | Result |
|---|---|
| `npm run build` | PASS |
| `npm run test:security` | PASS |
| `npm run proof:v1:strict-pocket` | PASS |
| `npm run smoke:registry` | PASS |
| `npm run test:smoke` | PASS |
| Fresh worktree `npm ci` | PASS |
| Fresh worktree `npm run typecheck -- --pretty false` | PASS |

### Deploy Readiness Call

**GO, with one environment note**

- The launch-blocking registry smoke drift and missing barcode lookup lane were repaired in PR #94.
- Current `main` passed the launch-critical local and live-smoke audit after those repairs.
- A fresh-install typecheck pass confirmed the earlier local checkout typecheck failure was environment contamination, not repo source truth.
- Local `npm ci` on Node 22 surfaced an engine warning from `@zxing/library`, while GitHub hardpass already uses Node 24. Prefer deploying and CI-verifying on the Node 24 lane.

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
