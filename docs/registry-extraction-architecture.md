# Registry Extraction Architecture

Created: 2026-03-31

## Goal

Move registry import from ad hoc product scraping toward a canonical extraction model with explicit extraction quality states and better fallbacks.

## Core principle

Do not assume every source can yield full metadata.
Instead, treat extraction as one of:
- `full`
- `partial`
- `blocked`
- `manual`

## Source methods

Each preview/import attempt should classify its source method as one of:
- `api`
- `structured_data`
- `html`
- `headless`
- `fallback`
- `manual`

## Canonical registry preview model

Each preview result should be normalized into a shape that can support future platform adapters:

- `title`
- `brand`
- `merchant`
- `retailer`
- `canonical_url`
- `image_url`
- `price_label`
- `price_amount`
- `currency`
- `availability`
- `description`
- `source_method`
- `fetch_status`
- `missing_fields[]`
- `confidence_score`
- `error`

## Current product requirement

Even when a source is blocked or partial, the UI should still aim to produce a usable card:
- readable title
- usable image or branded fallback image
- merchant name
- explicit statement of what is missing (for example, price)

## Operational requirement

The UI should distinguish:
- full import
- partial import
- blocked import
- manual entry

That state should not be implicit.

## Near-term roadmap

1. Keep improving fallback title/image quality for blocked retailers
2. Improve price extraction reliability where possible
3. Add explicit extraction quality display in the UI
4. Add merchant-specific adapters where they materially improve results
5. Add browser-backed E2E checks for the live import flow

## Long-term direction

Treat registry extraction as a platform-adapter system rather than a one-off product scrape path.
