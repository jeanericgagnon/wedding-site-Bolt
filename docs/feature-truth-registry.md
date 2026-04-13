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
