# Vendor Profile Environment

This is the launch checklist for vendor page generation and template review.

## Runtime Surfaces

- `/vendor-templates`: signed-in browse/QA environment for vendor template shells.
- `/vendor-profile-v1`: signed-in vendor profile generator.
- `/vendor/:slug`: public vendor profile page.

## Required Configuration

- `VITE_SUPABASE_URL`: DayOf Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: DayOf Supabase anon key.
- `vendor-profile-preview`: Supabase Edge Function deployed in the same project.
- `VITE_ENABLE_VENDOR_PROFILE_CREATION`: set to `true` only when the generator is intentionally enabled for launch. Missing, blank, or `false` keeps generation paused while templates remain reviewable.

## Optional Provider Constraints

- Website fetch/scrape availability depends on the source site allowing server-side requests.
- Screenshot/image providers are optional. If unavailable, templates must use safe no-image fallbacks.
- Generated copy must avoid unsupported claims. Social-only or screenshot fallback inputs should stay factual and sparse.

## Launch QA

- Open `/vendor-templates` and test filters for category, location, vendor name, and source quality.
- Review every source-quality state: website metadata, social-only, screenshot fallback, and no-image fallback.
- Generate a draft from `/vendor-profile-v1`.
- Edit hero, about, links, email, and image URLs.
- Publish the profile and open `/vendor/:slug`.
- Submit a public inquiry and verify it lands in `vendor_profile_inquiries`.
- Confirm creation is intentionally enabled with `VITE_ENABLE_VENDOR_PROFILE_CREATION=true` or intentionally gated by leaving it unset/false.
- Confirm the planner vendor record can store the generated profile URL/contact metadata when linked manually.
