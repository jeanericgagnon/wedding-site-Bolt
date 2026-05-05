-- Defense-in-depth for the lightweight public-site RSVP widget.
-- Gated sites can still accept widget RSVPs through the public-site-rsvp-submit
-- Edge Function after the same public-site access gate is satisfied. Direct anon
-- inserts are limited to open public sites so password/invite pages cannot be
-- bypassed with a known site id.

ALTER TABLE public.site_rsvps
  ADD COLUMN IF NOT EXISTS guest_email text;

DROP POLICY IF EXISTS "Public can submit site RSVPs for published sites" ON public.site_rsvps;
DROP POLICY IF EXISTS "Public can submit RSVP on published sites" ON public.site_rsvps;
DROP POLICY IF EXISTS "Authenticated can submit RSVP on published sites" ON public.site_rsvps;

CREATE POLICY "Public can submit site RSVPs for open public sites"
  ON public.site_rsvps
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_rsvps.wedding_site_id
        AND ws.is_published = true
        AND ws.privacy_mode = 'public'
    )
  );
