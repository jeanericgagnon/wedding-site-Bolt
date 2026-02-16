# Supabase Schema Documentation

## Wedding Sites Table - Template Architecture

The wedding sites table uses a **canonical data + layout separation** architecture to support template switching and flexible customization.

### Core Columns

#### `wedding_data` (jsonb)
Stores the canonical wedding information as `WeddingDataV1`. This is the single source of truth for all wedding content (couple names, dates, venues, schedule, etc). Templates read from this data but never modify it directly.

#### `layout_config` (jsonb)
Stores the presentation layer as `LayoutConfigV1`. Defines which sections appear, in what order, with which variants, and how they bind to the canonical data. This can be regenerated from a template while preserving the wedding_data.

#### `active_template_id` (text)
The currently selected template ID (e.g., 'base', 'modern', 'editorial'). Used to know which template definition to use when rendering or regenerating layout.

### Migration SQL

```sql
-- Add new jsonb columns for template architecture
DO $$
BEGIN
  -- Add wedding_data column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'wedding_data'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN wedding_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add layout_config column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'layout_config'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN layout_config jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add active_template_id column if not exists
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

-- Add GIN indexes for jsonb queries (optional, for future search/filter features)
CREATE INDEX IF NOT EXISTS idx_wedding_sites_wedding_data_gin
  ON wedding_sites USING GIN (wedding_data);

CREATE INDEX IF NOT EXISTS idx_wedding_sites_layout_config_gin
  ON wedding_sites USING GIN (layout_config);

-- Comment on columns
COMMENT ON COLUMN wedding_sites.wedding_data IS
  'Canonical wedding information (WeddingDataV1). Single source of truth for content.';

COMMENT ON COLUMN wedding_sites.layout_config IS
  'Presentation configuration (LayoutConfigV1). Defines section order, variants, and bindings.';

COMMENT ON COLUMN wedding_sites.active_template_id IS
  'Currently active template ID. Used for rendering and layout regeneration.';
```

### Row Level Security (RLS)

The existing RLS policies should continue to work. Ensure that:

1. Users can only access their own wedding sites
2. Sites can be read publicly if `is_published = true` or via the `site_url` slug
3. Only the owner can update wedding_data and layout_config

Example RLS policy check:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'wedding_sites';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'wedding_sites';
```

### Data Migration Strategy

For existing wedding_sites rows that don't have wedding_data/layout_config:

1. **On first load**: Check if wedding_data is empty
2. **Generate from legacy fields**: Use the existing site_json or individual columns
3. **Save back**: Update the row with proper wedding_data and layout_config
4. **Preserve backward compatibility**: Keep old columns until migration is complete

This can be handled in application code rather than a complex SQL migration.

### Recommended Validation

```sql
-- Check that wedding_data has correct version
SELECT id, wedding_data->>'version' as data_version
FROM wedding_sites
WHERE wedding_data IS NOT NULL;

-- Check that layout_config has correct version
SELECT id, layout_config->>'version' as layout_version
FROM wedding_sites
WHERE layout_config IS NOT NULL;

-- Find rows missing new structure
SELECT id, site_url
FROM wedding_sites
WHERE wedding_data = '{}'::jsonb
   OR layout_config = '{}'::jsonb;
```

### Benefits of This Architecture

1. **Template Switching**: Users can change templates without losing content
2. **Data Preservation**: Canonical data is never lost during design changes
3. **Flexibility**: Section order, variants, and visibility can be customized
4. **Future-Proof**: Easy to add new sections or templates without schema changes
5. **Versioning**: Both data structures include version fields for future migrations
