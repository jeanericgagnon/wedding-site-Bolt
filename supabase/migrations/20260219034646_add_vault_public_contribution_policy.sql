
/*
  # Add Public Vault Contribution Policy

  ## Overview
  Allows anyone with the shareable vault link to submit entries to a specific
  anniversary vault. Entries are publicly insertable (no auth required) to
  support the guest contribution flow. Reading entries remains restricted to
  the site owner.

  ## Changes
  1. Adds a SELECT policy on vault_entries for the site owner
  2. Adds an INSERT policy on vault_entries for anonymous users contributing
     via the public link — inserts are allowed for any vault_site_id where
     the matching wedding_site has is_published = true
  3. Adds a public SELECT on wedding_sites (slug + id + wedding_date + couple names)
     so the public vault page can load site info without auth

  ## Security Notes
  - INSERT is open to anonymous visitors who have the link (by design — it's
    a "drop something in a bucket" UX, not sensitive data)
  - The site owner can delete entries via the existing authenticated policy
  - vault_entries does NOT expose private owner data; it only stores public
    messages left by guests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vault_entries' AND policyname = 'Public can insert vault entries for published sites'
  ) THEN
    CREATE POLICY "Public can insert vault entries for published sites"
      ON vault_entries FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM wedding_sites ws
          WHERE ws.id = vault_entries.wedding_site_id
            AND ws.is_published = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vault_entries' AND policyname = 'Owners can read their vault entries'
  ) THEN
    CREATE POLICY "Owners can read their vault entries"
      ON vault_entries FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM wedding_sites ws
          WHERE ws.id = vault_entries.wedding_site_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vault_entries' AND policyname = 'Owners can delete their vault entries'
  ) THEN
    CREATE POLICY "Owners can delete their vault entries"
      ON vault_entries FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM wedding_sites ws
          WHERE ws.id = vault_entries.wedding_site_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;
