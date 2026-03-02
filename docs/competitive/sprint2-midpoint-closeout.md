# Sprint 2 Midpoint Closeout (Builder + Registry + Template Conversion)

## Scope completed this phase

### 1) Registry quality & remediation workflow
- Image source transparency shipped end-to-end:
  - item card badges: Direct / Auto / Fallback / Missing
  - form-level source hinting while editing
- Recovery actions shipped:
  - re-fetch from product URL
  - clear image URL
  - focus image issues mode
  - bulk refresh image-issue items (summary toast)
  - inline “Fix image issues now” action in remediation mode
- Bulk import diagnostics hardened:
  - imported vs skipped counts
  - invalid URL counts
  - skipped examples (invalid/fetch-failed)

### 2) Builder publish checklist hardening
- Checklist evolved from passive status to action rail:
  - Save / Fix / Add page / Add section / Pages actions
- Blocked publish click now reveals checklist + blocker details (no dead click)
- Ready-state polish:
  - auto-collapse when all checks pass
  - safer fallbacks when no active page exists

### 3) Template detail conversion layer
- Confidence modules expanded:
  - desktop/mobile preview cards
  - trust chips
  - fast-start steps
  - switch-later reassurance
  - similar templates strip

## Validation status
- typecheck ✅
- build ✅
- smoke:rsvp:strict ✅
- smoke:checkin ✅
- smoke:csvmapper ✅

## Remaining partials (priority)
1. **Template detail conversion tightening**
   - Add direct “Use this” action in similar-template cards
   - Add module-count/comparison cue between current and similar templates
2. **Template gallery depth polish**
   - Optional quick compare mode (2 templates side-by-side metadata)
3. **Builder checklist depth**
   - Optional “jump to failing section” if publish blocker maps to section-level validation
4. **Registry host adapters (future-depth)**
   - host-specific extraction quality boost (Amazon/Target/Walmart-specific handling)

## Recommended next immediate batch
- Implement #1 fully (highest conversion impact, low effort), then run build/typecheck and targeted manual sanity.
