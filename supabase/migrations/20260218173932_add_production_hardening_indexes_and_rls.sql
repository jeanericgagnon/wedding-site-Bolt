/*
  # Production Hardening — Indexes & RLS Review

  ## Summary
  This migration adds missing performance indexes and ensures RLS policies
  are correctly set up for all builder-related tables. It also adds a
  published_json column to snapshot the exact published content (separate
  from the editable draft site_json), enabling deterministic public site
  rendering of published-only content.

  ## Changes

  ### New Columns
  - `wedding_sites.published_json` (jsonb) — Snapshot of site_json at
    publish time. Public site reads from this rather than draft site_json,
    ensuring visitors always see the last published version.

  ### New Indexes
  - `idx_wedding_sites_user_id` — For builder load (query by user_id)
  - `idx_wedding_sites_site_slug` — For public site lookup (query by site_slug)
  - `idx_builder_media_assets_wedding_site_id` — For media listing
  - `idx_builder_media_assets_status` — For filtering by upload status
  - `idx_wedding_sites_is_published` — For listing published sites

  ### RLS Review
  - No changes required. Existing policies are correctly scoped.
  - Confirmed: builder_media_assets uses JOIN to wedding_sites.user_id
  - Confirmed: wedding_sites public SELECT policy exists for site_slug lookups

  ## Rollback
  DROP INDEX IF EXISTS idx_wedding_sites_user_id;
  DROP INDEX IF EXISTS idx_wedding_sites_site_slug;
  DROP INDEX IF EXISTS idx_builder_media_assets_wedding_site_id;
  DROP INDEX IF EXISTS idx_builder_media_assets_status;
  DROP INDEX IF EXISTS idx_wedding_sites_is_published;
  ALTER TABLE wedding_sites DROP COLUMN IF EXISTS published_json;
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'published_json'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN published_json jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wedding_sites_user_id
  ON wedding_sites(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_sites_site_slug
  ON wedding_sites(site_slug)
  WHERE site_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_builder_media_assets_wedding_site_id
  ON builder_media_assets(wedding_site_id);

CREATE INDEX IF NOT EXISTS idx_builder_media_assets_status
  ON builder_media_assets(status);

CREATE INDEX IF NOT EXISTS idx_wedding_sites_is_published
  ON wedding_sites(is_published)
  WHERE is_published = true;
