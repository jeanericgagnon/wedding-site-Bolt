# DayOf Claims Matrix

Internal source of truth for customer-facing claims. See also `docs/feature-truth-registry.md` for the operational writing rules behind these claims.

## Core trust claims

| Claim area | Public wording direction | Current product truth | Public-safe? | Notes |
|---|---|---|---|---|
| Wedding URL | **Custom wedding URL. No upsell.** | Couples get a personalized DayOf URL / slug on `dayof.love`; external custom domains are not yet supported. | Yes, if wording avoids claiming external domain support. | Do not say couples can connect any domain they own until external custom-domain support actually exists. |
| Privacy by default | **Hidden from search by default** | Sites are not indexed unless enabled, and draft editing stays private to the couple. | Yes | Must distinguish search indexing from guest-access controls on the live site. |
| Search indexing | **Hide from search engines unless you enable it** | `noindex` controls exist. | Yes | Safe if described as search visibility, not full secrecy. |
| Draft / preview / published | **Draft for you, published for guests** | Current implementation still allows draft-preview style access by slug under certain conditions. | Partial | Needs tighter language and eventual product refactor. |
| Custom domains | Avoid claiming support publicly for now. | Personalized `*.dayof.love` URLs are real; external bring-your-own domains are future work. | No | Keep the safe distinction explicit: branded DayOf host support exists, external domain mapping does not. |
| Message delivery | Be explicit about what is sent, queued, processing, retried, or failed. | Delivery exists and status surfaces should reflect actual message state instead of vague success language. Failed states should show real recipient/error evidence when available. Provider metrics are only as complete as captured delivery logs. | Partial | Safe only when UI is explicit and backed by delivery logs. |
| Publish state | Be explicit about draft, publishing now, live and up to date, live but stale, or publish needs attention. | Publish status can be derived from runtime state and should not collapse failures or stale edits into a vague live badge. | Partial | Safe only when status UI uses shared publish-state logic. |
| Analytics baseline | Show measured product signals first, not invented funnel numbers. | Current baseline should prefer actual RSVP, registry, photo, and guest-input counts over guessed traffic/conversion metrics. The owner analytics readback and guest-route privacy lane are live-proven, but broader visit/open/QR event instrumentation is still partial. | Partial | Safe when derived metrics are clearly labeled and copy does not imply fuller traffic instrumentation than the current shipped runtime actually has. |
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

| RSVP exceptions | Say DayOf can flag tricky RSVP cases like split household replies, missing plus-one names, partial replies, and manual follow-up. | Current guest ops now surfaces exception states and gives light operational follow-up actions. Resolution still depends on human review. | Partial | Safe when framed as visibility + workflow support rather than automated reconciliation. |

| Check-in realism | Say DayOf supports guest lookup, seating answers, check-in tracking, and basic live exception awareness. | Current product can flag some live check-in issues and route staff to the right workspace, but advanced arrival ops and exception resolution are still human-driven. | Partial | Safe when framed as practical day-of support, not a full event operations control system. |

| Guest messaging lifecycle | Say DayOf supports invite, reminder, week-of, day-of, and thank-you communication stages for weddings. | Current product has shared lifecycle framing plus real invite/reminder/day-of support and lighter support for week-of / thank-you stages. It is not a full communications CRM. | Partial | Safe when framed as wedding-specific lifecycle support rather than a general messaging platform. |

| Planner handoff | Say DayOf supports couple-led planner collaboration with role framing, handoff cues, and boundary reassurance. | Current product has real planner invite positioning, role-aware surfaces, and clearer ownership cues, but not a full approval/governance workflow. | Partial | Safe when framed as graceful collaboration support, not fully mature delegation software. |

| Public-site usefulness | Say DayOf gives couples a calmer, more useful public wedding site with stronger RSVP and logistics guidance. | Current public experience is stronger on orientation, return visits, and practical guidance, but still not deeply personalized per guest scenario. | Partial | Safe when framed as improved guest usefulness, not individualized guest intelligence. |

| Language support | Say DayOf supports guest-facing language continuity and owner-triggered public-site translation. | Guest link language handling, guest-facing resource packs, and owner-triggered public-site translation are real. Full dashboard/app internationalization is not yet proven. | Partial | Safe when scoped to guest-facing and public-site language support, not a fully translated planning workspace. |

| Vendor profiles | Say DayOf supports vendor profile pages, constrained vendor-profile creation, and public inquiry handoff. | Public vendor profiles and inquiry flows are real, but vendor search, marketplace discovery, sponsored placement, and deep moderation are not proven product scope. | Partial | Safe when framed as profile and inquiry tooling, not a full vendor marketplace. |

| Vault + archive | Say DayOf supports anniversary vault contributions, owner vault management, and post-wedding archive moments. | Public vault contribution and core owner vault management are proven more strongly than optional Google Drive-backed provider flows. | Partial | Safe when framed around the core vault/archive experience, not guaranteed provider-specific Drive depth. |

| Guestbook | Say DayOf supports guestbook note submission as part of the guest-memory surface. | Guestbook route, submit flow, guest-safe validation, and access packaging are real, but public submit/readback/moderation proof depth is lighter than the stronger RSVP/photo/vault lanes. | Partial | Safe when framed as implemented guestbook note capture, not as a deeply proven moderated guestbook system. |

| Registry repair | Say DayOf supports registry repair with refresh, re-import, manual cleanup, and merchant-aware guidance. | Current product now has clearer repair states and better recovery paths, but still not guaranteed one-click recovery across all merchants. | Partial | Safe when framed as practical repair support, not flawless automated recovery. |

| Registry cleanup | Say DayOf helps couples review duplicates, weak imports, image issues, and repair candidates in one cleanup workflow. | Current product now has bulk review states and richer cleanup actions, but still relies on human review and does not auto-merge items. | Partial | Safe when framed as guided cleanup support rather than autonomous cleanup. |

| Registry purchased visibility | Say DayOf tracks purchased items internally and supports hide-when-purchased behavior. | Dashboard purchased-state logic is real. Public/guest-facing nuance still needs stricter verification before stronger claims. | Partial | Safe when framed around internal tracking plus configurable hiding, not fully proven public nuance. |

| Registry public purchased state | Say DayOf supports internal purchased tracking and configurable hide-when-purchased behavior. | Dashboard logic is stronger than current public presentation. Full guest-facing parity is not yet proven. | Partial | Safe when framed around internal truth plus configurable hiding, not full public-state parity. |

| Registry live E2E | Say DayOf now has live-ish smoke proof for the core registry import entry path. | Current smoke proves login, registry route, add-item form, and URL autofill basics. It does not prove full cross-merchant hardening. | Partial | Safe when framed as import-path smoke proof, not complete registry reliability proof. |
