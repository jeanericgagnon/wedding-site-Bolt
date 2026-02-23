-- Allow couples to fully pause automatic registry metadata refreshes.

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS registry_auto_refresh_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN wedding_sites.registry_auto_refresh_enabled IS 'When false, automatic registry metadata refresh is paused for this site.';
