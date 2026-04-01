# Registry Backlog — Tomorrow

Created: 2026-03-31

## Remaining hardening work

### Merchant-specific improvements
- tune Amazon extraction further where price still misses
- tune Target fallback/price paths further
- add/tune Crate & Barrel handling
- add/tune Etsy handling
- add/tune Walmart handling

### Repair and cleanup
- strengthen repair/re-import flow beyond the current helper
- support richer bulk cleanup for legacy bad imports
- define a safer cleanup workflow for old bad registry cards

### Live verification
- full browser E2E for:
  - import
  - partial import
  - mark purchased
  - public viewer purchased state
- verify real purchased visibility on the public site
- re-run live test after each meaningful registry change

### Canonical model follow-through
- keep carrying extraction quality explicitly through the app
- ensure source method / fetch status / confidence / missing fields stay consistent everywhere

## Current stopping point

Today we improved:
- fallback title quality
- fallback image quality
- price extraction reliability (generic fallback)
- purchase consistency via shared RPC path
- extraction quality UI labels
- missing-field guidance in the form
- bad import detection
- repair bad imports action
- centralized item-level metadata-state derivation

## Release note

Current pass is strong enough to ship improvements, but not enough to call registry “fully hardened.”
Tomorrow should focus on live verification and merchant-specific quality tuning.
