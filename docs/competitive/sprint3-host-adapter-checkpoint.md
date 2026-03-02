# Sprint 3 Host-Adapter Lane Checkpoint

## Objective
Improve registry URL preview reliability and diagnostics using retailer-specific adapter logic and normalized metadata quality signals.

## Completed in this lane

### Adapter coverage
- Added and wired dedicated adapters:
  - Amazon
  - Walmart
  - Target (existing, now parity-hardened)
- Adapter chain now routes Target/Amazon/Walmart before generic fallback.

### Data quality hardening
- Added price sanitization guard across major adapters:
  - rejects implausible values (< $1 or > $10,000)
- Added availability normalization to stable states:
  - `in_stock`
  - `low_stock`
  - `out_of_stock`
  - `unknown`
- Added confidence normalization in preview baseline:
  - source-method priors
  - missing-field penalties
  - bounded final confidence score for predictable UI interpretation

### Diagnostics/observability
- Cache now persists normalized retailer slug in `registry_url_cache` entries.
- Registry item metadata expanded to include source diagnostics:
  - `metadata_source_method`
  - `metadata_retailer`
- Registry UI now surfaces source/retailer badges on item cards for admin triage.

### Testing
- Added adapter unit test files for Amazon/Walmart parsing and fallback behavior.
- Note: direct `deno test` execution was unavailable in this environment (no local deno binary), but tests are committed and ready for CI/host execution.

## Validation status
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run smoke:rsvp:strict` ✅
- `npm run smoke:checkin` ✅
- `npm run smoke:csvmapper` ✅

## Remaining partials (host-adapter lane)
1. Add CI hook to execute `supabase/functions/registry-preview/*.test.ts` with Deno runtime.
2. Add richer retailer-specific availability parsing for edge phrases (backorder/preorder/delivery windows).
3. Add periodic quality telemetry summary (confidence distribution by retailer/source method).

## Recommended next step
- Wire Deno adapter tests into CI first, then expand availability phrase mapping with retailer fixtures.
