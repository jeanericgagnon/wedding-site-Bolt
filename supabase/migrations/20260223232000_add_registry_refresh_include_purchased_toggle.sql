-- Additional cost guard: optionally exclude purchased/hidden items from auto-refresh.

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS registry_refresh_include_purchased boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN wedding_sites.registry_refresh_include_purchased IS 'When false, auto-refresh skips purchased/hidden registry items to reduce compute.';
