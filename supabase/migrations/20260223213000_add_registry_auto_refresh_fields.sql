-- Registry automation / freshness tracking

ALTER TABLE registry_items
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS metadata_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_fetch_status text,
  ADD COLUMN IF NOT EXISTS metadata_confidence_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS previous_price_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS price_last_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_registry_items_metadata_last_checked_at
  ON registry_items(metadata_last_checked_at);
