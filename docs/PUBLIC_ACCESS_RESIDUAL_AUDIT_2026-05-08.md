# Public Access Residual Audit

_Updated:_ 2026-05-11 08:36 AM PT

## Scope

This audit covers the guest-visible public access surfaces most likely to leak oversized or private site payloads after the final public boundary hardening pass.

## Current Browser Readers

Approved browser readers of public site access:

1. `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/SiteView.tsx`
   - Uses `fetchPublicSiteAccess({ ... })`
   - Consumes only the public `render_model`
   - Does **not** perform direct browser reads of persisted `sections`

2. `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/VaultContribute.tsx`
   - Uses `fetchPublicSiteAccess({ ... })`
   - Reads only the minimal site access contract needed for vault contribution window and couple context
   - No direct browser table reads

3. `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/sections/components/RsvpSection.tsx`
   - Uses `supabase.functions.invoke('public-site-access')`
   - Reads only `site.id` for submit scoping
   - No direct browser table reads

## Public Subresource Function Inventory

Static proof currently covers these public gate functions:

- `guest-contact-lookup`
- `guest-hub-config`
- `guest-hub-track`
- `guest-prospect-submit`
- `guest-recap-config`
- `guestbook-submit`
- `interactive-section-public`
- `photo-upload`
- `public-itinerary-by-slug`
- `public-registry-items`
- `public-site-rsvp-submit`
- `vault-contribution-public`
- `vault-entry-submit`
- `vault-upload-google-drive`

Resolver exception under direct audit:

- `public-site-access`

Signed-session exception under direct audit:

- `guest-contact-submit`

## Residual Findings

- No direct browser `supabase.from('wedding_sites')` reads remain in the audited guest/public route set.
- No direct browser `supabase.from('sections')` reads remain in the audited guest/public route set.
- Browser-side public translation fallback was removed from the public site lane.
- `public-site-access` no longer returns raw `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs.
- The deployed browser contract is shaped as minimized public `pages`, `wedding`, and `theme`.
- `wedding.meta`, `customCss`, `customClassName`, and `styleRecipeCss` are no longer part of the public DTO.
- Persisted published-section fallback now happens server-side inside `public-site-access`, using the same allowlisted page/section builder as normal public pages.
- `/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/supabase/migrations/20260511113000_remove_public_sections_visible_read.sql` removes the old anonymous/public `sections` read policy, and that migration was pushed remotely.
- The remaining launch blocker is now outside this audit's code surface:
  - secure service-role queue/storage deep proof
  - secure email queue-processing deep proof
  - both are blocked here by missing `SUPABASE_SERVICE_ROLE_KEY`

## Remaining Follow-Up Items

1. Run `npm run proof:v1:service-role-authorization` in a secure environment with `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `npm run proof:v1:email-messaging-authorization` in that same secure environment.
3. Re-run this audit only if public route code changes again or if a new public subresource is added.

## Evidence

- focused public DTO / leak / boundary tests: `PASS`
- `npm run proof:v1:public-access-coverage`: `PASS`
- `npm run typecheck -- --pretty false`: `PASS`
- `npm run lint -- --quiet`: `PASS`
- `npm run build`: `PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`: `LIVE PASS`
- `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`: `LIVE PASS`
- `npm run proof:v1:guests-rsvp-ops`: `LIVE PASS`
- `npm run proof:v1:service-role-authorization`: `PASS` for unauthenticated denial; deep secure lane still blocked on missing `SUPABASE_SERVICE_ROLE_KEY`
- `npm run proof:v1:email-messaging-authorization`: `PASS` for unauthenticated denial; deep secure lane still blocked on missing `SUPABASE_SERVICE_ROLE_KEY`
