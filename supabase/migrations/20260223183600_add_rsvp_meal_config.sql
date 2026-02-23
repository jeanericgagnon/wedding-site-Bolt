-- Configurable RSVP meal options
ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS rsvp_meal_config jsonb NOT NULL DEFAULT '{"enabled": true, "options": ["Chicken", "Beef", "Fish", "Vegetarian", "Vegan"]}'::jsonb;

COMMENT ON COLUMN wedding_sites.rsvp_meal_config IS 'RSVP meal choice config: enabled flag + options array';
