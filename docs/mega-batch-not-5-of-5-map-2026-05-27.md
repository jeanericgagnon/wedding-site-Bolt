# Mega Batch Not-5-of-5 Map

_Last updated:_ 2026-05-27 PT

## Purpose

This doc is the working map for the next mega batch.

It is not a list of bugs. It is a list of surfaces that are still not honestly at 5/5, plus the reason they are not there yet, plus the best order to finish them.

Use this when deciding what to work on next after the large premium-guidance pass that landed on local + deployed `main` through commit `0f2e16060`.

## What is already basically 5/5

These are not the focus of the next mega batch unless a regression shows up.

- dashboard overview and control-tower guidance
- planning advisory flow
- itinerary readiness flow
- seating guidance flow
- registry dashboard guidance
- day-of messaging and dispatch framing
- coordinator escalation framing
- guest journey companion
- setup to builder handoff guidance
- collaborator role framing and planner handoff guidance

Primary files:

- `src/pages/dashboard/Overview.tsx`
- `src/pages/dashboard/Planning.tsx`
- `src/pages/dashboard/Itinerary.tsx`
- `src/pages/dashboard/Seating.tsx`
- `src/pages/dashboard/registry/RegistryDashboardRouteContent.tsx`
- `src/pages/dashboard/Messages.tsx`
- `src/pages/dashboard/CoordinatorMode.tsx`
- `src/components/guest/GuestJourneyCompanion.tsx`
- `src/pages/setup/SetupShell.tsx`
- `src/builder/components/BuilderShell.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/PlannerHandoffCard.tsx`

## Not yet 5/5

### 1. Builder and editor depth

This is the biggest remaining product gap.

The guidance around the builder is now strong, but the editing experience itself is still not at the same level of finish. This is the clearest place where the product center of gravity and the underlying tool depth are out of sync.

Why it is not 5/5:

- editor internals still carry visible complexity and legacy drift
- lint debt is concentrated in major builder files
- some panels feel more accumulated than intentionally shaped
- there is still a difference between "guidance is premium" and "editing itself feels premium"

Primary files to audit:

- `src/builder/BuilderPage.tsx`
- `src/builder/components/BuilderInspectorPanel.tsx`
- `src/builder/components/BuilderSidebarLibrary.tsx`
- `src/builder/components/BuilderTopBar.tsx`
- `src/builder/components/TemplateGalleryPanel.tsx`
- `src/builder/components/MediaLibraryPanel.tsx`
- `src/builder/components/BuilderSectionRail.tsx`
- `src/builder/components/DeleteSectionModal.tsx`
- `src/builder/services/`
- `src/builder/state/`

Mega-batch goals:

- simplify noisy editing states
- unify panel quality and action hierarchy
- reduce obvious legacy code smells in the core editing surfaces
- make the builder feel as premium as the dashboard guidance around it

### 2. Template, variant, and import long tail

The product has a lot of template and section surface area that works, but has not had the same end-to-end premium pass as the core dashboard and guest flows.

Why it is not 5/5:

- many variants exist without a full consistency pass
- import and variant-drop code has visible lint debt and likely stale assumptions
- some long-tail sections are more "supported" than "fully polished"
- consistency across templates, section variants, and imported layouts is not yet fully proven

Primary files and folders:

- `imports/bolt-variant-drop/`
- `src/sections/`
- `src/sections/components/`
- `src/sections/variants/`
- `src/sections/sectionRegistry.tsx`
- `src/templates/`
- `src/pages/Templates.tsx`
- `src/pages/templateExperience.ts`

Mega-batch goals:

- audit all shipped variants for consistency, utility, and honest quality
- remove or fix stale variant assumptions
- tighten imported layout integrity
- make template choice quality match the strongest core product surfaces

### 3. Settings, admin, ops, and truth surfaces

Settings guidance is much better now, but the full ops and truth layer is still uneven.

Why it is not 5/5:

- proof-board truth lags actual branch and deployment state
- release/readiness docs are not automatically keeping pace with product reality
- admin and audit surfaces still feel more functional than premium
- the repo still has a difference between shipped truth and documented truth

Primary files and docs:

- `src/pages/dashboard/Settings.tsx`
- `src/pages/dashboard/AuditLogs.tsx`
- `src/pages/dashboard/ErrorLogs.tsx`
- `docs/v1-smoke-proof-log.md`
- `BACKLOG.md`
- `docs/RELEASE_READINESS_SUMMARY.md`
- `scripts/v1-proof-board.mjs`
- `scripts/deploy_prod_guarded.mjs`

Mega-batch goals:

- refresh proof truth so docs match production
- make audit and error surfaces feel intentional, not just present
- tighten release/readiness/documentation honesty
- reduce drift between what is deployed and what the docs claim

### 4. Onboarding and AI clarification edges

A lot of this is strong, but not all of it is at the same confidence level as the main operational product.

Why it is not 5/5:

- some flows are deeply capable but still feel system-shaped instead of perfectly user-shaped
- there are debug, recovery, and practice artifacts around the AI and onboarding layers
- the long tail of question-mapping and continuity behavior is broader than what got a premium UX pass

Primary files and folders:

- `src/pages/Onboarding.tsx`
- `src/pages/onboarding/`
- `src/lib/aiOnboarding*.ts`
- `src/lib/aiFollowUpPlanner*.ts`
- `src/lib/clarifying*.ts`
- `recovery/ai-followup-planner/`
- related docs under `docs/ai-*`

Mega-batch goals:

- separate production-critical logic from experimentation residue
- audit the long-tail continuity and fallback behavior
- tighten the user-facing feeling of the onboarding + clarification system

### 5. Public-site feature breadth outside the strongest core lanes

The main public/guest flow is strong, but some feature lanes still need a broader premium pass.

Why it is not 5/5:

- not every guest-facing or public-facing feature has had the same depth of polish pass
- some public adjunct flows are more "good and present" than "best-in-class"
- premium memory/photo, save-the-date, multilingual, archive, and other long-tail lanes still have audit docs that imply unfinished work

Reference docs that point to remaining breadth:

- `docs/public-site-usefulness-audit.md`
- `docs/mobile-core-flows-audit.md`
- `docs/mobile-rsvp-audit.md`
- `docs/multilanguage-audit.md`
- `docs/multilingual-polish-audit.md`
- `docs/photo-sharing-next-steps.md`
- `docs/save-the-date-audit.md`
- `docs/archive-mode-audit.md`
- `docs/post-wedding-polish-audit.md`

Mega-batch goals:

- decide which long-tail public features are truly part of the premium core
- finish the ones that matter most
- stop pretending breadth equals finish where it does not

### 6. Repo and release hygiene

This is the biggest non-product reason the whole system is not 5/5.

Why it is not 5/5:

- repo-wide lint debt is still real
- some stale files, duplicate artifacts, and legacy code remain
- deploy bar still needed an explicit waiver
- the codebase quality does not yet fully match the product quality

Known evidence:

- repo-wide `npm run lint -- --quiet` failed during branch-level QA with existing errors
- proof board current-state metadata still lagged the actual deployed branch state

Likely focus folders:

- `imports/bolt-variant-drop/`
- `src/builder/`
- `src/sections/`
- `supabase/functions/registry-preview/`
- older test helpers and recovery folders

Mega-batch goals:

- get lint debt down until release gates are honest again
- reduce legacy/stale files
- make maintainability match the product polish

## Best next mega-batch order

### Batch A - Builder/editor hardening

This is the highest-value next batch.

Definition of done:

- core builder surfaces feel as polished as the guidance around them
- obvious builder lint debt and legacy friction are reduced
- editing itself feels calmer, clearer, and more deliberate

### Batch B - Template/variant/import cleanup

Definition of done:

- shipped template and section variants feel consistently premium
- import/variant drift is reduced
- template breadth feels trustworthy, not just broad

### Batch C - Settings/admin/ops truth batch

Definition of done:

- proof-board and release truth reflect actual current state
- audit/error/admin surfaces feel productized
- docs and runtime truth stop drifting apart

### Batch D - Onboarding/AI edge cleanup

Definition of done:

- onboarding and clarification flows feel simpler and more intentional
- experiment and recovery residue are either cleaned up, isolated, or explicitly deferred

### Batch E - Repo hygiene and lint debt

Definition of done:

- strict release gates can run without waiver
- repo quality is closer to the quality of the shipped experience

## If we only do one more mega batch

Do this:

- Builder/editor hardening

That is the biggest remaining gap between "the product feels premium" and "every important core feature actually is premium all the way through."

## Short version

We are not trying to invent more guidance polish.

We are trying to finish the parts of the product where:

- the editing depth still trails the product brain
- template breadth still trails the strongest core lanes
- ops truth still trails production reality
- codebase hygiene still trails shipped product quality
