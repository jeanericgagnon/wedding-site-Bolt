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
| Message delivery | Be explicit about what is sent, queued, processing, retried, or failed. | Delivery exists and status surfaces should reflect actual message state instead of vague success language. Failed states should show real recipient/error evidence when available. Provider metrics are only as complete as captured delivery logs. | Partial | Safe only when UI is explicit and backed by delivery logs. |
| Publish state | Be explicit about draft, publishing now, live and up to date, live but stale, or publish needs attention. | Publish status can be derived from runtime state and should not collapse failures or stale edits into a vague live badge. | Partial | Safe only when status UI uses shared publish-state logic. |
| Analytics baseline | Show measured product signals first, not invented funnel numbers. | Current baseline should prefer actual RSVP, registry, photo, and guest-input counts over guessed traffic/conversion metrics. | Partial | Safe only when derived metrics are clearly labeled. |
| Support audit trail | Recent publish and delivery activity should be inspectable. | Current builder revision history is local/browser-scoped, so it helps support but is not yet a durable server audit system. | Partial | Safe only when UI says this history is local and limited. |

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

| Use-case packs | Talk about destination, bilingual, and interfaith packs as first focused packs, not fully equal mature systems. | Destination currently has stronger behavioral proof than bilingual/interfaith, which are still partial. | Partial | Safe only when wording keeps maturity unevenness honest. |
| Draft assists | Describe these as grounded drafting helpers, not autonomous AI. | FAQ, welcome note, RSVP reminder, and day-of update helpers use known wedding data and still require explicit insert/edit/send. | Yes | Avoid implying autonomy or server-side AI generation. |

| Migration | DayOf supports a calmer switching path from other wedding platforms. | Migration currently includes intake/source selection, setup guidance, guest-import review truth, story/event/FAQ/registry recovery helpers, and review checklists. It is not yet a full one-click migration system. | Partial | Safe only when framed as guided migration, not complete automated import. |

| Household + plus-one | Say that household grouping and plus-one status are clearer and more operational. | Current product now surfaces grouped households, mixed-response household states, plus-one availability, unresolved plus-one names, and household context in guest ops. It is still not a full edge-case rules engine. | Partial | Safe when described as clearer truth and visibility, not perfect automation. |

| Multi-event RSVP | Say DayOf can show clearer ceremony/reception/custom-event invite structure and event-aware follow-up. | Current product now surfaces per-event invite structure in guest ops and RSVP board, and reminder drafting can be event-aware. It is still not a full rules engine across every surface. | Partial | Safe when framed as clearer visibility/follow-up, not perfect event-specific automation. |

| Meal + dietary | Say DayOf can track meal choices, dietary notes, and missing-meal follow-up more clearly. | Current product now surfaces dietary notes better, gives meal follow-up tools, and shows a meal/dietary summary in guest ops. It is still not a full catering workflow. | Partial | Safe when framed as stronger operational visibility, not full catering automation. |
