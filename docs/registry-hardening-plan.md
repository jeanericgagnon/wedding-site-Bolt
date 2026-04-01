# Registry Hardening Plan

Created: 2026-03-31

## Objective

Turn registry import/purchase behavior into a more reliable production-quality subsystem by improving extraction quality, fallback handling, repair flows, canonical modeling, and live verification.

## Workstreams

### 1. Extraction quality
- improve price extraction reliability
- add merchant-specific fallback rules for major offenders:
  - Amazon
  - Target
  - Crate & Barrel
  - Etsy
  - Walmart
- keep retailer blocking as an expected condition, not an exception

### 2. UX / product
- clearer import-state labels:
  - full
  - partial
  - blocked
  - manual
- add a repair import / re-import action for bad cards
- add bulk cleanup tooling for legacy junk imports
- improve missing-price flow so it is guided rather than feeling broken

### 3. Data / architecture
- formalize the canonical registry extraction model in code, not just docs
- store extraction quality explicitly and consistently
- distinguish:
  - source method
  - fetch status
  - confidence
  - missing fields
  - repairability

### 4. Repair / cleanup
- strengthen refetch repair for old bad imports
- detect and surface bad historical import titles
- support practical cleanup for cards like:
  - Page Not Found
  - Gift from amazon.com
  - Gift from crateandbarrel.com

### 5. Live verification
- run full live E2E for:
  - import
  - partial import
  - owner mark purchased
  - public viewer purchased state
- treat browser evidence as the source of truth for production reliability

## Current status snapshot

Already improved:
- frontend draft mapping preserves more extracted metadata
- fallback title generation improved
- Target fallback image support added
- Amazon URL normalization improved
- owner mark purchased now uses the same RPC path as public purchase
- extraction-quality states and missing-field hints are more visible in UI
- bad historical import titles are now surfaced in the card UI

Still needed:
- stronger price extraction for more merchants
- merchant-specific fallback tuning for Amazon / Target / Crate & Barrel / Etsy / Walmart
- stronger repair/re-import flow backed by live verification
- richer bulk cleanup path for legacy bad imports beyond the current repair helper
- stable live E2E coverage for import + purchase + viewer consistency

## Delivery approach

Use a quality-first loop:
1. identify live/browser failure or measurable quality gap
2. make the smallest correct change
3. rerun tests/browser checks
4. score the outcome
5. document what changed and what remains

## Success condition

Registry import should be trustworthy enough that:
- blocked retailers still yield usable cards
- users understand what is missing
- old bad cards are repairable
- purchased state is consistent for owners and viewers
- live browser tests pass for the core flows

## Deferred follow-up

Anything not finished in the current pass should move into:
- `docs/registry-backlog-tomorrow.md`
