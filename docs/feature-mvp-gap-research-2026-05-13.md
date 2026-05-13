# Competitor-Informed MVP And Gap Map

Date: 2026-05-13

Purpose:
- turn three ambiguous active features into a concrete MVP bar
- separate the shipped launch baseline from the deeper product-depth scope now reopened as active work
- give the backlog an honest build target

Method:
- reviewed official product and help pages from direct competitors and adjacent event products
- used those patterns only to define baseline expectations, not to copy their positioning

## Sources

Day-of / coordinator:
- [Zola seating chart FAQ](https://www.zola.com/faq/360038917171-How-do-I-use-the-Zola-seating-chart-)
- [WeddingWire seating chart](https://www.weddingwire.com/wedding-planning/wedding-seating-tables.html)
- [Joy wedding website and RSVP features](https://withjoy.com/wedding-website/)
- [Eventbrite Organizer check-in help](https://www.eventbrite.com/help/en-us/articles/741083/how-to-check-in-attendees-at-the-event-with-eventbrite-organizer/)

Name change:
- [HitchSwitch](https://www.hitchswitch.com/)
- [NewlyNamed FAQ: what is included](https://help.newlynamed.com/article/53-whats-included-in-a-newlynamed-name-change-kit)

Registry / barcode:
- [MyRegistry smartphone app](https://www.myregistry.com/Info/smartphoneapps/default.aspx?cloc=ca&lang=en)
- [Babylist: add items to registry](https://help.babylist.com/hc/en-us/articles/214587937-How-do-I-add-items-to-my-Babylist-registry)
- [The Knot browser button](https://helpcenter.theknot.com/hc/en-us/articles/360043137191-How-does-the-Add-to-The-Knot-browser-button-work)

## Day-of / coordinator

### Competitor baseline

- Seating and guest movement are event-specific, not one universal arrival state.
  - Zola asks which event the seating chart is for before building it.
  - WeddingWire explicitly supports seating for different events.
- Guest list truth stays connected to events, plus-ones, households, and RSVP responses.
  - Joy centers per-event RSVP, plus-ones, households, follow-up questions, and personalized schedules.
- Door workflows expect live validation, not just a binary check-in toggle.
  - Eventbrite supports scan or manual check-in, role-gated permissions, duplicate validation, and multi-slot check-in.

### DayOf MVP bar

DayOf should count this feature as MVP-complete when it does all of the following:

- event-specific arrival tracking is first-class for the main wedding events
- coordinator mode can search guests and resolve arrivals without leaving the day-of workspace
- the door queue supports explicit states for:
  - `already-checked-in`
  - `rsvp-unresolved`
  - `unassigned-seat`
  - `wrong-event`
  - `walk-in`
  - `help-desk`
  - `manager-decision`
  - `household-mismatch`
- helpers can check in, undo check-in, and route exceptions with role-safe controls
- the same workspace still exposes timeline, Q&A, and day-of message actions
- per-event counts make it obvious who is in, who needs review, and what still has not arrived

### Current DayOf state

- Shipped now:
  - coordinator dashboard
  - helper roles
  - search and active guest queue
  - basic check-in and undo
  - timeline, Q&A, and day-of message panels
- Deeper local batch now adds:
  - event-scoped arrival reads and writes for coordinator check-in
  - coordinator guest fetch with household + event-arrival context
  - explicit wrong-event, walk-in, help-desk, manager-decision, and household-mismatch handling
  - per-event arrival counters and a current-door board
  - no-match routing inside coordinator mode
- Newer local-only depth batch now adds:
  - multi-event staffing handoff cards with saved lead/support/note state per event
  - a persistent issue desk for seat changes, substitute attendees, plus-one swaps, and manager notes
  - table reassignment inside coordinator mode for seating-change-at-door workflow
  - saved household-context issue history so substitute and plus-one decisions do not disappear after the line moves
- Deployed/live now:
  - migrations `20260513170000_coordinator_event_checkin_write.sql` and `20260513213000_coordinator_handoff_issue_depth.sql` applied remotely
  - deeper runtime deployed on Vercel production `dpl_7BJdMft8MT5jtVCdS1dd1JTM7Ank`
  - `V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof -- --require-live` is green against the shipped deeper runtime, including staffing handoff and issue-desk surfaces

### Active deeper scope

No remaining coordinator gap is active inside the current competitor-informed MVP bar. The deeper handoff / substitute / seat-change / issue-history scope above is now shipped and live-proven.

## Name change

### Competitor baseline

- Paid specialists sell a personalized checklist plus a dashboard, not just a static article.
  - HitchSwitch markets pre-filled forms, dashboard access, checklist, and step-by-step guidance.
  - NewlyNamed markets personalized kits plus institution selection from a large account library.
- The baseline execution chain is consistent:
  - legal proof
  - Social Security
  - driver license / REAL ID
  - passport if needed
  - then downstream institutions
- Travel and identity-adjacent follow-through matters in the category.
  - HitchSwitch and NewlyNamed both call out TSA, Global Entry, travel, licenses, and large institution coverage.
- Broad 50-state depth is a premium differentiator in this space.

### DayOf MVP bar

DayOf should count this feature as MVP-complete when it does all of the following:

- provides a US-first personalized planner for a primary name-change case
- handles both marriage-proof and court-order proof entry
- enforces the legal-proof -> SSA -> DMV/ID -> passport -> downstream sequence honestly
- gives usable execution cards for:
  - SSA
  - DMV / state ID
  - passport
  - employer / payroll
  - banks / cards
  - insurance / medical
  - voter
  - TSA / travel profiles
  - utilities / courtesy cleanup
- includes reminders, status tracking, and copy-ready account update templates
- is discoverable from the post-wedding dashboard
- stays clearly framed as guidance, not legal filing automation or paid-kit upsell

### Current DayOf state

- Shipped now:
  - planner UI with execution cards
  - reminders and reminder posture
  - status vault
  - account update templates
  - TSA / travel flow
  - dual-partner proof tracks
  - immigration-aware and non-U.S.-passport-aware logic branches in the engine
- Deeper shipped batch now adds:
  - explicit California-guided coverage framing for the state-specific lane
  - claim-safe dashboard and helper copy that separates the California lane from federal and downstream follow-through
  - marriage-state plus county / jurisdiction intake inside case setup
  - generic state-license and issuing-authority labels so document intake does not overclaim California scope
  - verified post-wedding dashboard and planner resume placement for the shipped planner surfaces
  - state playbooks for California plus expanded Nevada / New York / Texas / Florida / Washington guidance with generic fallback for other marriage jurisdictions
  - institution coverage mapping from the downstream account library so rollout lanes read like a working execution system
  - stronger dual-partner rollout surfaces that keep proof and downstream status separated per partner
  - action, downstream, status, and dual-partner exports so the planner can hand a real packet or summary into a live work session
  - live reminder-RPC compatibility plus planning budget/vendor compatibility so the authenticated planner route can still save and rehydrate on the shipped production schema mix
- Deployed/live now:
  - deeper runtime deployed on Vercel production `dpl_5tPUrJk14bc91cCLZqAaf7B1T7qU`
  - reminder compatibility migration `20260513193000_fix_name_change_reminders_replace_runtime.sql` applied remotely
  - `V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime -- --require-live` is green against the richer shipped runtime, including saved reload

### Active deeper scope

No remaining name-change gap is active inside the current competitor-informed MVP bar. The broader planner-depth scope above is now shipped and live-proven.

## Universal Registry Barcode Scanner

### Competitor baseline

- Universal registries treat "add from anywhere" as table stakes.
  - Babylist supports browser-button and mobile add-item flows.
  - The Knot supports add-from-anywhere through a browser button.
- Stronger registry leaders add in-store capture and retailer choice.
  - MyRegistry markets mobile barcode scanning, best-price help, registry sync, and add-from-any-store behavior.

### DayOf MVP bar

DayOf should count this feature as MVP-complete when it does all of the following:

- supports manual barcode entry and camera scanning
- normalizes UPC / EAN / GTIN / ISBN input
- looks up product data with a confidence signal
- lets the owner keep a weak match, edit by hand, or add without a store
- lets the owner choose a retailer or best-price option when matches exist
- persists barcode-backed items into the registry with useful metadata
- falls back safely to manual edit when no confident match exists

### Current DayOf state

- The competitor-informed MVP is already shipped and live-proven.
- Shipped now:
  - camera scanner
  - manual barcode entry
  - normalized lookup
  - confidence and review-required states
  - retailer options
  - `Use best price`
  - `Add without store`
  - Open Library ISBN fallback
  - optional `UPCITEMDB_API_KEY` ladder support
  - registry persistence and live proof
- Deeper shipped batch now adds:
  - structured duplicate suggestion groups with signal-aware matching across barcode, source URL, canonical URL, title, and price clues
  - owner merge workflow that preserves stronger metadata, merged quantities, notes, and purchase truth instead of stopping at passive duplicate counts
  - duplicate warnings during barcode-backed add flow when the scanned product already exists in the registry
  - richer refresh/review status surfaces so checked dates, next review dates, price movement, and retry state stay visible after save
  - merged provider/product-match depth across the current lookup ladder so multiple providers can reinforce the saved match instead of first-hit short-circuiting
  - shared retailer refresh parity so selected merchant, URL, canonical URL, and estimated price stay aligned after refresh
  - broader browser-safe scan support through a compatibility camera mode plus barcode-photo fallback when the native camera path is unavailable
- Deployed/live now:
  - registry duplicate-merge migration `20260513195500_add_registry_duplicate_merge.sql` applied remotely
  - deeper runtime deployed on Vercel production `dpl_4VVsiJirkb7PJhzNWV3w791teAsw`
  - `registry-barcode-lookup --no-verify-jwt` redeployed live with the merged provider/product-match path
  - `LIVE_REGISTRY_WRITE_READ=1 npm run proof:v1:registry -- --require-live` is green against the richer shipped runtime, including duplicate merge collapse/readback, barcode-backed save, merged provider behavior, refresh parity, and compatibility camera/photo fallback

### Active deeper scope

No remaining registry gap is active inside the current competitor-informed MVP bar. The broader provider/product-match depth, retailer refresh parity, and camera compatibility scope above is now shipped and live-proven.

## Decision For The Active Board

- `Day-of / coordinator` has now met both the shipped launch-baseline MVP bar and the deeper product-depth scope that was reopened on the active board.
- `Name change` has now met both the shipped launch-baseline MVP bar and the deeper planner-depth scope that was reopened on the active board.
- `Universal Registry Barcode Scanner` has now met both the shipped launch-baseline MVP bar and the deeper product-depth scope that was reopened on the active board.
