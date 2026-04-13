# Amazon Registry Tuning Audit

Date: 2026-04-13

## Current state
Amazon is one of the highest-value merchants to get right, but it is also one of the least cooperative for automated extraction.

## What already exists
- Amazon adapter exists in `supabase/functions/registry-preview/amazonAdapter.ts`
- tests already exist for the adapter
- product truth already acknowledges that Amazon blocks some automated lookups and may require manual title/price entry

## Likely current weak points

### 1. Product-title extraction is brittle
Amazon pages vary heavily across:
- product pages
- registry pages
- mobile HTML
- anti-bot / degraded HTML

That means title fallbacks need to stay strong and conservative.

### 2. Price extraction can be unstable
Amazon often changes:
- selector naming
- price block layout
- sale vs list-price structure
- hidden / duplicated price nodes

### 3. Image extraction can degrade easily
Amazon often serves:
- deferred image payloads
- non-primary image candidates
- noisy thumbnails

### 4. URL normalization matters a lot
Amazon URLs are messy and often include:
- tracking params
- variant params
- mobile paths
- shortened forms

Normalization quality strongly affects dedupe and consistent previews.

## Safe product truth
Safe claim:
- DayOf supports Amazon registry links, but some entries may need manual detail cleanup.

Unsafe claim:
- DayOf reliably and completely autofills Amazon items every time.

## Recommendation for the next real tuning pass
1. Re-read adapter + tests together
2. Tighten title fallback ordering
3. Tighten price parsing defensively
4. Tighten image fallback selection
5. Expand Amazon-specific tests before claiming better reliability
