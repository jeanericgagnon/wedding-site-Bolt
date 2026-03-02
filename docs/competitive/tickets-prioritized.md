# Prioritized Build Tickets (Impact × Effort)

Legend: Impact (H/M/L), Effort (S/M/L)

## P0 — High impact, low/medium effort

### T1. Homepage hero reframing to all-in-one value stack
- **Pattern:** Hero formula A + B
- **Why:** Improves first-10-second comprehension and category positioning.
- **Acceptance criteria:**
  - Hero headline explicitly includes website + RSVP + registry + day-of.
  - Primary CTA: Start free; secondary: Browse templates.
  - Add 3 proof bullets directly under hero.
- **Impact/Effort:** H / S
- **Refs:** `captures/wedding-builders/.../summary.json`, `withjoy.com` copy snapshot.

### T2. Template card anatomy upgrade
- **Pattern:** Template card anatomy + progressive narrowing.
- **Why:** Increases template selection confidence and speed.
- **Acceptance criteria:**
  - Cards include style tags + best-for tags.
  - Add quick filter chips (style/tone/season).
  - Add Preview + Use Template CTA pair.
- **Impact/Effort:** H / M
- **Refs:** Zola deep links: `captures/zola/20260302-120031/manifest.json`.

### T3. Template detail page (or modal) with section stack preview
- **Pattern:** Template detail confidence boosters.
- **Why:** Reduces “unknown after click” friction.
- **Acceptance criteria:**
  - Show default section order and included modules.
  - Show mobile + desktop preview states.
  - One-click Use template.
- **Impact/Effort:** H / M
- **Refs:** Zola template-depth manifest.

### T4. Day-of as first-class navigation item
- **Pattern:** Multi-entry nav by intent.
- **Why:** Distinguishes DayOf from pure design players.
- **Acceptance criteria:**
  - Nav includes explicit Day-of / Command Center entry.
  - Landing card summarizes check-in, alerts, Q&A, messaging.
- **Impact/Effort:** H / S
- **Refs:** Internal feature depth already shipped.

### T5. Builder completion meter + blockers rail
- **Pattern:** Task-based next-step rail.
- **Why:** Converts advanced flexibility into guided progress.
- **Acceptance criteria:**
  - Progress % per page
  - “Ready to publish” checklist with blockers + one-click jump
- **Impact/Effort:** H / M

---

## P1 — Medium impact, low/medium effort

### T6. Registry quality badge on item cards
- **Pattern:** Link robustness transparency.
- **Why:** Cuts confusion when product links are non-direct.
- **Acceptance criteria:**
  - Badge states image source: Direct / Auto-fetched / Fallback.
  - Tooltip explains how to improve quality.
- **Impact/Effort:** M / S

### T7. Guest flow trust strip
- **Pattern:** Trust signal reinforcement.
- **Why:** RSVP confidence affects completion rates.
- **Acceptance criteria:**
  - Add compact trust strip on RSVP pages (privacy, no account needed, editable later if applicable).
- **Impact/Effort:** M / S

### T8. Template family landing pages
- **Pattern:** Progressive narrowing.
- **Why:** Makes large catalog feel curated.
- **Acceptance criteria:**
  - Family pages: Editorial, Floral, Minimal, Modern, Destination.
  - Each page has ~8–12 recommended templates.
- **Impact/Effort:** M / M

### T9. Builder add-section preview packs (asset-backed)
- **Pattern:** Visual add-section picker.
- **Why:** Runtime mini-renders are useful; static packs are faster and more stable.
- **Acceptance criteria:**
  - Each section+variant has thumbnail asset.
  - Picker uses assets with lazy loading + fallback to live preview.
- **Impact/Effort:** M / M

---

## P2 — Strategic depth, higher effort

### T10. Conversion instrumentation pass (template funnel)
- **Pattern:** data-informed UX iteration.
- **Why:** validates which template/gallery changes convert.
- **Acceptance criteria:**
  - Track events: gallery view, filter use, template preview, template select, publish.
  - Dashboard report for step drop-off.
- **Impact/Effort:** H / L

### T11. Verticalized onboarding paths
- **Pattern:** intent-based onboarding.
- **Why:** destination/formal/micro weddings have different priorities.
- **Acceptance criteria:**
  - 3 onboarding starters with pre-selected sections.
  - Each path has tailored checklist.
- **Impact/Effort:** M / L

---

## Recommended execution order (next 2 sprints)
1. T1, T2, T4 (fast category-positioning win)
2. T3, T5 (confidence + publish conversion)
3. T6, T8, T9 (quality and depth)
4. T10+ (instrument then optimize)
