# Builder Strict Parity — Final Visual Acceptance Checklist

Use this as a fast pass/fail list against `wedding-site-builder` reference UI.

## 1) Primary Builder header + nav
- [ ] Header title/subtitle style matches reference hierarchy
- [ ] Primary nav buttons (Templates / Variants / Manifest) match reference weight, radius, spacing
- [ ] Active button state uses reference-like prominence

## 2) Template Gallery shell
- [ ] Panel width feels equivalent to reference layout density
- [ ] Header title + subtitle typography matches reference
- [ ] Search/filter row vertical rhythm matches reference
- [ ] Grid density (1/2/3 columns by breakpoint) feels reference-like

## 3) Template cards
- [ ] Card border/shadow/hover elevation matches reference subtlety
- [ ] Metadata ordering and readability match reference scan pattern
- [ ] CTA labels and button prominence are consistent

## 4) Template modals (details/compare/confirm/success)
- [ ] Modal backdrop intensity and card surface feel consistent
- [ ] Header/copy hierarchy aligns to reference
- [ ] Primary/secondary actions align visually with reference behavior

## 5) Variant browsing surface
- [ ] Variant picker header framing and count affordance match reference intent
- [ ] Variant list scanability and spacing match reference rhythm
- [ ] Hover/active/focus states are subtle and consistent

## 6) Interaction consistency
- [ ] Escape closes top-most layer first in gallery stack
- [ ] Tab switching does not produce stale overlays or dead-end states
- [ ] Keyboard hints feel present but non-intrusive

## 7) Responsive check
- [ ] Narrow-width controls do not collapse awkwardly
- [ ] Mid-width grid transitions are clean
- [ ] Mobile and desktop maintain same visual language

## 8) Functional parity guard (must remain green)
- [ ] Use Template flow applies template and returns to editor context
- [ ] Existing content-preservation behavior remains intact
- [ ] Variant selection and apply behavior unchanged
- [ ] Publish/save/topbar flows remain reachable and functional
