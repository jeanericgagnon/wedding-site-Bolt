# Concierge brief cleanup punchlist

## What is working now
- onboarding saves canonical `onboarding_answers`
- dashboard Overview renders the saved brief
- `Refresh draft from brief` runs
- refresh writes into `wedding_data`
- public site can render again against the drifted live schema
- visible brief-driven content updates were confirmed in-browser

## What still needs cleanup

### 1. Remote schema drift
The live Supabase project is still missing columns the app has historically expected.
We had to patch around missing columns like:
- `privacy_mode`
- `site_password_hash`
- `published_json`

Action:
- audit actual remote `wedding_sites` schema vs repo migrations
- either apply missing migrations or permanently make all queries backward-compatible
- stop discovering drift one column at a time during runtime QA

### 2. Brief refresh mapping is too blunt
Current refresh can visibly spray raw brief values into multiple live surfaces.
It works, but the mapping is not clean enough for production confidence.

Action:
- define exactly which `weddingProfile` fields map to which `wedding_data` fields
- avoid over-broad propagation into unrelated page sections
- keep hero/story/event updates intentional and minimal

### 3. Test site content is polluted
Current QA site now contains junk values like `QA updated value` in public-facing copy.

Action:
- clean the test site content back to sane sample data
- ideally use a dedicated throwaway QA site/account for future runtime checks

### 4. Provenance / overwrite protection is partial
We added the pattern, but coverage is incomplete.

Action:
- finish propagation of provenance-safe read/write helpers across the main builder edit paths
- verify refresh-from-brief does not overwrite hand-edited content
- remove temporary/proof-of-concept paths once real handlers are covered

### 5. Public site media/storage hygiene
Public site still showed 400s for some storage asset URLs while rendering.

Action:
- inspect missing assets in `wedding-media`
- repair or remove broken references
- verify public site loads without noisy storage failures

### 6. Overview / onboarding code path cleanup
The feature works, but the path was stitched together under pressure.

Action:
- remove debug leftovers / dead fallback assumptions
- simplify Overview draft-brief rendering path
- make onboarding existing-site fetch/save flow easier to reason about

## Recommended execution order
1. schema drift audit + reconciliation
2. clean QA/test site content
3. refine brief -> `wedding_data` mapping
4. finish overwrite protection
5. clean media/storage errors
6. final end-to-end acceptance pass on a clean site

## Acceptance criteria for "fully up"
- clean test site/account exists
- onboarding brief saves and reloads correctly
- Overview always shows saved brief when present
- refresh updates intended live copy only
- hand-edited builder content survives refresh
- public site renders without schema/query failures
- public site renders without broken media spam
