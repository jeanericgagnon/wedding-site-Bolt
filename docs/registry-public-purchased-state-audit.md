# Registry Public Purchased-State Audit

Date: 2026-04-13

## Grounded current truth
The dashboard clearly models purchased state, partial state, and hide-when-purchased behavior.
The public site registry section, however, appears much simpler and mostly link-based.

## What this means
There is likely a real alignment gap between:
- dashboard purchase tracking truth
- guest-facing purchased visibility truth

## Current strengths
- internal registry items track purchase status and hide-when-purchased
- dashboard cards visibly reflect purchased status
- owner-side tracking is meaningfully real

## Likely public-side weak points

### 1. Public purchased visibility rules may not be explicit enough
It is not obvious from the guest-facing registry section whether purchased items are:
- hidden
- still shown but marked
- partially shown for quantity-based gifts
- handled differently for cash funds

### 2. Public section appears structurally shallower than dashboard truth
The guest-facing section looks more like:
- registry links
rather than a full purchased-state-aware item presentation layer.

### 3. Couples could over-assume public behavior
Because the dashboard tracks purchase state in detail, a couple might assume guests see the same logic publicly when they may not.

## Safe product truth
Safe claim:
- DayOf tracks purchased state internally and supports hide-when-purchased behavior, but guest-facing registry visibility should be described carefully until dashboard/public alignment is verified.

Unsafe claim:
- DayOf already gives guests fully aligned, nuanced purchased-state behavior across all registry presentations.

## Recommended next moves
1. Clarify the real public purchased-state rules
2. Make dashboard wording reflect what guests actually see
3. Tighten guest-facing purchased-state copy only after runtime alignment is verified
