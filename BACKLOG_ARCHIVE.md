# Backlog Archive

This file holds backlog detail that is intentionally not part of the active "work to go" board in [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md).

Use this archive for:
- deferred future product ideas
- detailed resolved-history context
- prior closeout notes that should not crowd the active board

Do not treat this file as the active launch board.

## Deferred / Future Product Detail

### Universal Registry Barcode Scanner

- status:
  - `DEFERRED / FUTURE REGISTRY ENHANCEMENT`
  - not launch scope
  - do not change launch gates, runtime, or dependencies until this is explicitly approved as a future implementation project
- positioning:
  - “Add anything to your wedding registry — scan it in-store, paste a link online, or create a cash fund.”
  - supports the universal-registry product stance: no store lock-in, no forced retailer funnel, no affiliate-first UX
- user flow:
  1. couple opens `Registry`
  2. couple chooses `Add Item`
  3. options appear:
     - `Scan barcode`
     - `Paste product link`
     - `Add manually`
     - `Create cash fund / group gift`
  4. if `Scan barcode` is chosen:
     - request browser camera permission
     - detect UPC/EAN/GTIN/ISBN locally in the browser
     - require stable detection of the same code `2-3` times before lookup
     - validate barcode/checksum client-side
     - send one confirmed barcode to a Supabase Edge Function
  5. Edge Function:
     - normalize barcode
     - read local cache first
     - read miss-cache second
     - optionally check open/free sources
     - call cheapest paid UPC provider only on cache miss
     - store successful lookups in cache
     - store failed lookups in miss-cache for `7-30` days
     - return safe normalized product data only
  6. app shows editable confirmation card:
     - product name
     - brand
     - image
     - estimated price
     - barcode
     - possible retailer/store links
     - confidence/source
  7. couple chooses:
     - best price
     - specific retailer link
     - paste another product link
     - add without store
     - edit manually
  8. registry item is saved only after explicit confirmation
- architecture:
  - frontend barcode detection must stay free and client-side
  - never call paid barcode providers directly from the browser
  - all provider lookups go through a Supabase Edge Function
  - provider/API keys stay server-side only
  - cache aggressively so the same barcode is not paid for repeatedly
- suggested scanning stack:
  - prefer native `BarcodeDetector` when supported
  - fallback to `ZXing` or `html5-qrcode`
  - always include manual barcode entry fallback
  - support first:
    - `UPC-A`
    - `UPC-E`
    - `EAN-13`
    - `EAN-8`
    - `GTIN-14`
    - `ISBN`
  - do not overbuild obscure barcode formats for V1
- provider ladder / cost control:
  1. local product cache
  2. open/free sources
  3. `UPCDatabase.org`
  4. `ProductSource` or `UPCitemdb`
  5. manual add when no confident match exists
  - provider options to evaluate later:
    - `UPCDatabase.org` for low cost
    - `ProductSource` for richer retail data
    - `UPCitemdb` as established cheap fallback
    - `Barcode Lookup` only as richer premium fallback
    - `Go-UPC` as another optional backup
  - hard rules:
    - do not call a provider for every camera frame
    - only call once per confirmed stable barcode
    - cache successful lookups long-term
    - cache failed lookups `7-30` days
    - add per-user and per-site rate limits before enabling
- data model ideas:
  - `registry_product_cache`
    - `barcode`
    - `normalized_gtin`
    - `title`
    - `brand`
    - `image_url`
    - `category`
    - `description`
    - `price_cents`
    - `currency`
    - `product_url`
    - `selected_retailer`
    - `provider`
    - `confidence_score`
    - `raw_payload`
    - `first_seen_at`
    - `last_seen_at`
    - `lookup_count`
  - `registry_barcode_misses`
    - `barcode`
    - `attempts`
    - `last_attempt_at`
    - `last_provider`
    - `last_error`
  - future registry item additions may also need:
    - `barcode`
    - `source_type` (`barcode` / `link` / `manual` / `cash_fund`)
    - `selected_retailer`
    - `selected_product_url`
    - `estimated_price_cents`
    - `image_url`
    - `product_metadata`
- confidence rules:
  - `100`: exact barcode with title, image, brand, and retailer links
  - `85`: exact barcode with title and image
  - `70`: exact barcode with title only
  - `50`: weak product match or missing important fields
  - `0`: no match
  - if confidence is below `70`, force manual review before add
- pricing rules:
  - do not promise live exact price in V1
  - use `Estimated price`
  - prefer `sale_price`, then retailer price, then MSRP, else blank/manual
- image rules:
  - prefer best provider image
  - reject tiny/broken images where possible
  - allow user replacement/upload
  - use placeholder when no image is available
- retailer/store rules:
  - barcode identifies the product, not the store
  - if multiple store offers exist, show choices
  - if no retailer URL exists, let the couple paste one
  - store selected product URL separately from the barcode
- MVP scope for the future scanner V1:
  - mobile-first scan UI
  - barcode detection
  - manual barcode entry
  - cache-first lookup Edge Function
  - editable confirmation card
  - manual fallback
  - save registry item with barcode/product metadata
- out of scope for the first scanner version:
  - live price tracking
  - inventory tracking
  - automatic purchase confirmation
  - browser extension
  - retailer checkout integration
  - affiliate routing automation
  - advanced price comparison
  - AI product matching
  - native mobile app
- risks:
  - barcode provider data can be stale or wrong
  - images can be missing or poor quality
  - prices can be stale or retailer-specific
  - private-label / in-store items may not resolve
  - browser camera support varies
  - abuse can create lookup costs without rate limits
  - wrong product matches hurt trust, so confirmation must remain required
- open questions before implementation:
  - which provider ladder has the best real-world cost/quality mix?
  - what cache TTL should successful lookups use by default?
  - should registry cache raw payloads be fully retained, partially normalized, or truncated?
  - how should manual overrides interact with later provider refreshes?
  - do we want barcode scan analytics/audit for cost tracking from day one?
  - should store-link selection live on the item itself or in a separate offer/options structure?

### Other Deferred / Non-Launch Items

- `external custom domains`
  - product truth still does not support arbitrary external custom domains
  - `.dayof.love` subdomain routing is now live-proven separately and is no longer deferred
  - required before enabling:
    - real custom-domain product support
    - host-resolution/runtime proof for owned external domains
    - updated claims matrix and launch docs that distinguish supported `.dayof.love` routing from future external-domain support
- `registry owner edit/import manual truth notes`
  - automated registry proof is green for public/runtime truth guards; owner import/repair persistence notes remain a manual follow-up, not a launch blocker
- `SMS/Telnyx live provider send`
  - provider setup is intentionally outside the launch-hardening gate
- `AI server secret inventory / internal OPENAI prereq`
  - not required for the current public launch gate
- `runtime operator-note checklist`
  - centralized in [docs/v1-runtime-operator-notes-checklist.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-runtime-operator-notes-checklist.md)
  - rerun with `npm run proof:v1:runtime-note-checklist` when the human operator note pack changes

## Archived Resolved Detail

### Critical Resolved This Wave

- `P1-04 Public section DTO minimization` -> `RESOLVED`
  - every `SectionType` now flows through explicit public DTO construction in `src/lib/publicRenderContract.ts`
  - remaining guest families were finished in the final pass: `venue`, `schedule`, `registry`, `faq`, `menu`, `music`, `directions`, `video`, `quotes`, and `custom`
  - stale builder aliases are normalized into renderer-facing fields, then stripped from the public output
  - nested arrays/items are explicitly shaped for venues, schedule events/days, registry links/gifts, FAQ items, menu sections/courses/items, music songs/playlists, directions transport rows, video cards, quote entries, and custom blocks
  - broad `bindings`, `locked`, meta timestamps, and raw `styleOverrides` are no longer passed through generically
  - focused DTO tests are green on both server and client paths
- `P1-09 Deployment / proof truth canonicalization` -> `RESOLVED`
  - branch, commit, deploy, live-proof, and secure-proof truth are now recorded in one canonical board
  - contradictory old SHAs/deploy IDs are removed
  - each launch-relevant surface is now classified with an exact status, proof command, and remaining gap
  - exact runtime Git SHA is documented honestly as unrecoverable for the current working-tree production deploy instead of being guessed
- `P1-03 Layout config fallback removal or hard gate` -> `RESOLVED`
  - production inventory showed `0` published rows using the legacy flag
  - the public `layout_config` fallback path is gone
- `P1-06/P1-07 secure proof lanes` -> `RESOLVED`
  - secure service-role, storage/media, and queue containment are green
  - secure email queue-processing containment is green
- `P1-10 Guest contact update public runtime auth mismatch` -> `RESOLVED`
  - forced a real lookup function version bump
  - redeployed `guest-contact-lookup --no-verify-jwt`
  - `npm run proof:v1:guest-lookup-scope` now passes exact-match lookup, fail-closed mismatches, signed contact-session issuance, and household-scoped submit/update

### Resolved Work Summary

- Public access fail-closed:
  - removed raw public blob exposure, removed public browser `sections` fallback, removed `layout_config` fallback
- Public DTO hardening:
  - explicit section-family allowlists for all `SectionType` values
  - explicit nested DTO shaping
  - section-scoped bindings only
  - explicit public style override keys only
- RSVP/session hardening:
  - published wedding snapshot precedence fixed
  - live RSVP lookup/submit proof green
- Public subresource gating:
  - guest hub write/read proof green
  - registry preview SSRF proof green
- Service-role / queue / storage containment:
  - secure service-role proof green
  - secure email queue-processing proof green
  - live photo upload/readback/analysis/recap/moderation proof green
- Validation / CI:
  - full `npm test` suite green
  - local launch gate green
  - board generation green
  - smoke lane green
- Internal tooling route hardening:
  - `/builder-v2-lab`, `/variant-preview-capture`, and `/template-scroll-capture` are now disabled in production unless `VITE_ENABLE_INTERNAL_TOOLING_ROUTES=true`
  - public template pages no longer advertise internal capture routes when that gate is off

### What Changed In This Final Closeout

- Closed the public vault contribution deferred lane:
  - `vault-contribution-public` and `vault-entry-submit` are confirmed in live inventory
  - live save/readback/delete proof is now green
  - the temporary `ALLOW_VAULT_QA_OPEN` proof secret was immediately reset to `false`
- Closed the `.dayof.love` host-routing deferred lane:
  - added `npm run proof:v1:subdomain-route`
  - live host proof is green for `testandkaras.dayof.love`
  - current runtime resolves and fail-closes safely without wrong-site leakage
- Reframed external custom domains into the honest product truth:
  - unsupported future scope, not an open launch-proof debt item
- Synced the launch board, production hardening report, smoke log, and changelog to that sharper runtime truth.
- Added a stronger local-only guest-contact household gate:
  - full-name + email fragment still resolves the signed contact session
  - `apply_household` now additionally requires a phone-last-4 verifier in local code and proof
  - live `guest-lookup-scope` still reflects the pre-deploy runtime until the guest-contact functions are redeployed
- Added enterprise-style security automation to the repo:
  - `.github/dependabot.yml`
  - `.github/workflows/semgrep.yml`
  - `.github/workflows/codeql.yml`
  - `.github/workflows/gitleaks.yml`
  - local guard `npm run proof:v1:security-automation`
- Reduced route-registry maintenance risk:
  - `App.tsx` now composes grouped route modules instead of hand-owning the whole route tree inline
