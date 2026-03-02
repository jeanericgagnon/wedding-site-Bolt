# Pattern Library (Reusable UX + Growth Patterns)

## 1) Hero formulas (homepage / product entry)

### Pattern A — "All-in-one wedding stack"
**Observed in:** WithJoy, Zola, Appy copy framing.
**Why it works:** reduces evaluation complexity; users map one product to many jobs.
**Reusable implementation:**
- Hero headline: "Your wedding website + RSVPs + registry + day-of tools in one place"
- Subhead with 3 concrete outcomes (save time, less guest confusion, day-of control)
- Primary CTA: "Start free"
- Secondary CTA: "Browse templates"

### Pattern B — "Design confidence + operational confidence"
**Observed in:** Zola/WithJoy ecosystem messaging.
**Why it works:** balances emotional (beautiful) and practical (runs your event).
**Reusable implementation:**
- Two-column proof row under hero:
  - Left: Template quality proof (families, typography styles)
  - Right: Ops proof (smart RSVP, broadcast, check-in)

---

## 2) Navigation structures

### Pattern C — Multi-entry nav by user intent
**Observed in:** WithJoy feature-entry model.
**Why it works:** users enter from their current pain, not from product architecture.
**Reusable implementation:**
- Top nav items: Website / Templates / Registry / Guest List / Day-of / Pricing
- Preserve one dominant CTA in header (Start free)

### Pattern D — Sticky micro-CTA in long pages
**Observed in:** common wedding SaaS LP behavior.
**Why it works:** maintains conversion momentum after scroll.
**Reusable implementation:**
- Sticky header CTA + contextual badge (e.g., "No code", "Free start")

---

## 3) Template gallery + detail patterns

### Pattern E — Template card anatomy
**Observed in:** Zola-depth capture (many design links), others with design hubs.
**Card anatomy (recommended):**
- Visual thumbnail
- Style tags (e.g., Editorial, Rustic, Minimal, Floral)
- Typography vibe tags
- Best-for tags (formal, destination, micro-wedding)
- CTA pair: Preview / Use template

### Pattern F — Progressive narrowing
**Observed in:** design hubs with many options.
**Why it works:** avoids overwhelm with high template count.
**Reusable implementation:**
- Filters: style, tone, season, palette, layout complexity
- Sort: most popular, newest, minimalist, editorial

### Pattern G — Template detail confidence boosters
**Reusable implementation:**
- Show default section order
- Show mobile and desktop previews
- Show included modules (RSVP, travel, registry)
- CTA: "Use this template"

---

## 4) Builder/onboarding patterns

### Pattern H — First-run guided path
**Observed in:** market leaders by behavior (copy + architecture).
**Reusable implementation:**
1. Pick template
2. Fill couple details
3. Confirm key sections
4. Publish checklist

### Pattern I — Task-based “next step” rail
**Already partially implemented in DayOf.**
**Next enhancement:** add completion percentages + unblock suggestions (e.g., "RSVP form missing deadline").

### Pattern J — Add-section with visual previews
**Now implemented in DayOf BuilderV2Lab and inspector flows.**
**Next enhancement:** true screenshot packs for every variant family, not runtime mini-render only.

---

## 5) Registry UX blocks

### Pattern K — Registry “job stories” above fold
**Observed in:** WithJoy/Appy copy emphasis.
**Reusable implementation:**
- “Gifts + cash funds + experiences” as quick chips
- Trust copy (fees, payout timing, guest simplicity)

### Pattern L — Link-to-item robustness
**DayOf already improved with fallback extraction and resilient card previews.**
**Next enhancement:** host-specific parser hints + quality badge (Direct/Fallback/Missing).

---

## 6) RSVP/guest management patterns

### Pattern M — Smart RSVP confidence copy
**Reusable implementation:**
- Explain advanced controls in plain language:
  - per-event invites
  - plus-one rules
  - meal choices
  - reminders

### Pattern N — Day-of operations as differentiator
**DayOf advantage:** coordinator mode + check-in + comms.
**Packaging recommendation:** place Day-of as first-class nav item, not hidden utility.
