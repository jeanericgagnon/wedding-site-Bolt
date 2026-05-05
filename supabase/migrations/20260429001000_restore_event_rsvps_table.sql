-- Restore the event-specific RSVP table required by /events?token=... flows.
-- This is intentionally narrow because the remote migration history is out of sync.

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_invitation_id uuid NOT NULL REFERENCES public.event_invitations(id) ON DELETE CASCADE,
  attending boolean NOT NULL,
  dietary_restrictions text,
  notes text,
  responded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_invitation_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_invitation_id
  ON public.event_rsvps(event_invitation_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wedding site owners can view event RSVPs" ON public.event_rsvps;
CREATE POLICY "Wedding site owners can view event RSVPs"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    event_invitation_id IN (
      SELECT ei.id
      FROM public.event_invitations ei
      JOIN public.itinerary_events e ON ei.event_id = e.id
      JOIN public.wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Wedding site owners can update event RSVPs" ON public.event_rsvps;
CREATE POLICY "Wedding site owners can update event RSVPs"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (
    event_invitation_id IN (
      SELECT ei.id
      FROM public.event_invitations ei
      JOIN public.itinerary_events e ON ei.event_id = e.id
      JOIN public.wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_invitation_id IN (
      SELECT ei.id
      FROM public.event_invitations ei
      JOIN public.itinerary_events e ON ei.event_id = e.id
      JOIN public.wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can submit event RSVPs" ON public.event_rsvps;
CREATE POLICY "Public can submit event RSVPs"
  ON public.event_rsvps FOR INSERT
  TO anon
  WITH CHECK (
    event_invitation_id IN (
      SELECT id FROM public.event_invitations
    )
  );

DROP POLICY IF EXISTS "Public can update event RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Public can update event RSVPs via valid invitation" ON public.event_rsvps;
CREATE POLICY "Public can update event RSVPs via valid invitation"
  ON public.event_rsvps FOR UPDATE
  TO anon
  USING (
    event_invitation_id IN (
      SELECT id FROM public.event_invitations
    )
  )
  WITH CHECK (
    event_invitation_id IN (
      SELECT id FROM public.event_invitations
    )
  );

DROP POLICY IF EXISTS "Public can view event RSVPs" ON public.event_rsvps;
CREATE POLICY "Public can view event RSVPs"
  ON public.event_rsvps FOR SELECT
  TO anon
  USING (
    event_invitation_id IN (
      SELECT id FROM public.event_invitations
    )
  );
