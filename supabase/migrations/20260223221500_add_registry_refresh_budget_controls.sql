-- Cost-control fields for registry refresh automation

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS registry_refresh_enabled_until timestamptz,
  ADD COLUMN IF NOT EXISTS registry_monthly_refresh_cap integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS registry_monthly_refresh_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registry_monthly_refresh_month text;

COMMENT ON COLUMN wedding_sites.registry_refresh_enabled_until IS 'Auto-refresh allowed through this timestamp';
COMMENT ON COLUMN wedding_sites.registry_monthly_refresh_cap IS 'Per-site max metadata refreshes per month';
COMMENT ON COLUMN wedding_sites.registry_monthly_refresh_count IS 'Current month metadata refresh count';
COMMENT ON COLUMN wedding_sites.registry_monthly_refresh_month IS 'YYYY-MM key for registry monthly refresh counter';
