# Public Access Residual Audit

_Updated:_ 2026-05-08 11:24 AM PT

## Scope

This audit covers the guest-visible public access surfaces most likely to leak oversized or private site payloads after the `public-site-access` render-model minimization pass.

## Current Browser Readers

Approved browser readers of public site access:

1. [src/pages/SiteView.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/SiteView.tsx)
   - Uses `fetchPublicSiteAccess({ ... })`
   - Consumes `render_model`
   - No direct browser table reads

2. [src/pages/VaultContribute.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/VaultContribute.tsx)
   - Uses `fetchPublicSiteAccess({ ... })`
   - Reads only the minimal site access contract needed for vault contribution window/couple context
   - No direct browser table reads

3. [src/sections/components/RsvpSection.tsx](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/sections/components/RsvpSection.tsx)
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

- No direct browser `supabase.from('wedding_sites')` reads remain in the audited guest/public route set covered by [src/lib/publicGuestSurfaceBoundary.test.ts](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/lib/publicGuestSurfaceBoundary.test.ts).
- Browser-side public translation fallback was removed from the public site lane.
- `public-site-access` now returns a server-built `render_model` instead of raw `site_json`, `published_json`, `wedding_data`, or `layout_config` blobs.

## Remaining Open Items

1. `interactive-section-public` deploy state still needs final alignment in the launch board.
2. `vault-contribution-public` deploy state still needs final alignment in the launch board.
3. Secure-env proof remains outside this audit and still blocks production readiness.

## Evidence

- `npm run proof:v1:public-access-coverage`: PASS
- `npm test -- --run src/lib/publicGuestSurfaceBoundary.test.ts`: PASS
