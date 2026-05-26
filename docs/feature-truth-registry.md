# DayOf Feature Truth Registry

Operational source of truth for trust-critical claims.

## Trust-critical product truths

### Wedding URL
- Public-safe claim: **Custom wedding URL. No upsell.**
- Actual truth: every couple gets a personalized DayOf URL
- Not yet supported: connecting an external domain the couple already owns
- Writing rule: say personalized DayOf URL or `dayof.love` URL, not bring-your-own custom domain

### Search visibility
- Public-safe claim: **Hidden from search by default.**
- Actual truth: search indexing is controlled separately from guest access
- Do not imply: hidden from search means nobody can open the site under any circumstance

### Draft vs live
- Public-safe claim: draft stays private to the couple until the site is launched for guests
- Actual truth: runtime behavior now prefers a stricter unpublished -> Coming Soon model, with access controls applying once live

### Protected live access
- Public-safe claim: guests can be gated with a password or invite-only access once the site is live
- Actual truth: these controls are guest-access controls on the live site, not a promise of a fully separate unpublished preview product

## Writing rules
- Do not say custom domain unless external domain mapping is real
- Do not say private by default without clarifying whether you mean search visibility, draft editing, or guest access
- Do not imply a separate private-preview product unless runtime behavior fully supports it
- Prefer guest-facing launch / live for guests language over vague publish metaphors


### Message delivery truth
- Public-safe claim: messages should report whether they are draft, queued, sent, or failed
- Actual truth: delivery UI must not collapse queued/processing/failed into vague success language
- Actual truth: provider telemetry is only as complete as the delivery logs captured
- Actual truth: the owner comms-center compose/save/review lane is runtime-proven, while provider-backed live delivery readback remains intentionally deferred until a safe send lane is explicitly reopened
- Writing rule: if a send path is incomplete or provider-dependent, say so plainly, and do not imply reopened live-send proof when only the non-SMS owner workflow lane is green


### Analytics truth
- Public-safe claim: show measured product signals first
- Actual truth: do not present guessed conversion or traffic metrics as real analytics
- Actual truth: the owner overview analytics readback and public/guest privacy boundary are live-proven on the shipped runtime
- Not yet proven: fuller visit/open/QR event instrumentation, durable event storage, and richer traffic funnel depth beyond the current measured owner signals
- Writing rule: label derived numbers as derived, prefer measured counts whenever possible, and do not imply deeper traffic instrumentation than the shipped runtime actually has


### Support audit truth
- Public-safe claim: recent publish and delivery activity should be inspectable
- Actual truth: current builder revision history is local/browser-scoped, not yet a durable server audit trail
- Writing rule: do not overclaim cross-device or permanent audit history until it exists


### Use-case pack truth
- Public-safe claim: destination, bilingual, and interfaith are the first focused packs being deepened
- Actual truth: destination currently has the strongest structural proof; bilingual and interfaith are still partial
- Writing rule: do not describe the three packs as equally mature until behavior catches up

### Draft-assist truth
- Public-safe claim: grounded draft help for FAQs, welcome notes, reminders, and day-of updates
- Actual truth: these helpers use known wedding data and require explicit user insertion/editing/sending
- Writing rule: do not imply autonomous AI generation or sending


### Migration truth
- Public-safe claim: DayOf supports a calmer switching path from Zola, Joy, The Knot, and similar wedding platforms
- Actual truth: current migration work is guided and partial, with intake, recovery helpers, import review, and checklists — not a fully automated migration engine
- Writing rule: say guided migration or switching support, not full automated import


### Household and plus-one truth
- Public-safe claim: DayOf understands household grouping and plus-one status well enough to support guest ops
- Actual truth: household and plus-one support is now visible and more explicit, but still not a fully comprehensive rules engine for every edge case
- Writing rule: describe this as clearer household/plus-one handling, not perfect household automation


### Multi-event RSVP truth
- Public-safe claim: DayOf can distinguish between ceremony/reception/default-event paths and more custom event-specific invites
- Actual truth: the product now surfaces per-event invite structure and event-aware reminder drafting, but it is still not a full event-by-event rules engine everywhere
- Writing rule: describe this as clearer multi-event RSVP visibility and follow-up, not perfect per-event automation


### Meal and dietary truth
- Public-safe claim: DayOf can surface meal choices, missing meal follow-up, and dietary notes in guest ops
- Actual truth: meal and dietary support is now clearer and more visible, but still not a fully comprehensive catering workflow
- Writing rule: describe this as stronger meal/dietary handling, not a complete catering operations system


### RSVP exception handling truth
- Public-safe claim: DayOf can help couples spot RSVP exception cases such as split household responses, unnamed plus-ones, partial replies, and manual handling needs
- Actual truth: the current product surfaces and organizes these cases in guest ops, but it does not fully automate resolution logic or policy decisions
- Writing rule: present this as clearer exception handling and follow-up support, not fully automated edge-case reconciliation


### Check-in realism truth
- Public-safe claim: DayOf supports day-of guest lookup, seating answers, check-in tracking, and basic live exception awareness
- Actual truth: the current product can surface some live exception states and route staff toward coordinator or seating flows, but it is not yet a full event-day operations system
- Writing rule: describe this as practical day-of support with some live exception handling, not complete arrival control software


### Guest messaging lifecycle truth
- Public-safe claim: DayOf supports the main guest communication stages from invite through reminder, week-of, day-of, and thank-you follow-up
- Actual truth: lifecycle stages and several drafting / operational surfaces now exist, but messaging maturity is still closer to a practical wedding workflow layer than a full communications CRM
- Writing rule: describe this as calm lifecycle support for wedding messaging, not an all-purpose guest comms platform


### Planner handoff truth
- Public-safe claim: DayOf supports couple-led planner collaboration with clearer handoff cues, role framing, and boundary reassurance
- Actual truth: planner collaboration is meaningfully productized, but handoff maturity is still closer to structured support than a full delegation and approval system
- Writing rule: describe this as graceful planner collaboration with clear boundaries, not enterprise-grade workflow governance


### Public-site usefulness truth
- Public-safe claim: DayOf gives couples a public wedding site that feels calmer and more useful than a simple brochure page, with stronger RSVP and logistics guidance
- Actual truth: the public site is materially better at orientation, return visits, and planning support than before, but it is still not deeply personalized for every guest scenario
- Writing rule: describe this as more useful guest guidance and logistics clarity, not fully individualized guest intelligence


### Language-support truth
- Public-safe claim: DayOf supports guest-facing language continuity and owner-triggered public-site translation
- Actual truth: guest link language handling, guest-facing language resources, and owner-triggered public-site translation are real
- Not yet proven: a fully translated dashboard or full planning-workspace internationalization
- Writing rule: describe this as guest-facing and public-site language support, not a completely internationalized app


### Vendor-profile truth
- Public-safe claim: DayOf supports vendor profile pages, constrained vendor-profile creation, and public inquiry handoff
- Actual truth: public vendor profiles, inquiry submission, and signed-in profile/template tooling are real
- Not yet proven: marketplace-style vendor search, broad public discovery, sponsored placement, or deep moderation systems
- Writing rule: describe this as vendor profile and inquiry tooling, not a full vendor marketplace or directory network


### Vault-and-archive truth
- Public-safe claim: DayOf supports anniversary vault contributions, owner vault management, and post-wedding archive moments
- Actual truth: public vault contribution and the core owner vault/archive surfaces are real and more strongly proven than optional provider-specific storage integrations
- Not yet proven: broad Google Drive provider connect/upload/recover depth as a premium-default proof lane
- Writing rule: describe Drive-backed provider flows as optional and narrower than the core vault/archive experience unless live provider proof is freshly available


### Guestbook truth
- Public-safe claim: DayOf supports guestbook note submission as part of the guest-memory experience
- Actual truth: the guestbook route, submit flow, guest-safe validation, and invite/access packaging are implemented
- Not yet proven: deeper public submit/readback/moderation proof on the same level as the strongest RSVP, photo-upload, or vault-contribution lanes
- Writing rule: describe this as implemented guestbook note capture with lighter proof depth, not as a deeply proven moderated guestbook system


### Registry repair truth
- Public-safe claim: DayOf supports registry repair workflows for weak imports, including refresh, re-import, manual cleanup, and merchant-aware repair guidance
- Actual truth: repair support is now meaningfully better, but still not a guaranteed one-click fix for every merchant or every broken card
- Writing rule: describe this as a practical repair workflow with fallback paths, not perfect automated recovery


### Registry cleanup truth
- Public-safe claim: DayOf helps couples review duplicate gifts, weak imports, image issues, and repair candidates in one cleanup workflow
- Actual truth: cleanup support is now more visible and actionable, but still depends on human review rather than automatic merging or auto-resolution
- Writing rule: describe this as guided cleanup support, not autonomous registry cleanup


### Registry purchased visibility rules
- Current grounded rule: purchased-state tracking is definitely real inside the dashboard
- Current uncertain area: guest-facing purchased visibility is not yet proven to mirror dashboard nuance across every presentation path
- Safe wording rule: say purchased items can be tracked and may be hidden when configured, but avoid promising fully nuanced guest-facing purchased-state behavior until runtime alignment is verified


### Registry public purchased-state truth
- Current grounded truth: internal dashboard purchase tracking is stronger than current public registry presentation
- Safe public claim: DayOf supports internal purchased tracking and configurable hiding, but guest-facing purchased visibility nuance is still being tightened
- Writing rule: avoid claiming full dashboard/public purchased-state parity until runtime behavior is intentionally aligned


### Registry live E2E proof truth
- Current grounded truth: a live-ish smoke now proves login, registry entry, add-item modal open, and URL import autofill at a basic level
- It does not yet prove full multi-merchant reliability, save correctness across merchants, or public purchased-state alignment
- Writing rule: say there is live smoke proof for the import path, not complete registry hardening proof
