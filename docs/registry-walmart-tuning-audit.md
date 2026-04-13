# Walmart Registry Tuning Audit

Date: 2026-04-13

## Current state
Walmart has a dedicated adapter already, which makes it more grounded than merchants still relying on generic fallback. But product truth should still stay conservative because Walmart pages can degrade or shift in ways that break preview quality.

## Grounded current truth
What exists now:
- Walmart adapter exists in `supabase/functions/registry-preview/walmartAdapter.ts`
- tests already exist for Walmart adapter behavior
- product truth already says Walmart may require manual detail entry

## Likely current weak points

### 1. Price extraction can still be fragile
Common risks:
- sale/strike/list-price drift
- duplicated price nodes
- hidden or partially rendered price blocks

### 2. Product-title extraction needs conservative fallback behavior
Walmart pages can surface:
- noisy title wrappers
- duplicated marketing text
- degraded document titles in fallback cases

### 3. Image selection may still choose a poor candidate
Risks include:
- thumbnails instead of clean hero images
- lazy-loaded assets
- placeholder or low-resolution image nodes

### 4. Merchant-specific failure messaging should stay explicit
Even with an adapter, support quality is not the same as guaranteed success.
The UI should keep making it obvious that:
- link save is still useful
- manual cleanup is normal when extraction is incomplete

## Safe product truth
Safe claim:
- DayOf supports Walmart registry links with merchant-aware extraction, but some items may still need manual cleanup.

Unsafe claim:
- DayOf can reliably autofill Walmart item details every time.

## Recommendation for the next real tuning pass
1. Re-read Walmart adapter + tests together
2. Harden title and price fallbacks
3. Tighten image candidate selection
4. Expand degraded-response tests before increasing confidence language
