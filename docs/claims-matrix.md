# DayOf Claims Matrix

Internal source of truth for customer-facing claims.

## Core trust claims

| Claim area | Public wording direction | Current product truth | Public-safe? | Notes |
|---|---|---|---|---|
| Wedding URL | **Custom wedding URL. No upsell.** | Couples get a personalized DayOf URL / slug on `dayof.love`; external custom domains are not yet supported. | Yes, if wording avoids claiming external domain support. | Do not say couples can connect any domain they own. |
| Privacy by default | **Private by default** | Sites are not indexed unless enabled, but draft/share visibility model still needs clearer product language. | Yes, with careful wording. | Must distinguish search indexing from preview/live visibility. |
| Search indexing | **Hide from search engines unless you enable it** | `noindex` controls exist. | Yes | Safe if described as search visibility, not full secrecy. |
| Draft / preview / published | **Draft for you, preview for sharing, published for guests** | Current implementation still allows draft-preview style access by slug under certain conditions. | Partial | Needs tighter language and eventual product refactor. |
| Custom domains | Avoid claiming support publicly for now. | External custom domains are future work. | No | Current public claim must be removed or rewritten. |
| Message delivery | Be explicit about what is sent, queued, retried, or failed. | Delivery exists but health/failure UX is still maturing. | Partial | Safe only when UI is explicit. |

## Wording guidance

### Prefer
- Custom wedding URL. No upsell.
- Your personalized DayOf URL is included.
- Private by default.
- Hidden from search unless you enable indexing.
- Draft only
- Private preview
- Published / Live

### Avoid
- Connect any domain you own
- Custom domain included
- Private means nobody can reach it under any circumstance
- Published is the only possible visibility state
