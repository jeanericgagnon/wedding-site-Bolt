# Prototype Coverage Audit and UI Import Mapping

## Summary

This document is the pre-import source of truth for the prototype UI in [`/tmp/dayof-side-ui`](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/tmp/dayof-side-ui). It treats the prototype as a **feature inventory first**, then records whether each concept already has a strong landing destination in the current app.

Coverage labels:

- **Feature coverage**
  - `Covered`: the behavior exists in the product today
  - `Partial`: the behavior exists, but only as a fragmented, embedded, or incomplete experience
  - `Missing`: the behavior does not have a real product implementation yet
- **Landing quality**
  - `Strong`: first-class route or reliable direct landing state
  - `Weak`: behavior exists, but the landing is diffused, embedded, or the deep link is nominal
  - `None`: no real landing exists

Decision defaults locked for the UI import:

- Keep the current top-level route families unless a concept is truly homeless.
- Prefer **deep-linkable sub-destinations** over adding new top-level routes for every tool.
- Treat **Travel / Hotel block** and **QR Codes** as the two highest-priority IA decisions before the port.
- Keep admin-only and proof-only tooling out of the import IA unless a user-facing prototype concept depends on it.

## 1. Top-Level Section Mapping

| Prototype section | Current home | Feature coverage | Landing quality | Current note | UI import decision |
| --- | --- | --- | --- | --- | --- |
| `Home` | `/dashboard` and `/dashboard/overview` | Covered | Strong | Owner overview already exists as the dashboard entry. | Keep as the dashboard default route. |
| `Guests` | `/dashboard/guests` | Covered | Strong | Guest operations, RSVP config, follow-up, check-in, exports, and detail drawers are already concentrated here. | Keep as the first-class guest workspace. |
| `Day-of` | `/dashboard/coordinator` | Covered | Strong | Coordinator/day-of mode already aggregates lookup, QR, issue desk, and helper operations. | Keep as the first-class day-of workspace. |
| `Website` | `/dashboard/builder` | Covered | Strong | Site builder is already the owner-facing website workspace. | Keep as the first-class website workspace. |
| `Schedule` | `/dashboard/itinerary` | Covered | Strong | Itinerary/schedule has a dedicated route and route family. | Keep as the first-class schedule workspace. |
| `Registry` | `/dashboard/registry` | Covered | Strong | Owner registry dashboard and guest-facing registry behaviors already exist. | Keep as the first-class registry workspace. |
| `Messages` | `/dashboard/messages` | Covered | Strong | Draft/scheduled/sent messaging workspace already exists. | Keep as the first-class messaging workspace. |
| `Memories` | `/dashboard/photos` | Covered | Strong | Photos, guestbook, recap, follow-up, and guest hub sharing live in one owner route today. | Keep as the first-class memories workspace. |
| `More` | `/dashboard/tools` | Covered | Strong | A real tool library exists already, with grouped secondary tools. | Keep as the overflow tool library. |

## 2. Secondary Tool Mapping

### A. Prototype tools that already have a solid home

| Prototype tool | Current home | Feature coverage | Landing quality | Route shape | Current note | UI import decision |
| --- | --- | --- | --- | --- | --- | --- |
| `Seating` | `/dashboard/seating` | Covered | Strong | First-class route | Full seating workspace exists. | Keep as a `More Tools` destination and optionally pin to sidebar/home. |
| `Coordinator view` | `/dashboard/coordinator` | Covered | Strong | First-class route | Already the day-of workspace. | Keep as an alias into Wedding Day / Coordinator. |
| `Guest lookup` | `/dashboard/seating-lookup` and `/dashboard/coordinator` | Covered | Strong | First-class route + embedded day-of flow | Dedicated lookup route already exists. | Normalize naming to “Guest lookup” in the new UI, but keep current route family. |
| `Name change` | `/dashboard/planning?tab=nameChange` | Covered | Strong | Route + query-state tab | Planning explicitly parses `?tab=nameChange`. | Keep under Planning as a deep-linkable sub-destination. |
| `Song requests` | `/dashboard/planning?tab=songs` | Covered | Strong | Route + query-state tab | Planning explicitly parses `?tab=songs`. | Keep under Planning as a deep-linkable sub-destination. |
| `Vendor notes` | `/dashboard/planning?tab=vendors` | Covered | Strong | Route + query-state tab | Vendors already live inside Planning and the tab is real. | Keep under Planning as a deep-linkable sub-destination. |

### B. Prototype tools that exist, but their home is weak

| Prototype tool | Current home | Feature coverage | Landing quality | Route shape | Current note | UI import decision |
| --- | --- | --- | --- | --- | --- | --- |
| `Guest details` | `/dashboard/guests?tool=guest-details` | Covered | Strong | Route + list-focused deep link | Guests now has a named landing that opens the list/detail workspace directly instead of relying on the default guest view. | Keep under Guests with `?tool=guest-details` as the canonical deep-link. |
| `Hotel block / travel` | `/dashboard/builder?tool=travel` | Covered | Strong | Route + section-focused deep link | Travel content still lives in wedding/site data, but the owner-facing landing now resolves into the Website workspace and focuses the travel section instead of dropping couples into a generic builder view. | Keep under Website as a deep-linkable sub-destination, not a new top-level route. |
| `QR codes` | `/dashboard/builder?tool=qr-codes` plus day-of/photo usage surfaces | Covered | Strong | Route + share/publish deep link | QR generation and usage still span multiple product areas, but the owner-facing launch surface now lands consistently in Website via the builder share/publish checklist. | Keep under Website as the canonical deep-linkable QR destination. |
| `Thank-you notes` | `/dashboard/guests?tool=thank-you-notes` plus registry follow-up | Covered | Strong | Route + filtered guest workspace | Thank-you functionality now has an explicit primary landing in Guests while Registry keeps gift-attribution follow-up. | Keep as a cross-workspace feature with Guests as the primary deep-linkable home. |
| `Photo recap` | `/dashboard/photos?tool=recap` | Covered | Strong | Route + section-focused deep link | Recap now lands on the recap-sharing area inside Memories instead of dropping owners at the top of the photos workspace. | Keep under Memories with the implemented `?tool=recap` landing. |
| `Memory vaults` | `/dashboard/vault?tool=anniversary-capsules` and `/dashboard/vault` | Covered | Strong | First-class route + named sub-destination | Vault now has a named anniversary-capsules landing, so the prototype vault/capsule concept has a real owner-facing home. | Keep `/dashboard/vault` as the base route and `?tool=anniversary-capsules` as the sub-destination. |
| `Shared access` | `/dashboard/settings?tab=team` | Covered | Strong | Route + tab deep link | Collaborator access now lands directly in the Team Access tab instead of relying on generic settings state. | Keep under Settings with the implemented `?tab=team` landing contract. |
| `Privacy` | `/dashboard/settings?tab=privacy` | Covered | Strong | Route + section-focused deep link | Privacy controls now land inside Site Settings and scroll to the privacy section instead of dropping into a generic settings default. | Keep under Settings with the implemented `?tab=privacy` landing contract. |
| `Data export` | `/dashboard/settings?tab=data` and `?tab=site` plus workspace-specific exports | Covered | Strong | Route + section-focused deep link | Data/export behavior is still spread across workspaces, but the owner-facing settings home now lands in the site/data section intentionally. | Keep under Settings with `?tab=data` / `?tab=site` as the canonical owner landing. |
| `Billing` | `/dashboard/settings?tab=billing` | Covered | Strong | Route + tab deep link | Billing now opens directly to the billing tab instead of relying on default settings state. | Keep under Settings with the implemented `?tab=billing` landing contract. |

### C. Prototype tool-library links that now have real landing contracts

These tools used to be nominal links in the existing tool library. They now resolve to real destinations the import can safely target:

| Tool library link | Current target | Why it is weak today | UI import decision |
| --- | --- | --- | --- |
| `Import / Export` | `/dashboard/guests?tool=import-export` | Guests now opens the ops/list workspace with the import/export menu surfaced. | Keep under Guests with the implemented tool landing. |
| `Address Collection` | `/dashboard/guests?tool=address-collection` | Guests now opens the ops/list workspace filtered to missing-address follow-through. | Keep under Guests with the implemented tool landing. |
| `Guest Questions` | `/dashboard/guests?tab=rsvp-settings` | Guests now opens the RSVP-settings workspace directly. | Keep under Guests with the implemented RSVP-settings landing. |
| `Guestbook Prompts` | `/dashboard/photos?tool=guestbook` | Memories now scrolls to the guestbook/hub area instead of dropping on the default top of page. | Keep under Memories with the implemented guestbook landing. |
| `Video Uploads` | `/dashboard/photos?tool=video` | Memories now scrolls to the review/memory-flow area instead of ignoring the tool hint. | Keep under Memories with the implemented video landing. |
| `Advanced Design` | `/dashboard/builder?panel=design` | Builder now opens the design/theme panel directly. | Keep under Website with the implemented design-panel landing. |
| `QR Codes` | `/dashboard/builder?tool=qr-codes` | Builder now opens the share/publish checklist as the canonical QR/share launch surface. | Keep under Website with the implemented tool landing. |

## 3. Guest / Public Flow Mapping

| Prototype-implied public flow | Current home | Feature coverage | Landing quality | Current note | UI import decision |
| --- | --- | --- | --- | --- | --- |
| Public site | `/site/:slug` and wedding-root subdomain `/` | Covered | Strong | Public wedding site is already a dedicated route family. | Keep as the canonical public site route. |
| RSVP | `/rsvp` and `/rsvp/:token` | Covered | Strong | Direct guest RSVP routes already exist. | Keep as the canonical RSVP flow. |
| Guest contact update | `/guest-contact/:token` | Covered | Strong | Private guest contact update flow exists. | Keep as the canonical contact-update route. |
| Event hub / guest hub | `/event/:siteRef` | Covered | Strong | Guest hub already serves RSVP / schedule / travel / photo follow-through patterns. | Keep as the no-app hub route. |
| Event recap | `/event/:siteRef/recap` | Covered | Strong | Public recap route exists. | Keep as the recap route. |
| Photo upload | `/photos/upload` | Covered | Strong | Standalone guest upload route exists. | Keep as the upload route. |
| Vault contribution | `/vault/:siteSlug` and `/vault/:siteSlug/:year` | Covered | Strong | Public vault contribution flow exists. | Keep as the vault route family. |
| Guestbook | `/guestbook/:siteRef` | Covered | Strong | Guestbook submission route exists. | Keep as the guestbook route. |
| Registry guest view | Public site registry sections + registry-specific guest surfaces inside owner flows | Partial | Weak | Registry guest behavior exists, but the prototype emphasizes a first-click guest registry view more explicitly than current routing does. | Keep registry guest experience under the public site / guest context; no separate top-level public route needed now. |
| Travel info | Public site sections and event hub actions | Covered | Strong | Guests can already receive travel content from the site and guest hub, and the owner-side source now has a defined Website landing. | Keep public travel under the site/hub and use the Website travel landing as the owner edit source. |
| Schedule visibility | Public site sections and event hub actions | Covered | Strong | Schedule is exposed publicly via existing public routes and guest hub actions. | Keep as a public-facing section/hub action, not a new public route. |

## 4. Route Decisions for the UI Import

### Keep as first-class top-level routes

- `Home` -> `/dashboard` and `/dashboard/overview`
- `Guests` -> `/dashboard/guests`
- `Day-of` -> `/dashboard/coordinator`
- `Website` -> `/dashboard/builder`
- `Schedule` -> `/dashboard/itinerary`
- `Registry` -> `/dashboard/registry`
- `Messages` -> `/dashboard/messages`
- `Memories` -> `/dashboard/photos`
- `More` -> `/dashboard/tools`

### Keep under existing top-level routes, but require real deep-linkable landing states

- `Guests`
  - `guest-details`
  - `import-export`
  - `address-collection`
  - `rsvp-settings / guest-questions`
  - `thank-you-notes`
- `Website`
  - `share`
  - `qr-codes`
  - `advanced-design`
  - `travel`
- `Memories`
  - `guestbook`
  - `recap`
  - `video`
- `Settings`
  - `team`
  - `privacy`
  - `site` or `data`
  - `billing`
- `Vault`
  - `anniversary-capsules`

### Keep as cross-workspace concepts with a declared primary home

- `Thank-you notes`
  - Primary home for the new UI: **Guests**
  - Secondary operational surface: **Registry**
  - Reason: prototype treats thank-you as a post-wedding workflow, while current implementation splits guest-state and purchased-gift attribution

### High-priority IA decisions to resolve before importing screens

1. **Travel / Hotel block**
   - Status: `Covered` / `Strong`
   - Decision: keep under Website, not a new top-level route
   - Target: `/dashboard/builder?tool=travel`
   - Import rule: prototype travel/hotel actions should land in the builder with the travel section selected or created

2. **QR Codes**
   - Status: `Covered` / `Strong`
   - Decision: keep under Website as a share/publish-adjacent tool
   - Target: `/dashboard/builder?tool=qr-codes`
   - Import rule: prototype QR actions should converge on the share/publish checklist landing

## 5. Gaps to Treat as Import Work, Not Product Regressions

- Top-level coverage is already present; the import should not add new major route families just to mirror the prototype.
- The biggest gaps are **destination truth** and **deep-link fidelity**, not absence of the underlying product behaviors.
- Any prototype action that depends on `?tab=...`, `?tool=...`, or `?panel=...` must not be considered “covered” unless the destination page actually parses and honors that state.

## 6. Acceptance Checklist for the Import

The UI import should preserve the following truths:

- Every prototype top-level section maps to a current route family.
- Every prototype `More` tool is either:
  - mapped to a real first-class route,
  - mapped to a real deep-linkable sub-destination, or
  - explicitly documented as cross-workspace.
- Every guest/public flow implied by the prototype remains mapped to an existing public or guest route.
- `Travel / Hotel block` and `QR Codes` stay mapped to their now-defined Website landings during the port, rather than being re-invented mid-import.
- No prototype concept should be dropped just because its current home is weak.
