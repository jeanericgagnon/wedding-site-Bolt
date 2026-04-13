# Target Registry Tuning Audit

Date: 2026-04-13

## Current state
Target is another high-value registry merchant, but its pages are inconsistent enough that DayOf should treat preview extraction as best-effort rather than guaranteed autofill.

## What already exists
- Target adapter exists in `supabase/functions/registry-preview/targetAdapter.ts`
- tests already exist for the adapter
- product truth already says Target may require manual detail entry

## Likely current weak points

### 1. Registry vs product-page shape drift
Target content can differ between:
- registry listing pages
- product pages
- app/mobile variants
- dynamically rendered content blocks

### 2. Price parsing may over-trust one layout
Common failure risks:
- sale pricing vs regular pricing
- hidden duplicate price nodes
- absent price nodes in degraded responses

### 3. Image and merchant metadata selection can be noisy
Potential weak spots:
- promotional images instead of the clean product image
- category/store labeling that is incomplete or misleading

### 4. Link normalization and merchant identity should stay strict
Target URLs often carry params and alternate forms that can weaken:
- dedupe quality
- repair/re-import consistency
- preview reliability expectations

## Safe product truth
Safe claim:
- DayOf supports Target registry links, but some Target items may need manual cleanup.

Unsafe claim:
- DayOf can reliably autofill Target item details every time.

## Recommendation for the next real tuning pass
1. Re-read adapter + tests together
2. Harden registry-page versus product-page fallbacks
3. Tighten defensive price parsing
4. Improve image selection conservatively
5. Expand Target-specific test cases before claiming higher reliability
