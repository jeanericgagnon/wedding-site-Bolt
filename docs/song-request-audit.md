# Song request system audit

Date: 2026-04-13

## Current real pieces

### What exists
- per-site Spotify playlist URL exists
- settings UI exists to save playlist link
- RSVP can show a song-request playlist card
- custom RSVP questions can be used for song requests
- builder/music sections already reference request notes and playlist framing

### What does not really exist yet
- no dedicated song request management surface
- no structured request list / moderation queue
- no couple/planner dashboard for submitted song requests
- no explicit separation between:
  - open playlist link
  - actual submitted song requests

## Real conclusion
Song request support exists, but the **system** is incomplete.
Right now it is mostly:
- a playlist link
- optional custom-question workaround
- copy hints

That is useful, but not enough to call it a proper feature-complete song request system.

## Recommended v1 system shape
Keep this simple.

### Song request v1 should include
- a dedicated question type or saved custom-question pattern for song requests
- a dashboard view showing submitted song requests
- guest name + request text visibility
- basic planner/couple review flow

### Song request v1 does not need yet
- Spotify API writeback
- deduping against real playlist contents
- DJ software integrations
- ranking / voting system

## Best path
1. define dedicated song-request capture shape
2. add dashboard visibility for collected requests
3. keep Spotify link as optional companion, not the whole feature

## Next step
- 7.5.2 add dashboard song-request visibility
