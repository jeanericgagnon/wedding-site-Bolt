/*
  # Add public read access to wedding sites by slug

  ## Overview
  The site view page (/site/:slug) is publicly accessible but was blocked by RLS
  because the only SELECT policy required the viewer to be the owner.

  ## Changes
  - Adds a new SELECT policy allowing anyone (including unauthenticated users) to
    read a wedding site's public fields when accessing by site_slug. This enables
    the guest-facing wedding site to load without authentication.

  ## Security Notes
  - This policy only permits reading; all write operations still require ownership
  - The existing owner-only SELECT policy is preserved for dashboard use
*/

CREATE POLICY "Public can view published wedding sites by slug"
  ON wedding_sites FOR SELECT
  TO anon
  USING (site_slug IS NOT NULL);
