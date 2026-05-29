# DayOf AI Product Contract

Updated: 2026-05-28 07:18 PM PT

This is the current narrow AI truth for DayOf V2. Use it to keep product copy, proof, and implementation aligned.

## Model-backed server lanes

- Quick Start orchestration may use a server-side model when configured. If the model is unavailable, the product falls back cleanly instead of pretending the lane worked.
- Photo vision analysis is model-backed on the server when configured, with customer-safe fallbacks and internal-only provider details.
- Owner site translation is model-backed on the server when configured, with customer-safe retry behavior and no browser-exposed provider key path.

These lanes may be described as AI-assisted or model-backed only when they stay server-side, reviewable, and customer-safe.

## Deterministic or reviewable lanes

- Generated wedding-site copy remains a grounded draft helper. It is deterministic in current browser launch scope unless a separately proven server route is added.
- Guided setup suggestions and FAQ/welcome-note insertions are grounded draft help based on project data already entered by the couple.
- Planner suggestions, invisible-intelligence nudges, and recap coaching are deterministic helpers unless a separately proven server route is added.

These lanes should be described as assisted, grounded, reviewable, or deterministic, not as autonomous AI magic.

## Intentionally non-AI lanes

- Vendor profile generation is a bounded public-source fetch and draft flow, not a model-backed AI lane.
- Registry preview is a bounded public-source fetch and preview flow, not a model-backed AI lane.

## Review and apply contract

- No AI-labeled or draft-help lane should overwrite user edits without visible review.
- Generated output must stay reviewable before publish, share, or send.
- Customer-facing copy must not expose provider names, token language, cost language, or internal debugging details.
- If a lane is deterministic today, product copy must not imply it is a live model-backed system.
