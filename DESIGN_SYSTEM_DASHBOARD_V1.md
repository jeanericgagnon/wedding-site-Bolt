# Dashboard Design System v1 (Intentional UI Program)

## Goal
Create a consistent, premium SaaS dashboard feel: calm, structured, and predictable.

## Layout rhythm
- Page container: `max-w-7xl` (or `max-w-5xl` for focused flows)
- Section spacing: `space-y-6` baseline
- Card internal spacing:
  - dense: `p-3`
  - standard: `p-4`
  - feature: `p-5`/`p-6`
- Header stack:
  - title row + subtitle row
  - avoid more than 2 action rows above fold

## Progressive disclosure rule
- Above fold = primary tasks only
- Secondary analytics/diagnostics in `details` sections
- Advanced bulk controls in `Actions` menu

## Actions pattern
- One visible primary CTA per section
- Secondary actions grouped under `Actions`
- Label consistency:
  - `Actions` (menu trigger)
  - `Add X` (primary action)
  - `View details` / `Hide details` (toggle)

## Card consistency
- Border: `border-border-subtle`
- Radius: `rounded-xl`
- Surface: `bg-surface` or `bg-surface-subtle/40`
- Shadows only where hierarchy needs it

## Typography hierarchy
- H1: `text-2xl font-bold`
- Section title: `text-sm font-semibold`
- Supporting copy: `text-xs text-text-secondary`
- KPI value: `text-xl font-bold`

## Status language
- Prefer: "items to review", "coming up", "worth reviewing"
- Keep strict wording only for security/legal/irreversible actions

## QA checklist per page
1. Above-fold scan in 3 seconds: clear primary action?
2. No more than one action cluster visible by default.
3. Mobile width: no button-wrap chaos.
4. Alignment: icon baseline + card paddings consistent.
5. Build + smoke strict pass.
