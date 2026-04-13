# Slideshow v1 audit

Date: 2026-04-13

## Current surfaces already in repo

### Photo side
- `src/pages/dashboard/GuestPhotoSharing.tsx`
- real album management exists
- event-linked albums exist
- upload moderation exists
- album counts / recent uploads / hidden / flagged states exist

### Memory / archive side
- `src/pages/dashboard/Vault.tsx`
- anniversary vaults already support:
  - entries
  - attachments
  - recap generation
  - archive-mode framing

## What this means
The repo already has the two ingredients needed for a slideshow feature:
1. photo collections
2. post-wedding memory/archive framing

What it does **not** have yet is a clear slideshow product surface.
There is no obvious dedicated slideshow builder / preview / export flow.

## Recommended slideshow v1 scope
Keep v1 small and non-dumb.

### Slideshow v1 should do
- let the user generate a slideshow from uploaded photos
- start from photo albums, not arbitrary external sources
- support a simple ordering strategy:
  - newest first
  - oldest first
  - shuffled
- support a few simple styles/themes
- produce a previewable sequence, not full fake "AI cinema"
- optionally save slideshow metadata for later editing

### Slideshow v1 should NOT try to do yet
- real video rendering pipeline
- music licensing / soundtrack sync complexity
- advanced transitions editor
- narration generation
- full timeline editing suite
- cross-device background render queue

## Best placement
Best first home:
- inside `GuestPhotoSharing` as a new card / entry point

Why:
- the inputs already live there
- users mentally associate slideshow generation with photo uploads
- lower complexity than inventing a separate new product area first

## Suggested data shape for v1
- slideshow id
- wedding site id
- source album ids
- title
- style preset
- ordering mode
- selected photo ids (or derived photo list)
- cover photo id
- created at / updated at

## Safe conclusion
The right move is **not** "AI slideshow" in the magical-marketing sense.
The right move is a **slideshow generator v1**:
- album-driven
- preview-first
- lightweight presets
- saved config

That is enough to make section 8 materially more real without overbuilding.

## Next step
- 8.1.2 add slideshow generator entry point in dashboard
