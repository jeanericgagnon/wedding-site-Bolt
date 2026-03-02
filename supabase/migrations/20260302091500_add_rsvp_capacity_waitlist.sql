/*
  RSVP capacity limit + waitlist support (site-wide)
*/

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS rsvp_capacity_limit integer,
  ADD COLUMN IF NOT EXISTS rsvp_waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_waitlist_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rsvp_waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','promoted','removed')),
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web','sms','admin')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_site_id, guest_id)
);

ALTER TABLE rsvp_waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Waitlist read for site collaborators" ON rsvp_waitlist_entries;
CREATE POLICY "Waitlist read for site collaborators"
  ON rsvp_waitlist_entries FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "Waitlist write owner coordinator" ON rsvp_waitlist_entries;
CREATE POLICY "Waitlist write owner coordinator"
  ON rsvp_waitlist_entries FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

CREATE INDEX IF NOT EXISTS idx_rsvp_waitlist_site_status ON rsvp_waitlist_entries(wedding_site_id, status, created_at);
