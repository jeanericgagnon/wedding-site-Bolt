/*
  # Add site_rsvps table for public website RSVP submissions

  1. New Tables
    - `site_rsvps`
      - `id` (uuid, primary key)
      - `wedding_site_id` (uuid, foreign key to wedding_sites)
      - `guest_name` (text, the submitter's name)
      - `rsvp_status` (text, 'attending' or 'declined')
      - `guest_count` (integer, number of guests attending including submitter)
      - `dietary_notes` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public can INSERT (anonymous RSVP submissions from wedding website visitors)
    - Site owners (authenticated, matched by wedding_site user_id) can SELECT their own site's RSVPs
*/

CREATE TABLE IF NOT EXISTS site_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  guest_name text NOT NULL DEFAULT '',
  rsvp_status text NOT NULL DEFAULT 'attending' CHECK (rsvp_status IN ('attending', 'declined')),
  guest_count integer NOT NULL DEFAULT 1 CHECK (guest_count >= 1 AND guest_count <= 20),
  dietary_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE site_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an RSVP"
  ON site_rsvps
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Site owners can view RSVPs for their wedding site"
  ON site_rsvps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_rsvps.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS site_rsvps_wedding_site_id_idx ON site_rsvps(wedding_site_id);
