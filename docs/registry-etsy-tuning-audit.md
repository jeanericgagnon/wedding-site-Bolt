# Etsy Registry Tuning Audit

Date: 2026-04-13

## Current state
Etsy support appears partly grounded already, but still leans heavily on generic extraction plus Etsy-aware fallback title behavior rather than a dedicated adapter.

## Grounded current truth
What exists now:
- URL normalization recognizes `etsy.com`
- fallback-title behavior explicitly supports Etsy-style listing slugs
- registry UI already warns that Etsy usually imports well but should still be reviewed
- there is **no** dedicated `etsyAdapter.ts` in `supabase/functions/registry-preview/`

## Why Etsy is different
Etsy often gives better slug-level title recovery than some other merchants, which makes fallback behavior more useful.
But Etsy still has weaknesses around:
- exact pricing
- variant-specific item truth
- image consistency
- seller/store metadata quality

## Safe product truth
Safe claim:
- DayOf handles Etsy links better than a blind generic fallback in some cases, but Etsy items should still be reviewed before save.

Unsafe claim:
- DayOf has full dedicated Etsy autofill reliability.

## Real weak point
This is a mixed case:
- stronger than an unknown merchant because Etsy-aware fallback exists
- weaker than a real merchant-specific adapter because dedicated extraction is missing

## Recommendation for the next real pass
1. Decide whether Etsy merits a dedicated adapter or just stronger fallback coverage
2. Expand Etsy-specific tests around slug titles, pricing loss, and image fallback
3. Keep UI guidance honest: “usually imports well” is okay, “fully reliable” is not
