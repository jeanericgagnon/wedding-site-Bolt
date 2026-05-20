# The Knot Vendor Page Audit

Date: 2026-05-19

Follow-up comparison: [DayOf vs The Knot Vendor Pages](DAYOF_COMPARISON.md)

Source-code comparison: [DayOf Vendor Pages vs The Knot: Source-Code Comparison](DAYOF_CODE_COMPARISON.md)

Audited surfaces:

- The Knot photographer listing: https://www.theknot.com/marketplace/wedding-photographers-san-francisco-ca
- The Knot venue listing: https://www.theknot.com/marketplace/wedding-reception-venues-san-francisco-ca
- Photographer storefront example: https://www.theknot.com/marketplace/splashes-of-time-photography-san-francisco-ca-2071520
- Venue storefront example: https://www.theknot.com/marketplace/the-fairmont-san-francisco-san-francisco-ca-390207
- Photographer gallery example: https://www.theknot.com/marketplace/splashes-of-time-photography-san-francisco-ca-2071520/photos

Note: the quote modal auto-filled account fields from the active browser session. The saved quote screenshots are cropped/redacted to avoid preserving personal account data.

## Screenshot Inventory

- [01 photographers listing top](screenshots/01-photographers-listing-top.png)
- [02 photographers listing card scroll](screenshots/02-photographers-listing-cards-mid.png)
- [03 photographer more filters top](screenshots/03-photographers-more-filters-modal.png)
- [04 photographer more filters lower](screenshots/04-photographers-more-filters-lower.png)
- [05 photographer more filters bottom](screenshots/05-photographers-more-filters-bottom.png)
- [06 request quote modal top, safe crop](screenshots/06-listing-request-quote-modal.png)
- [07 request quote modal CTA, safe crop](screenshots/07-listing-request-quote-modal-cta.png)
- [08 photographer profile top](screenshots/08-photographer-profile-top.png)
- [09 photographer profile summary and CTA](screenshots/09-photographer-profile-summary-cta.png)
- [10 photographer profile details](screenshots/10-photographer-profile-details.png)
- [11 photographer recommendations block](screenshots/11-photographer-profile-reviews.png)
- [12 photographer review controls](screenshots/12-photographer-profile-review-breakdown.png)
- [13 venue profile top](screenshots/13-venue-profile-top.png)
- [14 venue profile summary and capacity](screenshots/14-venue-profile-summary-capacity.png)
- [15 venue listing top](screenshots/15-venue-listing-top.png)
- [16 venue guest capacity filter](screenshots/16-venue-guest-capacity-filter.png)
- [17 photographer gallery top grid](screenshots/17-photographer-photo-gallery-page.png)
- [18 photographer gallery lower grid](screenshots/18-photographer-photo-gallery-grid.png)

## What The Knot Puts On Vendor Listing Pages

The listing pages are built like a marketplace search product, not a calm vendor profile:

- Persistent brand nav with planning categories, account, favorites, and inbox.
- Big search input for vendor, style, or detail.
- Category-specific filter chips.
- Photographer filters: starting price, distance, award winners, photo and video styles, support diversity, more filters.
- Venue filters: starting price, guest capacity, distance, outdoor space, venue amenities, more filters.
- Result count and selected location.
- Sponsored result labeling plus an info icon.
- Two-column result cards with a right sponsored rail.
- Image carousel or video marker on every result.
- Save/favorite action.
- Rating and review count.
- Location/service area.
- Vendor name.
- Starting price and deal/discount labels.
- Service tags such as videographer services or guest capacity.
- Short vendor excerpt.
- Badges such as award winner, responds quickly, recently updated.
- Repeated Request quote CTA.
- View Vendor Storefront text inside the card.

The useful pattern is the compact comparison card. The heavy part is the amount of marketplace pressure: sponsored rails, deals, badges, quote buttons, and adjacent competitor recommendations all compete with the vendor story.

## Filter Taxonomy Observed

The filters are practical but dense.

Photographer more-filters drawer:

- Deals: all deals, gifts, exclusive discount, offers, custom discount.
- Wedding events: getting engaged, wedding, rehearsals and parties.
- Photo shoot types: boudoir, bridal portraits, day after session, engagement, trash the dress.
- Photo and video options: digital files, drone, film photography, online proofing, photo, printed enlargements, printed proofs, same-day edits, second shooter available, social media sharing, wedding albums.

Venue guest-capacity filter:

- 0-50
- 51-100
- 101-150
- 151-200
- 201-250
- 251-300
- 300+

For DayOf, this argues for a lighter filter model. We only need filters that change a couple's decision: service area, category, price comfort, guest count/capacity, style, availability, and accessibility/logistics.

## What The Knot Puts On Individual Storefronts

Shared storefront anatomy:

- Search bar remains above the storefront, keeping marketplace behavior present.
- Large photo hero with See all gallery CTA.
- Section nav: Photos, About, Details or Amenities, Reviews, Contact.
- Share and save actions.
- Rating summary with review count.
- Request quote CTA near the top.
- Right rail of featured vendors.
- About this vendor paragraph.
- Explore other vendors CTA.
- Category-specific details taxonomy.
- Users who considered this also checked out recommendation carousel.
- Reviews module with trust framing, aggregate score, star distribution, search, sort, filters, review-photo strip, individual reviews, and View more.
- Contact section with location.
- SEO footer links into local vendor categories and breadcrumbs.

Photographer profile details observed:

- Destination wedding packages.
- Photo shoot types.
- Photo and video deliverables.
- Photo and video styles.
- Wedding activities.

Venue profile details observed:

- Address.
- 300+ guest capacity callout.
- Amenity availability indicators.
- Settings, including historic venue, hotel, restaurant.
- Venue service offerings, including food/catering and planning.

The strongest usable pattern is category-specific facts. The weakest pattern is the right rail and repeated marketplace recommendations, which pull attention away from the vendor being evaluated.

## Quote Flow Observed

The quote flow opens a modal titled Message Vendor with a secure-form promise. It shows a coordinator/avatar, first name, last name, email, wedding date, a flexible-date checkbox, policy language, and a large Request quote button. The active session auto-filled personal details.

This is effective for lead capture, but it feels sales-heavy and surprisingly intimate early in the flow. For DayOf, the better version is: "Send wedding context" with already-known wedding data, one optional note, and a calmer CTA such as Ask about availability.

## What To Borrow

- Use category-specific facts rather than one generic vendor template.
- Keep a concise top fact set: category, location/service area, price/range if known, capacity if venue, and response path.
- Use proof chips, but make them factual rather than promotional.
- Keep gallery access obvious.
- Make reviews easy to scan, but do not overbuild review distribution unless we have enough review volume.
- Include a direct path to contact, website, Instagram, and email.
- Preserve one strong inquiry CTA.
- Package the couple's wedding context before they reach out.

## What To Avoid

- Do not copy The Knot's wording, images, or exact layout.
- Do not lead with deals, discounts, badges, and sponsored placement.
- Do not repeat Request quote everywhere.
- Do not put competing vendors beside the vendor profile.
- Do not make filters feel like a database dump.
- Do not make the inquiry form feel like a sales lead form.
- Do not bury the vendor's real style under marketplace widgets.

## Simpler, Less Selly DayOf Direction

Recommended page structure:

1. Hero: one strong image, vendor name, short descriptor, location, category, and one calm CTA.
2. Quick facts: 3-5 facts that answer fit fast.
3. Gallery: 5-8 images, no carousel required.
4. Why they may fit: short proof chips and a human note.
5. Services: small list of packages/services, no hard sell.
6. Reviews or references: one to three quotes or a compact external credibility line.
7. Questions: a few practical FAQs.
8. Contact: direct links plus a wedding-context inquiry form.

CTA language candidates:

- Ask about availability
- Send wedding context
- Start a note
- Check fit
- Ask a question

Copy tone:

- Use calm, practical verbs.
- Prefer "known for", "best for", "serves", "good to know", and "planning note".
- Avoid "exclusive", "deal", "limited", "book now", and repeated urgency.

For the current DayOf vendor profile implementation, the product already has several better primitives than The Knot: proof points, service fit, pricing note, packages, FAQs, external credibility, direct links, and packaged inquiry context. The main simplification opportunity is to reduce repeated explanatory copy, collapse duplicate inquiry CTAs, and make the first screen feel like an elegant handoff rather than a lead funnel.
