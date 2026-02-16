/*
  # Add site_slug column for consistent URL handling

  1. Changes
    - Add `site_slug` column to wedding_sites table
    - Make it unique and indexed for fast lookups
    - Copy existing site_url values to site_slug if they exist
    - Keep site_url for backward compatibility during transition

  2. Notes
    - site_slug is the canonical field for public URLs
    - site_url can remain as a display/legacy field
*/

-- Add site_slug column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_slug'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN site_slug text;
  END IF;
END $$;

-- Copy site_url to site_slug for existing rows if site_slug is null
UPDATE wedding_sites
SET site_slug = site_url
WHERE site_slug IS NULL AND site_url IS NOT NULL;

-- Create unique index on site_slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_sites_site_slug
  ON wedding_sites(site_slug)
  WHERE site_slug IS NOT NULL;

-- Add comment
COMMENT ON COLUMN wedding_sites.site_slug IS
  'Canonical URL slug for the wedding site. Used in public URLs like /site/:slug';
