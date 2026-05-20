# DayOf Vendor Pages vs The Knot: Source-Code Comparison

Date: 2026-05-19

Scope: this compares The Knot vendor-page audit against the current DayOf implementation by reading DayOf source, migrations, edge functions, and tests. DayOf observations below are code-backed, not screenshot-backed.

## Bottom Line

DayOf is already much less marketplace-y than The Knot. The code does not build a public vendor directory with sponsored rails, competitor recommendations, deal badges, or review-search machinery. That is the right direction.

The main weakness is that DayOf is simpler in the wrong place: our code has many visual templates and inquiry affordances, but it does not yet model the category-specific facts that make The Knot pages useful. The Knot's strongest reusable idea is not the sales funnel. It is structured, category-aware detail: capacity for venues, deliverables for photographers, service style for catering, amenities, travel, accessibility, and other decision facts.

## Current DayOf Architecture

Public profile data is intentionally small:

- `src/lib/vendorProfiles.ts:13` defines `VendorProfile` with `id`, `slug`, vendor name, descriptor, about, hero image, image URLs, Instagram, website, contact email, and generic `source_payload`.
- `src/lib/vendorProfiles.ts:27` defines template IDs for categories/designs such as `photography`, `floral`, `venue`, `planner`, `food`, `beauty`, `music`, and `travel`.
- `src/lib/vendorProfiles.ts:115` selects the same small core profile shape from Supabase.
- `supabase/migrations/20260419194000_vendor_profile_v1.sql:1` creates `vendor_profiles` with a compact schema and a generic `source_payload jsonb`.
- `supabase/migrations/20260419194000_vendor_profile_v1.sql:18` creates `vendor_profile_inquiries` as basic lead capture.
- `supabase/migrations/20260505100000_vendor_rating_and_inquiry_context.sql:6` adds only wedding date, venue name, and venue location to inquiries.

Customization is also generic:

- `src/lib/vendorProfiles.ts:160` defines `VendorProfileCustomization`.
- `src/lib/vendorProfiles.ts:167` stores generic `proof_points`.
- `src/lib/vendorProfiles.ts:170` stores generic `packages`.
- `src/lib/vendorProfiles.ts:171` stores generic `faqs`.
- `src/lib/vendorProfiles.ts:172` stores generic `testimonials`.
- `src/lib/vendorProfiles.ts:173` stores generic `inquiry_questions`.
- `src/lib/vendorProfiles.ts:174` stores a DayOf fit rating.
- `src/lib/vendorProfiles.ts:175` stores external credibility.

This is clean and flexible, but it means the code does not have a first-class place for category facts such as venue capacity, ceremony settings, catering service style, photo deliverables, photo style, music equipment, transportation coverage, or beauty trial details.

## Where DayOf Is Better Than The Knot

### 1. No Marketplace Clutter

The public DayOf renderer focuses on a single vendor:

- `src/pages/VendorProfile.tsx:300` renders one hero section.
- `src/pages/VendorProfile.tsx:468` renders the vendor gallery.
- `src/pages/VendorProfile.tsx:550` renders about and links.
- `src/pages/VendorProfile.tsx:582` renders the inquiry section.

There is no right rail, sponsored result block, related-vendor carousel, or SEO footer lattice in this renderer. That is a meaningful product advantage over The Knot because the page keeps attention on the vendor the couple is considering.

### 2. Packaged Inquiry Context Is a Real Differentiator

The Knot quote modal collects user details. DayOf can do something more helpful: reuse the couple's actual wedding context.

Code path:

- `src/pages/VendorProfile.tsx:97` loads inquiry context on the public vendor page.
- `src/lib/vendorProfiles.ts:798` gets the signed-in user's active wedding site context.
- `src/lib/vendorProfiles.ts:787` builds a summary with couple, date, venue, location, and DayOf site.
- `src/pages/VendorProfile.tsx:254` submits the inquiry.
- `src/pages/VendorProfile.tsx:259` sends the wedding fields and packaged context.
- `supabase/functions/vendor-profile-inquiry-submit/index.ts:39` includes couple, name, email, date, venue, location, and site rows in the vendor email.
- `supabase/functions/vendor-profile-inquiry-submit/index.ts:69` includes packaged wedding context in the email when available.

This is the best thing to keep. It is simpler and more useful than "Request quote" because it gives the vendor enough context to reply intelligently.

### 3. Inquiry Safety Is More Thoughtful Than a Direct Public Insert

The current code routes inquiries through an edge function:

- `src/lib/vendorProfiles.ts:776` invokes `vendor-profile-inquiry-submit`.
- `supabase/functions/vendor-profile-inquiry-submit/index.ts:132` sanitizes the request body.
- `supabase/functions/vendor-profile-inquiry-submit/index.ts:158` applies public submission rate limiting.
- `supabase/migrations/20260501082000_harden_vendor_profile_inquiries.sql:1` documents the move away from direct public inserts.
- `supabase/migrations/20260501082000_harden_vendor_profile_inquiries.sql:8` limits read access to the creator of the vendor profile.

This is better than making the browser write directly to the inquiry table.

### 4. Useful Limits Are Already in the Data Normalizers

The implementation resists becoming a giant marketplace page:

- `src/lib/vendorProfiles.ts:228` caps packages at 4.
- `src/lib/vendorProfiles.ts:244` caps FAQs at 5.
- `src/lib/vendorProfiles.ts:256` caps testimonials at 3.
- `src/lib/vendorProfiles.ts:358` caps proof points at 3.
- `src/lib/vendorProfiles.ts:378` caps inquiry prompts at 4.

These limits support the "simpler and less selly" goal. Keep them.

### 5. External Credibility Is Compact

The Knot has an entire review product. DayOf has a smaller credibility primitive:

- `src/lib/vendorProfiles.ts:150` defines `VendorExternalCredibility`.
- `src/lib/vendorProfiles.ts:288` normalizes rating, review count, source label, URL, place ID, and sync time.
- `src/pages/VendorProfile.tsx:363` renders the external credibility panel.
- `src/pages/VendorProfile.tsx:376` labels it as `External credibility`.

This is the right-sized product shape. The label and explanatory copy should become more human, but the underlying scope is good.

## Where The Knot Is Still More Useful

### 1. Category Facts Are Missing From Our Data Model

The Knot pages answer practical questions by category. Current DayOf data does not.

Evidence:

- `src/lib/vendorProfiles.ts:13` has no category fact fields on `VendorProfile`.
- `src/lib/vendorProfiles.ts:160` has customization fields, but no `category_facts`, `amenities`, `capacity`, `deliverables`, `style`, `settings`, or `availability` model.
- `src/lib/vendorProfiles.ts:351` normalizes generic customization only.
- `supabase/migrations/20260419194000_vendor_profile_v1.sql:1` stores all profile detail either as top-level generic columns or `source_payload`.
- `src/pages/VendorProfileCreate.tsx:514` lets owners edit packages/services.
- `src/pages/VendorProfileCreate.tsx:554` lets owners edit external credibility.
- `src/pages/VendorProfileCreate.tsx:594` lets owners edit DayOf fit rating.
- `src/pages/VendorProfileCreate.tsx:641` lets owners edit testimonials.
- `src/pages/VendorProfileCreate.tsx:671` lets owners edit FAQs.
- `src/pages/VendorProfileCreate.tsx:701` lets owners edit inquiry prompts.

What is missing:

- Venue: guest capacity, ceremony/reception locations, indoor/outdoor, rain plan, parking, lodging, catering rules, curfew, accessibility.
- Photography/video: deliverables, second shooter, turnaround, engagement sessions, film/digital, editing style, full-gallery availability.
- Catering/bar: plated/buffet/family style, tastings, bar support, staffing, rentals, dietary support, late night, cake cutting.
- Floral/decor: installations, rentals, teardown, palette, minimums, ceremony-to-reception repurposing.
- Music/entertainment: ceremony audio, emcee, lighting, do-not-play support, insurance, setup needs.
- Beauty/attire: trial, travel, touchups, party size, start time, assistant availability.
- Transportation/travel: vehicle types, pickup windows, guest shuttles, airport support, accessible vehicles.

Recommendation: add a normalized `category_facts` model under `vendor_customization`, not a new table yet. Keep it small:

```ts
type VendorCategoryFact = {
  label: string;
  value: string;
  group?: 'overview' | 'logistics' | 'style' | 'service' | 'policy';
  priority?: number;
};
```

Render only the top 6-8 facts. That copies The Knot's usefulness without copying its density.

### 2. Templates Exist, But They Mostly Change Labels and Defaults

The renderer has category-aware labels:

- `src/pages/VendorProfile.tsx:156` normalizes the template ID.
- `src/pages/VendorProfile.tsx:166` changes the eyebrow by template.
- `src/pages/VendorProfile.tsx:183` sets category-specific default proof highlights.
- `src/pages/VendorProfile.tsx:201` sets category-specific default CTA text.
- `src/pages/VendorProfile.tsx:242` changes gallery layout.

But the public page does not render category-specific detail sections. The page can call something a `Venue profile`, but it cannot show the exact venue facts The Knot surfaces, because those facts are not modeled.

Recommendation: keep the current templates, but treat them as presentation variants. Add one fact section that changes content by template but uses the same UI.

### 3. Inquiry Is Repeated Too Many Times

The Knot overuses quote CTAs. DayOf is calmer, but the code still repeats inquiry guidance in several places:

- `src/pages/VendorProfile.tsx:335` always renders an `Inquire` chip in the hero, even when there is already a primary CTA.
- `src/pages/VendorProfile.tsx:338` renders the primary hero CTA.
- `src/pages/VendorProfile.tsx:452` renders a mid-page `Inquiry ready` panel.
- `src/pages/VendorProfile.tsx:573` renders a `Best next step` card in the links rail.
- `src/pages/VendorProfile.tsx:582` renders the final inquiry section.
- `src/pages/VendorProfile.tsx:667` renders a direct email fallback panel.

This is the most obvious "less selly" cleanup. Remove the hero `Inquire` chip and either remove the mid-page inquiry panel or make it optional by template. Keep one primary CTA and the final form.

### 4. Some Copy Sounds Internal Instead of Couple-Facing

The data model is fine, but the display labels can feel more like a dashboard than a vendor page.

Current examples:

- `src/pages/VendorProfile.tsx:376` says `External credibility`.
- `src/pages/VendorProfile.tsx:382` explains how DayOf fit scores and external ratings should be interpreted.
- `src/pages/VendorProfile.tsx:411` says `Vendor fit rating`.
- `src/pages/VendorProfile.tsx:455` says `Inquiry ready`.
- `src/pages/VendorProfile.tsx:586` says `Package your wedding details into one clean vendor email.`
- `src/pages/VendorProfile.tsx:616` says `We will include your couple name, location, venue, date, DayOf site, and reply email with this message.`
- `src/pages/VendorProfile.tsx:617` says `This becomes the vendor email, with your reply email included.`

Recommended replacements:

- `External credibility` -> `Public reviews`
- `Vendor fit rating` -> `Why this may fit`
- `Inquiry ready` -> remove the block, or `Ask about availability`
- `Package your wedding details into one clean vendor email.` -> `Send the details once.`
- `This becomes the vendor email...` -> `Your note goes straight to the vendor with your reply email.`

### 5. Gallery Is Too Small to Borrow The Knot's Best Gallery Pattern

The Knot makes "See all" obvious. DayOf currently caps the working gallery:

- `src/pages/VendorProfile.tsx:122` builds the gallery list.
- `src/pages/VendorProfile.tsx:127` slices the gallery to 6 images.
- `src/pages/VendorProfileCreate.tsx:757` tells owners the first line becomes hero and up to five more fill the gallery.
- `src/pages/VendorProfileCreate.tsx:779` previews only up to 6 images.
- `supabase/functions/vendor-profile-preview/index.ts:441` slices generated images to 6.

Six is fine for a calm page, but it prevents an optional "view all" experience. Recommendation: keep the public page to 6-8 images, but allow storage of more images and show `View full gallery` only when more exist. That borrows the useful gallery affordance without creating a carousel-heavy page.

### 6. Generated Drafts Are Generic

The preview function extracts page metadata and social links, but does not infer structured wedding facts:

- `supabase/functions/vendor-profile-preview/index.ts:187` extracts basic meta tags.
- `supabase/functions/vendor-profile-preview/index.ts:211` extracts Instagram links.
- `supabase/functions/vendor-profile-preview/index.ts:215` extracts other social links.
- `supabase/functions/vendor-profile-preview/index.ts:231` extracts mailto email.
- `supabase/functions/vendor-profile-preview/index.ts:298` writes a generic fallback description.
- `supabase/functions/vendor-profile-preview/index.ts:416` writes generic about copy from description/social/source.
- `supabase/functions/vendor-profile-preview/index.ts:452` returns core fields only.

This is safe and lightweight, but it means generation will rarely produce the practical facts couples need. Recommendation: add a manual "Quick facts" editor first, then later add extraction.

### 7. Sample Profiles Do Not Exercise The Full Product

The floral sample is strong:

- `src/lib/vendorProfiles.ts:444` defines the floral sample.
- `src/lib/vendorProfiles.ts:470` includes external credibility.
- `src/lib/vendorProfiles.ts:479` includes a DayOf rating.
- `src/lib/vendorProfiles.ts:490` includes packages.
- `src/lib/vendorProfiles.ts:494` includes testimonials.
- `src/lib/vendorProfiles.ts:497` includes FAQs.
- `src/lib/vendorProfiles.ts:501` includes inquiry questions.

But the photography, venue, and catering samples are thinner:

- `src/lib/vendorProfiles.ts:417` defines photography with proof points but no packages, FAQ, testimonials, or external credibility.
- `src/lib/vendorProfiles.ts:505` defines venue with proof points but no capacity, amenities, packages, FAQ, testimonials, or external credibility.
- `src/lib/vendorProfiles.ts:532` defines catering with proof points but no service-style facts, packages, FAQ, testimonials, or external credibility.

Recommendation: add category-specific facts and richer sample content to photography, venue, and catering. This will keep demos honest and make tests cover the intended product shape.

## Privacy And Product Risk

DayOf's packaged context is useful, but the current public route auto-loads signed-in wedding context and displays it on any vendor page:

- `src/pages/VendorProfile.tsx:97` runs `getMyVendorInquiryContext()` immediately.
- `src/pages/VendorProfile.tsx:103` stores that context in page state.
- `src/pages/VendorProfile.tsx:620` renders the context block when available.
- `src/pages/VendorProfile.tsx:622` displays couple names.
- `src/pages/VendorProfile.tsx:623` displays location.
- `src/pages/VendorProfile.tsx:624` displays venue.
- `src/pages/VendorProfile.tsx:625` displays date.
- `src/pages/VendorProfile.tsx:626` displays DayOf site slug.
- `src/pages/VendorProfile.tsx:627` displays reply email.

This is not necessarily wrong, but it is a product choice. If a couple is signed in on a shared device, opening any `/vendor/:slug` page reveals wedding details. A less surprising version would keep the form compact by default and show a `Use my wedding details` toggle before displaying the prefilled summary.

## Tests: What They Cover And What They Miss

Current test coverage is strongest around safety and inquiry mechanics:

- `src/pages/VendorProfile.test.tsx:26` tests safe public links and images.
- `src/pages/VendorProfile.test.tsx:71` tests labeled inquiry fields and submit behavior.
- `src/pages/VendorProfile.test.tsx:170` tests packaged logged-in wedding context.
- `src/pages/VendorProfile.test.tsx:229` tests category-specific proof/CTA for a food vendor.
- `src/lib/vendorProfiles.test.ts:25` tests fallback draft safety.
- `src/lib/vendorProfiles.test.ts:67` tests sanitization before insert.
- `tests/e2e/vendor-profile-public-inquiry-ui.spec.ts:5` tests public inquiry form behavior.
- `tests/e2e/vendor-profile-create-ui.spec.ts:5` tests studio labels and publish result.

Gaps:

- No test proves duplicate inquiry affordances were intentionally avoided.
- No test covers a category-specific facts section because one does not exist.
- No test asserts public copy tone is calm/non-salesy.
- No test ensures a venue profile shows capacity, amenities, rain plan, parking, or accessibility.
- No test ensures a photographer profile shows deliverables, style, second shooter, turnaround, or engagement session availability.
- `tests/e2e/vendor-profile-publish-inquiry.spec.ts:128` still fills a placeholder `What are you looking for?`, while current code uses `Share the look, feeling, guest experience...` at `src/pages/VendorProfile.tsx:657`. The live-skip e2e may be stale.

## Recommended Implementation Plan

### P0: Make It Less Selly Without Schema Changes

1. Remove the static hero `Inquire` chip at `src/pages/VendorProfile.tsx:335`.
2. Remove or hide the mid-page `Inquiry ready` block at `src/pages/VendorProfile.tsx:452`.
3. Change `External credibility` to `Public reviews` at `src/pages/VendorProfile.tsx:376`.
4. Change `Vendor fit rating` to `Why this may fit` at `src/pages/VendorProfile.tsx:411`.
5. Shorten inquiry explainer copy at `src/pages/VendorProfile.tsx:584`.
6. Keep the hero CTA and final form as the only major inquiry moments.

Expected effect: immediately less salesy, less repetitive, and closer to a calm vendor handoff.

### P1: Add The Useful Part The Knot Has

Add a `category_facts` array to `vendor_customization`:

- Normalize it in `src/lib/vendorProfiles.ts`.
- Edit it in `src/pages/VendorProfileCreate.tsx`.
- Render it in `src/pages/VendorProfile.tsx` as `Good to know` or `Quick facts`.
- Start with 6 facts max.
- Keep it generic enough to avoid schema churn, but structured enough to render cleanly.

Recommended fact sets:

- Venue: capacity, indoor/outdoor, ceremony setting, rain plan, parking, lodging, accessibility.
- Photographer: style, deliverables, turnaround, second shooter, engagement session, travel.
- Catering: service style, tasting, bar, staffing, rentals, dietary support.
- Floral: installation, rentals, teardown, minimum/scope, ceremony reuse, palette.

### P2: Improve Gallery Without Turning Into The Knot

1. Let owner-created profiles store more than 6 image URLs.
2. Keep the page preview to 6-8 images.
3. Show `View full gallery` only when there are more images.
4. Avoid carousel controls unless there is a real gallery page.

### P3: Make Samples And Tests Match The Intended Product

1. Add richer category facts to sample photography, venue, and catering profiles.
2. Add tests for the new quick-facts section.
3. Add a test that the hero does not render duplicate inquiry CTAs.
4. Update stale e2e placeholder usage in `tests/e2e/vendor-profile-publish-inquiry.spec.ts:128`.

## What Not To Copy From The Knot

Do not add:

- Sponsored rails.
- Competing vendor recommendations on the vendor page.
- Deal and discount labels.
- Review search/sort/filter UI before there is enough review volume.
- Category filter drawers on individual vendor pages.
- Repeated `Request quote` CTAs.
- SEO link blocks that make the page feel like a marketplace.

DayOf's value is a clean handoff: "Here is why this vendor may fit your wedding, here are the real facts, and here is one calm way to reach out."

## Short Version

Code says DayOf is already simpler than The Knot in layout and marketplace pressure. But it needs to become more specific, not more generic. The winning move is:

1. Reduce inquiry repetition.
2. Rename internal-sounding labels.
3. Add compact category facts.
4. Keep packaged wedding context.
5. Avoid marketplace rails, discounts, and competitor widgets.
