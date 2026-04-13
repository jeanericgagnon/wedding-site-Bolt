# DayOf Claims Matrix

Internal source of truth for customer-facing claims. See also `docs/feature-truth-registry.md` for the operational writing rules behind these claims.

## Core trust claims

| Claim area | Public wording direction | Current product truth | Public-safe? | Notes |
|---|---|---|---|---|
| Wedding URL | **Custom wedding URL. No upsell.** | Couples get a personalized DayOf URL / slug on `dayof.love`; external custom domains are not yet supported. | Yes, if wording avoids claiming external domain support. | Do not say couples can connect any domain they own until external custom-domain support actually exists. |
| Privacy by default | **Hidden from search by default** | Sites are not indexed unless enabled, and draft editing stays private to the couple. | Yes | Must distinguish search indexing from guest-access controls on the live site. |
| Search indexing | **Hide from search engines unless you enable it** | `noindex` controls exist. | Yes | Safe if described as search visibility, not full secrecy. |
| Draft / preview / published | **Draft for you, published for guests** | Current implementation still allows draft-preview style access by slug under certain conditions. | Partial | Needs tighter language and eventual product refactor. |
| Custom domains | Avoid claiming support publicly for now. | External custom domains are future work. | No | Current public claim must be removed or rewritten. |
| Message delivery | Be explicit about what is sent, queued, processing, retried, or failed. | Delivery exists and status surfaces should reflect actual message state instead of vague success language. | Partial | Safe only when UI is explicit. |
| Publish state | Be explicit about draft, publishing now, live and up to date, live but stale, or publish needs attention. | Publish status can be derived from runtime state and should not collapse failures or stale edits into a vague live badge. | Partial | Safe only when status UI uses shared publish-state logic. |

## Wording guidance

This matrix should stay aligned with `docs/feature-truth-registry.md`.

### Prefer
- Custom wedding URL. No upsell.
- Your personalized DayOf URL is included.
- Hidden from search by default.
- Guest-facing DayOf URL included.
- Hidden from search unless you enable indexing.
- Draft only
- Private preview
- Published / Live

### Avoid
- Connect any domain you own
- Custom domain included
- Private means nobody can reach it under any circumstance
- Published is the only possible visibility state
