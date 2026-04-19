# Finish Board — 2026-04-19

## Current v1 line
A credible v1 / done-enough claim is:
- couples can create and launch a polished wedding site
- guests can use the public site and RSVP flows reliably
- couples can run the core ops layer: guests, itinerary/travel, registry, messages, seating, settings
- planner/collaborator support exists in a real usable form
- public-facing marketing and billing surfaces describe the product honestly
- known partials are either clearly framed or cut from the v1 promise

Not part of the v1 line:
- external custom domains
- enterprise-grade analytics
- fully automated migration
- perfect multi-event rules everywhere
- full event-day control software

## Where we are
### Actually done
- canonical builder + public site routes are in place
- RSVP + event RSVP flows exist
- dashboard surfaces exist for guests, itinerary, registry, vault, settings, messages, seating, planning
- trust/legal baseline now exists with live trust/privacy/terms pages
- product has passed typecheck/build and prior hardening docs claim stable core architecture

### Fake-done or partial
- some public and billing copy still drifted past actual product truth
- messaging maturity is practical but not a full communications CRM
- migration story is guided/partial, not automated
- registry public purchased-state nuance is still not proven everywhere
- planner collaboration is real but not full workflow governance
- release readiness proof is fragmented across docs instead of one hard v1 map

### Blocks on a credible v1 claim
- any remaining public overclaim or misleading trust copy
- lack of one hard v1 finish map with must-ship vs cut decisions
- missing brutal smoke proof on the launch path and guest path
- unresolved cross-product gaps that make the product feel fake-finished instead of done-enough

## Must ship for v1

### 1) Trust / marketing / billing truth alignment
- Why it matters: if the product says false or sloppy things, v1 credibility dies immediately
- Done enough: no misleading claims around privacy, launch state, custom domain, messaging maturity, or included paid features
- Proof needed: direct copy audit + build passing
- Ownership: finish lane
- Reassign?: no

### 2) Canonical launch-path smoke proof
- Why it matters: the product does not count as done if the main couple path or guest path breaks
- Done enough: homepage/demo/signup -> onboarding/builder -> public site -> RSVP -> dashboard core routes all open and behave credibly
- Proof needed: one hard smoke run log with pass/fail notes
- Ownership: shared / likely QA-heavy
- Reassign?: maybe to QA lane, but finish lane should define and pressure it

### 3) Core guest-ops credibility
- Why it matters: the value is not just the website, it is RSVP + guests + messaging + seating working together
- Done enough: these surfaces are usable, named honestly, and not hiding fake states or obvious dead ends
- Proof needed: targeted manual or scripted checks on guests, RSVP board, messages, seating lookup
- Ownership: mixed
- Reassign?: only if an active lane already owns a slice deeply

### 4) Release-readiness blocker list
- Why it matters: a v1 claim needs a known no-go list, not vibes
- Done enough: clear blockers called out for launch credibility, not every possible bug
- Proof needed: live finish board + resolved/cut/deferred statuses
- Ownership: finish lane
- Reassign?: no

## Should ship if time

### 5) Better empty / thin-state messaging on public and dashboard surfaces
- Why it matters: weak states make the product feel unfinished even when core paths work
- Done enough: key empty states feel intentional instead of placeholder-ish
- Proof needed: targeted UI review
- Ownership: mixed
- Reassign?: maybe

### 6) Cleaner internal release checklist
- Why it matters: helps final verification without pretending checklist work is product work
- Done enough: one concise smoke checklist tied to the v1 line
- Proof needed: checked run log
- Ownership: finish lane or QA
- Reassign?: no

## Cut / after v1
- external custom domain support
- advanced analytics storytelling
- broad aesthetic cleanup
- fully automated migration engine
- full dashboard/public registry purchased-state parity claims
- deeper enterprise planner workflow systems

## Batch landed
- Added a real `/trust` page.
- Replaced footer “coming soon” placeholders with live links to Trust, Privacy Policy, and Terms of Service.
- Fixed footer brand/contact from placeholder-ish values to DayOf + `support@dayof.love`.
- Fixed raw `SITE_TRUST_COPY` placeholder leaks that were rendering literal template text in marketing/onboarding copy.
- Fixed misleading public/billing trust claims:
  - changed Home from “Private by default” to “Hidden from search by default”
  - corrected Home FAQ privacy wording to match real search-vs-access behavior
  - removed Product copy implying a separate private-preview product shape
  - removed fake billing promises like custom domains / advanced analytics / scheduled messaging from the upgrade surface

## Why this batch mattered
This is cross-product finish work, not random polish. If the public site and billing modal overpromise, the repo cannot honestly claim v1-done-enough even if the underlying product is decent.

## Most urgent next
- Run and log one brutal smoke pass on the real v1 line: marketing entry -> auth/demo -> onboarding/builder -> public site -> RSVP -> guests/messages/seating/settings.
- Then fix whichever route, state, or trust mismatch fails first.
