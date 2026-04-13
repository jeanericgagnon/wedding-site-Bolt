# DayOf Feature Truth Registry

Operational source of truth for trust-critical claims.

## Trust-critical product truths

### Wedding URL
- Public-safe claim: **Custom wedding URL. No upsell.**
- Actual truth: every couple gets a personalized DayOf URL
- Not yet supported: connecting an external domain the couple already owns

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
- Writing rule: if a send path is incomplete or provider-dependent, say so plainly


### Analytics truth
- Public-safe claim: show measured product signals first
- Actual truth: do not present guessed conversion or traffic metrics as real analytics
- Writing rule: label derived numbers as derived, and prefer measured counts whenever possible


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
