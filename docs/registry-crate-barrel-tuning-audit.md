# Crate & Barrel Registry Tuning Audit

Date: 2026-04-13

## Current state
Crate & Barrel / CB2 matters enough for registry credibility, but the current codebase does **not** appear to have a dedicated Crate & Barrel adapter yet.

## Grounded current truth
What exists now:
- domain normalization already recognizes `crateandbarrel.com` and `cb2.com`
- there is **no** dedicated `crateandbarrelAdapter.ts` in `supabase/functions/registry-preview/`
- current behavior is therefore likely falling back to the generic extraction path

## Why this matters
A generic fallback may save the link, but it is weaker for:
- reliable product title extraction
- price parsing
- clean image selection
- merchant-specific recovery guidance

## Safe product truth
Safe claim:
- DayOf can accept Crate & Barrel / CB2 links, but item details may need manual cleanup.

Unsafe claim:
- DayOf already has strong merchant-specific Crate & Barrel autofill support.

## Real weak point
This is not just a tuning problem.
Right now it looks more like a **missing dedicated merchant adapter** problem.

## Recommendation for the next real pass
1. Decide whether Crate & Barrel deserves a dedicated adapter now
2. If yes, add merchant-specific extraction + tests
3. If not, keep claims narrow and strengthen generic fallback truth in product copy/docs
4. Treat CB2 as part of the same merchant family unless grounded evidence says otherwise
