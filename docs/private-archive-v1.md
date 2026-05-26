# Private couple archive v1

Date: 2026-04-13

## Goal
Turn post-wedding DayOf into a clearer private archive home instead of leaving the product feeling stuck in planning mode forever.

## Archive v1 definition
A private archive home should prioritize:
- anniversary vaults
- best guest photos / slideshow
- revisit public site
- recap / memory actions

And it should demote:
- RSVP urgency
- planning checklists
- live coordination surfaces
- pre-wedding setup pressure

## v1 surface shape

### Top section: Archive home banner
Show:
- archive mode label
- short keepsake-oriented framing
- 3 next-best actions:
  - open vaults
  - review photo memories
  - revisit public site

### Memory section
Show:
- anniversary vault count
- latest vault entry
- reminder/email status

### Photo memory section
Show:
- active photo albums
- slideshow generator entry
- recent upload count

### Keepsake section
Show:
- revisit public site
- anniversary prompts
- future recap hooks

## What v1 does not need yet
- a perfect scrapbook product
- full printed-book workflow
- advanced media timeline editing
- deep AI storytelling layer

## Best first implementation path
1. add a dedicated archive-home block on Overview when archive mode is active
2. make vault + photos the top actions
3. visually demote planning/ops cards during archive mode

## Safe conclusion
Archive mode v1 should be mostly **routing and emphasis**, not a giant new subsystem.
That is the right move because the ingredients already exist.

Provider truth:
- the core archive/vault experience should stand on its own
- optional Google Drive-backed provider paths are narrower than the base vault proof story
- product language should not imply that Drive connect/upload/recovery depth is part of the already-proven archive baseline

## Next step
- 8.3.3 ship archive-focused post-wedding view
