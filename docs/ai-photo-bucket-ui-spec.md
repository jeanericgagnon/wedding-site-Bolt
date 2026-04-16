# AI photo bucket UI spec

## Goal
Collect photos in simple human buckets and let the system auto-place them into the site.

## UX rule
Do not ask users where every image should go.
Ask them to bucket photos in broad, intuitive groups.

## Bucket cards
### 1. Main photo of us
- one favorite photo
- used for hero by default

### 2. More couple photos
- a few more photos of the couple
- used for story + gallery

### 3. Weekend / venue / destination photos
- hotel, beach, town, welcome vibe, view shots
- used for travel/gallery/supporting visuals

### 4. Friends / family / candid photos
- gallery/supporting only

### 5. Extras
- saved but lower priority for automatic placement

## Per-bucket UX
Each bucket should have:
- title
- one-line explanation
- upload button
- thumbnail strip
- optional remove action

## Product behavior
- upload into bucket
- persist canonical bucket data
- build placement plan
- map placement into active template sections
- allow builder override later

## Copy style
Keep bucket prompts short and human.
Example:
- `Main photo of you two`
- `A few more of you two`
- `Weekend / destination photos`
- `Friends, family, candid`
- `Extras`
