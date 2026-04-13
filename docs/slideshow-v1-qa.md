# Slideshow v1 QA

Date: 2026-04-13

## Scope tested
Feature surface:
- `src/pages/dashboard/GuestPhotoSharing.tsx`
- slideshow entry point
- slideshow assembly preview
- theme presets
- preview/export flow

## QA scenarios

### 1. Empty state
Expected:
- if there are no active albums with 3+ visible uploads, slideshow builder should show a clear blocked state

Observed from code:
- handled
- builder shows explicit message instead of broken UI

### 2. Small photo set
Expected:
- one qualifying album should still build a usable slideshow
- ordering modes should still work

Observed from code:
- handled
- single qualifying album works through album filter and frame generation path

### 3. Large photo set
Expected:
- avoid absurdly large preview lists
- keep UI responsive

Observed from code:
- handled reasonably
- frame list is capped at 24 entries

### 4. Moderation safety
Expected:
- hidden or flagged uploads should not appear in slideshow output by default

Observed from code:
- handled
- slideshow input excludes hidden and flagged uploads

### 5. Theme switching
Expected:
- theme changes should affect preview styling without breaking frame generation

Observed from code:
- handled
- theme only changes presentation layer

### 6. Export flow
Expected:
- export should include enough metadata to reconstruct the slideshow plan later

Observed from code:
- handled
- payload includes theme, order, album filter, frame count, and frames

## Remaining weak spots
- no actual image thumbnails in slideshow cards yet
- no persistent saved slideshow config yet
- no rendered video/export asset yet
- shuffled mode is stable but simplistic

## Safe conclusion
Slideshow v1 is in decent shape as a planner-side prototype.
It is good enough to count as a real shipped step for section 8, but not a finished media product.

## Next step
- move to 8.2 anniversary email flow
