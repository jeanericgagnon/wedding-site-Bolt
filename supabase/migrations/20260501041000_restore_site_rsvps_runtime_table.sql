-- Restore the lightweight public-site RSVP table used by rendered RSVP sections.
-- The invite-token RSVP flow uses guests/event_rsvps; this table is only for
-- open public-site RSVP widgets on published sites.

CREATE TABLE IF NOT EXISTS public.site_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  guest_name text NOT NULL DEFAULT '',
  rsvp_status text NOT NULL DEFAULT 'attending' CHECK (rsvp_status IN ('attending', 'declined')),
  guest_count integer NOT NULL DEFAULT 1 CHECK (guest_count >= 1 AND guest_count <= 20),
  dietary_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_rsvps_wedding_site_id_idx
  ON public.site_rsvps(wedding_site_id);

CREATE INDEX IF NOT EXISTS site_rsvps_created_at_idx
  ON public.site_rsvps(created_at DESC);

ALTER TABLE public.site_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an RSVP" ON public.site_rsvps;
DROP POLICY IF EXISTS "Public can submit site RSVPs for published sites" ON public.site_rsvps;
CREATE POLICY "Public can submit site RSVPs for published sites"
  ON public.site_rsvps
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_rsvps.wedding_site_id
        AND ws.is_published = true
    )
  );

DROP POLICY IF EXISTS "Site owners can view RSVPs for their wedding site" ON public.site_rsvps;
DROP POLICY IF EXISTS "Site team can view site RSVPs" ON public.site_rsvps;
CREATE POLICY "Site team can view site RSVPs"
  ON public.site_rsvps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_rsvps.wedding_site_id
        AND ws.user_id = auth.uid()
    )
    OR public.dayof_has_site_role(site_rsvps.wedding_site_id, ARRAY['owner','coordinator','planner','viewer'])
  );
