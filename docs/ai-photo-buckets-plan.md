# AI photo buckets plan

## Goal
Let couples upload photos in simple buckets and let the system place them automatically into the right site sections.

## Canonical buckets
- `main-couple`
- `couple-gallery`
- `weekend-vibe`
- `friends-family`
- `extras`

## Product rule
- user buckets photos
- system places them
- user can override later

## First implementation step
Define a canonical reusable photo bucket data model before touching UI.

## Recommended storage direction
- canonical reusable path, not active-template-only
- candidate: `wedding_data.photoBuckets`

## Future mapping examples
- `main-couple[0] -> hero image`
- `couple-gallery[*] -> story/gallery`
- `weekend-vibe[*] -> travel/gallery/supporting sections`
- `friends-family[*] -> gallery`
