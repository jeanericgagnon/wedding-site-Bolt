/*
  # Fix overly permissive RLS policies

  ## Summary
  Three public-access policies were too permissive:

  1. **wedding_sites public SELECT**: Exposed ALL sites with a slug (including unpublished).
     Fixed to only expose published sites, but still allow the couple's own unpublished site
     to be fetchable by slug for preview purposes.

  2. **rsvps INSERT (anyone)**: WITH CHECK: true allowed inserting RSVPs for ANY guest_id
     without verifying the guest exists on a published site. Fixed to verify the target guest
     belongs to a published wedding site.

  3. **site_rsvps INSERT (anyone)**: WITH CHECK: true allowed inserting with any wedding_site_id.
     Fixed to verify the target wedding site is published.

  ## Security Changes
  - Unpublished wedding sites are no longer readable by the public via slug
  - RSVP submissions are only permitted for published sites
  - site_rsvp submissions are only permitted for published sites
*/

-- 1. Fix wedding_sites public SELECT: only expose published sites to anon
DROP POLICY IF EXISTS "Public can view published wedding sites by slug" ON public.wedding_sites;

CREATE POLICY "Public can view published wedding sites by slug"
  ON public.wedding_sites
  FOR SELECT
  TO anon
  USING (
    is_published = true
    AND site_slug IS NOT NULL
  );

-- 2. Fix rsvps open INSERT: require the guest to be on a published site
DROP POLICY IF EXISTS "Anyone can submit RSVP" ON public.rsvps;

CREATE POLICY "Public can submit RSVP on published sites"
  ON public.rsvps
  FOR INSERT
  TO anon
  WITH CHECK (
    guest_id IN (
      SELECT g.id FROM public.guests g
      JOIN public.wedding_sites ws ON ws.id = g.wedding_site_id
      WHERE ws.is_published = true
    )
  );

-- 3. Fix site_rsvps open INSERT: require wedding site to be published
DROP POLICY IF EXISTS "Anyone can submit an RSVP" ON public.site_rsvps;

CREATE POLICY "Public can submit RSVP on published sites"
  ON public.site_rsvps
  FOR INSERT
  TO anon
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM public.wedding_sites WHERE is_published = true
    )
  );

-- Also allow authenticated users to submit RSVPs on published sites (for their own guests)
CREATE POLICY "Authenticated can submit RSVP on published sites"
  ON public.site_rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM public.wedding_sites WHERE is_published = true
    )
  );
