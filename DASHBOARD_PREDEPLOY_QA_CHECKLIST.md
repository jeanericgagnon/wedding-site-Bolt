# Dashboard Pre-Deploy QA Checklist (Intentional UI)

## Scope
- Overview
- Guests & RSVP
- Registry
- Planning
- Seating
- Guest Photo Sharing
- Vault
- Messages

## Automated gate (must pass)
- [x] `npm run build`
- [x] `npm run smoke:rsvp:strict`

## Visual consistency checks (manual)
For each page above, verify:
- [ ] Above-fold is uncluttered (1 primary action, secondary controls hidden in menus/details)
- [ ] Action menu label is `Actions`
- [ ] Action menu closes on outside click and `Escape`
- [ ] Details blocks use consistent summary pattern + `View details`
- [ ] Card spacing follows standard rhythm (`space-y-6`, rounded-xl, subtle borders)
- [ ] Empty/loading/error states use unified style blocks
- [ ] Mobile (<390px) has no button-wrap chaos or clipped text
- [ ] CTA hierarchy is clear (primary button visually dominant)

## Accessibility checks (manual)
- [ ] Keyboard focus is visible on buttons/menus/inputs
- [ ] Menus are reachable and dismissible without mouse
- [ ] Color contrast in warning/error states is readable
- [ ] No essential information is color-only

## Final release notes prep
- [ ] Before/after screenshots (desktop + mobile) for each key page
- [ ] One-line summary of each declutter change
- [ ] Regression note: RSVP strict smoke still green
