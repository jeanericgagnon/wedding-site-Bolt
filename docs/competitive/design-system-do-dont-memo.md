# DayOf Design System Memo (Do / Don’t)

## Context
- We are benchmarked against top wedding platforms.
- We **do not** rely on upsells as a growth lever.
- Our edge = trustworthy all-in-one execution (site + RSVP + registry + day-of ops) with low friction.

---

## 1) Positioning & Messaging

### ✅ Do
- Lead with all-in-one confidence: “website + RSVP + registry + day-of”
- Keep copy plain and outcome-focused.
- Reassure users they can change templates/settings later.

### ❌ Don’t
- Don’t overuse feature-jargon (“advanced orchestration”, etc.).
- Don’t gate core reassurance behind tooltips or docs.
- Don’t imply hidden paid unlocks (we are no-upsell by design).

---

## 2) Information Architecture

### ✅ Do
- Keep primary intents always visible:
  - Start
  - Browse templates
  - Publish readiness
  - Day-of operations
- Surface operational tools where users expect them (not hidden deep).

### ❌ Don’t
- Don’t bury day-of/ops behind “more” menus only.
- Don’t create dead-end pages without a next CTA.

---

## 3) Visual Hierarchy

### ✅ Do
- Use one clear primary CTA per section.
- Use secondary/tertiary actions with quieter styling.
- Keep spacing generous around decision blocks.
- Use consistent tiny-text rules (`text-xs` default; only rare `text-[10px]`).

### ❌ Don’t
- Don’t put multiple competing primary buttons in one row.
- Don’t mix several micro-font sizes without clear reason.
- Don’t cram status chips, actions, and helper text into one line on mobile.

---

## 4) Template Discovery UX

### ✅ Do
- Keep card anatomy consistent:
  - preview
  - style/best-for tags
  - preview/use actions
- Provide fast filtering, sorting, and compare.
- In compare mode, explain meaning (legend + clear A/B orientation).

### ❌ Don’t
- Don’t show unstructured “wall of templates”.
- Don’t hide compare insights behind extra clicks.
- Don’t make users guess section-order differences.

---

## 5) Builder UX

### ✅ Do
- Canvas-first editing with single focused inspector.
- Keep publish checklist actionable (Save/Fix/Add page/Add section).
- Convert blocked publish into guided flow, never no-op.

### ❌ Don’t
- Don’t expose advanced controls by default.
- Don’t show blocker messages without immediate action path.
- Don’t trap users in modal loops when one click can unblock.

---

## 6) Registry UX (No-upsell trust model)

### ✅ Do
- Be transparent about image/data quality states:
  - Direct / Auto / Fallback / Missing
- Provide immediate recovery actions:
  - refresh metadata
  - focus image issues
  - bulk fix
- Explain skipped imports with examples.

### ❌ Don’t
- Don’t hide import failures behind generic “something went wrong”.
- Don’t require users to infer why an image is poor quality.
- Don’t mix status semantics (warning/success/info) inconsistently.

---

## 7) Copy Tone Guidelines

### ✅ Do
- Short, human, operational.
- “What happened” + “what to do next”.
- Confidence-forward: reliable, calm, clear.

### ❌ Don’t
- Don’t sound salesy if no upsell exists.
- Don’t use vague wording where action is needed.
- Don’t overpromise (“perfect”, “instant”, “never fails”).

---

## 8) Mobile Quality Bar

### ✅ Do
- Ensure chips/actions wrap cleanly.
- Keep compare/checklist panels scroll-safe.
- Preserve thumb-friendly CTA sizing.

### ❌ Don’t
- Don’t require horizontal scrolling for core actions.
- Don’t let sticky CTAs overlap critical content.

---

## 9) Final QA Gate (Visual)
Before shipping any UI batch, verify:
1. CTA hierarchy is obvious at first glance.
2. Empty/blocked/error states all suggest next action.
3. Typography + chip styles are consistent.
4. Mobile layout remains readable and tappable.
5. No regressions in smoke gates.

---

## Principle to keep
**We win by trust and clarity, not by upsell pressure.**
Design should feel like a calm, competent partner handling real wedding logistics.
