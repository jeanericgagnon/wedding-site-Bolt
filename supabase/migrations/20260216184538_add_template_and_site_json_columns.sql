/*
  # Add Template System Columns

  1. Changes to wedding_sites table
    - Add `template_id` (text) - stores the template identifier (default 'base')
    - Add `site_json` (jsonb) - stores the complete SiteConfig object
    - Add `site_slug` (text, unique) - unique identifier for public site URLs
    - Update `updated_at` trigger to track changes

  2. Security
    - Maintain existing RLS policies
    - Ensure site_json is only accessible to site owner or public if published
*/

-- Add new columns to wedding_sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN template_id text DEFAULT 'base';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_json'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN site_json jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_slug'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN site_slug text UNIQUE;
  END IF;
END $$;

-- Create index on site_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_wedding_sites_slug ON wedding_sites(site_slug);

-- Create or replace function to generate slug from couple names
CREATE OR REPLACE FUNCTION generate_site_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_slug IS NULL THEN
    NEW.site_slug := lower(
      regexp_replace(
        NEW.couple_name_1 || '-' || NEW.couple_name_2 || '-' || substring(NEW.id::text from 1 for 8),
        '[^a-z0-9-]',
        '-',
        'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS set_site_slug ON wedding_sites;
CREATE TRIGGER set_site_slug
  BEFORE INSERT ON wedding_sites
  FOR EACH ROW
  EXECUTE FUNCTION generate_site_slug();

-- Update the updated_at timestamp when site_json changes
CREATE OR REPLACE FUNCTION update_wedding_site_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wedding_sites_timestamp ON wedding_sites;
CREATE TRIGGER update_wedding_sites_timestamp
  BEFORE UPDATE ON wedding_sites
  FOR EACH ROW
  WHEN (OLD.site_json IS DISTINCT FROM NEW.site_json 
    OR OLD.template_id IS DISTINCT FROM NEW.template_id)
  EXECUTE FUNCTION update_wedding_site_timestamp();
