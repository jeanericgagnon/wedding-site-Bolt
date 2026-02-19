/*
  # Create Vault Entries Table

  ## Summary
  Ships the Vault MVP feature with real database persistence.

  ## New Tables
  - `vault_entries`: Stores individual vault text/attachment entries
    - `id` (uuid, primary key)
    - `wedding_site_id` (uuid, foreign key to wedding_sites)
    - `vault_year` (int: 1, 5, or 10 — which anniversary vault)
    - `title` (text, optional entry title)
    - `content` (text, the message body)
    - `author_name` (text, who wrote it)
    - `attachment_url` (text, optional file URL)
    - `attachment_name` (text, original filename)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated owner can read/insert/update/delete their own entries
  - Public insert allowed via wedding_site_id (for future guest contributions)
    but only the owner can read

  ## Notes
  1. vault_year must be 1, 5, or 10
  2. unlock_date is computed client-side from wedding_date + vault_year years
  3. No video support in MVP — text + optional attachment URL only
*/

CREATE TABLE IF NOT EXISTS vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  vault_year int NOT NULL CHECK (vault_year IN (1, 5, 10)),
  title text DEFAULT '',
  content text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT 'You',
  attachment_url text,
  attachment_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read vault entries"
  ON vault_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = vault_entries.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert vault entries"
  ON vault_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = vault_entries.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update vault entries"
  ON vault_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = vault_entries.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = vault_entries.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete vault entries"
  ON vault_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = vault_entries.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS vault_entries_wedding_site_id_idx ON vault_entries(wedding_site_id);
CREATE INDEX IF NOT EXISTS vault_entries_vault_year_idx ON vault_entries(wedding_site_id, vault_year);
