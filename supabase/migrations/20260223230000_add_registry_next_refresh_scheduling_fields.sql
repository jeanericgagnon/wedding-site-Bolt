-- Scheduling metadata for budget-aware registry refreshes

ALTER TABLE registry_items
  ADD COLUMN IF NOT EXISTS next_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_auto_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refresh_fail_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registry_items_next_refresh_at
  ON registry_items(next_refresh_at);
