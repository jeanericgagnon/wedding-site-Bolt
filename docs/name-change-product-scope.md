# Name Change Assistant Product Scope

MVP note:
- This file is the broader end-state product target.
- The current competitor-informed MVP bar and build gaps live in [feature-mvp-gap-research-2026-05-13.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/feature-mvp-gap-research-2026-05-13.md).

## Product Promise

Day of Love includes a free post-wedding name-change assistant.

Positioning: "Name change, without the fee."

The product should help couples change names without confusion, missed steps, or paid kits. It should feel supportive, optional, and practical. It is not legal advice and must not pressure users with completion scores, comparisons, or upsells.

## Required End State

The assistant must produce a personalized, state-aware plan from intake details:

- Current legal name and desired new name format.
- State and county context.
- Marriage certificate, court order, ID, passport, and supporting document status.
- Travel timing.
- Employment and license context.
- Accounts and institutions to update.
- Whether one or both partners are changing names.

The plan must include:

- Dynamic checklist.
- Per-step execution status.
- Lightweight document/status vault without storing sensitive values unnecessarily.
- Reminder schedule.
- Account-update templates.
- Dashboard tile and post-wedding placement.
- Optional public-site placement as a helpful resource, not a paid product.

## Non-Negotiable Sequencing

1. Filed/certified marriage certificate or signed court order.
2. Social Security.
3. Driver license / state ID.
4. Passport.
5. Everything else.

No downstream target should imply it is ready before its upstream proof is ready.

## Required Coverage

### Legal And Government

- County marriage certificate filed status and certified copies.
- Clerk, recorder, and vital-records variation by county.
- Social Security as the federal anchor and required first update.
- Passport routing:
  - DS-82 for normal renewal.
  - DS-5504 for recent passport correction/re-application path.
  - DS-11 for first-passport path.
- TSA PreCheck and Global Entry.
- IRS alignment through SSA.
- State tax agency and withholding records.
- Driver license / state ID, including REAL ID considerations.
- Voter registration.
- Professional licenses and certifications.

### Financial And Identity

- Banks and credit cards.
- Investments, retirement, brokerages.
- Loans: student, auto, mortgage.
- Mortgage, property title, and homeowner records.
- Credit bureaus as monitoring/follow-up after lenders report updated identity.

### Work And Insurance

- Employer, payroll, HR.
- Health, dental, vision.
- Life insurance.
- Disability insurance and leave administrators.
- Workers comp / claims administrators.
- Beneficiary records.

### Personal And Lifestyle

- Utilities.
- Phone plan.
- Subscriptions.
- Email and domain identity.
- Social profiles and memberships.
- School, alumni, transcript records.

### Travel And Mobility

- Airline profiles and frequent flyer accounts.
- Hotel, rail, cruise, and loyalty programs.
- Car registration and title.
- Auto insurance.
- Upcoming travel conflicts and booking-name mismatch risk.

## Required Edge Logic

- Hyphenated names.
- Dual last names.
- Both partners changing names.
- International citizenship/passports.
- Non-U.S. passport or immigration-linked records.
- Upcoming travel and passport timing conflicts.
- Name mismatch across documents.
- Court-ordered vs marriage-based paths.
- Out-of-state marriage certificate grounding.
- County or certificate reference missing.

## Execution Standards

Each implementation batch should improve one real product/runtime seam:

- Prefer behavior, sequencing, persistence, or status truth over copy-only edits.
- Add or update tests for the exact seam.
- Avoid endless parser micro-variants unless they unlock a real downstream product behavior.
- Keep UI-redo safe: improve data contracts and execution truth before visual redesign.
- Commit verified batches only.

## Build Phases

### Phase 1: Intake And Document Truth

Goal: every uploaded or extracted document becomes reliable canonical case truth.

Tasks:

- Normalize messy extracted snapshots into canonical extracted fields.
- Ground county, certificate number, issuing authority, issue date, expiration date, and confidence.
- Preserve source document links for downstream autofill and checklist proof.
- Detect conflicts between structured intake and document extraction.
- Surface repair actions when document proof is incomplete.

Done when:

- Certificate/court/ID/passport docs can reliably populate requirements, autofill, and repair queue.
- Tests cover object, array, nested, wrapped, stringified, and alias snapshot shapes.

### Phase 2: Sequencing And Target Readiness

Goal: every major institution target has truthful readiness.

Tasks:

- Enforce certificate or court-order proof before SSA.
- Enforce SSA before DMV/state ID.
- Enforce SSA + DMV/passport dependencies before downstream targets.
- Keep tax, payroll, voter, passport, TSA, and professional-license readiness honest.
- Split execution lanes for both-partner name changes.

Done when:

- Target execution snapshots never mark downstream targets ready before upstream proof.
- Dual-partner targets track partner-specific proof independently.

### Phase 3: Status Vault And Progress Tracking

Goal: users can see what is done, what is next, and what proof exists without storing unnecessary sensitive data.

Tasks:

- Add per-target status, note, last-updated, and proof-summary tracking.
- Track partner-specific completion for dual-partner flows.
- Track document proof readiness separately from task completion.
- Keep status language neutral: no completion pressure or benchmark comparisons.

Done when:

- Checklist and dashboard can restore truthful state after refresh.
- Users can mark each step in progress/complete and understand what proof is still missing.

### Phase 4: Reminders And Milestones

Goal: reminders keep users moving without pressure.

Tasks:

- Create reminder rules from primary ID, passport, payroll, tax, and downstream timing.
- Add milestone confirmations for certificate, SSA, DMV, passport, and rollout.
- Escalate travel timing and mismatch risks.
- Avoid nagging language; every reminder should explain why it helps and allow doing it later.

Done when:

- Reminder schedule is generated from actual plan state.
- Reminders stop or change once proof/status changes.

### Phase 5: Templates And Output Quality

Goal: make annoying account updates fast.

Tasks:

- Generate templates for banks, payroll, insurance, subscriptions, utilities, travel, licenses, and tax/state agencies.
- Tailor template proof requests to target readiness.
- Include no-login friendly exports or copy-ready text where useful.

Done when:

- Each major category has a usable template that reflects the user’s current state.

### Phase 6: Dashboard And Lifecycle Placement

Goal: make the assistant feel like a complete free Day of Love product.

Tasks:

- Add post-wedding dashboard tile.
- Add optional wedding-site/resource placement.
- Keep copy clear: free, helpful, no kit, no upsell.
- Make next steps soft and skippable.

Done when:

- Users can discover and resume the assistant after the wedding.
- The experience feels supportive, not evaluative.

## Agent Direction

When working this lane:

- Use this file as product source of truth.
- Pick the highest-impact unfinished phase.
- Land medium verified batches, not tiny one-line churn.
- If a parser seam is already covered, move up the stack to readiness, status vault, reminders, templates, or dashboard placement.
- Emit only `LANE_COMMIT` or `LANE_BLOCKER` proof when supervised.
