/*
  # Builder Media Assets and Schema Stabilization

  ## Summary
  This migration completes the database schema for the wedding site builder.

  ## New Tables
  - `builder_media_assets` - Stores metadata for uploaded media files (images, videos, documents)
    - Core fields: id, wedding_site_id, filename, mime_type, asset_type, status, url
    - Dimensional data: width, height, size_bytes
    - Metadata: alt_text, caption, tags, attached_section_ids
    - Timestamps: uploaded_at, updated_at

  ## Modified Tables: wedding_sites
  - Added `is_published` (boolean, default false) - tracks whether site is publicly visible
  - Added `published_at` (timestamptz) - when site was last published

  ## Security
  - RLS enabled on builder_media_assets
  - SELECT policy: authenticated users can view their own assets (via wedding_sites.user_id join)
  - INSERT policy: authenticated users can upload to their own wedding site
  - UPDATE policy: authenticated users can update their own assets
  - DELETE policy: authenticated users can delete their own assets

  ## Indexes
  - builder_media_assets(wedding_site_id) for fast asset lookups per site
  - builder_media_assets(status) for filtering by upload status
  - wedding_sites(site_slug) unique index for public URL routing
  - wedding_sites(user_id) for fast user-to-site lookups

  ## Notes
  1. The wedding_site_id column in builder_media_assets references wedding_sites.id directly
     (not a weddings table, which does not exist in this schema)
  2. is_published and published_at added with IF NOT EXISTS guard for idempotency
  3. site_slug gets a unique constraint to prevent duplicate public URLs
*/

-- Create builder_media_assets table
CREATE TABLE IF NOT EXISTS builder_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  filename text NOT NULL DEFAULT '',
  original_filename text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'video', 'document')),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  url text NOT NULL DEFAULT '',
  thumbnail_url text,
  width integer,
  height integer,
  size_bytes integer NOT NULL DEFAULT 0,
  alt_text text,
  caption text,
  tags text[] NOT NULL DEFAULT '{}',
  attached_section_ids text[] NOT NULL DEFAULT '{}',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE builder_media_assets ENABLE ROW LEVEL SECURITY;

-- SELECT policy: users can view assets belonging to their wedding site
CREATE POLICY "Users can view own media assets"
  ON builder_media_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = builder_media_assets.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- INSERT policy: users can upload assets to their own wedding site
CREATE POLICY "Users can insert own media assets"
  ON builder_media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = builder_media_assets.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- UPDATE policy: users can update their own assets
CREATE POLICY "Users can update own media assets"
  ON builder_media_assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = builder_media_assets.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = builder_media_assets.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- DELETE policy: users can delete their own assets
CREATE POLICY "Users can delete own media assets"
  ON builder_media_assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = builder_media_assets.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Indexes for builder_media_assets
CREATE INDEX IF NOT EXISTS idx_builder_media_assets_wedding_site_id
  ON builder_media_assets(wedding_site_id);

CREATE INDEX IF NOT EXISTS idx_builder_media_assets_status
  ON builder_media_assets(status);

-- Add is_published and published_at to wedding_sites if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN is_published boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Indexes for wedding_sites
CREATE INDEX IF NOT EXISTS idx_wedding_sites_user_id
  ON wedding_sites(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_sites_site_slug_unique
  ON wedding_sites(site_slug)
  WHERE site_slug IS NOT NULL;
