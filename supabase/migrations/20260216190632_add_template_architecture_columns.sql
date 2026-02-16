/*
  # Add Template Architecture Columns

  1. New Columns
    - `wedding_data` (jsonb) - Canonical wedding information (WeddingDataV1)
      Contains all wedding content: couple info, dates, venues, schedule, registry, etc.
      This is the single source of truth for content.
    
    - `layout_config` (jsonb) - Presentation configuration (LayoutConfigV1)
      Defines section order, variants, enabled/disabled state, and data bindings.
      Can be regenerated from templates while preserving wedding_data.
    
    - `active_template_id` (text) - Currently selected template
      Default: 'base'. Used for rendering and layout regeneration.

  2. Indexes
    - Standard index on active_template_id for filtering
    - GIN indexes on jsonb columns for future query performance

  3. Notes
    - Existing data is preserved (columns are nullable/have defaults)
    - Application code will migrate legacy data on first access
    - RLS policies remain unchanged
*/

-- Add wedding_data column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'wedding_data'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN wedding_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add layout_config column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'layout_config'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN layout_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add active_template_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'active_template_id'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN active_template_id text DEFAULT 'base';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wedding_sites_active_template
  ON wedding_sites(active_template_id);

CREATE INDEX IF NOT EXISTS idx_wedding_sites_wedding_data_gin
  ON wedding_sites USING GIN (wedding_data);

CREATE INDEX IF NOT EXISTS idx_wedding_sites_layout_config_gin
  ON wedding_sites USING GIN (layout_config);
