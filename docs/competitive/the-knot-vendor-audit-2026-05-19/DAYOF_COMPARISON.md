# DayOf vs The Knot Vendor Pages

Date: 2026-05-19

Local DayOf routes reviewed:

- http://127.0.0.1:5173/vendor/dayof-sample-photography
- http://127.0.0.1:5173/vendor/dayof-sample-floral
- http://127.0.0.1:5173/vendor/dayof-sample-venue
- http://127.0.0.1:5173/vendor-templates

Code references:

- Public profile renderer: `src/pages/VendorProfile.tsx`
- Sample vendor profiles and source payloads: `src/lib/vendorProfiles.ts`
- Template browser: `src/pages/VendorTemplates.tsx`

## DayOf Screenshot Inventory

- [01 DayOf photography top](dayof-screenshots/01-dayof-photography-top.png)
- [02 DayOf photography proof and gallery](dayof-screenshots/02-dayof-photography-proof-gallery.png)
- [03 DayOf photography inquiry](dayof-screenshots/03-dayof-photography-inquiry.png)
- [04 DayOf floral top](dayof-screenshots/04-dayof-floral-top-rich.png)
- [05 DayOf floral ratings and services](dayof-screenshots/05-dayof-floral-ratings-services.png)
- [06 DayOf floral inquiry](dayof-screenshots/06-dayof-floral-faq-inquiry.png)
- [07 DayOf venue top](dayof-screenshots/07-dayof-venue-top.png)
- [08 DayOf venue inquiry](dayof-screenshots/08-dayof-venue-detail-inquiry.png)
- [09 DayOf vendor template browser](dayof-screenshots/09-dayof-vendor-templates-overview.png)

## The Short Version

DayOf is already less selly than The Knot. We do not have sponsored placement, competing vendor rails, repeated marketplace search, discount badges, "award winner" pressure, or a hard lead-capture feel on the vendor page. That is good.

Current product-truth guardrail: DayOf should describe this surface as vendor profile and inquiry tooling, not as a proven broad marketplace or public vendor directory. The calmer handoff is part of the value proposition; marketplace-scale discovery and moderation are still future-scope ideas unless they are intentionally built and proven.

The Knot is stronger at practical comparability. Their pages make category-specific details obvious: photographer deliverables, venue amenities, guest capacity, service offerings, review distribution, and local search/filter behavior. DayOf has the data model and layout slots for this, but the basic sample pages often collapse to hero, proof chips, gallery, about, links, and inquiry. The richer floral sample proves the system can carry more detail.

Best product direction: keep DayOf calm, but make the page more concrete. Add a tighter top fact set and category-specific detail rows, then simplify the repeated inquiry copy.

## What DayOf Currently Has

The public vendor profile renderer supports:

- Hero image or initials fallback.
- Template/category eyebrow.
- Vendor name and descriptor.
- Link chips for Instagram, website, direct email, external credibility, fit score, and inquiry.
- Primary CTA using source-specific copy.
- Service area chip.
- "Known for" proof cards.
- External credibility card.
- DayOf vendor fit rating with category scores.
- Service fit and planning note cards.
- Mid-page inquiry CTA block.
- Gallery grid.
- Conditional services/packages.
- Conditional testimonials.
- Conditional FAQ.
- About and links block.
- Final inquiry form that can package existing wedding context.
- Direct email fallback.

Most of this lives in `src/pages/VendorProfile.tsx`. The sample profiles in `src/lib/vendorProfiles.ts` show the content range: photography/venue/catering are light, while floral exercises external credibility, rating, packages, testimonials, FAQ, and inquiry questions.

## Side-By-Side Product Comparison

| Area | The Knot | DayOf | Takeaway |
| --- | --- | --- | --- |
| First impression | Marketplace/storefront with search, nav, side rail, hero photo, ratings, quote CTA. | Calm vendor-owned page with large image, name, descriptor, chips, one primary CTA. | DayOf wins tone. Keep it quiet. |
| Vendor focus | Competing vendors appear beside and below the profile. | No competing vendor rail on public profiles. | DayOf should preserve this. |
| CTAs | Repeated "Request quote" across listing cards, profile, and modal. | CTA appears in hero, chip, mid-page inquiry block, final inquiry, and direct email panel. | DayOf is calmer, but still repeats inquiry more than needed. |
| Listing/discovery | Strong search/filter/result-card marketplace. | Vendor template browser exists, but public discovery/listing is not equivalent. | Fine if DayOf is not trying to be a marketplace yet. |
| Category facts | Strong taxonomy by category: capacity, amenities, photo styles, deliverables, settings. | Proof points and service notes exist, but category detail fields are not consistently exposed. | Add more concrete facts without becoming a filter dump. |
| Reviews | Full rating distribution, review search/sort/filter, review photos, review list. | External credibility card, optional testimonials, optional DayOf fit score. | DayOf should avoid review bloat, but needs a stronger lightweight review/reference model. |
| Gallery | Hero plus separate photo gallery page and "See all." | Hero plus up to 6-image in-page gallery. | DayOf is simpler; add "View all" only when image count warrants it. |
| Inquiry | Modal lead form with personal fields and policy language. | In-page form packages wedding context and direct-email fallback. | DayOf wins concept. Copy can be shorter and less product-explanatory. |
| Vendor details | Lots of structured taxonomy. | Beautiful but sometimes abstract: "Known for," "Service fit," "Planning note." | Translate abstractions into category-specific facts couples can act on. |

## Where DayOf Is Better

- The public profile feels like a vendor handoff, not an ad marketplace.
- No sponsored rails or adjacent competitor pressure.
- The inquiry can include the couple's actual wedding context, which is meaningfully better than The Knot's generic quote form.
- Direct links are available without forcing everything through the platform.
- Template-specific visual styles already cover photography, floral, venue, food, beauty, music, planner, travel, and services.
- The richer floral sample proves the page can show external credibility, fit notes, services, testimonial, FAQ, and inquiry prompts without turning into a noisy storefront.

## Where The Knot Is Still More Useful

- Category-specific filters and detail taxonomies are clearer.
- Venue pages expose capacity and amenities directly.
- Photographer pages expose shoot types, deliverables, and style tags.
- Reviews are scannable and searchable.
- Gallery access is obvious.
- Listings make comparison fast for a couple still deciding.

DayOf does not need to copy the marketplace parts. We should copy the practical clarity.

## Current DayOf Friction

1. The top chips mix links, credibility, fit score, and "Inquire" into one row. "Inquire" as a chip duplicates the CTA and does not add factual value.
2. The page has three inquiry moments: hero CTA, mid-page "Inquiry ready," and final "Send an inquiry." The final form is good; the mid-page block feels redundant.
3. "Vendor fit rating" and "9.4/10 fit" feel slightly internal or algorithmic. They are useful, but the label should feel more human.
4. The final inquiry copy over-explains the mechanism: "Package your wedding details into one clean vendor email" plus "Send the form first so..." plus "This becomes the vendor email..." The idea is strong, but the language can be leaner.
5. Basic sample profiles do not exercise packages, FAQ, testimonials, or external credibility, so many pages feel thinner than the product actually supports.
6. Venue pages lack The Knot's most useful venue facts: guest capacity, indoor/outdoor spaces, accessibility, catering/planning inclusions, rain plan, parking, and lodging.
7. Photographer pages lack The Knot's most useful photographer facts: coverage style, deliverables, second shooter, engagement session, albums, turnaround, travel.
8. The direct email fallback panel is useful but visually competes with the intended inquiry path.

## Simpler DayOf Recommendation

Recommended public profile order:

1. Hero: image, vendor name, descriptor, location/service area, category, one CTA.
2. Quick facts: 4-6 factual chips, not link chips.
3. Why this may fit: proof points plus one human planning note.
4. Gallery: compact grid with optional View all.
5. Services: package/service rows when available.
6. Details: category-specific fact rows.
7. References: external rating plus 1-3 selected quotes if available.
8. Questions: only the vendor-specific FAQs.
9. Contact: one wedding-context inquiry form and quieter direct email fallback.

Copy changes:

- Replace "Vendor fit rating" with "Why this may fit" or "DayOf notes."
- Replace "9.4/10 fit" chip with "Strong style match" or omit it from the hero.
- Replace "Inquiry ready" with nothing, or a small "Ready to ask?" anchor.
- Replace "Package your wedding details into one clean vendor email" with "Ask about availability."
- Replace "Send the form first so..." with "We include your date, venue, location, and reply email."
- Keep CTA labels specific: "Ask about availability," "Request a tour," "Ask about floral availability," "Request a tasting."

## Priority Backlog

P1:

- Remove the hero "Inquire" chip and keep the primary CTA.
- Collapse the mid-page inquiry CTA when the final form is visible later on the page.
- Rename DayOf fit labels to a more couple-facing framing.
- Add category-specific detail fields to source payload normalization and rendering.
- Strengthen the basic sample profiles so photography, venue, and catering exercise services/FAQ/testimonials like floral does.

P2:

- Add optional "View all images" when a vendor has more than 6 images.
- Make direct email a quieter fallback inside the final contact section.
- Add a compact review/reference component that shows one external rating line plus selected quotes.
- Add a small loading skeleton for vendor profile pages so lazy-route loading does not capture as a blank white page.

P3:

- Public vendor discovery/listing only if DayOf intentionally becomes a marketplace. If not, avoid building The Knot's search/filter surface.

## Verdict

Do not chase The Knot's marketplace UX. DayOf's advantage is a calmer, couple-context-aware handoff. The right move is to make DayOf more specific, not more salesy: fewer CTAs, fewer explanatory blocks, clearer facts, and better category detail.
