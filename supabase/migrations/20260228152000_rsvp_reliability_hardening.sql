/*
  # RSVP reliability hardening (invite scope, guest limits, conflict logging)
*/

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS children_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_children integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_additional_guests integer DEFAULT 0;

UPDATE guests
SET max_additional_guests = GREATEST(COALESCE(max_additional_guests, 0), CASE WHEN plus_one_allowed THEN 1 ELSE 0 END)
WHERE max_additional_guests IS NULL OR max_additional_guests < CASE WHEN plus_one_allowed THEN 1 ELSE 0 END;

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS attending_ceremony boolean,
  ADD COLUMN IF NOT EXISTS attending_reception boolean,
  ADD COLUMN IF NOT EXISTS plus_one_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS children_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conflict_flags jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS rsvp_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE NOT NULL,
  conflict_code text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  attempted_payload jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE rsvp_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can view RSVP conflicts for their sites" ON rsvp_conflicts;
CREATE POLICY "Couples can view RSVP conflicts for their sites"
  ON rsvp_conflicts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = rsvp_conflicts.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage RSVP conflicts" ON rsvp_conflicts;
CREATE POLICY "Service role can manage RSVP conflicts"
  ON rsvp_conflicts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rsvp_conflicts_site_created ON rsvp_conflicts(wedding_site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsvp_conflicts_guest ON rsvp_conflicts(guest_id);
